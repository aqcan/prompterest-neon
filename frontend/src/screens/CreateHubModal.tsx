import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { StyleSelector } from '../components/StyleSelector';
import { ModelSelector } from '../components/ModelSelector';
import { GenerateConfirmModal } from '../components/GenerateConfirmModal';
import { generateImage } from '../services/imageGeneration';
import { calculateCost } from '../config/coinCosts';
import { IMAGE_MODELS } from '../config/models';
import { ERROR_MESSAGES } from '../config/errorMessages';
import { apiFetch } from '../services/api';

// ── State Machine Types ──────────────────────────────────────────────────────
type CreateHubView = 'landing' | 'text' | 'photo' | 'confirm' | 'loading' | 'result';
type CreateMode = 'text' | 'photo';

interface Prefill {
  text: { prompt: string; styleId: string; modelId: string } | null;
  photo: null;
}

// ── Main Component ────────────────────────────────────────────────────────────
export function CreateHubModal() {
  const setCreateHubOpen = useStore((s) => s.setCreateHubOpen);
  const openNewPrompt = useStore((s) => s.openNewPrompt);

  const [view, setView] = useState<CreateHubView>('landing');
  const [prevView, setPrevView] = useState<CreateHubView>('landing');
  const [prefill, setPrefill] = useState<Prefill>({ text: null, photo: null });
  const [coinBalance, setCoinBalance] = useState<number>(0);

  // Fetch coin balance on mount
  useEffect(() => {
    apiFetch<{ balance: number }>('/api/coins/balance')
      .then((r) => setCoinBalance(r.balance))
      .catch(() => setCoinBalance(0));
  }, []);

  // Text mode state
  const [textPrompt, setTextPrompt] = useState('');
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState(IMAGE_MODELS[0].id);

  // Photo mode state
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoPrompt, setPhotoPrompt] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Generation result state
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [resultPromptId, setResultPromptId] = useState<string | null>(null);
  const [resultTitle, setResultTitle] = useState('');
  const [resultIsPublic, setResultIsPublic] = useState(true);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Apply prefill when mode changes
  useEffect(() => {
    if (view === 'text' && prefill.text) {
      setTextPrompt(prefill.text.prompt);
      setSelectedStyleId(prefill.text.styleId);
      setSelectedModelId(prefill.text.modelId);
    }
  }, [view]);

  // Android hardware back button
  useEffect(() => {
    const handlePopState = () => {
      if (['loading', 'result'].includes(view)) {
        // Block back
        window.history.pushState(null, '', window.location.href);
        return;
      }
      if (view === 'confirm') { setView(prevView); return; }
      if (view === 'text' || view === 'photo') { setView('landing'); return; }
      if (view === 'landing') { handleDismiss(); }
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [view, prevView]);

  const handleDismiss = useCallback(() => {
    setView('landing');
    setPrefill({ text: null, photo: null });
    setGenerationError(null);
    setResultImageUrl(null);
    setCreateHubOpen(false);
  }, [setCreateHubOpen]);

  const handleNewPrompt = useCallback(() => {
    setCreateHubOpen(false);
    openNewPrompt();
  }, [setCreateHubOpen, openNewPrompt]);

  const handleModeSelect = (mode: CreateMode) => {
    setPrevView('landing');
    setPrefill((prev) => ({ ...prev, [mode]: null }));
    setView(mode);
  };

  // Calculate current cost
  const currentMode: CreateMode = prevView === 'photo' ? 'photo' : 'text';
  const activeModelId = selectedModelId as keyof typeof import('../config/coinCosts').COIN_COSTS.models;
  const currentCost = calculateCost({
    modelId: selectedModelId as never,
    isImgToImg: currentMode === 'photo',
    isRegenerate: false,
  });

  const handleGenerate = () => {
    if (!selectedStyleId) return;
    setPrevView(view as CreateMode);
    setView('confirm');
  };

  const handleConfirmed = async (idempotencyKey: string) => {
    setView('loading');
    setGenerationError(null);
    try {
      const userText = currentMode === 'text' ? textPrompt : photoPrompt;
      const result = await generateImage({
        userText,
        styleId: selectedStyleId!,
        modelId: selectedModelId,
        inputImageBase64: currentMode === 'photo' && photoBase64 ? photoBase64 : undefined,
        idempotencyKey,
      });
      setResultImageUrl(result.imageUrl);
      setResultPromptId(result.promptId);
      setView('result');
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      const code = String(status ?? '500');
      setGenerationError(ERROR_MESSAGES[code] ?? ERROR_MESSAGES['500']);
      setView(prevView as CreateMode);
    }
  };

  const handlePhotoUpload = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('Dosya 5MB\'dan büyük olamaz.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setPhotoBase64((e.target?.result as string)?.split(',')[1] ?? null);
    reader.readAsDataURL(file);
  };

  const selectedModel = IMAGE_MODELS.find((m) => m.id === selectedModelId);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60"
        onClick={['loading', 'result', 'confirm'].includes(view) ? undefined : handleDismiss}
      />

      {/* Modal sheet */}
      <div className="fixed bottom-0 inset-x-0 z-[101] bg-surface-0 rounded-t-3xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Handle */}
        <div className="pt-3 pb-2 flex-shrink-0">
          <div className="w-12 h-1 rounded-full bg-white/20 mx-auto" />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-10">
          {view === 'landing' && <LandingView onModeSelect={handleModeSelect} onNewPrompt={handleNewPrompt} />}

          {view === 'text' && (
            <TextView
              prompt={textPrompt}
              onPromptChange={setTextPrompt}
              selectedStyleId={selectedStyleId}
              onStyleSelect={setSelectedStyleId}
              selectedModelId={selectedModelId}
              onModelSelect={setSelectedModelId}
              cost={currentCost}
              error={generationError}
              onGenerate={handleGenerate}
              onBack={() => setView('landing')}
            />
          )}

          {view === 'photo' && (
            <PhotoView
              photoBase64={photoBase64}
              onPhotoUpload={handlePhotoUpload}
              onPhotoClear={() => setPhotoBase64(null)}
              photoInputRef={photoInputRef}
              prompt={photoPrompt}
              onPromptChange={setPhotoPrompt}
              selectedStyleId={selectedStyleId}
              onStyleSelect={setSelectedStyleId}
              selectedModelId={selectedModelId}
              onModelSelect={setSelectedModelId}
              cost={currentCost}
              error={generationError}
              onGenerate={handleGenerate}
              onBack={() => setView('landing')}
            />
          )}

          {view === 'loading' && <LoadingView />}

          {view === 'result' && resultImageUrl && (
            <ResultView
              imageUrl={resultImageUrl}
              promptId={resultPromptId}
              title={resultTitle}
              onTitleChange={setResultTitle}
              isPublic={resultIsPublic}
              onVisibilityChange={setResultIsPublic}
              onSave={() => {
                // TODO Faz 5: prompt title/visibility güncelle
                setPrefill({ text: null, photo: null });
                setView('landing');
                handleDismiss();
              }}
              onRetry={() => {
                setPrefill({ text: null, photo: null });
                setView(prevView as CreateMode);
              }}
            />
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      {view === 'confirm' && selectedStyleId && (
        <GenerateConfirmModal
          cost={currentCost}
          balance={coinBalance}
          styleName={selectedStyleId}
          modelName={selectedModel?.name ?? selectedModelId}
          onCancel={() => setView(prevView as CreateMode)}
          onConfirm={handleConfirmed}
        />
      )}
    </>
  );
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

function LandingView({ onModeSelect, onNewPrompt }: {
  onModeSelect: (mode: 'text' | 'photo') => void;
  onNewPrompt: () => void;
}) {
  return (
    <div className="pt-2 space-y-4">
      <h2 className="font-display text-lg font-semibold text-white text-center">Oluştur</h2>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onModeSelect('text')}
          className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] active:scale-95 transition-transform"
        >
          <div className="w-12 h-12 rounded-xl bg-accent-violet/20 border border-accent-violet/30 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a3b18a" strokeWidth="1.8">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-display text-sm font-medium text-white">Metin → Görsel</p>
            <p className="text-white/40 text-xs font-body mt-0.5">Prompt yaz, görsel üret</p>
          </div>
        </button>

        <button
          onClick={() => onModeSelect('photo')}
          className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] active:scale-95 transition-transform"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-display text-sm font-medium text-white">Fotoğraf → Görsel</p>
            <p className="text-white/40 text-xs font-body mt-0.5">Fotoğrafını dönüştür</p>
          </div>
        </button>
      </div>

      {/* New Prompt — tam genişlik 3. kart */}
      <button
        onClick={onNewPrompt}
        className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] active:scale-[0.98] transition-transform"
      >
        <div className="w-12 h-12 rounded-xl bg-accent-violet/20 border border-accent-violet/30 flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a3b18a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <div className="text-left">
          <p className="font-display text-sm font-medium text-white">New Prompt</p>
          <p className="text-white/40 text-xs font-body mt-0.5">Metin prompt'u yaz ve kaydet</p>
        </div>
      </button>
    </div>
  );
}

interface TextViewProps {
  prompt: string;
  onPromptChange: (v: string) => void;
  selectedStyleId: string | null;
  onStyleSelect: (id: string) => void;
  selectedModelId: string;
  onModelSelect: (id: string) => void;
  cost: number;
  error: string | null;
  onGenerate: () => void;
  onBack: () => void;
}

function TextViewProps(props: TextViewProps) { return null; }

function TextViewComponent({
  prompt, onPromptChange,
  selectedStyleId, onStyleSelect,
  selectedModelId, onModelSelect,
  cost, error, onGenerate, onBack,
}: TextViewProps) {
  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h2 className="font-display text-base font-semibold text-white">Metin → Görsel</h2>
      </div>

      <div className="space-y-2">
        <label className="text-white/40 text-xs font-display uppercase tracking-wide">Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Ne üretmek istiyorsun? (örn. 'güneş batarken göl manzarası')"
          className="w-full h-28 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm font-body placeholder:text-white/20 resize-none focus:outline-none focus:border-accent-violet/40"
        />
        <p className="text-white/20 text-xs text-right">{prompt.length}/300</p>
      </div>

      <div className="space-y-2">
        <label className="text-white/40 text-xs font-display uppercase tracking-wide">Style</label>
        <StyleSelector selectedId={selectedStyleId} onSelect={onStyleSelect} />
      </div>

      <div className="space-y-2">
        <label className="text-white/40 text-xs font-display uppercase tracking-wide">Model</label>
        <ModelSelector selectedId={selectedModelId} onSelect={onModelSelect} imgToImgMode={false} />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm font-body">{error}</p>
        </div>
      )}

      <button
        onClick={onGenerate}
        disabled={!prompt.trim() || !selectedStyleId}
        className="w-full py-4 rounded-xl bg-accent-violet text-white font-display font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Üret — {cost} coin
      </button>
    </div>
  );
}
const TextView = TextViewComponent;

interface PhotoViewProps {
  photoBase64: string | null;
  onPhotoUpload: (file: File) => void;
  onPhotoClear: () => void;
  photoInputRef: React.RefObject<HTMLInputElement>;
  prompt: string;
  onPromptChange: (v: string) => void;
  selectedStyleId: string | null;
  onStyleSelect: (id: string) => void;
  selectedModelId: string;
  onModelSelect: (id: string) => void;
  cost: number;
  error: string | null;
  onGenerate: () => void;
  onBack: () => void;
}

function PhotoViewComponent({
  photoBase64, onPhotoUpload, onPhotoClear, photoInputRef,
  prompt, onPromptChange,
  selectedStyleId, onStyleSelect,
  selectedModelId, onModelSelect,
  cost, error, onGenerate, onBack,
}: PhotoViewProps) {
  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h2 className="font-display text-base font-semibold text-white">Fotoğraf → Görsel</h2>
      </div>

      {/* Photo upload area */}
      <div>
        <label className="text-white/40 text-xs font-display uppercase tracking-wide block mb-2">Fotoğraf</label>
        {photoBase64 ? (
          <div className="relative w-full h-48 rounded-xl overflow-hidden">
            <img
              src={`data:image/jpeg;base64,${photoBase64}`}
              className="w-full h-full object-cover"
              alt="Yüklenen fotoğraf"
            />
            <button
              onClick={onPhotoClear}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={() => photoInputRef.current?.click()}
            className="w-full h-36 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 active:bg-white/[0.03]"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p className="text-white/30 text-sm font-body">Fotoğraf yükle (max 5MB)</p>
          </button>
        )}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPhotoUpload(file);
          }}
        />
      </div>

      <div className="space-y-2">
        <label className="text-white/40 text-xs font-display uppercase tracking-wide">Prompt (opsiyonel)</label>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Ek yönlendirme (opsiyonel)"
          className="w-full h-20 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm font-body placeholder:text-white/20 resize-none focus:outline-none focus:border-accent-violet/40"
        />
      </div>

      <div className="space-y-2">
        <label className="text-white/40 text-xs font-display uppercase tracking-wide">Style</label>
        <StyleSelector selectedId={selectedStyleId} onSelect={onStyleSelect} />
      </div>

      <div className="space-y-2">
        <label className="text-white/40 text-xs font-display uppercase tracking-wide">Model</label>
        <ModelSelector selectedId={selectedModelId} onSelect={onModelSelect} imgToImgMode={true} />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm font-body">{error}</p>
        </div>
      )}

      <button
        onClick={onGenerate}
        disabled={!photoBase64 || !selectedStyleId}
        className="w-full py-4 rounded-xl bg-accent-violet text-white font-display font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Üret — {cost} coin (+%30 prim)
      </button>
    </div>
  );
}
const PhotoView = PhotoViewComponent;

function LoadingView() {
  const [showAd, setShowAd] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowAd(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-12">
      <svg className="w-12 h-12 animate-spin text-accent-violet" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <div className="text-center">
        <p className="font-display text-base font-medium text-white">Görsel oluşturuluyor...</p>
        <p className="text-white/30 text-sm font-body mt-1">Bu 10–30 saniye sürebilir</p>
      </div>

      {/* v1: Reklam placeholder — 5 saniyeden uzun süren üretimlerde göster */}
      {showAd && (
        <div className="w-full mt-2 rounded-2xl overflow-hidden border border-white/[0.06] bg-surface-1">
          <div className="flex flex-col items-center gap-2 py-6 px-4">
            <span className="px-2 py-0.5 rounded-md bg-white/[0.06] font-mono text-[10px] text-white/30 border border-white/[0.06]">
              Reklam
            </span>
            <div className="w-full h-24 rounded-xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center">
              <p className="font-body text-xs text-white/15">Reklam Alanı</p>
            </div>
            <p className="font-body text-[11px] text-white/15 text-center">
              Premium'a geçerek reklamları kaldırabilirsiniz.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface ResultViewProps {
  imageUrl: string;
  promptId: string | null;
  title: string;
  onTitleChange: (v: string) => void;
  isPublic: boolean;
  onVisibilityChange: (v: boolean) => void;
  onSave: () => void;
  onRetry: () => void;
}

function ResultView({ imageUrl, title, onTitleChange, isPublic, onVisibilityChange, onSave, onRetry }: ResultViewProps) {
  return (
    <div className="space-y-5 pt-2">
      <h2 className="font-display text-base font-semibold text-white text-center">Görsel Hazır!</h2>

      <div className="w-full rounded-2xl overflow-hidden aspect-square">
        <img src={imageUrl} alt="Üretilen görsel" className="w-full h-full object-cover" />
      </div>

      <div className="space-y-2">
        <label className="text-white/40 text-xs font-display uppercase tracking-wide">Başlık (opsiyonel)</label>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Görsele bir başlık ver..."
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm font-body placeholder:text-white/20 focus:outline-none focus:border-accent-violet/40"
        />
      </div>

      {/* Visibility toggle */}
      <div className="flex items-center justify-between py-3 border-t border-b border-white/[0.06]">
        <div>
          <p className="font-display text-sm text-white">Herkese açık</p>
          <p className="text-white/30 text-xs font-body">Feed'de görünsün</p>
        </div>
        <button
          onClick={() => onVisibilityChange(!isPublic)}
          className={`w-12 h-6 rounded-full transition-colors relative ${isPublic ? 'bg-accent-violet' : 'bg-white/10'}`}
        >
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onRetry}
          className="py-3.5 rounded-xl border border-white/10 text-white/60 font-display text-sm"
        >
          Tekrar Dene
        </button>
        <button
          onClick={onSave}
          className="py-3.5 rounded-xl bg-accent-violet text-white font-display text-sm font-semibold"
        >
          Kaydet
        </button>
      </div>
    </div>
  );
}
