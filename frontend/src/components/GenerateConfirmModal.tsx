import { useState, useRef } from 'react';

interface GenerateConfirmModalProps {
  cost: number;
  balance: number;
  styleName: string;
  modelName: string;
  onCancel: () => void;
  onConfirm: (idempotencyKey: string) => Promise<void>;
}

export function GenerateConfirmModal({
  cost,
  balance,
  styleName,
  modelName,
  onCancel,
  onConfirm,
}: GenerateConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const idempotencyKey = useRef<string>('');
  const afterBalance = balance - cost;

  const handleConfirm = async () => {
    if (isSubmitting) return;
    idempotencyKey.current = crypto.randomUUID();
    setIsSubmitting(true);
    try {
      await onConfirm(idempotencyKey.current);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/70 flex items-end" onClick={onCancel}>
      <div
        className="w-full bg-surface-0 rounded-t-3xl p-6 pb-10 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 rounded-full bg-white/20 mx-auto" />
        <h3 className="font-display text-base font-semibold text-white text-center">Üretimi Onayla</h3>

        <div className="space-y-2 bg-white/[0.04] rounded-2xl p-4">
          <Row label="Style" value={styleName} />
          <Row label="Model" value={modelName} />
          <div className="border-t border-white/[0.06] my-2" />
          <Row label="Maliyet" value={`${cost} coin`} highlight />
          <Row
            label="Bakiye"
            value={`${balance} → ${afterBalance < 0 ? 0 : afterBalance} coin`}
            highlight={afterBalance < 0}
            danger={afterBalance < 0}
          />
        </div>

        {afterBalance < 0 && (
          <p className="text-red-400 text-sm font-body text-center">Yetersiz coin bakiyesi.</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-xl border border-white/10 text-white/50 font-display text-sm"
          >
            İptal
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || balance < cost}
            className="flex-1 py-3.5 rounded-xl bg-accent-violet text-white font-display text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                İşleniyor...
              </>
            ) : (
              `Devam Et — ${cost} coin`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight = false,
  danger = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/40 text-sm font-body">{label}</span>
      <span
        className={`text-sm font-display font-medium ${
          danger ? 'text-red-400' : highlight ? 'text-accent-violet' : 'text-white/70'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
