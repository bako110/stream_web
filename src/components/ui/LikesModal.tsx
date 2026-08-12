import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Heart, UserPlus, UserCheck } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { encodeId } from '../../utils/slugId';
import { VerifiedBadge } from './Avatar';
import { Spinner } from './Spinner';

export type LikesTargetType = 'post' | 'event' | 'concert' | 'reel' | 'content';

interface LikeUser {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean;
  is_following?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  targetType: LikesTargetType;
  targetId: string;
}

const PAGE_LIMIT = 30;

export function LikesModal({ open, onClose, targetType, targetId }: Props) {
  const navigate = useNavigate();
  const [users,   setUsers]   = useState<LikeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const pageRef = useRef(1);
  const listRef = useRef<HTMLDivElement>(null);

  const key = targetType === 'content' ? 'content_id'
    : targetType === 'concert' ? 'concert_id'
    : targetType === 'event'   ? 'event_id'
    : targetType === 'reel'    ? 'reel_id'
    : 'post_id';

  const fetchPage = useCallback(async (page: number) => {
    const res = await apiClient.get<LikeUser[]>(
      `${Endpoints.social.reactionUsers}?${key}=${targetId}&page=${page}&limit=${PAGE_LIMIT}`,
    );
    return Array.isArray(res.data) ? res.data : [];
  }, [key, targetId]);

  useEffect(() => {
    if (!open) return;
    setUsers([]); setFollowingMap({}); setHasMore(true); pageRef.current = 1;
    setLoading(true);
    fetchPage(1)
      .then(list => { setUsers(list); setHasMore(list.length >= PAGE_LIMIT); })
      .catch(() => setHasMore(false))
      .finally(() => setLoading(false));
  }, [open, fetchPage]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const list = await fetchPage(nextPage);
      setUsers(prev => [...prev, ...list]);
      pageRef.current = nextPage;
      setHasMore(list.length >= PAGE_LIMIT);
    } catch { setHasMore(false); }
    finally { setLoadingMore(false); }
  }

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) loadMore();
  }

  async function handleFollow(id: string) {
    setFollowingMap(prev => ({ ...prev, [id]: true }));
    try { await apiClient.post(Endpoints.users.follow(id)); }
    catch { setFollowingMap(prev => ({ ...prev, [id]: false })); }
  }

  async function handleUnfollow(id: string) {
    setFollowingMap(prev => ({ ...prev, [id]: false }));
    try { await apiClient.delete(Endpoints.users.follow(id)); }
    catch { setFollowingMap(prev => ({ ...prev, [id]: true })); }
  }

  if (!open) return null;

  return createPortal((
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl sm:mb-6 overflow-hidden flex flex-col"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '75vh' }}
        onClick={e => e.stopPropagation()}>

        <div className="w-9 h-1 rounded-full mx-auto mt-3 sm:hidden shrink-0" style={{ background: 'var(--border)' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Heart size={16} fill="#E0389A" style={{ color: '#E0389A' }} />
            <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>J'aime</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Liste */}
        <div ref={listRef} onScroll={onScroll} className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Spinner size="sm" /></div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Heart size={24} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Personne n'a encore aimé ceci</p>
            </div>
          ) : (
            <>
              {users.map(u => {
                const followed = followingMap[u.id] !== undefined ? followingMap[u.id] : (u.is_following ?? false);
                return (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                    <button className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      onClick={() => { onClose(); navigate(`/user/${encodeId(u.id)}`); }}>
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold text-white"
                        style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                          : (u.display_name ?? u.username ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {u.display_name ?? u.username ?? 'Utilisateur'}
                          </p>
                          {u.is_verified && <VerifiedBadge size={12} />}
                        </div>
                        {u.username && (
                          <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>@{u.username}</p>
                        )}
                      </div>
                    </button>
                    {!followed ? (
                      <button onClick={() => handleFollow(u.id)}
                        className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
                        <UserPlus size={12} /> Suivre
                      </button>
                    ) : (
                      <button onClick={() => handleUnfollow(u.id)}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full shrink-0"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                        <UserCheck size={12} /> Suivi
                      </button>
                    )}
                  </div>
                );
              })}
              {loadingMore && (
                <div className="flex items-center justify-center py-3"><Spinner size="sm" /></div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  ), document.body);
}
