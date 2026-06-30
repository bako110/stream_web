import React from 'react';

// Filtres identiques au mobile (ReelEditorScreen.tsx)
export interface FilterDef {
  key: string;
  label: string;
  overlay: string;
  opacity: number;
  overlay2?: string;
  opacity2?: number;
}

export const FILTERS: FilterDef[] = [
  // Base
  { key: 'original', label: 'Normal',  overlay: 'transparent', opacity: 0 },
  // Cinema
  { key: 'vivid',    label: 'Vivid',   overlay: '#FF3CAC',      opacity: 0.25 },
  { key: 'drama',    label: 'Drama',   overlay: '#1A003A',      opacity: 0.45 },
  { key: 'noir',     label: 'Noir',    overlay: '#000000',      opacity: 0.60 },
  { key: 'fade',     label: 'Fade',    overlay: '#FFFFFF',      opacity: 0.30 },
  // Mood
  { key: 'warm',     label: 'Warm',    overlay: '#FF7E00',      opacity: 0.28 },
  { key: 'cold',     label: 'Cold',    overlay: '#00BFFF',      opacity: 0.25 },
  { key: 'golden',   label: 'Golden',  overlay: '#FFD700',      opacity: 0.24 },
  { key: 'rose',     label: 'Rose',    overlay: '#FF6B9D',      opacity: 0.22 },
  // Neon
  { key: 'neon',     label: 'Neon',    overlay: '#00FF88',      opacity: 0.18, overlay2: '#FF00FF', opacity2: 0.10 },
  { key: 'cyber',    label: 'Cyber',   overlay: '#00F5FF',      opacity: 0.20, overlay2: '#FF00AA', opacity2: 0.08 },
  { key: 'acid',     label: 'Acid',    overlay: '#AAFF00',      opacity: 0.22 },
  // Vintage
  { key: 'retro',    label: 'Retro',   overlay: '#FF8C00',      opacity: 0.30, overlay2: '#000000', opacity2: 0.15 },
  { key: 'sepia',    label: 'Sepia',   overlay: '#C8A96E',      opacity: 0.40 },
  { key: 'vhs',      label: 'VHS',     overlay: '#0066FF',      opacity: 0.15, overlay2: '#FF0000', opacity2: 0.08 },
  { key: 'lomo',     label: 'Lomo',    overlay: '#1A0030',      opacity: 0.35, overlay2: '#FF6600', opacity2: 0.12 },
];

export const FILTER_MAP = new Map<string, FilterDef>(FILTERS.map(f => [f.key, f]));

export function getFilter(key: string | null | undefined): FilterDef {
  return FILTER_MAP.get(key ?? 'original') ?? FILTERS[0];
}

/** Rendu du filtre couleur (zIndex 2-3) */
export function FilterOverlay({ filterName }: { filterName?: string | null }) {
  const f = getFilter(filterName);
  if (f.opacity <= 0) return null;
  return (
    <>
      <div
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
          backgroundColor: f.overlay,
          opacity: f.opacity,
        }}
      />
      {f.overlay2 && (f.opacity2 ?? 0) > 0 && (
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3,
            backgroundColor: f.overlay2,
            opacity: f.opacity2,
          }}
        />
      )}
    </>
  );
}

// ── Reel text layers (zIndex 4) ──────────────────────────────────────────────

interface ReelTextLayer {
  id: string; text: string; x: number; y: number;
  color: string; fontSize: number; bold: boolean; italic: boolean;
  bg: boolean; bgColor: string; align: string; outline: boolean;
}

export function ReelTextLayers({ json }: { json?: string | null }) {
  if (!json) return null;
  let layers: ReelTextLayer[];
  try { layers = JSON.parse(json); } catch { return null; }
  if (!layers.length) return null;
  return (
    <>
      {layers.map(l => (
        <div key={l.id} style={{
          position: 'absolute', left: l.x, top: l.y,
          zIndex: 4, pointerEvents: 'none',
          maxWidth: `calc(100% - ${l.x + 8}px)`,
        }}>
          <span style={{
            display: 'inline-block',
            color: l.color,
            fontSize: l.fontSize,
            fontWeight: l.bold ? 800 : 400,
            fontStyle: l.italic ? 'italic' : 'normal',
            textAlign: (l.align as React.CSSProperties['textAlign']) ?? 'center',
            backgroundColor: l.bg && l.bgColor !== 'transparent' ? l.bgColor : 'transparent',
            paddingInline: l.bg ? 10 : 0,
            paddingBlock: l.bg ? 5 : 0,
            borderRadius: l.bg ? 8 : 0,
            textShadow: l.outline
              ? (l.color === '#FFFFFF' ? '0 1px 2px #000' : '0 1px 2px #fff')
              : '0 1px 4px rgba(0,0,0,0.85)',
            lineHeight: 1.3,
            whiteSpace: 'pre-wrap',
          }}>
            {l.text}
          </span>
        </div>
      ))}
    </>
  );
}

// ── Reel sticker layers (zIndex 5) ───────────────────────────────────────────

interface ReelStickerLayer {
  id: string; emoji: string; x: number; y: number; scale: number;
}

export function ReelStickerLayers({ json }: { json?: string | null }) {
  if (!json) return null;
  let stickers: ReelStickerLayer[];
  try { stickers = JSON.parse(json); } catch { return null; }
  if (!stickers.length) return null;
  return (
    <>
      {stickers.map(st => (
        <div key={st.id} style={{
          position: 'absolute', left: st.x, top: st.y,
          zIndex: 5, pointerEvents: 'none',
          fontSize: 44 * (st.scale ?? 1),
          lineHeight: 1,
        }}>
          {st.emoji}
        </div>
      ))}
    </>
  );
}

// ── Reel draw layers (zIndex 6) ──────────────────────────────────────────────

interface DrawPoint { x: number; y: number; }
interface ReelDrawPath { id: string; color: string; width: number; points: DrawPoint[]; }

export function ReelDrawLayers({ json }: { json?: string | null }) {
  if (!json) return null;
  let paths: ReelDrawPath[];
  try { paths = JSON.parse(json); } catch { return null; }
  if (!paths.length) return null;

  const segments: React.ReactNode[] = [];
  paths.forEach(path => {
    path.points.slice(0, -1).forEach((pt, i) => {
      const next = path.points[i + 1];
      const dx = next.x - pt.x;
      const dy = next.y - pt.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      segments.push(
        <div key={`${path.id}_${i}`} style={{
          position: 'absolute',
          left: pt.x,
          top: pt.y - path.width / 2,
          width: len,
          height: path.width,
          borderRadius: path.width / 2,
          backgroundColor: path.color,
          zIndex: 6,
          pointerEvents: 'none',
          transformOrigin: 'left center',
          transform: `rotate(${angle}deg)`,
        }} />
      );
    });
  });
  return <>{segments}</>;
}

// ── Reel video_adjust (zIndex 7) ─────────────────────────────────────────────

interface VideoAdjust { brightness: number; contrast: number; saturation: number; temperature: number; }

export function ReelVideoAdjust({ json }: { json?: string | null }) {
  if (!json) return null;
  let adj: VideoAdjust;
  try { adj = JSON.parse(json); } catch { return null; }
  const base: React.CSSProperties = { position: 'absolute', inset: 0, zIndex: 7, pointerEvents: 'none' };
  return (
    <>
      {adj.brightness > 0 && (
        <div style={{ ...base, backgroundColor: `rgba(255,255,255,${adj.brightness * 0.35})` }} />
      )}
      {adj.brightness < 0 && (
        <div style={{ ...base, backgroundColor: `rgba(0,0,0,${Math.abs(adj.brightness) * 0.45})` }} />
      )}
      {adj.temperature > 0 && (
        <div style={{ ...base, backgroundColor: `rgba(255,120,0,${adj.temperature * 0.18})` }} />
      )}
      {adj.temperature < 0 && (
        <div style={{ ...base, backgroundColor: `rgba(0,120,255,${Math.abs(adj.temperature) * 0.18})` }} />
      )}
      {adj.saturation < 0 && (
        <div style={{ ...base, backgroundColor: `rgba(128,128,128,${Math.abs(adj.saturation) * 0.45})` }} />
      )}
      {adj.contrast > 0 && (
        <div style={{ ...base, backgroundColor: `rgba(0,0,0,${adj.contrast * 0.12})` }} />
      )}
    </>
  );
}

// ── Story overlays_json ───────────────────────────────────────────────────────

interface StoryTextLayer {
  id: string; text: string; color: string; fontSize: number;
  x: number; y: number; bold: boolean; rotation: number; scale: number;
  bg: 'none' | 'solid' | 'semi'; bgColor: string;
}
interface StoryDrawPath { id: string; d: string; color: string; width: number; }
interface StoryMask { id: string; x: number; y: number; w: number; h: number; color?: string; opacity?: number; }
interface StoryStickerLayer { id: string; emoji: string; x: number; y: number; scale: number; rotation: number; }
interface StoryOverlays {
  textLayers?: StoryTextLayer[];
  drawPaths?: StoryDrawPath[];
  masks?: StoryMask[];
  stickers?: StoryStickerLayer[];
}

export function StoryOverlaysRenderer({
  overlaysJson, width, height,
}: { overlaysJson?: string | null; width: number; height: number }) {
  if (!overlaysJson) return null;
  let overlays: StoryOverlays;
  try { overlays = JSON.parse(overlaysJson); } catch { return null; }

  const { textLayers = [], drawPaths = [], masks = [], stickers = [] } = overlays;
  if (!textLayers.length && !drawPaths.length && !masks.length && !stickers.length) return null;

  const W = width;
  const H = height;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>

      {/* SVG draw paths */}
      {drawPaths.length > 0 && (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {drawPaths.map(p => (
            <path
              key={p.id}
              d={p.d}
              stroke={p.color}
              strokeWidth={p.width}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      )}

      {/* Masks */}
      {masks.map(m => (
        <div key={m.id} style={{
          position: 'absolute',
          left: m.x * W, top: m.y * H,
          width: m.w * W, height: m.h * H,
          backgroundColor: m.color ?? '#000000',
          opacity: m.opacity ?? 1,
          borderRadius: 4,
        }} />
      ))}

      {/* Text layers */}
      {textLayers.map(l => {
        const bgStyle: React.CSSProperties = l.bg === 'none'
          ? {}
          : {
              backgroundColor: l.bg === 'solid' ? l.bgColor : l.bgColor + 'BB',
              paddingInline: 8,
              paddingBlock: 4,
              borderRadius: 6,
            };
        return (
          <div key={l.id} style={{
            position: 'absolute',
            left: l.x * W,
            top: l.y * H,
            transform: `scale(${l.scale}) rotate(${l.rotation}rad)`,
            transformOrigin: 'top left',
            ...bgStyle,
          }}>
            <span style={{
              display: 'block',
              color: l.color,
              fontSize: l.fontSize,
              fontWeight: l.bold ? 'bold' : 'normal',
              textShadow: l.bg === 'none' ? '0 1px 3px rgba(0,0,0,0.7)' : 'none',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.3,
            }}>
              {l.text}
            </span>
          </div>
        );
      })}

      {/* Stickers */}
      {stickers.map(s => (
        <div key={s.id} style={{
          position: 'absolute',
          left: s.x * W - 24,
          top: s.y * H - 24,
          fontSize: 42 * (s.scale ?? 1),
          lineHeight: 1,
          transform: `rotate(${s.rotation}rad)`,
          transformOrigin: 'center',
        }}>
          {s.emoji}
        </div>
      ))}
    </div>
  );
}
