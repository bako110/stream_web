import { useState, useEffect, useRef } from 'react';
import { Search, X, Link2, Play, ChevronRight } from 'lucide-react';
import { apiClient } from '../../../api';
import { Spinner, PageLoader } from '../../../components/ui/Spinner';
import { useAuthStore } from '../../../store/authStore';
import type { ContentType } from './BoostCatalog';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TargetContent {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string | null;
  isVideo?: boolean;
}

// ── URL builders ──────────────────────────────────────────────────────────────

function buildUrl(contentType: ContentType, userId: string, q?: string): string {
  const qs = q ? `&q=${encodeURIComponent(q)}` : '';
  const limit = q ? 20 : 30;
  switch (contentType) {
    case 'reel':      return `/api/v1/reels/user/${userId}?limit=${limit}${qs}`;
    case 'community': return `/api/v1/communities/me?limit=${limit}${qs}`;
    case 'post':      return `/api/v1/posts/user/${userId}?limit=${limit}${qs}`;
    case 'event':     return `/api/v1/events/me?limit=${limit}${qs}`;
    case 'concert':   return `/api/v1/concerts/me?limit=${limit}${qs}`;
    case 'live':      return `/api/v1/concerts/me?status=live&limit=${limit}${qs}`;
  }
}

function normalizeItem(item: any, contentType: ContentType): TargetContent {
  switch (contentType) {
    case 'reel':
      return {
        id: item.id,
        title: item.caption ?? item.title ?? 'Reel sans titre',
        subtitle: item.view_count != null ? `${Number(item.view_count).toLocaleString('fr-FR')} vues` : undefined,
        thumbnail: item.thumbnail_url ?? null,
        isVideo: true,
      };
    case 'community':
      return {
        id: item.id,
        title: item.name ?? 'Communauté',
        subtitle: item.members_count != null ? `${Number(item.members_count).toLocaleString('fr-FR')} membres` : undefined,
        thumbnail: item.avatar_url ?? item.cover_url ?? null,
      };
    case 'post':
      return {
        id: item.id,
        title: (item.body ?? item.content ?? '').slice(0, 70) || 'Post',
        subtitle: item.like_count != null ? `${item.like_count} likes` : undefined,
        thumbnail: item.image_url ?? item.image_urls?.[0] ?? null,
      };
    case 'event':
      return {
        id: item.id,
        title: item.title ?? item.name ?? 'Événement',
        subtitle: item.starts_at
          ? new Date(item.starts_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
          : item.venue_city,
        thumbnail: item.thumbnail_url ?? item.banner_url ?? null,
      };
    case 'concert':
    case 'live':
      return {
        id: item.id,
        title: item.title ?? 'Concert',
        subtitle: item.scheduled_at
          ? new Date(item.scheduled_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
          : item.venue_city,
        thumbnail: item.thumbnail_url ?? item.banner_url ?? null,
      };
  }
}

function extractList(data: any): any[] {
  if (Array.isArray(data)) return data;
  for (const key of ['items', 'results', 'reels', 'posts', 'events', 'concerts', 'communities']) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

// ── Thumbnail ─────────────────────────────────────────────────────────────────

function Thumb({ item, g1, size = 10 }: { item: TargetContent; g1: string; size?: number }) {
  const cls = `w-${size} h-${size} rounded-xl object-cover shrink-0`;
  if (item.thumbnail) {
    return (
      <div className="relative shrink-0" style={{ width: size * 4, height: size * 4 }}>
        <img src={item.thumbnail} alt="" className="w-full h-full rounded-xl object-cover" />
        {item.isVideo && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl"
            style={{ background: 'rgba(0,0,0,0.35)' }}>
            <Play size={10} color="#fff" fill="#fff" />
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={`${cls} flex items-center justify-center`}
      style={{ background: `${g1}20`, width: size * 4, height: size * 4, minWidth: size * 4 }}>
      <Link2 size={12} style={{ color: g1 }} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  contentType: ContentType;
  targetLabel: string;
  g1: string;
  selected: TargetContent | null;
  onSelect: (c: TargetContent | null) => void;
}

export function ContentPicker({ contentType, targetLabel, g1, selected, onSelect }: Props) {
  const userId = useAuthStore(s => s.user?.id ?? '');
  const [query, setQuery]     = useState('');
  const [items, setItems]     = useState<TargetContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    apiClient.get<any>(buildUrl(contentType, userId))
      .then(r => setItems(extractList(r.data).map(i => normalizeItem(i, contentType))))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open, contentType, userId]);

  function onQueryChange(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setLoading(true);
      apiClient.get<any>(buildUrl(contentType, userId))
        .then(r => setItems(extractList(r.data).map(i => normalizeItem(i, contentType))))
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
      return;
    }
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      apiClient.get<any>(buildUrl(contentType, userId, q))
        .then(r => setItems(extractList(r.data).map(i => normalizeItem(i, contentType))))
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, 300);
  }

  // ── Selected state ────────────────────────────────────────────────────────

  if (selected) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-2xl"
        style={{ background: `${g1}12`, border: `1.5px solid ${g1}40` }}>
        <Thumb item={selected} g1={g1} size={9} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black truncate" style={{ color: 'var(--text-primary)' }}>{selected.title}</p>
          {selected.subtitle && (
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{selected.subtitle}</p>
          )}
        </div>
        <button onClick={() => onSelect(null)}
          className="p-1.5 rounded-lg shrink-0 transition-all"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
          <X size={13} />
        </button>
      </div>
    );
  }

  // ── Picker ────────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl text-left transition-all"
        style={{ background: 'var(--surface)', border: `1.5px dashed ${g1}50` }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${g1}20` }}>
          <Link2 size={13} style={{ color: g1 }} />
        </div>
        <p className="text-xs font-semibold flex-1" style={{ color: g1 }}>{targetLabel}</p>
        <ChevronRight size={14} style={{ color: g1, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-2 rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2.5"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <Search size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            <input autoFocus value={query} onChange={e => onQueryChange(e.target.value)}
              placeholder="Rechercher un contenu…"
              className="flex-1 bg-transparent text-xs outline-none"
              style={{ color: 'var(--text-primary)' }} />
            {loading && <Spinner size="sm" />}
            <button onClick={() => setOpen(false)} style={{ color: 'var(--text-tertiary)' }}>
              <X size={13} />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-56 overflow-y-auto">
            {!loading && items.length === 0 && (
              <p className="text-xs text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
                Aucun contenu trouvé
              </p>
            )}
            {loading && items.length === 0 && (
              <PageLoader />
            )}
            {items.map((item, i) => (
              <button key={item.id}
                onClick={() => { onSelect(item); setOpen(false); setQuery(''); }}
                className="w-full flex items-center gap-3 px-3 py-3 text-left transition-all hover:bg-black/5"
                style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <Thumb item={item} g1={g1} size={9} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                  {item.subtitle && (
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{item.subtitle}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
