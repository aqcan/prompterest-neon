import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { SignJWT } from 'jose';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

vi.mock('../db/index.js', () => ({
  db: {
    query: {
      generations: { findFirst: vi.fn() },
      styles: { findFirst: vi.fn() },
      templates: { findFirst: vi.fn() },
    },
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock('../utils/premium.js', () => ({ getUserPlan: vi.fn() }));

import { db } from '../db/index.js';
import { getUserPlan } from '../utils/premium.js';
import generateRoute from './generate.js';

process.env.JWT_SECRET = 'change-me';
const JWT_SECRET = new TextEncoder().encode('change-me');

async function makeToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(JWT_SECRET);
}

const app = new Hono();
app.route('/api/generate', generateRoute);

async function post(body: Record<string, unknown>, userId = 'u1') {
  return app.request('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await makeToken(userId)}` },
    body: JSON.stringify({ userText: 'a cat', styleId: 's1', modelId: 'z_turbo', ...body }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(db.insert).mockReturnValue({
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'g1', coinCost: 5 }]),
  } as never);
  vi.mocked(db.update).mockReturnValue({
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  } as never);
  vi.mocked(db.query.styles.findFirst).mockResolvedValue({ id: 's1', isPremium: false, systemPrompt: 'style' } as never);
  vi.mocked(getUserPlan).mockResolvedValue('free');
});

describe('POST /api/generate', () => {
  it('looks up the idempotency key only among the caller\'s own generations', async () => {
    vi.mocked(db.query.generations.findFirst).mockResolvedValue({ id: 'g0', promptId: 'p0', status: 'completed' } as never);

    const res = await post({ idempotencyKey: 'k1' });
    expect(res.status).toBe(200);

    const { where } = vi.mocked(db.query.generations.findFirst).mock.calls[0][0] as { where: SQL };
    const query = new PgDialect().sqlToQuery(where);
    expect(query.sql).toContain('"user_id"');
    expect(query.params).toEqual(['k1', 'u1']);
  });

  it('403 for a premium template on the free plan, before any coins are taken', async () => {
    vi.mocked(db.query.templates.findFirst).mockResolvedValue({ id: 't1', isPremium: true, systemPrompt: 'tpl' } as never);

    const res = await post({ templateId: 't1' });
    expect(res.status).toBe(403);
    expect(await res.text()).toBe('premium_template_required');
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('400 for an unknown template, before any coins are taken', async () => {
    vi.mocked(db.query.templates.findFirst).mockResolvedValue(undefined);

    const res = await post({ templateId: 'missing' });
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('invalid_template');
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('lets a paid plan use a premium template', async () => {
    vi.mocked(getUserPlan).mockResolvedValue('pro');
    vi.mocked(db.query.templates.findFirst).mockResolvedValue({ id: 't1', isPremium: true, systemPrompt: 'tpl' } as never);
    vi.mocked(db.transaction).mockRejectedValue(new Error('insufficient'));

    const res = await post({ templateId: 't1' });
    // Gets past the premium guard and on to the coin check.
    expect(res.status).toBe(402);
    expect(db.transaction).toHaveBeenCalledOnce();
  });
});
