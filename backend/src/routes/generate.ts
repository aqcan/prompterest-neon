import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/index.js';
import {
  generations, styles, templates, prompts,
  coinBalances, coinTransactions,
} from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { buildPromptWithStyle } from '../utils/buildPrompt.js';
import { calculateCost } from '../utils/coinCosts.js';
import { getUserPlan } from '../utils/premium.js';

type Env = { Variables: { userId: string } };
const app = new Hono<Env>();

// ── AtlasCloud placeholder ────────────────────────────────────────────────────
// Gerçek API anahtarı gelince burası doldurulacak
async function callAtlasCloud(_params: {
  prompt: string;
  modelId: string;
  inputImageBase64?: string;
}): Promise<{ imageUrl: string }> {
  // TODO: AtlasCloud API entegrasyonu
  // Şimdilik placeholder URL döndürür
  throw new Error('AtlasCloud API henüz entegre edilmedi. Gerçek anahtar gelince ekle.');
}

// ── Yardımcılar ───────────────────────────────────────────────────────────────
async function failGeneration(id: string, errorCode: string) {
  await db
    .update(generations)
    .set({ status: 'failed', errorCode, updatedAt: new Date() })
    .where(eq(generations.id, id));
}

async function refundCoins(
  userId: string,
  gen: { id: string; coinCost: number },
) {
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(coinBalances)
        .set({ balance: sql`balance + ${gen.coinCost}`, updatedAt: new Date() })
        .where(eq(coinBalances.userId, userId));
      await tx.insert(coinTransactions).values({
        userId,
        amount: gen.coinCost,
        type: 'refund',
        meta: { generationId: gen.id },
      });
    });
  } catch {
    // Refund başarısız — manuel inceleme için kayıt
    await db
      .update(generations)
      .set({ errorCode: 'refund_failed' })
      .where(eq(generations.id, gen.id));
    console.error('REFUND_FAILED', gen.id);
  }
}

// ── POST /api/generate ────────────────────────────────────────────────────────
app.post('/', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const { userText, scene, styleId, modelId, inputImageBase64, idempotencyKey, templateId } =
    await c.req.json();

  if (!userText && !inputImageBase64) {
    throw new HTTPException(400, { message: 'prompt_required' });
  }
  if (!styleId || !modelId) {
    throw new HTTPException(400, { message: 'style_and_model_required' });
  }

  // 1. Idempotency kontrolü — aynı key ile tekrar gönderim engelle
  if (idempotencyKey) {
    const existing = await db.query.generations.findFirst({
      where: eq(generations.idempotencyKey, idempotencyKey),
    });
    if (existing?.status === 'completed') {
      return c.json({ generationId: existing.id, promptId: existing.promptId });
    }
    if (existing?.status === 'pending') {
      throw new HTTPException(409, { message: 'already_processing' });
    }
  }

  const isImgToImg = Boolean(inputImageBase64);
  const coinCost = calculateCost({ modelId, isImgToImg, isRegenerate: false });

  // 2. Generation kaydı aç (pending)
  const [gen] = await db
    .insert(generations)
    .values({ userId, styleId, templateId: templateId ?? null, modelId, idempotencyKey, coinCost, status: 'pending' })
    .returning();

  // 3. Style doğrulaması + premium guard
  const style = await db.query.styles.findFirst({ where: eq(styles.id, styleId) });
  if (!style) {
    await failGeneration(gen.id, '400');
    throw new HTTPException(400, { message: 'invalid_style' });
  }
  const userPlan = await getUserPlan(userId);
  if (style.isPremium && userPlan === 'free') {
    await failGeneration(gen.id, '403');
    throw new HTTPException(403, { message: 'premium_style_required' });
  }

  // 4. Coin kesme (atomik transaction + row lock)
  try {
    await db.transaction(async (tx) => {
      const [bal] = await tx
        .select()
        .from(coinBalances)
        .where(eq(coinBalances.userId, userId))
        .for('update');

      if (!bal || bal.balance < coinCost) {
        throw new Error('insufficient');
      }
      await tx
        .update(coinBalances)
        .set({ balance: bal.balance - coinCost, updatedAt: new Date() })
        .where(eq(coinBalances.userId, userId));
      await tx.insert(coinTransactions).values({
        userId,
        amount: -coinCost,
        type: isImgToImg ? 'generate_i2i' : 'generate_t2i',
        meta: { generationId: gen.id, modelId, styleId },
      });
    });
  } catch (e: unknown) {
    const err = e as Error;
    if (err.message === 'insufficient') {
      await failGeneration(gen.id, '402');
      throw new HTTPException(402, { message: 'insufficient_coins' });
    }
    await failGeneration(gen.id, '500');
    throw e;
  }

  // 3b. Template yükleme (opsiyonel)
  let templateSystemPrompt = '';
  if (templateId) {
    const template = await db.query.templates.findFirst({
      where: eq(templates.id, templateId),
    });
    if (!template) {
      await failGeneration(gen.id, '400');
      throw new HTTPException(400, { message: 'invalid_template' });
    }
    templateSystemPrompt = template.systemPrompt;
  }

  // 5. Prompt birleştir (systemPrompt backend'de eklenir: style + template + userText)
  const combinedSystemContext = [style.systemPrompt, templateSystemPrompt]
    .filter(Boolean)
    .join(', ');
  const finalPrompt = buildPromptWithStyle(userText ?? '', scene, combinedSystemContext);

  // 6. AtlasCloud API (timeout: 30sn)
  let imageUrl: string;
  try {
    const result = await Promise.race([
      callAtlasCloud({ prompt: finalPrompt, modelId, inputImageBase64 }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 30_000),
      ),
    ]);
    imageUrl = result.imageUrl;
  } catch (e: unknown) {
    const err = e as Error;
    const code = err.message === 'timeout' ? '504' : '500';
    await failGeneration(gen.id, code);
    await refundCoins(userId, gen);
    throw new HTTPException(parseInt(code) as 504 | 500);
  }

  // 7. Başarılı — prompt kaydet, generation güncelle
  const [prompt] = await db
    .insert(prompts)
    .values({
      userId,
      imageUrl,
      styleId,
      modelId,
      isPublic: true,
      title: '',
      content: userText ?? '',
    })
    .returning();

  await db
    .update(generations)
    .set({ status: 'completed', promptId: prompt.id, updatedAt: new Date() })
    .where(eq(generations.id, gen.id));

  return c.json({ generationId: gen.id, imageUrl, promptId: prompt.id });
});

export default app;
