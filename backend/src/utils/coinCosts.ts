const MODELS = {
  z_turbo:          { base: 5,  img2img_multiplier: null },
  seedream_lite:    { base: 15, img2img_multiplier: 1.3 },
  seedream_v45:     { base: 20, img2img_multiplier: 1.3 },
  nano_banana:      { base: 38, img2img_multiplier: null },
  nano_banana_edit: { base: 38, img2img_multiplier: 1.3 },
} as const;

const REGENERATE_RATIO = 0.5;
const MIN_REGENERATE = 3;
const IMG2IMG_CAP = 50;

type ModelId = keyof typeof MODELS;

export function calculateCost(params: {
  modelId: string;
  isImgToImg: boolean;
  isRegenerate: boolean;
  styleChanged?: boolean;
  modelChanged?: boolean;
}): number {
  const model = MODELS[params.modelId as ModelId];
  if (!model) return 20; // fallback for unknown models

  let base: number = model.base;
  if (params.isImgToImg && model.img2img_multiplier) {
    base = Math.min(Math.ceil(base * model.img2img_multiplier), IMG2IMG_CAP);
  }
  if (params.isRegenerate && !params.styleChanged && !params.modelChanged) {
    return Math.max(Math.ceil(base * REGENERATE_RATIO), MIN_REGENERATE);
  }
  return base;
}
