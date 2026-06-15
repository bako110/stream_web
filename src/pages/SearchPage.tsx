import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { encodeId } from '../utils/slugId';
import { Search, TrendingUp, Film, Music, Calendar, User, Play, Zap, ExternalLink, Clock, X, Megaphone } from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Avatar } from '../components/ui/Avatar';
import { Spinner , PageLoader} from '../components/ui/Spinner';

// ── Historique local (localStorage, max 15) ───────────────────────────────────
const HISTORY_KEY = 'search:history';
const MAX_HISTORY = 15;

interface HistoryItem { query: string; ts: number; }

const searchHistory = {
  getAll(): HistoryItem[] {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); } catch { return []; }
  },
  add(query: string) {
    const q = query.trim();
    if (!q) return;
    const list = searchHistory.getAll().filter(h => h.query.toLowerCase() !== q.toLowerCase());
    list.unshift({ query: q, ts: Date.now() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
  },
  remove(query: string) {
    const list = searchHistory.getAll().filter(h => h.query !== query);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  },
  clear() { localStorage.removeItem(HISTORY_KEY); },
};

interface SearchAd {
  id: string; title: string; description?: string | null;
  cta_text?: string | null; cta_url?: string | null;
  creative_url?: string | null; thumbnail_url?: string | null;
}

function SearchAdCard({ ad }: { ad: SearchAd }) {
  const impressionSent = useRef(false);
  useEffect(() => {
    if (ad?.id && !impressionSent.current) {
      impressionSent.current = true;
      apiClient.post(Endpoints.ads.impression(ad.id)).catch(() => {});
    }
  }, [ad?.id]);

  function handleClick() {
    if (!ad.cta_url) return;
    apiClient.post(Endpoints.ads.click(ad.id)).catch(() => {});
    window.open(ad.cta_url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {/* En-tête */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(123,63,242,0.12)' }}>
          <Megaphone size={12} style={{ color: 'var(--primary)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate leading-none" style={{ color: 'var(--text-primary)' }}>{ad.title}</p>
          <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
            <Zap size={8} style={{ color: 'var(--primary)' }} /> Sponsorisé
          </p>
        </div>
      </div>

      {/* Visuel */}
      {(ad.thumbnail_url || ad.creative_url) && (
        <div className="mx-3 rounded-xl overflow-hidden mb-2" style={{ aspectRatio: '16/9' }}>
          <img src={ad.thumbnail_url ?? ad.creative_url!} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Description + CTA */}
      <div className="px-3 pb-3">
        {ad.description && (
          <p className="text-xs mb-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{ad.description}</p>
        )}
        {ad.cta_url && (
          <button onClick={handleClick}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-80"
            style={{ border: '1.5px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            {ad.cta_text ?? 'En savoir plus'} <ExternalLink size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

interface SearchResult {
  users?:    any[];
  films?:    any[];
  series?:   any[];
  concerts?: any[];
  events?:   any[];
  reels?:    any[];
}

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span style={{ color: 'var(--primary)' }}>{icon}</span>
      <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
        {count}
      </span>
    </div>
  );
}

export default function SearchPage() {
  const [params]                = useSearchParams();
  const navigate                = useNavigate();
  const q                       = params.get('q') ?? '';
  const [results,  setResults]  = useState<SearchResult | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [trending, setTrending] = useState<{ id: string; title: string; thumbnail_url?: string | null }[]>([]);
  const [searchAd, setSearchAd] = useState<SearchAd | null>(null);
  const [history,  setHistory]  = useState<HistoryItem[]>([]);

  // Charger historique local + tendances au montage
  useEffect(() => {
    setHistory(searchHistory.getAll());
    apiClient.get<SearchAd>(Endpoints.ads.feedNext('search')).then(r => { if (r.data?.id) setSearchAd(r.data); }).catch(() => {});
    apiClient.get<unknown>(Endpoints.search.trending)
      .then(r => {
        const raw = r.data as any;
        const list = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
        setTrending(list);
      }).catch(() => {});
  }, []);

  const doSearch = useCallback((term: string) => {
    if (!term.trim()) { setResults(null); setLoading(false); return; }
    setLoading(true);
    searchHistory.add(term);
    setHistory(searchHistory.getAll());
    apiClient.get<SearchResult>(`${Endpoints.search.query}?q=${encodeURIComponent(term.trim())}&limit=15`)
      .then(r => { setResults(r.data); })
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { doSearch(q); }, [q]); // eslint-disable-line

  function removeHistory(query: string) {
    searchHistory.remove(query);
    setHistory(searchHistory.getAll());
  }

  function clearHistory() {
    searchHistory.clear();
    setHistory([]);
  }

  const total = results
    ? (results.users?.length    ?? 0)
    + (results.films?.length    ?? 0)
    + (results.series?.length   ?? 0)
    + (results.concerts?.length ?? 0)
    + (results.events?.length   ?? 0)
    + (results.reels?.length    ?? 0)
    : 0;

  const hasResults = total > 0;

  return (
    <div className="max-w-full px-4 sm:px-6 py-6 space-y-6">

      {/* Barre de recherche mobile (le Topbar desktop suffit) */}
      <form onSubmit={e => { e.preventDefault(); if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`); }}
        className="lg:hidden">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }} />
          <input
            defaultValue={q}
            key={q}
            placeholder="Rechercher films, artistes, concerts…"
            autoFocus
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl focus:outline-none"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(123,63,242,0.12)'; }}
            onBlur={e  => { e.target.style.borderColor = 'var(--border)';  e.target.style.boxShadow = 'none'; }}
            onChange={e => {
              const v = e.target.value;
              if (v.trim()) navigate(`/search?q=${encodeURIComponent(v.trim())}`, { replace: true });
              else navigate('/search', { replace: true });
            }}
          />
        </div>
      </form>

      {/* Résumé des résultats */}
      {q && !loading && results && (
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {hasResults ? `${total} résultat${total > 1 ? 's' : ''} pour` : 'Aucun résultat pour'}
            {' '}<span style={{ color: 'var(--primary)' }}>« {q} »</span>
          </p>
        </div>
      )}

      {loading && <PageLoader />}

      {/* Historique de recherche local */}
      {!q && !loading && history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={15} style={{ color: 'var(--primary)' }} />
              <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Recherches récentes</h2>
            </div>
            <button onClick={clearHistory} className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Tout effacer
            </button>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {history.slice(0, 8).map((h, i) => (
              <div key={h.query}
                className="flex items-center gap-3 px-4 py-3 transition-all cursor-pointer"
                style={{ borderBottom: i < Math.min(history.length, 8) - 1 ? '1px solid var(--border)' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => navigate(`/search?q=${encodeURIComponent(h.query)}`)}>
                <Clock size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-primary)' }}>{h.query}</span>
                <button onClick={e => { e.stopPropagation(); removeHistory(h.query); }}
                  className="p-1 rounded-lg shrink-0"
                  style={{ color: 'var(--text-tertiary)' }}>
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tendances */}
      {!q && !loading && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} style={{ color: 'var(--primary)' }} />
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Tendances</h2>
          </div>
          {trending.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {trending.map((t) => (
                <button key={t.id} onClick={() => navigate(`/search?q=${encodeURIComponent(t.title)}`)}
                  className="group text-left transition-all cursor-pointer">
                  <div className="aspect-[2/3] rounded-xl overflow-hidden mb-1.5"
                    style={{ background: 'var(--bg-tertiary)' }}>
                    {t.thumbnail_url
                      ? <img src={t.thumbnail_url} alt={t.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      : <div className="w-full h-full flex items-center justify-center"><Film size={20} style={{ color: 'var(--text-tertiary)' }} /></div>
                    }
                  </div>
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{t.title}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Search size={36} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Tapez pour rechercher</p>
            </div>
          )}
        </div>
      )}

      {/* Résultats */}
      {!loading && results && (
        <div className="space-y-8">

          {/* Aucun résultat */}
          {!hasResults && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--bg-secondary)' }}>
                <Search size={26} style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Aucun résultat</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Essayez un autre terme de recherche.
              </p>
            </div>
          )}

          {/* Ad search — affichée en haut si pas de résultats utilisateurs, sinon après */}
          {searchAd && (results.users?.length ?? 0) === 0 && (
            <SearchAdCard ad={searchAd} />
          )}

          {/* Utilisateurs */}
          {(results.users?.length ?? 0) > 0 && (
            <section>
              <SectionHeader icon={<User size={14} />} title="Utilisateurs" count={results.users!.length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {results.users!.map((u: any) => (
                  <button key={u.id} onClick={() => navigate(`/user/${encodeId(u.id)}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => { (e.currentTarget.style.borderColor = 'var(--primary)'); (e.currentTarget.style.background = 'var(--bg-secondary)'); }}
                    onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--border)'); (e.currentTarget.style.background = 'var(--surface)'); }}>
                    <Avatar src={u.avatar_url} name={u.display_name ?? u.username} size="sm" verified={u.is_verified} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {u.display_name ?? u.username}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>@{u.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Ad search — après les utilisateurs (toutes les 5 items, identique mobile) */}
          {searchAd && (results.users?.length ?? 0) > 0 && (
            <SearchAdCard ad={searchAd} />
          )}

          {/* Films */}
          {(results.films?.length ?? 0) > 0 && (
            <section>
              <SectionHeader icon={<Film size={14} />} title="Films" count={results.films!.length} />
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-3">
                {results.films!.map((c: any) => (
                  <div key={c.id} onClick={() => navigate(`/films/${encodeId(c.id)}`)} className="cursor-pointer group">
                    <div className="aspect-[2/3] rounded-xl overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                      {c.thumbnail_url
                        ? <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        : <div className="w-full h-full flex items-center justify-center"><Film size={20} style={{ color: 'var(--text-tertiary)' }} /></div>
                      }
                    </div>
                    <p className="mt-1.5 text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.title}</p>
                    {c.year && <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{c.year}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Séries */}
          {(results.series?.length ?? 0) > 0 && (
            <section>
              <SectionHeader icon={<Film size={14} />} title="Séries" count={results.series!.length} />
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-3">
                {results.series!.map((c: any) => (
                  <div key={c.id} onClick={() => navigate(`/series/${encodeId(c.id)}`, { state: { item: c } })} className="cursor-pointer group">
                    <div className="aspect-[2/3] rounded-xl overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                      {c.thumbnail_url
                        ? <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        : <div className="w-full h-full flex items-center justify-center"><Film size={20} style={{ color: 'var(--text-tertiary)' }} /></div>
                      }
                    </div>
                    <p className="mt-1.5 text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.title}</p>
                    {c.year && <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{c.year}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Concerts */}
          {(results.concerts?.length ?? 0) > 0 && (
            <section>
              <SectionHeader icon={<Music size={14} />} title="Concerts" count={results.concerts!.length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {results.concerts!.map((c: any) => (
                  <button key={c.id} onClick={() => navigate(`/concerts/${encodeId(c.id)}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => { (e.currentTarget.style.borderColor = 'var(--primary)'); (e.currentTarget.style.background = 'var(--bg-secondary)'); }}
                    onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--border)'); (e.currentTarget.style.background = 'var(--surface)'); }}>
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                      style={{ background: 'var(--bg-tertiary)' }}>
                      {c.thumbnail_url
                        ? <img src={c.thumbnail_url} className="w-full h-full object-cover" alt="" />
                        : <Music size={18} style={{ color: 'var(--text-tertiary)' }} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.title}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                        {c.artist?.display_name ?? c.venue_city ?? ''}
                      </p>
                    </div>
                    {c.status === 'live' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>LIVE</span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Événements */}
          {(results.events?.length ?? 0) > 0 && (
            <section>
              <SectionHeader icon={<Calendar size={14} />} title="Événements" count={results.events!.length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {results.events!.map((ev: any) => (
                  <button key={ev.id} onClick={() => navigate(`/events/${encodeId(ev.id)}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => { (e.currentTarget.style.borderColor = 'var(--primary)'); (e.currentTarget.style.background = 'var(--bg-secondary)'); }}
                    onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--border)'); (e.currentTarget.style.background = 'var(--surface)'); }}>
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                      style={{ background: 'var(--bg-tertiary)' }}>
                      {ev.thumbnail_url
                        ? <img src={ev.thumbnail_url} className="w-full h-full object-cover" alt="" />
                        : <Calendar size={18} style={{ color: 'var(--text-tertiary)' }} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{ev.title}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {ev.venue_city ?? (ev.is_online ? 'En ligne' : '')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Reels */}
          {(results.reels?.length ?? 0) > 0 && (
            <section>
              <SectionHeader icon={<Play size={14} />} title="Reels" count={results.reels!.length} />
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-3">
                {results.reels!.map((r: any) => (
                  <div key={r.id} onClick={() => navigate('/reels')} className="cursor-pointer group">
                    <div className="aspect-[9/16] rounded-xl overflow-hidden relative"
                      style={{ background: 'var(--bg-tertiary)' }}>
                      {r.thumbnail_url
                        ? <img src={r.thumbnail_url} alt={r.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        : <div className="w-full h-full flex items-center justify-center">
                            <Play size={20} style={{ color: 'var(--text-tertiary)' }} />
                          </div>
                      }
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(0,0,0,0.35)' }}>
                        <Play size={22} color="#fff" fill="#fff" />
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {r.title || r.creator?.display_name || r.creator?.username || ''}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
