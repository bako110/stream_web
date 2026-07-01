/**
 * StoryPage — viewer de stories plein écran dédié.
 * Route : /stories?userId=xxx&index=0
 * Charge les groupes de stories et affiche le viewer.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { decodeId } from '../utils/slugId';
import {
  X, ChevronLeft, ChevronRight, Eye, MoreHorizontal,
  Edit3, Trash2, Zap, ExternalLink, Heart,
} from 'lucide-react';
import Hls from 'hls.js';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { toProxiedUrl } from '../utils/constants';
import { Avatar } from '../components/ui/Avatar';
import { Spinner , PageLoader} from '../components/ui/Spinner';
import { HeartRain, LikeNamesFeed } from '../components/ui/HeartRain';
import { useAuthStore } from '../store/authStore';
import type { StoryGroup } from '../types';
import { StoryOverlaysRenderer } from '../utils/reelFilters.tsx';

type FontStyle = { fontFamily?: string; fontWeight?: string; fontStyle?: string };
const FONT_MAP: Record<string, FontStyle> = {
  classic:   { fontWeight: 'bold' },
  serif:     { fontFamily: 'Georgia, serif',           fontWeight: 'normal' },
  mono:      { fontFamily: 'monospace',                fontWeight: 'bold' },
  cursive:   { fontFamily: 'cursive',                  fontWeight: 'normal' },
  condensed: { fontFamily: 'Arial Narrow, sans-serif', fontWeight: '900' },
  italic:    { fontFamily: 'Georgia, serif',           fontWeight: 'normal', fontStyle: 'italic' },
};

interface StoryAd {
  id: string; title: string; description?: string | null;
  cta_text?: string | null; cta_url?: string | null;
  creative_url?: string | null; thumbnail_url?: string | null;
  format?: string | null;
}

export default function StoryPage() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const { user }      = useAuthStore();

  const targetUserId  = params.get('userId') ? decodeId(params.get('userId')!) : null;
  const initialIndex  = parseInt(params.get('index') ?? '0', 10);
  const initialStoryIndex = parseInt(params.get('storyIndex') ?? '0', 10);

  const [groups,   setGroups]   = useState<StoryGroup[]>([]);
  const [storyAd,  setStoryAd]  = useState<StoryAd | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get<StoryGroup[]>(Endpoints.stories.feed),
      apiClient.get<StoryAd>(Endpoints.ads.feedNext('stories')).catch(() => null),
    ]).then(([storiesRes, adRes]) => {
      const raw = Array.isArray(storiesRes.data) ? storiesRes.data : (storiesRes.data as any)?.items ?? [];
      setGroups(raw);
      if (adRes?.data?.id) setStoryAd(adRes.data);
    })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const startIndex = (() => {
    if (!targetUserId || groups.length === 0) return initialIndex;
    const idx = groups.findIndex(g => g.user.id === targetUserId);
    return idx >= 0 ? idx : initialIndex;
  })();

  if (loading) return <PageLoader dark />;

  if (groups.length === 0) {
    navigate(-1);
    return null;
  }

  return (
    <StoryViewer
      groups={groups}
      initialIndex={startIndex}
      initialStoryIndex={initialStoryIndex}
      currentUserId={user?.id}
      storyAd={storyAd}
      onClose={() => navigate(-1)}
      onReload={() => {
        apiClient.get<StoryGroup[]>(Endpoints.stories.feed)
          .then(r => setGroups(Array.isArray(r.data) ? r.data : (r.data as any)?.items ?? []))
          .catch(() => {});
      }}
    />
  );
}

// ── MusicWidget — vinyle tournant + barres d'onde (identique mobile) ─────────

function MusicWidget({ audioUrl, playing, isVoice }: { audioUrl: string; playing: boolean; isVoice?: boolean }) {
  const trackName = (() => {
    try {
      const seg = audioUrl.split('/').pop()?.split('?')[0] ?? '';
      const clean = decodeURIComponent(seg).replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      return clean.length > 30 ? clean.slice(0, 30) + '…' : clean || 'Musique';
    } catch { return 'Musique'; }
  })();

  const accent = isVoice ? '#FF9800' : '#a78bfa';

  return (
    <div className="absolute pointer-events-none"
      style={{ bottom: 80, left: 16, zIndex: 20, display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
        border: `1px solid ${accent}40`, borderRadius: 16, padding: '8px 12px 8px 8px',
        maxWidth: 220 }}>

      {/* Vinyle tournant */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0, position: 'relative',
        background: 'conic-gradient(#1a1a2e 0deg, #16213E 120deg, #0F3460 240deg, #1a1a2e 360deg)',
        border: '2px solid rgba(255,255,255,0.2)',
        animation: playing ? 'spin-slow 5s linear infinite' : 'none',
        boxShadow: playing ? `0 0 12px ${accent}80` : 'none',
      }}>
        {/* Rainures */}
        {[13, 10, 7].map(r => (
          <div key={r} style={{
            position: 'absolute', borderRadius: '50%',
            border: '0.5px solid rgba(255,255,255,0.1)',
            width: r * 2, height: r * 2,
            left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
          }} />
        ))}
        {/* Centre */}
        <div style={{
          position: 'absolute', width: 12, height: 12, borderRadius: '50%',
          backgroundColor: accent, left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#fff' }} />
        </div>
      </div>

      {/* Info + barres */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
          <span style={{ fontSize: 9, color: accent, fontWeight: 700 }}>
            {isVoice ? 'VOCAL' : 'MUSIQUE'}
          </span>
          {playing && (
            <span style={{ fontSize: 9, color: accent, background: accent + '25',
              borderRadius: 4, padding: '1px 4px', fontWeight: 700 }}>EN COURS</span>
          )}
        </div>
        <p style={{ color: '#fff', fontSize: 11, fontWeight: 600, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
          {trackName}
        </p>
        {/* Barres d'onde animées */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 14 }}>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} style={{
              width: 2.5, borderRadius: 2, backgroundColor: accent,
              height: playing ? undefined : 3,
              animation: playing ? `wave-bar ${0.6 + (i % 4) * 0.15}s ease-in-out infinite alternate` : 'none',
              minHeight: 3, maxHeight: 12,
              ...(playing ? { animationDelay: `${(i * 0.07).toFixed(2)}s` } : {}),
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── StoryViewer ───────────────────────────────────────────────────────────────

function StoryViewer({
  groups, initialIndex, initialStoryIndex = 0, currentUserId, storyAd, onClose, onReload,
}: {
  groups: StoryGroup[];
  initialIndex: number;
  initialStoryIndex?: number;
  currentUserId?: string;
  storyAd?: StoryAd | null;
  onClose: () => void;
  onReload: () => void;
}) {
  const [groupIdx,     setGroupIdx]     = useState(initialIndex);
  const [storyIdx,     setStoryIdx]     = useState(initialStoryIndex);
  const [progress,     setProgress]     = useState(0);
  const [paused,       setPaused]       = useState(false);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [editMode,     setEditMode]     = useState(false);
  const [editText,     setEditText]     = useState('');
  const [localGroups,  setLocalGroups]  = useState(groups);
  const [viewers,      setViewers]      = useState<any[]>([]);
  const [viewersOpen,    setViewersOpen]    = useState(false);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [showAd,       setShowAd]       = useState(false);
  const [adProgress,   setAdProgress]   = useState(0);
  const [containerSize, setContainerSize] = useState({ w: 500, h: window.innerHeight });
  const containerRef   = useRef<HTMLDivElement>(null);
  const storyAudioRef  = useRef<HTMLAudioElement | null>(null);
  const nextGroupRef   = useRef(0);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const adTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adProgressRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const adVideoRef     = useRef<HTMLVideoElement>(null);
  const adHlsRef       = useRef<Hls | null>(null);

  // Sync quand le parent recharge les groupes (après onReload)
  useEffect(() => { setLocalGroups(groups); }, [groups]);

  const group  = localGroups[groupIdx];
  const story  = group?.stories[storyIdx];
  const dur    = (story?.duration_sec ?? 5) * 1000;
  const isOwn  = !!currentUserId && (story as any)?.user_id === currentUserId;
  const totalInGroup = group?.stories.length ?? 0;

  const [liked,     setLiked]     = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const likeInFlight = useRef(false);

  // Resync à chaque changement de story
  useEffect(() => {
    setLiked((story as any)?.liked_by_me ?? false);
    setLikeCount((story as any)?.like_count ?? 0);
  }, [story?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleLike = useCallback(() => {
    if (!story || isOwn || likeInFlight.current) return;
    likeInFlight.current = true;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(c => newLiked ? c + 1 : Math.max(0, c - 1));
    apiClient.post(Endpoints.stories.like(story.id))
      .catch(() => {
        setLiked(!newLiked);
        setLikeCount(c => newLiked ? Math.max(0, c - 1) : c + 1);
      })
      .finally(() => { likeInFlight.current = false; });
  }, [story, isOwn, liked]);

  const adIsVideo = !!(storyAd?.format === 'video' || (storyAd?.creative_url && (
    storyAd.creative_url.includes('.m3u8') ||
    storyAd.creative_url.includes('/hls/') ||
    storyAd.creative_url.toLowerCase().includes('.mp4')
  )));

  const setupAdVideo = useCallback((v: HTMLVideoElement | null) => {
    (adVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = v;
    if (!v || !adIsVideo || !storyAd?.creative_url) return;
    const src = toProxiedUrl(storyAd.creative_url);
    if (Hls.isSupported()) {
      const hls = new Hls({ autoStartLoad: true, maxBufferLength: 30 });
      adHlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { v.play().catch(() => {}); });
      hls.on(Hls.Events.ERROR, (_e, data) => { if (data.fatal) hls.destroy(); });
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = src;
      v.play().catch(() => {});
    } else {
      v.src = src;
      v.play().catch(() => {});
    }
  }, [adIsVideo, storyAd?.creative_url]); // eslint-disable-line

  // Mesure le container pour les positions normalisées des overlays
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Lecture audio séparée (audio_url sur story), identique mobile
  useEffect(() => {
    const url = story?.audio_url;
    const stop = () => {
      const a = storyAudioRef.current;
      if (a) { a.pause(); a.src = ''; storyAudioRef.current = null; }
    };
    if (!url || paused) { stop(); return; }
    const a = new Audio(url);
    storyAudioRef.current = a;
    a.play().catch(() => {});
    return () => stop();
  }, [story?.id, paused]); // eslint-disable-line

  // Mark viewed
  useEffect(() => {
    if (!story) return;
    apiClient.post(Endpoints.stories.view(story.id)).catch(() => {});
  }, [story?.id]);

  // Progress bar
  useEffect(() => {
    setProgress(0);
    if (paused || menuOpen || editMode || !story) return;
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const pct = Math.min(((Date.now() - start) / dur) * 100, 100);
      setProgress(pct);
      if (pct >= 100) goNext();
    }, 50);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [groupIdx, storyIdx, paused, menuOpen, editMode, dur]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft')  goPrev();
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [groupIdx, storyIdx]);

  const goNext = useCallback(() => {
    if (storyIdx < totalInGroup - 1) {
      setStoryIdx(s => s + 1);
    } else if (groupIdx < localGroups.length - 1) {
      const nextGroup = groupIdx + 1;
      // Afficher l'ad entre groupes (5 secondes, identique mobile)
      if (storyAd) {
        nextGroupRef.current = nextGroup;
        setPaused(true);
        setShowAd(true);
        setAdProgress(0);
        apiClient.post(Endpoints.ads.impression(storyAd.id)).catch(() => {});
        // Progress bar 5s
        const start = Date.now();
        if (adProgressRef.current) clearInterval(adProgressRef.current);
        adProgressRef.current = setInterval(() => {
          const pct = Math.min(((Date.now() - start) / 5000) * 100, 100);
          setAdProgress(pct);
        }, 50);
        if (adTimerRef.current) clearTimeout(adTimerRef.current);
        adTimerRef.current = setTimeout(() => {
          if (adProgressRef.current) clearInterval(adProgressRef.current);
          setShowAd(false);
          setPaused(false);
          setGroupIdx(nextGroupRef.current);
          setStoryIdx(0);
        }, 5000);
      } else {
        setGroupIdx(nextGroup);
        setStoryIdx(0);
      }
    } else {
      onClose();
    }
  }, [storyIdx, totalInGroup, groupIdx, localGroups.length, storyAd, onClose]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) { setStoryIdx(s => s - 1); }
    else if (groupIdx > 0) { setGroupIdx(g => g - 1); setStoryIdx(0); }
  }, [storyIdx, groupIdx]);

  async function openViewers() {
    setPaused(true); setViewersOpen(true); setViewersLoading(true);
    try {
      const vRes = await apiClient.get<any>(Endpoints.stories.viewers(story!.id));
      const raw = vRes.data;
      setViewers(Array.isArray(raw) ? raw : raw?.items ?? []);
    } catch { setViewers([]); }
    setViewersLoading(false);
  }

  async function deleteStory() {
    if (!story) return;
    setMenuOpen(false);
    try {
      await apiClient.delete(Endpoints.stories.delete(story.id));
      onReload();
      if (totalInGroup > 1) setStoryIdx(storyIdx < totalInGroup - 1 ? storyIdx : storyIdx - 1);
      else onClose();
    } catch { toast.error('Erreur lors de la suppression'); }
  }

  async function saveEdit() {
    if (!story) return;
    const newCaption = editText.trim() || null;
    try {
      await apiClient.patch(`/api/v1/stories/${story.id}`, { caption: newCaption });
      // Mise à jour locale immédiate (identique mobile : story.caption = editCaption)
      setLocalGroups(prev => prev.map((g, gi) =>
        gi !== groupIdx ? g : {
          ...g,
          stories: g.stories.map((s, si) =>
            si !== storyIdx ? s : { ...s, caption: newCaption }
          ),
        }
      ));
    } catch { /* silencieux */ }
    setEditMode(false); setPaused(false);
    onReload();
  }

  // Affichage de la pub entre groupes
  if (showAd && storyAd) {
    const adCtaDomain = (() => {
      try { return storyAd.cta_url ? new URL(storyAd.cta_url).hostname.replace(/^www\./, '') : null; }
      catch { return null; }
    })();

    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <div className="relative w-full max-w-[500px] bg-black" style={{ height: '100dvh' }}>
          {/* Progress bar */}
          <div className="absolute top-0 inset-x-0 z-30 px-3 pt-3">
            <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.3)' }}>
              <div className="h-full rounded-full bg-white transition-none" style={{ width: `${adProgress}%` }} />
            </div>
          </div>

          {/* Fond créatif */}
          {adIsVideo && storyAd.creative_url ? (
            <video
              ref={setupAdVideo}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline muted autoPlay loop
              poster={storyAd.thumbnail_url ?? undefined}
            />
          ) : storyAd.thumbnail_url || storyAd.creative_url ? (
            <img src={storyAd.thumbnail_url ?? storyAd.creative_url!} alt={storyAd.title}
              className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,#1a0533,#2d0a5c)' }} />
          )}

          {/* Gradient sombre en bas */}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)' }} />

          {/* Badge Sponsorisé (haut gauche) */}
          <div className="absolute top-10 left-4 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-[10px] font-bold"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <Zap size={9} style={{ color: '#a78bfa' }} /> Sponsorisé
          </div>

          {/* Bouton Ignorer */}
          <button onClick={() => {
            if (adTimerRef.current) clearTimeout(adTimerRef.current);
            if (adProgressRef.current) clearInterval(adProgressRef.current);
            setShowAd(false); setPaused(false);
            setGroupIdx(nextGroupRef.current); setStoryIdx(0);
          }}
            className="absolute top-10 right-4 z-30 text-white text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            Ignorer
          </button>

          {/* Contenu bas */}
          <div className="absolute bottom-8 left-4 right-4 z-30">
            <p className="text-white font-black text-xl leading-tight mb-1">{storyAd.title}</p>
            {storyAd.description && (
              <p className="text-white/75 text-sm mb-5 leading-relaxed line-clamp-2">{storyAd.description}</p>
            )}
            {storyAd.cta_url && (
              <button onClick={() => {
                apiClient.post(Endpoints.ads.click(storyAd.id)).catch(() => {});
                window.open(storyAd.cta_url!, '_blank', 'noopener,noreferrer');
              }}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm w-full justify-center"
                style={{ background: 'rgba(255,255,255,0.95)', color: '#1a0533' }}>
                <ExternalLink size={14} />
                {storyAd.cta_text ?? 'En savoir plus'}
                {adCtaDomain && <span className="text-xs font-normal opacity-60 ml-1">· {adCtaDomain}</span>}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!group || !story) return null;
  const author = group.user;

  const timeAgo = (() => {
    const d = (Date.now() - new Date(story.created_at).getTime()) / 1000;
    if (d < 60) return 'À l\'instant';
    if (d < 3600) return `${Math.floor(d / 60)} min`;
    return `${Math.floor(d / 3600)} h`;
  })();

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">

      {/* Zone cliquable pour fermer (côtés) */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Container centré style story Instagram — max 500px */}
      <div
        ref={containerRef}
        className="relative z-10 w-full max-w-[500px] bg-black"
        style={{ height: '100dvh', maxHeight: '100dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress bars */}
        <div className="absolute top-0 inset-x-0 z-30 flex gap-1 px-3 pt-3">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.3)' }}>
              <div className="h-full rounded-full transition-none"
                style={{ background: '#fff', width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%' }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-7 inset-x-0 z-30 flex items-center gap-3 px-4">
          <div className="rounded-full p-[2px]" style={{ border: '2px solid rgba(255,255,255,0.7)' }}>
            <Avatar src={author.avatar_url} name={author.display_name ?? author.username ?? ''} size="sm" verified={author.is_verified} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold truncate">{author.display_name ?? author.username}</p>
            <p className="text-white/60 text-xs">{timeAgo}</p>
          </div>
          {isOwn && (
            <button onClick={() => { setPaused(true); setMenuOpen(true); }}
              className="p-2 rounded-full" style={{ background: 'rgba(0,0,0,0.35)' }}>
              <MoreHorizontal size={18} className="text-white" />
            </button>
          )}
          <button onClick={onClose}
            className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Media */}
        <div className="absolute inset-0"
          onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)}>
          {story.media_type === 'video' && story.media_url ? (
            <video
              key={story.id}
              src={story.media_url}
              className="w-full h-full object-cover"
              autoPlay loop={false} playsInline muted={false}
            />
          ) : story.media_type === 'image' && story.media_url ? (
            <img key={story.id} src={story.media_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center px-8"
              style={{ background: story.background_color ?? 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
              {story.caption && (
                <p className="text-white text-center leading-snug" style={{
                  fontSize: story.caption.length > 100 ? 18 : story.caption.length > 50 ? 24 : 30,
                  ...(FONT_MAP[story.font_style ?? 'classic'] ?? FONT_MAP.classic),
                }}>{story.caption}</p>
              )}
            </div>
          )}
        </div>

        {/* Filtre coloré identique mobile (filter_overlay_color + filter_overlay_opacity) */}
        {(story.media_type === 'image' || story.media_type === 'video') &&
          story.filter_overlay_color && (story.filter_overlay_opacity ?? 0) > 0 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundColor: story.filter_overlay_color,
              opacity: story.filter_overlay_opacity!,
              zIndex: 2,
            }}
          />
        )}

        {/* Overlays éditeur (texte, dessin, stickers, masques) */}
        {story.overlays_json && (
          <StoryOverlaysRenderer
            overlaysJson={story.overlays_json}
            width={containerSize.w}
            height={containerSize.h}
          />
        )}

        {/* Gradients */}
        <div className="absolute inset-x-0 top-0 h-36 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)', zIndex: 3 }} />
        <div className="absolute inset-x-0 bottom-0 h-36 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)', zIndex: 3 }} />

        {/* MusicWidget — audio_url présent sur story (audio/voice/image+son) */}
        {story.audio_url && (
          <MusicWidget
            audioUrl={story.audio_url}
            playing={!paused}
            isVoice={story.media_type === 'voice'}
          />
        )}

        {/* Caption — avec font_style pour media_type text, identique mobile */}
        {story.caption && story.media_type !== 'text' && (
          <div className="absolute bottom-16 inset-x-0 px-5 z-20 pointer-events-none">
            <div className="inline-block rounded-2xl px-4 py-2.5" style={{ background: 'rgba(0,0,0,0.55)' }}>
              <p className="text-white text-sm leading-relaxed">{story.caption}</p>
            </div>
          </div>
        )}

        {/* Vue count */}
        {isOwn && (
          <button onClick={openViewers}
            className="absolute bottom-5 left-5 z-20 flex items-center gap-1.5 px-3 py-2 rounded-full"
            style={{ background: 'rgba(0,0,0,0.55)' }}>
            <Eye size={14} className="text-white" />
            <span className="text-white text-xs font-bold">{(story as any).view_count ?? 0} vue{((story as any).view_count ?? 0) !== 1 ? 's' : ''}</span>
          </button>
        )}

        {/* Like — visible pour les non-propriétaires */}
        {!isOwn && (
          <button onClick={handleToggleLike}
            className="absolute bottom-5 right-5 z-20 flex items-center gap-1.5 px-3 py-2 rounded-full transition-all"
            style={{ background: liked ? 'rgba(224,56,154,0.3)' : 'rgba(0,0,0,0.55)' }}>
            <Heart size={16} fill={liked ? '#E0389A' : 'none'} className={liked ? '' : 'text-white'} style={liked ? { color: '#E0389A' } : undefined} />
            {likeCount > 0 && <span className="text-white text-xs font-bold">{likeCount}</span>}
          </button>
        )}

        {/* Pluie de cœurs + avatars des derniers likers — story très aimée (≥1000 likes) */}
        <HeartRain active={!paused} likeCount={likeCount} contentId={story.id} />
        <LikeNamesFeed active={!paused} likeCount={likeCount} contentId={story.id} kind="story" />

        {/* Tap zones */}
        <button className="absolute left-0 top-0 w-1/3 h-full z-10 opacity-0" onClick={goPrev} />
        <button className="absolute right-0 top-0 w-1/3 h-full z-10 opacity-0" onClick={goNext} />

        {/* Flèches groupes */}
        {groupIdx > 0 && (
          <button
            className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.18)' }}
            onClick={() => { setGroupIdx(g => g - 1); setStoryIdx(0); }}>
            <ChevronLeft size={18} className="text-white" />
          </button>
        )}
        {groupIdx < localGroups.length - 1 && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.18)' }}
            onClick={() => { setGroupIdx(g => g + 1); setStoryIdx(0); }}>
            <ChevronRight size={18} className="text-white" />
          </button>
        )}

        {/* Menu */}
        {menuOpen && (
          <div className="absolute inset-0 z-40" style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => { setMenuOpen(false); setPaused(false); }}>
            <div className="absolute bottom-0 inset-x-0 rounded-t-2xl overflow-hidden"
              style={{ background: '#12121E' }}
              onClick={e => e.stopPropagation()}>
              <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-3" style={{ background: 'rgba(255,255,255,0.2)' }} />
              <button onClick={() => { setMenuOpen(false); setEditText(story.caption ?? ''); setEditMode(true); }}
                className="w-full flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(123,63,242,0.15)' }}>
                  <Edit3 size={16} style={{ color: '#7B3FF2' }} />
                </div>
                <span className="text-white font-medium text-sm">Modifier la légende</span>
                <ChevronRight size={15} className="ml-auto text-white/30" />
              </button>
              <button onClick={deleteStory}
                className="w-full flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,68,68,0.15)' }}>
                  <Trash2 size={16} style={{ color: '#ff4444' }} />
                </div>
                <span className="font-medium text-sm" style={{ color: '#ff4444' }}>Supprimer la story</span>
                <ChevronRight size={15} className="ml-auto" style={{ color: 'rgba(255,68,68,0.3)' }} />
              </button>
              <button onClick={() => { setMenuOpen(false); setPaused(false); }}
                className="w-full py-4 text-sm font-medium text-center"
                style={{ color: 'rgba(255,255,255,0.5)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Edit caption */}
        {editMode && (
          <div className="absolute inset-0 z-40 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="w-full rounded-t-2xl p-5" style={{ background: '#12121E' }}>
              <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.2)' }} />
              <p className="text-white font-bold mb-3">Modifier la légende</p>
              <textarea value={editText} onChange={e => setEditText(e.target.value)}
                className="w-full rounded-xl text-sm resize-none outline-none px-4 py-3 text-white"
                style={{ background: 'rgba(255,255,255,0.07)', minHeight: 80, border: '1px solid rgba(255,255,255,0.1)' }}
                rows={3} maxLength={300} autoFocus />
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setEditMode(false); setPaused(false); }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                  Annuler
                </button>
                <button onClick={saveEdit}
                  className="flex-1 py-3 rounded-xl text-sm font-black text-white"
                  style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Viewers */}
        {viewersOpen && (
          <div className="absolute inset-0 z-40" style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => { setViewersOpen(false); setPaused(false); }}>
            <div className="absolute bottom-0 inset-x-0 rounded-t-2xl overflow-hidden"
              style={{ background: '#12121E', maxHeight: '65%' }}
              onClick={e => e.stopPropagation()}>
              <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-2" style={{ background: 'rgba(255,255,255,0.2)' }} />
              <div className="flex items-center gap-2 px-5 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <Eye size={15} style={{ color: '#7B3FF2' }} />
                <p className="text-white font-black">{viewers.length} vue{viewers.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
                {viewersLoading ? (
                  <div className="flex justify-center py-8"><Spinner size="sm" /></div>
                ) : viewers.length === 0 ? (
                  <div className="flex flex-col items-center py-10 gap-2 opacity-40">
                    <Eye size={32} className="text-white" />
                    <p className="text-white text-sm">Aucune vue pour l'instant</p>
                  </div>
                ) : viewers.map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Avatar src={v.avatar_url} name={v.display_name ?? v.username ?? '?'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{v.display_name ?? v.username}</p>
                      <p className="text-white/40 text-xs">@{v.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
