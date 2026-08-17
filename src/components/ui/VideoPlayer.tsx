import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
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

    useImperativeHandle(ref, () => ({
      currentTime: () => videoRef.current?.currentTime ?? 0,
      duration:    () => videoRef.current?.duration    ?? 0,
    }));

    // Monte/démonte HLS ou src natif selon l'URL
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !url) return;

      // Nettoie l'instance HLS précédente
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (isHls(url)) {
        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (autoPlay) video.play().catch(() => {});
          });
          hls.on(Hls.Events.ERROR, (_: unknown, data: any) => {
            if (data.fatal) hls.destroy();
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari — HLS natif
          video.src = url;
          if (autoPlay) video.play().catch(() => {});
        }
      } else {
        // Fichier direct — on laisse le navigateur détecter
        video.src = url;
        if (autoPlay) video.play().catch(() => {});
      }

      return () => {
        if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
        video.src = '';
      };
    }, [url, autoPlay]);

    // Callbacks
    const handleTimeUpdate = useCallback(() => {
      const v = videoRef.current;
      if (v && onTimeUpdate) onTimeUpdate(v.currentTime, v.duration || 0);
    }, [onTimeUpdate]);

    const handlePause = useCallback(() => {
      onPause?.();
    }, [onPause]);

    const handleEnded = useCallback(() => {
      onEnded?.();
    }, [onEnded]);

    return (
      <video
        ref={videoRef}
        className={className ?? 'w-full h-full'}
        style={{ objectFit: 'contain', display: 'block' }}
        poster={poster}
        controls
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onPause={handlePause}
        onEnded={handleEnded}
      />
    );
  }
);
