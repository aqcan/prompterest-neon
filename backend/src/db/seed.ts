import 'dotenv/config';
import { db } from './index.js';
import { styles } from './schema.js';

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
  process.exit(0);
}

seed().catch(console.error);
