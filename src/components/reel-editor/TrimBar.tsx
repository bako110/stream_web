import { useRef, useState } from 'react';
import { MAX_TRIM } from './types';

interface Props {
  durationSec: number;
  startRatio: number;
  endRatio: number;
  onChange: (startRatio: number, endRatio: number) => void;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Barre de découpage vidéo — portage direct de la logique leftPan/rightPan
 * du mobile (ReelEditorScreen.tsx:682-731) en pointer events natifs. Ratios
 * [0,1] relatifs à durationSec, contrainte MAX_TRIM (10 min) avec repousse
 * automatique de la poignée opposée pour ne jamais la dépasser.
 */
export function TrimBar({ durationSec, startRatio, endRatio, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'left' | 'right' | null>(null);
  const grantRef = useRef({ startRatio: 0, endRatio: 0, trackW: 0, startX: 0 });

  const startSec = startRatio * durationSec;
  const endSec = endRatio * durationSec;
  const trimSec = endSec - startSec;
  const trimValid = trimSec >= 1 && trimSec <= MAX_TRIM;
  const maxTrimRatio = durationSec > 0 ? MAX_TRIM / durationSec : 1;

  function handlePointerDown(handle: 'left' | 'right', e: React.PointerEvent) {
    if (!trackRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    grantRef.current = {
      startRatio, endRatio,
      trackW: trackRef.current.getBoundingClientRect().width,
      startX: e.clientX,
    };
    setDragging(handle);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging || durationSec <= 0) return;
    const { trackW, startX } = grantRef.current;
    if (trackW <= 0) return;
    const dx = e.clientX - startX;

    if (dragging === 'left') {
      const raw = grantRef.current.startRatio + dx / trackW;
      const r = clamp(raw, 0, endRatio - 1 / durationSec);
      const minEnd = Math.min(r + maxTrimRatio, 1);
      const nextEnd = endRatio > minEnd ? minEnd : endRatio;
      onChange(r, nextEnd);
    } else {
      const raw = grantRef.current.endRatio + dx / trackW;
      const maxR = Math.min(startRatio + maxTrimRatio, 1);
      const r = clamp(raw, startRatio + 1 / durationSec, maxR);
      onChange(startRatio, r);
    }
  }

  function handlePointerUp() {
    setDragging(null);
  }

  const leftPct = startRatio * 100;
  const rightPct = (1 - endRatio) * 100;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold" style={{ color: trimValid ? 'var(--text-secondary)' : '#EF4444' }}>
          {fmt(trimSec)}{!trimValid && (trimSec < 1 ? ' · min 1s' : ` · max ${Math.round(MAX_TRIM / 60)}min`)}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{fmt(durationSec)} au total</span>
      </div>
      <div
        ref={trackRef}
        className="relative h-10 rounded-lg overflow-hidden select-none"
        style={{ background: 'var(--bg-secondary)', touchAction: 'none' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Zone sélectionnée */}
        <div
          className="absolute top-0 bottom-0"
          style={{ left: `${leftPct}%`, right: `${rightPct}%`, background: 'rgba(123,63,242,0.3)', border: '2px solid var(--primary)' }}
        />
        {/* Poignée gauche */}
        <div
          className="absolute top-0 bottom-0 w-4 flex items-center justify-center cursor-ew-resize"
          style={{ left: `calc(${leftPct}% - 8px)`, background: 'var(--primary)', borderRadius: '6px 0 0 6px' }}
          onPointerDown={e => handlePointerDown('left', e)}
        >
          <div className="w-0.5 h-4 bg-white rounded-full" />
        </div>
        {/* Poignée droite */}
        <div
          className="absolute top-0 bottom-0 w-4 flex items-center justify-center cursor-ew-resize"
          style={{ right: `calc(${rightPct}% - 8px)`, background: 'var(--primary)', borderRadius: '0 6px 6px 0' }}
          onPointerDown={e => handlePointerDown('right', e)}
        >
          <div className="w-0.5 h-4 bg-white rounded-full" />
        </div>
      </div>
    </div>
  );
}
