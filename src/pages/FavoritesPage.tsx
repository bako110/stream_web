import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Music, Play, FileText, Users, Bookmark, BookmarkCheck,
} from 'lucide-react';
import { apiClient } from '../api';
import { Spinner , PageLoader} from '../components/ui/Spinner';

type FavTab = 'event' | 'concert' | 'reel' | 'post' | 'community';

interface FavItem {
  id:            string;
  item_id?:      string;
  item_type?:    string;
  title?:        string;
  caption?:      string;
  body?:         string;
  name?:         string;
  description?:  string;
  subtitle?:     string;
  thumbnail_url?: string | null;
  banner_url?:    string | null;
  image_url?:     string | null;
  cover_url?:     string | null;
  [key: string]:  unknown;
}

const TAB_CONFIG: {
  id: FavTab;
  label: string;
  icon: React.ReactNode;
  pill: string;
  pillColor: string;
  emptyIcon: React.ReactNode;
  emptyText: string;
  navPath: (item: FavItem) => string;
}[] = [
  {
    id: 'event',
    label: 'Evenements',
    icon: <Calendar size={14} />,
    pill: 'Evenement',
    pillColor: '#7B3FF2',
    emptyIcon: <Calendar size={32} strokeWidth={1.2} />,
    emptyText: 'Aucun evenement en favori',
    navPath: (item) => `/events/${item.item_id ?? item.id}`,
  },
  {
    id: 'concert',
    label: 'Concerts',
    icon: <Music size={14} />,
    pill: 'Concert',
    pillColor: '#7B3FF2',
    emptyIcon: <Music size={32} strokeWidth={1.2} />,
    emptyText: 'Aucun concert en favori',
    navPath: (item) => `/concerts/${item.item_id ?? item.id}`,
  },
  {
    id: 'reel',
    label: 'Reels',
    icon: <Play size={14} />,
    pill: 'Reel',
    pillColor: '#7B3FF2',
    emptyIcon: <Play size={32} strokeWidth={1.2} />,
    emptyText: 'Aucun reel en favori',
    navPath: () => `/reels`,
  },
  {
    id: 'post',
    label: 'Posts',
    icon: <FileText size={14} />,
    pill: 'Post',
    pillColor: '#7B3FF2',
    emptyIcon: <FileText size={32} strokeWidth={1.2} />,
    emptyText: 'Aucun post en favori',
    navPath: (item) => `/posts/${item.item_id ?? item.id}`,
  },
  {
    id: 'community',
    label: 'Communautes',
    icon: <Users size={14} />,
    pill: 'Communaute',
    pillColor: '#7B3FF2',
    emptyIcon: <Users size={32} strokeWidth={1.2} />,
    emptyText: 'Aucune communaute en favori',
    navPath: (item) => `/communities/${item.item_id ?? item.id}`,
  },
];

function getDisplayTitle(item: FavItem, type: FavTab): string {
  return (
    item.title ??
    item.name ??
    (type === 'reel' ? (item.caption ?? 'Reel') : null) ??
    (type === 'post' ? (item.body?.toString().slice(0, 60) ?? 'Post') : null) ??
    ''
  );
}

function getDisplaySubtitle(item: FavItem): string {
  return (
    item.subtitle ??
    item.description?.toString().slice(0, 70) ??
    ''
  );
}

function getThumb(item: FavItem): string | null | undefined {
  return item.thumbnail_url ?? item.banner_url ?? item.image_url ?? item.cover_url;
}

// ── Favorite row ───────────────────────────────────────────────────────────────
function FavRow({
  item,
  config,
  onRemove,
  removing,
}: {
  item:     FavItem;
  config:   typeof TAB_CONFIG[0];
  onRemove: (id: string) => void;
  removing: boolean;
}) {
  const navigate = useNavigate();
  const thumb    = getThumb(item);
  const title    = getDisplayTitle(item, config.id);
  const subtitle = getDisplaySubtitle(item);

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      onMouseEnter={e => { (e.currentTarget.style.borderColor = config.pillColor + '60'); (e.currentTarget.style.background = 'var(--bg-secondary)'); }}
      onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--border)');         (e.currentTarget.style.background = 'var(--surface)'); }}
      onClick={() => navigate(config.navPath(item))}
    >
      {/* Thumbnail */}
      <div
        className="rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
        style={{ width: 58, height: 58, background: 'var(--bg-tertiary)' }}
      >
        {thumb
          ? <img src={thumb} alt="" className="w-full h-full object-cover" />
          : <span style={{ color: config.pillColor }}>{config.icon}</span>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {title}
        </p>
        {subtitle && (
          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        )}
        {/* Pill */}
        <span
          className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: config.pillColor + '18', color: config.pillColor }}
        >
          {config.pill}
        </span>
      </div>

      {/* Bookmark button */}
      <button
        disabled={removing}
        onClick={e => { e.stopPropagation(); onRemove(item.id); }}
        className="p-2 rounded-lg transition-all shrink-0"
        style={{ color: config.pillColor, background: config.pillColor + '15' }}
        title="Retirer des favoris"
        onMouseEnter={ev => { (ev.currentTarget.style.background = 'rgba(123,63,242,0.12)'); (ev.currentTarget.style.color = '#7B3FF2'); }}
        onMouseLeave={ev => { (ev.currentTarget.style.background = config.pillColor + '15'); (ev.currentTarget.style.color = config.pillColor); }}
      >
        {removing
          ? <span className="block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          : <BookmarkCheck size={16} />
        }
      </button>
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
  const [loaded,    setLoaded]    = useState<Record<FavTab, boolean>>({
    event: false, concert: false, reel: false, post: false, community: false,
  });
  const [removing,  setRemoving]  = useState<string | null>(null);

  const fetchTab = useCallback(async (t: FavTab) => {
    if (loaded[t]) return;
    setLoading(prev => ({ ...prev, [t]: true }));
    try {
      const res = await apiClient.get<unknown>(`/api/v1/favorites?type=${t}`);
      const raw = res.data as any;
      const list: FavItem[] = Array.isArray(raw) ? raw
        : Array.isArray(raw?.items) ? raw.items
        : Array.isArray(raw?.data)  ? raw.data
        : [];
      setItems(prev  => ({ ...prev, [t]: list }));
      setLoaded(prev => ({ ...prev, [t]: true }));
    } catch {
      setLoaded(prev => ({ ...prev, [t]: true }));
    } finally {
      setLoading(prev => ({ ...prev, [t]: false }));
    }
  }, [loaded]);

  useEffect(() => { fetchTab(tab); }, [tab]); // eslint-disable-line

  async function handleRemove(favId: string) {
    setRemoving(favId);
    try {
      await apiClient.delete(`/api/v1/favorites/${favId}`);
      setItems(prev => ({
        ...prev,
        [tab]: prev[tab].filter(i => i.id !== favId),
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
    <div className="w-full mx-auto px-4 sm:px-6 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Bookmark size={22} style={{ color: 'var(--primary)' }} />
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Favoris</h1>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 overflow-x-auto pb-0.5 hide-scrollbar"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {TAB_CONFIG.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-3 text-sm font-semibold whitespace-nowrap relative transition-colors"
            style={{ color: tab === t.id ? 'var(--primary)' : 'var(--text-tertiary)' }}
          >
            <span style={{ color: tab === t.id ? 'var(--primary)' : 'var(--text-tertiary)' }}>
              {t.icon}
            </span>
            {t.label}
            {items[t.id].length > 0 && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
              >
                {items[t.id].length}
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

      {/* Content */}
      {isLoading ? (
        <PageLoader />
      ) : currentList.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20" style={{ color: 'var(--text-tertiary)' }}>
          <span style={{ color: config.pillColor + '80' }}>{config.emptyIcon}</span>
          <p className="text-sm">{config.emptyText}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {currentList.map(item => (
            <FavRow
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
