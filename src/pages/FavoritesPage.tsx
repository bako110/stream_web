import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Music, Play, FileText, Users, Bookmark, BookmarkCheck,
} from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { encodeId } from '../utils/slugId';
import { MediaPlaceholder } from '../components/ui/MediaPlaceholder';

type FavTab = 'event' | 'concert' | 'reel' | 'post' | 'community';

// Correspond a FavoriteOut (app/routers/favorites.py) — un favori est un
// SNAPSHOT (target_title/target_subtitle/target_thumbnail), pas une jointure
// vers l'objet reel. target_id est l'id du contenu cible (post/event/...),
// item.id est l'id de la ligne UserFavorite elle-meme (jamais utilise pour
// naviguer/supprimer, seulement comme key React).
interface FavItem {
  id:               string;
  target_type?:     string;
  target_id?:       string;
  target_title?:    string | null;
  target_subtitle?: string | null;
  target_thumbnail?: string | null;
  [key: string]:    unknown;
}

const TAB_CONFIG: {
  id: FavTab;
  label: string;
  icon: React.ReactNode;
  pill: string;
  color: string;
  emptyIcon: React.ReactNode;
  emptyText: string;
  navPath: (item: FavItem) => string;
}[] = [
  {
    id: 'event',
    label: 'Événements',
    icon: <Calendar size={14} />,
    pill: 'Événement',
    color: '#7B3FF2',
    emptyIcon: <Calendar size={36} strokeWidth={1.2} />,
    emptyText: 'Aucun événement en favori',
    navPath: (item) => `/events/${encodeId(item.target_id ?? item.id)}`,
  },
  {
    id: 'concert',
    label: 'Concerts',
    icon: <Music size={14} />,
    pill: 'Concert',
    color: '#EC4899',
    emptyIcon: <Music size={36} strokeWidth={1.2} />,
    emptyText: 'Aucun concert en favori',
    navPath: (item) => `/concerts/${encodeId(item.target_id ?? item.id)}`,
  },
  {
    id: 'reel',
    label: 'Reels',
    icon: <Play size={14} />,
    pill: 'Reel',
    color: '#F59E0B',
    emptyIcon: <Play size={36} strokeWidth={1.2} />,
    emptyText: 'Aucun reel en favori',
    navPath: () => `/reels`,
  },
  {
    id: 'post',
    label: 'Posts',
    icon: <FileText size={14} />,
    pill: 'Post',
    color: '#10B981',
    emptyIcon: <FileText size={36} strokeWidth={1.2} />,
    emptyText: 'Aucun post en favori',
    navPath: (item) => `/posts/${encodeId(item.target_id ?? item.id)}`,
  },
  {
    id: 'community',
    label: 'Communautés',
    icon: <Users size={14} />,
    pill: 'Communauté',
    color: '#3B82F6',
    emptyIcon: <Users size={36} strokeWidth={1.2} />,
    emptyText: 'Aucune communauté en favori',
    navPath: (item) => `/communities/${encodeId(item.target_id ?? item.id)}`,
  },
];

function getDisplayTitle(item: FavItem, type: FavTab): string {
  return item.target_title ?? (type === 'reel' ? 'Reel' : type === 'post' ? 'Post' : '');
}

function getDisplaySubtitle(item: FavItem): string {
  return item.target_subtitle ?? '';
}

function getThumb(item: FavItem): string | null | undefined {
  return item.target_thumbnail;
}

// ── Favorite card ─────────────────────────────────────────────────────────────
function FavCard({
  item,
  config,
  onRemove,
  removing,
}: {
  item:     FavItem;
  config:   typeof TAB_CONFIG[0];
  onRemove: (item: FavItem) => void;
  removing: boolean;
}) {
  const navigate  = useNavigate();
  const thumb     = getThumb(item);
  const title     = getDisplayTitle(item, config.id);
  const subtitle  = getDisplaySubtitle(item);

  return (
    <div
      className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      onClick={() => navigate(config.navPath(item))}
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '16/10' }}>
        {thumb
          ? <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          : <div className="absolute inset-0"><MediaPlaceholder title={title} icon={<span style={{ color: '#fff' }}>{config.icon}</span>} /></div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        {/* Type pill */}
        <span
          className="absolute top-2.5 left-2.5 text-[10px] font-black px-2.5 py-1 rounded-full text-white"
          style={{ background: config.color }}
        >
          {config.pill}
        </span>

        {/* Remove button */}
        <button
          disabled={removing}
          onClick={e => { e.stopPropagation(); onRemove(item); }}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg backdrop-blur-sm transition-all"
          style={{ background: 'rgba(0,0,0,0.45)', color: '#fff' }}
          title="Retirer des favoris"
          onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(239,68,68,0.85)')}
          onMouseLeave={ev => (ev.currentTarget.style.background = 'rgba(0,0,0,0.45)')}
        >
          {removing
            ? <span className="block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : <BookmarkCheck size={15} />
          }
        </button>
      </div>

      {/* Info */}
      <div className="p-3.5 space-y-1">
        <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
          {title || '—'}
        </p>
        {subtitle && (
          <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function FavSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div style={{ aspectRatio: '16/10', background: 'var(--bg-secondary)' }} />
          <div className="p-3.5 space-y-2">
            <div className="h-3.5 rounded-full w-3/4" style={{ background: 'var(--bg-secondary)' }} />
            <div className="h-3 rounded-full w-1/2" style={{ background: 'var(--bg-secondary)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function FavoritesPage() {
  const [tab,       setTab]       = useState<FavTab>('event');
  const [items,     setItems]     = useState<Record<FavTab, FavItem[]>>({
    event: [], concert: [], reel: [], post: [], community: [],
  });
  const [loading,   setLoading]   = useState<Record<FavTab, boolean>>({
    event: false, concert: false, reel: false, post: false, community: false,
  });
  const [removing,  setRemoving]  = useState<string | null>(null);
  // Anti-race : un changement rapide d'onglet ne doit pas laisser une reponse
  // en retard ecraser un onglet different de celui qui a initie l'appel.
  const fetchRunRef = useRef<Record<FavTab, number>>({
    event: 0, concert: 0, reel: 0, post: 0, community: 0,
  });

  // Pas de cache "loaded" permanent : on recharge a chaque fois qu'on revient
  // sur cette page (montage du composant) et a chaque changement d'onglet,
  // sinon un favori ajoute ailleurs pendant la session n'apparaissait jamais
  // ici sans un vrai F5 (bug signale : "j'ajoute, je reviens, introuvable").
  const fetchTab = useCallback(async (t: FavTab) => {
    const runId = ++fetchRunRef.current[t];
    setLoading(prev => ({ ...prev, [t]: true }));
    try {
      const res = await apiClient.get<unknown>(Endpoints.favorites.list(t));
      if (runId !== fetchRunRef.current[t]) return; // reponse obsolete
      const raw = res.data as any;
      const list: FavItem[] = Array.isArray(raw) ? raw
        : Array.isArray(raw?.items) ? raw.items
        : Array.isArray(raw?.data)  ? raw.data
        : [];
      setItems(prev => ({ ...prev, [t]: list }));
    } catch {
      if (runId !== fetchRunRef.current[t]) return;
      setItems(prev => ({ ...prev, [t]: [] }));
    } finally {
      if (runId === fetchRunRef.current[t]) {
        setLoading(prev => ({ ...prev, [t]: false }));
      }
    }
  }, []);

  useEffect(() => { fetchTab(tab); }, [tab, fetchTab]);

  async function handleRemove(item: FavItem) {
    setRemoving(item.id);
    try {
      await apiClient.delete(Endpoints.favorites.remove(item.target_type ?? tab, item.target_id ?? item.id));
      setItems(prev => ({
        ...prev,
        [tab]: prev[tab].filter(i => i.id !== item.id),
      }));
    } catch {
      /* ignore */
    } finally {
      setRemoving(null);
    }
  }

  const config      = TAB_CONFIG.find(t => t.id === tab)!;
  const currentList = items[tab];
  const isLoading   = loading[tab];

  return (
    <div className="w-full mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(123,63,242,0.12)' }}>
          <Bookmark size={18} style={{ color: 'var(--primary)' }} />
        </div>
        <div>
          <h1 className="text-xl font-black leading-tight" style={{ color: 'var(--text-primary)' }}>Favoris</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Retrouve tout ce que tu as sauvegardé</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {TAB_CONFIG.map(t => {
          const active = tab === t.id;
          const count  = items[t.id].length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all"
              style={{
                background: active ? t.color : 'var(--surface)',
                color:      active ? '#fff' : 'var(--text-secondary)',
                border:     `1px solid ${active ? t.color : 'var(--border)'}`,
              }}
            >
              {t.icon}
              {t.label}
              {count > 0 && (
                <span
                  className="text-[10px] font-black px-1.5 rounded-full"
                  style={{
                    background: active ? 'rgba(255,255,255,0.25)' : 'var(--bg-secondary)',
                    color:      active ? '#fff' : 'var(--text-tertiary)',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <FavSkeleton />
      ) : currentList.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24" style={{ color: 'var(--text-tertiary)' }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: config.color + '14', color: config.color }}>
            {config.emptyIcon}
          </div>
          <p className="text-sm font-semibold">{config.emptyText}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {currentList.map(item => (
            <FavCard
              key={item.id}
              item={item}
              config={config}
              onRemove={handleRemove}
              removing={removing === item.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
