import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/index.js';
import { follows, prompts, users } from '../db/schema.js';
import { eq, and, desc, inArray, count } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { verifyToken } from './auth.js';

type Env = { Variables: { userId: string } };
const app = new Hono<Env>();

// ── POST /api/social/follow/:userId ─────────────────────────────────────────
app.post('/follow/:userId', authMiddleware, async (c) => {
  const followerId = c.get('userId');
  const followingId = c.req.param('userId');
  if (followerId === followingId) {
    throw new HTTPException(400, { message: 'cannot_follow_self' });
  }
  await db.insert(follows).values({ followerId, followingId }).onConflictDoNothing();
  return c.json({ following: true });
});

// ── DELETE /api/social/unfollow/:userId ─────────────────────────────────────
app.delete('/unfollow/:userId', authMiddleware, async (c) => {
  const followerId = c.get('userId');
  const followingId = c.req.param('userId');
  await db.delete(follows).where(
    and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)),
  );
  return c.json({ following: false });
});

// ── GET /api/social/following — takip edilen kullanıcı listesi ──────────────
app.get('/following', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const list = await db
    .select({ id: users.id, username: users.username, avatar: users.avatar })
    .from(follows)
    .innerJoin(users, eq(follows.followingId, users.id))
    .where(eq(follows.followerId, userId));
  return c.json(list);
});

// ── GET /api/social/feed — takip edilenlerin promptları ─────────────────────
app.get('/feed', authMiddleware, async (c) => {
  const userId = c.get('userId');

  // Takip edilen kullanıcı ID'lerini al
  const followedRows = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, userId));

  if (followedRows.length === 0) {
    return c.json([]);
  }

  const followedIds = followedRows.map((r) => r.followingId);

  // Bu kullanıcıların public promptlarını getir (son 50)
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
    .where(
      and(
        eq(prompts.isPublic, true),
        inArray(prompts.userId, followedIds),
      ),
    )
    .orderBy(desc(prompts.createdAt))
    .limit(50);

  return c.json(list);
});

// ── GET /api/social/user/:userId/profile — public profil ────────────────────
app.get('/user/:userId/profile', async (c) => {
  const targetId = c.req.param('userId');

  // Kullanıcı bilgileri
  const [user] = await db
    .select({ id: users.id, username: users.username, avatar: users.avatar })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);

  if (!user) return c.json({ error: 'Not found' }, 404);

  // Takipçi sayısı (kaç kişi takip ediyor)
  const [followerRow] = await db
    .select({ cnt: count() })
    .from(follows)
    .where(eq(follows.followingId, targetId));
  const followerCount = Number(followerRow?.cnt ?? 0);

  // Takip edilen sayısı (kaç kişiyi takip ediyor)
  const [followingRow] = await db
    .select({ cnt: count() })
    .from(follows)
    .where(eq(follows.followerId, targetId));
  const followingCount = Number(followingRow?.cnt ?? 0);

  // Mevcut kullanıcı takip ediyor mu?
  let isFollowing = false;
  const auth = c.req.header('Authorization');
  if (auth?.startsWith('Bearer ')) {
    const currentUserId = await verifyToken(auth.slice(7));
    if (currentUserId && currentUserId !== targetId) {
      const [row] = await db
        .select({ id: follows.id })
        .from(follows)
        .where(and(eq(follows.followerId, currentUserId), eq(follows.followingId, targetId)))
        .limit(1);
      isFollowing = !!row;
    }
  }

  // Kullanıcının public promptları (son 20)
  const userPrompts = await db
    .select({
      id: prompts.id,
      imageUrl: prompts.imageUrl,
      styleId: prompts.styleId,
      modelId: prompts.modelId,
      createdAt: prompts.createdAt,
    })
    .from(prompts)
    .where(and(eq(prompts.userId, targetId), eq(prompts.isPublic, true)))
    .orderBy(desc(prompts.createdAt))
    .limit(20);

  return c.json({
    user,
    followerCount,
    followingCount,
    isFollowing,
    prompts: userPrompts,
  });
});

export default app;
