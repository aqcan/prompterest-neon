import { useState } from 'react';
import { IMAGE_MODELS, type ImageModel } from '../config/models';
import { calculateCost } from '../config/coinCosts';

interface ModelSelectorProps {
  selectedId: string;
  onSelect: (modelId: string) => void;
  imgToImgMode?: boolean;
}

const TIER_COLORS = {
  fast: 'text-emerald-400',
  balanced: 'text-sky-400',
  premium: 'text-amber-400',
} as const;

const TIER_LABELS = {
  fast: 'Hızlı',
  balanced: 'Dengeli',
  premium: 'Premium',
} as const;

function ModelInfoSheet({ model, onClose }: { model: ImageModel; onClose: () => void }) {
  const cost = calculateCost({ modelId: model.id as never, isImgToImg: false, isRegenerate: false });
  const img2imgCost = model.supportsImageInput
    ? calculateCost({ modelId: model.id as never, isImgToImg: true, isRegenerate: false })
    : null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 flex items-end"
      onClick={onClose}
    >
      <div
        className="w-full bg-surface-0 rounded-t-3xl p-6 pb-10 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 rounded-full bg-white/20 mx-auto" />
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-white">{model.name}</h3>
            <span className={`text-xs font-medium ${TIER_COLORS[model.tier]}`}>
              {TIER_LABELS[model.tier]}
            </span>
          </div>
          <div className="text-right">
            <p className="text-white/40 text-xs font-display">Metin → Görsel</p>
            <p className="text-accent-violet font-display font-semibold">{cost} coin</p>
          </div>
        </div>
        <p className="text-white/50 text-sm font-body">{model.description}</p>
        {img2imgCost !== null && (
          <div className="flex items-center justify-between py-3 border-t border-white/[0.06]">
            <p className="text-white/40 text-sm">Fotoğraf → Görsel</p>
            <p className="text-accent-violet font-display font-semibold">{img2imgCost} coin</p>
          </div>
        )}
        {!model.supportsImageInput && (
          <p className="text-white/25 text-xs font-body">Bu model fotoğraf modunu desteklemiyor.</p>
        )}
      </div>
    </div>
  );
}

export function ModelSelector({ selectedId, onSelect, imgToImgMode = false }: ModelSelectorProps) {
  const [infoModel, setInfoModel] = useState<ImageModel | null>(null);

  const visibleModels = imgToImgMode
    ? IMAGE_MODELS.filter((m) => m.supportsImageInput)
    : IMAGE_MODELS;

  return (
    <>
      <div className="space-y-2">
        {visibleModels.map((model) => {
          const isSelected = selectedId === model.id;
          const cost = calculateCost({
            modelId: model.id as never,
            isImgToImg: imgToImgMode,
            isRegenerate: false,
          });

          return (
            <button
              key={model.id}
              onClick={() => onSelect(model.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                isSelected
                  ? 'bg-accent-violet/15 border-accent-violet/40'
                  : 'bg-white/[0.03] border-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-accent-violet' : 'bg-white/20'}`} />
                <div className="text-left">
                  <p className={`font-display text-sm font-medium ${isSelected ? 'text-white' : 'text-white/70'}`}>
                    {model.name}
                  </p>
                  <p className="text-white/30 text-xs font-body">{model.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-display font-medium ${TIER_COLORS[model.tier]}`}>
                  {cost} coin
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setInfoModel(model); }}
                  className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </button>
              </div>
            </button>
          );
        })}
      </div>

      {infoModel && (
        <ModelInfoSheet model={infoModel} onClose={() => setInfoModel(null)} />
      )}
    </>
  );
}
