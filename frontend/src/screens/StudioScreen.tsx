import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { apiFetch } from '../services/api';
import { IMAGE_MODELS } from '../config/models';
import { StyleSelector } from '../components/StyleSelector';
import { ModelSelector } from '../components/ModelSelector';
import { calculateCost } from '../config/coinCosts';
import { generateImage } from '../services/imageGeneration';
import { ERROR_MESSAGES } from '../config/errorMessages';

// ── Tipler ────────────────────────────────────────────────────────────────────
interface MyPrompt {
  id: string;
  imageUrl: string | null;
  styleId: string | null;
  modelId: string | null;
  content: string;
  title: string;
  createdAt: string;
}

interface StyleInfo {
  id: string;
  name: string;
  isPremium: boolean;
}

// ── Yardımcı: tarih formatlama ────────────────────────────────────────────────
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

// ── Yeniden Üret Bottom Sheet ─────────────────────────────────────────────────
interface ReGenerateSheetProps {
  prompt: MyPrompt;
  stylesMap: Record<string, string>;
  onClose: () => void;
  onRegenSuccess: (updated: MyPrompt) => void;
  onDeleted: (id: string) => void;
}

function ReGenerateSheet({
  prompt, stylesMap, onClose, onRegenSuccess, onDeleted,
}: ReGenerateSheetProps) {
  const [editedPrompt, setEditedPrompt] = useState(prompt.content);
  const [styleId, setStyleId] = useState<string | null>(prompt.styleId);
  const [modelId, setModelId] = useState(prompt.modelId ?? IMAGE_MODELS[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fiyat: aynı style+model → %50 indirim, farklıysa tam fiyat
  const styleChanged = styleId !== prompt.styleId;
  const modelChanged = modelId !== prompt.modelId;
  const cost = styleId
    ? calculateCost({
        modelId: modelId as never,
        isImgToImg: false,
        isRegenerate: !styleChanged && !modelChanged,
      })
    : 0;

  const handleRegenerate = async () => {
    if (!styleId || !editedPrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateImage({
        userText: editedPrompt,
        styleId,
        modelId,
        idempotencyKey: crypto.randomUUID(),
      });
      onRegenSuccess({ ...prompt, imageUrl: result.imageUrl, content: editedPrompt, styleId, modelId });
      onClose();
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      setError(ERROR_MESSAGES[String(status ?? '500')] ?? ERROR_MESSAGES['500']);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/api/prompts/${prompt.id}`, { method: 'DELETE' });
      onDeleted(prompt.id);
      onClose();
    } catch {
      setError('Silinemedi. Tekrar dene.');
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/70 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-surface-0 rounded-t-3xl p-5 pb-10 space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 rounded-full bg-white/20 mx-auto" />

        {/* Orijinal görsel küçük önizleme */}
        {prompt.imageUrl && (
          <div className="flex items-center gap-3">
            <img
              src={prompt.imageUrl}
              alt="Orijinal görsel"
              className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
            />
            <div>
              <p className="text-white/40 text-xs font-body">Orijinal görsel</p>
              <p className="text-white/60 text-sm font-display font-medium">
                {stylesMap[prompt.styleId ?? ''] ?? prompt.styleId ?? '—'} · {
                  IMAGE_MODELS.find(m => m.id === prompt.modelId)?.name ?? prompt.modelId ?? '—'
                }
              </p>
            </div>
          </div>
        )}

        {/* Prompt */}
        <div className="space-y-1.5">
          <label className="text-white/40 text-xs font-display uppercase tracking-wide">Prompt</label>
          <textarea
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            className="w-full h-24 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm font-body placeholder:text-white/20 resize-none focus:outline-none focus:border-accent-violet/40"
          />
        </div>

        {/* Style */}
        <div className="space-y-1.5">
          <label className="text-white/40 text-xs font-display uppercase tracking-wide">Style</label>
          <StyleSelector selectedId={styleId} onSelect={setStyleId} />
        </div>

        {/* Model */}
        <div className="space-y-1.5">
          <label className="text-white/40 text-xs font-display uppercase tracking-wide">Model</label>
          <ModelSelector selectedId={modelId} onSelect={setModelId} imgToImgMode={false} />
        </div>

        {/* Fiyat göstergesi */}
        {styleId && (
          <div className="flex items-center justify-between py-2 border-t border-white/[0.06]">
            <span className="text-white/40 text-sm font-body">
              {!styleChanged && !modelChanged ? 'Yeniden üret indirimi (%50)' : 'Tam fiyat'}
            </span>
            <span className="text-accent-violet font-display font-semibold">{cost} coin</span>
          </div>
        )}

        {/* Hata */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm font-body">{error}</p>
          </div>
        )}

        {/* Butonlar */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={() => setConfirmDelete(true)}
            className="py-3.5 px-5 rounded-xl border border-red-500/30 text-red-400 font-display text-sm"
          >
            Sil
          </button>
          <button
            onClick={handleRegenerate}
            disabled={!styleId || !editedPrompt.trim() || isGenerating}
            className="flex-1 py-3.5 rounded-xl bg-accent-violet text-white font-display text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Üretiliyor...
              </>
            ) : (
              `Yeniden Üret — ${cost} coin`
            )}
          </button>
        </div>

        {/* Silme onay dialog */}
        {confirmDelete && (
          <div className="fixed inset-0 z-[160] bg-black/70 flex items-center justify-center px-6">
            <div className="bg-surface-0 rounded-2xl p-5 space-y-4 w-full max-w-sm">
              <p className="font-display text-base font-semibold text-white text-center">
                Silmek istediğinden emin misin?
              </p>
              <p className="text-white/40 text-sm font-body text-center">
                Bu işlem geri alınamaz.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 font-display text-sm"
                >
                  İptal
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl bg-red-500/80 text-white font-display text-sm font-semibold"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── StudioScreen Ana Bileşeni ─────────────────────────────────────────────────
export function StudioScreen() {
  const user = useStore((s) => s.user);
  const setCreateHubOpen = useStore((s) => s.setCreateHubOpen);

  const [myPrompts, setMyPrompts] = useState<MyPrompt[]>([]);
  const [stylesMap, setStylesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<MyPrompt | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    Promise.all([
      apiFetch<MyPrompt[]>('/api/prompts/mine'),
      apiFetch<StyleInfo[]>('/api/styles'),
    ])
      .then(([myList, stylesList]) => {
        setMyPrompts(myList);
        const map: Record<string, string> = {};
        for (const s of stylesList) map[s.id] = s.name;
        setStylesMap(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // Giriş yapılmamış
  if (!user) {
    return (
      <div className="w-full h-full bg-surface-0 flex items-center justify-center px-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <p className="font-display text-base font-medium text-white/40 text-center">
            Üretimlerini görmek için giriş yap
          </p>
        </div>
      </div>
    );
  }

  // Yükleniyor
  if (loading) {
    return (
      <div className="w-full h-full bg-surface-0 flex items-center justify-center">
        <svg className="w-8 h-8 animate-spin text-accent-violet" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  // Boş durum
  if (myPrompts.length === 0) {
    return (
      <div className="w-full h-full bg-surface-0 flex items-center justify-center px-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <p className="font-display text-base font-medium text-white/40 text-center">
            Henüz üretim yok
          </p>
          <p className="font-body text-sm text-white/20 text-center">
            İlk görselini üretmek için + butonuna bas
          </p>
          <button
            onClick={() => setCreateHubOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-accent-violet text-white text-sm font-medium"
          >
            Üret
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-full bg-surface-0 overflow-y-auto pb-24">
        <div className="px-4 pt-4 pb-2">
          <h1 className="font-display text-lg font-semibold text-white">Stüdyo</h1>
          <p className="text-white/30 text-xs font-body">{myPrompts.length} üretim</p>
        </div>

        {/* 2 Sütun Grid */}
        <div className="grid grid-cols-2 gap-2 px-4">
          {myPrompts.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPrompt(p)}
              className="flex flex-col rounded-2xl overflow-hidden bg-white/[0.04] border border-white/[0.06] active:scale-95 transition-transform text-left"
            >
              {/* Görsel */}
              <div className="aspect-square w-full bg-white/[0.06]">
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.title || p.content}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="px-2.5 py-2 space-y-0.5">
                <p className="text-white/70 text-xs font-display font-medium leading-tight truncate">
                  {stylesMap[p.styleId ?? ''] ?? p.styleId ?? '—'}
                </p>
                <p className="text-white/30 text-xs font-body truncate">
                  {IMAGE_MODELS.find((m) => m.id === p.modelId)?.name ?? p.modelId ?? '—'}
                </p>
                <p className="text-white/20 text-xs font-body">
                  {formatDate(p.createdAt)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ReGenerateSheet */}
      {selectedPrompt && (
        <ReGenerateSheet
          prompt={selectedPrompt}
          stylesMap={stylesMap}
          onClose={() => setSelectedPrompt(null)}
          onRegenSuccess={(updated) => {
            setMyPrompts((prev) =>
              prev.map((p) => (p.id === updated.id ? updated : p)),
            );
          }}
          onDeleted={(id) => {
            setMyPrompts((prev) => prev.filter((p) => p.id !== id));
          }}
        />
      )}
    </>
  );
}
