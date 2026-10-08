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

  const hasStats = likeCount != null || commentCount != null || viewCount != null;
  const isReel   = type === 'reel';
  // Description longue : repliée à 5 lignes avec « Voir plus » (plus d'overlay noir plein écran).
  const longBody = (body?.length ?? 0) > 280;
  const [bodyOpen, setBodyOpen] = useState(false);

  return (
    <>
      <style>{`
        /* ── Page — thème de l'app (clair/sombre), contenu lisible sous le visuel ── */
        .gp-page {
          min-height: 100dvh;
          background: var(--bg);
          color: var(--text-primary);
          padding-bottom: calc(110px + env(safe-area-inset-bottom, 0px));
        }
        .gp-bar {
          position: sticky; top: 0.5rem; z-index: 30;
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
        .gp-hero.is-reel { aspect-ratio: 9 / 16; max-height: 78vh; width: auto; margin: 0 auto; max-width: 100%; }
        @media (min-width: 640px) { .gp-hero.is-reel { max-height: 72vh; } }
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

        .gp-title { font-size: clamp(22px, 5vw, 32px); font-weight: 900; line-height: 1.2; letter-spacing: -0.02em; color: var(--text-primary); margin: 0 0 14px; word-break: break-word; }
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
          display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px;
          background: var(--bg-secondary); color: var(--text-secondary); font-size: 13px; font-weight: 600;
        }
        .gp-pill-accent { background: rgba(123,63,242,0.12); color: #7B3FF2; font-weight: 700; }

        .gp-divider { height: 1px; background: var(--border); margin: 18px 0; }
        .gp-body { font-size: 15.5px; line-height: 1.7; color: var(--text-primary); white-space: pre-wrap; word-break: break-word; margin: 0; }
        .gp-body.is-clamped { display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }
        .gp-body a { color: var(--primary); text-decoration: underline; font-weight: 600; }
        .gp-body-more { margin-top: 8px; font-size: 13px; font-weight: 700; color: var(--primary); background: none; border: none; padding: 0; cursor: pointer; }

        /* ── Carte d'invitation ── */
        .gp-cta-card {
          margin-top: 14px; padding: 24px 22px; text-align: center; color: #fff;
          border-radius: 28px; background: linear-gradient(135deg,#7B3FF2,#5B2EC4);
          box-shadow: 0 18px 40px -12px rgba(91,46,196,0.5);
        }
        .gp-cta-headline { font-size: 18px; font-weight: 900; letter-spacing: -0.02em; margin: 0 0 6px; }
        .gp-cta-sub { font-size: 13px; opacity: .85; margin: 0 0 16px; }
        .gp-cta-btns { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
        .gp-cta-btns .gp-pillbtn { height: 44px; padding: 0 24px; font-size: 14px; }
        .gp-cta-btns .gp-pillbtn-solid { background: #fff; color: #5B2EC4; box-shadow: none; }
        .gp-cta-btns .gp-pillbtn-ghost { color: #fff; border-color: rgba(255,255,255,0.5); }
        .gp-cta-btns .gp-pillbtn-ghost:hover { background: rgba(255,255,255,0.12); }

        /* Barre d'action flottante (mobile) */
        .gp-dock {
          position: fixed; left: 12px; right: 12px; z-index: 40;
          bottom: calc(env(safe-area-inset-bottom, 0px) + 12px);
          display: flex; gap: 8px; padding: 8px; border-radius: 999px;
          background: color-mix(in srgb, var(--surface) 92%, transparent);
          -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
          border: 1px solid var(--border); box-shadow: 0 8px 28px rgba(0,0,0,0.18);
        }
        .gp-dock .gp-pillbtn { flex: 1; height: 46px; font-size: 14px; }
        @media (min-width: 768px) { .gp-dock { display: none; } .gp-page { padding-bottom: 40px; } }

        /* Overlay « contenu réservé aux membres » (inchangé : modale sombre plein écran) */
        .gp-lock-overlay {
          position: fixed; inset: 0; z-index: 1100; display: flex; flex-direction: column;
          align-items: center; justify-content: center; text-align: center; padding: 32px 24px;
          background: rgba(8,3,16,0.94); backdrop-filter: blur(18px); overflow: hidden;
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
        .gp-lock-title { position: relative; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #fff; margin: 0 0 10px; }
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
      `}</style>

      <div className="gp-page">

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
                    <img src={src} alt={title ?? ''} className="gp-hero-slide" draggable={false} />
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
                  muted={muted}
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain',
                    opacity: videoReady ? 1 : 0, transition: 'opacity .25s ease',
                  }}
                />
                {videoReady && !previewEnded && (
                  <div className="gp-preview-progress">
                    <div className="gp-preview-progress-fill" style={{ width: `${previewProgress * 100}%` }} />
                  </div>
                )}
              </>
            )}

            {images.length > 1 && (
              <div className="gp-hero-dots">
                {images.map((_, i) => (
                  <button key={`${i}-${slide === i}`} className={`gp-hero-dot${i <= slide ? ' active' : ''}`}
                    onClick={() => goToSlide(i)} aria-label={`Image ${i + 1}`} />
                ))}
              </div>
            )}

            {isMedia(type) && !(type === 'reel' && videoReady && !previewEnded) && (
              <button className="gp-hero-play" onClick={() => setShowPlayPrompt(true)} aria-label="Lire la vidéo">
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
                      <path d="M17 10a7 7 0 1 1-3-5.75L17 3l-1 3.5A6.98 6.98 0 0 1 17 10z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
                    </svg>
                    {formatCount(commentCount)}
                  </span>
                )}
                {viewCount != null && (
                  <span className="gp-stat">
                    <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                      <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    </svg>
                    {formatCount(viewCount)}
                  </span>
                )}
              </div>
            )}

            {(location || attendees != null || ticketPrice != null) && (
              <div className="gp-pills">
                {location && (
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
                {ticketPrice != null && (
                  <span className="gp-pill gp-pill-accent">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <rect x="1" y="3" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                      <path d="M4 3V2M8 3V2" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                    {ticketPrice === 0 ? 'Gratuit' : `À partir de ${ticketPrice.toLocaleString()} XOF`}
                  </span>
                )}
              </div>
            )}

            {body && (
              <>
                <div className="gp-divider" />
                <p className={`gp-body${longBody && !bodyOpen ? ' is-clamped' : ''}`}>
                  {renderTextWithLinks(body, 'underline font-semibold')}
                </p>
                {longBody && (
                  <button className="gp-body-more" onClick={() => setBodyOpen(v => !v)}>
                    {bodyOpen ? 'Voir moins' : 'Voir plus'}
                  </button>
                )}
              </>
            )}
          </section>

          {/* Invitation à rejoindre */}
          <section className="gp-cta-card">
            <p className="gp-cta-headline">{cfg.cta}</p>
            <p className="gp-cta-sub">Rejoins Gofolyx · concerts, events, reels et bien plus. Gratuit.</p>
            <div className="gp-cta-btns">
              <Link to={`/auth/register?redirect=${redirectParam}`} className="gp-pillbtn gp-pillbtn-solid">S'inscrire</Link>
              <Link to={`/auth/login?redirect=${redirectParam}`} className="gp-pillbtn gp-pillbtn-ghost">Se connecter</Link>
            </div>
          </section>
        </main>

        {/* Barre d'action flottante — mobile */}
        <div className="gp-dock">
          <Link to={`/auth/login?redirect=${redirectParam}`} className="gp-pillbtn gp-pillbtn-ghost">Se connecter</Link>
          <Link to={`/auth/register?redirect=${redirectParam}`} className="gp-pillbtn gp-pillbtn-solid">S'inscrire</Link>
        </div>

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
