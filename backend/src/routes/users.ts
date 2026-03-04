import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/index.js';
import {
  userSurveys, coinBalances, coinTransactions, users,
} from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';

type Env = { Variables: { userId: string } };
const app = new Hono<Env>();

// POST /api/users/survey
app.post('/survey', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const { interests } = await c.req.json();

  if (!Array.isArray(interests) || interests.length < 3) {
    throw new HTTPException(400, { message: 'min_3_interests_required' });
  }

  // Upsert survey (userId unique)
  await db
    .insert(userSurveys)
    .values({ userId, interests })
    .onConflictDoUpdate({
      target: userSurveys.userId,
      set: { interests, completedAt: new Date() },
    });

  // Welcome bonus fallback (eğer register'da verilmediyse)
  const [user] = await db
    .select({ welcomeCoinsGiven: users.welcomeCoinsGiven })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user && !user.welcomeCoinsGiven) {
    await db.transaction(async (tx) => {
      await tx
        .insert(coinBalances)
        .values({ userId, balance: 500 })
        .onConflictDoUpdate({
          target: coinBalances.userId,
          set: { balance: sql`${coinBalances.balance} + 500`, updatedAt: new Date() },
        });
      await tx.insert(coinTransactions).values({
        userId, amount: 500, type: 'welcome_bonus',
      });
      await tx.update(users).set({ welcomeCoinsGiven: true }).where(eq(users.id, userId));
    });
  }

  return c.json({ ok: true });
});

export default app;
