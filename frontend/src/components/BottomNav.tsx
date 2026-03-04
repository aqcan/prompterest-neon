import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import type { TabId } from '../types';
import { hapticLight } from '../utils/haptics';

interface TabDef {
  id: TabId;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

const tabs: TabDef[] = [
  {
    id: 'explore',
    label: 'Keşfet',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#a3b18a' : 'rgba(255,255,255,0.35)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 'following',
    label: 'Takip',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#a3b18a' : 'rgba(255,255,255,0.35)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    id: 'studio',
    label: 'Stüdyo',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#a3b18a' : 'rgba(255,255,255,0.35)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 110 20A10 10 0 0112 2z" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profil',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#a3b18a' : 'rgba(255,255,255,0.35)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const setCreateScreenOpen = useStore((s) => s.setCreateScreenOpen);

  // Split tabs: 2 left of + button, 2 right
  const leftTabs = tabs.slice(0, 2);
  const rightTabs = tabs.slice(2);

  const renderTab = (tab: TabDef) => {
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => {
          hapticLight();
          setActiveTab(tab.id);
        }}
        className="flex flex-col items-center gap-1 py-1 px-4 -mx-2"
      >
        <motion.div
          animate={{ scale: isActive ? 1.15 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          {tab.icon(isActive)}
        </motion.div>
        <span
          className={`font-display text-[10px] font-medium transition-colors ${
            isActive ? 'text-accent-violet' : 'text-white/25'
          }`}
        >
          {tab.label}
        </span>
        {isActive && (
          <motion.div
            layoutId="tab-indicator"
            className="w-1 h-1 rounded-full bg-accent-violet"
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          />
        )}
      </button>
    );
  };

  return (
    <div className="absolute bottom-0 inset-x-0 z-50">
      {/* Blur background */}
      <div className="absolute inset-0 bg-surface-0/60 backdrop-blur-2xl border-t border-white/[0.04]" />

      {/* Safe area + nav content */}
      <div className="relative flex items-center justify-around px-4 pt-2 pb-8">
        {leftTabs.map(renderTab)}

        {/* + Create button */}
        <button
          onClick={() => {
            hapticLight();
            setCreateScreenOpen(true);
          }}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-accent-violet -translate-y-1 shadow-lg shadow-accent-violet/30 active:scale-95 transition-transform"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {rightTabs.map(renderTab)}
      </div>
    </div>
  );
}
