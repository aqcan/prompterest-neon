import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useStore } from '../store/useStore';

interface ProfilePrompt {
  id: string;
  imageUrl: string | null;
  styleId: string | null;
  modelId: string | null;
  createdAt: string;
}

interface ProfileData {
  user: { id: string; username: string; avatar: string | null };
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  prompts: ProfilePrompt[];
}

interface UserProfileSheetProps {
  userId: string;
  onClose: () => void;
  onUnfollow?: () => void;
}

export function UserProfileSheet({ userId, onClose, onUnfollow }: UserProfileSheetProps) {
  const currentUser = useStore((s) => s.user);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    apiFetch<ProfileData>(`/api/social/user/${userId}/profile`)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const handleToggleFollow = async () => {
    if (!profile || !currentUser) return;
    setFollowLoading(true);
    try {
      if (profile.isFollowing) {
        await apiFetch(`/api/social/unfollow/${userId}`, { method: 'DELETE' });
        setProfile((p) => p ? {
          ...p,
          isFollowing: false,
          followerCount: Math.max(0, p.followerCount - 1),
        } : p);
        onUnfollow?.();
      } else {
        await apiFetch(`/api/social/follow/${userId}`, { method: 'POST' });
        setProfile((p) => p ? {
          ...p,
          isFollowing: true,
          followerCount: p.followerCount + 1,
        } : p);
      }
    } catch {
      // Sessizce başarısız ol
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/70 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-surface-0 rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-3 pb-0 flex-shrink-0">
          <div className="w-12 h-1 rounded-full bg-white/20 mx-auto" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="w-8 h-8 animate-spin text-accent-violet" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : profile ? (
          <div className="flex-1 overflow-y-auto pb-10">
            {/* Profil header */}
            <div className="px-5 pt-5 pb-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/[0.08] flex items-center justify-center flex-shrink-0">
                {profile.user.avatar ? (
                  <img
                    src={profile.user.avatar}
                    alt={profile.user.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="font-display text-xl font-bold text-white/40 uppercase">
                    {profile.user.username[0]}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-base font-semibold text-white truncate">
                  {profile.user.username}
                </p>
                <div className="flex gap-4 mt-1">
                  <span className="text-white/40 text-xs font-body">
                    <span className="text-white/70 font-semibold">{profile.followerCount}</span> takipçi
                  </span>
                  <span className="text-white/40 text-xs font-body">
                    <span className="text-white/70 font-semibold">{profile.followingCount}</span> takip
                  </span>
                </div>
              </div>

              {/* Takip et/bırak butonu — sadece başka kullanıcı için */}
              {currentUser && currentUser.id !== userId && (
                <button
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className={`px-4 py-2 rounded-xl text-sm font-display font-medium transition-colors ${
                    profile.isFollowing
                      ? 'bg-white/[0.08] border border-white/[0.12] text-white/60'
                      : 'bg-accent-violet text-white'
                  } disabled:opacity-50`}
                >
                  {followLoading ? '...' : profile.isFollowing ? 'Takibi Bırak' : 'Takip Et'}
                </button>
              )}
            </div>

            {/* Görseller grid */}
            {profile.prompts.length > 0 ? (
              <div className="grid grid-cols-3 gap-0.5 px-0">
                {profile.prompts.map((p) => (
                  <div key={p.id} className="aspect-square bg-white/[0.04]">
                    {p.imageUrl && (
                      <img
                        src={p.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-white/30 text-sm font-body">Henüz üretim yok</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-20">
            <p className="text-white/30 text-sm font-body">Kullanıcı bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  );
}
