import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { useStore } from './store/useStore';

vi.mock('./screens/ExploreScreen', () => ({ ExploreScreen: () => <div>ExploreScreen</div> }));
vi.mock('./screens/FollowingScreen', () => ({ FollowingScreen: () => <div>FollowingScreen</div> }));
vi.mock('./screens/StudioScreen', () => ({ StudioScreen: () => <div>StudioScreen</div> }));
vi.mock('./screens/ProfileScreen', () => ({ ProfileScreen: () => <div>ProfileScreen</div> }));
vi.mock('./screens/PromptEditorScreen', () => ({ PromptEditorScreen: () => <div>PromptEditorScreen</div> }));
vi.mock('./components/BottomNav', () => ({ BottomNav: () => <nav>BottomNav</nav> }));

const BASE_STATE = {
  activeTab: 'explore' as const,
  editorPromptId: null,
  createHubOpen: false,
  initAuth: vi.fn(),
  loadPrompts: vi.fn().mockResolvedValue(undefined),
};

describe('App', () => {
  beforeEach(() => useStore.setState(BASE_STATE));

  it('always renders BottomNav', () => {
    render(<App />);
    expect(screen.getByText('BottomNav')).toBeInTheDocument();
  });

  it('renders ExploreScreen when activeTab is "explore"', () => {
    render(<App />);
    expect(screen.getByText('ExploreScreen')).toBeInTheDocument();
  });

  it('renders FollowingScreen when activeTab is "following"', () => {
    useStore.setState({ activeTab: 'following' });
    render(<App />);
    expect(screen.getByText('FollowingScreen')).toBeInTheDocument();
  });

  it('renders StudioScreen when activeTab is "studio"', () => {
    useStore.setState({ activeTab: 'studio' });
    render(<App />);
    expect(screen.getByText('StudioScreen')).toBeInTheDocument();
  });

  it('renders ProfileScreen when activeTab is "profile"', () => {
    useStore.setState({ activeTab: 'profile' });
    render(<App />);
    expect(screen.getByText('ProfileScreen')).toBeInTheDocument();
  });

  it('renders PromptEditorScreen when editorPromptId is set', () => {
    useStore.setState({ editorPromptId: 'some-prompt-id' });
    render(<App />);
    expect(screen.getByText('PromptEditorScreen')).toBeInTheDocument();
  });

  it('calls initAuth and loadPrompts on mount', () => {
    const initAuth = vi.fn();
    const loadPrompts = vi.fn().mockResolvedValue(undefined);
    useStore.setState({ initAuth, loadPrompts });
    render(<App />);
    expect(initAuth).toHaveBeenCalledTimes(1);
    expect(loadPrompts).toHaveBeenCalledTimes(1);
  });
});
