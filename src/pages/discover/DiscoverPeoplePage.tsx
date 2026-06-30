import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Zap, Users, Search, X } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';
import { encodeId } from '../../utils/slugId';

const PAGE_SIZE = 20;

function SectionLabel({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3"
      style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
      <span>{icon}</span>
      <div>
        <p className="text-xs font-black tracking-wide" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>
      </div>
    </div>
  );
}

function UserRow({ u, onFollow, onUnfollow, isFollowed, isFollowing, onClick }: {
  u: any; onFollow: () => void; onUnfollow: () => void;
  isFollowed: boolean; isFollowing: boolean; onClick: () => void;
}) {
  const isBoosted = u.is_boosted ?? false;
  const mutual    = u.mutual_count ?? 0;
  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-all"
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      <button onClick={onClick} className="shrink-0">
        <Avatar src={u.avatar_url} name={u.display_name ?? u.username} size="md" verified={u.is_verified} />
      </button>
      <button onClick={onClick} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-semibold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
            {u.display_name ?? u.username}
          </p>
          {isBoosted && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
              <Zap size={9} fill="currentColor" /> Boosté
            </span>
          )}
        </div>
        <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
          @{u.username}
          {mutual > 0 && <span className="ml-2" style={{ color: 'var(--primary)' }}>· {mutual} en commun</span>}
        </p>
        {u.bio && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-secondary)' }}>{u.bio}</p>}
      </button>
      <button
        onClick={() => isFollowed ? onUnfollow() : onFollow()}
        disabled={isFollowing}
        className="shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl transition-all"
        style={isFollowed
          ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
          : { background: 'rgba(123,63,242,0.1)', color: 'var(--primary)', border: '1px solid rgba(123,63,242,0.2)' }}
        onMouseEnter={e => { if (!isFollowed) { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; } }}
        onMouseLeave={e => { if (!isFollowed) { e.currentTarget.style.background = 'rgba(123,63,242,0.1)'; e.currentTarget.style.color = 'var(--primary)'; } }}>
        {isFollowing ? <Spinner size="sm" /> : isFollowed ? 'Abonné' : <><UserPlus size={11} />Suivre</>}
      </button>
    </div>
  );
}

export default function DiscoverPeoplePage() {
  const navigate = useNavigate();
  const [users,        setUsers]        = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [hasMore,      setHasMore]      = useState(true);
  const [query,        setQuery]        = useState('');
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
        : (res.data?.items ?? res.data?.data ?? []);
      if (reset) setUsers(data);
      else setUsers(prev => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      offsetRef.current += data.length;
    } catch { /**/ }
    finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => { load(true); }, [load]);

  async function follow(id: string) {
    if (followingIds.has(id)) return;
    setFollowingIds(s => new Set(s).add(id));
    try { await apiClient.post(`/api/v1/users/${id}/follow`); setFollowedIds(s => new Set(s).add(id)); }
    catch { /**/ }
    finally { setFollowingIds(s => { const n = new Set(s); n.delete(id); return n; }); }
  }
  async function unfollow(id: string) {
    if (followingIds.has(id)) return;
    setFollowingIds(s => new Set(s).add(id));
    try { await apiClient.delete(`/api/v1/users/${id}/follow`); setFollowedIds(s => { const n = new Set(s); n.delete(id); return n; }); }
    catch { /**/ }
    finally { setFollowingIds(s => { const n = new Set(s); n.delete(id); return n; }); }
  }

  const filtered = query.trim()
    ? users.filter(u => (u.display_name ?? u.username ?? '').toLowerCase().includes(query.toLowerCase()) || (u.username ?? '').toLowerCase().includes(query.toLowerCase()))
    : users;

  const boosted  = filtered.filter(u => u.is_boosted);
  const mutual   = filtered.filter(u => !u.is_boosted && (u.mutual_count ?? 0) > 0);
  const rest     = filtered.filter(u => !u.is_boosted && !(u.mutual_count ?? 0));

  function renderSection(list: any[], icon: React.ReactNode, label: string, sub: string) {
    if (list.length === 0) return null;
    return (
      <>
        <SectionLabel icon={icon} label={label} sub={sub} />
        {list.map(u => (
          <UserRow key={u.id} u={u}
            isFollowed={followedIds.has(u.id)}
            isFollowing={followingIds.has(u.id)}
            onFollow={() => follow(u.id)}
            onUnfollow={() => unfollow(u.id)}
            onClick={() => navigate(`/user/${encodeId(u.id)}`)}
          />
        ))}
      </>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(123,63,242,0.12)' }}>
            <Users size={16} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h1 className="font-black text-base leading-tight" style={{ color: 'var(--text-primary)' }}>Découvrir des gens</h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Boostés · amis communs · dans ta zone</p>
          </div>
        </div>
      </div>

      {/* Recherche */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher un utilisateur…"
            className="input w-full pl-9 pr-9 text-sm" />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-tertiary)' }}><X size={14} /></button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(123,63,242,0.08)' }}>
            <UserPlus size={28} style={{ color: 'var(--primary)' }} />
          </div>
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            {query ? 'Aucun résultat' : 'Aucune suggestion pour l\'instant'}
          </p>
          <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
            {query ? 'Essaie un autre nom.' : 'Reviens plus tard, on trouvera des comptes près de toi.'}
          </p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {renderSection(boosted, <Zap size={14} style={{ color: '#F59E0B' }} />, 'Comptes boostés', 'Ces comptes ont boosté leur visibilité')}
          {renderSection(mutual,  <Users size={14} style={{ color: 'var(--primary)' }} />, 'Amis en commun', 'Des gens que tes abonnements suivent aussi')}
          {renderSection(rest,    <UserPlus size={14} style={{ color: '#10B981' }} />, 'Découvertes', 'Comptes populaires autour de toi')}

          {hasMore && !query && (
            <div className="flex justify-center py-6">
              <button onClick={() => load(false)} disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)', border: '1px solid rgba(123,63,242,0.2)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(123,63,242,0.1)'; e.currentTarget.style.color = 'var(--primary)'; }}>
                {loadingMore ? <Spinner size="sm" /> : 'Charger plus'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
