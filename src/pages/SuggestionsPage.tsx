import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Sparkles, Zap, MapPin, Users } from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { encodeId } from '../utils/slugId';

function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="#7B3FF2" />
      <path d="M6 10l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PAGE_SIZE = 20;

export default function SuggestionsPage() {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();

  const [users,        setUsers]        = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [hasMore,      setHasMore]      = useState(true);
  const [followedIds,  setFollowedIds]  = useState<Set<string>>(new Set());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const offsetRef = useRef(0);

  const load = useCallback(async (reset = false) => {
    if (reset) { offsetRef.current = 0; setLoading(true); }
    else setLoadingMore(true);
    try {
      const res = await apiClient.get<any>(
        `${Endpoints.users.suggestions}?limit=${PAGE_SIZE}&offset=${offsetRef.current}`,
      );
      const data: any[] = Array.isArray(res.data) ? res.data
        : Array.isArray(res.data?.items) ? res.data.items
        : Array.isArray(res.data?.data) ? res.data.data : [];
      if (reset) setUsers(data);
      else setUsers(prev => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      offsetRef.current += data.length;
    } catch { /* silencieux */ }
    finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => { load(true); }, [load]);

  async function follow(userId: string) {
    if (followingIds.has(userId)) return;
    setFollowingIds(s => new Set(s).add(userId));
    try {
      await apiClient.post(`/api/v1/users/${userId}/follow`);
      setFollowedIds(s => new Set(s).add(userId));
    } catch { /* silencieux */ }
    finally { setFollowingIds(s => { const n = new Set(s); n.delete(userId); return n; }); }
  }

  async function unfollow(userId: string) {
    if (followingIds.has(userId)) return;
    setFollowingIds(s => new Set(s).add(userId));
    try {
      await apiClient.delete(`/api/v1/users/${userId}/follow`);
      setFollowedIds(s => { const n = new Set(s); n.delete(userId); return n; });
    } catch { /* silencieux */ }
    finally { setFollowingIds(s => { const n = new Set(s); n.delete(userId); return n; }); }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3.5 flex items-center gap-3"
        style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(123,63,242,0.12)' }}>
            <Sparkles size={16} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h1 className="font-black text-base leading-tight" style={{ color: 'var(--text-primary)' }}>
              Suggestions
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Comptes populaires près de toi
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 flex items-center gap-4 flex-wrap"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <Zap size={12} style={{ color: '#F59E0B' }} />
          Compte boosté
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <Users size={12} style={{ color: '#7B3FF2' }} />
          Amis en commun
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <MapPin size={12} style={{ color: '#10B981' }} />
          Proche de toi
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(123,63,242,0.08)' }}>
            <UserPlus size={28} style={{ color: 'var(--primary)' }} />
          </div>
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Aucune suggestion pour l'instant</p>
          <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
            Reviens plus tard, on trouvera des comptes intéressants près de toi.
          </p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {users.map((u: any) => {
            const isFollowed  = followedIds.has(u.id);
            const isFollowing = followingIds.has(u.id);
            const isSelf      = user?.id === u.id;
            const isBoosted   = u.is_boosted ?? false;
            const mutual      = u.mutual_count ?? 0;

            return (
              <div key={u.id}
                className="flex items-center gap-3 px-4 py-3.5 transition-all"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                {/* Avatar */}
                <button onClick={() => navigate(`/user/${encodeId(u.id)}`)} className="shrink-0">
                  <Avatar src={u.avatar_url} name={u.display_name ?? u.username} size="md" verified={u.is_verified} />
                </button>

                {/* Infos */}
                <button onClick={() => navigate(`/user/${encodeId(u.id)}`)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {u.display_name ?? u.username}
                    </p>
                    {u.is_verified && <VerifiedBadge size={13} />}
                    {isBoosted && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
                        <Zap size={9} fill="currentColor" /> Boosté
                      </span>
                    )}
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                    @{u.username}
                    {mutual > 0 && (
                      <span className="ml-2" style={{ color: '#7B3FF2' }}>
                        · {mutual} ami{mutual > 1 ? 's' : ''} en commun
                      </span>
                    )}
                  </p>
                  {u.bio && (
                    <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-secondary)' }}>{u.bio}</p>
                  )}
                </button>

                {/* Follow button */}
                {!isSelf && (
                  <button
                    onClick={() => isFollowed ? unfollow(u.id) : follow(u.id)}
                    disabled={isFollowing}
                    className="shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all"
                    style={isFollowed
                      ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                      : { background: 'rgba(123,63,242,0.1)', color: 'var(--primary)', border: '1px solid rgba(123,63,242,0.2)' }}
                    onMouseEnter={e => { if (!isFollowed) { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; } }}
                    onMouseLeave={e => { if (!isFollowed) { e.currentTarget.style.background = 'rgba(123,63,242,0.1)'; e.currentTarget.style.color = 'var(--primary)'; } }}>
                    {isFollowing
                      ? <Spinner size="sm" />
                      : isFollowed
                        ? 'Abonné'
                        : <><UserPlus size={12} /> Suivre</>}
                  </button>
                )}
              </div>
            );
          })}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center py-6">
              <button
                onClick={() => load(false)}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)', border: '1px solid rgba(123,63,242,0.2)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(123,63,242,0.1)'; e.currentTarget.style.color = 'var(--primary)'; }}>
                {loadingMore ? <Spinner size="sm" /> : 'Voir plus'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
