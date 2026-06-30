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

/** Rendu d'un filtre : overlay(s) coloré(s) par-dessus le média, identique mobile */
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
