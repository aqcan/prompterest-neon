import type { MiddlewareHandler } from 'hono';
import { verifyToken } from '../routes/auth.js';

type AuthEnv = { Variables: { userId: string } };

// Hono middleware — Authorization header'dan userId'yi context'e yazar
export const authMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const userId = await verifyToken(auth.slice(7));
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  c.set('userId', userId);
  await next();
}
