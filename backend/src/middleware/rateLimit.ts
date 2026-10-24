import type { Context, MiddlewareHandler } from 'hono';

type Options = {
  windowMs: number;
  max: number;
  key: (c: Context) => string | Promise<string>;
};

// Fixed-window, in-memory limiter. Enough for the single backend container in
// docker-compose; running several instances would need a shared store (e.g. Redis).
export function rateLimit({ windowMs, max, key }: Options): MiddlewareHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return async (c, next) => {
    const now = Date.now();
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }

    const k = await key(c);
    let entry = hits.get(k);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(k, entry);
    }
    entry.count++;

    if (entry.count > max) {
      c.header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return c.json({ error: 'Too many requests, please try again later' }, 429);
    }
    await next();
  };
}

// Requests reach the backend through two nginx hops (nginx/prompterest.conf →
// frontend/nginx.conf), each appending to X-Forwarded-For. Entries left of the
// trusted hops can be forged by the client, so the real client IP is read from
// the right. Override TRUST_PROXY_HOPS if the proxy chain changes.
export function clientIp(c: Context): string {
  const hops = Number(process.env.TRUST_PROXY_HOPS) || 2;
  const chain = (c.req.header('x-forwarded-for') ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return chain[chain.length - hops] ?? chain[0] ?? 'unknown';
}
