import { useEffect, useRef } from 'react';
import type { DrawPoint } from './types';

interface Props {
  active: boolean;
  color: string;
  width: number;
  onCommit: (points: DrawPoint[]) => void;
}

/**
 * Zone de dessin interactive (canvas HTML), active seulement quand l'outil
 * "Dessin" est sélectionné. Capture les points bruts au pointermove — la
 * lecture (ReelDrawLayers, reelFilters.tsx) reste inchangée et consomme le
 * même format DrawPath[]/points[] produit ici, seul le rendu d'ÉDITION passe
 * par un vrai <canvas> (plus simple/performant qu'une pile de divs pivotés).
 */
export function DrawCanvas({ active, color, width, onCommit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<DrawPoint[]>([]);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>): DrawPoint {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!active) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    pointsRef.current = [getPos(e)];
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!active || !drawingRef.current) return;
    const pt = getPos(e);
    pointsRef.current.push(pt);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas!.width, canvas!.height);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const pts = pointsRef.current;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  function handlePointerUp() {
    if (!active || !drawingRef.current) return;
    drawingRef.current = false;
    if (pointsRef.current.length > 1) onCommit(pointsRef.current);
    pointsRef.current = [];
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 6, pointerEvents: active ? 'auto' : 'none', touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
