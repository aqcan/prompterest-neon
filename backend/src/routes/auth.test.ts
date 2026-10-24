import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { authRoutes, verifyToken, hashPassword, verifyPassword, isLegacyHash } from './auth.js';

// DB mock — Neon'a sıfır bağlantı
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

import { db } from '../db/index.js';

process.env.JWT_SECRET = 'test-secret';

function makeUpdateChain() {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
  return chain;
}

beforeEach(() => {
  vi.mocked(db.update).mockReturnValue(makeUpdateChain() as never);
});

function makeChain(resolvedValue: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(resolvedValue),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(resolvedValue),
  };
  return chain;
}

const app = new Hono();
app.route('/api/auth', authRoutes);

const mockUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  username: 'testuser',
  passwordHash: '',
  avatar: null,
  createdAt: new Date(),
};

describe('POST /api/auth/register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('400 when fields are missing', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com' }),
    });
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toContain('required');
  });

  it('400 when email already registered', async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([mockUser]) as never);
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', username: 'u1', password: 'password1' }),
    });
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toContain('already registered');
  });

  it('200 and returns token on success', async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([]) as never);
    const createdUser = { ...mockUser, email: 'new@example.com', username: 'newuser', passwordHash: 'salt:hash' };
    vi.mocked(db.insert).mockReturnValue(makeChain([createdUser]) as never);

    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@example.com', username: 'newuser', password: 'secret123' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as { token: string; user: { email: string } };
    expect(data.token).toBeTruthy();
    expect(data.user.email).toBe('new@example.com');
  });

  it('400 for a short password or malformed email, without touching the DB', async () => {
    for (const body of [
      { email: 'new@example.com', username: 'newuser', password: 'short' },
      { email: 'not-an-email', username: 'newuser', password: 'longenough1' },
    ]) {
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      expect(res.status).toBe(400);
    }
    expect(db.select).not.toHaveBeenCalled();
  });
});

describe('login brute-force protection', () => {
  it('returns 429 after 10 attempts against the same account', async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([]) as never);
    const attempt = () => app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.9, 172.18.0.2' },
      body: JSON.stringify({ email: 'Victim@Example.com', password: 'guess' }),
    });
    for (let i = 0; i < 10; i++) expect((await attempt()).status).toBe(401);
    expect((await attempt()).status).toBe(429);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('401 when user not found', async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([]) as never);
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@x.com', password: 'wrong' }),
    });
    expect(res.status).toBe(401);
  });

  it('401 when password is wrong', async () => {
    const { createHash, randomBytes } = await import('node:crypto');
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256').update('correctpass' + salt).digest('hex');
    const userWithHash = { ...mockUser, passwordHash: `${salt}:${hash}` };

    vi.mocked(db.select).mockReturnValue(makeChain([userWithHash]) as never);
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'wrongpass' }),
    });
    expect(res.status).toBe(401);
  });

  it('200 and returns token on correct credentials', async () => {
    const { createHash, randomBytes } = await import('node:crypto');
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256').update('correctpass' + salt).digest('hex');
    const userWithHash = { ...mockUser, passwordHash: `${salt}:${hash}` };

    vi.mocked(db.select).mockReturnValue(makeChain([userWithHash]) as never);
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'correctpass' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as { token: string };
    expect(data.token).toBeTruthy();
  });
});

describe('verifyToken', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null for invalid token', async () => {
    const result = await verifyToken('not-a-real-token');
    expect(result).toBeNull();
  });

  it('returns userId for a valid token', async () => {
    const { createHash, randomBytes } = await import('node:crypto');
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256').update('pass' + salt).digest('hex');
    const userWithHash = { ...mockUser, passwordHash: `${salt}:${hash}` };
    vi.mocked(db.select).mockReturnValue(makeChain([userWithHash]) as never);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'pass' }),
    });
    const { token } = await res.json() as { token: string };
    const userId = await verifyToken(token);
    expect(userId).toBe(mockUser.id);
  });

  it('returns null when JWT_SECRET is missing instead of using a default', async () => {
    const { SignJWT } = await import('jose');
    const forged = await new SignJWT({ sub: 'attacker' })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(new TextEncoder().encode('change-me'));
    const saved = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      expect(await verifyToken(forged)).toBeNull();
    } finally {
      process.env.JWT_SECRET = saved;
    }
  });
});

describe('password hashing', () => {
  it('hashes with scrypt and verifies the right password only', async () => {
    const stored = await hashPassword('correctpass');
    expect(stored.startsWith('scrypt$131072$8$1$')).toBe(true);
    expect(isLegacyHash(stored)).toBe(false);
    expect(await verifyPassword('correctpass', stored)).toBe(true);
    expect(await verifyPassword('wrongpass', stored)).toBe(false);
  });

  it('uses a fresh salt per hash', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });

  it('rejects malformed stored hashes and missing passwords', async () => {
    expect(await verifyPassword('x', 'garbage')).toBe(false);
    expect(await verifyPassword(undefined as unknown as string, 'a:b')).toBe(false);
  });

  it('upgrades a legacy SHA-256 hash to scrypt on successful login', async () => {
    const { createHash, randomBytes } = await import('node:crypto');
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256').update('pass' + salt).digest('hex');
    vi.mocked(db.select).mockReturnValue(makeChain([{ ...mockUser, passwordHash: `${salt}:${hash}` }]) as never);
    const update = makeUpdateChain();
    vi.mocked(db.update).mockReturnValue(update as never);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'pass' }),
    });
    expect(res.status).toBe(200);
    const newHash = (update.set.mock.calls[0][0] as { passwordHash: string }).passwordHash;
    expect(newHash.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('pass', newHash)).toBe(true);
  });
});
