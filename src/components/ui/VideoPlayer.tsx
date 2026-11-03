import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { Link } from 'react-router-dom';
import { MonitorOff } from 'lucide-react';
import { applyHlsQualityPref } from '../../utils/hlsQuality';
import { getEntitlements } from '../../hooks/useEntitlements';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import Hls from 'hls.js';

// ── MIME type par extension ───────────────────────────────────────────────────
const MIME_MAP: Record<string, string> = {
  mp4:  'video/mp4',
  webm: 'video/webm',
  ogv:  'video/ogg',
  ogg:  'video/ogg',
  mov:  'video/quicktime',
  avi:  'video/x-msvideo',
  mkv:  'video/x-matroska',
  flv:  'video/x-flv',
  wmv:  'video/x-ms-wmv',
  mpg:  'video/mpeg',
  mpeg: 'video/mpeg',
  '3gp': 'video/3gpp',
};

function getExt(url: string): string {
  try {
    const path = new URL(url).pathname;
    return path.split('.').pop()?.toLowerCase() ?? '';
  } catch {
    return url.split('.').pop()?.toLowerCase() ?? '';
  }
}

function isHls(url: string): boolean {
  const ext = getExt(url);
  return ext === 'm3u8' || url.includes('.m3u8');
}

function getMime(url: string): string {
  return MIME_MAP[getExt(url)] ?? 'video/mp4';
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface VideoPlayerProps {
  url: string;
  poster?: string;
  autoPlay?: boolean;
  className?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export interface VideoPlayerHandle {
  currentTime: () => number;
  duration: () => number;
}

// ── Composant ─────────────────────────────────────────────────────────────────

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ url, poster, autoPlay = true, className, onTimeUpdate, onPause, onEnded }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef   = useRef<Hls | null>(null);
    // Ref : changer le réglage de lecture auto pendant la lecture ne doit pas
    // recharger le flux (et donc perdre la position) — seul `url` le fait.
    const autoPlayRef = useRef(autoPlay);
    autoPlayRef.current = autoPlay;

    useImperativeHandle(ref, () => ({
      currentTime: () => videoRef.current?.currentTime ?? 0,
      duration:    () => videoRef.current?.duration    ?? 0,
    }));

    // ── Session de lecture (écrans simultanés) ────────────────────────────────
    // Une session est ouverte au « play », prolongée toutes les 30 s et fermée à la pause / fin /
    // démontage. Si le plan est déjà au maximum d'écrans, le serveur répond 429 `too_many_screens` :
    // on coupe la lecture et on propose de changer de plan. Panne réseau → on ne bloque jamais.
    const sessionRef  = useRef<string | null>(null);
    const opening     = useRef(false);
    const beatTimer   = useRef<ReturnType<typeof setInterval> | null>(null);
    const [blocked, setBlocked] = useState<string | null>(null);

    const closeSession = useCallback(() => {
      if (beatTimer.current) { clearInterval(beatTimer.current); beatTimer.current = null; }
      const id = sessionRef.current;
      sessionRef.current = null;
      if (id) apiClient.delete(Endpoints.playback.end(id)).catch(() => {});
    }, []);

    const openSession = useCallback(async () => {
      if (sessionRef.current || opening.current) return;
      opening.current = true;
      try {
        const r = await apiClient.post<{ session_id: string }>(Endpoints.playback.sessions);
        sessionRef.current = r.data.session_id;
        beatTimer.current = setInterval(async () => {
          const id = sessionRef.current;
          if (!id) return;
          try {
            const hb = await apiClient.post<{ alive: boolean }>(Endpoints.playback.heartbeat(id));
            if (!hb.data?.alive) { sessionRef.current = null; await openSession(); }
          } catch { /* réseau : on réessaie au battement suivant */ }
        }, 30_000);
      } catch (err: any) {
        const detail = err?.data?.detail;
        if (err?.status === 429 && detail?.code === 'too_many_screens') {
          videoRef.current?.pause();
          setBlocked(detail.message ?? "Votre plan autorise moins d'écrans simultanés.");
        }
      } finally {
        opening.current = false;
      }
    }, []);

    useEffect(() => closeSession, [closeSession]);

    // Monte/démonte HLS ou src natif selon l'URL
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !url) return;
      let cancelled = false;

      // Nettoie l'instance HLS précédente
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setBlocked(null);

      (async () => {
        // Droits lus AVANT de charger le flux : la qualité max du plan s'applique dès la 1re variante.
        const ent = await getEntitlements();
        if (cancelled) return;
        const planMaxHeight = ent?.max_height;

        if (isHls(url)) {
          if (Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
            hlsRef.current = hls;
            applyHlsQualityPref(hls, planMaxHeight);
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              if (autoPlayRef.current) video.play().catch(() => {});
            });
            hls.on(Hls.Events.ERROR, (_: unknown, data: any) => {
              if (data.fatal) hls.destroy();
            });
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari — HLS natif (pas de plafond de variante possible côté client)
            video.src = url;
            if (autoPlayRef.current) video.play().catch(() => {});
          }
        } else {
          // Fichier direct — on laisse le navigateur détecter
          video.src = url;
          if (autoPlayRef.current) video.play().catch(() => {});
        }
      })();

      return () => {
        cancelled = true;
        if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
        video.src = '';
      };
    }, [url]);

    // Callbacks
    const handleTimeUpdate = useCallback(() => {
      const v = videoRef.current;
      if (v && onTimeUpdate) onTimeUpdate(v.currentTime, v.duration || 0);
    }, [onTimeUpdate]);

    const handlePause = useCallback(() => {
      closeSession();
      onPause?.();
    }, [onPause, closeSession]);

    const handleEnded = useCallback(() => {
      closeSession();
      onEnded?.();
    }, [onEnded, closeSession]);

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <video
          ref={videoRef}
          className={className ?? 'w-full h-full'}
          style={{ objectFit: 'contain', display: 'block' }}
          poster={poster}
          controls
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onPlay={openSession}
          onPause={handlePause}
          onEnded={handleEnded}
        />
        {blocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
            style={{ background: 'rgba(8,6,20,.92)', backdropFilter: 'blur(6px)' }}>
            <MonitorOff size={34} style={{ color: '#fff', opacity: 0.85 }} />
            <p className="text-sm font-semibold text-white max-w-sm">{blocked}</p>
            <div className="flex gap-2">
              <Link to="/wallet/subscription/plans"
                className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
                Changer de plan
              </Link>
              <button onClick={() => { setBlocked(null); videoRef.current?.play().catch(() => {}); }}
                className="px-4 py-2 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(255,255,255,.14)', color: '#fff', border: '1px solid rgba(255,255,255,.22)' }}>
                Réessayer
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);
