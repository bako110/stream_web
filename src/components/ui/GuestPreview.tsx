import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Hls from 'hls.js';
import { RoundLogo } from './RoundLogo';
import { Lightbox } from './Lightbox';
import { Clapperboard, MessageCircle, Radio, Users, Coins } from 'lucide-react';
import { renderTextWithLinks } from './RichText';
import { toProxiedUrl } from '../../utils/constants';
import { PriceWithLocal } from './PriceWithLocal';

// Portion de la vidéo lue avant coupure — au-delà, l'overlay de connexion
// s'affiche automatiquement pour inciter à créer un compte.
const PREVIEW_WATCH_RATIO = 0.3;

export type GuestPreviewType = 'post' | 'reel' | 'event' | 'concert' | 'film' | 'serie'| 'communauty';

interface GuestPreviewProps {
  type: GuestPreviewType;
  thumbnail?: string | null;
  /** URL HLS — si fournie pour un reel, la vidéo est lue jusqu'à 30% puis coupée avec l'invite de connexion. */
  videoUrl?: string | null;
  /** Plusieurs images (post multi-photos, galerie d'event) — glisser pour naviguer. */
  thumbnails?: (string | null | undefined)[] | null;
  title?: string | null;
  body?: string | null;
  author?: {
    avatar_url?: string | null;
    display_name?: string | null;
    username?: string | null;
    is_verified?: boolean;
  } | null;
  date?: string | null;
  location?: string | null;
  attendees?: number | null;
  ticketPrice?: number | null;
  likeCount?: number;
  commentCount?: number;
  viewCount?: number;
  isLive?: boolean;
}

const TYPE_CONFIG: Record<GuestPreviewType, { label: string; cta: string; icon: React.ReactNode }> = {
  post: {
    label: 'Post',
    cta: 'Connecte-toi pour voir le post complet',
    icon: (
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5" stroke="white" strokeWidth="1.3" fill="none"/>
        <path d="M4 6h4M6 4v4" stroke="white" strokeWidth="1.3"/>
      </svg>
    ),
  },
  reel: {
    label: 'Réel',
    cta: 'Connecte-toi pour regarder ce réel',
    icon: (
      <svg width="9" height="9" viewBox="0 0 12 12" fill="white">
        <path d="M3 2l7 4-7 4V2z" fill="white"/>
      </svg>
    ),
  },
  event: {
    label: 'Event',
    cta: 'Connecte-toi pour voir les détails et participer',
    icon: (
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="white" strokeWidth="1.3" fill="none"/>
        <path d="M4 1v2M8 1v2M1 5h10" stroke="white" strokeWidth="1.3"/>
      </svg>
    ),
  },
  concert: {
    label: 'Concert',
    cta: 'Connecte-toi pour accéder au concert',
    icon: (
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
        <path d="M7 2v8M5 4v4M3 5v2M9 3v6" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  film: {
    label: 'Film',
    cta: 'Connecte-toi pour regarder ce film',
    icon: (
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="white" strokeWidth="1.3" fill="none"/>
        <path d="M1 4h10M4 1v3M4 8v3" stroke="white" strokeWidth="1.1"/>
      </svg>
    ),
  },
  serie: {
    label: 'Série',
    cta: 'Connecte-toi pour regarder cette série',
    icon: (
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="white" strokeWidth="1.3" fill="none"/>
        <path d="M1 4h10M4 1v3M4 8v3" stroke="white" strokeWidth="1.1"/>
      </svg>
    ),
  },
  communauty: {
    label: 'Communauté',
    cta: 'Connecte-toi pour rejoindre la communauté',
    icon: (
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
        <circle cx="4" cy="4" r="1.8" stroke="white" strokeWidth="1.2" fill="none"/>
        <circle cx="8.5" cy="4" r="1.8" stroke="white" strokeWidth="1.2" fill="none"/>
        <path d="M1 10.5c0-2.2 1.6-3.5 3.5-3.5S8 8.3 8 10.5M6 10.5c0-1.8 1.3-2.8 2.5-2.8s2.5 1 2.5 2.8" stroke="white" strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    ),
  },
};

const WHY_ITEMS = [
  { icon: <Clapperboard size={19} />, title: 'Films, séries & concerts en direct', desc: 'Regarde en entier, en HD, avec le son.' },
  { icon: <MessageCircle size={19} />, title: 'Réagis et échange', desc: 'Like, commente, partage et discute avec les créateurs.' },
  { icon: <Radio size={19} />, title: 'Vis les lives', desc: 'Lives, défis 1 vs 1 et tournois en temps réel.' },
  { icon: <Users size={19} />, title: 'Rejoins des communautés', desc: 'Retrouve des gens qui partagent tes passions.' },
  { icon: <Coins size={19} />, title: 'Crée et gagne', desc: 'Publie tes reels, vends des billets, reçois des GoGold.' },
];

const isMedia = (type: GuestPreviewType) => type === 'reel' || type === 'concert' || type === 'film' || type === 'serie';

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.0', '')}k`;
  return String(n);
}

function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = new Date(to).getTime() - now;
  if (!Number.isFinite(diff) || diff <= 0) return null;
  const cells: [number, string][] = [
    [Math.floor(diff / 864e5), 'jours'],
    [Math.floor((diff % 864e5) / 36e5), 'heures'],
    [Math.floor((diff % 36e5) / 6e4), 'min'],
    [Math.floor((diff % 6e4) / 1e3), 'sec'],
  ];
  return (
    <div className="gp-count" aria-label="Compte à rebours">
      {cells.map(([n, l]) => (
        <div key={l} className="gp-count-cell">
          <span key={n} className="gp-count-num">{String(n).padStart(2, '0')}</span>
          <span className="gp-count-lbl">{l}</span>
        </div>
      ))}
    </div>
  );
}

export function GuestPreview({
  type, thumbnail, videoUrl, thumbnails, title, body, author, date,
  location, attendees, ticketPrice, likeCount, commentCount, viewCount, isLive,
}: GuestPreviewProps) {
  const cfg = TYPE_CONFIG[type];
  const redirectParam = encodeURIComponent(window.location.pathname + window.location.search);
  const [showPlayPrompt, setShowPlayPrompt] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [previewEnded, setPreviewEnded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0); // 0→1 sur la portion visionnable (30%)

  // Lecture HLS jusqu'à PREVIEW_WATCH_RATIO de la durée, en boucle sur cette portion,
  // puis coupure définitive avec ouverture de l'invite de connexion.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoUrl || type !== 'reel') return;

    const src = toProxiedUrl(videoUrl);
    let cutoff = 0;

    const onTimeUpdate = () => {
      if (cutoff > 0) setPreviewProgress(Math.min(1, v.currentTime / cutoff));
      if (cutoff > 0 && v.currentTime >= cutoff) {
        v.pause();
        setPreviewEnded(true);
        setShowPlayPrompt(true);
      }
    };
    const onLoadedMetadata = () => {
      cutoff = v.duration * PREVIEW_WATCH_RATIO;
    };
    // Mobile : l'autoplay avec son est refusé hors geste utilisateur → on retombe sur
    // une lecture muette (autorisée), l'utilisateur réactive le son d'un tap.
    const playMuted = () => {
      v.muted = false;
      setMuted(false);
      v.play().catch(() => {
        v.muted = true;
        setMuted(true);
        v.play().catch(() => {});
      });
    };
    const onPlaying = () => setVideoReady(true);
    v.addEventListener('playing', onPlaying);

    v.addEventListener('loadedmetadata', onLoadedMetadata);
    v.addEventListener('timeupdate', onTimeUpdate);

    // MP4 direct (nouveaux reels) : lecture native, pas de hls.js — sinon
    // hls.js échouerait silencieusement à parser un fichier qui n'est pas
    // un manifest .m3u8.
    const isHls = src.includes('.m3u8') || src.includes('/hls/');
    if (!isHls) {
      v.src = src;
      v.addEventListener('loadedmetadata', playMuted, { once: true });
    } else if (Hls.isSupported()) {
      const hls = new Hls({ autoStartLoad: true, maxBufferLength: 15 });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(v);
      hls.once(Hls.Events.MANIFEST_PARSED, playMuted);
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = src;
      v.addEventListener('loadedmetadata', playMuted, { once: true });
    }

    return () => {
      v.removeEventListener('loadedmetadata', onLoadedMetadata);
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('playing', onPlaying);
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [videoUrl, type]);

  // Tap sur lecture (geste utilisateur) : démarre l'aperçu avec le son ; reel sans vidéo / aperçu fini → invite de connexion
  function handlePlayTap() {
    const v = videoRef.current;
    if (type === 'reel' && videoUrl && v && !previewEnded) {
      v.muted = false;
      setMuted(false);
      v.play().catch(() => { v.muted = true; setMuted(true); v.play().catch(() => setShowPlayPrompt(true)); });
      return;
    }
    setShowPlayPrompt(true);
  }
  function unmute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setMuted(false);
  }

  const authorName = author?.display_name ?? author?.username ?? null;
  const initials   = authorName ? authorName[0].toUpperCase() : '?';

  // Normalise en une liste d'images sans doublons ni valeurs vides
  const images = Array.from(new Set(
    (thumbnails?.length ? thumbnails : [thumbnail]).filter((u): u is string => !!u),
  ));
  const [slide, setSlide] = useState(0);
  const dragStartX  = useRef<number | null>(null);
  const isDragging  = useRef(false);
  const justDragged = useRef(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoPaused, setAutoPaused] = useState(false);

  function goToSlide(i: number) {
    const n = images.length;
    if (n === 0) return;
    setSlide(((i % n) + n) % n);
  }

  // Pause l'auto-défilement pendant une interaction manuelle, reprend après 5s d'inactivité
  function pauseAuto() {
    setAutoPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setAutoPaused(false), 5000);
  }

  function dragStart(x: number) {
    if (images.length <= 1) return;
    isDragging.current = true;
    dragStartX.current = x;
    pauseAuto();
  }
  function dragEnd(x: number) {
    if (!isDragging.current || dragStartX.current == null) return;
    isDragging.current = false;
    const delta = x - dragStartX.current;
    dragStartX.current = null;
    if (Math.abs(delta) < 40) return;
    justDragged.current = true;
    setTimeout(() => { justDragged.current = false; }, 0);
    goToSlide(slide + (delta < 0 ? 1 : -1));
  }

  function onTouchStart(e: React.TouchEvent) { dragStart(e.touches[0].clientX); }
  function onTouchEnd(e: React.TouchEvent)   { dragEnd(e.changedTouches[0].clientX); }
  function onMouseDown(e: React.MouseEvent)  { dragStart(e.clientX); }
  function onMouseUp(e: React.MouseEvent)    { dragEnd(e.clientX); }

  // Auto-défilement en boucle, toutes les 4s, sauf pendant/juste après une interaction manuelle
  useEffect(() => {
    if (images.length <= 1 || autoPaused) return;
    const iv = setInterval(() => setSlide(s => (s + 1) % images.length), 4000);
    return () => clearInterval(iv);
  }, [images.length, autoPaused]);

  // Compteurs à zéro non affichés : rien d'imposé à l'écran quand il n'y a rien à montrer.
  const showLikes    = (likeCount ?? 0) > 0;
  const showComments = (commentCount ?? 0) > 0;
  const showViews    = (viewCount ?? 0) > 0;
  const hasStats     = showLikes || showComments || showViews;
  const isReel   = type === 'reel';
  // Description longue : repliée à 5 lignes avec « Voir plus » (plus d'overlay noir plein écran).
  const longBody = (body?.length ?? 0) > 280;
  const [bodyOpen, setBodyOpen] = useState(false); // bottom sheet « description complète »
  useEffect(() => {
    if (!bodyOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setBodyOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bodyOpen]);

  return (
    <>
      <style>{`
        /* ── Page — thème de l'app (clair/sombre), contenu lisible sous le visuel ── */
        .gp-page {
          overflow-x: clip;
          min-height: 100dvh;
          background: var(--bg);
          color: var(--text-primary);
          padding-bottom: calc(40px + env(safe-area-inset-bottom, 0px));
        }
        /* Toujours en plein écran, par-dessus tout layout parent (sidebar, topbar, bottom nav de
           l'app) : un invité n'a pas à voir la navigation des membres, quelle que soit la route. */
        .gp-page.is-fullscreen {
          position: fixed; inset: 0; z-index: 60; min-height: 0; overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .gp-bar {
          position: sticky; top: calc(0.5rem + env(safe-area-inset-top, 0px)); z-index: 30;
          margin: 0.5rem auto 0;
          width: calc(100% - 1rem); max-width: 760px;
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 8px 8px 8px 14px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--surface) 88%, transparent);
          -webkit-backdrop-filter: blur(14px) saturate(160%); backdrop-filter: blur(14px) saturate(160%);
          border: 1px solid var(--border);
          box-shadow: 0 1px 2px rgba(11,11,16,0.05), 0 8px 20px rgba(11,11,16,0.08), 0 20px 40px -10px rgba(11,11,16,0.12);
        }
        .gp-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; min-width: 0; }
        .gp-logo-text { font-size: 16px; font-weight: 800; letter-spacing: -0.4px; color: var(--text-primary); }
        .gp-bar-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .gp-pillbtn {
          display: inline-flex; align-items: center; justify-content: center;
          height: 38px; padding: 0 16px; border-radius: 999px;
          font-size: 13px; font-weight: 700; text-decoration: none; white-space: nowrap;
          transition: transform .18s, box-shadow .18s, background .18s;
        }
        .gp-pillbtn-ghost { color: var(--text-primary); border: 1px solid var(--border); background: transparent; }
        .gp-pillbtn-ghost:hover { background: var(--bg-secondary); }
        .gp-pillbtn-solid { color: #fff; background: linear-gradient(135deg,#7B3FF2,#5B2EC4); box-shadow: 0 4px 14px rgba(123,63,242,0.35); }
        .gp-pillbtn-solid:hover { transform: translateY(-1px); }

        /* ── Petits téléphones — lisibilité d'abord ── */
        @media (max-width: 480px) {
          .gp-bar { padding: 6px 6px 6px 12px; }
          .gp-pillbtn { height: 40px; padding: 0 14px; font-size: 13px; }
          .gp-hero { border-radius: 22px; }
          .gp-hero:not(.is-reel) { aspect-ratio: 4 / 3; }
          .gp-hero-play { width: 60px; height: 60px; }
          .gp-info, .gp-why { border-radius: 22px; }
          .gp-info { padding: 18px 16px; }
          .gp-why { padding: 22px 16px; }
          .gp-title { font-size: 1.45rem; line-height: 1.25; }
          .gp-body { font-size: 16px; line-height: 1.65; }
          .gp-pill, .gp-stat { padding: 7px 12px; }
          .gp-why-item { padding: 11px 12px; border-radius: 18px; }
          .gp-why-item strong { font-size: 14px; }
          .gp-why-item span > span { font-size: 12.5px; }
        }
        @media (max-width: 359px) {
          .gp-logo-text { display: none; }
          .gp-pillbtn { padding: 0 12px; }
        }

        .gp-main { width: 100%; max-width: 760px; margin: 0 auto; padding: 16px 0.5rem 0; }
        @media (min-width: 640px) { .gp-main { padding: 24px 1rem 0; } }

        /* ── Visuel — seulement les CONTRÔLES (lecture, indicateurs, progression) sont dessus ── */
        .gp-hero {
          position: relative; overflow: hidden;
          border-radius: 28px;
          background: #0b0712;
          border: 1px solid var(--border);
          box-shadow: 0 2px 6px rgba(11,11,16,0.06), 0 18px 40px -12px rgba(11,11,16,0.25);
          touch-action: pan-y;
          aspect-ratio: 16 / 10;
        }
        .gp-hero.is-reel {
          --gp-reel-h: 74vh; --gp-reel-h: 74dvh;
          aspect-ratio: 9 / 16; margin: 0 auto;
          width: min(100%, calc(var(--gp-reel-h) * 9 / 16));
        }
        @media (min-width: 640px) { .gp-hero.is-reel { --gp-reel-h: 72vh; --gp-reel-h: 72dvh; } }
        .gp-hero-track { display: flex; width: 100%; height: 100%; transition: transform .35s cubic-bezier(0.22,1,0.36,1); }
        .gp-hero-slide-wrap { position: relative; width: 100%; height: 100%; flex-shrink: 0; overflow: hidden; }
        .gp-hero-slide-bg {
          position: absolute; inset: -6%; width: 112%; height: 112%; object-fit: cover;
          filter: blur(36px) saturate(1.3) brightness(0.6); transform: scale(1.1);
        }
        .gp-hero-slide { position: relative; width: 100%; height: 100%; object-fit: contain; display: block; }
        .gp-hero-dots {
          position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%);
          z-index: 6; display: flex; gap: 6px; padding: 6px 10px; border-radius: 999px;
          background: rgba(0,0,0,0.35); backdrop-filter: blur(8px);
        }
        .gp-hero-count {
          position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); z-index: 6;
          padding: 5px 14px; border-radius: 999px; font-size: 12px; font-weight: 800; letter-spacing: .04em;
          color: #fff; background: rgba(0,0,0,0.5); backdrop-filter: blur(8px);
        }
        .gp-hero-dot {
          width: 20px; height: 3px; border-radius: 3px; background: rgba(255,255,255,0.35);
          border: none; padding: 0; cursor: pointer; overflow: hidden; position: relative;
        }
        .gp-hero-dot.active { background: rgba(255,255,255,0.35); }
        .gp-hero-dot.active::after {
          content: ''; position: absolute; inset: 0; background: #fff;
          animation: gp-dot-fill 4s linear forwards;
        }
        @keyframes gp-dot-fill { from { transform: scaleX(0); transform-origin: left; } to { transform: scaleX(1); transform-origin: left; } }
        .gp-hero-play {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 5;
          width: 72px; height: 72px; border-radius: 50%;
          background: rgba(0,0,0,0.45); border: 2px solid rgba(255,255,255,0.7);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          transition: transform .2s, background .2s;
        }
        .gp-hero-play:hover { transform: translate(-50%, -50%) scale(1.08); background: rgba(0,0,0,0.6); }
        .gp-hero-expand {
          position: absolute; top: 12px; right: 12px; z-index: 6; width: 38px; height: 38px; border-radius: 50%;
          background: rgba(0,0,0,0.45); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.25);
          display: flex; align-items: center; justify-content: center; cursor: pointer;
        }
        .gp-hero-expand:hover { background: rgba(0,0,0,0.65); }
        .gp-preview-progress { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: rgba(255,255,255,0.25); z-index: 6; }
        .gp-preview-progress-fill { height: 100%; background: #fff; transition: width .2s linear; }
        .gp-empty-hero { position: absolute; inset: 0; background: linear-gradient(135deg,#1a0533 0%,#3d1478 45%,#7B3FF2 70%,#0A0010 100%); }

        /* ── Carte d'infos — sous le visuel, texte sur fond uni ── */
        .gp-info {
          margin-top: 14px; padding: 22px 20px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 28px; box-shadow: 0 1px 2px rgba(11,11,16,0.04), 0 8px 24px rgba(11,11,16,0.05);
        }
        @media (min-width: 640px) { .gp-info { padding: 28px 28px; } }
        .gp-badges { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
        .gp-badge {
          display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 999px;
          font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
        }
        .gp-badge-type { background: rgba(123,63,242,0.12); color: #7B3FF2; }
        .gp-badge-type svg path, .gp-badge-type svg circle, .gp-badge-type svg rect { stroke: currentColor; }
        .gp-badge-live { background: #EF4444; color: #fff; }
        .gp-dot { width: 5px; height: 5px; border-radius: 50%; background: #fff; animation: gp-pulse 1.1s ease-in-out infinite; }
        @keyframes gp-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.4; transform:scale(.7); } }

        .gp-title { font-size: clamp(22px, 5vw, 32px); overflow-wrap: anywhere; font-weight: 900; line-height: 1.2; letter-spacing: -0.02em; color: var(--text-primary); margin: 0 0 14px; word-break: break-word; }
        .gp-author { display: flex; align-items: center; gap: 10px; }
        .gp-avatar {
          width: 40px; height: 40px; border-radius: 50%; overflow: hidden; flex-shrink: 0;
          background: linear-gradient(135deg,#7B3FF2,#A855F7); color: #fff; font-weight: 800; font-size: 15px;
          display: flex; align-items: center; justify-content: center;
        }
        .gp-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .gp-author-text { min-width: 0; }
        .gp-author-name { display: flex; align-items: center; gap: 5px; font-size: 14px; font-weight: 800; color: var(--text-primary); }
        .gp-verified { width: 14px; height: 14px; border-radius: 50%; background: #7B3FF2; display: inline-flex; align-items: center; justify-content: center; }
        .gp-date { font-size: 12px; color: var(--text-tertiary); font-weight: 500; }

        .gp-stats { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
        .gp-stat {
          display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px;
          background: var(--bg-secondary); color: var(--text-secondary); font-size: 13px; font-weight: 700;
        }
        .gp-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .gp-pill {
          display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 16px;
          max-width: 100%; min-width: 0; overflow-wrap: anywhere; line-height: 1.35;
          background: var(--bg-secondary); color: var(--text-secondary); font-size: 13px; font-weight: 600;
        }
        .gp-pill-accent { background: rgba(123,63,242,0.12); color: #7B3FF2; font-weight: 700; }

        .gp-divider { height: 1px; background: var(--border); margin: 18px 0; }
        .gp-body { font-size: 15.5px; line-height: 1.7; color: var(--text-primary); white-space: pre-wrap; word-break: break-word; margin: 0; }
        .gp-body.is-clamped { display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }
        .gp-body a { color: var(--primary); text-decoration: underline; font-weight: 600; }
        .gp-body-more { margin-top: 8px; font-size: 13px; font-weight: 700; color: var(--primary); background: none; border: none; padding: 0; cursor: pointer; }

        .gp-sheet-back { position: fixed; inset: 0; z-index: 1050; background: rgba(0,0,0,0.5); backdrop-filter: blur(3px); display: flex; align-items: flex-end; justify-content: center; animation: gp-fade-in .2s ease; }
        .gp-sheet {
          width: 100%; max-width: 640px; max-height: 82dvh; display: flex; flex-direction: column;
          background: var(--surface); border-radius: 28px 28px 0 0; border: 1px solid var(--border); border-bottom: none;
          box-shadow: 0 -20px 60px rgba(0,0,0,0.3); animation: gp-sheet-up .28s cubic-bezier(.22,1,.36,1);
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        @keyframes gp-sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .gp-sheet-handle { width: 40px; height: 4px; border-radius: 4px; background: var(--border); margin: 10px auto 2px; flex-shrink: 0; }
        .gp-sheet-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 18px 12px 22px; flex-shrink: 0; border-bottom: 1px solid var(--border); }
        .gp-sheet-title { font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .gp-sheet-close { width: 34px; height: 34px; border-radius: 50%; border: none; background: var(--bg-secondary); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
        .gp-sheet-body { overflow-y: auto; padding: 18px 22px 26px; -webkit-overflow-scrolling: touch; }

        /* ── Pourquoi rejoindre ── */
        .gp-why {
          margin-top: 14px; padding: 26px 22px; border-radius: 28px; color: #fff;
          background: radial-gradient(120% 100% at 0% 0%, #8b4dff 0%, #5B2EC4 55%, #2a1068 100%);
          box-shadow: 0 18px 40px -12px rgba(91,46,196,0.5);
        }
        .gp-why-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; opacity: .75; margin: 0 0 8px; }
        .gp-why-title { font-size: clamp(20px, 4.6vw, 26px); font-weight: 900; line-height: 1.2; letter-spacing: -0.02em; margin: 0 0 8px; }
        .gp-why-sub { font-size: 14px; opacity: .85; margin: 0 0 18px; }
        .gp-why-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
        @media (min-width: 640px) { .gp-why-list { grid-template-columns: 1fr 1fr; } }
        .gp-why-item {
          display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 20px;
          background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.14);
        }
        .gp-why-ico { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 19px; background: rgba(255,255,255,0.16); }
        .gp-why-item strong { display: block; font-size: 14px; font-weight: 800; }
        .gp-why-item span > span { display: block; font-size: 12px; opacity: .8; line-height: 1.4; margin-top: 1px; }
        .gp-why-foot { margin: 16px 0 0; text-align: center; font-size: 12px; font-weight: 700; opacity: .85; }

        /* Overlay « contenu réservé aux membres » (inchangé : modale sombre plein écran) */
        .gp-lock-overlay {
          position: fixed; inset: 0; z-index: 1100; display: flex; flex-direction: column;
          align-items: center; justify-content: safe center; text-align: center; padding: 28px 20px calc(28px + env(safe-area-inset-bottom, 0px));
          background: rgba(8,3,16,0.94); backdrop-filter: blur(18px); overflow-y: auto; overflow-x: hidden;
          animation: gp-fade-in .25s ease;
        }
        @keyframes gp-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gp-lock-pop { 0% { transform: scale(.6); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .gp-lock-glow {
          position: absolute; width: 420px; height: 420px; border-radius: 50%; top: 50%; left: 50%;
          transform: translate(-50%,-60%); background: radial-gradient(circle, rgba(123,63,242,0.45), transparent 65%);
          pointer-events: none;
        }
        .gp-lock-badge {
          position: relative; display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 999px;
          font-size: 11px; font-weight: 700; color: #E8D5FF; background: rgba(123,63,242,0.25);
          border: 1px solid rgba(168,85,247,0.4); margin-bottom: 22px;
        }
        .gp-lock-icon {
          position: relative; width: 76px; height: 76px; border-radius: 50%; margin-bottom: 20px;
          background: linear-gradient(135deg,#7B3FF2,#A855F7); display: flex; align-items: center; justify-content: center;
          box-shadow: 0 12px 40px rgba(123,63,242,0.55); animation: gp-lock-pop .4s cubic-bezier(.2,1.4,.4,1) both;
        }
        .gp-lock-title { position: relative; font-size: clamp(22px, 6.5vw, 26px); font-weight: 900; letter-spacing: -0.5px; color: #fff; margin: 0 0 10px; }
        .gp-lock-sub { position: relative; max-width: 360px; font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.6); margin: 0 0 26px; }
        .gp-lock-btns { position: relative; display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 320px; margin-bottom: 22px; }
        .gp-lock-btn-primary {
          display: flex; align-items: center; justify-content: center; gap: 8px; padding: 15px 20px; border-radius: 999px;
          font-size: 15px; font-weight: 800; color: #fff; text-decoration: none;
          background: linear-gradient(135deg,#7B3FF2,#A855F7); box-shadow: 0 10px 30px rgba(123,63,242,0.5);
          transition: transform .18s, box-shadow .18s;
        }
        .gp-lock-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(123,63,242,0.6); }
        .gp-lock-btn-ghost {
          display: flex; align-items: center; justify-content: center; padding: 14px 20px; border-radius: 999px;
          font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.85); text-decoration: none;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.16);
        }
        .gp-lock-btn-ghost:hover { background: rgba(255,255,255,0.12); }
        .gp-lock-perks { position: relative; display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }
        .gp-lock-perk { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5); }

        /* ═══ Refonte : couleur + mouvement ═══ */
        @keyframes gp-drop { from { opacity: 0; transform: translateY(-22px); } to { opacity: 1; transform: none; } }
        @keyframes gp-rise { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: none; } }
        @keyframes gp-reveal { from { opacity: 0; transform: scale(.96) translateY(22px); } to { opacity: 1; transform: none; } }
        @keyframes gp-pop { from { opacity: 0; transform: scale(.5); } to { opacity: 1; transform: none; } }
        @keyframes gp-drift-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(110px,70px) scale(1.2); } }
        @keyframes gp-drift-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-90px,80px) scale(.85); } }
        @keyframes gp-hue { 0% { background-position: 0% 50%; } 100% { background-position: 300% 50%; } }
        @keyframes gp-shine { 0% { transform: translateX(-120%); } 35%,100% { transform: translateX(120%); } }
        @keyframes gp-sheen { 0% { background-position: 130% 0; } 40%,100% { background-position: -80% 0; } }
        @keyframes gp-kb { from { transform: scale(1); } to { transform: scale(1.07); } }
        @keyframes gp-ring { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,.5); } 70%,100% { box-shadow: 0 0 0 20px rgba(255,255,255,0); } }
        @keyframes gp-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes gp-spin { to { transform: rotate(360deg); } }
        @keyframes gp-shimmer { from { background-position: 100% 0; } to { background-position: -150% 0; } }
        @keyframes gp-dock-in { from { opacity: 0; transform: translate(-50%, 40px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes gp-glowpulse { 0%,100% { opacity: .8; transform: translate(-50%,-60%) scale(1); } 50% { opacity: 1; transform: translate(-50%,-60%) scale(1.15); } }

        /* Fond : halos qui derivent */
        .gp-page { isolation: isolate; }
        .gp-page::before, .gp-page::after { content: ''; position: fixed; z-index: -1; pointer-events: none; border-radius: 50%; filter: blur(90px); }
        .gp-page::before { width: 460px; height: 460px; top: -100px; left: -140px; background: #7B3FF2; opacity: .2; animation: gp-drift-a 22s ease-in-out infinite; }
        .gp-page::after  { width: 380px; height: 380px; bottom: -120px; right: -120px; background: #EC4899; opacity: .14; animation: gp-drift-b 26s ease-in-out infinite; }

        /* Barre du haut : tombe, contour degrade vivant, bouton avec reflet */
        .gp-bar { animation: gp-drop .8s cubic-bezier(.16,1,.3,1) both; }
        .gp-bar::before {
          content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1.5px; pointer-events: none;
          background: linear-gradient(100deg,#7B3FF2,#EC4899,#F59E0B,#7B3FF2,#EC4899) 0% 50% / 300% 100%;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor;
                  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
          opacity: .5; animation: gp-hue 9s linear infinite;
        }
        .gp-logo { transition: transform .3s cubic-bezier(.16,1,.3,1); }
        .gp-logo:hover { transform: scale(1.05); }
        .gp-pillbtn { position: relative; overflow: hidden; }
        .gp-pillbtn-ghost:hover { border-color: #7B3FF2; color: #7B3FF2; transform: translateY(-1px); }
        .gp-pillbtn-solid::before { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,.35) 50%, transparent 70%); transform: translateX(-120%); animation: gp-shine 4s ease-in-out 1.5s infinite; }
        .gp-pillbtn-solid:hover { transform: translateY(-2px); box-shadow: 0 10px 22px -6px rgba(123,63,242,.65); }

        /* Visuel : se devoile, halo violet, reflet, lecture qui pulse */
        .gp-hero { animation: gp-reveal 1s cubic-bezier(.16,1,.3,1) .15s both; box-shadow: 0 2px 6px rgba(11,11,16,.06), 0 34px 70px -26px rgba(123,63,242,.6); }
        .gp-hero::after {
          content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 4;
          background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,.16) 50%, transparent 65%);
          background-size: 250% 100%; background-position: 130% 0; animation: gp-sheen 8s ease-in-out 2s infinite;
        }
        .gp-hero:not(.is-reel) .gp-hero-slide { animation: gp-kb 18s ease-in-out infinite alternate; }
        .gp-hero-play { animation: gp-ring 2.4s ease-out infinite; }
        .gp-hero-play:active { transform: translate(-50%,-50%) scale(.92); }

        /* Carte d'infos : monte, badges rebondissent, titre brille, pastilles vivantes */
        .gp-info { animation: gp-rise .9s cubic-bezier(.16,1,.3,1) .35s both; position: relative; overflow: hidden; }
        .gp-info::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg,#7B3FF2,#EC4899,#F59E0B,#7B3FF2); background-size: 300% 100%; animation: gp-hue 8s linear infinite; }
        .gp-badge { animation: gp-pop .55s cubic-bezier(.34,1.56,.64,1) .6s both; }
        .gp-badge-live { box-shadow: 0 0 0 0 rgba(239,68,68,.5); animation: gp-pop .55s cubic-bezier(.34,1.56,.64,1) .6s both, gp-ring 2s ease-out 1.2s infinite; }
        .gp-title {
          background: linear-gradient(100deg, var(--text-primary) 55%, #7B3FF2 80%, var(--text-primary)); background-size: 220% 100%;
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: gp-shimmer 6s linear 1.5s infinite;
        }
        .gp-avatar { position: relative; overflow: visible; }
        .gp-avatar img { border-radius: 50%; }
        .gp-avatar::before { content: ''; position: absolute; inset: -3px; border-radius: 50%; z-index: -1; background: conic-gradient(#7B3FF2, #EC4899, #F59E0B, #7B3FF2); animation: gp-spin 6s linear infinite; }
        .gp-author { isolation: isolate; }
        .gp-stat, .gp-pill { animation: gp-rise .6s cubic-bezier(.16,1,.3,1) .7s both; transition: transform .3s cubic-bezier(.34,1.56,.64,1), background-color .2s; }
        .gp-stat:hover, .gp-pill:hover { transform: translateY(-3px) scale(1.04); }
        .gp-pill-accent { box-shadow: 0 6px 16px -8px rgba(123,63,242,.6); }

        /* Bloc « pourquoi rejoindre » : degrade qui bouge, items en cascade */
        .gp-why { position: relative; overflow: hidden; animation: gp-rise .9s cubic-bezier(.16,1,.3,1) .5s both;
          background: linear-gradient(135deg,#8b4dff,#5B2EC4,#c026d3,#5B2EC4,#8b4dff); background-size: 300% 300%; animation: gp-rise .9s cubic-bezier(.16,1,.3,1) .5s both, gp-hue 14s linear infinite; }
        .gp-why::before { content: ''; position: absolute; width: 320px; height: 320px; right: -120px; top: -140px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,.22), transparent 70%); pointer-events: none; animation: gp-drift-b 14s ease-in-out infinite; }
        .gp-why > * { position: relative; }
        .gp-why-item { animation: gp-rise .6s cubic-bezier(.16,1,.3,1) both; transition: transform .35s cubic-bezier(.16,1,.3,1), background-color .25s; }
        .gp-why-item:nth-child(1) { animation-delay: .7s; } .gp-why-item:nth-child(2) { animation-delay: .78s; }
        .gp-why-item:nth-child(3) { animation-delay: .86s; } .gp-why-item:nth-child(4) { animation-delay: .94s; } .gp-why-item:nth-child(5) { animation-delay: 1.02s; }
        .gp-why-item:hover { transform: translateX(6px); background: rgba(255,255,255,.18); }
        .gp-why-ico { animation: gp-bob 4s ease-in-out infinite; }
        .gp-why-item:nth-child(2n) .gp-why-ico { animation-delay: -1.3s; }
        .gp-why-item:nth-child(3n) .gp-why-ico { animation-delay: -2.6s; }

        /* Barre d'invitation flottante en bas */
        .gp-dock {
          position: fixed; left: 50%; bottom: calc(14px + env(safe-area-inset-bottom, 0px)); z-index: 40; transform: translateX(-50%);
          width: calc(100% - 1.5rem); max-width: 560px; display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 8px 8px 8px 20px; border-radius: 999px; color: #fff;
          background: linear-gradient(135deg, rgba(20,8,48,.92), rgba(60,20,130,.92)); backdrop-filter: blur(16px);
          box-shadow: 0 20px 44px -12px rgba(91,46,196,.7); border: 1px solid rgba(255,255,255,.14);
          animation: gp-dock-in .9s cubic-bezier(.16,1,.3,1) 1.2s both;
        }
        .gp-dock-text { min-width: 0; font-size: 13px; font-weight: 700; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .gp-dock-btn {
          position: relative; overflow: hidden; flex-shrink: 0; height: 42px; padding: 0 20px; border-radius: 999px; display: inline-flex; align-items: center;
          font-size: 14px; font-weight: 800; color: #5B2EC4; background: #fff; text-decoration: none; transition: transform .3s cubic-bezier(.34,1.56,.64,1);
        }
        .gp-dock-btn::before { content: ''; position: absolute; inset: 0; background: linear-gradient(110deg, transparent 30%, rgba(123,63,242,.25) 50%, transparent 70%); transform: translateX(-120%); animation: gp-shine 3.5s ease-in-out 2s infinite; }
        .gp-dock-btn:hover { transform: scale(1.06); }
        .gp-page { padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px)); }

        /* Overlay de connexion : halo qui respire */
        .gp-lock-glow { animation: gp-glowpulse 4s ease-in-out infinite; }
        .gp-lock-btn-primary { position: relative; overflow: hidden; }
        .gp-lock-btn-primary::before { content: ''; position: absolute; inset: 0; background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,.3) 50%, transparent 70%); transform: translateX(-120%); animation: gp-shine 3.5s ease-in-out 1s infinite; }
        .gp-lock-perk { animation: gp-rise .6s cubic-bezier(.16,1,.3,1) .4s both; }

        @media (prefers-reduced-motion: reduce) {
          .gp-page::before, .gp-page::after, .gp-bar, .gp-bar::before, .gp-hero, .gp-hero::after, .gp-hero-slide, .gp-hero-play, .gp-info,
          .gp-info::before, .gp-badge, .gp-title, .gp-avatar::before, .gp-stat, .gp-pill, .gp-why, .gp-why::before, .gp-why-item, .gp-why-ico,
          .gp-dock, .gp-dock-btn::before, .gp-pillbtn-solid::before, .gp-lock-glow, .gp-lock-btn-primary::before, .gp-lock-perk { animation: none !important; }
        }
        /* Billet : compte a rebours + date / lieu / prix (evenements et concerts) */
        @keyframes gp-tick { from { opacity: 0; transform: translateY(-10px) scale(.9); } to { opacity: 1; transform: none; } }
        .gp-ticket { margin-top: 18px; display: grid; gap: 12px; animation: gp-rise .8s cubic-bezier(.16,1,.3,1) .55s both; }
        .gp-count { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 14px; border-radius: 22px; color: #fff;
          background: linear-gradient(135deg,#3d1478,#7B3FF2 55%,#C026D3); background-size: 200% 200%; animation: gp-hue 12s linear infinite;
          box-shadow: 0 16px 34px -14px rgba(123,63,242,.7); }
        .gp-count-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 0; border-radius: 16px; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.16); }
        .gp-count-num { font-size: clamp(22px, 6vw, 30px); font-weight: 900; letter-spacing: -.02em; font-variant-numeric: tabular-nums; line-height: 1; animation: gp-tick .45s cubic-bezier(.34,1.56,.64,1); }
        .gp-count-lbl { font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; opacity: .75; }
        .gp-ticket-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
        .gp-ticket-cell { position: relative; display: flex; flex-direction: column; gap: 3px; padding: 14px 16px; border-radius: 20px; min-width: 0;
          background: var(--bg-secondary); border: 1px solid var(--border); transition: transform .35s cubic-bezier(.34,1.56,.64,1), box-shadow .3s, border-color .3s; }
        .gp-ticket-cell:hover { transform: translateY(-4px); border-color: rgba(123,63,242,.45); box-shadow: 0 16px 30px -16px rgba(123,63,242,.5); }
        .gp-ticket-accent { background: linear-gradient(135deg, rgba(123,63,242,.14), rgba(236,72,153,.1)); border-color: rgba(123,63,242,.3); }
        .gp-ticket-lbl { font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--text-tertiary); }
        .gp-ticket-big { font-size: 20px; font-weight: 900; letter-spacing: -.02em; color: var(--text-primary); text-transform: capitalize; }
        .gp-ticket-accent .gp-ticket-big { color: #7B3FF2; }
        .gp-ticket-text { font-size: 15px; line-height: 1.3; overflow-wrap: anywhere; text-transform: none; }
        .gp-ticket-sub { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: capitalize; }
        @media (prefers-reduced-motion: reduce) { .gp-ticket, .gp-count, .gp-count-num { animation: none !important; } }
      `}</style>

      <div className="gp-page is-fullscreen">

        {/* Barre du haut — pilule flottante */}
        <div className="gp-bar">
          <Link to="/" className="gp-logo">
            <RoundLogo size={32} />
            <span className="gp-logo-text">Gofolyx</span>
          </Link>
          <div className="gp-bar-actions">
            <Link to={`/auth/login?redirect=${redirectParam}`} className="gp-pillbtn gp-pillbtn-ghost">Se connecter</Link>
            <Link to={`/auth/register?redirect=${redirectParam}`} className="gp-pillbtn gp-pillbtn-solid">S'inscrire</Link>
          </div>
        </div>

        <main className="gp-main">

          {/* Visuel — rien d'écrit dessus : uniquement lecture, indicateurs et progression */}
          <div className={`gp-hero${isReel ? ' is-reel' : ''}`}
            onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown} onMouseUp={onMouseUp}
            onMouseLeave={() => { isDragging.current = false; dragStartX.current = null; }}
            style={{ cursor: images.length > 1 ? 'grab' : undefined }}>
            {images.length > 0 ? (
              <div className="gp-hero-track" style={{ transform: `translateX(-${slide * 100}%)` }}>
                {images.map((src, i) => (
                  <div key={i} className="gp-hero-slide-wrap">
                    <img src={src} alt="" className="gp-hero-slide-bg" draggable={false} aria-hidden="true" />
                    <img src={src} alt={title ?? ''} className="gp-hero-slide" draggable={false}
                      style={{ cursor: 'zoom-in' }}
                      onClick={() => { if (!justDragged.current) setLightbox(i); }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="gp-empty-hero" />
            )}

            {type === 'reel' && videoUrl && (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  preload="auto"
                  muted={muted}
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain',
                    opacity: videoReady ? 1 : 0, transition: 'opacity .25s ease',
                  }}
                />
                {videoReady && !previewEnded && muted && (
                  <button className="gp-hero-expand" onClick={unmute} aria-label="Activer le son">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m22 9-6 6M16 9l6 6"/>
                    </svg>
                  </button>
                )}
                {videoReady && !previewEnded && (
                  <div className="gp-preview-progress">
                    <div className="gp-preview-progress-fill" style={{ width: `${previewProgress * 100}%` }} />
                  </div>
                )}
              </>
            )}

            {/* ≤ 6 images : barres de progression ; au-delà, un compteur « 3 / 24 » — des dizaines de
                tirets formaient une ligne illisible. */}
            {images.length > 1 && images.length <= 6 && (
              <div className="gp-hero-dots">
                {images.map((_, i) => (
                  <button key={`${i}-${slide === i}`} className={`gp-hero-dot${i <= slide ? ' active' : ''}`}
                    onClick={() => goToSlide(i)} aria-label={`Image ${i + 1}`} />
                ))}
              </div>
            )}
            {images.length > 6 && (
              <div className="gp-hero-count" aria-live="polite">{slide + 1} / {images.length}</div>
            )}

            {images.length > 0 && !(type === 'reel' && videoUrl) && (
              <button className="gp-hero-expand" onClick={() => setLightbox(slide)} aria-label="Voir en plein écran">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path d="M12 3h5v5M8 17H3v-5M17 3l-5.5 5.5M3 17l5.5-5.5" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}

            {isMedia(type) && !(type === 'reel' && videoReady && !previewEnded) && (
              <button className="gp-hero-play" onClick={handlePlayTap} aria-label="Lire la vidéo">
                <svg width="28" height="28" viewBox="0 0 20 20" fill="white"><path d="M5 3l12 7-12 7V3z"/></svg>
              </button>
            )}
          </div>

          {/* Informations — sous le visuel, sur fond uni, lisibles */}
          <section className="gp-info">
            <div className="gp-badges">
              {isLive && (
                <span className="gp-badge gp-badge-live"><span className="gp-dot" />LIVE</span>
              )}
              <span className="gp-badge gp-badge-type">{cfg.icon}{cfg.label}</span>
            </div>

            {title && <h1 className="gp-title">{title}</h1>}

            {author && (
              <div className="gp-author">
                <div className="gp-avatar">
                  {author.avatar_url ? <img src={author.avatar_url} alt="" /> : initials}
                </div>
                <div className="gp-author-text">
                  <span className="gp-author-name">
                    {authorName ?? 'Utilisateur'}
                    {author.is_verified && (
                      <span className="gp-verified">
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </span>
                    )}
                  </span>
                  {date && (
                    <span className="gp-date">
                      {isLive ? 'En direct' : format(new Date(date), 'd MMMM yyyy', { locale: fr })}
                    </span>
                  )}
                </div>
              </div>
            )}

            {(type === 'event' || type === 'concert') && (date || location || ticketPrice != null) && (
              <div className="gp-ticket">
                {date && !isLive && !Number.isNaN(new Date(date).getTime()) && new Date(date).getTime() > Date.now() && <Countdown to={date} />}
                <div className="gp-ticket-grid">
                  {date && !Number.isNaN(new Date(date).getTime()) && (
                    <div className="gp-ticket-cell">
                      <span className="gp-ticket-lbl">Date</span>
                      <span className="gp-ticket-big">{format(new Date(date), 'd MMM', { locale: fr })}</span>
                      <span className="gp-ticket-sub">{format(new Date(date), "EEEE 'à' HH:mm", { locale: fr })}</span>
                    </div>
                  )}
                  {location && (
                    <div className="gp-ticket-cell">
                      <span className="gp-ticket-lbl">Lieu</span>
                      <span className="gp-ticket-big gp-ticket-text">{location}</span>
                    </div>
                  )}
                  {ticketPrice != null && (
                    <div className="gp-ticket-cell gp-ticket-accent">
                      <span className="gp-ticket-lbl">Entrée</span>
                      <span className="gp-ticket-big">{ticketPrice === 0 ? 'Gratuit' : <PriceWithLocal amountEur={ticketPrice} />}</span>
                      {ticketPrice !== 0 && <span className="gp-ticket-sub">à partir de</span>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {hasStats && (
              <div className="gp-stats">
                {showLikes && (
                  <span className="gp-stat">
                    <svg width="15" height="15" viewBox="0 0 20 20" fill="#F0365A">
                      <path d="M10 17.5s-6.5-4-8.5-8A4.5 4.5 0 0 1 10 5.5a4.5 4.5 0 0 1 8.5 4c-2 4-8.5 8-8.5 8z"/>
                    </svg>
                    {formatCount(likeCount ?? 0)}
                  </span>
                )}
                {showComments && (
                  <span className="gp-stat">
                    <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                      <path d="M17 10a7 7 0 1 1-3-5.75L17 3l-1 3.5A6.98 6.98 0 0 1 17 10z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
                    </svg>
                    {formatCount(commentCount ?? 0)}
                  </span>
                )}
                {showViews && (
                  <span className="gp-stat">
                    <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                      <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    </svg>
                    {formatCount(viewCount ?? 0)}
                  </span>
                )}
              </div>
            )}

            {((type !== 'event' && type !== 'concert' && (location || ticketPrice != null)) || attendees != null) && (
              <div className="gp-pills">
                {location && type !== 'event' && type !== 'concert' && (
                  <span className="gp-pill">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1a3.5 3.5 0 0 1 3.5 3.5C9.5 8 6 11 6 11S2.5 8 2.5 4.5A3.5 3.5 0 0 1 6 1z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                      <circle cx="6" cy="4.5" r="1" fill="currentColor"/>
                    </svg>
                    {location}
                  </span>
                )}
                {attendees != null && (
                  <span className="gp-pill">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <circle cx="4.5" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                      <path d="M1 10c0-1.9 1.6-3 3.5-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      <circle cx="8.5" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                      <path d="M11 10c0-1.9-1.6-3-3.5-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    {attendees.toLocaleString()} participants
                  </span>
                )}
                {ticketPrice != null && type !== 'event' && type !== 'concert' && (
                  <span className="gp-pill gp-pill-accent">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <rect x="1" y="3" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                      <path d="M4 3V2M8 3V2" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                    {ticketPrice === 0 ? 'Gratuit' : <>À partir de <PriceWithLocal amountEur={ticketPrice} /></>}
                  </span>
                )}
              </div>
            )}

            {body && (
              <>
                <div className="gp-divider" />
                <p className={`gp-body${longBody ? ' is-clamped' : ''}`}>
                  {renderTextWithLinks(body, 'underline font-semibold')}
                </p>
                {longBody && (
                  <button className="gp-body-more" onClick={() => setBodyOpen(true)}>Voir plus</button>
                )}
              </>
            )}
          </section>

          {/* Pourquoi rejoindre — arguments, sans bouton (connexion/inscription : barre du haut et barre du bas) */}
          <section className="gp-why">
            <p className="gp-why-eyebrow">Gofolyx</p>
            <h2 className="gp-why-title">La scène, l'écran et le direct — au même endroit</h2>
            <p className="gp-why-sub">{cfg.cta.replace('Connecte-toi pour', 'Rejoins-nous pour')}.</p>
            <ul className="gp-why-list">
              {WHY_ITEMS.map(it => (
                <li key={it.title} className="gp-why-item">
                  <span className="gp-why-ico">{it.icon}</span>
                  <span>
                    <strong>{it.title}</strong>
                    <span>{it.desc}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="gp-why-foot">100 % gratuit · sans engagement · en quelques secondes</p>
          </section>
        </main>

        {/* Barre d'invitation flottante */}
        <div className="gp-dock">
          <span className="gp-dock-text">{cfg.cta}</span>
          <Link to={`/auth/register?redirect=${redirectParam}`} className="gp-dock-btn">Rejoindre</Link>
        </div>

        {/* Bottom sheet — description complète (au clic sur « Voir plus ») */}
        {bodyOpen && body && (
          <div className="gp-sheet-back" onClick={() => setBodyOpen(false)}>
            <div className="gp-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
              <div className="gp-sheet-handle" />
              <div className="gp-sheet-head">
                <p className="gp-sheet-title">{title || 'Description'}</p>
                <button className="gp-sheet-close" onClick={() => setBodyOpen(false)} aria-label="Fermer">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </button>
              </div>
              <div className="gp-sheet-body">
                <p className="gp-body">{renderTextWithLinks(body, 'underline font-semibold')}</p>
              </div>
            </div>
          </div>
        )}

        {lightbox !== null && images.length > 0 && (
          <Lightbox urls={images} index={lightbox} onClose={() => setLightbox(null)} />
        )}

        {/* Overlay « contenu réservé aux membres » — au clic sur lecture, ou à 30 % d'un reel */}
        {showPlayPrompt && (
          <div className="gp-lock-overlay">
            <div className="gp-lock-glow" />

            <span className="gp-lock-badge">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 4.5V3a3 3 0 0 1 6 0v1.5M1.5 4.5h7v4.5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4.5z" stroke="currentColor" strokeWidth="1" fill="none"/>
              </svg>
              Contenu réservé aux membres
            </span>

            <div className="gp-lock-icon">
              <svg width="30" height="30" viewBox="0 0 20 20" fill="white"><path d="M5 3l12 7-12 7V3z"/></svg>
            </div>

            <h2 className="gp-lock-title">
              {previewEnded && type === 'reel' ? 'La suite t\'attend' : cfg.cta}
            </h2>
            <p className="gp-lock-sub">
              Rejoins Gofolyx gratuitement pour regarder la vidéo en entier, avec le son, et profiter de tout le reste.
            </p>

            <div className="gp-lock-btns">
              <Link to={`/auth/login?redirect=${redirectParam}`} className="gp-lock-btn-primary">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1a4 4 0 1 1 0 8A4 4 0 0 1 8 1zm-6 13c0-2.8 2.7-5 6-5s6 2.2 6 5" stroke="white" strokeWidth="1.5"/>
                </svg>
                Se connecter et regarder
              </Link>
              <Link to={`/auth/register?redirect=${redirectParam}`} className="gp-lock-btn-ghost">
                Créer un compte gratuit
              </Link>
            </div>

            <div className="gp-lock-perks">
              {['100% gratuit', 'Vidéos, concerts, events', 'Sans engagement'].map(t => (
                <span key={t} className="gp-lock-perk">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="#3FEDB6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
