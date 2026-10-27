import { ROUTE_PATTERNS, SEGMENT_CODES } from './routeTable';

// Couche de traduction des URLs : l'application garde ses routes « réelles »
// (/explore/concerts, /wallet/buy…) en interne, mais la barre d'adresse
// n'affiche que des chemins opaques (/ajkd/mwpq). Seuls les segments
// statiques sont codés ; les paramètres (:id, :slug…) passent tels quels.
// Un chemin réel (ancien lien, favori) reste accepté et est réécrit à l'affichage.

interface Rule { len: number; statics: number; real: (string | null)[]; opaque: (string | null)[] }

const REVERSE: Record<string, string> = Object.fromEntries(Object.entries(SEGMENT_CODES).map(([w, c]) => [c, w]));

const RULES: Rule[] = ROUTE_PATTERNS.map(p => {
  const segs = p.split('/').filter(Boolean);
  return {
    len: segs.length,
    statics: segs.filter(s => !s.startsWith(':')).length,
    real:   segs.map(s => (s.startsWith(':') ? null : s)),
    opaque: segs.map(s => (s.startsWith(':') ? null : SEGMENT_CODES[s])),
  };
}).sort((a, b) => b.statics - a.statics);

function convert(pathname: string, from: 'real' | 'opaque'): string | null {
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length === 0) return null;
  const to = from === 'real' ? 'opaque' : 'real';
  for (const r of RULES) {
    if (r.len !== segs.length) continue;
    const src = r[from];
    if (!src.every((s, i) => s === null || s === segs[i])) continue;
    const dst = r[to];
    return '/' + segs.map((s, i) => (src[i] === null ? s : dst[i]!)).join('/');
  }
  return null;
}

/** Chemin réel → chemin affiché (inchangé s'il est inconnu ou déjà opaque). */
export function toOpaquePath(pathname: string): string {
  return convert(pathname, 'real') ?? pathname;
}

/** Chemin affiché → chemin réel (inchangé s'il est inconnu ou déjà réel). */
export function toRealPath(pathname: string): string {
  return convert(pathname, 'opaque') ?? pathname;
}

export const isKnownOpaque = (pathname: string) => convert(pathname, 'opaque') !== null;
export { REVERSE as _REVERSE };
