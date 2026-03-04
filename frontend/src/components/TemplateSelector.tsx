import { useEffect, useState } from 'react';

export interface TemplateItem {
  id: string;
  name: string;
  description: string;
  mode: string;
  coinCost: number;
  emoji: string;
  isPremium: boolean;
}

interface TemplateSelectorProps {
  mode: 'photo' | 'video' | 'scratch';
  selectedId: string | null;
  onSelect: (id: string | null) => void; // null = seçimi kaldır
}

export function TemplateSelector({ mode, selectedId, onSelect }: TemplateSelectorProps) {
  const [templateList, setTemplateList] = useState<TemplateItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setSearch('');
    fetch(`/api/templates?mode=${mode}`)
      .then((r) => r.json())
      .then((data: TemplateItem[]) => {
        setTemplateList(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [mode]);

  const filtered = templateList.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-2 px-3 pt-1">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-white/[0.06] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Arama */}
      <div className="px-3 pb-2">
        <input
          type="text"
          placeholder="Şablon ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/[0.06] rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none"
        />
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto px-3 space-y-2 scrollbar-hide pb-4">
        {filtered.map((t) => {
          const isSelected = selectedId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(isSelected ? null : t.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                isSelected
                  ? 'border-accent-violet bg-accent-violet/10'
                  : 'border-white/[0.08] bg-white/[0.04] active:bg-white/[0.08]'
              }`}
            >
              <span className="text-xl flex-shrink-0">{t.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{t.name}</p>
                <p className="text-xs text-white/40 truncate">{t.description}</p>
              </div>
              {t.coinCost > 0 && (
                <span className="text-xs text-white/40 flex-shrink-0">+{t.coinCost}✦</span>
              )}
            </button>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-white/30 text-sm py-8">Şablon bulunamadı</p>
        )}
      </div>
    </div>
  );
}

// Seçili template adını döndüren yardımcı (confirm ekranı için)
export function useTemplateName(templateId: string | null, mode: 'photo' | 'video' | 'scratch'): string {
  const [name, setName] = useState('');
  useEffect(() => {
    if (!templateId) { setName(''); return; }
    fetch(`/api/templates?mode=${mode}`)
      .then((r) => r.json())
      .then((data: TemplateItem[]) => {
        setName(data.find((t) => t.id === templateId)?.name ?? '');
      })
      .catch(() => {});
  }, [templateId, mode]);
  return name;
}
