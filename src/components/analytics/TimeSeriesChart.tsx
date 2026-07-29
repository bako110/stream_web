import { useId, useState } from 'react';
import type { TimeseriesPoint, AnalyticsGranularity } from '../../api/analyticsService';

const CHART_H = 140;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 24;

interface Props {
  data: TimeseriesPoint[];
  granularity: AnalyticsGranularity;
  color: string;
  width?: number;
}

function formatLabel(bucket: string, granularity: AnalyticsGranularity): string {
  const d = new Date(bucket);
  if (isNaN(d.getTime())) return '';
  switch (granularity) {
    case 'hour':  return d.toLocaleTimeString('fr-FR', { hour: '2-digit' });
    case 'day':   return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    case 'week':  return `S${Math.ceil(d.getDate() / 7)}`;
    case 'month': return d.toLocaleDateString('fr-FR', { month: 'short' });
    default:      return '';
  }
}

export function TimeSeriesChart({ data, granularity, color, width = 300 }: Props) {
  const gradId = useId();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div style={{ height: CHART_H }} className="flex items-center justify-center">
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Pas encore de données</p>
      </div>
    );
  }

  const maxViews = Math.max(...data.map(d => d.views), 1);
  const chartInnerH = CHART_H - PADDING_TOP - PADDING_BOTTOM;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const points = data.map((d, i) => ({
    x: data.length > 1 ? i * stepX : width / 2,
    y: PADDING_TOP + chartInnerH - (d.views / maxViews) * chartInnerH,
    d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${CHART_H - PADDING_BOTTOM} L ${points[0].x} ${CHART_H - PADDING_BOTTOM} Z`;

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
  const labelStep = Math.max(1, Math.ceil(points.length / 5));

  return (
    <div>
      <svg
        width={width}
        height={CHART_H}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setActiveIdx(null)}
        style={{ cursor: 'crosshair', maxWidth: '100%' }}
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
            <line x1={active.x} y1={PADDING_TOP} x2={active.x} y2={CHART_H - PADDING_BOTTOM} stroke={color} strokeWidth={1} strokeDasharray="4,4" opacity={0.5} />
            <circle cx={active.x} cy={active.y} r={5} fill={color} stroke="var(--surface)" strokeWidth={2} />
          </>
        )}
      </svg>

      {active && (
        <div className="text-center -mt-1 mb-1">
          <p className="text-[13px] font-black" style={{ color: 'var(--text-primary)' }}>{active.d.views.toLocaleString('fr-FR')} vues</p>
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{formatLabel(active.d.bucket, granularity)}</p>
        </div>
      )}

      <div className="relative h-4">
        {points.map((p, i) => (
          (i % labelStep === 0 || i === points.length - 1) ? (
            <span
              key={i}
              className="absolute text-[9px] w-8 text-center"
              style={{ left: p.x - 16, color: 'var(--text-tertiary)' }}
            >
              {formatLabel(p.d.bucket, granularity)}
            </span>
          ) : null
        ))}
      </div>
    </div>
  );
}
