import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { encodeId } from '../utils/slugId';
import { Play, Star, Crown, Search, Lock, X } from 'lucide-react';
import type { Content, PaginatedResponse } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useApi, usePaginatedApi } from '../hooks/useApi';
import { Spinner, PageLoader } from '../components/ui/Spinner';

type SortKey = 'recent' | 'rating' | 'year' | 'views';
type FilterKey = 'all' | 'free' | 'premium';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Les plus récents' },
  { key: 'rating', label: 'Les mieux notés' },
  { key: 'views',  label: 'Les plus vus' },
  { key: 'year',   label: 'Par année' },
];

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'all',     label: 'Tout' },
  { key: 'free',    label: 'Gratuit' },
  { key: 'premium', label: 'Premium' },
];

const GENRES = [
  'Action', 'Comédie', 'Drame', 'Romance', 'Thriller', 'Horreur',
  'Science-Fiction', 'Animation', 'Aventure', 'Documentaire', 'Policier', 'Fantastique',
];

// Track IDs of individually-purchased content
let _accessCache: Set<string> | null = null;
async function loadAccessCache(): Promise<Set<string>> {
  if (_accessCache) return _accessCache;
  try {
    const r = await apiClient.get<any>(Endpoints.content.myAccesses);
    const items: Array<{ content_id?: string; id?: string }> =
      Array.isArray(r.data) ? r.data : r.data?.items ?? r.data?.data ?? [];
    _accessCache = new Set(items.map(i => i.content_id ?? i.id ?? '').filter(Boolean));
  } catch {
    _accessCache = new Set();
  }
  return _accessCache;
}

function useOpenContent() {
  const navigate = useNavigate();
  return (item: Content) =>
    navigate(`/${item.type === 'film' ? 'films' : 'series'}/${encodeId(item.id)}`, { state: { item } });
}

function ContentCard({ item, hasPurchased, hasActiveSub }: {
  item: Content; hasPurchased: boolean; hasActiveSub: boolean;
}) {
  const open = useOpenContent();
  const isPremium = !!item.is_premium;
  const isLocked = isPremium && !hasPurchased && !hasActiveSub;

  return (
    <button type="button" onClick={() => open(item)} className="group text-left w-full">
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-tertiary)' }}>
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt={item.title} loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
            <Play size={28} />
          </div>
        )}

        {/* Un seul badge, uniquement quand c'est utile */}
        {isLocked && (
          <span className="absolute top-2 left-2 flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full text-white"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
            <Crown size={11} style={{ color: '#F59E0B' }} /> Premium
          </span>
        )}

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: 'rgba(0,0,0,0.4)' }}>
          <span className="w-12 h-12 rounded-full flex items-center justify-center text-white"
            style={{ background: isLocked ? 'var(--primary)' : 'rgba(255,255,255,0.25)', backdropFilter: 'blur(6px)' }}>
            {isLocked ? <Lock size={18} /> : <Play size={18} fill="white" />}
          </span>
        </div>
      </div>

      <div className="mt-2.5 px-0.5">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
        <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
          {item.year > 0 && <span>{item.year}</span>}
          {item.average_rating ? (
            <span className="flex items-center gap-0.5">
              {item.year > 0 && <span>·</span>}
              <Star size={11} className="text-yellow-400" fill="currentColor" /> {item.average_rating.toFixed(1)}
            </span>
          ) : null}
        </p>
      </div>
    </button>
  );
}

// ── Mise en avant : un seul titre, grand et clair ────────────────────────────
function Featured({ item, hasPurchased, hasActiveSub }: {
  item: Content; hasPurchased: boolean; hasActiveSub: boolean;
}) {
  const open = useOpenContent();
  const isLocked = !!item.is_premium && !hasPurchased && !hasActiveSub;
  const img = item.banner_url ?? item.thumbnail_url;

  return (
    <section className="relative overflow-hidden rounded-3xl"
      style={{ background: 'linear-gradient(135deg,#1a1033,#2d1b69)', minHeight: 260 }}>
      {img && <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.15) 100%)' }} />

      <div className="relative flex flex-col justify-end p-5 sm:p-8 h-full" style={{ minHeight: 260 }}>
        <span className="text-[11px] font-bold uppercase tracking-widest text-white/70 mb-2">À l'affiche</span>
        <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight max-w-xl">{item.title}</h2>
        {item.short_synopsis && (
          <p className="text-sm sm:text-base text-white/80 mt-2 max-w-xl line-clamp-2">{item.short_synopsis}</p>
        )}
        <div className="flex items-center gap-3 mt-4">
          <button onClick={() => open(item)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white"
            style={{ background: 'var(--primary)' }}>
            {isLocked ? <Lock size={16} /> : <Play size={16} fill="white" />}
            {isLocked ? 'Débloquer' : 'Regarder'}
          </button>
          {item.average_rating ? (
            <span className="flex items-center gap-1 text-sm font-semibold text-white/90">
              <Star size={14} className="text-yellow-400" fill="currentColor" /> {item.average_rating.toFixed(1)}
            </span>
          ) : null}
          {item.year > 0 && <span className="text-sm text-white/70">{item.year}</span>}
        </div>
      </div>
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors"
      style={{
        background: active ? 'var(--primary)' : 'var(--bg-secondary)',
        color:      active ? '#fff' : 'var(--text-secondary)',
        border:     `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
      }}>
      {children}
    </button>
  );
}

interface Props { type?: 'film' | 'serie'; }

export default function FilmsPage({ type = 'film' }: Props) {
  const [search, setSearch] = useState('');
  const [sort, setSort]     = useState<SortKey>('recent');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [genre, setGenre]   = useState('');
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [hasActiveSub, setHasActiveSub] = useState(false);

  const endpoint = type === 'film' ? Endpoints.content.films : Endpoints.content.series;

  const buildUrl = (p: number) => {
    const params = new URLSearchParams({ page: String(p), limit: '24', status: 'published', sort });
    if (filter === 'free')    params.set('is_premium', 'false');
    if (filter === 'premium') params.set('is_premium', 'true');
    if (genre) params.set('genre', genre);
    return `${endpoint}?${params.toString()}`;
  };

  const { items, loading, loadMore, page, pages, sentinelRef } = usePaginatedApi<Content>(
    (p) => apiClient.get<PaginatedResponse<Content>>(buildUrl(p)),
    [type, sort, filter, genre],
  );

  // Titre mis en avant : le mieux noté, indépendant des filtres de la grille
  const { data: featuredList } = useApi<Content[]>(
    () => apiClient.get<any>(`${endpoint}?page=1&limit=6&status=published&sort=rating`).then(r => {
      const raw = r.data;
      return { data: Array.isArray(raw) ? raw : raw?.items ?? raw?.results ?? raw?.data ?? [] };
    }),
    [type],
  );
  const featured = (featuredList ?? []).find(i => i.banner_url) ?? featuredList?.[0];

  useEffect(() => {
    apiClient.get<any>(Endpoints.subscriptions.me)
      .then(r => {
        const sub = r.data?.data ?? r.data;
        if (sub?.status === 'active') setHasActiveSub(true);
      })
      .catch(() => {});
    loadAccessCache().then(ids => setPurchasedIds(ids));
  }, []);

  const label = type === 'film' ? 'Films' : 'Séries';
  const query = search.trim().toLowerCase();
  const filtered = query ? items.filter(i => i.title.toLowerCase().includes(query)) : items;
  const hasFilters = filter !== 'all' || !!genre;
  const showFeatured = !!featured && !query && !hasFilters;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">

      {/* En-tête : titre + recherche */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <h1 className="flex-1 text-2xl sm:text-3xl font-black" style={{ color: 'var(--text-primary)' }}>{label}</h1>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Rechercher un ${type === 'film' ? 'film' : 'série'}…`}
            className="w-full pl-10 pr-9 py-2.5 text-sm rounded-full focus:outline-none"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            onFocus={e => { e.target.style.borderColor = 'var(--primary)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Effacer"
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {showFeatured && <Featured item={featured!} hasPurchased={purchasedIds.has(featured!.id)} hasActiveSub={hasActiveSub} />}

      {/* Filtres : une seule ligne de pastilles défilante */}
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'none' }}>
          {FILTER_OPTIONS.map(o => (
            <Chip key={o.key} active={filter === o.key} onClick={() => setFilter(o.key)}>{o.label}</Chip>
          ))}
          <span className="shrink-0 w-px my-1" style={{ background: 'var(--border)' }} />
          <Chip active={genre === ''} onClick={() => setGenre('')}>Tous les genres</Chip>
          {GENRES.map(g => (
            <Chip key={g} active={genre === g} onClick={() => setGenre(genre === g ? '' : g)}>{g}</Chip>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {filtered.length} titre{filtered.length > 1 ? 's' : ''}
          </p>
          <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
            className="text-sm px-3 py-1.5 rounded-full focus:outline-none"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Grille */}
      {loading && items.length === 0 ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--bg-secondary)' }}>
            <Search size={26} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Rien trouvé</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Essayez un autre mot ou retirez un filtre.
          </p>
          {(hasFilters || search) && (
            <button onClick={() => { setSearch(''); setFilter('all'); setGenre(''); }}
              className="mt-4 px-5 py-2 rounded-full text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>
              Tout afficher
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
            {filtered.map(item => (
              <ContentCard key={item.id} item={item}
                hasPurchased={purchasedIds.has(item.id)} hasActiveSub={hasActiveSub} />
            ))}
          </div>
          {page < pages && (
            <div ref={sentinelRef} className="flex justify-center pt-2">
              <button onClick={loadMore} disabled={loading} className="btn-secondary px-10">
                {loading ? <Spinner size="sm" className="mx-auto" /> : 'Voir plus'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
