import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { StyleSelector, useStyleName } from '../components/StyleSelector';
import { ModelSelector } from '../components/ModelSelector';
import { TemplateSelector, useTemplateName } from '../components/TemplateSelector';
import { generateImage } from '../services/imageGeneration';

type CreateMode = 'photo' | 'video' | 'scratch';
type CreateStep = 'mode' | 'workspace' | 'confirm' | 'loading' | 'result';

interface ModeConfig {
  id: CreateMode;
  emoji: string;
  title: string;
  desc: string;
  comingSoon?: boolean;
}

const MODES: ModeConfig[] = [
  { id: 'photo',   emoji: '📷', title: 'Fotoğraf', desc: 'Stil uygula, dönüştür, düzenle' },
  { id: 'video',   emoji: '🎬', title: 'Video',     desc: 'Harekete geçir, ses ekle',        comingSoon: true },
  { id: 'scratch', emoji: '✍️', title: 'Sıfırdan',  desc: 'Hayal et, yaz, oluştur' },
];

export function CreateScreen() {
  const setCreateScreenOpen = useStore((s) => s.setCreateScreenOpen);

  const [step, setStep] = useState<CreateStep>('mode');
  const [mode, setMode] = useState<CreateMode | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Confirm ekranı için adlar
  const styleName = useStyleName(selectedStyleId);
  const templateName = useTemplateName(
    selectedTemplateId,
    (mode ?? 'photo') as 'photo' | 'video' | 'scratch',
  );

  const close = () => setCreateScreenOpen(false);

  const selectMode = (m: CreateMode) => {
    setMode(m);
    setSelectedStyleId(null);
    setSelectedModelId('');
    setSelectedTemplateId(null);
    setPrompt('');
    setPhotoBase64(null);
    setLeftOpen(false);
    setRightOpen(false);
    setStep('workspace');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const canGenerate =
    Boolean(selectedStyleId) &&
    Boolean(selectedModelId) &&
    (mode === 'scratch' || Boolean(photoBase64));

  const handleGenerate = useCallback(
    async (idempotencyKey: string) => {
      if (!selectedStyleId || !selectedModelId) return;
      setStep('loading');
      setErrorMsg(null);
      try {
        const result = await generateImage({
          userText: prompt,
          styleId: selectedStyleId,
          modelId: selectedModelId,
          inputImageBase64: photoBase64 ?? undefined,
          templateId: selectedTemplateId ?? undefined,
          idempotencyKey,
        });
        setResultImageUrl(result.imageUrl);
        setStep('result');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Bir hata oluştu';
        setErrorMsg(msg);
        setStep('workspace');
      }
    },
    [selectedStyleId, selectedModelId, prompt, photoBase64, selectedTemplateId],
  );

  // ── Step 0: Mode seçimi ──────────────────────────────────────────────────────
  if (step === 'mode') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.28, ease: [0.32, 0, 0.1, 1] }}
        className="fixed inset-0 z-50 bg-[#0A0A0F] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-14 pb-4">
          <button onClick={close} className="text-white/40 text-sm">
            İptal
          </button>
          <h1 className="text-base font-semibold text-white">Ne oluşturmak istiyorsun?</h1>
          <div className="w-10" />
        </div>

        {/* Mode kartları */}
        <div className="flex-1 flex flex-col justify-center gap-4 px-5 pb-10">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => !m.comingSoon && selectMode(m.id)}
              disabled={m.comingSoon}
              className={`relative flex items-center gap-4 p-5 rounded-2xl border transition-colors ${
                m.comingSoon
                  ? 'border-white/[0.06] bg-white/[0.03] opacity-50 cursor-not-allowed'
                  : 'border-white/[0.10] bg-white/[0.05] active:bg-white/[0.10]'
              }`}
            >
              <span className="text-3xl">{m.emoji}</span>
              <div className="text-left">
                <p className="font-semibold text-white text-base">{m.title}</p>
                <p className="text-sm text-white/40">{m.desc}</p>
              </div>
              {m.comingSoon && (
                <span className="absolute top-3 right-3 text-xs text-white/30 bg-white/[0.08] px-2 py-0.5 rounded-full">
                  Yakında
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>
    );
  }

  // ── Step 1: Workspace ────────────────────────────────────────────────────────
  if (step === 'workspace') {
    const isVideoMode = mode === 'video';

    return (
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -30 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 bg-[#0A0A0F] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-14 pb-3 border-b border-white/[0.06]">
          <button
            onClick={() => setStep('mode')}
            className="text-white/40 text-sm flex items-center gap-1"
          >
            ‹ Geri
          </button>
          <span className="text-sm font-semibold text-white">
            {MODES.find((m2) => m2.id === mode)?.title ?? ''}
          </span>
          <button onClick={close} className="text-white/40 text-sm">
            ✕
          </button>
        </div>

        {/* Hata mesajı */}
        {errorMsg && (
          <div className="mx-4 mt-3 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Ana alan */}
        <div className="flex-1 relative overflow-hidden flex">
          {/* Sol panel — Stiller + Model */}
          <AnimatePresence>
            {leftOpen && (
              <motion.div
                initial={{ x: -240 }}
                animate={{ x: 0 }}
                exit={{ x: -240 }}
                transition={{ duration: 0.22, ease: [0.32, 0, 0.1, 1] }}
                className="absolute left-0 top-0 bottom-0 w-60 bg-[#12121A] border-r border-white/[0.08] z-10 flex flex-col overflow-hidden"
              >
                <div className="px-3 pt-4 pb-2 text-xs text-white/30 font-semibold uppercase tracking-wider flex-shrink-0">
                  Stiller
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-hide px-2 min-h-0">
                  <StyleSelector
                    selectedId={selectedStyleId}
                    onSelect={(id) => {
                      setSelectedStyleId(id);
                      setLeftOpen(false);
                    }}
                    mode={mode === 'video' ? 'video' : 'photo'}
                  />
                </div>
                <div className="px-3 pt-2 pb-1 text-xs text-white/30 font-semibold uppercase tracking-wider border-t border-white/[0.06] flex-shrink-0">
                  Model
                </div>
                <div className="px-2 pb-4 flex-shrink-0">
                  <ModelSelector
                    selectedId={selectedModelId}
                    onSelect={setSelectedModelId}
                    imgToImgMode={mode === 'photo'}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sağ panel — Şablonlar */}
          <AnimatePresence>
            {rightOpen && (
              <motion.div
                initial={{ x: 240 }}
                animate={{ x: 0 }}
                exit={{ x: 240 }}
                transition={{ duration: 0.22, ease: [0.32, 0, 0.1, 1] }}
                className="absolute right-0 top-0 bottom-0 w-60 bg-[#12121A] border-l border-white/[0.08] z-10 flex flex-col overflow-hidden"
              >
                <div className="px-3 pt-4 pb-2 text-xs text-white/30 font-semibold uppercase tracking-wider flex-shrink-0">
                  Şablonlar
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <TemplateSelector
                    mode={(mode ?? 'photo') as 'photo' | 'video' | 'scratch'}
                    selectedId={selectedTemplateId}
                    onSelect={(id) => {
                      setSelectedTemplateId(id);
                      setRightOpen(false);
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Panel overlay */}
          {(leftOpen || rightOpen) && (
            <div
              className="absolute inset-0 z-[5]"
              onClick={() => {
                setLeftOpen(false);
                setRightOpen(false);
              }}
            />
          )}

          {/* Merkez alan */}
          <div className="flex-1 flex flex-col px-4 py-3 gap-3 min-h-0">
            {/* Fotoğraf yükleme (photo/video modunda) */}
            {mode !== 'scratch' && (
              <label
                className={`relative flex items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer transition-colors flex-shrink-0 ${
                  photoBase64 ? 'border-transparent' : 'border-white/[0.15] bg-white/[0.04]'
                }`}
                style={{ aspectRatio: '1 / 1', maxHeight: '200px' }}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                {photoBase64 ? (
                  <img
                    src={photoBase64}
                    alt=""
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-white/30">
                    <span className="text-3xl">📷</span>
                    <span className="text-xs">Fotoğraf seç</span>
                  </div>
                )}
              </label>
            )}

            {/* Seçili öge pills */}
            {(selectedStyleId || selectedTemplateId) && (
              <div className="flex gap-2 flex-wrap flex-shrink-0">
                {selectedStyleId && (
                  <button
                    onClick={() => setSelectedStyleId(null)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-accent-violet/20 border border-accent-violet/40 text-xs text-white"
                  >
                    {styleName || selectedStyleId}{' '}
                    <span className="text-white/40 ml-0.5">×</span>
                  </button>
                )}
                {selectedTemplateId && (
                  <button
                    onClick={() => setSelectedTemplateId(null)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs text-white"
                  >
                    {templateName || selectedTemplateId}{' '}
                    <span className="text-white/40 ml-0.5">×</span>
                  </button>
                )}
              </div>
            )}

            {/* Prompt textarea */}
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                isVideoMode
                  ? 'Hareketi tanımla...'
                  : mode === 'scratch'
                    ? 'Hayal ettiğini yaz...'
                    : 'Ekstra detay (opsiyonel)...'
              }
              rows={3}
              className="w-full bg-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none resize-none flex-1 min-h-[80px]"
            />

            {/* Panel açma butonları */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  setLeftOpen((v) => !v);
                  setRightOpen(false);
                }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  leftOpen
                    ? 'bg-accent-violet/20 text-accent-violet'
                    : 'bg-white/[0.06] text-white/60'
                }`}
              >
                🎨 Stil / Model
              </button>
              <button
                onClick={() => {
                  setRightOpen((v) => !v);
                  setLeftOpen(false);
                }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  rightOpen ? 'bg-white/10 text-white' : 'bg-white/[0.06] text-white/60'
                }`}
              >
                📋 Şablon
              </button>
            </div>

            {/* Generate butonu */}
            {isVideoMode ? (
              <button
                disabled
                className="w-full py-4 rounded-2xl bg-white/[0.06] text-white/30 text-sm font-semibold cursor-not-allowed flex-shrink-0"
              >
                🎬 Video — Yakında
              </button>
            ) : (
              <button
                onClick={() => canGenerate && setStep('confirm')}
                disabled={!canGenerate}
                className={`w-full py-4 rounded-2xl text-sm font-semibold transition-all flex-shrink-0 ${
                  canGenerate
                    ? 'bg-accent-violet text-white active:scale-[0.98]'
                    : 'bg-white/[0.06] text-white/30 cursor-not-allowed'
                }`}
              >
                ✦ Oluştur
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Step 2: Confirm ──────────────────────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 flex items-end"
      >
        <div className="w-full bg-[#12121A] rounded-t-3xl p-6 pb-10 space-y-4">
          <h2 className="text-lg font-semibold text-white text-center">Onayla & Üret</h2>

          {photoBase64 && (
            <img
              src={photoBase64}
              alt=""
              className="w-full aspect-video object-cover rounded-xl"
            />
          )}

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/50">Mod</span>
              <span className="text-white capitalize">{mode}</span>
            </div>
            {styleName && (
              <div className="flex justify-between">
                <span className="text-white/50">Stil</span>
                <span className="text-white">{styleName}</span>
              </div>
            )}
            {templateName && (
              <div className="flex justify-between">
                <span className="text-white/50">Şablon</span>
                <span className="text-white">{templateName}</span>
              </div>
            )}
            {selectedModelId && (
              <div className="flex justify-between">
                <span className="text-white/50">Model</span>
                <span className="text-white">{selectedModelId}</span>
              </div>
            )}
            {prompt && (
              <div className="flex justify-between gap-4">
                <span className="text-white/50 flex-shrink-0">Prompt</span>
                <span className="text-white text-right truncate">{prompt}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep('workspace')}
              className="flex-1 py-3 rounded-2xl bg-white/[0.08] text-white/60 text-sm"
            >
              Geri
            </button>
            <button
              onClick={() => handleGenerate(crypto.randomUUID())}
              className="flex-1 py-3 rounded-2xl bg-accent-violet text-white text-sm font-semibold"
            >
              ✦ Şimdi Üret
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Step 3: Loading ──────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-[#0A0A0F] flex flex-col items-center justify-center gap-6"
      >
        <div className="w-16 h-16 rounded-full border-2 border-accent-violet border-t-transparent animate-spin" />
        <p className="text-white/60 text-sm">Görsel oluşturuluyor...</p>
      </motion.div>
    );
  }

  // ── Step 4: Result ───────────────────────────────────────────────────────────
  if (step === 'result') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-50 bg-[#0A0A0F] flex flex-col"
      >
        <div className="flex items-center justify-between px-4 pt-14 pb-3">
          <button onClick={() => setStep('workspace')} className="text-white/40 text-sm">
            Tekrar Dene
          </button>
          <span className="text-sm font-semibold text-white">Oluşturuldu!</span>
          <button onClick={close} className="text-accent-violet text-sm font-semibold">
            Kapat
          </button>
        </div>
        {resultImageUrl && (
          <img src={resultImageUrl} alt="" className="flex-1 object-contain" />
        )}
      </motion.div>
    );
  }

  return null;
}
