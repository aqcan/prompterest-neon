import { describe, it, expect, afterEach } from 'vitest';
import { Hono } from 'hono';
import { rateLimit, clientIp } from './rateLimit.js';

function appWith(max: number, windowMs = 60_000) {
  const app = new Hono();
  app.use('/x', rateLimit({ windowMs, max, key: (c) => c.req.header('x-key') ?? 'anon' }));
  app.get('/x', (c) => c.json({ ok: true }));
  return app;
}

describe('rateLimit', () => {
  it('allows up to max requests, then returns 429 with Retry-After', async () => {
    const app = appWith(2);
    expect((await app.request('/x')).status).toBe(200);
    expect((await app.request('/x')).status).toBe(200);
    const blocked = await app.request('/x');
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('counts keys independently', async () => {
    const app = appWith(1);
    expect((await app.request('/x', { headers: { 'x-key': 'a' } })).status).toBe(200);
    expect((await app.request('/x', { headers: { 'x-key': 'b' } })).status).toBe(200);
    expect((await app.request('/x', { headers: { 'x-key': 'a' } })).status).toBe(429);
  });

  it('resets after the window passes', async () => {
    const app = appWith(1, 20);
    expect((await app.request('/x')).status).toBe(200);
    expect((await app.request('/x')).status).toBe(429);
    await new Promise((r) => setTimeout(r, 30));
    expect((await app.request('/x')).status).toBe(200);
  });
});

describe('clientIp', () => {
  afterEach(() => { delete process.env.TRUST_PROXY_HOPS; });

  async function ipFor(xff?: string) {
    const app = new Hono();
    app.get('/', (c) => c.text(clientIp(c)));
    const res = await app.request('/', { headers: xff ? { 'x-forwarded-for': xff } : {} });
    return res.text();
  }

  it('reads the client IP added by the first trusted proxy, ignoring forged entries', async () => {
    expect(await ipFor('6.6.6.6, 203.0.113.7, 172.18.0.2')).toBe('203.0.113.7');
  });

  it('respects TRUST_PROXY_HOPS', async () => {
    process.env.TRUST_PROXY_HOPS = '1';
    expect(await ipFor('203.0.113.7, 172.18.0.2')).toBe('172.18.0.2');
  });

  it('falls back when the header is short or missing', async () => {
    expect(await ipFor('203.0.113.7')).toBe('203.0.113.7');
    expect(await ipFor()).toBe('unknown');
  });
});
