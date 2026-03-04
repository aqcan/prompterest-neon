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
};

export function calculateCost(params: {
  modelId: keyof typeof COIN_COSTS.models;
  isImgToImg: boolean;
  isRegenerate: boolean;
  styleChanged?: boolean;
  modelChanged?: boolean;
}): number {
  const model = COIN_COSTS.models[params.modelId];
  let base: number = model.base;
  if (params.isImgToImg && model.img2img_multiplier) {
    base = Math.min(Math.ceil(base * model.img2img_multiplier), COIN_COSTS.img2img_cap);
  }
  if (params.isRegenerate && !params.styleChanged && !params.modelChanged) {
    return Math.max(
      Math.ceil(base * COIN_COSTS.regenerate_ratio),
      COIN_COSTS.min_regenerate_cost,
    );
  }
  return base;
}
