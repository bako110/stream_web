import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ── Slideshow plein-largeur, une carte à la fois, défilement automatique.
// Chaque section (Films, Séries, Concerts, Événements) en a une instance
// indépendante mais toutes partagent la même durée par slide, pour que le
// rythme de la page reste cohérent d'une section à l'autre. ──
const SLIDE_DURATION_MS = 6000;

interface ShowcaseSlideshowProps<T> {
  items: T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T) => React.ReactNode;
}

export function ShowcaseSlideshow<T>({ items, getKey, renderItem }: ShowcaseSlideshowProps<T>) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [prev, setPrev] = useState<number | null>(null);
  const leaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchX = useRef<number | null>(null);

  // Change de slide : l'ancienne sort vers la gauche pendant que la nouvelle entre par la droite.
  const goTo = (next: number) => {
    if (items.length === 0) return;
    const target = next % items.length;
    if (target === active % items.length) return;
    setPrev(active % items.length);
    setActive(target);
    if (leaveRef.current) clearTimeout(leaveRef.current);
    leaveRef.current = setTimeout(() => setPrev(null), 800);
  };
  useEffect(() => () => { if (leaveRef.current) clearTimeout(leaveRef.current); }, []);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (items.length <= 1 || paused) return;
    timerRef.current = setTimeout(() => {
      goTo(active + 1);
    }, SLIDE_DURATION_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, paused, items.length]);

  if (items.length === 0) return null;

  const safeActive = active % items.length;
  const go = (delta: number) => goTo((safeActive + delta + items.length) % items.length);
  const pad = (n: number) => String(n).padStart(2, '0');

  // Glisser au doigt pour changer de slide
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  };

  // Reflet qui suit le curseur sur la carte
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--px', `${((e.clientX - r.left) / r.width) * 100}%`);
    e.currentTarget.style.setProperty('--py', `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    <div
      className={`gt-showcase${paused ? ' is-paused' : ''}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="gt-showcase-frame" onPointerMove={onMove}>
        {items.length > 1 && (
          <>
            <span className="gt-showcase-count"><b>{pad(safeActive + 1)}</b> / {pad(items.length)}</span>
            <button type="button" className="gt-showcase-arrow is-prev" onClick={() => go(-1)} aria-label="Précédent"><ChevronLeft size={20} /></button>
            <button type="button" className="gt-showcase-arrow is-next" onClick={() => go(1)} aria-label="Suivant"><ChevronRight size={20} /></button>
          </>
        )}
        {items.map((item, i) => (
          <div
            key={getKey(item)}
            className={`gt-showcase-slide${i === safeActive ? ' is-active' : ''}${i === prev ? ' is-leaving' : ''}`}
          >
            {(i === safeActive || i === prev) && renderItem(item)}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="gt-showcase-dots">
          {items.map((item, i) => (
            <button
              key={getKey(item)}
              className={`gt-showcase-dot${i === safeActive ? ' is-active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Élément ${i + 1}`}
            >
              {i === safeActive && <span className="gt-showcase-dot-fill" style={{ animationDuration: `${SLIDE_DURATION_MS}ms` }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
