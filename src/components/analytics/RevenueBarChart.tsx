import { useState } from 'react';
import type { RevenueTimeseriesPoint } from '../../api/revenueService';

const CHART_H = 180;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;
const BAR_MAX_W = 24;
const GAP = 2;

interface Props {
  data: RevenueTimeseriesPoint[];
  color: string;
  width?: number;
  /** 'eur' (défaut) ou 'gogold' — quelle valeur piloter la hauteur des barres */
  metric?: 'eur' | 'gogold';
}

function fmtEur(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: n >= 100 ? 0 : 2 });
}

export function RevenueBarChart({ data, color, width = 560, metric = 'eur' }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div style={{ height: CHART_H }} className="flex items-center justify-center">
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Pas encore de revenus</p>
      </div>
    );
  }

  const values = data.map(d => metric === 'eur' ? d.eur : d.gogold);
  const maxVal = Math.max(...values, 1);
  const chartInnerH = CHART_H - PADDING_TOP - PADDING_BOTTOM;
  const slotW = width / data.length;
  const barW = Math.min(BAR_MAX_W, slotW - GAP * 2);

  const active = activeIdx != null ? data[activeIdx] : null;
  const labelStep = Math.max(1, Math.ceil(data.length / 8));
  const lastIdxWithValue = values.reduce((best, v, i) => (v > 0 ? i : best), -1);

  return (
    <div>
      <svg
        width={width} height={CHART_H}
        onPointerLeave={() => setActiveIdx(null)}
        style={{ maxWidth: '100%', width: '100%', height: 'auto' }}
        viewBox={`0 0 ${width} ${CHART_H}`}
      >
        {/* Baseline */}
        <line x1={0} y1={CHART_H - PADDING_BOTTOM} x2={width} y2={CHART_H - PADDING_BOTTOM}
          stroke="var(--border)" strokeWidth={1} />

        {data.map((d, i) => {
          const v = metric === 'eur' ? d.eur : d.gogold;
          const h = maxVal > 0 ? (v / maxVal) * chartInnerH : 0;
          const x = i * slotW + (slotW - barW) / 2;
          const y = CHART_H - PADDING_BOTTOM - h;
          const isActive = activeIdx === i;
          const isLast = i === lastIdxWithValue;
          return (
            <g key={d.bucket}>
              {/* Zone de hover — plus large que la barre pour un hit target confortable */}
              <rect x={i * slotW} y={0} width={slotW} height={CHART_H - PADDING_BOTTOM}
                fill="transparent"
                onPointerEnter={() => setActiveIdx(i)}
                style={{ cursor: v > 0 ? 'pointer' : 'default' }} />
              <rect
                x={x} y={y} width={Math.max(barW, 1)} height={Math.max(h, v > 0 ? 2 : 0)}
                rx={4} ry={4}
                fill={color}
                opacity={isActive ? 1 : v > 0 ? 0.85 : 0.12}
              />
              {isLast && v > 0 && (
                <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={800}
                  fill="var(--text-primary)">
                  {metric === 'eur' ? fmtEur(v) : v.toLocaleString('fr-FR')}
                </text>
              )}
              {(i % labelStep === 0 || i === data.length - 1) && (
                <text x={i * slotW + slotW / 2} y={CHART_H - 8} textAnchor="middle" fontSize={9.5}
                  fill="var(--text-tertiary)">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {active && (
        <div className="text-center -mt-1">
          <p className="text-[13px] font-black" style={{ color: 'var(--text-primary)' }}>
            {fmtEur(active.eur)} <span className="font-medium" style={{ color: 'var(--text-tertiary)' }}>
              · {active.gogold.toLocaleString('fr-FR')} GoGold</span>
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{active.label}</p>
        </div>
      )}
    </div>
  );
}
