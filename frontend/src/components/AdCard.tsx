// v1: Statik reklam placeholder — v2'de gerçek reklam entegrasyonu yapılacak
export function AdCard() {
  return (
    <div className="w-full h-full bg-surface-1 flex flex-col items-center justify-center gap-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="w-full h-full" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #ffffff 0, #ffffff 1px, transparent 0, transparent 50%)',
          backgroundSize: '12px 12px',
        }} />
      </div>

      {/* Ad badge */}
      <div className="absolute top-16 left-5">
        <span className="px-2 py-0.5 rounded-md bg-white/[0.06] font-mono text-[10px] text-white/30 border border-white/[0.06]">
          Reklam
        </span>
      </div>

      {/* Placeholder content */}
      <div className="relative flex flex-col items-center gap-3 px-8 text-center">
        <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>
        <p className="font-display text-sm font-medium text-white/20">Reklam Alanı</p>
        <p className="font-body text-xs text-white/10">
          Premium'a geçerek reklamları kaldırabilirsiniz.
        </p>
      </div>
    </div>
  );
}
