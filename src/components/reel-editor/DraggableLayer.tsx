import { useRef, useState } from 'react';

interface Props {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  minScale?: number;
  maxScale?: number;
  selected: boolean;
  onSelect: () => void;
  onCommit: (x: number, y: number, scale: number) => void;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Zone tactile invisible superposée à la position d'un TextLayer/StickerLayer
 * (rendus visuellement par ReelTextLayers/ReelStickerLayers, réutilisés tels
 * quels) — capture drag (1 pointer) et pinch-to-scale (2 pointers) en pointer
 * events natifs, portage du modèle mobile _makeDrag (ReelEditorScreen.tsx:744-803).
 * Ne committe dans le state parent qu'au relâchement (perf), déplace en live
 * via un offset local pendant le geste.
 */
export function DraggableLayer({
  x, y, width, height, scale, minScale = 0.3, maxScale = 4,
  selected, onSelect, onCommit,
}: Props) {
  const [liveOffset, setLiveOffset] = useState({ dx: 0, dy: 0, scale });
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const grantRef = useRef({ x: 0, y: 0, scale: 1, pinchDist: 0 });
  const draggingRef = useRef(false);

  function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  function handlePointerDown(e: React.PointerEvent) {
    onSelect();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    draggingRef.current = true;

    if (pointersRef.current.size === 1) {
      grantRef.current = { x: e.clientX, y: e.clientY, scale: liveOffset.scale, pinchDist: 0 };
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      grantRef.current.pinchDist = dist(pts[0], pts[1]);
      grantRef.current.scale = liveOffset.scale;
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingRef.current || !pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      const dx = e.clientX - grantRef.current.x;
      const dy = e.clientY - grantRef.current.y;
      setLiveOffset(prev => ({ ...prev, dx, dy }));
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const d = dist(pts[0], pts[1]);
      if (grantRef.current.pinchDist > 0) {
        const ratio = d / grantRef.current.pinchDist;
        const nextScale = clamp(grantRef.current.scale * ratio, minScale, maxScale);
        setLiveOffset(prev => ({ ...prev, scale: nextScale }));
      }
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size === 0) {
      draggingRef.current = false;
      const finalX = x + liveOffset.dx;
      const finalY = y + liveOffset.dy;
      const finalScale = liveOffset.scale;
      onCommit(finalX, finalY, finalScale);
      setLiveOffset({ dx: 0, dy: 0, scale: finalScale });
    }
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'absolute',
        left: x + liveOffset.dx,
        top: y + liveOffset.dy,
        width: width * liveOffset.scale,
        height: height * liveOffset.scale,
        zIndex: 20,
        touchAction: 'none',
        cursor: 'grab',
        border: selected ? '1.5px dashed rgba(123,63,242,0.8)' : '1.5px dashed transparent',
        borderRadius: 6,
      }}
    />
  );
}
