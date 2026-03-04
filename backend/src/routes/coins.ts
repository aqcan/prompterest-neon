import { Hono } from 'hono';
import { db } from '../db/index.js';
import { coinBalances, coinTransactions } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';

type Env = { Variables: { userId: string } };
const app = new Hono<Env>();

// GET /api/coins/balance
app.get('/balance', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const [bal] = await db
    .select({ balance: coinBalances.balance })
    .from(coinBalances)
    .where(eq(coinBalances.userId, userId))
    .limit(1);
  return c.json({ balance: bal?.balance ?? 0 });
});

// GET /api/coins/transactions — son 50 işlem
app.get('/transactions', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const txs = await db
    .select()
    .from(coinTransactions)
    .where(eq(coinTransactions.userId, userId))
    .orderBy(desc(coinTransactions.createdAt))
    .limit(50);
  return c.json(txs);
});

// POST /api/coins/purchase — v1: yakında placeholder
app.post('/purchase', authMiddleware, async (c) => {
  return c.json({ message: 'Yakında açılıyor.' }, 404);
});

// POST /api/coins/weekly-refill — v1: stub (v2'de cron job ile otomatik)
// Basic: 200 coin/hafta, Pro: 500 coin/hafta
app.post('/weekly-refill', authMiddleware, async (c) => {
  // TODO v2: subscription kontrolü + coin yükleme + son yükleme tarihi kontrolü
  return c.json({ message: 'Haftalık yükleme henüz aktif değil.' }, 404);
});

export default app;
