import { useEffect, useRef, useState } from 'react';

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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (items.length <= 1 || paused) return;
    timerRef.current = setTimeout(() => {
      setActive(i => (i + 1) % items.length);
    }, SLIDE_DURATION_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active, paused, items.length]);

  if (items.length === 0) return null;

  const safeActive = active % items.length;

  return (
    <div
      className="gt-showcase"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="gt-showcase-frame">
        {items.map((item, i) => (
          <div key={getKey(item)} className={`gt-showcase-slide${i === safeActive ? ' is-active' : ''}`}>
            {i === safeActive && renderItem(item)}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="gt-showcase-dots">
          {items.map((item, i) => (
            <button
              key={getKey(item)}
              className={`gt-showcase-dot${i === safeActive ? ' is-active' : ''}`}
              onClick={() => setActive(i)}
              aria-label={`Élément ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
