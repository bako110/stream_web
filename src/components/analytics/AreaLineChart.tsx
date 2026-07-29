import { useId, useState } from 'react';

const CHART_H = 140;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 24;

export interface AreaLineChartPoint {
  value: number;
  label: string;
  /** Texte affiché dans le tooltip au-dessus du label (ex: "1 284 vues", "42,00 €") */
  tooltipValue: string;
}

interface Props {
  data: AreaLineChartPoint[];
  color: string;
  width?: number;
  height?: number;
  /** Affiche un label sous chaque point, pas seulement 1 sur N — utile pour peu de points (ex: 5 années) */
  labelEvery?: number;
}

/**
 * Courbe + aire dégradée avec tooltip au survol — le même style visuel pour
 * toute série temporelle de l'app (vues, revenus, etc.). Générique : ne connaît
 * ni "vues" ni "revenus", juste value/label/tooltipValue déjà formatés par l'appelant.
 */
export function AreaLineChart({ data, color, width = 300, height = CHART_H, labelEvery }: Props) {
  const gradId = useId();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Pas encore de données</p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const chartInnerH = height - PADDING_TOP - PADDING_BOTTOM;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const points = data.map((d, i) => ({
    x: data.length > 1 ? i * stepX : width / 2,
    y: PADDING_TOP + chartInnerH - (d.value / maxVal) * chartInnerH,
    d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - PADDING_BOTTOM} L ${points[0].x} ${height - PADDING_BOTTOM} Z`;

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    let closest = 0;
    let closestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - x);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    setActiveIdx(closest);
  };

  const active = activeIdx != null ? points[activeIdx] : null;
  const step = labelEvery ?? Math.max(1, Math.ceil(points.length / 5));

  return (
    <div>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setActiveIdx(null)}
        style={{ cursor: 'crosshair', maxWidth: '100%', width: '100%', height: 'auto' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity={0.35} />
            <stop offset="1" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {active && (
          <>
            <line x1={active.x} y1={PADDING_TOP} x2={active.x} y2={height - PADDING_BOTTOM} stroke={color} strokeWidth={1} strokeDasharray="4,4" opacity={0.5} />
            <circle cx={active.x} cy={active.y} r={5} fill={color} stroke="var(--surface)" strokeWidth={2} />
          </>
        )}
      </svg>

      {active && (
        <div className="text-center -mt-1 mb-1">
          <p className="text-[13px] font-black" style={{ color: 'var(--text-primary)' }}>{active.d.tooltipValue}</p>
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{active.d.label}</p>
        </div>
      )}

      <div className="relative h-4">
        {points.map((p, i) => {
          const labelWPct = (32 / width) * 100; // largeur du label (w-8) en % de la largeur du graphique
          const leftPct = Math.max(0, Math.min(100 - labelWPct, (p.x / width) * 100 - labelWPct / 2));
          return (i % step === 0 || i === points.length - 1) ? (
            <span
              key={i}
              className="absolute text-[9px] w-8 text-center"
              style={{ left: `${leftPct}%`, color: 'var(--text-tertiary)' }}
            >
              {p.d.label}
            </span>
          ) : null;
        })}
      </div>
    </div>
  );
}
