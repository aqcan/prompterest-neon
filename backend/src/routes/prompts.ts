import { Hono } from 'hono';
import { db } from '../db/index.js';
import { prompts, promptVersions, savedPrompts, users } from '../db/schema.js';
import { eq, desc, and, count, sql } from 'drizzle-orm';
import { verifyToken } from './auth.js';

export const promptRoutes = new Hono();

// Trending cache (5 dakika)
let trendingCache: { data: unknown[]; expiresAt: number } | null = null;
const TRENDING_TTL_MS = 5 * 60 * 1000;

async function getUser(c: any): Promise<string | null> {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}

// Private prompts are only visible to their owner; everyone else gets a 404.
async function findVisiblePrompt(c: any, id: string) {
  const [prompt] = await db.select().from(prompts).where(eq(prompts.id, id)).limit(1);
  if (!prompt) return null;
  if (prompt.isPublic) return prompt;
  return prompt.userId === await getUser(c) ? prompt : null;
}

const LIMITS = { title: 200, content: 4000, versionName: 50, tags: 10, tag: 40, imageUrl: 7 * 1024 * 1024 };

function isValidImageUrl(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return true;
  return typeof v === 'string' && v.length <= LIMITS.imageUrl
    && (v.startsWith('data:image/') || v.startsWith('https://'));
}

function promptInputError(body: Record<string, unknown>, fields: { title?: boolean; tags?: boolean; versionName?: boolean }): string | null {
  const { title, content, imageUrl, tags, isPublic, versionName } = body;
  if (typeof content !== 'string' || !content.trim() || content.length > LIMITS.content) return `content: required, max ${LIMITS.content} chars`;
  // Prompts created through the generate flow have no title, so an empty one is allowed
  if (fields.title && title !== undefined && (typeof title !== 'string' || title.length > LIMITS.title)) return `title: max ${LIMITS.title} chars`;
  if (fields.versionName && versionName !== undefined && (typeof versionName !== 'string' || versionName.length > LIMITS.versionName)) return 'versionName: invalid';
  if (fields.tags && tags !== undefined && (!Array.isArray(tags) || tags.length > LIMITS.tags
    || tags.some((t) => typeof t !== 'string' || t.length > LIMITS.tag))) return `tags: max ${LIMITS.tags} strings`;
  if (isPublic !== undefined && typeof isPublic !== 'boolean') return 'isPublic: must be boolean';
  if (!isValidImageUrl(imageUrl)) return 'imageUrl: must be a data:image URL or https URL';
  return null;
}

// GET /api/prompts/trending — en çok kaydedilen 10 prompt (cached)
promptRoutes.get('/trending', async (c) => {
  const now = Date.now();
  if (trendingCache && trendingCache.expiresAt > now) {
    return c.json(trendingCache.data);
  }
  const result = await db
    .select({
      id: prompts.id,
      imageUrl: prompts.imageUrl,
      styleId: prompts.styleId,
      modelId: prompts.modelId,
      saveCount: count(savedPrompts.id),
    })
    .from(prompts)
    .leftJoin(savedPrompts, eq(prompts.id, savedPrompts.promptId))
    .where(eq(prompts.isPublic, true))
    .groupBy(prompts.id)
    .orderBy(desc(count(savedPrompts.id)))
    .limit(10);
  trendingCache = { data: result, expiresAt: now + TRENDING_TTL_MS };
  return c.json(result);
});

// GET /api/prompts/mine — kullanıcının kendi üretimleri (auth required)
promptRoutes.get('/mine', async (c) => {
  const userId = await getUser(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const list = await db.select().from(prompts)
    .where(eq(prompts.userId, userId))
    .orderBy(desc(prompts.createdAt))
    .limit(100);

  return c.json(list);
});

// GET /api/prompts — public feed (tag filtreli)
promptRoutes.get('/', async (c) => {
  // Explicit tag filtresi (query param ile geldiyse uygula, survey'den otomatik alma)
  let filterTags: string[] | null = null;

  const tagsParam = c.req.query('tags');
  if (tagsParam) {
    filterTags = tagsParam.split(',').filter(Boolean);
  }

  // WHERE koşulunu oluştur
  const baseWhere = eq(prompts.isPublic, true);
  const whereClause = filterTags?.length
    ? and(
        baseWhere,
        sql`${prompts.tags} && ARRAY[${sql.join(filterTags.map((t) => sql`${t}`), sql`, `)}]`,
      )
    : baseWhere;

  const list = await db
    .select({
      id: prompts.id,
      userId: prompts.userId,
      title: prompts.title,
      content: prompts.content,
      imageUrl: prompts.imageUrl,
      tags: prompts.tags,
      isPublic: prompts.isPublic,
      styleId: prompts.styleId,
      modelId: prompts.modelId,
      currentVersionId: prompts.currentVersionId,
      createdAt: prompts.createdAt,
      updatedAt: prompts.updatedAt,
      authorUsername: users.username,
      authorAvatar: users.avatar,
    })
    .from(prompts)
    .leftJoin(users, eq(prompts.userId, users.id))
    .where(whereClause)
    .orderBy(desc(prompts.createdAt))
    .limit(50);

  const withVersions = await Promise.all(list.map(async (p) => {
    if (!p.currentVersionId) return { ...p, currentVersion: null };
    const [ver] = await db.select().from(promptVersions).where(eq(promptVersions.id, p.currentVersionId)).limit(1);
    return { ...p, currentVersion: ver ?? null };
  }));

  return c.json(withVersions);
});

// GET /api/prompts/:id
promptRoutes.get('/:id', async (c) => {
  const prompt = await findVisiblePrompt(c, c.req.param('id'));
  if (!prompt) return c.json({ error: 'Not found' }, 404);
  let currentVersion = null;
  if (prompt.currentVersionId) {
    const [ver] = await db.select().from(promptVersions).where(eq(promptVersions.id, prompt.currentVersionId)).limit(1);
    currentVersion = ver ?? null;
  }
  return c.json({ ...prompt, currentVersion });
});

// POST /api/prompts — create prompt (auth required)
promptRoutes.post('/', async (c) => {
  const userId = await getUser(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const invalid = promptInputError(body, { title: true, tags: true });
  if (invalid) return c.json({ error: invalid }, 400);
  const { title, content, imageUrl, tags, isPublic } = body;

  const [prompt] = await db.insert(prompts).values({
    userId, title, content, imageUrl, tags: tags ?? [],
    isPublic: isPublic ?? true,
  }).returning();

  const [version] = await db.insert(promptVersions).values({
    promptId: prompt.id, content, imageUrl, versionName: 'v1',
  }).returning();

  const [updated] = await db.update(prompts)
    .set({ currentVersionId: version.id })
    .where(eq(prompts.id, prompt.id))
    .returning();

  return c.json({ ...updated, currentVersion: version }, 201);
});

// GET /api/prompts/:id/versions
promptRoutes.get('/:id/versions', async (c) => {
  const id = c.req.param('id');
  if (!await findVisiblePrompt(c, id)) return c.json({ error: 'Not found' }, 404);
  const versions = await db.select().from(promptVersions)
    .where(eq(promptVersions.promptId, id))
    .orderBy(desc(promptVersions.createdAt));
  return c.json(versions);
});

// POST /api/prompts/:id/versions — save new version (auth required)
promptRoutes.post('/:id/versions', async (c) => {
  const userId = await getUser(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const [owner] = await db.select({ userId: prompts.userId }).from(prompts).where(eq(prompts.id, id)).limit(1);
  if (!owner) return c.json({ error: 'Not found' }, 404);
  if (owner.userId !== userId) return c.json({ error: 'Forbidden' }, 403);

  const body = await c.req.json();
  const invalid = promptInputError(body, { versionName: true });
  if (invalid) return c.json({ error: invalid }, 400);
  const { content, imageUrl, versionName } = body;

  const [version] = await db.insert(promptVersions).values({
    promptId: id, content, imageUrl, versionName,
  }).returning();

  await db.update(prompts).set({ currentVersionId: version.id, updatedAt: new Date() }).where(eq(prompts.id, id));

  return c.json(version, 201);
});

// GET /api/saved — get saved prompts for logged-in user
promptRoutes.get('/saved/list', async (c) => {
  const userId = await getUser(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const saved = await db.select().from(savedPrompts)
    .where(eq(savedPrompts.userId, userId))
    .orderBy(desc(savedPrompts.createdAt));

  const withPrompts = await Promise.all(saved.map(async (s) => {
    const [prompt] = await db.select().from(prompts).where(eq(prompts.id, s.promptId)).limit(1);
    // A prompt made private after it was saved is hidden from everyone but its owner.
    if (!prompt || (!prompt.isPublic && prompt.userId !== userId)) return null;
    let currentVersion = null;
    if (prompt.currentVersionId) {
      const [ver] = await db.select().from(promptVersions).where(eq(promptVersions.id, prompt.currentVersionId)).limit(1);
      currentVersion = ver ?? null;
    }
    return { ...s, prompt: { ...prompt, currentVersion } };
  }));

  return c.json(withPrompts.filter(Boolean));
});

// POST /api/prompts/:id/save — toggle save
promptRoutes.post('/:id/save', async (c) => {
  const userId = await getUser(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const promptId = c.req.param('id');
  const existing = await db.select().from(savedPrompts)
    .where(and(eq(savedPrompts.userId, userId), eq(savedPrompts.promptId, promptId)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(savedPrompts).where(eq(savedPrompts.id, existing[0].id));
    return c.json({ saved: false });
  }

  // Saving needs the same visibility as reading: knowing a private prompt's id is not enough.
  if (!await findVisiblePrompt(c, promptId)) return c.json({ error: 'Not found' }, 404);

  await db.insert(savedPrompts).values({ userId, promptId });
  return c.json({ saved: true });
});

// DELETE /api/prompts/:id — owner only
promptRoutes.delete('/:id', async (c) => {
  const userId = await getUser(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const [prompt] = await db.select({ userId: prompts.userId })
    .from(prompts).where(eq(prompts.id, id)).limit(1);

  if (!prompt) return c.json({ error: 'Not found' }, 404);
  if (prompt.userId !== userId) return c.json({ error: 'Forbidden' }, 403);

  await db.delete(prompts).where(eq(prompts.id, id));
  return c.json({ ok: true });
});
