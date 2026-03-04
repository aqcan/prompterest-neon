import { Hono } from 'hono';
import { db } from '../db/index.js';
import { styles } from '../db/schema.js';
import { asc } from 'drizzle-orm';

const app = new Hono();

app.get('/', async (c) => {
  const list = await db
    .select({
      id: styles.id,
      name: styles.name,
      isPremium: styles.isPremium,
      previewImagePath: styles.previewImagePath,
      // systemPrompt ASLA gönderilmiyor
    })
    .from(styles)
    .orderBy(styles.isPremium, asc(styles.createdAt));
  return c.json(list);
});

export default app;
