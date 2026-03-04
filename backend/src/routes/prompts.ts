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
  const id = c.req.param('id');
  const [prompt] = await db.select().from(prompts).where(eq(prompts.id, id)).limit(1);
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

  const { title, content, imageUrl, tags, isPublic } = await c.req.json();

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
  const { content, imageUrl, versionName } = await c.req.json();

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
    if (!prompt) return null;
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
