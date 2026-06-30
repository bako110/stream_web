import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Zap, Globe, Lock, Search, X, Plus } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import { encodeId } from '../../utils/slugId';
import type { Community } from '../../types';

const GRADIENTS = [
  ['#7B3FF2','#5B2EC4'],['#10B981','#7B3FF2'],['#7B3FF2','#EF4444'],
  ['#14B8A6','#7B3FF2'],['#F59E0B','#EF4444'],['#7B3FF2','#7B3FF2'],
];
function gradientFor(name: string): [string, string] {
  return GRADIENTS[(name.charCodeAt(0) || 0) % GRADIENTS.length] as [string, string];
}
function fmtCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000)      return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function SectionLabel({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3"
      style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <span>{icon}</span>
      <div>
        <p className="text-xs font-black tracking-wide" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>
      </div>
    </div>
  );
}

function CommunityRow({ c, joined, onJoin, onOpen }: {
  c: Community; joined: boolean; onJoin: () => void; onOpen: () => void;
}) {
  const [g1, g2] = gradientFor(c.name);
  const count = c.members_count ?? c.member_count ?? 0;
  const isBoosted = c.is_boosted ?? false;
  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-all cursor-pointer"
      onClick={onOpen}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      {c.avatar_url
        ? <img src={c.avatar_url} className="w-11 h-11 rounded-xl object-cover shrink-0" alt="" />
        : <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white text-lg shrink-0"
            style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
            {c.name[0]?.toUpperCase()}
          </div>
      }
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
          {c.is_private && <Lock size={10} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
          {isBoosted && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
              <Zap size={9} fill="currentColor" /> Boosté
            </span>
          )}
        </div>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {fmtCount(count)} membre{count > 1 ? 's' : ''}
          {c.description && <span className="ml-2 truncate">· {c.description}</span>}
        </p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onJoin(); }}
        className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
        style={joined
          ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
          : { background: 'rgba(123,63,242,0.1)', color: 'var(--primary)', border: '1px solid rgba(123,63,242,0.2)' }}
        onMouseEnter={e => { if (!joined) { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; } }}
        onMouseLeave={e => { if (!joined) { e.currentTarget.style.background = 'rgba(123,63,242,0.1)'; e.currentTarget.style.color = 'var(--primary)'; } }}>
        {joined ? 'Membre' : <><Plus size={11} /> Rejoindre</>}
      </button>
    </div>
  );
}

export default function DiscoverCommunitiesPage() {
  const navigate   = useNavigate();
  const [all,      setAll]      = useState<Community[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,  setHasMore]  = useState(true);
  const [page,     setPage]     = useState(1);
  const [query,    setQuery]    = useState('');
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async (reset = false) => {
    const nextPage = reset ? 1 : page + 1;
    if (reset) { setLoading(true); setAll([]); setPage(1); }
    else setLoadingMore(true);
    try {
      const res = await apiClient.get<any>(`${Endpoints.communities.discover}?page=${nextPage}&limit=20`);
      const raw = res.data;
      const items: Community[] = Array.isArray(raw) ? raw : raw?.items ?? raw?.data ?? raw?.results ?? [];
      if (reset) setAll(items); else setAll(prev => [...prev, ...items]);
      setPage(nextPage);
      setHasMore(items.length === 20);
    } catch { if (reset) setAll([]); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [page]);

  useEffect(() => { load(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function join(id: string) {
    try { await apiClient.post(Endpoints.communities.join(id)); setJoinedIds(s => new Set(s).add(id)); }
    catch { /**/ }
  }

  const filtered = query.trim()
    ? all.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || c.description?.toLowerCase().includes(query.toLowerCase()))
    : all;

  const boosted = filtered.filter(c => c.is_boosted);
  const rest    = filtered.filter(c => !c.is_boosted);

  function renderSection(list: Community[], icon: React.ReactNode, label: string, sub: string) {
    if (list.length === 0) return null;
    return (
      <>
        <SectionLabel icon={icon} label={label} sub={sub} />
        {list.map(c => (
          <CommunityRow key={c.id} c={c}
            joined={joinedIds.has(c.id)}
            onJoin={() => join(c.id)}
            onOpen={() => navigate(`/communities/${encodeId(c.id)}`)}
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
            <h1 className="font-black text-base leading-tight" style={{ color: 'var(--text-primary)' }}>Communautés</h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Boostées · populaires · toutes</p>
          </div>
        </div>
        <button onClick={() => navigate('/communities')}
          className="text-xs font-bold px-3 py-1.5 rounded-xl"
          style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)' }}>
          Mes communautés
        </button>
      </div>

      {/* Recherche */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher une communauté…"
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
            <Globe size={28} style={{ color: 'var(--primary)' }} />
          </div>
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            {query ? 'Aucune communauté trouvée' : 'Aucune communauté disponible'}
          </p>
          <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
            {query ? 'Essaie un autre mot-clé.' : 'Crée la première communauté !'}
          </p>
          {!query && (
            <button onClick={() => navigate('/communities')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white mt-2"
              style={{ background: 'var(--primary)' }}>
              <Plus size={14} /> Créer une communauté
            </button>
          )}
        </div>
      ) : (
        <div>
          {renderSection(boosted, <Zap size={14} style={{ color: '#F59E0B' }} />, 'Communautés boostées', 'Ces communautés ont boosté leur visibilité')}
          {renderSection(rest,    <Globe size={14} style={{ color: 'var(--primary)' }} />, 'Toutes les communautés', 'Découvre et rejoins des communautés')}

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
