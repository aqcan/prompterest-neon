import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hapticMedium } from '../utils/haptics';

interface PremiumUpgradeScreenProps {
  onClose: () => void;
}

export function PremiumUpgradeScreen({ onClose }: Readonly<PremiumUpgradeScreenProps>) {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleStart = () => {
    hapticMedium();
    showToast('Yakında açılıyor.');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-surface-0/95 backdrop-blur-xl overflow-y-auto overscroll-contain"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-0/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="flex items-center px-5 pt-14 pb-4 gap-3">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center active:scale-95 transition-transform"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <h1 className="font-display text-xl font-bold text-white tracking-tight">Premium</h1>
        </div>
      </div>

      <div className="px-5 pt-6 pb-32 space-y-6">
        {/* Subtitle */}
        <p className="font-body text-sm text-white/40 text-center">
          Daha fazla coin, premium style'lar ve reklamsız deneyim.
        </p>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Basic Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative rounded-2xl overflow-hidden flex flex-col"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent-cyan/20 via-accent-cyan/5 to-transparent" />
            <div className="absolute inset-0 border border-accent-cyan/20 rounded-2xl" />
            <div className="relative p-4 flex flex-col gap-3 flex-1">
              {/* Badge */}
              <div className="flex items-center gap-2">
                <span className="text-accent-cyan text-base">♦</span>
                <span className="font-display text-sm font-bold text-white">Basic</span>
              </div>

              {/* Features */}
              <ul className="space-y-2 flex-1">
                <li className="flex items-start gap-2">
                  <span className="text-accent-cyan text-xs mt-0.5 flex-shrink-0">✓</span>
                  <span className="font-body text-xs text-white/70">Reklamsız</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-cyan text-xs mt-0.5 flex-shrink-0">✓</span>
                  <span className="font-body text-xs text-white/70">200 coin/hafta</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white/20 text-xs mt-0.5 flex-shrink-0">✗</span>
                  <span className="font-body text-xs text-white/30">Premium style</span>
                </li>
              </ul>

              {/* Price */}
              <div className="pt-2 border-t border-white/[0.06]">
                <p className="font-display text-lg font-bold text-white">$5</p>
                <p className="font-body text-[11px] text-white/30">/ay · $50/yıl</p>
              </div>

              {/* CTA */}
              <button
                onClick={handleStart}
                className="w-full py-2.5 rounded-xl bg-accent-cyan/20 border border-accent-cyan/30 font-display text-xs font-semibold text-accent-cyan active:scale-95 transition-transform"
              >
                Başla
              </button>
            </div>
          </motion.div>

          {/* Pro Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative rounded-2xl overflow-hidden flex flex-col"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent-violet/30 via-accent-violet/10 to-transparent" />
            <div className="absolute inset-0 border border-accent-violet/30 rounded-2xl" />
            {/* Popular badge */}
            <div className="absolute -top-px left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-b-lg bg-accent-violet text-[10px] font-bold text-white font-display">
                Popüler
              </span>
            </div>
            <div className="relative p-4 flex flex-col gap-3 flex-1 pt-6">
              {/* Badge */}
              <div className="flex items-center gap-2">
                <span className="text-accent-violet text-base">★</span>
                <span className="font-display text-sm font-bold text-white">Pro</span>
              </div>

              {/* Features */}
              <ul className="space-y-2 flex-1">
                <li className="flex items-start gap-2">
                  <span className="text-accent-violet text-xs mt-0.5 flex-shrink-0">✓</span>
                  <span className="font-body text-xs text-white/70">Reklamsız</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-violet text-xs mt-0.5 flex-shrink-0">✓</span>
                  <span className="font-body text-xs text-white/70">500 coin/hafta</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-violet text-xs mt-0.5 flex-shrink-0">✓</span>
                  <span className="font-body text-xs text-white/70">Premium style</span>
                </li>
              </ul>

              {/* Price */}
              <div className="pt-2 border-t border-white/[0.06]">
                <p className="font-display text-lg font-bold text-white">$20</p>
                <p className="font-body text-[11px] text-white/30">/ay · $200/yıl</p>
              </div>

              {/* CTA */}
              <button
                onClick={handleStart}
                className="w-full py-2.5 rounded-xl bg-accent-violet/20 border border-accent-violet/30 font-display text-xs font-semibold text-accent-violet active:scale-95 transition-transform"
              >
                Başla
              </button>
            </div>
          </motion.div>
        </div>

        {/* Note */}
        <p className="text-center font-body text-xs text-white/20">
          v1'de ödeme sistemi aktif değil — yakında açılacak.
        </p>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl bg-surface-2 border border-white/[0.08] shadow-xl"
          >
            <p className="font-body text-sm text-white/80 whitespace-nowrap">{toast}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
