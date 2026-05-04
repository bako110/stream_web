import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, TrendingUp, Film, Music, Calendar, User } from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';

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
  const [results, setResults]   = useState<SearchResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [trending, setTrending] = useState<{ id: string; title: string; thumbnail_url?: string | null }[]>([]);

  useEffect(() => {
    apiClient.get<unknown>(Endpoints.search.trending)
      .then(r => {
        const raw = r.data as any;
        const list = Array.isArray(raw) ? raw
          : Array.isArray(raw?.items) ? raw.items
          : Array.isArray(raw?.data)  ? raw.data
          : [];
        setTrending(list);
      })
      .catch(() => {});
  }, []);

  const doSearch = useCallback((term: string) => {
    if (!term.trim()) { setResults(null); setLoading(false); return; }
    setLoading(true);
    apiClient.get<SearchResult>(`${Endpoints.search.query}?q=${encodeURIComponent(term.trim())}&limit=15`)
      .then(r => { setResults(r.data); })
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, []);

  // React to URL param changes (set by Topbar debounce)
  useEffect(() => {
    doSearch(q);
  }, [q]); // eslint-disable-line

  const total = results
    ? (results.users?.length ?? 0)
    + (results.films?.length ?? 0)
    + (results.series?.length ?? 0)
    + (results.concerts?.length ?? 0)
    + (results.events?.length ?? 0)
    + (results.reels?.length ?? 0)
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-12">
          <Spinner />
          <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Recherche…</span>
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
          {total === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--bg-secondary)' }}>
                <Search size={26} style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Aucun résultat</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Aucun résultat pour « {q} »
              </p>
            </div>
          )}

          {/* Utilisateurs */}
          {(results.users?.length ?? 0) > 0 && (
            <section>
              <SectionHeader icon={<User size={14} />} title="Utilisateurs" count={results.users!.length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {results.users!.map((u: any) => (
                  <button key={u.id} onClick={() => navigate(`/user/${u.id}`)}
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

          {/* Films */}
          {(results.films?.length ?? 0) > 0 && (
            <section>
              <SectionHeader icon={<Film size={14} />} title="Films" count={results.films!.length} />
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-3">
                {results.films!.map((c: any) => (
                  <div key={c.id} onClick={() => navigate(`/films/${c.id}`)} className="cursor-pointer group">
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
                  <div key={c.id} onClick={() => navigate(`/series/${c.id}`, { state: { item: c } })} className="cursor-pointer group">
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
                  <button key={c.id} onClick={() => navigate(`/concerts/${c.id}`)}
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
                        style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)' }}>LIVE</span>
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
                  <button key={ev.id} onClick={() => navigate(`/events/${ev.id}`)}
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
        </div>
      )}
    </div>
  );
}
