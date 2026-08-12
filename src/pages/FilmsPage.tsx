import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { encodeId } from '../utils/slugId';
import { Play, Star, Crown, Search, Check, Lock, Flame, Sparkles, Gift } from 'lucide-react';
import type { Content, PaginatedResponse } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useApi, usePaginatedApi } from '../hooks/useApi';
import { Spinner , PageLoader} from '../components/ui/Spinner';

type SortKey = 'recent' | 'rating' | 'year' | 'views';
type FilterKey = 'all' | 'free' | 'premium';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent',  label: 'Récents'   },
  { key: 'rating',  label: 'Note'      },
  { key: 'year',    label: 'Année'     },
  { key: 'views',   label: 'Vues'      },
];

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'all',     label: 'Tout'     },
  { key: 'free',    label: 'Gratuit'  },
  { key: 'premium', label: 'Premium'  },
];

const GENRES = [
  'Action', 'Aventure', 'Animation', 'Comédie', 'Documentaire',
  'Drame', 'Fantastique', 'Horreur', 'Musical', 'Romance',
  'Science-Fiction', 'Thriller', 'Western', 'Policier', 'Historique',
];

const COUNTRIES = [
  'Sénégal', 'Côte d\'Ivoire', 'Mali', 'Cameroun', 'Nigeria',
  'Ghana', 'Maroc', 'Algérie', 'Tunisie', 'Égypte',
  'Afrique du Sud', 'Kenya', 'France', 'États-Unis', 'Royaume-Uni',
  'Inde', 'Brésil', 'Mexique', 'Chine', 'Japon', 'Corée du Sud',
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

function ContentCard({
  item,
  hasPurchased,
  hasActiveSub,
}: { item: Content; hasPurchased: boolean; hasActiveSub: boolean }) {
  const navigate = useNavigate();
  const isLocked  = !!item.is_premium && !hasPurchased && !hasActiveSub;
  const showAccess = !!item.is_premium && hasPurchased;
  const showSub    = !!item.is_premium && !hasPurchased && hasActiveSub;

  return (
    <div className="cursor-pointer group"
      onClick={() => navigate(`/${item.type === 'film' ? 'films' : 'series'}/${encodeId(item.id)}`, { state: { item } })}>
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-tertiary)' }}>
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
            <Play size={28} />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
          style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div style={{
            background: isLocked ? 'rgba(123,63,242,0.9)' : 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(8px)',
            borderRadius: '50%',
            padding: '0.75rem',
            border: '2px solid rgba(255,255,255,0.4)',
          }}>
            {isLocked
              ? <Lock size={20} className="text-white" />
              : <Play size={20} className="text-white" fill="white" />
            }
          </div>
        </div>

        {/* Access badge top-left */}
        {item.is_premium && (
          <div className="absolute top-2 left-2">
            {showAccess ? (
              <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                style={{ background: 'rgba(34,197,94,0.85)', backdropFilter: 'blur(4px)' }}>
                <Check size={9} /> Accès
              </div>
            ) : showSub ? (
              <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                style={{ background: 'rgba(123,63,242,0.85)', backdropFilter: 'blur(4px)' }}>
                <Crown size={9} /> Abonné
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
                <Crown size={9} /> {item.price ? `${item.price.toFixed(0)} €` : 'Premium'}
              </div>
            )}
          </div>
        )}

        {/* Rating bottom-right */}
        {item.average_rating && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-white"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
            <Star size={10} className="text-yellow-400" fill="currentColor" />
            {item.average_rating.toFixed(1)}
          </div>
        )}
      </div>

      <div className="mt-2.5 space-y-0.5 px-0.5">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {item.year > 0 && <span>{item.year}</span>}
          {item.language && <><span>·</span><span className="uppercase">{item.language}</span></>}
        </div>
      </div>
    </div>
  );
}

// ── Hero Premium — bandeau qui défile horizontalement en continu (marquee) ────
function PremiumHero({ items, type }: { items: Content[]; type: 'film' | 'serie' }) {
  const navigate = useNavigate();

  if (items.length === 0) return null;

  // Dupliqué pour un enchaînement sans coupure visible en boucle infinie
  const loopItems = [...items, ...items];
  // Durée proportionnelle au nombre d'items pour garder une vitesse constante
  const duration = Math.max(items.length * 9, 24);

  function renderCard(item: Content, key: string) {
    return (
      <button key={key}
        onClick={() => navigate(`/${item.type === 'film' ? 'films' : 'series'}/${encodeId(item.id)}`, { state: { item } })}
        className="group relative shrink-0 overflow-hidden text-left"
        style={{
          width: 'min(80vw, 480px)',
          aspectRatio: '16/8',
          borderRadius: 20,
          background: 'var(--bg-tertiary)',
        }}>
        <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-110">
          {(item.banner_url ?? item.thumbnail_url) ? (
            <img src={item.banner_url ?? item.thumbnail_url ?? ''} alt={item.title}
              className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1a0a0a,#2d0a14)' }}>
              <Play size={32} className="text-white/30" />
            </div>
          )}
        </div>
        <div className="absolute inset-0 transition-all duration-300 group-hover:ring-2"
          style={{ borderRadius: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' } as any} />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ boxShadow: 'inset 0 0 0 2px #F59E0B, 0 8px 32px rgba(245,158,11,0.35)', borderRadius: 20 }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.25) 55%, transparent 100%)' }} />

        <div className="absolute top-3 left-3 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full text-white"
          style={{ background: 'linear-gradient(135deg,#F59E0B,#F97316)', boxShadow: '0 2px 10px rgba(245,158,11,0.5)' }}>
          <Crown size={11} /> {item.price ? `${item.price.toFixed(0)} €` : 'Premium'}
        </div>

        {item.average_rating && (
          <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full text-white"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
            <Star size={11} className="text-yellow-400" fill="currentColor" /> {item.average_rating.toFixed(1)}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
          <p className="text-white font-black text-lg sm:text-2xl leading-tight truncate" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
            {item.title}
          </p>
          {item.short_synopsis && (
            <p className="text-white/75 text-xs sm:text-sm mt-1 line-clamp-1 max-w-md">{item.short_synopsis}</p>
          )}
          <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex items-center gap-1.5 text-white text-xs sm:text-sm font-bold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}>
              <Play size={13} fill="white" /> Regarder
            </div>
            {item.year > 0 && <span className="text-white/60 text-xs">{item.year}</span>}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="relative -mx-6 px-6 sm:mx-0 sm:px-0">
      <h2 className="text-lg sm:text-xl font-black flex items-center gap-2 mb-3" style={{ color: 'var(--text-primary)' }}>
        <Crown size={18} style={{ color: '#F59E0B' }} />
        {type === 'film' ? 'Films Premium' : 'Séries Premium'}
      </h2>

      {/* Fenêtre masquant le défilement, fondu sur les bords.
          overflow-x-auto permet de swiper au doigt sur mobile — sans ça le
          carrousel ne défilait qu'automatiquement, aucune interaction tactile
          possible pour parcourir les items manuellement. */}
      <div className="relative overflow-x-auto"
        style={{
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%)',
          scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}>
        <div className="flex gap-4"
          style={{ animation: `filmsMarquee ${duration}s linear infinite`, willChange: 'transform' }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.animationPlayState = 'paused'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.animationPlayState = 'running'; }}
          onTouchStart={e => { (e.currentTarget as HTMLDivElement).style.animationPlayState = 'paused'; }}>
          {loopItems.map((item, i) => renderCard(item, `${item.id}-${i}`))}
        </div>
      </div>

      <style>{`
        @keyframes filmsMarquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

// ── Rangée thématique — carrousel horizontal compact ──────────────────────────
let _rowAnimCounter = 0;

function ContentRow({
  title, icon, items, purchasedIds, hasActiveSub, reverse = false,
}: {
  title: string; icon: React.ReactNode; items: Content[];
  purchasedIds: Set<string>; hasActiveSub: boolean; reverse?: boolean;
}) {
  if (items.length === 0) return null;

  // Nom d'animation unique par instance — plusieurs rangées tournent en parallèle,
  // chacune doit avoir son propre keyframe pour ne pas se marcher dessus.
  const animName = useRef(`filmsRowMarquee${_rowAnimCounter++}`).current;
  const loopItems = [...items, ...items];
  const duration = Math.max(items.length * 4, 16);

  return (
    <div>
      <h2 className="text-base sm:text-lg font-black flex items-center gap-2 mb-3" style={{ color: 'var(--text-primary)' }}>
        {icon} {title}
      </h2>
      <div className="relative overflow-x-auto"
        style={{
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 3%, black 97%, transparent 100%)',
          scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}>
        <div className="flex gap-3 sm:gap-4"
          style={{ animation: `${animName} ${duration}s linear infinite`, animationDirection: reverse ? 'reverse' : 'normal', willChange: 'transform' }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.animationPlayState = 'paused'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.animationPlayState = 'running'; }}
          onTouchStart={e => { (e.currentTarget as HTMLDivElement).style.animationPlayState = 'paused'; }}>
          {loopItems.map((item, i) => (
            <div key={`${item.id}-${i}`} className="shrink-0 transition-transform duration-300 hover:scale-105" style={{ width: 140 }}>
              <ContentCard item={item} hasPurchased={purchasedIds.has(item.id)} hasActiveSub={hasActiveSub} />
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes ${animName} {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

interface Props { type?: 'film' | 'serie'; }

export default function FilmsPage({ type = 'film' }: Props) {
  const [search,      setSearch]      = useState('');
  const [sort,        setSort]        = useState<SortKey>('recent');
  const [filter,      setFilter]      = useState<FilterKey>('all');
  const [genre,       setGenre]       = useState('');
  const [country,     setCountry]     = useState('');
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [hasActiveSub, setHasActiveSub] = useState(false);

  const endpoint = type === 'film' ? Endpoints.content.films : Endpoints.content.series;

  const buildUrl = (p: number) => {
    const params = new URLSearchParams({
      page: String(p),
      limit: '24',
      status: 'published',
      sort,
    });
    if (filter === 'free')    params.set('is_premium', 'false');
    if (filter === 'premium') params.set('is_premium', 'true');
    if (genre)   params.set('genre',   genre);
    if (country) params.set('country', country);
    return `${endpoint}?${params.toString()}`;
  };

  const { items, loading, loadMore, page, pages } = usePaginatedApi<Content>(
    (p) => apiClient.get<PaginatedResponse<Content>>(buildUrl(p)),
    [type, sort, filter, genre, country],
  );

  // Rangées thématiques — chargées indépendamment de la grille filtrable ci-dessous
  const rowUrl = (params: Record<string, string>) => {
    const p = new URLSearchParams({ page: '1', limit: '12', status: 'published', ...params });
    return `${endpoint}?${p.toString()}`;
  };
  const extractList = (raw: any): Content[] =>
    Array.isArray(raw) ? raw : raw?.items ?? raw?.results ?? raw?.data ?? [];

  const { data: premiumItems } = useApi<Content[]>(
    () => apiClient.get<any>(rowUrl({ is_premium: 'true', sort: 'rating' })).then(r => ({ data: extractList(r.data) })),
    [type],
  );
  const { data: topRatedItems } = useApi<Content[]>(
    () => apiClient.get<any>(rowUrl({ sort: 'rating' })).then(r => ({ data: extractList(r.data) })),
    [type],
  );
  const { data: trendingItems } = useApi<Content[]>(
    () => apiClient.get<any>(rowUrl({ sort: 'views' })).then(r => ({ data: extractList(r.data) })),
    [type],
  );
  const { data: recentItems } = useApi<Content[]>(
    () => apiClient.get<any>(rowUrl({ sort: 'recent' })).then(r => ({ data: extractList(r.data) })),
    [type],
  );
  const { data: freeItems } = useApi<Content[]>(
    () => apiClient.get<any>(rowUrl({ is_premium: 'false', sort: 'rating' })).then(r => ({ data: extractList(r.data) })),
    [type],
  );

  // Load subscription status and purchased content once
  useEffect(() => {
    apiClient.get<any>(Endpoints.subscriptions.me)
      .then(r => {
        const sub = r.data?.data ?? r.data;
        if (sub?.status === 'active') setHasActiveSub(true);
      })
      .catch(() => {});

    loadAccessCache().then(ids => setPurchasedIds(ids));
  }, []);

  const label    = type === 'film' ? 'Films' : 'Séries';
  const filtered = search.trim()
    ? items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="p-6 space-y-5">

      {/* Header + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{label}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {items.length} titre{items.length > 1 ? 's' : ''} disponible{items.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Rechercher un ${type === 'film' ? 'film' : 'série'}…`}
            className="pl-8 pr-4 py-2 text-sm rounded-xl focus:outline-none"
            style={{
              background: 'var(--bg-secondary)',
              border:     '1px solid var(--border)',
              color:      'var(--text-primary)',
              width:      '220px',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(123,63,242,0.12)'; }}
            onBlur={e  => { e.target.style.borderColor = 'var(--border)';  e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </div>

      {/* Hero Premium — défilement horizontal automatique */}
      <PremiumHero items={premiumItems ?? []} type={type} />

      {/* Rangées thématiques */}
      <div className="space-y-6">
        <ContentRow
          title="Les mieux notés"
          icon={<Star size={16} style={{ color: '#F59E0B' }} fill="#F59E0B" />}
          items={topRatedItems ?? []}
          purchasedIds={purchasedIds} hasActiveSub={hasActiveSub}
        />
        <ContentRow
          title="Tendances du moment"
          icon={<Flame size={16} style={{ color: '#EF4444' }} />}
          items={trendingItems ?? []}
          purchasedIds={purchasedIds} hasActiveSub={hasActiveSub}
          reverse
        />
        <ContentRow
          title="Nouveautés"
          icon={<Sparkles size={16} style={{ color: '#7B3FF2' }} />}
          items={recentItems ?? []}
          purchasedIds={purchasedIds} hasActiveSub={hasActiveSub}
        />
        <ContentRow
          title="Gratuits à découvrir"
          icon={<Gift size={16} style={{ color: '#10B981' }} />}
          items={freeItems ?? []}
          purchasedIds={purchasedIds} hasActiveSub={hasActiveSub}
          reverse
        />
      </div>

      {/* Catalogue complet */}
      <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-lg font-black pt-4" style={{ color: 'var(--text-primary)' }}>
          Tout le catalogue
        </h2>
      </div>

      {/* Filter + sort bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          {FILTER_OPTIONS.map(opt => (
            <button key={opt.key} onClick={() => setFilter(opt.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: filter === opt.key ? 'var(--primary)' : 'transparent',
                color:      filter === opt.key ? 'white'          : 'var(--text-secondary)',
              }}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Genre */}
        <select
          value={genre}
          onChange={e => setGenre(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-xl focus:outline-none"
          style={{
            background: genre ? 'rgba(123,63,242,0.1)' : 'var(--bg-secondary)',
            border: `1px solid ${genre ? 'var(--primary)' : 'var(--border)'}`,
            color: genre ? 'var(--primary)' : 'var(--text-secondary)',
          }}
        >
          <option value="">Genre</option>
          {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>

        {/* Pays */}
        <select
          value={country}
          onChange={e => setCountry(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-xl focus:outline-none"
          style={{
            background: country ? 'rgba(123,63,242,0.1)' : 'var(--bg-secondary)',
            border: `1px solid ${country ? 'var(--primary)' : 'var(--border)'}`,
            color: country ? 'var(--primary)' : 'var(--text-secondary)',
          }}
        >
          <option value="">Pays</option>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Sort */}
        <div className="flex gap-1 ml-auto">
          {SORT_OPTIONS.map(opt => (
            <button key={opt.key} onClick={() => setSort(opt.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
              style={{
                borderColor: sort === opt.key ? 'var(--primary)' : 'var(--border)',
                background:  sort === opt.key ? 'rgba(123,63,242,0.1)' : 'transparent',
                color:       sort === opt.key ? 'var(--primary)' : 'var(--text-secondary)',
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading && items.length === 0 ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--bg-secondary)' }}>
            <Play size={28} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Aucun résultat</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Essayez un autre terme de recherche.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-5">
            {filtered.map(item => (
              <ContentCard
                key={item.id}
                item={item}
                hasPurchased={purchasedIds.has(item.id)}
                hasActiveSub={hasActiveSub}
              />
            ))}
          </div>
          {page < pages && (
            <div className="flex justify-center pt-4">
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
