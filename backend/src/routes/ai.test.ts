import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { SignJWT } from 'jose';

vi.mock('../db/index.js', () => ({ db: {} }));

process.env.JWT_SECRET = 'change-me';
const JWT_SECRET = new TextEncoder().encode('change-me');

const { default: aiRoute, MAX_PROMPT_LENGTH } = await import('./ai.js');

const app = new Hono();
app.route('/api/ai', aiRoute);

async function makeToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(JWT_SECRET);
}

async function post(path: string, body: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return app.request(`/api/ai${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
}

const segmentsJson = '{"segments":[{"original":"a cat","alternatives":["a dog","a bird","a fish"]}]}';

function chatReply(content: string) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  process.env.OPENROUTER_API_KEY = 'or-test';
  process.env.HF_TOKEN = 'hf-test';
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.HF_TOKEN;
});

describe('auth', () => {
  it('rejects requests without a token', async () => {
    const res = await post('/refactor', { prompt: 'a cat' });
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/ai/refactor', () => {
  it('returns 400 when prompt is missing', async () => {
    const res = await post('/refactor', {}, await makeToken('u1'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when prompt is too long', async () => {
    const res = await post('/refactor', { prompt: 'x'.repeat(MAX_PROMPT_LENGTH + 1) }, await makeToken('u1'));
    expect(res.status).toBe(400);
  });

  it('returns segments from OpenRouter using the server-side key', async () => {
    fetchMock.mockResolvedValueOnce(chatReply(segmentsJson));
    const res = await post('/refactor', { prompt: 'a cat on a roof' }, await makeToken('u1'));
    expect(res.status).toBe(200);
    expect((await res.json()).segments[0].original).toBe('a cat');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('openrouter.ai');
    expect(init.headers.Authorization).toBe('Bearer or-test');
  });

  it('falls back to HuggingFace when OpenRouter fails', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('nope', { status: 500 }))
      .mockResolvedValueOnce(chatReply(segmentsJson));
    const res = await post('/refactor', { prompt: 'a cat on a roof' }, await makeToken('u1'));
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toContain('router.huggingface.co');
    expect(init.headers.Authorization).toBe('Bearer hf-test');
  });

  it('moves to the next HF model when one is rate limited', async () => {
    delete process.env.OPENROUTER_API_KEY;
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(chatReply(segmentsJson));
    const res = await post('/refactor', { prompt: 'a cat on a roof' }, await makeToken('u1'));
    expect(res.status).toBe(200);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).model).not.toBe(JSON.parse(fetchMock.mock.calls[0][1].body).model);
  });

  it('returns 502 without leaking provider details when every provider fails', async () => {
    fetchMock.mockResolvedValue(new Response('secret upstream detail', { status: 500 }));
    const res = await post('/refactor', { prompt: 'a cat' }, await makeToken('u1'));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('secret upstream detail');
  });

  it('returns 502 when no provider is configured', async () => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.HF_TOKEN;
    const res = await post('/refactor', { prompt: 'a cat' }, await makeToken('u1'));
    expect(res.status).toBe(502);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/ai/image', () => {
  it('returns the generated image as a data URL', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'image/jpeg' } }),
    );
    const res = await post('/image', { prompt: 'a cat' }, await makeToken('u1'));
    expect(res.status).toBe(200);
    expect((await res.json()).imageUrl).toBe('data:image/jpeg;base64,AQID');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer hf-test');
  });

  it('returns 502 when the provider fails', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"error":"busy"}', { status: 503 }));
    const res = await post('/image', { prompt: 'a cat' }, await makeToken('u1'));
    expect(res.status).toBe(502);
  });

  it('returns 503 when HF_TOKEN is not set', async () => {
    delete process.env.HF_TOKEN;
    const res = await post('/image', { prompt: 'a cat' }, await makeToken('u1'));
    expect(res.status).toBe(503);
  });
});
