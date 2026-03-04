import { useState } from 'react';
import { ONBOARDING_TAGS } from '../config/tags';
import { apiFetch } from '../services/api';

interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size < 3 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiFetch('/api/users/survey', {
        method: 'POST',
        body: JSON.stringify({ interests: Array.from(selected) }),
      });
    } catch {
      // API başarısız olsa bile modal kapanır, tekrar göstermeyiz
    } finally {
      localStorage.setItem('survey_done', 'true');
      setIsSubmitting(false);
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-end">
      <div className="w-full bg-surface-0 rounded-t-3xl p-6 pb-10 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="w-12 h-1 rounded-full bg-white/20 mx-auto" />

        <div className="space-y-1 text-center">
          <h2 className="font-display text-xl font-semibold text-white">Hoş Geldin! 👋</h2>
          <p className="text-white/40 text-sm font-body">
            Sana özel içerikler gösterelim — en az 3 ilgi alanı seç.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {ONBOARDING_TAGS.map((tag) => {
            const isSelected = selected.has(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => toggle(tag.id)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-colors text-left ${
                  isSelected
                    ? 'bg-accent-violet/20 border-accent-violet/50 text-white'
                    : 'bg-white/[0.04] border-white/[0.08] text-white/60'
                }`}
              >
                <span className="text-xl leading-none">{tag.icon}</span>
                <span className="font-display text-sm font-medium leading-tight">{tag.label}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <p className={`text-xs font-body text-center transition-colors ${selected.size >= 3 ? 'text-white/30' : 'text-white/20'}`}>
            {selected.size < 3
              ? `${3 - selected.size} tane daha seç`
              : `${selected.size} ilgi alanı seçildi ✓`}
          </p>
          <button
            onClick={handleSubmit}
            disabled={selected.size < 3 || isSubmitting}
            className="w-full py-4 rounded-xl bg-accent-violet text-white font-display font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          >
            {isSubmitting ? 'Kaydediliyor...' : 'Devam Et'}
          </button>
        </div>
      </div>
    </div>
  );
}
