import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { apiFetch, type ApiPrompt } from '../services/api';
import { FeedCard } from '../components/FeedCard';

export function FollowingScreen() {
  const user = useStore((s) => s.user);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const [feed, setFeed] = useState<ApiPrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    apiFetch<ApiPrompt[]>('/api/social/feed')
      .then((data) =>
        setFeed(data.map((p) => ({ ...p, currentVersion: null })))
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="w-full h-full bg-surface-0 flex items-center justify-center px-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <p className="font-display text-base font-medium text-white/40 text-center">
            Takip edilen içerikleri görmek için giriş yap
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full bg-surface-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent-violet/30 border-t-accent-violet animate-spin" />
          <p className="font-body text-sm text-white/30">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <div className="w-full h-full bg-surface-0 flex items-center justify-center px-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <p className="font-display text-base font-medium text-white/40 text-center">
            Henüz kimseyi takip etmiyorsunuz.
          </p>
          <p className="font-body text-sm text-white/25 text-center">
            Keşfet'te içerikleri açarak kullanıcı profillerine ulaşabilirsiniz.
          </p>
          <button
            onClick={() => setActiveTab('explore')}
            className="px-5 py-2.5 rounded-xl bg-accent-violet/20 border border-accent-violet/30 text-accent-violet text-sm font-medium active:scale-95 transition-transform"
          >
            Keşfet'e Git
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-scroll snap-y snap-mandatory"
      style={{ scrollbarWidth: 'none' }}
    >
      {feed.map((prompt) => (
        <div
          key={prompt.id}
          className="w-full h-full snap-start snap-always flex-shrink-0"
        >
          <FeedCard
            prompt={prompt}
            onPanelChange={setPanelOpen}
            onUnfollow={() => setFeed((f) => f.filter((p) => p.userId !== prompt.userId))}
          />
        </div>
      ))}
    </div>
  );
}
