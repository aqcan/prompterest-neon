import 'dotenv/config';
import { db } from './index.js';
import { styles, templates } from './schema.js';

async function seed() {
  await db.insert(styles).values([
    // FREE STYLES
    {
      id: 'realistic',
      name: 'Gerçekçi Fotoğraf',
      isPremium: false,
      systemPrompt: 'photorealistic, high detail, natural lighting, DSLR quality',
      previewImagePath: '/style-previews/realistic.jpg',
    },
    {
      id: 'anime',
      name: 'Anime',
      isPremium: false,
      systemPrompt: 'anime art style, vibrant colors, cel shading, manga inspired',
      previewImagePath: '/style-previews/anime.jpg',
    },
    {
      id: 'watercolor',
      name: 'Suluboya',
      isPremium: false,
      systemPrompt: 'watercolor painting style, soft edges, translucent layers',
      previewImagePath: '/style-previews/watercolor.jpg',
    },
    {
      id: 'oil_paint',
      name: 'Yağlıboya',
      isPremium: false,
      systemPrompt: 'oil painting, thick brushstrokes, rich texture',
      previewImagePath: '/style-previews/oil_paint.jpg',
    },
    {
      id: 'pixel_art',
      name: 'Pixel Art',
      isPremium: false,
      systemPrompt: 'pixel art style, 8-bit colors, retro game aesthetic',
      previewImagePath: '/style-previews/pixel_art.jpg',
    },
    {
      id: 'meme',
      name: 'Klasik Meme',
      isPremium: false,
      systemPrompt: 'meme style, bold impact font aesthetic, internet humor visual',
      previewImagePath: '/style-previews/meme.jpg',
    },
    // PREMIUM STYLES
    {
      id: 'ghibli',
      name: 'Studio Ghibli',
      isPremium: true,
      systemPrompt: 'Studio Ghibli animation style, Miyazaki aesthetic, lush backgrounds',
      previewImagePath: '/style-previews/ghibli.jpg',
    },
    {
      id: 'cyberpunk',
      name: 'Cyberpunk',
      isPremium: true,
      systemPrompt: 'cyberpunk aesthetic, neon lights, dark city, futuristic dystopia',
      previewImagePath: '/style-previews/cyberpunk.jpg',
    },
    {
      id: 'renaissance',
      name: 'Rönesans',
      isPremium: true,
      systemPrompt: 'Renaissance painting style, chiaroscuro lighting, classical composition',
      previewImagePath: '/style-previews/renaissance.jpg',
    },
    {
      id: 'cctv',
      name: 'Güvenlik Kamerası',
      isPremium: true,
      systemPrompt: 'security camera footage, grainy, timestamp overlay, fisheye lens',
      previewImagePath: '/style-previews/cctv.jpg',
    },
    {
      id: 'film_scene',
      name: 'Film Sahnesi',
      isPremium: true,
      systemPrompt: 'cinematic film scene, movie still, dramatic lighting, anamorphic lens',
      previewImagePath: '/style-previews/film_scene.jpg',
    },
    {
      id: 'vaporwave',
      name: 'Vaporwave',
      isPremium: true,
      systemPrompt: 'vaporwave aesthetic, pink purple gradient, retro 80s, synthwave',
      previewImagePath: '/style-previews/vaporwave.jpg',
    },
  ]).onConflictDoNothing();

  console.log('Styles seeded.');

  // ── Templates ───────────────────────────────────────────────────────
  await db.insert(templates).values([
    // Photo modu
    { id: 'face_swap',  name: 'Yüz Değiştir',   description: 'Fotoğraftaki yüzü başka biriyle değiştir',   mode: 'photo',   systemPrompt: 'Perform a seamless face swap, maintaining natural skin tone, lighting, and facial expressions. Preserve the original background and body pose exactly.', coinCost: 3, emoji: '🔄', isPremium: false, sortOrder: 1 },
    { id: 'headshot',   name: 'Vesikalık',        description: 'Profesyonel profil fotoğrafı oluştur',        mode: 'photo',   systemPrompt: 'Transform into a professional corporate headshot with neutral studio background, soft even lighting, sharp focus on face, business-appropriate framing.', coinCost: 2, emoji: '📸', isPremium: false, sortOrder: 2 },
    { id: 'age_filter', name: 'Yaş Filtresi',     description: 'Daha genç veya daha yaşlı göster',           mode: 'photo',   systemPrompt: 'Age transformation: modify facial features, skin texture, and hair to realistically depict the subject at a different age while preserving identity.', coinCost: 2, emoji: '⏳', isPremium: false, sortOrder: 3 },
    { id: 'bg_change',  name: 'Arka Plan',         description: 'Arka planı tamamen değiştir',                mode: 'photo',   systemPrompt: 'Replace the background completely with a new environment. Keep the subject perfectly cut out with natural edge blending and matching light direction.', coinCost: 2, emoji: '🌄', isPremium: false, sortOrder: 4 },
    { id: 'upscale',    name: 'Keskinleştir',      description: 'Fotoğraf kalitesini ve detayı artır',        mode: 'photo',   systemPrompt: 'Upscale and enhance image quality: increase resolution 4x, sharpen details, reduce noise, restore fine textures while maintaining natural look.', coinCost: 2, emoji: '🔍', isPremium: false, sortOrder: 5 },
    // Scratch modu
    { id: 'animal_mix', name: 'Hayvan Karışımı',  description: 'İki hayvanı birleştiren yaratık oluştur',    mode: 'scratch', systemPrompt: 'Create a photorealistic hybrid creature combining two animals. Show anatomical features from both species seamlessly merged, natural fur/skin textures, dramatic lighting.', coinCost: 2, emoji: '🦁', isPremium: false, sortOrder: 1 },
    { id: 'meme_gen',   name: 'Meme Oluştur',      description: 'Klasik meme formatında görsel',              mode: 'scratch', systemPrompt: 'Generate an internet meme-style image with bold impact font aesthetic, humorous scene, exaggerated expressions, high contrast colors.', coinCost: 2, emoji: '😂', isPremium: false, sortOrder: 2 },
    { id: 'landscape',  name: 'Manzara',           description: 'Sinematik doğa veya şehir manzarası',       mode: 'scratch', systemPrompt: 'Create a breathtaking cinematic landscape with dramatic lighting, wide angle composition, rich atmospheric depth, photorealistic detail.', coinCost: 3, emoji: '🌋', isPremium: false, sortOrder: 3 },
    { id: 'product',    name: 'Ürün Fotoğrafı',    description: 'Studio kalitesinde ürün görseli',            mode: 'scratch', systemPrompt: 'Professional product photography: clean studio setup, perfect lighting with soft shadows, white or gradient background, commercial quality composition.', coinCost: 3, emoji: '📦', isPremium: false, sortOrder: 4 },
    // Video modu (video backend hazır olduğunda aktifleşecek)
    { id: 'talking',    name: 'Konuşturan',        description: 'Fotoğraftaki kişiyi konuştur',               mode: 'video',   systemPrompt: 'Animate the face in the image to speak naturally with realistic lip sync, subtle head movements, and blinking. Maintain original identity and expression style.', coinCost: 5, emoji: '🗣️', isPremium: false, sortOrder: 1 },
    { id: 'dance',      name: 'Dans',              description: 'Müzikle senkronize dans animasyonu',         mode: 'video',   systemPrompt: 'Animate the subject to perform a synchronized dance with music beat, fluid body movement, maintaining facial identity throughout the sequence.', coinCost: 6, emoji: '💃', isPremium: false, sortOrder: 2 },
  ]).onConflictDoNothing();

  console.log('Templates seeded.');
  process.exit(0);
}

seed().catch(console.error);
