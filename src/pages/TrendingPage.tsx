import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { encodeId } from '../utils/slugId';
import {
  TrendingUp, Film, Play, Eye, Heart, RefreshCw,
} from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Spinner } from '../components/ui/Spinner';

type Tab = 'contenus' | 'reels';

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ── Rank badge ─────────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  const gold = rank <= 3;
  return (
    <span
      className="absolute top-1.5 left-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-md z-10"
      style={gold
        ? { background: 'linear-gradient(135deg,#F59E0B,#FBBF24)', color: '#000' }
        : { background: 'rgba(0,0,0,0.55)', color: '#fff' }}
    >
      #{rank}
    </span>
  );
}

// ── Contenus grid ──────────────────────────────────────────────────────────────
function ContenusTab({ items, loading }: { items: any[]; loading: boolean }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20" style={{ color: 'var(--text-tertiary)' }}>
        <Film size={36} strokeWidth={1.2} />
        <p className="text-sm">Aucun contenu tendance pour le moment</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-1">
      {items.map((item: any, idx: number) => {
        const rank  = idx + 1;
        const route = item.type === 'serie' || item.content_type === 'serie'
          ? `/series/${encodeId(item.id)}`
          : `/films/${encodeId(item.id)}`;
        return (
          <div
            key={item.id}
            onClick={() => navigate(route)}
            className="cursor-pointer group relative"
          >
            {/* Thumbnail */}
            <div
              className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              {item.thumbnail_url
                ? <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                : <div className="w-full h-full flex items-center justify-center">
                    <Film size={28} style={{ color: 'var(--text-tertiary)' }} />
                  </div>
              }
              <RankBadge rank={rank} />
              {/* Overlay */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }}
              >
                {(item.view_count ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-white text-xs font-semibold">
                    <Eye size={11} />
                    {fmtCount(item.view_count)}
                  </span>
                )}
              </div>
            </div>
            {/* Info */}
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {item.title}
            </p>
            {(item.view_count ?? 0) > 0 && (
              <p className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                <Eye size={10} />
                {fmtCount(item.view_count)} vues
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Reels list ─────────────────────────────────────────────────────────────────
function ReelsTab({ items, loading }: { items: any[]; loading: boolean }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20" style={{ color: 'var(--text-tertiary)' }}>
        <Play size={36} strokeWidth={1.2} />
        <p className="text-sm">Aucun reel tendance pour le moment</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-1">
      {items.map((reel: any, idx: number) => (
        <div
          key={reel.id}
          onClick={() => navigate('/reels')}
          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          onMouseEnter={e => { (e.currentTarget.style.borderColor = 'var(--primary)'); (e.currentTarget.style.background = 'var(--bg-secondary)'); }}
          onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--border)');  (e.currentTarget.style.background = 'var(--surface)'); }}
        >
          {/* Rank */}
          <span
            className="text-xs font-black w-6 text-center shrink-0"
            style={{ color: idx < 3 ? '#F59E0B' : 'var(--text-tertiary)' }}
          >
            #{idx + 1}
          </span>

          {/* Thumbnail */}
          <div
            className="w-14 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
            style={{ height: 56, background: 'var(--bg-tertiary)' }}
          >
            {reel.thumbnail_url
              ? <img src={reel.thumbnail_url} alt="" className="w-full h-full object-cover" />
              : <Play size={16} style={{ color: 'var(--text-tertiary)' }} />
            }
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {reel.caption ?? reel.title ?? ''}
            </p>
            <div className="flex items-center gap-3 mt-1">
              {(reel.view_count ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <Eye size={11} /> {fmtCount(reel.view_count)}
                </span>
              )}
              {(reel.like_count ?? reel.likes_count ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <Heart size={11} /> {fmtCount(reel.like_count ?? reel.likes_count)}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function TrendingPage() {
  const [tab,           setTab]           = useState<Tab>('contenus');
  const [contenus,      setContenus]      = useState<any[]>([]);
  const [reels,         setReels]         = useState<any[]>([]);
  const [loadingC,      setLoadingC]      = useState(false);
  const [loadingR,      setLoadingR]      = useState(false);
  const [refreshingC,   setRefreshingC]   = useState(false);
  const [refreshingR,   setRefreshingR]   = useState(false);

  const fetchContenus = useCallback(async (silent = false) => {
    if (!silent) setLoadingC(true); else setRefreshingC(true);
    try {
      const res = await apiClient.get<unknown>(Endpoints.search.trending);
      const raw = res.data as any;
      const list: any[] = Array.isArray(raw) ? raw
        : Array.isArray(raw?.items) ? raw.items
        : Array.isArray(raw?.data)  ? raw.data
        : [];
      setContenus(list);
    } catch {
      /* ignore */
    } finally {
      setLoadingC(false);
      setRefreshingC(false);
    }
  }, []);

  const fetchReels = useCallback(async (silent = false) => {
    if (!silent) setLoadingR(true); else setRefreshingR(true);
    try {
      const res = await apiClient.get<unknown>(`${Endpoints.reels.feed}?sort=trending&limit=20`);
      const raw = res.data as any;
      const list: any[] = Array.isArray(raw) ? raw
        : Array.isArray(raw?.items) ? raw.items
        : Array.isArray(raw?.data)  ? raw.data
        : [];
      setReels(list);
    } catch {
      /* ignore */
    } finally {
      setLoadingR(false);
      setRefreshingR(false);
    }
  }, []);

  useEffect(() => { fetchContenus(); fetchReels(); }, []); // eslint-disable-line

  const total  = tab === 'contenus' ? contenus.length : reels.length;
  const isRefreshing = tab === 'contenus' ? refreshingC : refreshingR;

  function handleRefresh() {
    if (tab === 'contenus') fetchContenus(true);
    else                    fetchReels(true);
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'contenus', label: 'Contenus' },
    { id: 'reels',    label: 'Reels'    },
  ];

  return (
    <div className="max-w-3xl mx-auto pb-10">

      {/* Hero banner */}
      <div
        className="relative overflow-hidden rounded-b-3xl mb-6 px-6 py-8"
        style={{ background: 'linear-gradient(135deg,#7B3FF2 0%,#E0389A 100%)' }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={22} color="#fff" />
            <h1 className="text-2xl font-black text-white">Top tendances</h1>
          </div>
          <p className="text-white text-sm opacity-80">
            {total > 0 ? `${total} ${tab === 'contenus' ? 'contenus' : 'reels'} tendance` : 'Découvrez ce qui cartonne'}
          </p>
        </div>
        {/* Decorative circles */}
        <div
          className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20"
          style={{ background: 'rgba(255,255,255,0.3)' }}
        />
        <div
          className="absolute -bottom-6 right-16 w-24 h-24 rounded-full opacity-10"
          style={{ background: '#fff' }}
        />
      </div>

      <div className="px-4 sm:px-6">

        {/* Tabs + refresh */}
        <div className="flex items-center justify-between mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex gap-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="px-4 py-3 text-sm font-semibold relative transition-colors"
                style={{ color: tab === t.id ? 'var(--primary)' : 'var(--text-tertiary)' }}
              >
                {t.label}
                {tab === t.id && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: 'var(--primary)' }}
                  />
                )}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all mb-1"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>

        {/* Content */}
        {tab === 'contenus' && <ContenusTab items={contenus} loading={loadingC} />}
        {tab === 'reels'    && <ReelsTab    items={reels}    loading={loadingR} />}
      </div>
    </div>
  );
}
