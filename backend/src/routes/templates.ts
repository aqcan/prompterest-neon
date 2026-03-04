import { Hono } from 'hono';
import { db } from '../db/index.js';
import { templates } from '../db/schema.js';
import { eq, asc } from 'drizzle-orm';

const app = new Hono();

app.get('/', async (c) => {
  const mode = c.req.query('mode'); // 'photo' | 'video' | 'scratch' | undefined

  const list = await db
    .select({
      id: templates.id,
      name: templates.name,
      description: templates.description,
      mode: templates.mode,
      coinCost: templates.coinCost,
      emoji: templates.emoji,
      isPremium: templates.isPremium,
      sortOrder: templates.sortOrder,
      // systemPrompt ASLA gönderilmiyor
    })
    .from(templates)
    .where(mode ? eq(templates.mode, mode) : undefined)
    .orderBy(asc(templates.sortOrder));

  return c.json(list);
});

export default app;
