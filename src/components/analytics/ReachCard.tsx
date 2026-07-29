import { Eye, EyeOff } from 'lucide-react';
import type { ReachStats } from '../../api/analyticsService';

interface Props {
  reach: ReachStats;
  accent: string;
}

export function ReachCard({ reach, accent }: Props) {
  if (reach.total_followers === 0) {
    return (
      <p className="text-xs text-center py-3" style={{ color: 'var(--text-tertiary)' }}>
        Pas encore d'abonnés pour calculer la portée
      </p>
    );
  }

  const seenPct = reach.seen_pct ?? 0;

  return (
    <div>
      <div className="text-center mb-2.5">
        <p className="text-3xl font-black leading-none" style={{ color: 'var(--text-primary)' }}>{seenPct}%</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>de vos abonnés ont vu ce contenu</p>
      </div>

      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(120,120,120,0.15)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${seenPct}%`, background: accent }} />
      </div>

      <div className="flex items-center justify-around mt-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: accent }} />
          <Eye size={12} style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-xs font-bold" style={{ color: 'var(--text-tertiary)' }}>
            {reach.seen.toLocaleString('fr-FR')} vu
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: 'rgba(120,120,120,0.25)' }} />
          <EyeOff size={12} style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-xs font-bold" style={{ color: 'var(--text-tertiary)' }}>
            {reach.not_seen.toLocaleString('fr-FR')} pas vu
          </span>
        </div>
      </div>
    </div>
  );
}
