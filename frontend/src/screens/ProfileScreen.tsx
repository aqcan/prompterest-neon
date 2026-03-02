import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { PremiumUpgradeScreen } from './PremiumUpgradeScreen';

export function ProfileScreen() {
  const user = useStore((s) => s.user);
  const authLoading = useStore((s) => s.authLoading);
  const authError = useStore((s) => s.authError);
  const login = useStore((s) => s.login);
  const register = useStore((s) => s.register);
  const logout = useStore((s) => s.logout);
  const savedPrompts = useStore((s) => s.savedPrompts);
  const savedLoading = useStore((s) => s.savedLoading);
  const navigateToPrompt = useStore((s) => s.navigateToPrompt);
  const prompts = useStore((s) => s.prompts);

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPremium, setShowPremium] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.04 } },
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const handleSubmit = async () => {
    hapticMedium();
    if (isRegisterMode) {
      await register(email, password, name);
    } else {
      await login(email, password);
    }
  };

  // ── NOT LOGGED IN ─────────────────────────────────────
  if (!user) {
    const submitButtonLabel = isRegisterMode ? 'Create Account' : 'Sign In';

    return (
      <div className="w-full h-full bg-surface-0 overflow-y-auto overscroll-contain">
        <div className="sticky top-0 z-20 bg-surface-0/80 backdrop-blur-xl border-b border-white/[0.04]">
          <div className="px-5 pt-14 pb-4">
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">Profile</h1>
          </div>
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="px-5 py-8 pb-32 space-y-5"
        >
          {/* Welcome card */}
          <motion.div
            variants={fadeUp}
            className="relative rounded-3xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent-violet/30 via-accent-violet/10 to-surface-3/20" />
            <div className="absolute inset-0 border border-accent-violet/15 rounded-3xl" />
            <div className="relative p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-violet/20 border border-accent-violet/20 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a3b18a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h3 className="font-display text-lg font-semibold text-white mb-1">
                {isRegisterMode ? 'Create Account' : 'Welcome Back'}
              </h3>
              <p className="font-body text-sm text-white/40">
                {isRegisterMode ? 'Sign up to save and manage your prompts' : 'Sign in to access your saved prompts'}
              </p>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div variants={fadeUp} className="space-y-3">
            {isRegisterMode && (
              <input
                type="text"
                placeholder="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-surface-2 border border-white/[0.06] font-body text-sm text-white placeholder:text-white/25 outline-none focus:border-accent-violet/30 transition-colors"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-surface-2 border border-white/[0.06] font-body text-sm text-white placeholder:text-white/25 outline-none focus:border-accent-violet/30 transition-colors"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-surface-2 border border-white/[0.06] font-body text-sm text-white placeholder:text-white/25 outline-none focus:border-accent-violet/30 transition-colors"
            />

            {authError && (
              <p className="text-center text-xs text-accent-rose font-body">{authError}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={authLoading || !email || !password}
              className="w-full py-3.5 rounded-2xl bg-accent-violet font-display text-sm font-semibold text-white active:scale-[0.97] transition-transform disabled:opacity-50"
            >
              {authLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isRegisterMode ? 'Creating...' : 'Signing in...'}
                </span>
              ) : submitButtonLabel}
            </button>

            <button
              onClick={() => {
                hapticLight();
                setIsRegisterMode(!isRegisterMode);
                useStore.setState({ authError: null });
              }}
              className="w-full py-2 font-body text-sm text-white/40"
            >
              {isRegisterMode ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          </motion.div>

          {/* Version */}
          <motion.p
            variants={fadeUp}
            className="text-center font-mono text-[10px] text-white/15 pt-4"
          >
            Prompterest v1.0.0
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // ── LOGGED IN ─────────────────────────────────────────
  return (
    <>
    <div className="w-full h-full bg-surface-0 overflow-y-auto overscroll-contain">
      <div className="sticky top-0 z-20 bg-surface-0/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="px-5 pt-14 pb-4">
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">Profile</h1>
        </div>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="px-5 py-4 pb-32 space-y-4"
      >
        {/* Profile Card */}
        <motion.div variants={fadeUp} className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-violet/30 via-accent-violet/10 to-surface-3/20" />
          <div className="absolute inset-0 border border-accent-violet/15 rounded-3xl" />
          <div className="relative p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-accent-violet/20 border border-accent-violet/20 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a3b18a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg font-semibold text-white truncate">
                  {user.email}
                </h3>
                <p className="font-body text-xs text-white/30 mt-0.5">
                  Member since 2026
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex mt-5 pt-4 border-t border-white/[0.06]">
              <div className="flex-1 text-center">
                <p className="font-display text-xl font-bold text-white">{prompts.length}</p>
                <p className="font-body text-xs text-white/30 mt-0.5">Prompts</p>
              </div>
              <div className="w-px bg-white/[0.06]" />
              <div className="flex-1 text-center">
                <p className="font-display text-xl font-bold text-white">{savedPrompts.length}</p>
                <p className="font-body text-xs text-white/30 mt-0.5">Saved</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bookmarked */}
        <motion.div variants={fadeUp}>
          <button
            onClick={() => {
              hapticMedium();
              setShowBookmarks(true);
            }}
            className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-surface-2 border border-white/[0.06] active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
              <span className="font-display text-sm font-semibold text-white">Bookmarked</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-body text-xs text-white/30">{savedPrompts.length}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>
        </motion.div>

        {/* Premium upgrade */}
        <motion.div variants={fadeUp}>
          <button
            onClick={() => {
              hapticMedium();
              setShowPremium(true);
            }}
            className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-surface-2 border border-white/[0.06] active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <span className="text-accent-violet text-base">★</span>
              <span className="font-display text-sm font-semibold text-white">Premium'a Geç</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-body text-xs text-white/30">Free</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>
        </motion.div>

        {/* Sign Out */}
        <motion.div variants={fadeUp}>
          <button
            onClick={() => {
              hapticMedium();
              logout();
            }}
            className="w-full py-3.5 rounded-2xl bg-accent-rose/10 border border-accent-rose/15 font-display text-sm font-semibold text-accent-rose active:scale-[0.98] transition-transform"
          >
            Sign Out
          </button>
        </motion.div>

        {/* Version */}
        <motion.p
          variants={fadeUp}
          className="text-center font-mono text-[10px] text-white/15 pt-2"
        >
          Prompterest v1.0.0
        </motion.p>
      </motion.div>
    </div>

    {/* Bookmarks Sheet */}
    <AnimatePresence>
      {showBookmarks && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50"
            onClick={() => setShowBookmarks(false)}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 inset-x-0 z-[61] bg-surface-1 rounded-t-3xl max-h-[75vh] flex flex-col"
          >
            {/* Handle */}
            <div className="pt-3 pb-1 flex-shrink-0">
              <div className="w-12 h-1 rounded-full bg-white/20 mx-auto" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] flex-shrink-0">
              <h3 className="font-display text-base font-semibold text-white">Bookmarked</h3>
              <button
                onClick={() => setShowBookmarks(false)}
                className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain py-3 px-4 space-y-2 pb-10">
              {savedLoading && (
                <div className="flex items-center justify-center py-10">
                  <svg className="w-6 h-6 animate-spin text-white/30" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}

              {!savedLoading && savedPrompts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                  <p className="font-body text-sm text-white/25">Henüz bookmark yok</p>
                </div>
              )}

              {!savedLoading && savedPrompts.map((saved) => (
                <button
                  key={saved.id}
                  onClick={() => {
                    hapticLight();
                    setShowBookmarks(false);
                    navigateToPrompt(saved.promptId);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.05] active:scale-[0.98] transition-transform text-left"
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-xl bg-surface-3 flex-shrink-0 overflow-hidden">
                    {saved.prompt.imageUrl ? (
                      <img
                        src={saved.prompt.imageUrl}
                        alt={saved.prompt.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm font-medium text-white truncate">
                      {saved.prompt.title || 'Başlıksız'}
                    </p>
                    {saved.prompt.authorUsername && (
                      <p className="font-body text-xs text-white/30 mt-0.5 truncate">
                        @{saved.prompt.authorUsername}
                      </p>
                    )}
                  </div>

                  {/* Chevron */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {showPremium && (
        <PremiumUpgradeScreen onClose={() => setShowPremium(false)} />
      )}
    </AnimatePresence>
    </>
  );
}
