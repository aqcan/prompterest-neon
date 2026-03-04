import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  jsonb,
  unique,
  index,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  avatar: text('avatar'),
  welcomeCoinsGiven: boolean('welcome_coins_given').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const prompts = pgTable('prompts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  tags: text('tags').array().default([]),
  isPublic: boolean('is_public').default(true),
  styleId: text('style_id').references(() => styles.id),
  modelId: text('model_id'),
  currentVersionId: uuid('current_version_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const promptVersions = pgTable('prompt_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  promptId: uuid('prompt_id').references(() => prompts.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  versionName: text('version_name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const savedPrompts = pgTable('saved_prompts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  promptId: uuid('prompt_id').references(() => prompts.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  promptIdIdx: index('idx_saved_prompts_prompt_id').on(t.promptId),
}));

// ── styles (systemPrompt DB'de, frontend'e gönderilmez) ──────────────
// KRİTİK KURAL: id değerleri hiçbir zaman değiştirilemez (append-only).
// Sebep: prompts.styleId eski kayıtlara referans veriyor, id değişirse bozulur.
export const styles = pgTable('styles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  isPremium: boolean('is_premium').notNull().default(false),
  previewImagePath: text('preview_image_path'),
  mode: text('mode').notNull().default('photo'),
  // 'photo' | 'video' — photo: görsel stilleri, video: hareket stilleri
  createdAt: timestamp('created_at').defaultNow(),
});

// ── templates (systemPrompt DB'de, frontend'e gönderilmez) ───────────
// KRİTİK KURAL: id değerleri append-only, değiştirme.
export const templates = pgTable('templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  mode: text('mode').notNull(),
  // 'photo' | 'video' | 'scratch'
  systemPrompt: text('system_prompt').notNull(),
  coinCost: integer('coin_cost').notNull().default(0),
  emoji: text('emoji').notNull().default('✨'),
  isPremium: boolean('is_premium').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// ── generations (coin+API atomicity) ─────────────────────────────────
export const generations = pgTable('generations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  status: text('status').notNull().default('pending'),
  // 'pending' | 'completed' | 'failed' | 'cancelled'
  styleId: text('style_id').references(() => styles.id),
  templateId: text('template_id').references(() => templates.id),
  modelId: text('model_id'),
  coinCost: integer('coin_cost').notNull(),
  promptId: uuid('prompt_id').references(() => prompts.id),
  errorCode: text('error_code'),
  idempotencyKey: text('idempotency_key'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ── follows ──────────────────────────────────────────────────────────
export const follows = pgTable('follows', {
  id: uuid('id').defaultRandom().primaryKey(),
  followerId: uuid('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  followingId: uuid('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  uniq: unique().on(t.followerId, t.followingId),
}));

// ── coinBalances ──────────────────────────────────────────────────────
export const coinBalances = pgTable('coin_balances', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ── coinTransactions ──────────────────────────────────────────────────
export const coinTransactions = pgTable('coin_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  type: text('type').notNull(),
  // type: 'welcome_bonus' | 'purchase' | 'weekly_refill'
  //       | 'generate_t2i' | 'generate_i2i' | 'regenerate' | 'refund'
  meta: jsonb('meta'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ── subscriptions ─────────────────────────────────────────────────────
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  plan: text('plan').notNull(),
  billingCycle: text('billing_cycle').notNull(),
  status: text('status').notNull().default('active'),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ── apiKeys ───────────────────────────────────────────────────────────
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  keyHash: text('key_hash').notNull().unique(),
  label: text('label').notNull().default('Varsayılan Anahtar'),
  lastUsed: timestamp('last_used'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ── userSurveys ───────────────────────────────────────────────────────
export const userSurveys = pgTable('user_surveys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  interests: text('interests').array().notNull().default([]),
  completedAt: timestamp('completed_at').defaultNow(),
});
