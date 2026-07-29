import type { RevenueSourceBreakdown } from '../../api/revenueService';

interface Props {
  sources: RevenueSourceBreakdown[];
  accent: string;
}

function fmtEur(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: n >= 100 ? 0 : 2 });
}

export function RevenueSourceList({ sources, accent }: Props) {
  if (sources.length === 0) {
    return (
      <p className="text-xs text-center py-3" style={{ color: 'var(--text-tertiary)' }}>
        Aucun revenu enregistré pour l'instant
      </p>
    );
  }

  const maxEur = Math.max(...sources.map(s => s.eur), 1);

  return (
    <div className="space-y-3">
      {sources.map(s => (
        <div key={s.source} className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{s.label}</span>
              <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                {s.share_pct}%
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(120,120,120,0.15)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${(s.eur / maxEur) * 100}%`, background: accent }} />
            </div>
          </div>
          <div className="text-right flex-shrink-0 min-w-[74px]">
            <p className="text-[13px] font-black" style={{ color: 'var(--text-primary)' }}>{fmtEur(s.eur)}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{s.count} opér.</p>
          </div>
        </div>
      ))}
    </div>
  );
}
