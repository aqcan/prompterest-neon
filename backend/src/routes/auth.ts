import { Hono, type Context } from 'hono';
import { rateLimit, clientIp } from '../middleware/rateLimit.js';
import { db } from '../db/index.js';
import { users, coinBalances, coinTransactions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// No fallback secret: a guessable default would let anyone forge tokens.
function jwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
}

// OWASP Password Storage Cheat Sheet minimum for scrypt: N=2^17, r=8, p=1 (~128 MiB)
const SCRYPT = { N: 2 ** 17, r: 8, p: 1, keyLen: 64 };

function scryptAsync(password: string, salt: string, opts: ScryptOptions, keyLen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLen, { ...opts, maxmem: 256 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await scryptAsync(password, salt, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p }, SCRYPT.keyLen);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt}$${key.toString('hex')}`;
}

function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// Accepts both the current scrypt format and the legacy "salt:sha256" format.
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (typeof password !== 'string' || !stored) return false;
  if (stored.startsWith('scrypt$')) {
    const [, N, r, p, salt, hash] = stored.split('$');
    const key = await scryptAsync(password, salt, { N: Number(N), r: Number(r), p: Number(p) }, hash.length / 2);
    return safeEqualHex(key.toString('hex'), hash);
  }
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  return safeEqualHex(createHash('sha256').update(password + salt).digest('hex'), hash);
}

export function isLegacyHash(stored: string): boolean {
  return !stored.startsWith('scrypt$');
}

async function createToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(jwtSecret());
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret());
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export const authRoutes = new Hono();

const FIFTEEN_MIN = 15 * 60 * 1000;

async function bodyEmail(c: Context): Promise<string> {
  const body = await c.req.json().catch(() => ({})) as { email?: unknown };
  return typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
}

// Brute-force protection: per IP, and per target account regardless of IP.
authRoutes.use('/login', rateLimit({ windowMs: FIFTEEN_MIN, max: 30, key: (c) => `ip:${clientIp(c)}` }));
authRoutes.use('/login', rateLimit({ windowMs: FIFTEEN_MIN, max: 10, key: async (c) => `email:${await bodyEmail(c)}` }));
authRoutes.use('/register', rateLimit({ windowMs: 60 * 60 * 1000, max: 10, key: (c) => `ip:${clientIp(c)}` }));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function registerError(email: unknown, username: unknown, password: unknown): string | null {
  if (!email || !username || !password) return 'email, username and password required';
  if (typeof email !== 'string' || email.length > 254 || !EMAIL_RE.test(email)) return 'email: invalid';
  if (typeof username !== 'string' || username.length < 2 || username.length > 30) return 'username: 2-30 characters';
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) return 'password: 8-128 characters';
  return null;
}

authRoutes.post('/register', async (c) => {
  const { email, username, password } = await c.req.json();
  const invalid = registerError(email, username, password);
  if (invalid) return c.json({ error: invalid }, 400);
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) return c.json({ error: 'email: already registered' }, 400);

  const [user] = await db.insert(users).values({
    email,
    username,
    passwordHash: await hashPassword(password),
  }).returning();

  // Welcome bonus: 500 coin (bir kez)
  await db.insert(coinBalances).values({ userId: user.id, balance: 500 });
  await db.insert(coinTransactions).values({ userId: user.id, amount: 500, type: 'welcome_bonus' });
  await db.update(users).set({ welcomeCoinsGiven: true }).where(eq(users.id, user.id));

  const token = await createToken(user.id);
  return c.json({ token, user: { id: user.id, email: user.email, username: user.username } });
});

authRoutes.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !await verifyPassword(password, user.passwordHash)) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }
  // Upgrade legacy SHA-256 hashes now that we have the plaintext password
  if (isLegacyHash(user.passwordHash)) {
    await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, user.id))
      .catch((err: unknown) => console.error('[auth] password rehash failed', err));
  }
  const token = await createToken(user.id);
  return c.json({ token, user: { id: user.id, email: user.email, username: user.username } });
});
