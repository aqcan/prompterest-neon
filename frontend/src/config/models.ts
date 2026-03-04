export interface ImageModel {
  id: string;
  name: string;
  description: string;
  tier: 'fast' | 'balanced' | 'premium';
  baseCost: number;
  supportsImageInput: boolean;
}

export const IMAGE_MODELS: ImageModel[] = [
  { id: 'z_turbo',          name: 'Z-Image Turbo',    description: 'En hızlı üretim',  tier: 'fast',     baseCost: 5,  supportsImageInput: false },
  { id: 'seedream_lite',    name: 'Seedream v5 Lite',  description: 'Dengeli kalite',   tier: 'balanced', baseCost: 15, supportsImageInput: true  },
  { id: 'seedream_v45',     name: 'Seedream v4.5',     description: 'Yüksek kalite',    tier: 'balanced', baseCost: 20, supportsImageInput: true  },
  { id: 'nano_banana',      name: 'Nano Banana 2',     description: 'Premium çıktı',    tier: 'premium',  baseCost: 38, supportsImageInput: false },
  { id: 'nano_banana_edit', name: 'Nano Banana Edit',  description: 'img2img uzmanı',   tier: 'premium',  baseCost: 38, supportsImageInput: true  },
];
