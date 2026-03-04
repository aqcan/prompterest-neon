import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

export interface StyleItem {
  id: string;
  name: string;
  isPremium: boolean;
  previewImagePath: string | null;
}

interface StyleSelectorProps {
  selectedId: string | null;
  onSelect: (styleId: string) => void;
}

export function StyleSelector({ selectedId, onSelect }: StyleSelectorProps) {
  const [styles, setStyles] = useState<StyleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useStore((s) => s.user);
  // TODO Faz 9: planı açıkken kullanıcının pro olup olmadığını kontrol et
  const userPlan = 'free'; // placeholder — Faz 9'da gerçek değer gelecek

  useEffect(() => {
    fetch('/api/styles')
      .then((r) => r.json())
      .then((data: StyleItem[]) => {
        setStyles(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="w-16 h-16 rounded-xl bg-white/[0.06] animate-pulse flex-shrink-0" />
        ))}
      </div>
    );
  }

  const freeStyles = styles.filter((s) => !s.isPremium);
  const premiumStyles = styles.filter((s) => s.isPremium);

  const renderStyle = (style: StyleItem) => {
    const isSelected = selectedId === style.id;
    const isLocked = style.isPremium && userPlan === 'free';

    return (
      <button
        key={style.id}
        onClick={() => {
          if (isLocked) {
            // UI hint — gerçek guard backend'de
            alert('Bu style Pro üyeliği gerektirir.');
            return;
          }
          onSelect(style.id);
        }}
        className={`relative flex-shrink-0 w-16 flex flex-col items-center gap-1 ${
          isSelected ? 'opacity-100' : 'opacity-60'
        }`}
      >
        <div
          className={`w-14 h-14 rounded-xl border-2 transition-colors overflow-hidden ${
            isSelected ? 'border-accent-violet' : 'border-white/10'
          }`}
          style={{
            background: style.previewImagePath
              ? `url(${style.previewImagePath}) center/cover`
              : 'rgba(255,255,255,0.06)',
          }}
        >
          {!style.previewImagePath && (
            <div className="w-full h-full flex items-center justify-center text-white/30 text-xs font-display">
              {style.name[0]}
            </div>
          )}
          {isLocked && (
            <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
          )}
        </div>
        <span className="text-[10px] text-white/50 font-display truncate w-14 text-center">
          {style.name}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {freeStyles.length > 0 && (
        <div>
          <p className="text-[11px] text-white/30 font-display mb-2">Ücretsiz</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {freeStyles.map(renderStyle)}
          </div>
        </div>
      )}
      {premiumStyles.length > 0 && (
        <div>
          <p className="text-[11px] text-white/30 font-display mb-2">Premium ✦</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {premiumStyles.map(renderStyle)}
          </div>
        </div>
      )}
    </div>
  );
}

// Seçili style adını göstermek için yardımcı
export function useStyleName(styleId: string | null): string {
  const [name, setName] = useState('');
  useEffect(() => {
    if (!styleId) { setName(''); return; }
    fetch('/api/styles')
      .then((r) => r.json())
      .then((data: StyleItem[]) => {
        const found = data.find((s) => s.id === styleId);
        setName(found?.name ?? styleId);
      })
      .catch(() => {});
  }, [styleId]);
  return name;
}
