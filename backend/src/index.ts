import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth.js';
import { promptRoutes } from './routes/prompts.js';
import stylesRoute from './routes/styles.js';
import generateRoute from './routes/generate.js';
import coinsRoute from './routes/coins.js';
import usersRoute from './routes/users.js';
import socialRoute from './routes/social.js';

const app = new Hono();

app.use('*', cors({ origin: '*' }));

app.onError((err, c) => {
  console.error('[ERROR]', err);
  return c.json({ error: err.message }, 500);
});

app.get('/api/health', (c) => c.json({ ok: true }));
app.route('/api/auth', authRoutes);
app.route('/api/prompts', promptRoutes);
app.route('/api/styles', stylesRoute);
app.route('/api/generate', generateRoute);
app.route('/api/coins', coinsRoute);
app.route('/api/users', usersRoute);
app.route('/api/social', socialRoute);

const port = Number(process.env.PORT) || 3000;
console.log(`Server running on port ${port}`);

serve({ fetch: app.fetch, port });
