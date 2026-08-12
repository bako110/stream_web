import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import { encodeId, decodeId } from '../../utils/slugId';
import {
  Heart, MessageCircle, Eye, Volume2, VolumeX, X,
  ChevronUp, ChevronDown, Lock, Play,
} from 'lucide-react';
import { publicClient } from '../../api/client';
import { Endpoints } from '../../api/endpoints';
import { Avatar } from '../../components/ui/Avatar';
import { PageLoader } from '../../components/ui/Spinner';
import { toProxiedUrl } from '../../utils/constants';
import { useAuthStore } from '../../store/authStore';
import type { Reel } from '../../types';

const PREVIEW_SECONDS = 10;
const PAGE_SIZE = 24;

export default function ExploreReelDetailPage() {
  const { id: encodedId } = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const reelId = encodedId ? decodeId(encodedId) : null;

  const [reels,   setReels]   = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [index,   setIndex]   = useState(0);
  const pageRef  = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);

  // Charge la liste (même flux que la grille) et positionne l'index sur le reel demandé.
  // Si le reel n'est pas dans la première page, on le préfixe manuellement — un lien
  // partagé/rechargement de page doit toujours pouvoir ouvrir directement ce reel précis.
  useEffect(() => {
    if (!reelId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [listRes, targetRes] = await Promise.all([
          publicClient.get<any>(`${Endpoints.reels.feed}?page=1&limit=${PAGE_SIZE}`).catch(() => null),
          publicClient.get<Reel>(Endpoints.reels.byId(reelId)).catch(() => null),
        ]);
        if (cancelled) return;
        const raw = listRes?.data;
        let items: Reel[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        hasMoreRef.current = Array.isArray(raw) ? items.length >= PAGE_SIZE : !!raw?.has_more;

        const targetIdx = items.findIndex(r => r.id === reelId);
        if (targetIdx === -1 && targetRes?.data) {
          items = [targetRes.data, ...items];
          setIndex(0);
        } else {
          setIndex(Math.max(0, targetIdx));
        }
        setReels(items);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reelId]);

  const loadMore = useCallback(async () => {
    if (!hasMoreRef.current || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    try {
      const nextPage = pageRef.current + 1;
      const res = await publicClient.get<any>(`${Endpoints.reels.feed}?page=${nextPage}&limit=${PAGE_SIZE}`);
      const raw = res.data;
      const items: Reel[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
      if (items.length === 0) { hasMoreRef.current = false; return; }
      setReels(prev => {
        const seen = new Set(prev.map(r => r.id));
        return [...prev, ...items.filter(r => !seen.has(r.id))];
      });
      pageRef.current = nextPage;
      hasMoreRef.current = Array.isArray(raw) ? items.length >= PAGE_SIZE : !!raw?.has_more;
    } catch { /* silencieux */ }
    finally { loadingMoreRef.current = false; }
  }, []);

  const current = reels[index];

  function goTo(newIndex: number) {
    if (newIndex < 0 || newIndex >= reels.length) return;
    const target = reels[newIndex];
    setIndex(newIndex);
    navigate(`/explore/reels/${encodeId(target.id)}`, { replace: true });
    if (newIndex >= reels.length - 3) loadMore();
  }

  function handleWheel(e: React.WheelEvent) {
    if (e.deltaY > 30) goTo(index + 1);
    else if (e.deltaY < -30) goTo(index - 1);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') goTo(index + 1);
      else if (e.key === 'ArrowUp') goTo(index - 1);
      else if (e.key === 'Escape') navigate('/explore/reels');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, reels.length]);

  if (!reelId) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: '#0A0812' }} onWheel={handleWheel}>
      <button onClick={() => navigate('/explore/reels')}
        className="absolute top-5 right-5 z-20 w-10 h-10 rounded-full flex items-center justify-center text-white"
        style={{ background: 'rgba(255,255,255,0.1)' }}>
        <X size={20} />
      </button>

      {/* Navigation verticale */}
      <div className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-20 flex-col gap-3">
        <button onClick={() => goTo(index - 1)} disabled={index === 0}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-30 transition-opacity"
          style={{ background: 'rgba(255,255,255,0.1)' }}>
          <ChevronUp size={20} />
        </button>
        <button onClick={() => goTo(index + 1)} disabled={index >= reels.length - 1}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-30 transition-opacity"
          style={{ background: 'rgba(255,255,255,0.1)' }}>
          <ChevronDown size={20} />
        </button>
      </div>

      {loading || !current ? (
        <PageLoader dark />
      ) : (
        <ReelStage key={current.id} reel={current} locked={!isAuthenticated} />
      )}
    </div>
  );
}

function ReelStage({ reel, locked }: { reel: Reel; locked: boolean }) {
  const navigate = useNavigate();
  const videoRef  = useRef<HTMLVideoElement>(null);
  const [muted,    setMuted]    = useState(true);
  const [gateOpen, setGateOpen] = useState(false);
  const [elapsed,  setElapsed]  = useState(0);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const videoSrc = toProxiedUrl(reel.hls_url ?? '');
  const author   = reel.author;

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoSrc) return;
    let hls: Hls | null = null;
    if (Hls.isSupported()) {
      hls = new Hls({ autoStartLoad: true });
      hls.loadSource(videoSrc);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { v.play().catch(() => {}); });
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = videoSrc;
      v.play().catch(() => {});
    }
    return () => { hls?.destroy(); };
  }, [videoSrc]);

  // Extrait limité pour un visiteur non connecté — passé PREVIEW_SECONDS, on met en
  // pause et on affiche la porte de connexion par-dessus (flou + overlay).
  useEffect(() => {
    if (!locked) return;
    setElapsed(0);
    setGateOpen(false);
    timerRef.current = setInterval(() => {
      setElapsed(e => {
        const next = e + 0.2;
        if (next >= PREVIEW_SECONDS) {
          videoRef.current?.pause();
          setGateOpen(true);
          if (timerRef.current) clearInterval(timerRef.current);
        }
        return next;
      });
    }, 200);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [locked, reel.id]);

  function goAuth(mode: 'login' | 'register') {
    const redirect = encodeURIComponent(`/explore/reels/${encodeId(reel.id)}`);
    navigate(`/auth/${mode}?redirect=${redirect}`);
  }

  const progressPct = locked ? Math.min(100, (elapsed / PREVIEW_SECONDS) * 100) : 100;

  return (
    <div className="relative h-full md:h-[92vh] w-full md:w-auto" style={{ aspectRatio: '9/16', maxWidth: '100vw' }}>
      {videoSrc ? (
        <video ref={videoRef}
          poster={reel.thumbnail_url ?? undefined}
          loop={!locked} muted={muted} playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: gateOpen ? 'blur(18px) brightness(0.5)' : 'none', transition: 'filter 0.4s ease' }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#5B2EC4,#0A0812)' }}>
          <Play size={40} className="text-white/40" />
        </div>
      )}

      {/* Barre de progression extrait */}
      {locked && !gateOpen && (
        <div className="absolute top-0 left-0 right-0 h-1 z-10" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <div className="h-full transition-[width] duration-200 ease-linear" style={{ width: `${progressPct}%`, background: 'var(--ex-amber, #9B65F5)' }} />
        </div>
      )}

      {/* Infos auteur + caption */}
      {!gateOpen && (
        <div className="absolute bottom-0 left-0 right-0 p-5" style={{ background: 'linear-gradient(to top, rgba(10,8,18,0.85), transparent 60%)' }}>
          <div className="flex items-center gap-2.5 mb-2">
            <Avatar src={author?.avatar_url} name={author?.display_name ?? author?.username ?? '?'} size="sm" />
            <span className="text-white font-semibold text-sm">{author?.display_name ?? author?.username}</span>
          </div>
          {reel.caption && <p className="text-white/85 text-sm leading-snug line-clamp-2 mb-3">{reel.caption}</p>}
          <div className="flex items-center gap-4 text-white/70 text-xs">
            <span className="flex items-center gap-1"><Heart size={13} />{reel.like_count}</span>
            <span className="flex items-center gap-1"><MessageCircle size={13} />{reel.comment_count}</span>
            <span className="flex items-center gap-1"><Eye size={13} />{reel.view_count}</span>
          </div>
        </div>
      )}

      {videoSrc && !locked && (
        <button onClick={() => { if (videoRef.current) { videoRef.current.muted = !muted; setMuted(v => !v); } }}
          className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center text-white z-10"
          style={{ background: 'rgba(255,255,255,0.12)' }}>
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      )}

      {/* Porte de connexion */}
      {gateOpen && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 z-10">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5" style={{ background: 'rgba(155,101,245,0.15)', border: '1px solid rgba(155,101,245,0.3)' }}>
            <Lock size={22} style={{ color: 'var(--ex-amber, #9B65F5)' }} />
          </div>
          <h2 className="text-white font-black text-2xl mb-2" style={{ fontFamily: "'Anton','Inter',sans-serif", textTransform: 'uppercase' }}>
            La suite t'attend
          </h2>
          <p className="text-white/65 text-sm max-w-xs mb-7 leading-relaxed">
            Connecte-toi pour continuer à regarder ce reel et débloquer tout GoFolyX.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button onClick={() => goAuth('register')}
              className="w-full py-3.5 rounded-full font-bold text-sm"
              style={{ background: 'var(--ex-amber, #9B65F5)', color: '#fff' }}>
              Créer un compte gratuit
            </button>
            <button onClick={() => goAuth('login')}
              className="w-full py-3.5 rounded-full font-medium text-sm text-white"
              style={{ border: '1px solid rgba(255,255,255,0.25)' }}>
              J'ai déjà un compte
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
