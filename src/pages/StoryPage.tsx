/**
 * StoryPage — viewer de stories plein écran dédié.
 * Route : /stories?userId=xxx&index=0
 * Charge les groupes de stories et affiche le viewer.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { decodeId, encodeId } from '../utils/slugId';
import {
  X, ChevronRight, Eye, MoreHorizontal,
  Edit3, Trash2, Zap, ExternalLink, Heart, Send, Bookmark,
  MessageCircle,
} from 'lucide-react';
import Hls from 'hls.js';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { toProxiedUrl } from '../utils/constants';
import { Avatar } from '../components/ui/Avatar';
import { Spinner , PageLoader} from '../components/ui/Spinner';
import { HeartRain, LikeNamesFeed } from '../components/ui/HeartRain';
import { formatTimeAgo } from '../utils/date';
import { useAuthStore } from '../store/authStore';
import { useWs } from '../context/WebSocketContext';
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

// ── MusicWidget — indicateur minimal : icône + titre, une seule ligne ────────

function MusicWidget({
  audioUrl, audioName, playing, isVoice, blocked, onRetry,
}: { audioUrl: string; audioName?: string | null; playing: boolean; isVoice?: boolean; blocked?: boolean; onRetry?: () => void }) {
  // Vrai titre (audio_name, résolu depuis le catalogue Sound côté backend) —
  // fallback sur le nom de fichier de l'URL seulement pour les anciennes
  // stories publiées avant l'ajout de ce champ.
  const trackName = (() => {
    if (audioName && audioName.trim()) {
      return audioName.length > 30 ? audioName.slice(0, 30) + '…' : audioName;
    }
    try {
      const seg = audioUrl.split('/').pop()?.split('?')[0] ?? '';
      const clean = decodeURIComponent(seg).replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      return clean.length > 30 ? clean.slice(0, 30) + '…' : clean || 'Musique';
    } catch { return 'Musique'; }
  })();

  return (
    <div
      className={blocked ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}
      onClick={blocked ? onRetry : undefined}
      title={blocked ? 'Le navigateur a bloqué la lecture automatique — clique pour écouter' : undefined}
      style={{ position: 'absolute', bottom: 56, left: 16, zIndex: 20, display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
        borderRadius: 20, padding: '5px 10px', maxWidth: 200 }}>
      {blocked ? (
        <span style={{ fontSize: 12, flexShrink: 0 }}>🔇</span>
      ) : (
        <span style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 12, flexShrink: 0 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 2.5, borderRadius: 2, backgroundColor: isVoice ? '#FF9800' : '#a78bfa',
              height: 4,
              animation: playing ? `eq-bar ${0.7 + i * 0.15}s ease-in-out infinite alternate` : 'none',
              animationDelay: `${i * 0.12}s`,
            }} />
          ))}
        </span>
      )}
      <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {blocked ? 'Taper pour écouter' : trackName}
      </span>
      <style>{`@keyframes eq-bar { 0% { height: 3px; } 100% { height: 12px; } }`}</style>
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
  const navigate = useNavigate();
  const { addListener, removeListener } = useWs();

  const [groupIdx,     setGroupIdx]     = useState(initialIndex);
  const [storyIdx,     setStoryIdx]     = useState(initialStoryIndex);
  const [progress,     setProgress]     = useState(0);
  const [paused,       setPaused]       = useState(false);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [editMode,     setEditMode]     = useState(false);
  const [editText,     setEditText]     = useState('');
  const [localGroups,  setLocalGroups]  = useState(groups);
  const [viewers,      setViewers]      = useState<any[]>([]);
  const [replies,      setReplies]      = useState<any[]>([]);
  const [viewersOpen,    setViewersOpen]    = useState(false);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [viewersTab,     setViewersTab]     = useState<'views' | 'replies'>('views');
  // Pagination — pages/hasMore séparées par onglet (views/replies).
  const [viewersPage,    setViewersPage]    = useState(1);
  const [viewersHasMore, setViewersHasMore] = useState(true);
  const [repliesPage,    setRepliesPage]    = useState(1);
  const [repliesHasMore, setRepliesHasMore] = useState(true);
  const [viewersLoadingMore, setViewersLoadingMore] = useState(false);
  const viewersSentinelRef = useRef<HTMLDivElement>(null);
  const VIEWERS_PAGE_SIZE = 50;
  const [showAd,       setShowAd]       = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [adProgress,   setAdProgress]   = useState(0);
  const [containerSize, setContainerSize] = useState({ w: 500, h: window.innerHeight });
  // Répondre à une story (input façon WhatsApp)
  const [replyText,    setReplyText]    = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replySent,    setReplySent]    = useState(false);
  // Double-tap pour liker (mobile-like) + animation cœur
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  // Sauvegarder une story (favoris backend, target_type="story")
  const [saved,        setSaved]        = useState(false);
  const [saving,        setSaving]      = useState(false);
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

  // Swipe tactile — pertinent pour les visiteurs web sur mobile/tablette
  // (navigateur), pas seulement l'app native. Vertical vers le bas -> ferme,
  // horizontal -> change de groupe (comme les avatars latéraux/flèches).
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.touches[0];
    const dy = t.clientY - touchStartRef.current.y;
    if (dy > 0) setSwipeOffset(dy); // feedback visuel seulement pour le swipe vertical (fermeture)
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    setSwipeOffset(0);
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const SWIPE_THRESHOLD = 80;
    if (Math.abs(dy) > Math.abs(dx) && dy > SWIPE_THRESHOLD) {
      onClose();
    } else if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx > 0 && groupIdx > 0) { setGroupIdx(g => g - 1); setStoryIdx(0); }
      else if (dx < 0 && groupIdx < localGroups.length - 1) { setGroupIdx(g => g + 1); setStoryIdx(0); }
    }
  }, [onClose, groupIdx, localGroups.length]);

  // Double-tap (zone média) pour liker, identique mobile — sans dupliquer un
  // like déjà posé par le simple tap sur le bouton cœur.
  const handleMediaTap = useCallback((clientX: number) => {
    const now = Date.now();
    const last = lastTapRef.current;
    lastTapRef.current = { time: now, x: clientX };
    if (last && now - last.time < 300 && Math.abs(clientX - last.x) < 40) {
      if (!isOwn && !liked) handleToggleLike();
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 800);
    }
  }, [isOwn, liked, handleToggleLike]);

  // Resync `saved` à chaque changement de story — pas de vérification serveur
  // au chargement (même pattern que PostDetailPage.tsx), état optimiste pur.
  useEffect(() => { setSaved(false); }, [story?.id]);

  const handleToggleSave = useCallback(async () => {
    if (!story || saving) return;
    setSaving(true);
    try {
      if (saved) {
        await apiClient.delete(Endpoints.favorites.remove('story', story.id));
        setSaved(false);
      } else {
        await apiClient.post(Endpoints.favorites.add, { target_type: 'story', target_id: story.id });
        setSaved(true);
      }
    } catch { toast.error('Erreur'); }
    finally { setSaving(false); }
  }, [story, saved, saving]);

  const handleSendReply = useCallback(async () => {
    if (!story || !replyText.trim() || replySending) return;
    setReplySending(true);
    try {
      await apiClient.post(Endpoints.stories.reply(story.id), { text: replyText.trim() });
      setReplyText('');
      setReplySent(true);
      setPaused(false);
      setTimeout(() => setReplySent(false), 2500);
    } catch { toast.error('Erreur envoi'); }
    finally { setReplySending(false); }
  }, [story, replyText, replySending]);

  const handleQuickHeartReply = useCallback(() => {
    if (!story || replySending) return;
    setReplySending(true);
    apiClient.post(Endpoints.stories.reply(story.id), { text: '❤️' })
      .then(() => { setReplySent(true); setTimeout(() => setReplySent(false), 2500); })
      .catch(() => toast.error('Erreur envoi'))
      .finally(() => setReplySending(false));
  }, [story, replySending]);

  // Notification temps réel WS quand quelqu'un like une propre story —
  // évite d'avoir à recharger la page pour voir un like arriver.
  useEffect(() => {
    const handler = (payload: any) => {
      if (payload.type !== 'story_liked' || payload.story_id !== story?.id) return;
      toast.success(`${payload.liker_display_name ?? payload.liker_username} a aimé ta story`);
      setLikeCount(payload.like_count ?? 0);
    };
    addListener(handler);
    return () => removeListener(handler);
  }, [story?.id, addListener, removeListener]);

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
    a.volume = 1;
    a.muted = false;
    storyAudioRef.current = a;
    // Certains navigateurs bloquent l'autoplay avec son hors interaction directe —
    // le widget musique devient alors cliquable (voir onClick) pour relancer
    // manuellement, plutôt que d'échouer silencieusement sans aucun retour.
    a.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
    return () => stop();
  }, [story?.id, paused]); // eslint-disable-line

  const retryStoryAudio = useCallback(() => {
    const a = storyAudioRef.current;
    if (!a) return;
    a.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
  }, []);

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
    setPaused(true); setViewersOpen(true); setViewersTab('views'); setViewersLoading(true);
    setViewersPage(1); setRepliesPage(1);
    try {
      const [vRes, rRes] = await Promise.all([
        apiClient.get<any>(`${Endpoints.stories.viewers(story!.id)}?page=1&limit=${VIEWERS_PAGE_SIZE}`),
        apiClient.get<any>(`${Endpoints.stories.replies(story!.id)}?page=1&limit=${VIEWERS_PAGE_SIZE}`).catch(() => ({ data: [] })),
      ]);
      const raw = vRes.data;
      const viewersList = Array.isArray(raw) ? raw : raw?.items ?? [];
      setViewers(viewersList);
      setViewersHasMore(viewersList.length === VIEWERS_PAGE_SIZE);
      const rawReplies = rRes.data;
      const repliesList = Array.isArray(rawReplies) ? rawReplies : rawReplies?.items ?? [];
      setReplies(repliesList);
      setRepliesHasMore(repliesList.length === VIEWERS_PAGE_SIZE);
    } catch { setViewers([]); setReplies([]); }
    setViewersLoading(false);
  }

  // Charge la page suivante de l'onglet actif (views ou replies) — pages
  // indépendantes puisque chaque onglet a son propre endpoint/curseur.
  const loadMoreViewersOrReplies = useCallback(() => {
    if (!story || viewersLoadingMore) return;
    if (viewersTab === 'views') {
      if (!viewersHasMore) return;
      setViewersLoadingMore(true);
      const nextPage = viewersPage + 1;
      apiClient.get<any>(`${Endpoints.stories.viewers(story.id)}?page=${nextPage}&limit=${VIEWERS_PAGE_SIZE}`)
        .then(res => {
          const raw = res.data;
          const list = Array.isArray(raw) ? raw : raw?.items ?? [];
          setViewers(prev => [...prev, ...list]);
          setViewersHasMore(list.length === VIEWERS_PAGE_SIZE);
          setViewersPage(nextPage);
        })
        .catch(() => setViewersHasMore(false))
        .finally(() => setViewersLoadingMore(false));
    } else {
      if (!repliesHasMore) return;
      setViewersLoadingMore(true);
      const nextPage = repliesPage + 1;
      apiClient.get<any>(`${Endpoints.stories.replies(story.id)}?page=${nextPage}&limit=${VIEWERS_PAGE_SIZE}`)
        .then(res => {
          const raw = res.data;
          const list = Array.isArray(raw) ? raw : raw?.items ?? [];
          setReplies(prev => [...prev, ...list]);
          setRepliesHasMore(list.length === VIEWERS_PAGE_SIZE);
          setRepliesPage(nextPage);
        })
        .catch(() => setRepliesHasMore(false))
        .finally(() => setViewersLoadingMore(false));
    }
  }, [story, viewersTab, viewersPage, viewersHasMore, repliesPage, repliesHasMore, viewersLoadingMore]);

  useEffect(() => {
    if (!viewersOpen) return;
    const node = viewersSentinelRef.current;
    const hasMore = viewersTab === 'views' ? viewersHasMore : repliesHasMore;
    if (!node || viewersLoading || !hasMore) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMoreViewersOrReplies(); },
      { rootMargin: '100px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [viewersOpen, viewersTab, viewersLoading, viewersHasMore, repliesHasMore, loadMoreViewersOrReplies]);

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

  const timeAgo = formatTimeAgo(story.created_at);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">

      {/* Zone cliquable pour fermer (côtés) */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Container centré style story Instagram — max 500px */}
      <div
        ref={containerRef}
        className="relative z-10 w-full max-w-[500px] bg-black"
        style={{
          height: '100dvh', maxHeight: '100dvh',
          transform: swipeOffset ? `translateY(${swipeOffset}px)` : undefined,
          opacity: swipeOffset ? Math.max(1 - swipeOffset / 400, 0.3) : 1,
          transition: swipeOffset ? 'none' : 'transform 0.2s ease, opacity 0.2s ease',
        }}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
          onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)}
          onClick={e => handleMediaTap(e.clientX)}>
          {story.media_type === 'video' && story.media_url ? (
            <>
              {/* Fond flouté agrandi — comble l'espace autour d'une vidéo dont le
                  ratio ne correspond pas au cadre, sans jamais recadrer l'original
                  (voir <video> ci-dessous, en object-contain). */}
              <video src={story.media_url} className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'blur(24px)' }} muted autoPlay loop playsInline aria-hidden />
              <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.35)' }} />
              <video
                key={story.id}
                src={story.media_url}
                className="absolute inset-0 w-full h-full object-contain"
                autoPlay loop={false} playsInline muted={false}
              />
            </>
          ) : story.media_type === 'image' && story.media_url ? (
            <>
              <img src={story.media_url} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'blur(24px)' }} />
              <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.35)' }} />
              <img key={story.id} src={story.media_url} alt="" className="absolute inset-0 w-full h-full object-contain" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center px-8"
              style={{ background: story.background_color ?? 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
              {story.caption && (
                <p className="text-white text-center leading-snug whitespace-pre-line" style={{
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
            audioName={story.audio_name}
            playing={!paused}
            isVoice={story.media_type === 'voice'}
            blocked={audioBlocked}
            onRetry={retryStoryAudio}
          />
        )}

        {/* Caption — avec font_style pour media_type text, identique mobile */}
        {story.caption && story.media_type !== 'text' && (
          <div className="absolute inset-x-0 px-5 z-20 pointer-events-none" style={{ bottom: story.audio_url ? 96 : 56 }}>
            <div className="inline-block rounded-2xl px-4 py-2.5" style={{ background: 'rgba(0,0,0,0.55)' }}>
              <p className="text-white text-sm leading-relaxed whitespace-pre-line">{story.caption}</p>
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

        {/* Like + Sauvegarder — visibles pour les non-propriétaires, au-dessus
            de l'input de réponse (voir plus bas). z-40 (> z-30 de l'input)
            + marge de 96px pour ne jamais être recouverts par sa zone de
            clic, qui s'étend physiquement au-delà de son ancrage bottom-0. */}
        {!isOwn && (
          <div className="absolute right-5 z-40 flex items-center gap-2" style={{ bottom: 96 }}>
            <button onClick={handleToggleSave} disabled={saving}
              className="flex items-center justify-center p-2 rounded-full transition-all"
              style={{ background: saved ? 'rgba(123,63,242,0.3)' : 'rgba(0,0,0,0.55)' }}>
              <Bookmark size={16} fill={saved ? '#a78bfa' : 'none'} style={{ color: saved ? '#a78bfa' : '#fff' }} />
            </button>
            <button onClick={handleToggleLike}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full transition-all"
              style={{ background: liked ? 'rgba(224,56,154,0.3)' : 'rgba(0,0,0,0.55)' }}>
              <Heart size={16} fill={liked ? '#E0389A' : 'none'} className={liked ? '' : 'text-white'} style={liked ? { color: '#E0389A' } : undefined} />
              {likeCount > 0 && <span className="text-white text-xs font-bold">{likeCount}</span>}
            </button>
          </div>
        )}

        {/* Pluie de cœurs + avatars des derniers likers — story très aimée (≥1000 likes) */}
        <HeartRain active={!paused} likeCount={likeCount} contentId={story.id} />
        <LikeNamesFeed active={!paused} likeCount={likeCount} contentId={story.id} kind="story" />

        {/* Double-tap heart — animation ponctuelle, identique mobile */}
        {showHeartAnim && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <Heart size={96} fill="#E0389A" style={{ color: '#E0389A', animation: 'story-heart-pop 0.8s ease-out' }} />
            <style>{`
              @keyframes story-heart-pop {
                0%   { transform: scale(0.4); opacity: 0; }
                30%  { transform: scale(1.15); opacity: 1; }
                50%  { transform: scale(1); opacity: 1; }
                100% { transform: scale(1); opacity: 0; }
              }
            `}</style>
          </div>
        )}

        {/* Tap zones — laisse une bande basse libre pour l'input de réponse */}
        <button className="absolute left-0 top-0 w-1/3 z-10 opacity-0" style={{ bottom: 64 }} onClick={goPrev} />
        <button className="absolute right-0 top-0 w-1/3 z-10 opacity-0" style={{ bottom: 64 }} onClick={goNext} />

        {/* Répondre à une story — input façon WhatsApp, identique mobile */}
        {!isOwn && (
          <div className="absolute bottom-0 inset-x-0 z-30 flex items-center gap-2 px-4 pb-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex-1 flex items-center gap-2 rounded-full px-4 py-2.5"
              style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <input
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                onKeyDown={e => e.key === 'Enter' && handleSendReply()}
                placeholder={`Répondre à ${author.display_name ?? author.username}…`}
                className="flex-1 bg-transparent outline-none text-white text-sm placeholder-white/50"
              />
            </div>
            {replyText.trim() ? (
              <button onClick={handleSendReply} disabled={replySending}
                className="w-10 h-10 flex items-center justify-center rounded-full shrink-0"
                style={{ background: '#7B3FF2' }}>
                {replySending ? <Spinner size="sm" /> : <Send size={16} className="text-white" />}
              </button>
            ) : (
              <button onClick={handleQuickHeartReply} disabled={replySending}
                className="w-10 h-10 flex items-center justify-center rounded-full shrink-0"
                style={{ background: 'rgba(255,255,255,0.12)' }}>
                <Heart size={18} className="text-white" />
              </button>
            )}
          </div>
        )}
        {replySent && (
          <div className="absolute bottom-16 inset-x-0 z-30 flex justify-center pointer-events-none">
            <span className="text-white text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.7)' }}>
              Message envoyé
            </span>
          </div>
        )}

        {/* Groupe précédent — avatar nommé (identique mobile), avec flèche
            de secours pour le clic direct (le viewer, centré et étroit sur
            desktop, laisse peu de place à côté du cadre pour un vrai rail
            d'avatars comme sur mobile plein écran). */}
        {groupIdx > 0 && (
          <button
            className="absolute left-3 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1"
            onClick={() => { setGroupIdx(g => g - 1); setStoryIdx(0); }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.18)' }}>
              <Avatar src={localGroups[groupIdx - 1].user.avatar_url}
                name={localGroups[groupIdx - 1].user.display_name ?? localGroups[groupIdx - 1].user.username ?? ''} size="sm" />
            </div>
            <span className="text-white text-[10px] font-semibold max-w-[64px] truncate" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              {localGroups[groupIdx - 1].user.display_name ?? localGroups[groupIdx - 1].user.username}
            </span>
          </button>
        )}
        {groupIdx < localGroups.length - 1 && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1"
            onClick={() => { setGroupIdx(g => g + 1); setStoryIdx(0); }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.18)' }}>
              <Avatar src={localGroups[groupIdx + 1].user.avatar_url}
                name={localGroups[groupIdx + 1].user.display_name ?? localGroups[groupIdx + 1].user.username ?? ''} size="sm" />
            </div>
            <span className="text-white text-[10px] font-semibold max-w-[64px] truncate" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              {localGroups[groupIdx + 1].user.display_name ?? localGroups[groupIdx + 1].user.username}
            </span>
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

        {/* Viewers + Réponses (propriétaire uniquement pour l'onglet Réponses) */}
        {viewersOpen && (
          <div className="absolute inset-0 z-40" style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => { setViewersOpen(false); setPaused(false); }}>
            <div className="absolute bottom-0 inset-x-0 rounded-t-2xl overflow-hidden"
              style={{ background: '#12121E', maxHeight: '65%' }}
              onClick={e => e.stopPropagation()}>
              <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-2" style={{ background: 'rgba(255,255,255,0.2)' }} />
              <div className="flex items-center gap-4 px-5 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <button onClick={() => setViewersTab('views')}
                  className="flex items-center gap-1.5 pb-2 text-sm font-bold"
                  style={{ color: viewersTab === 'views' ? '#fff' : 'rgba(255,255,255,0.4)',
                    borderBottom: viewersTab === 'views' ? '2px solid #7B3FF2' : '2px solid transparent' }}>
                  <Eye size={14} /> {viewers.length} vue{viewers.length !== 1 ? 's' : ''}
                </button>
                <button onClick={() => setViewersTab('replies')}
                  className="flex items-center gap-1.5 pb-2 text-sm font-bold"
                  style={{ color: viewersTab === 'replies' ? '#fff' : 'rgba(255,255,255,0.4)',
                    borderBottom: viewersTab === 'replies' ? '2px solid #7B3FF2' : '2px solid transparent' }}>
                  <MessageCircle size={14} /> {replies.length} réponse{replies.length !== 1 ? 's' : ''}
                </button>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
                {viewersLoading ? (
                  <div className="flex justify-center py-8"><Spinner size="sm" /></div>
                ) : viewersTab === 'views' ? (
                  viewers.length === 0 ? (
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
                  ))
                ) : (
                  replies.length === 0 ? (
                    <div className="flex flex-col items-center py-10 gap-2 opacity-40">
                      <MessageCircle size={32} className="text-white" />
                      <p className="text-white text-sm">Aucune réponse pour l'instant</p>
                    </div>
                  ) : replies.map((r: any) => (
                    <div key={r.id} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <button onClick={() => navigate(`/user/${encodeId(r.sender.id)}`)} className="shrink-0">
                        <Avatar src={r.sender?.avatar_url} name={r.sender?.display_name ?? r.sender?.username ?? '?'} size="sm" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{r.sender?.display_name ?? r.sender?.username}</p>
                        <p className="text-white/60 text-xs truncate">{r.content}</p>
                      </div>
                      {/* Pas de bouton appel audio/vidéo — le web n'a pas
                          (encore) de système d'appel, contrairement au
                          mobile. Seul le chat (route /messages réelle)
                          est proposé pour éviter un bouton mort. */}
                      <button onClick={() => navigate(`/messages/${encodeId(r.sender.id)}`)}
                        className="w-8 h-8 flex items-center justify-center rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <MessageCircle size={14} className="text-white" />
                      </button>
                    </div>
                  ))
                )}
                <div ref={viewersSentinelRef} />
                {viewersLoadingMore && (
                  <div className="flex justify-center py-3"><Spinner size="sm" /></div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
