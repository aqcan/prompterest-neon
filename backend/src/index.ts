import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth.js';
import { promptRoutes } from './routes/prompts.js';
import stylesRoute from './routes/styles.js';
import templatesRoute from './routes/templates.js';
import generateRoute from './routes/generate.js';
import coinsRoute from './routes/coins.js';
import usersRoute from './routes/users.js';
import socialRoute from './routes/social.js';
import aiRoute from './routes/ai.js';
import { HTTPException } from 'hono/http-exception';
import { bodyLimit } from 'hono/body-limit';
import { allowedOrigins } from './utils/corsOrigins.js';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set; refusing to start');
}

const app = new Hono();

app.use('*', cors({ origin: allowedOrigins }));

// Generated images travel as base64 data URLs, so allow a few MB but no more.
app.use('/api/*', bodyLimit({
  maxSize: 8 * 1024 * 1024,
  onError: (c) => c.json({ error: 'Request body too large' }, 413),
}));

// Intentional HTTPExceptions keep their status and message; anything else is
// logged server-side and returned as a generic 500 so DB/internal details don't leak.
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error('[ERROR]', err);
  return c.json({ error: 'Internal server error' }, 500);
});

app.get('/api/health', (c) => c.json({ ok: true }));
app.route('/api/auth', authRoutes);
app.route('/api/prompts', promptRoutes);
app.route('/api/styles', stylesRoute);
app.route('/api/templates', templatesRoute);
app.route('/api/generate', generateRoute);
app.route('/api/coins', coinsRoute);
app.route('/api/users', usersRoute);
app.route('/api/social', socialRoute);
app.route('/api/ai', aiRoute);

const port = Number(process.env.PORT) || 3000;
console.log(`Server running on port ${port}`);

serve({ fetch: app.fetch, port });
