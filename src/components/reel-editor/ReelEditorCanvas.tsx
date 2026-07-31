import { useEffect, useRef } from 'react';
import { FilterOverlay, ReelTextLayers, ReelStickerLayers, ReelVideoAdjust } from '../../utils/reelFilters.tsx';
import { DrawCanvas } from './DrawCanvas';
import type { ReelEditState } from './types';

interface Props {
  mediaUrl: string;
  isPhoto: boolean;
  edit: ReelEditState;
  durationSec: number;
  drawActive: boolean;
  drawColor: string;
  drawWidth: number;
  onDrawCommit: (points: { x: number; y: number }[]) => void;
  onVideoRef?: (el: HTMLVideoElement | null) => void;
  onDurationLoaded?: (dur: number) => void;
  children?: React.ReactNode; // couches interactives (DraggableLayer) posées par-dessus
}

/**
 * Preview plein cadre (9:16) réutilisant tel quel le moteur de rendu du feed
 * (reelFilters.tsx) — garantit que ce qui est édité correspond exactement à
 * ce qui s'affichera après publication. Gère aussi la boucle de lecture
 * confinée au trim et la vitesse de lecture (vidéo uniquement — sans effet
 * en mode photo, portage du comportement mobile ReelEditorScreen.tsx:402).
 */
export function ReelEditorCanvas({
  mediaUrl, isPhoto, edit, durationSec, drawActive, drawColor, drawWidth, onDrawCommit,
  onVideoRef, onDurationLoaded, children,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isPhoto) onVideoRef?.(videoRef.current);
  }, [onVideoRef, isPhoto]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || isPhoto) return;
    v.playbackRate = edit.speed;
  }, [edit.speed, isPhoto]);

  // Boucle de lecture confinée au segment trimmé — le <video> HTML natif n'a
  // pas de notion de trim, on reseek manuellement au timeupdate.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || isPhoto || durationSec <= 0) return;
    const startSec = edit.startRatio * durationSec;
    const endSec = edit.endRatio * durationSec;
    const onTimeUpdate = () => {
      if (v.currentTime >= endSec - 0.1) v.currentTime = startSec;
      else if (v.currentTime < startSec) v.currentTime = startSec;
    };
    v.addEventListener('timeupdate', onTimeUpdate);
    return () => v.removeEventListener('timeupdate', onTimeUpdate);
  }, [edit.startRatio, edit.endRatio, durationSec, isPhoto]);

  const textJson = edit.layers.length ? JSON.stringify(edit.layers) : undefined;
  const stickerJson = edit.stickers.length ? JSON.stringify(edit.stickers) : undefined;
  const adjustJson = JSON.stringify(edit.adjust);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#000' }}>
      {isPhoto ? (
        <>
          {/* Fond flouté agrandi — comble l'espace autour d'une photo dont le
              ratio ne correspond pas à l'écran 9:16, sans jamais recadrer
              l'image d'origine (même pattern que ReelEditorScreen.tsx mobile). */}
          <img src={mediaUrl} aria-hidden className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'blur(24px)' }} />
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.35)' }} />
          <img src={mediaUrl} className="absolute inset-0 w-full h-full object-contain" />
        </>
      ) : (
        <video
          ref={videoRef}
          src={mediaUrl}
          className="absolute inset-0 w-full h-full object-contain"
          autoPlay
          loop
          muted
          playsInline
          onLoadedMetadata={e => onDurationLoaded?.(e.currentTarget.duration)}
        />
      )}

      <FilterOverlay filterName={edit.filter} />
      <ReelTextLayers json={textJson} />
      <ReelStickerLayers json={stickerJson} />
      <DrawCanvas
        active={drawActive}
        color={drawColor}
        width={drawWidth}
        onCommit={onDrawCommit}
      />
      <ReelVideoAdjust json={adjustJson} />

      {children}
    </div>
  );
}
