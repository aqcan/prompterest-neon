import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store/useStore';
import { BottomNav } from './components/BottomNav';
import { ExploreScreen } from './screens/ExploreScreen';
import { FollowingScreen } from './screens/FollowingScreen';
import { StudioScreen } from './screens/StudioScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { PromptEditorScreen } from './screens/PromptEditorScreen';
import { CreateScreen } from './screens/CreateScreen';
import { OnboardingModal } from './screens/OnboardingModal';
import { NewPromptScreen } from './screens/NewPromptScreen';

export default function App() {
  const activeTab = useStore((s) => s.activeTab);
  const editorPromptId = useStore((s) => s.editorPromptId);
  const createScreenOpen = useStore((s) => s.createScreenOpen);
  const newPromptOpen = useStore((s) => s.newPromptOpen);
  const initAuth = useStore((s) => s.initAuth);
  const loadPrompts = useStore((s) => s.loadPrompts);
  const user = useStore((s) => s.user);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    initAuth();
    loadPrompts();
  }, [initAuth, loadPrompts]);

  // Onboarding: user login olduktan sonra survey_done yoksa göster
  useEffect(() => {
    if (user && !localStorage.getItem('survey_done')) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [user]);

  return (
    <div className="fixed inset-0 bg-surface-0 font-body text-white overflow-hidden select-none">
      {/* Screen content */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 0 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          {activeTab === 'explore' && <ExploreScreen />}
          {activeTab === 'following' && <FollowingScreen />}
          {activeTab === 'studio' && <StudioScreen />}
          {activeTab === 'profile' && <ProfileScreen />}
        </motion.div>
      </AnimatePresence>

      {/* Bottom navigation */}
      <BottomNav />

      {/* Editor screen overlay */}
      <AnimatePresence>
        {editorPromptId && <PromptEditorScreen />}
      </AnimatePresence>

      {/* Create Screen */}
      <AnimatePresence>
        {createScreenOpen && <CreateScreen />}
      </AnimatePresence>

      {/* New Prompt Screen overlay */}
      <AnimatePresence>
        {newPromptOpen && <NewPromptScreen />}
      </AnimatePresence>

      {/* Onboarding Modal — login sonrası bir kez gösterilir */}
      {showOnboarding && (
        <OnboardingModal onComplete={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
