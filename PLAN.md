# CreaTube: AI Creation Studio — Revize Mimari Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mevcut Prompterest-Neon projesini tam özellikli, deployment-ready bir AI creation studio'ya dönüştürmek.

**Architecture:** React + Capacitor (web/Android/iOS), Hono backend, Drizzle ORM + node-postgres. systemPrompt'lar DB'de saklanır, frontend'e gönderilmez. `generations` tablosu coin+API atomicity'sini sağlar.

**Tech Stack:** React 18, Capacitor 6, Hono, Drizzle ORM, node-postgres (pg), AtlasCloud API, Zustand, Framer Motion, Tailwind CSS

---

## Onaylanmış Kararlar (Değişmez)

| Konu | Karar |
|---|---|
| Navbar | Keşfet \| Takip \| + \| Stüdyo \| Profil |
| Ana gelir | img2img (fotoğraf + style/model) |
| DB driver | `@neondatabase/serverless` → `drizzle-orm/node-postgres` |
| AtlasCloud | Şimdilik placeholder, gerçek key sonra |
| Onboarding | Zorunlu, min 3 tag, kayıt sonrası messagebox tarzı |
| Tag sistemi | 10 onboarding tag, içerik çoklu tag, feed tag filtreli |
| Feed visibility | Varsayılan public, toggle ile private |
| Studio lock | Kilit YOK — fiyat bağlamsal |
| img2img fiyat | Model fiyatı + %30 prim (max: 50 coin) |
| Re-gen fiyatı | Orijinal fiyatın %50'si, minimum 3 coin |
| Reklamlar | Feed arası + üretim bekleme |
| Basic Premium | Reklamsız + 200 coin/hafta → **$5/ay, $50/yıl** |
| Pro Premium | Reklamsız + 500 coin/hafta + premium styles + API → **$20/ay, $200/yıl** |
| 1 coin | = $0.01 (100 coin = $1) |
| Welcome bonus | 500 coin (kayıt sonrası, bir kez) |
| systemPrompt yeri | DB'de (`styles` tablosu) — frontend'e gönderilmez |
| Generation fail | `generations` tablosu (pending/completed/failed) + coin iade |
| style previewImage | User tarafından `frontend/public/style-previews/<id>.jpg` olarak sağlanır |

---

## Fiyat Tablosu (Coin Maliyetleri)

| Model | Text-to-Image | img2img (+%30) | Re-gen (%50 indirim) |
|---|---|---|---|
| Z-Image Turbo | **5 coin** | — | 3 coin (min) |
| Seedream v5 Lite | **15 coin** | **20 coin** | 8 coin |
| Seedream v4.5 | **20 coin** | **26 coin** | 10 coin |
| Nano Banana 2 | **38 coin** | — | 19 coin |
| Nano Banana Edit | — | **50 coin** | 25 coin |

---

## State Machine (ZORUNLU — Faz 4 kodundan önce oku)

CreateHubModal içinde tüm view geçişleri ve geri tuşu davranışı bu diyagrama göre kodlanır.

```
type CreateHubView = 'landing' | 'text' | 'photo' | 'confirm' | 'loading' | 'result'

Geçiş Diyagramı:
  landing → text        [back: landing]
  landing → photo       [back: landing]
  text    → confirm     [back: text]
  photo   → confirm     [back: photo]
  confirm → loading     [back: YOK — işlem başladı, geri dönülemez]
  loading → result      [back: YOK]
  result  → landing     [kaydet veya tekrar dene sonrası]

Modal kapatılırken (onDismiss):
  → view = 'landing'
  → prefill = { text: null, photo: null }
  → pending generations kaydı varsa status='cancelled'

Android hardware back:
  → confirm / loading / result: BackHandler ile engellenir (geri dönüş yok)
  → text / photo: landing'e döner
  → landing: modal kapanır
```

### prefill Yaşam Döngüsü

```typescript
// Mode-specific — birbirini kirletmez
interface Prefill {
  text: { prompt: string; styleId: string; modelId: string } | null
  photo: null  // photo mode trending prefill desteklemiyor (v1)
}

// Sıfırlanma koşulları:
// 1. Modal kapandığında → tümü null
// 2. Mode değiştiğinde → hedef mode'un prefill'i null
// 3. result'tan landing'e dönüldüğünde → tümü null
```

---

## API Error Code Standardı (tam referans)

| Kod | Sebep | UI Mesajı |
|---|---|---|
| 400 | Geçersiz/boş prompt | "Prompt çok uzun veya boş." |
| 402 | Yetersiz coin | "Coin satın almak ister misin?" + [Satın Al] butonu |
| 403 | Premium style, free kullanıcı | "Bu style Pro üyeliği gerektirir." + [Pro'ya Geç] |
| 422 | Model img2img desteklemiyor | "Bu model fotoğraf modunu desteklemiyor." |
| 429 | Rate limit | "Çok fazla istek. Biraz bekle." |
| 500 | AtlasCloud hatası | "Görsel oluşturulamadı. Tekrar dene." |
| 504 | Generation timeout (30sn) | "İşlem zaman aşımına uğradı. Tekrar dene." |

---

## Uygulama Akışı (Tam User Flow)

### 1. İlk Açılış — Onboarding
```
Uygulama aç
    ↓
localStorage'da 'survey_done' var mı?
    ├── Evet → Normal akış
    └── Hayır → Onboarding Modal (messagebox tarzı, tam ekran overlay değil)
                ↓
           10 tag listesi göster
           Kullanıcı min 3 seçmeli (seçilmeden Next çalışmıyor)
                ↓
           Submit → POST /api/users/survey → userSurvey tablosu
           + localStorage 'survey_done' = true
           + 500 coin welcome bonus (sadece bir kez)
```

### 2. Navbar Akışı
```
[ Keşfet ]  [ Takip ]  [  +  ]  [ Stüdyo ]  [ Profil ]
    ↓           ↓         ↓          ↓            ↓
  Tab değiş  Tab değiş  Modal    Tab değiş    Tab değiş
                        açılır
```
- + butonu: tab değiştirmez, CreateHubModal'ı açar
- Coin bakiyesi: sağ üstte sabit badge

### 3. Create Hub (+ Butonu) Akışı
```
+ butonu tıkla → CreateHubModal açılır (aşağıdan süzülür)
    ↓
Üstte iki tab: [ Metin → Görsel ]  [ Fotoğraf → Görsel ]

── METIN MODU ──────────────────────────────────────────
Prompt textarea (zorunlu)
Style seç: StyleSelector bileşeni (GET /api/styles'dan çeker)
Model seç: ModelSelector bileşeni
[Üret — X coin] butonu
    ↓
GenerateConfirmModal:
  Style: [seçilen style]
  Model: [seçilen model]
  Maliyet: X coin
  Bakiyeniz: Y coin → Z coin
  [İptal] [Devam Et]  ← Devam Et: submit sonrası disabled, spinner gösterir
    ↓
Yükleme (progress indicator) + POST /api/generate
    ↓
    ├── Başarılı → Sonuç Ekranı (görsel + başlık + visibility toggle + kaydet)
    └── Hata → Hata mesajı (error code'a göre) + [Tekrar Dene] butonu
                + coin iade edildi bildirimi (eğer kesildiyse)

── FOTOĞRAF MODU (img2img) ─────────────────────────────
[Fotoğraf Yükle] alanı (drag-drop veya dosya seç, max 5MB)
Fotoğraf önizleme + [Değiştir] butonu
Prompt textarea (opsiyonel)
Style seç: StyleSelector (filtresiz)
Model seç: ModelSelector (sadece supportsImageInput: true)
[Üret — X coin + %30 prim] butonu
    ↓
(Metin moduyla aynı onay + sonuç akışı)
```

### 4. Keşfet Feed Akışı
```
Keşfet Tab
    ↓
GET /api/prompts (public, user'ın tag'lerine göre filtreli)
    ↓
Dikey scroll-snap feed (mevcut FeedCard formatı)
    ↓
Her kartta:
  - Görsel (tam arka plan)
  - Alt: başlık, style badge, üretici kullanıcı adı + avatar
  - Sağ: Bookmark butonu
  - Sol swipe → LeftPanel (prompt içeriği + kopyala)
  - Sağ swipe → RightPanel (versiyon geçmişi)
  - Avatar/isim tıkla → UserProfileSheet (bottom sheet)
```

### 5. Takip Feed Akışı
```
Takip Tab
    ↓
Giriş yapılmış mı?
├── Hayır → "Takip edilen içerikleri görmek için giriş yap"
└── Evet → GET /api/social/feed
              ├── Sonuç var → FeedCard formatı
              └── Boş → "Henüz kimseyi takip etmiyorsunuz."
                          [Keşfet'e Git] butonu
```

### 6. Stüdyo Ekranı
```
Stüdyo Tab → GET /api/prompts/mine
Grid görünümü (2 sütun): görsel + style + model + tarih
Kart tıkla → ReGenerateSheet (bottom sheet):
  - Orijinal görsel (küçük)
  - Düzenlenebilir prompt textarea
  - Style / Model dropdown (değiştirilebilir)
  - Fiyat göstergesi (anlık güncellenir)
  - [Yeniden Üret — X coin] butonu
  - [Sil] butonu (onay dialog'lu)
```

### 7. Profil Ekranı
```
[Avatar] Kullanıcı adı / email
Coin Bakiyesi: [💰 350 coin]  [Satın Al →]
Premium Durumu: Free / Basic / Pro
[ Kaydettiklerim ]
[ Harcama Geçmişi → ]
[ Ayarlar → ]
[ Çıkış Yap ]
```

### 8. Premium Upgrade Ekranı
```
┌─────────────────┐  ┌─────────────────┐
│   Basic ♦       │  │    Pro ★        │
│ ✓ Reklamsız     │  │ ✓ Reklamsız     │
│ ✓ 200 coin/hafta│  │ ✓ 500 coin/hafta│
│ ✗ Premium style │  │ ✓ Premium style │
│ Aylık: $5       │  │ Aylık: $20      │
│ [Başla]         │  │ [Başla]         │
└─────────────────┘  └─────────────────┘
Not: v1'de "Yakında açılıyor" toast. Gerçek ödeme v2.
```

---

## Faz Planı

### Faz 1: Temel Mimari

**Neden ilk:** Diğer her şey buna dayanır.

**Task 1.1 — DB Driver Değişimi**

- `backend/package.json`: `@neondatabase/serverless` kaldır, `pg` + `@types/pg` ekle
- `backend/src/db/index.ts`:

```typescript
// ÖNCE:
import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql)

// SONRA:
import { Pool } from 'pg'
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 })
export const db = drizzle(pool)
```

- Test: `npm run dev` + `GET /api/health` çalışıyor mu

**Task 1.2 — Yeni DB Tabloları**

`backend/src/db/schema.ts` dosyasına eklenecek:

```typescript
// ── styles (systemPrompt DB'de, frontend'e gönderilmez) ──────────────
// KRİTİK KURAL: id değerleri hiçbir zaman değiştirilemez (append-only).
// Sebep: prompts.styleId eski kayıtlara referans veriyor, id değişirse bozulur.
export const styles = pgTable('styles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  isPremium: boolean('is_premium').notNull().default(false),
  previewImagePath: text('preview_image_path'),  // '/style-previews/<id>.jpg'
  createdAt: timestamp('created_at').defaultNow(),
})

// ── generations (coin+API atomicity) ─────────────────────────────────
export const generations = pgTable('generations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  status: text('status').notNull().default('pending'),
  // 'pending' | 'completed' | 'failed' | 'cancelled'
  styleId: text('style_id').references(() => styles.id),
  modelId: text('model_id'),
  coinCost: integer('coin_cost').notNull(),
  promptId: uuid('prompt_id').references(() => prompts.id),  // null = kaydedilmedi
  errorCode: text('error_code'),                             // '402' | '500' | '504' | 'refund_failed'
  idempotencyKey: text('idempotency_key'),                   // double submit koruması
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ── follows ──────────────────────────────────────────────────────────
export const follows = pgTable('follows', {
  id: uuid('id').defaultRandom().primaryKey(),
  followerId: uuid('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  followingId: uuid('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  uniq: unique().on(t.followerId, t.followingId),
}))

// ── coinBalances ──────────────────────────────────────────────────────
export const coinBalances = pgTable('coin_balances', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ── coinTransactions ──────────────────────────────────────────────────
export const coinTransactions = pgTable('coin_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),  // pozitif=kazanç, negatif=harcama
  type: text('type').notNull(),
  // type: 'welcome_bonus' | 'purchase' | 'weekly_refill'
  //       | 'generate_t2i' | 'generate_i2i' | 'regenerate' | 'refund'
  meta: jsonb('meta'),  // { promptId?, modelId?, styleId?, generationId? }
  createdAt: timestamp('created_at').defaultNow(),
})

// ── subscriptions ─────────────────────────────────────────────────────
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  plan: text('plan').notNull(),           // 'basic' | 'pro'
  billingCycle: text('billing_cycle').notNull(),  // 'monthly' | 'yearly'
  status: text('status').notNull().default('active'),  // 'active' | 'cancelled' | 'expired'
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

// ── apiKeys ───────────────────────────────────────────────────────────
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  keyHash: text('key_hash').notNull().unique(),
  label: text('label').notNull().default('Varsayılan Anahtar'),
  lastUsed: timestamp('last_used'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ── userSurveys ───────────────────────────────────────────────────────
export const userSurveys = pgTable('user_surveys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  interests: text('interests').array().notNull().default([]),
  completedAt: timestamp('completed_at').defaultNow(),
})

// ── prompts tablosuna EKLENECEK alanlar (mevcut tabloya ALTER) ─────────
// styleId: text('style_id').references(() => styles.id),  // null = eski veri
// modelId: text('model_id'),                              // null = eski veri
// users tablosuna EKLENECEK:
// welcomeCoinsGiven: boolean('welcome_coins_given').notNull().default(false)
```

Index (trending sorgusu için):

```typescript
// savedPrompts tablosu tanımına ekle:
}, (t) => ({
  promptIdIdx: index('idx_saved_prompts_prompt_id').on(t.promptId),
}))
```

**Task 1.3 — Migration + Seed**

```bash
npm run db:push          # tabloları oluştur
npm run db:seed          # styles seed data yükle
```

`backend/src/db/seed.ts`:

```typescript
import { db } from './index'
import { styles } from './schema'

async function seed() {
  await db.insert(styles).values([
    // FREE STYLES
    { id: 'realistic',   name: 'Gerçekçi Fotoğraf', isPremium: false,
      systemPrompt: 'photorealistic, high detail, natural lighting, DSLR quality',
      previewImagePath: '/style-previews/realistic.jpg' },
    { id: 'anime',       name: 'Anime',              isPremium: false,
      systemPrompt: 'anime art style, vibrant colors, cel shading, manga inspired',
      previewImagePath: '/style-previews/anime.jpg' },
    { id: 'watercolor',  name: 'Suluboya',            isPremium: false,
      systemPrompt: 'watercolor painting style, soft edges, translucent layers',
      previewImagePath: '/style-previews/watercolor.jpg' },
    { id: 'oil_paint',   name: 'Yağlıboya',           isPremium: false,
      systemPrompt: 'oil painting, thick brushstrokes, rich texture',
      previewImagePath: '/style-previews/oil_paint.jpg' },
    { id: 'pixel_art',   name: 'Pixel Art',            isPremium: false,
      systemPrompt: 'pixel art style, 8-bit colors, retro game aesthetic',
      previewImagePath: '/style-previews/pixel_art.jpg' },
    { id: 'meme',        name: 'Klasik Meme',          isPremium: false,
      systemPrompt: 'meme style, bold impact font aesthetic, internet humor visual',
      previewImagePath: '/style-previews/meme.jpg' },
    // PREMIUM STYLES
    { id: 'ghibli',      name: 'Studio Ghibli',  isPremium: true,
      systemPrompt: 'Studio Ghibli animation style, Miyazaki aesthetic, lush backgrounds',
      previewImagePath: '/style-previews/ghibli.jpg' },
    { id: 'cyberpunk',   name: 'Cyberpunk',       isPremium: true,
      systemPrompt: 'cyberpunk aesthetic, neon lights, dark city, futuristic dystopia',
      previewImagePath: '/style-previews/cyberpunk.jpg' },
    { id: 'renaissance', name: 'Rönesans',         isPremium: true,
      systemPrompt: 'Renaissance painting style, chiaroscuro lighting, classical composition',
      previewImagePath: '/style-previews/renaissance.jpg' },
    { id: 'cctv',        name: 'Güvenlik Kamerası', isPremium: true,
      systemPrompt: 'security camera footage, grainy, timestamp overlay, fisheye lens',
      previewImagePath: '/style-previews/cctv.jpg' },
    { id: 'film_scene',  name: 'Film Sahnesi',     isPremium: true,
      systemPrompt: 'cinematic film scene, movie still, dramatic lighting, anamorphic lens',
      previewImagePath: '/style-previews/film_scene.jpg' },
    { id: 'vaporwave',   name: 'Vaporwave',        isPremium: true,
      systemPrompt: 'vaporwave aesthetic, pink purple gradient, retro 80s, synthwave',
      previewImagePath: '/style-previews/vaporwave.jpg' },
  ]).onConflictDoNothing()

  console.log('Styles seeded.')
  process.exit(0)
}
seed().catch(console.error)
```

`backend/package.json`'a ekle: `"db:seed": "tsx src/db/seed.ts"`

---

### Faz 2: Config Dosyaları

**Task 2.1 — `GET /api/styles` Endpoint (YENİ)**

**Dosya:** `backend/src/routes/styles.ts`

```typescript
import { Hono } from 'hono'
import { db } from '../db'
import { styles } from '../db/schema'

const app = new Hono()

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
    .orderBy(styles.isPremium, styles.createdAt)
  return c.json(list)
})

export default app
```

`backend/src/index.ts`'te: `app.route('/api/styles', stylesRoute)`

**Task 2.2 — `frontend/src/config/buildPrompt.ts` (YENİ)**

```typescript
const MAX_USER_TEXT = 300
const MAX_SCENE = 150
const MAX_TOTAL = 500

// sanitize: başındaki/sonundaki virgül, boşluk ve çift virgülü temizler
const sanitize = (s: string) =>
  s.trim().replace(/^[,\s]+|[,\s]+$/g, '').replace(/,{2,}/g, ',')

// Frontend versiyonu (preview için) — systemPrompt YOK
export function buildPrompt(params: {
  userText: string
  scene?: string
}): string {
  const text = sanitize(params.userText).slice(0, MAX_USER_TEXT)
  const scene = params.scene ? sanitize(params.scene).slice(0, MAX_SCENE) : undefined
  return [text, scene].filter(Boolean).join(', ').slice(0, MAX_TOTAL)
}
```

Backend versiyonu `backend/src/utils/buildPrompt.ts`:

```typescript
const MAX_USER_TEXT = 300
const MAX_SCENE = 150
const MAX_TOTAL = 500

const sanitize = (s: string) =>
  s.trim().replace(/^[,\s]+|[,\s]+$/g, '').replace(/,{2,}/g, ',')

// systemPrompt backend'de birleştirilir
export function buildPromptWithStyle(
  userText: string,
  scene?: string,
  systemPrompt?: string
): string {
  const text = sanitize(userText).slice(0, MAX_USER_TEXT)
  const sc = scene ? sanitize(scene).slice(0, MAX_SCENE) : undefined
  return [text, sc, systemPrompt].filter(Boolean).join(', ').slice(0, MAX_TOTAL)
}
```

**Task 2.3 — `frontend/src/config/models.ts`**

```typescript
export interface ImageModel {
  id: string
  name: string
  description: string
  tier: 'fast' | 'balanced' | 'premium'
  baseCost: number
  supportsImageInput: boolean
}

export const IMAGE_MODELS: ImageModel[] = [
  { id: 'z_turbo',         name: 'Z-Image Turbo',   description: 'En hızlı üretim',   tier: 'fast',     baseCost: 5,  supportsImageInput: false },
  { id: 'seedream_lite',   name: 'Seedream v5 Lite', description: 'Dengeli kalite',    tier: 'balanced', baseCost: 15, supportsImageInput: true  },
  { id: 'seedream_v45',    name: 'Seedream v4.5',    description: 'Yüksek kalite',     tier: 'balanced', baseCost: 20, supportsImageInput: true  },
  { id: 'nano_banana',     name: 'Nano Banana 2',    description: 'Premium çıktı',     tier: 'premium',  baseCost: 38, supportsImageInput: false },
  { id: 'nano_banana_edit',name: 'Nano Banana Edit', description: 'img2img uzmanı',    tier: 'premium',  baseCost: 38, supportsImageInput: true  },
]
```

**Task 2.4 — `frontend/src/config/tags.ts`**

```typescript
export const ONBOARDING_TAGS = [
  { id: 'meme',       label: 'Meme',                icon: '😂' },
  { id: 'photo_edit', label: 'Fotoğraf Düzenleme',  icon: '📷' },
  { id: 'anime',      label: 'Anime',               icon: '✨' },
  { id: 'artistic',   label: 'Sanatsal',            icon: '🎨' },
  { id: 'film',       label: 'Film & Sinema',       icon: '🎬' },
  { id: 'pixel_art',  label: 'Pixel Art',           icon: '🎮' },
  { id: 'nature',     label: 'Doğa & Manzara',      icon: '🌿' },
  { id: 'portrait',   label: 'Portre',              icon: '👤' },
  { id: 'abstract',   label: 'Soyut',               icon: '🌀' },
  { id: 'scifi',      label: 'Sci-Fi',              icon: '🚀' },
]
```

**Task 2.5 — `frontend/src/config/coinCosts.ts`**

```typescript
export const COIN_COSTS = {
  models: {
    z_turbo:          { base: 5,  img2img_multiplier: null },
    seedream_lite:    { base: 15, img2img_multiplier: 1.3  },
    seedream_v45:     { base: 20, img2img_multiplier: 1.3  },
    nano_banana:      { base: 38, img2img_multiplier: null },
    nano_banana_edit: { base: 38, img2img_multiplier: 1.3  },
  } as const,
  regenerate_ratio: 0.5,
  min_regenerate_cost: 3,
  img2img_cap: 50,
}

export function calculateCost(params: {
  modelId: keyof typeof COIN_COSTS.models
  isImgToImg: boolean
  isRegenerate: boolean
  styleChanged?: boolean
  modelChanged?: boolean
}): number {
  const model = COIN_COSTS.models[params.modelId]
  let base = model.base
  if (params.isImgToImg && model.img2img_multiplier) {
    base = Math.min(Math.ceil(base * model.img2img_multiplier), COIN_COSTS.img2img_cap)
  }
  if (params.isRegenerate && !params.styleChanged && !params.modelChanged) {
    return Math.max(Math.ceil(base * COIN_COSTS.regenerate_ratio), COIN_COSTS.min_regenerate_cost)
  }
  return base
}
```

**Task 2.6 — `frontend/src/config/errorMessages.ts` (YENİ)**

```typescript
export const ERROR_MESSAGES: Record<string, string> = {
  '400': 'Prompt çok uzun veya boş. Lütfen kısalt.',
  '402': 'Yetersiz coin.',
  '403': 'Bu style Pro üyeliği gerektirir.',
  '422': 'Seçilen model bu modda çalışmıyor.',
  '429': 'Çok fazla istek gönderildi. Biraz bekle.',
  '500': 'Görsel oluşturulamadı. Tekrar dene.',
  '504': 'İşlem zaman aşımına uğradı (30 sn). Tekrar dene.',
}
```

---

### Faz 3: Navbar ve Navigasyon

**Kritik dosyalar:**
- `frontend/src/types/index.ts`
- `frontend/src/components/BottomNav.tsx`
- `frontend/src/App.tsx`

**Task 3.1 — Yeni TabId**

```typescript
type TabId = 'explore' | 'following' | 'studio' | 'profile'
// NOT: 'create' tab değil, modal
```

**Task 3.2 — Yeni BottomNav**

```
[home]  [people]  [ + ]  [sparkles]  [person]
Keşfet  Takip    büyük   Stüdyo     Profil
                yuvarlak
```

- + butonu: `w-14 h-14 rounded-full bg-accent-violet`, diğerlerinden 4px yukarıda (translateY)
- Tıkla → `setCreateHubOpen(true)` (Zustand)

**Task 3.3 — Screen Yeniden Yapılanması**

- `FeedScreen.tsx` → `ExploreScreen.tsx` (rename + feed API tag filtresi ekle)
- `FollowingScreen.tsx` — yeni (boş durum + follow akışı v1)
- `StudioScreen.tsx` — yeni (my generations grid)
- `ProfileScreen.tsx` — genişlet (SavedScreen entegre)
- `CreateHubModal.tsx` — yeni (+ butonu modal'ı)

---

### Faz 4: Create Hub Modal

**Kritik dosyalar:**
- `frontend/src/screens/CreateHubModal.tsx`
- `frontend/src/components/StyleSelector.tsx`
- `frontend/src/components/ModelSelector.tsx`
- `frontend/src/components/GenerateConfirmModal.tsx`
- `frontend/src/services/imageGeneration.ts`

**Task 4.1 — State Machine Implementasyonu (İLK ADIM)**

State Machine bölümündeki diyagrama göre. `CreateHubModal.tsx` içinde:

```typescript
const [view, setView] = useState<CreateHubView>('landing')
const [prevView, setPrevView] = useState<CreateHubView>('landing')
const [prefill, setPrefill] = useState<Prefill>({ text: null, photo: null })

useEffect(() => {
  const handler = BackHandler.addEventListener('hardwareBackPress', () => {
    if (['loading', 'result'].includes(view)) return true
    if (view === 'confirm') { setView(prevView); return true }
    if (['text', 'photo'].includes(view)) { setView('landing'); return true }
    if (view === 'landing') { handleDismiss(); return true }
    return false
  })
  return () => handler.remove()
}, [view, prevView])

const handleDismiss = () => {
  setView('landing')
  setPrefill({ text: null, photo: null })
  onClose()
}

const handleModeSelect = (mode: 'text' | 'photo') => {
  setPrevView('landing')
  setPrefill(prev => ({ ...prev, [mode]: null }))
  setView(mode)
}
```

**Task 4.2 — `imageGeneration.ts` servisi (placeholder)**

```typescript
export async function generateImage(params: {
  prompt: string
  styleId: string
  modelId: string
  inputImageBase64?: string
}): Promise<{ imageUrl: string }> {
  // TODO: AtlasCloud API entegrasyonu
  return generateImageHuggingFace(params)
}
```

**Task 4.3 — StyleSelector bileşeni (API'den çeker)**

```typescript
// frontend/src/components/StyleSelector.tsx
const { data: stylesList, isLoading } = useQuery({
  queryKey: ['styles'],
  queryFn: () => fetch('/api/styles').then(r => r.json()),
  staleTime: 5 * 60 * 1000,
})

// Premium style tıklanınca (client UX):
if (style.isPremium && userPlan === 'free') {
  toast.error('Bu style Pro üyeliği gerektirir')
  return
}
// Gerçek guard backend'de (Task 4.6)
```

Bottom sheet modal layout: free styles üstte, premium styles altta kilit ikonu ile.

**Task 4.4 — ModelSelector bileşeni**

- Kart listesi
- Her kart tıklanınca ModelInfoSheet açılır
- img2img modunda sadece `supportsImageInput: true` olanlar görünür

**Task 4.5 — GenerateConfirmModal (double submit koruması ile)**

```typescript
// frontend/src/components/GenerateConfirmModal.tsx
const [isSubmitting, setIsSubmitting] = useState(false)
const idempotencyKey = useRef<string>('')

const handleConfirm = async () => {
  if (isSubmitting) return
  idempotencyKey.current = crypto.randomUUID()  // her submit için yeni key
  setIsSubmitting(true)
  try {
    await onConfirm(idempotencyKey.current)
  } finally {
    setIsSubmitting(false)
  }
}

// <Button disabled={isSubmitting || balance < cost}>
//   {isSubmitting ? <Spinner /> : `Devam Et — ${cost} coin`}
// </Button>
```

**Task 4.6 — Premium Style Backend Guard (ZORUNLU — Faz 10'a bırakılmaz)**

Faz 5'te `POST /api/generate` yazılırken eklenir (referans için burada):

```typescript
const style = await db.query.styles.findFirst({ where: eq(styles.id, styleId) })
if (!style) throw new HTTPException(400, { message: 'invalid_style' })
if (style.isPremium && userPlan === 'free') {
  throw new HTTPException(403, { message: 'premium_style_required' })
}
const finalPrompt = buildPromptWithStyle(userText, scene, style.systemPrompt)
```

**Task 4.7 — Trending Endpoint Cache (backend)**

```typescript
// backend/src/routes/prompts.ts
let trendingCache: { data: unknown[]; expiresAt: number } | null = null
const TRENDING_TTL_MS = 5 * 60 * 1000

app.get('/api/prompts/trending', async (c) => {
  const now = Date.now()
  if (trendingCache && trendingCache.expiresAt > now) {
    return c.json(trendingCache.data)
  }
  const result = await db
    .select({ id: prompts.id, imageUrl: prompts.imageUrl, styleId: prompts.styleId,
              modelId: prompts.modelId, saveCount: count(savedPrompts.id) })
    .from(prompts)
    .leftJoin(savedPrompts, eq(prompts.id, savedPrompts.promptId))
    .where(eq(prompts.isPublic, true))
    .groupBy(prompts.id)
    .orderBy(desc(count(savedPrompts.id)))
    .limit(10)
  trendingCache = { data: result, expiresAt: now + TRENDING_TTL_MS }
  return c.json(result)
})
```

**Task 4.8 — CreateHubModal Ana Layout (result view temizleme dahil)**

- Metin / Fotoğraf tab'ları
- Fotoğraf sekmesinde dosya yükleme (max 5MB, base64'e çevir)
- Result view: görsel önizleme + başlık + visibility toggle + kaydet
- Result'tan landing'e dönünce prefill = { text: null, photo: null }

---

### Faz 5: Coin Backend + Generation Transaction

**Kritik dosyalar:**
- `backend/src/routes/generate.ts` — YENİ
- `backend/src/routes/coins.ts`
- `backend/src/routes/auth.ts`
- `backend/src/middleware/coinGuard.ts`

**Task 5.1 — `POST /api/generate` (Generation Transaction Sözleşmesi)**

```typescript
// backend/src/routes/generate.ts
app.post('/', authMiddleware, async (c) => {
  const { userText, scene, styleId, modelId, inputImageBase64, idempotencyKey } = await c.req.json()
  const userId = c.get('userId')

  // 1. Idempotency kontrolü
  if (idempotencyKey) {
    const existing = await db.query.generations.findFirst({
      where: eq(generations.idempotencyKey, idempotencyKey)
    })
    if (existing?.status === 'completed') return c.json({ generationId: existing.id, promptId: existing.promptId })
    if (existing?.status === 'pending') throw new HTTPException(409, { message: 'already_processing' })
  }

  // 2. generations kaydı aç
  const [gen] = await db.insert(generations).values({
    userId, styleId, modelId, idempotencyKey,
    coinCost: calculateCost({ modelId, isImgToImg: !!inputImageBase64, isRegenerate: false }),
    status: 'pending',
  }).returning()

  // 3. Premium style guard
  const style = await db.query.styles.findFirst({ where: eq(styles.id, styleId) })
  if (!style) { await failGeneration(gen.id, '400'); throw new HTTPException(400) }
  const userPlan = await getUserPlan(userId)
  if (style.isPremium && userPlan === 'free') {
    await failGeneration(gen.id, '403'); throw new HTTPException(403, { message: 'premium_style_required' })
  }

  // 4. CoinGuard (atomik)
  try {
    await db.transaction(async (tx) => {
      const [bal] = await tx.select().from(coinBalances).where(eq(coinBalances.userId, userId)).for('update')
      if (bal.balance < gen.coinCost) throw new Error('insufficient')
      await tx.update(coinBalances).set({ balance: bal.balance - gen.coinCost }).where(eq(coinBalances.userId, userId))
      await tx.insert(coinTransactions).values({ userId, amount: -gen.coinCost, type: 'generate_t2i', meta: { generationId: gen.id } })
    })
  } catch (e: any) {
    if (e.message === 'insufficient') { await failGeneration(gen.id, '402'); throw new HTTPException(402) }
    await failGeneration(gen.id, '500'); throw e
  }

  // 5. buildPrompt
  const finalPrompt = buildPromptWithStyle(userText, scene, style.systemPrompt)

  // 6. AtlasCloud API (timeout: 30sn)
  let imageUrl: string
  try {
    const result = await Promise.race([
      callAtlasCloud({ prompt: finalPrompt, modelId, inputImageBase64 }),
      new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), 30_000))
    ])
    imageUrl = result.imageUrl
  } catch (e: any) {
    const code = e.message === 'timeout' ? '504' : '500'
    await failGeneration(gen.id, code)
    await refundCoins(userId, gen)
    throw new HTTPException(parseInt(code))
  }

  // 7. Başarılı — prompt kaydet
  const [prompt] = await db.insert(prompts).values({
    userId, imageUrl, styleId, modelId, isPublic: true, title: '', content: userText
  }).returning()
  await db.update(generations).set({ status: 'completed', promptId: prompt.id, updatedAt: new Date() })
    .where(eq(generations.id, gen.id))

  return c.json({ generationId: gen.id, imageUrl, promptId: prompt.id })
})

// Yardımcı fonksiyonlar
async function failGeneration(id: string, errorCode: string) {
  await db.update(generations).set({ status: 'failed', errorCode, updatedAt: new Date() }).where(eq(generations.id, id))
}

async function refundCoins(userId: string, gen: typeof generations.$inferSelect) {
  try {
    await db.transaction(async (tx) => {
      await tx.update(coinBalances).set({ balance: sql`balance + ${gen.coinCost}` }).where(eq(coinBalances.userId, userId))
      await tx.insert(coinTransactions).values({ userId, amount: gen.coinCost, type: 'refund', meta: { generationId: gen.id } })
    })
  } catch {
    await db.update(generations).set({ errorCode: 'refund_failed' }).where(eq(generations.id, gen.id))
    console.error('REFUND_FAILED', gen.id)  // manual review
  }
}
```

**Task 5.2 — Welcome Bonus (auth.ts'e ekle)**

Register endpoint tamamlanınca:

```typescript
await db.insert(coinBalances).values({ userId, balance: 500 })
await db.insert(coinTransactions).values({ userId, amount: 500, type: 'welcome_bonus' })
await db.update(users).set({ welcomeCoinsGiven: true }).where(eq(users.id, userId))
```

**Task 5.3 — Coin Routes**

```
GET  /api/coins/balance        → { balance: number }
GET  /api/coins/transactions   → CoinTransaction[] (son 50)
POST /api/coins/purchase       → 404 "Yakında" placeholder
```

---

### Faz 6: Stüdyo Ekranı

**Kritik dosyalar:**
- `backend/src/routes/prompts.ts` — /mine endpoint ekle
- `frontend/src/screens/StudioScreen.tsx`

**Task 6.1 — Backend `/api/prompts/mine`**

```
GET /api/prompts/mine
Auth: required
Returns: kullanıcının kendi üretimleri, styleId ve modelId ile
```

**Task 6.2 — StudioScreen**

- 2 sütun grid görünümü (her kart: görsel + style adı + model adı + tarih)
- Kart tıkla → ReGenerateSheet (bottom sheet)
- Fiyat hesaplama: aynı style+model → %50 indirim, farklı → tam fiyat
- Silme butonu (onay dialog'lu)
- ReGenerateSheet `POST /api/generate`'i kullanır (Faz 5 ile aynı endpoint)

---

### Faz 7: Tag Filtreli Feed + Onboarding

**Task 7.1 — Onboarding Modal (frontend)**

- `OnboardingModal.tsx` bileşeni
- App.tsx'te `user` login olunca VE `survey_done` yoksa göster
- 10 tag listesi, min 3 seçim zorunlu
- Submit → POST /api/users/survey

**Task 7.2 — Backend Survey Route**

```
POST /api/users/survey → { interests: string[] }
Auth: required
→ userSurveys tablosuna yaz
→ 500 welcome bonus (welcomeCoinsGiven false ise)
```

**Task 7.3 — Tag Filtreli Feed**

- `GET /api/prompts` endpoint'ine: `?tags=meme,anime` query param
- Authenticated istek → kullanıcının survey tags'lerine göre filtrele
- Anonim → tüm public içerikler
- PostgreSQL array overlap: `WHERE tags && ARRAY['meme','anime']`

---

### Faz 8: Follow Sistemi

**Task 8.1 — Backend**

```
POST   /api/social/follow/:userId
DELETE /api/social/unfollow/:userId
GET    /api/social/following
GET    /api/social/feed                  → following users' public prompts
GET    /api/social/user/:userId/profile  → başka kullanıcı public profili
```

**Task 8.2 — Frontend**

- FollowingScreen: GET /api/social/feed
- UserProfileSheet (bottom sheet): başka kullanıcı profili + takip et/bırak
- FeedCard'da kullanıcı avatar/isim tıklanınca UserProfileSheet

---

### Faz 9: Premium Altyapı (Stub)

**Task 9.1 — Premium kontrol yardımcıları**

```typescript
// backend/src/utils/premium.ts
export async function getUserPlan(userId: string): Promise<'free' | 'basic' | 'pro'>
export async function isPremium(userId: string): Promise<boolean>
```

**Task 9.2 — Premium upgrade ekranı (frontend)**

- `PremiumUpgradeScreen.tsx`
- İki kart (Basic / Pro) yan yana
- "Başla" butonları → "Yakında açılıyor" toast (gerçek ödeme v2)
- Not: Backend premium style guard Faz 4'te yapıldı — bu sadece UI

**Task 9.3 — Weekly coin refill (stub)**

- Şimdilik manual trigger veya cron placeholder
- v2'de gerçek cron job ile haftalık otomatik yükleme

---

### Faz 10: Reklam Altyapısı (Placeholder)

**Task 10.1 — Feed reklam kartı**

- FeedScreen'de her 5 FeedCard'dan sonra `AdCard` bileşeni
- v1: statik placeholder "Reklam alanı" görseli
- Basic/Pro kullanıcıda AdCard render edilmez

**Task 10.2 — Üretim bekleme reklamı**

- GenerateLoadingScreen'de 5 saniyeyi geçen üretimlerde reklam placeholder
- v1: statik görsel

---

## Faz Sırası

```
Faz 1 (DB + styles seed + index)
  → Faz 2 (Config + buildPrompt + GET /api/styles + errorMessages)
  → Faz 3 (Navbar)
  → Faz 4 (Create Hub: state machine + StyleSelector + premium guard + double submit + error UI + trending cache)
  → Faz 5 (Coin + Generation transaction + refund)
  → Faz 7 (Onboarding + Tag filtreli feed)
  → Faz 6 (Stüdyo)
  → Faz 8 (Follow)
  → Faz 9 (Premium upgrade UI)
  → Faz 10 (Reklam placeholder)
```

**MVP (Faz 1–7 tamamlanınca):** Çalışan navbar, create hub, img2img, coin ekonomisi, onboarding, tag filtreli feed.

---

## Verification

| Faz | Doğrulama |
|---|---|
| Faz 1 | `npm run db:push` başarılı; `npm run db:seed` çalışır; `GET /api/styles` 12 style döndürür; systemPrompt response'da YOK |
| Faz 2 | `buildPromptWithStyle('test', undefined, 'style prompt')` → 500 karakter sınırı aşılmıyor |
| Faz 4 | State machine: her view'dan back doğru yere; confirm→loading arası back engelleniyor; double tap tek istek gidiyor |
| Faz 5 | AtlasCloud timeout mock → coin iade edildi; `generations.status='failed'`; `coinTransactions`'da `type='refund'` kaydı var |
| Faz 5 | Free kullanıcı premium style → 403 + doğru UI mesajı |

---

## Premortem: Bu Plan Neden Başarısız Olabilir?

| # | Risk | Olasılık | Önlem |
|---|------|----------|-------|
| 1 | `db:seed` unutulursa → generation'da styleId bulunamaz → 400 | Yüksek | Faz 1 verification adımına zorunlu olarak ekle, deploy checklist'e yaz |
| 2 | Android BackHandler test edilmezse → modal kapanır, state kaybolur | Yüksek | Faz 4 sonrası fiziksel cihaz veya Android emülatörde state machine testi yap |
| 3 | Coin refund başarısız → `errorCode='refund_failed'` → kullanıcı habersiz coin kaybeder | Orta | `console.error('REFUND_FAILED', generationId)` logla; ileride admin query ile bul |
| 4 | `idempotencyKey` frontend'de gönderilmezse → double submit guard çalışmaz | Orta | `GenerateConfirmModal`'da her `handleConfirm`'de `crypto.randomUUID()` zorla |
| 5 | styles.id append-only politikası ihlal edilirse → eski kayıtlar bozulur | Orta | Code review checklist: "seed.ts'de id değiştirme yasak" |
| 6 | `buildPromptWithStyle` test edilmezse → 500+ karakter prompt → AtlasCloud 400 | Orta | Faz 2'de unit test: max 500 karakter döndürüyor mu? |
| 7 | Trending cache sunucu restart'ta sıfırlanır → cold start heavy query | Düşük | İlk istek cache miss, kabul edilebilir. Neon free tier için sorun değil |
