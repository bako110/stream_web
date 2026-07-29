import type { CountryStat } from '../../api/analyticsService';

// Convertit un code ISO-3166 alpha-2 (ex: "FR") en emoji drapeau — chaque lettre
// devient sa "regional indicator symbol" Unicode correspondante.
function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return '🌍';
  const codePoints = [...code.toUpperCase()].map(c => 0x1f1e6 + (c.charCodeAt(0) - 65));
  return String.fromCodePoint(...codePoints);
}

interface Props {
  countries: CountryStat[];
  accent: string;
}

export function GeoRankingList({ countries, accent }: Props) {
  if (countries.length === 0) {
    return (
      <p className="text-xs text-center py-3" style={{ color: 'var(--text-tertiary)' }}>
        Pas encore de données géographiques
      </p>
    );
  }

  const maxViews = Math.max(...countries.map(c => c.views), 1);

  return (
    <div className="space-y-2.5">
      {countries.map(c => (
        <div key={c.country_code} className="flex items-center gap-2.5">
          <span className="text-xl flex-shrink-0" aria-hidden="true">{countryCodeToFlag(c.country_code)}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {c.country_name ?? c.country_code}
              </span>
              <span className="text-[11px] font-bold ml-2 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                {c.share_pct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(120,120,120,0.15)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(c.views / maxViews) * 100}%`, background: accent }}
              />
            </div>
          </div>
          <span className="text-xs font-bold flex-shrink-0 min-w-[40px] text-right" style={{ color: 'var(--text-tertiary)' }}>
            {c.views.toLocaleString('fr-FR')}
          </span>
        </div>
      ))}
    </div>
  );
}
