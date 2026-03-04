import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { FeedCard } from '../components/FeedCard';
import { AdCard } from '../components/AdCard';
import type { ApiPrompt } from '../services/api';

type FeedItem =
  | { type: 'prompt'; data: ApiPrompt }
  | { type: 'ad'; id: string };

function buildFeedItems(prompts: ApiPrompt[]): FeedItem[] {
  // v1: tüm kullanıcılara reklam göster. TODO v2: premium kullanıcılar için atla.
  const items: FeedItem[] = [];
  let adCount = 0;
  prompts.forEach((p, i) => {
    items.push({ type: 'prompt', data: p });
    if ((i + 1) % 5 === 0 && i + 1 < prompts.length) {
      items.push({ type: 'ad', id: `ad-${adCount++}` });
    }
  });
  return items;
}

export function ExploreScreen() {
  const prompts = useStore((s) => s.prompts);
  const feedLoading = useStore((s) => s.feedLoading);
  const currentFeedIndex = useStore((s) => s.currentFeedIndex);
  const setCurrentFeedIndex = useStore((s) => s.setCurrentFeedIndex);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);

  const feedItems = useMemo(() => buildFeedItems(prompts), [prompts]);

  // Map store promptIndex → feedItem index on first render / index change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || feedItems.length === 0) return;
    // Find the feed item index corresponding to currentFeedIndex (counting only prompts)
    let promptsSeen = 0;
    let targetFeedIdx = 0;
    for (let i = 0; i < feedItems.length; i++) {
      if (feedItems[i].type === 'prompt') {
        if (promptsSeen === currentFeedIndex) {
          targetFeedIdx = i;
          break;
        }
        promptsSeen++;
      }
    }
    const targetScroll = targetFeedIdx * el.clientHeight;
    if (Math.abs(el.scrollTop - targetScroll) > 10) {
      el.scrollTop = targetScroll;
    }
    setVisibleIndex(targetFeedIdx);
  }, [currentFeedIndex, feedItems]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollTop / el.clientHeight);
    if (index !== visibleIndex && index >= 0 && index < feedItems.length) {
      setVisibleIndex(index);
      // Update store's prompt index (skip ad items)
      let promptIdx = 0;
      for (let i = 0; i <= index && i < feedItems.length; i++) {
        if (feedItems[i].type === 'prompt') promptIdx = i;
      }
      // Count only prompts before current position
      let promptCount = 0;
      for (let i = 0; i < index && i < feedItems.length; i++) {
        if (feedItems[i].type === 'prompt') promptCount++;
      }
      setCurrentFeedIndex(promptCount);
    }
  }, [visibleIndex, feedItems, setCurrentFeedIndex]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Count prompts displayed up to and including current position
  const visiblePromptNumber = useMemo(() => {
    let count = 0;
    for (let i = 0; i <= visibleIndex && i < feedItems.length; i++) {
      if (feedItems[i].type === 'prompt') count++;
    }
    return count;
  }, [visibleIndex, feedItems]);

  if (feedLoading && prompts.length === 0) {
    return (
      <div className="w-full h-full bg-surface-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-accent-violet" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="font-body text-sm text-white/30">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <div className="w-full h-full bg-surface-0 flex items-center justify-center px-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="font-display text-base font-medium text-white/40">Henüz içerik yok</p>
          <p className="font-body text-sm text-white/20 text-center">İlk görselini üretmek için + butonuna bas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-surface-0">
      <div
        ref={scrollRef}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollBehavior: 'smooth' }}
      >
        {feedItems.map((item) =>
          item.type === 'prompt' ? (
            <div key={item.data.id} className="w-full h-full snap-start snap-always">
              <FeedCard prompt={item.data} onPanelChange={setPanelOpen} />
            </div>
          ) : (
            <div key={item.id} className="w-full h-full snap-start snap-always">
              <AdCard />
            </div>
          )
        )}
      </div>

      {!panelOpen && (
        <div className="absolute top-14 right-5 z-30 pointer-events-none">
          <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/[0.08]">
            <span className="font-mono text-xs text-white/70">
              {visiblePromptNumber}
              <span className="text-white/30"> / {prompts.length}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
