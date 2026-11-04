import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

// ── Rail horizontal « bento » : chaque page = 1 grande tuile + 2 tuiles
// empilées. On fait défiler les pages à l'horizontale (molette / doigt /
// flèches), et les tuiles s'animent en cascade quand elles entrent à l'écran.
export interface BentoTile {
  key: string | number;
  title: string;
  image?: string | null;
  chip?: string | null;          // pastille (année, date, artiste…)
  badge?: React.ReactNode;       // badge haut-gauche (LIVE, note…)
  live?: boolean;                // badge rouge « en cours / en direct »
  icon: React.ReactNode;         // fallback si pas d'image
  onClick: () => void;
}

const PAGE_SIZE = 3;

function Tile({ tile, big, index }: { tile: BentoTile; big: boolean; index: number }) {
  const [err, setErr] = useState(false);
  const [seen, setSeen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Chaque tuile se révèle individuellement, quand elle entre vraiment à l'écran.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.35 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    e.currentTarget.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    <div
      ref={ref}
      className={`gt-bento-tile${big ? ' is-big' : ''}${seen ? ' is-in' : ''}`}
      style={{ ['--d' as any]: `${index * 420}ms` }}
      onClick={tile.onClick}
      onPointerMove={onMove}
      role="link"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') tile.onClick(); }}
      aria-label={tile.title}
    >
      {tile.image && !err ? (
        <img src={tile.image} alt="" loading="lazy" draggable={false} onError={() => setErr(true)} />
      ) : (
        <div className="gt-bento-fallback">{tile.icon}</div>
      )}
      <div className="gt-bento-scrim" />
      <div className="gt-bento-glow" />
      {tile.badge && <div className={`gt-bento-badge${tile.live ? ' is-live' : ''}`}>{tile.live && <span className="gt-bento-badge-dot" />}{tile.badge}</div>}
      <div className="gt-bento-info">
        <p className="gt-bento-title">{tile.title}</p>
        {tile.chip && <span className="gt-bento-chip">{tile.chip}</span>}
      </div>
      <span className="gt-bento-play" aria-hidden="true"><Play size={big ? 26 : 20} fill="currentColor" /></span>
    </div>
  );
}

export function BentoRail({ tiles }: { tiles: BentoTile[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  const pages = useMemo(() => {
    const out: BentoTile[][] = [];
    for (let i = 0; i < tiles.length; i += PAGE_SIZE) out.push(tiles.slice(i, i + PAGE_SIZE));
    return out;
  }, [tiles]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    setPage(Math.round(el.scrollLeft / el.clientWidth));
  };

  const goTo = (i: number) => {
    const el = scroller.current;
    if (!el) return;
    const t = Math.max(0, Math.min(pages.length - 1, i));
    el.scrollTo({ left: t * el.clientWidth, behavior: 'smooth' });
  };

  if (tiles.length === 0) return null;

  return (
    <div className="gt-bento">
      <div className="gt-bento-scroller" ref={scroller} onScroll={onScroll}>
        {pages.map((p, pi) => (
          <div key={pi} className="gt-bento-page" data-count={p.length}>
            {p.map((t, ti) => <Tile key={t.key} tile={t} big={ti === 0 && p.length > 1} index={ti} />)}
          </div>
        ))}
      </div>

      {pages.length > 1 && (
        <div className="gt-bento-nav">
          <div className="gt-bento-dots">
            {pages.map((_, i) => (
              <button key={i} type="button" className={`gt-bento-dot${i === page ? ' is-active' : ''}`}
                onClick={() => goTo(i)} aria-label={`Page ${i + 1}`} />
            ))}
          </div>
          <div className="gt-bento-arrows">
            <button type="button" onClick={() => goTo(page - 1)} disabled={page === 0} aria-label="Précédent"><ChevronLeft size={18} /></button>
            <button type="button" onClick={() => goTo(page + 1)} disabled={page >= pages.length - 1} aria-label="Suivant"><ChevronRight size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

export function BentoSkeleton() {
  return (
    <div className="gt-bento">
      <div className="gt-bento-page" data-count={3}>
        {[0, 1, 2].map(i => <div key={i} className={`gt-bento-tile gt-skeleton${i === 0 ? ' is-big' : ''}`} />)}
      </div>
    </div>
  );
}
