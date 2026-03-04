import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BottomNav } from './BottomNav';
import { useStore } from '../store/useStore';

const BASE_STATE = {
  activeTab: 'explore' as const,
  setActiveTab: vi.fn(),
  setCreateHubOpen: vi.fn(),
};

describe('BottomNav', () => {
  beforeEach(() => useStore.setState(BASE_STATE));

  it('renders five buttons (4 tabs + create)', () => {
    render(<BottomNav />);
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('renders Keşfet, Takip, Stüdyo, Profil labels', () => {
    render(<BottomNav />);
    expect(screen.getByText('Keşfet')).toBeInTheDocument();
    expect(screen.getByText('Takip')).toBeInTheDocument();
    expect(screen.getByText('Stüdyo')).toBeInTheDocument();
    expect(screen.getByText('Profil')).toBeInTheDocument();
  });

  it('calls setActiveTab with "following" when Takip tab is clicked', async () => {
    const setActiveTab = vi.fn();
    useStore.setState({ setActiveTab });
    render(<BottomNav />);
    await userEvent.click(screen.getByText('Takip'));
    expect(setActiveTab).toHaveBeenCalledWith('following');
  });

  it('calls setActiveTab with "profile" when Profil tab is clicked', async () => {
    const setActiveTab = vi.fn();
    useStore.setState({ setActiveTab });
    render(<BottomNav />);
    await userEvent.click(screen.getByText('Profil'));
    expect(setActiveTab).toHaveBeenCalledWith('profile');
  });

  it('active tab label has accent color styling', () => {
    useStore.setState({ activeTab: 'explore' });
    render(<BottomNav />);
    expect(screen.getByText('Keşfet')).toHaveClass('text-accent-violet');
    expect(screen.getByText('Takip')).not.toHaveClass('text-accent-violet');
  });
});
