import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { parseRawSegments } from '../utils/llmSegments.js';

// AI sağlayıcı anahtarları yalnızca sunucuda tutulur; frontend bu route'ları
// kendi JWT'si ile çağırır, anahtarları hiç görmez.

type AuthEnv = { Variables: { userId: string } };
type RawSegment = { original: string; alternatives: string[] };

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const HF_CHAT_URL = 'https://router.huggingface.co/v1/chat/completions';
const HF_IMAGE_BASE = 'https://router.huggingface.co/hf-inference/models';

export const MAX_PROMPT_LENGTH = 4000;

// HuggingFace fallback models (credits often depleted)
const HF_CHAT_MODELS = [
  'meta-llama/Llama-3.1-8B-Instruct', // Cerebras — fastest
  'Qwen/Qwen3-Coder-Next',             // solid JSON output
  'deepseek-ai/DeepSeek-V3.2',         // good quality, wraps in ```json (parser handles it)
];

const SYSTEM_PROMPT = `You are a prompt engineering expert. The user gives you an image generation prompt.
Pick 3 short phrases from it and suggest 3 alternatives for each.

Reply ONLY with this exact JSON format:
{"segments":[{"original":"phrase from prompt","alternatives":["alt1","alt2","alt3"]},{"original":"phrase from prompt","alternatives":["alt1","alt2","alt3"]},{"original":"phrase from prompt","alternatives":["alt1","alt2","alt3"]}]}

Rules:
- No explanation, no markdown, no thinking, ONLY the JSON object
- "original" must be an exact substring from the user's prompt
- Exactly 3 segments, exactly 3 alternatives each`;

type ChatResponse = { choices: Array<{ message: { content?: string; reasoning?: string } }> };

function chatBody(model: string, promptText: string, maxTokens: number) {
  return JSON.stringify({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: promptText },
    ],
    temperature: 0.7,
    max_tokens: maxTokens,
  });
}

// Some models put output in `reasoning` when content is empty
function chatContent(data: ChatResponse): string {
  const msg = data.choices?.[0]?.message;
  return msg?.content || msg?.reasoning || '';
}

async function callOpenRouterChat(promptText: string, model: string, apiKey: string): Promise<string> {
  const res = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: chatBody(model, promptText, 1024),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  return chatContent(await res.json() as ChatResponse);
}

async function callHfChat(promptText: string, model: string, token: string): Promise<string> {
  const res = await fetch(HF_CHAT_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: chatBody(model, promptText, 512),
  });
  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) throw new Error(`HF ${res.status}`);
  return chatContent(await res.json() as ChatResponse);
}

async function tryHfFallback(prompt: string, token: string): Promise<RawSegment[]> {
  let lastError: Error = new Error('Refactor failed');
  for (const model of HF_CHAT_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const segments = parseRawSegments(await callHfChat(prompt, model, token));
        if (segments.length > 0) return segments;
        lastError = new Error('No valid segments found.');
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Failed');
        if (lastError.message === 'RATE_LIMIT') break;
      }
    }
  }
  throw lastError;
}

export async function refactorSegments(prompt: string): Promise<RawSegment[]> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openRouterModel = process.env.CHAT_MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free';

  if (openRouterKey) {
    try {
      const segments = parseRawSegments(await callOpenRouterChat(prompt, openRouterModel, openRouterKey));
      if (segments.length > 0) return segments;
    } catch {
      // Fall through to HuggingFace
    }
  }

  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) throw new Error('AI provider is not configured');
  return tryHfFallback(prompt, hfToken);
}

function readPrompt(body: unknown): string | null {
  const prompt = (body as { prompt?: unknown } | null)?.prompt;
  if (typeof prompt !== 'string') return null;
  const trimmed = prompt.trim();
  if (!trimmed || trimmed.length > MAX_PROMPT_LENGTH) return null;
  return prompt;
}

const app = new Hono<AuthEnv>();

app.use('*', authMiddleware);
// Provider calls cost money/credits: cap them per user
app.use('*', rateLimit({ windowMs: 60 * 1000, max: 20, key: (c) => `ai:${c.get('userId')}` }));

app.post('/refactor', async (c) => {
  const prompt = readPrompt(await c.req.json().catch(() => null));
  if (!prompt) return c.json({ error: `prompt is required (max ${MAX_PROMPT_LENGTH} chars)` }, 400);

  try {
    return c.json({ segments: await refactorSegments(prompt) });
  } catch (err) {
    console.error('[ai/refactor]', err);
    return c.json({ error: 'Refactor failed, please try again' }, 502);
  }
});

app.post('/image', async (c) => {
  const prompt = readPrompt(await c.req.json().catch(() => null));
  if (!prompt) return c.json({ error: `prompt is required (max ${MAX_PROMPT_LENGTH} chars)` }, 400);

  const token = process.env.HF_TOKEN;
  if (!token) return c.json({ error: 'AI provider is not configured' }, 503);
  const model = process.env.IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell';

  const res = await fetch(`${HF_IMAGE_BASE}/${model}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: prompt }),
  });
  if (!res.ok) {
    console.error('[ai/image]', res.status, (await res.text()).slice(0, 300));
    return c.json({ error: `Image generation failed (${res.status})` }, 502);
  }

  // Stored as a base64 data URL directly in Neon
  const contentType = res.headers.get('content-type') || 'image/png';
  const base64 = Buffer.from(await res.arrayBuffer()).toString('base64');
  return c.json({ imageUrl: `data:${contentType};base64,${base64}` });
});

export default app;
