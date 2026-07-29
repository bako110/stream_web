import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { encodeId, decodeId } from '../utils/slugId';
import { UserPlus, UserCheck, Users } from 'lucide-react';
import { VerifiedBadge } from '../components/ui/Avatar';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';

type Tab = 'followers' | 'following';

interface UserCard {
  id:            string;
  username?:     string;
  display_name?: string;
  avatar_url?:   string | null;
  banner_url?:   string | null;
  is_verified?:  boolean;
  is_online?:    boolean;
  is_followed?:  boolean;
  followers_count?: number;
}

// ── Skeleton card ──────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="h-16 animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
      <div className="flex flex-col items-center -mt-6 pb-4 px-3 gap-2">
        <div
          className="w-12 h-12 rounded-full animate-pulse"
          style={{ background: 'var(--bg-secondary)' }}
        />
        <div className="w-24 h-3 rounded-full animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
        <div className="w-16 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
        <div className="w-20 h-7 rounded-xl animate-pulse mt-1" style={{ background: 'var(--bg-secondary)' }} />
      </div>
    </div>
  );
}

// ── User card ──────────────────────────────────────────────────────────────────
function UserCardItem({
  user,
  isMe,
  onFollow,
  onUnfollow,
  followingMap,
}: {
  user:         UserCard;
  isMe:         boolean;
  onFollow:     (id: string) => void;
  onUnfollow:   (id: string) => void;
  followingMap: Record<string, boolean>;
}) {
  const navigate   = useNavigate();
  const followed   = followingMap[user.id] !== undefined
    ? followingMap[user.id]
    : (user.is_followed ?? false);

  const initials = (user.display_name ?? user.username ?? 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer transition-all group"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(123,63,242,0.35)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      onClick={() => navigate(`/user/${encodeId(user.id)}`)}
    >
      {/* Cover gradient */}
      <div
        className="h-16 relative"
        style={{
          background: user.banner_url
            ? undefined
            : 'linear-gradient(135deg,#7B3FF2,#5B2EC4)',
        }}
      >
        {user.banner_url && (
          <img src={user.banner_url} alt="" className="w-full h-full object-cover" />
        )}
        {/* Online dot */}
        {user.is_online && (
          <span
            className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full border-2"
            style={{ background: '#22C55E', borderColor: 'var(--surface)' }}
          />
        )}
      </div>

      {/* Avatar overlapping */}
      <div className="flex flex-col items-center -mt-6 pb-3 px-3">
        <div className="relative mb-1.5">
          <div
            className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-sm font-black text-white ring-2"
            style={{
              background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)',
              boxShadow:  '0 0 0 2px var(--surface)',
            }}
          >
            {user.avatar_url
              ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              : initials
            }
          </div>
          {user.is_verified && (
            <span className="absolute -bottom-0.5 -right-0.5">
              <VerifiedBadge size={14} />
            </span>
          )}
        </div>

        {/* Name */}
        <p className="text-xs font-bold truncate max-w-full text-center" style={{ color: 'var(--text-primary)' }}>
          {user.display_name ?? user.username ?? 'Utilisateur'}
        </p>
        {user.username && (
          <p className="text-[11px] truncate max-w-full text-center" style={{ color: 'var(--text-tertiary)' }}>
            @{user.username}
          </p>
        )}

        {/* Follow button */}
        <div className="mt-2 w-full" onClick={e => e.stopPropagation()}>
          {isMe ? (
            <span
              className="block w-full text-center text-[11px] font-semibold px-3 py-1.5 rounded-xl"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
            >
              Mon profil
            </span>
          ) : followed ? (
            <button
              onClick={() => onUnfollow(user.id)}
              className="w-full flex items-center justify-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              <UserCheck size={12} /> Suivi
            </button>
          ) : (
            <button
              onClick={() => onFollow(user.id)}
              className="w-full flex items-center justify-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all text-white"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', border: 'none' }}
            >
              <UserPlus size={12} /> Suivre
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function FollowingPage() {
  const { userId: userSlug } = useParams<{ userId?: string }>();
  const userId               = userSlug ? decodeId(userSlug) : undefined;
  const { user: me }         = useAuthStore();
  const targetId             = userId ?? me?.id ?? '';
  const isOwnProfile         = !userId || userId === me?.id;

  const [tab,          setTab]          = useState<Tab>('followers');
  const [followers,    setFollowers]    = useState<UserCard[]>([]);
  const [following,    setFollowing]    = useState<UserCard[]>([]);
  const [loadingF,     setLoadingF]     = useState(false);
  const [loadingFg,    setLoadingFg]    = useState(false);
  const [loadedF,      setLoadedF]      = useState(false);
  const [loadedFg,     setLoadedFg]     = useState(false);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  const fetchFollowers = useCallback(async () => {
    if (loadedF || !targetId) return;
    setLoadingF(true);
    try {
      const res = await apiClient.get<unknown>(Endpoints.users.followers(targetId));
      const raw = res.data as any;
      const list: UserCard[] = Array.isArray(raw) ? raw
        : Array.isArray(raw?.items) ? raw.items
        : Array.isArray(raw?.data)  ? raw.data
        : [];
      setFollowers(list);
      setLoadedF(true);
    } catch {
      setLoadedF(true);
    } finally {
      setLoadingF(false);
    }
  }, [targetId, loadedF]);

  const fetchFollowing = useCallback(async () => {
    if (loadedFg || !targetId) return;
    setLoadingFg(true);
    try {
      const res = await apiClient.get<unknown>(Endpoints.users.following(targetId));
      const raw = res.data as any;
      const list: UserCard[] = Array.isArray(raw) ? raw
        : Array.isArray(raw?.items) ? raw.items
        : Array.isArray(raw?.data)  ? raw.data
        : [];
      setFollowing(list);
      setLoadedFg(true);
    } catch {
      setLoadedFg(true);
    } finally {
      setLoadingFg(false);
    }
  }, [targetId, loadedFg]);

  useEffect(() => {
    if (tab === 'followers') fetchFollowers();
    else                     fetchFollowing();
  }, [tab]); // eslint-disable-line

  async function handleFollow(id: string) {
    setFollowingMap(prev => ({ ...prev, [id]: true }));
    try {
      await apiClient.post(Endpoints.users.follow(id));
    } catch {
      setFollowingMap(prev => ({ ...prev, [id]: false }));
    }
  }

  async function handleUnfollow(id: string) {
    setFollowingMap(prev => ({ ...prev, [id]: false }));
    try {
      await apiClient.delete(Endpoints.users.follow(id));
    } catch {
      setFollowingMap(prev => ({ ...prev, [id]: true }));
    }
  }

  const isLoading   = tab === 'followers' ? loadingF  : loadingFg;
  const currentList = tab === 'followers' ? followers : following;

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'followers', label: 'Abonnes',      count: followers.length  },
    { id: 'following', label: 'Abonnements',  count: following.length  },
  ];

  return (
    <div className="w-full mx-auto px-4 sm:px-6 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Users size={22} style={{ color: 'var(--primary)' }} />
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
          {isOwnProfile ? 'Mes abonnements' : 'Abonnements'}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1" style={{ borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-5 py-3 text-sm font-semibold relative transition-colors"
            style={{ color: tab === t.id ? 'var(--primary)' : 'var(--text-tertiary)' }}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
              >
                {t.count}
              </span>
            )}
            {tab === t.id && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: 'var(--primary)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : currentList.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20" style={{ color: 'var(--text-tertiary)' }}>
          <Users size={36} strokeWidth={1.2} />
          <p className="text-sm">
            {tab === 'followers' ? 'Aucun abonne pour le moment' : 'Aucun abonnement pour le moment'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {currentList.map(user => (
            <UserCardItem
              key={user.id}
              user={user}
              isMe={user.id === me?.id}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
              followingMap={followingMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}
