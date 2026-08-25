import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Hls from 'hls.js';
import { RoundLogo } from './RoundLogo';
import { renderTextWithLinks } from './RichText';
import { toProxiedUrl } from '../../utils/constants';

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

const isMedia = (type: GuestPreviewType) => type === 'reel' || type === 'concert' || type === 'film' || type === 'serie';

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.0', '')}k`;
  return String(n);
}

export function GuestPreview({
  type, thumbnail, videoUrl, thumbnails, title, body, author, date,
  location, attendees, ticketPrice, likeCount, commentCount, viewCount, isLive,
}: GuestPreviewProps) {
  const cfg = TYPE_CONFIG[type];
  const redirectParam = encodeURIComponent(window.location.pathname + window.location.search);
  const [showPlayPrompt, setShowPlayPrompt] = useState(false);
  const [showBodyOverlay, setShowBodyOverlay] = useState(false);
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
    const playMuted = () => {
      setVideoReady(true);
      v.muted = false;
      v.play().catch(() => {});
    };

    v.addEventListener('loadedmetadata', onLoadedMetadata);
    v.addEventListener('timeupdate', onTimeUpdate);

    if (Hls.isSupported()) {
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
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [videoUrl, type]);

  const authorName = author?.display_name ?? author?.username ?? null;
  const initials   = authorName ? authorName[0].toUpperCase() : '?';

  // Normalise en une liste d'images sans doublons ni valeurs vides
  const images = Array.from(new Set(
    (thumbnails?.length ? thumbnails : [thumbnail]).filter((u): u is string => !!u),
  ));
  const [slide, setSlide] = useState(0);
  const dragStartX  = useRef<number | null>(null);
  const isDragging  = useRef(false);
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

  // Ferme l'overlay de description avec Échap
  useEffect(() => {
    if (!showBodyOverlay) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setShowBodyOverlay(false); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showBodyOverlay]);

  const hasStats = likeCount != null || commentCount != null || viewCount != null;

  return (
    <>
      <style>{`
        .gp-shell {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: #05000a;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .gp-hero {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          touch-action: pan-y;
        }
        .gp-hero-track {
          display: flex;
          width: 100%;
          height: 100%;
          transition: transform .35s cubic-bezier(0.22,1,0.36,1);
        }
        .gp-hero-slide-wrap {
          position: relative;
          width: 100%;
          height: 100%;
          flex-shrink: 0;
          overflow: hidden;
        }
        .gp-hero-slide-bg {
          position: absolute;
          inset: -6%;
          width: 112%;
          height: 112%;
          object-fit: cover;
          filter: blur(40px) saturate(1.3) brightness(0.55);
          transform: scale(1.1);
        }
        .gp-hero-slide {
          position: relative;
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center center;
          display: block;
          filter: saturate(1.08);
        }
        .gp-hero-dots {
          position: absolute;
          top: 14px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 6;
          display: flex;
          gap: 6px;
        }
        .gp-hero-dot {
          width: 22px; height: 3px;
          border-radius: 3px;
          background: rgba(255,255,255,0.3);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: background .18s, transform .18s;
          overflow: hidden;
          position: relative;
        }
        .gp-hero-dot.active {
          background: rgba(255,255,255,0.3);
        }
        .gp-hero-dot.active::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, #A855F7, #F0365A);
          animation: gp-dot-fill 4s linear forwards;
        }
        @keyframes gp-dot-fill {
          from { transform: scaleX(0); transform-origin: left; }
          to   { transform: scaleX(1); transform-origin: left; }
        }
        .gp-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(5,0,10,0.65) 0%,
            rgba(5,0,10,0.05) 20%,
            rgba(5,0,10,0.02) 40%,
            rgba(5,0,10,0.55) 62%,
            rgba(5,0,10,0.96) 80%,
            rgba(5,0,10,1.00) 100%
          );
        }
        .gp-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 100%);
          pointer-events: none;
        }
        .gp-topbar {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px 0;
          flex-shrink: 0;
        }
        .gp-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }
        .gp-logo-text {
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.4px;
          color: #fff;
          background: linear-gradient(135deg, #fff, #E8D5FF);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .gp-topbar-login {
          font-size: 13px;
          font-weight: 700;
          color: rgba(255,255,255,0.85);
          text-decoration: none;
          padding: 7px 14px;
          border-radius: 20px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.14);
          backdrop-filter: blur(8px);
          transition: background .18s, border-color .18s;
        }
        .gp-topbar-login:hover { background: rgba(255,255,255,0.16); border-color: rgba(255,255,255,0.28); }

        /* Scrollable content zone */
        .gp-scroll {
          position: relative;
          z-index: 10;
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          display: flex;
          flex-direction: column;
          padding-bottom: 190px;
        }
        .gp-spacer { flex: 1; min-height: 180px; }

        .gp-badges {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 20px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }
        .gp-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
          box-shadow: 0 4px 14px rgba(123,63,242,0.35);
        }
        .gp-badge-type { background: linear-gradient(135deg, #7B3FF2, #A855F7); color: #fff; }
        .gp-badge-live { background: linear-gradient(135deg, #EF4444, #DC2626); color: #fff; box-shadow: 0 4px 14px rgba(239,68,68,0.4); }
        .gp-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #fff;
          animation: gp-pulse 1.1s ease-in-out infinite;
        }
        @keyframes gp-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.4; transform:scale(.7); }
        }

        .gp-meta { padding: 0 20px; }

        .gp-hero-play {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          z-index: 5;
          width: 80px; height: 80px;
          border-radius: 50%;
          background: rgba(255,255,255,0.12);
          border: 2px solid rgba(255,255,255,0.65);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: transform .2s, background .2s, box-shadow .2s;
          box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 0 0 0 rgba(255,255,255,0.4);
          animation: gp-play-breathe 2.4s ease-in-out infinite;
        }
        @keyframes gp-play-breathe {
          0%, 100% { box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 0 0 0 rgba(255,255,255,0.25); }
          50%      { box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 0 0 14px rgba(255,255,255,0); }
        }
        .gp-hero-play:hover {
          transform: translate(-50%, -50%) scale(1.08);
          background: rgba(255,255,255,0.2);
        }
        @media (min-width: 640px) {
          .gp-hero-play { width: 96px; height: 96px; }
        }

        .gp-preview-progress {
          position: absolute;
          left: 14px; right: 14px; bottom: 14px;
          z-index: 6;
          height: 3px;
          border-radius: 3px;
          background: rgba(255,255,255,0.22);
          overflow: hidden;
        }
        .gp-preview-progress-fill {
          height: 100%;
          border-radius: 3px;
          background: linear-gradient(90deg, #A855F7, #F0365A);
          transition: width .12s linear;
        }

        .gp-title {
          font-size: clamp(20px, 4.2vw, 32px);
          font-weight: 900;
          line-height: 1.15;
          letter-spacing: -0.5px;
          color: #fff;
          margin-bottom: 12px;
          word-break: break-word;
          text-shadow: 0 2px 20px rgba(0,0,0,0.5);
        }

        .gp-author {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .gp-avatar {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7B3FF2, #A855F7);
          border: 1.5px solid rgba(255,255,255,0.4);
          overflow: hidden;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 800;
          color: #fff;
          box-shadow: 0 2px 10px rgba(123,63,242,0.4);
        }
        .gp-avatar img { width:100%; height:100%; object-fit:cover; }
        .gp-author-name { font-size: 14px; font-weight: 800; color: #fff; }
        .gp-verified {
          width: 15px; height: 15px;
          border-radius: 50%;
          background: #1D9BF0;
          display: inline-flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 0 0 2px rgba(5,0,10,0.8);
        }
        .gp-date { font-size: 12px; color: rgba(255,255,255,0.4); font-weight: 500; }
        .gp-date-sep { color: rgba(255,255,255,0.25); }

        .gp-stats {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .gp-stat {
          display: flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 700;
          color: rgba(255,255,255,0.75);
        }
        .gp-stat svg { flex-shrink: 0; }

        .gp-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 14px;
        }
        .gp-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 20px;
          font-size: 12px; font-weight: 700;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.14);
          color: rgba(255,255,255,0.75);
          white-space: nowrap;
          backdrop-filter: blur(8px);
        }
        .gp-pill-accent {
          background: rgba(123,63,242,0.16);
          border-color: rgba(168,85,247,0.4);
          color: #D4B8FF;
        }

        .gp-body-trigger {
          font-size: 14px;
          line-height: 1.6;
          color: rgba(255,255,255,0.7);
          margin-bottom: 16px;
          word-break: break-word;
          white-space: pre-line;
          cursor: pointer;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .gp-body-more {
          font-size: 13px;
          font-weight: 800;
          color: #D4B8FF;
        }

        /* Overlay description plein écran — fond noir, texte lisible, clic pour fermer */
        .gp-body-overlay {
          position: fixed;
          inset: 0;
          z-index: 40;
          background: rgba(2,0,6,0.96);
          backdrop-filter: blur(4px);
          display: flex;
          flex-direction: column;
          cursor: pointer;
          animation: gp-fade-in 0.2s ease-out;
        }
        @keyframes gp-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .gp-body-overlay-inner {
          flex: 1;
          overflow-y: auto;
          padding: 28px 22px 40px;
          max-width: 720px;
          width: 100%;
          margin: 0 auto;
        }
        .gp-body-overlay-hint {
          position: sticky;
          top: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 22px;
          font-size: 12px;
          font-weight: 700;
          color: rgba(255,255,255,0.45);
          letter-spacing: 0.02em;
        }
        .gp-body-overlay-close {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.14);
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          flex-shrink: 0;
        }
        .gp-body-full {
          font-size: 16px;
          line-height: 1.75;
          color: rgba(255,255,255,0.92);
          white-space: pre-line;
          word-break: break-word;
        }

        /* CTA bar */
        .gp-cta {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          z-index: 20;
          background: linear-gradient(180deg, rgba(5,0,10,0.4), rgba(5,0,10,0.94) 30%, rgba(5,0,10,0.98));
          backdrop-filter: blur(28px) saturate(160%);
          -webkit-backdrop-filter: blur(28px) saturate(160%);
          border-top: 1px solid rgba(255,255,255,0.10);
          padding: 18px 20px;
          padding-bottom: max(18px, env(safe-area-inset-bottom));
        }
        .gp-cta-headline {
          font-size: 15px;
          font-weight: 800;
          color: #fff;
          margin-bottom: 3px;
          letter-spacing: -0.2px;
          line-height: 1.3;
        }
        .gp-cta-sub {
          font-size: 11.5px;
          color: rgba(255,255,255,0.4);
          margin-bottom: 15px;
          line-height: 1.4;
        }
        .gp-btns {
          display: flex;
          gap: 10px;
        }
        .gp-btn {
          flex: 1;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 13px 14px;
          border-radius: 14px;
          font-size: 14px; font-weight: 800;
          text-decoration: none;
          letter-spacing: -0.1px;
          transition: opacity .15s, transform .15s, box-shadow .15s;
          white-space: nowrap;
        }
        .gp-btn:hover { opacity: .92; transform: scale(.985); }
        .gp-btn-primary {
          background: linear-gradient(135deg, #7B3FF2, #A855F7);
          color: #fff;
          box-shadow: 0 6px 20px rgba(123,63,242,0.45);
        }
        .gp-btn-ghost {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.16);
          color: #fff;
        }

        /* Overlay plein écran "premium" incitant à se connecter — remplace le
           bottom-sheet simple pour un rendu plus haut de gamme et immersif. */
        .gp-lock-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 32px 24px;
          background: radial-gradient(ellipse at center, rgba(30,6,58,0.88) 0%, rgba(4,0,10,0.97) 70%);
          backdrop-filter: blur(22px) saturate(140%);
          -webkit-backdrop-filter: blur(22px) saturate(140%);
          animation: gp-fade-in 0.3s ease-out;
        }
        .gp-lock-glow {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 480px; height: 480px;
          background: radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 65%);
          pointer-events: none;
        }
        .gp-lock-icon {
          position: relative;
          width: 76px; height: 76px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7B3FF2, #F0365A);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 22px;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.15), 0 12px 40px rgba(123,63,242,0.55);
          animation: gp-lock-pop 0.45s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes gp-lock-pop {
          from { transform: scale(0.6); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        .gp-lock-badge {
          position: relative;
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.16);
          color: #D4B8FF;
          font-size: 11px; font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 18px;
        }
        .gp-lock-title {
          position: relative;
          font-size: clamp(22px, 5vw, 30px);
          font-weight: 900;
          color: #fff;
          letter-spacing: -0.5px;
          line-height: 1.2;
          margin-bottom: 10px;
          max-width: 380px;
        }
        .gp-lock-sub {
          position: relative;
          font-size: 14.5px;
          color: rgba(255,255,255,0.55);
          line-height: 1.5;
          max-width: 340px;
          margin-bottom: 30px;
        }
        .gp-lock-btns {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          max-width: 320px;
        }
        .gp-lock-btn-primary {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 16px 20px;
          border-radius: 16px;
          font-size: 15.5px; font-weight: 800;
          color: #fff;
          text-decoration: none;
          background: linear-gradient(135deg, #7B3FF2, #F0365A);
          box-shadow: 0 10px 30px rgba(123,63,242,0.5);
          transition: transform .15s, box-shadow .15s;
        }
        .gp-lock-btn-primary:hover { transform: translateY(-2px) scale(1.01); box-shadow: 0 14px 36px rgba(123,63,242,0.6); }
        .gp-lock-btn-ghost {
          display: flex; align-items: center; justify-content: center;
          padding: 15px 20px;
          border-radius: 16px;
          font-size: 15px; font-weight: 700;
          color: rgba(255,255,255,0.85);
          text-decoration: none;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.16);
          transition: background .15s, border-color .15s;
        }
        .gp-lock-btn-ghost:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.3); }
        .gp-lock-perks {
          position: relative;
          display: flex;
          gap: 18px;
          margin-top: 26px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .gp-lock-perk {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 600;
          color: rgba(255,255,255,0.45);
        }

        /* Tablet / desktop */
        @media (min-width: 640px) {
          .gp-topbar { padding: 20px 32px 0; }
          .gp-logo-text { font-size: 18px; }
          .gp-badges { padding: 0 32px; }
          .gp-meta { padding: 0 32px; }
          .gp-cta { padding: 22px 32px; padding-bottom: max(22px, env(safe-area-inset-bottom)); }
          .gp-cta-headline { font-size: 16px; }
          .gp-cta-sub { font-size: 12px; }
          .gp-btn { font-size: 15px; padding: 14px 16px; border-radius: 16px; }
          .gp-scroll { padding-bottom: 200px; }
        }
        @media (min-width: 1024px) {
          .gp-topbar { padding: 26px 48px 0; }
          .gp-badges { padding: 0 48px; margin-bottom: 18px; }
          .gp-meta { padding: 0 48px; }
          .gp-cta { padding: 24px 48px; padding-bottom: max(24px, env(safe-area-inset-bottom)); max-width: 640px; left: 50%; transform: translateX(-50%); border-radius: 28px 28px 0 0; box-shadow: 0 -20px 60px rgba(0,0,0,0.5); }
          .gp-title { font-size: clamp(26px, 3.2vw, 40px); }
          .gp-scroll { padding-bottom: 210px; }
        }
      `}</style>

      <div className="gp-shell">

        {/* Hero — carrousel swipeable si plusieurs images (post multi-photos, galerie event) */}
        <div className="gp-hero"
          onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown} onMouseUp={onMouseUp}
          onMouseLeave={() => { isDragging.current = false; dragStartX.current = null; }}
          style={{ cursor: images.length > 1 ? 'grab' : undefined }}>
          {images.length > 0 ? (
            <div className="gp-hero-track"
              style={{ transform: `translateX(-${slide * 100}%)` }}>
              {images.map((src, i) => (
                <div key={i} className="gp-hero-slide-wrap">
                  <img src={src} alt="" className="gp-hero-slide-bg" draggable={false} aria-hidden="true" />
                  <img src={src} alt="" className="gp-hero-slide" draggable={false} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#1a0533 0%,#3d1478 45%,#7B3FF2 70%,#0A0010 100%)' }} />
          )}

          {/* Vidéo — lue en muet dès que prête, superposée au thumbnail qui reste
              en fallback pendant le chargement HLS. */}
          {type === 'reel' && videoUrl && (
            <>
              <video
                ref={videoRef}
                playsInline
                muted={muted}
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  objectFit: 'contain',
                  opacity: videoReady ? 1 : 0,
                  transition: 'opacity .25s ease',
                }}
              />

              {videoReady && !previewEnded && (
                <div className="gp-preview-progress">
                  <div className="gp-preview-progress-fill" style={{ width: `${previewProgress * 100}%` }} />
                </div>
              )}
            </>
          )}

          <div className="gp-vignette" />
          <div className="gp-gradient" />

          {/* Indicateurs de position — barres façon stories, se remplissent avec l'auto-défilement */}
          {images.length > 1 && (
            <div className="gp-hero-dots">
              {images.map((_, i) => (
                <button key={`${i}-${slide === i}`} className={`gp-hero-dot${i === slide ? ' active' : i < slide ? ' active' : ''}`}
                  onClick={() => goToSlide(i)} aria-label={`Image ${i + 1}`} />
              ))}
            </div>
          )}

          {/* Bouton play centré — masqué une fois la lecture auto démarrée (reel + vidéo prête) */}
          {isMedia(type) && !(type === 'reel' && videoReady && !previewEnded) && (
            <button className="gp-hero-play" onClick={() => setShowPlayPrompt(true)} aria-label="Lire la vidéo">
              <svg width="30" height="30" viewBox="0 0 20 20" fill="white">
                <path d="M5 3l12 7-12 7V3z"/>
              </svg>
            </button>
          )}
        </div>

        {/* Topbar */}
        <div className="gp-topbar">
          <div className="gp-logo">
            <RoundLogo size={36} />
            <span className="gp-logo-text">Gofolyx</span>
          </div>
          <Link to={`/auth/login?redirect=${redirectParam}`} className="gp-topbar-login">
            Se connecter
          </Link>
        </div>

        {/* Scrollable content */}
        <div className="gp-scroll">
          <div className="gp-spacer" />

          {/* Badges */}
          <div className="gp-badges">
            {isLive && (
              <span className="gp-badge gp-badge-live">
                <span className="gp-dot" />
                LIVE
              </span>
            )}
            <span className="gp-badge gp-badge-type">
              {cfg.icon}
              {cfg.label}
            </span>
          </div>

          <div className="gp-meta">
            {/* Title */}
            {title && <h1 className="gp-title">{title}</h1>}

            {/* Author */}
            {author && (
              <div className="gp-author">
                <div className="gp-avatar">
                  {author.avatar_url
                    ? <img src={author.avatar_url} alt="" />
                    : initials}
                </div>
                <span className="gp-author-name">{authorName ?? 'Utilisateur'}</span>
                {author.is_verified && (
                  <span className="gp-verified">
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </span>
                )}
                {date && (
                  <>
                    <span className="gp-date-sep">·</span>
                    <span className="gp-date">
                      {isLive ? 'En direct' : format(new Date(date), 'd MMM yyyy', { locale: fr })}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Stats — likes / commentaires / vues */}
            {hasStats && (
              <div className="gp-stats">
                {likeCount != null && (
                  <span className="gp-stat">
                    <svg width="15" height="15" viewBox="0 0 20 20" fill="#F0365A">
                      <path d="M10 17.5s-6.5-4-8.5-8A4.5 4.5 0 0 1 10 5.5a4.5 4.5 0 0 1 8.5 4c-2 4-8.5 8-8.5 8z"/>
                    </svg>
                    {formatCount(likeCount)}
                  </span>
                )}
                {commentCount != null && (
                  <span className="gp-stat">
                    <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                      <path d="M17 10a7 7 0 1 1-3-5.75L17 3l-1 3.5A6.98 6.98 0 0 1 17 10z" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
                    </svg>
                    {formatCount(commentCount)}
                  </span>
                )}
                {viewCount != null && (
                  <span className="gp-stat">
                    <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                      <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" fill="none"/>
                      <circle cx="10" cy="10" r="2.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" fill="none"/>
                    </svg>
                    {formatCount(viewCount)}
                  </span>
                )}
              </div>
            )}

            {/* Info pills */}
            {(location || attendees != null || ticketPrice != null) && (
              <div className="gp-pills">
                {location && (
                  <span className="gp-pill">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1a3.5 3.5 0 0 1 3.5 3.5C9.5 8 6 11 6 11S2.5 8 2.5 4.5A3.5 3.5 0 0 1 6 1z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                      <circle cx="6" cy="4.5" r="1" fill="currentColor"/>
                    </svg>
                    {location}
                  </span>
                )}
                {attendees != null && (
                  <span className="gp-pill">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <circle cx="4.5" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                      <path d="M1 10c0-1.9 1.6-3 3.5-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      <circle cx="8.5" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                      <path d="M11 10c0-1.9-1.6-3-3.5-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    {attendees.toLocaleString()} participants
                  </span>
                )}
                {ticketPrice != null && (
                  <span className="gp-pill gp-pill-accent">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <rect x="1" y="3" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                      <path d="M4 3V2M8 3V2" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                    {ticketPrice === 0 ? 'Gratuit' : `À partir de ${ticketPrice.toLocaleString()} XOF`}
                  </span>
                )}
              </div>
            )}

            {/* Body — clic pour ouvrir l'overlay plein écran (fond noir, texte lisible) */}
            {body && (
              <p className="gp-body-trigger" onClick={() => setShowBodyOverlay(true)}>
                {body}
                {' '}
                <span className="gp-body-more">Voir plus</span>
              </p>
            )}
          </div>
        </div>

        {/* Overlay description — fond noir plein écran, clic n'importe où pour refermer
            (y compris dans le texte : seul un vrai lien à l'intérieur intercepte le clic) */}
        {showBodyOverlay && (
          <div className="gp-body-overlay" onClick={() => setShowBodyOverlay(false)}>
            <div className="gp-body-overlay-hint">
              <span>Touche l'écran pour fermer</span>
              <button className="gp-body-overlay-close" onClick={() => setShowBodyOverlay(false)} aria-label="Fermer">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="gp-body-overlay-inner" onClick={e => { if ((e.target as HTMLElement).closest('a')) e.stopPropagation(); }}>
              {title && <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 14, letterSpacing: '-0.3px' }}>{title}</h2>}
              <p className="gp-body-full">
                {renderTextWithLinks(body ?? '', 'underline font-semibold', { color: '#fff' })}
              </p>
            </div>
          </div>
        )}

        {/* Overlay premium incitant à se connecter — s'affiche à 30% de lecture pour un
            reel, ou au clic sur le bouton play pour les autres types de contenu. */}
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
              <svg width="30" height="30" viewBox="0 0 20 20" fill="white">
                <path d="M5 3l12 7-12 7V3z"/>
              </svg>
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
              <span className="gp-lock-perk">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="#3FEDB6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                100% gratuit
              </span>
              <span className="gp-lock-perk">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="#3FEDB6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Vidéos, concerts, events
              </span>
              <span className="gp-lock-perk">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="#3FEDB6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Sans engagement
              </span>
            </div>
          </div>
        )}

        {/* CTA bar fixe */}
        <div className="gp-cta">
          <p className="gp-cta-headline">{cfg.cta}</p>
          <p className="gp-cta-sub">Rejoins Gofolyx · concerts, events, reels et bien plus. Gratuit.</p>
          <div className="gp-btns">
            <Link to={`/auth/login?redirect=${redirectParam}`} className="gp-btn gp-btn-primary">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M8 1a4 4 0 1 1 0 8A4 4 0 0 1 8 1zm-6 13c0-2.8 2.7-5 6-5s6 2.2 6 5" stroke="white" strokeWidth="1.4"/>
              </svg>
              Se connecter
            </Link>
            <Link to={`/auth/register?redirect=${redirectParam}`} className="gp-btn gp-btn-ghost">
              S'inscrire
            </Link>
          </div>
        </div>

      </div>
    </>
  );
}
