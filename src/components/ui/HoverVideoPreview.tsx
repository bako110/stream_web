import { useRef, useState, useCallback, useEffect } from 'react';
import Hls from 'hls.js';

interface Props {
  src?: string | null;
  poster?: string | null;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * Vignette avec aperçu vidéo au survol souris — lecture muette en boucle,
 * chargée seulement au premier hover (pas de préchargement systématique
 * de toute la grille, qui saturerait la bande passante).
 */
export function HoverVideoPreview({ src, poster, className, style, children }: Props) {
  const [hovering, setHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef   = useRef<Hls | null>(null);
  const loadedRef = useRef(false);

  const setupVideo = useCallback((v: HTMLVideoElement | null) => {
    videoRef.current = v;
  }, []);

  function loadAndPlay() {
    const v = videoRef.current;
    if (!v || !src || loadedRef.current) { v?.play().catch(() => {}); return; }
    loadedRef.current = true;
    const isHls = src.includes('.m3u8') || src.includes('/hls/');
    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ autoStartLoad: true, maxBufferLength: 15 });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { v.play().catch(() => {}); });
      hls.on(Hls.Events.ERROR, (_e, data) => { if (data.fatal) hls.destroy(); });
    } else {
      v.src = src;
      v.play().catch(() => {});
    }
  }

  function handleEnter() {
    setHovering(true);
    loadAndPlay();
  }
  function handleLeave() {
    setHovering(false);
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
  }

  useEffect(() => () => { hlsRef.current?.destroy(); }, []);

  return (
    <div className={className} style={style} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {poster && (
        <img src={poster} alt="" className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200"
          style={{ opacity: hovering && src ? 0 : 1 }} />
      )}
      {src && (
        <video
          ref={setupVideo}
          muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200"
          style={{ opacity: hovering ? 1 : 0 }}
        />
      )}
      {children}
    </div>
  );
}
