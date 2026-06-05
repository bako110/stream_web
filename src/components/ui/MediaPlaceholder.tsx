const PALETTES = [
  ['#1a0533','#7B3FF2','#7B3FF2'],
  ['#0f172a','#7B3FF2','#06B6D4'],
  ['#0c1a0f','#22C55E','#7B3FF2'],
  ['#1a0f00','#7B3FF2','#7B3FF2'],
  ['#1a000d','#7B3FF2','#7B3FF2'],
  ['#0d0d1a','#7B3FF2','#7B3FF2'],
];

export function paletteBySeed(seed: string): [string, string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length] as [string, string, string];
}

interface Props {
  title?: string | null;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function MediaPlaceholder({ title, icon, className, style }: Props) {
  const [c0, c1, c2] = paletteBySeed(title ?? 'x');
  const initials = (title ?? '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center relative overflow-hidden ${className ?? ''}`}
      style={{ background: `linear-gradient(135deg,${c0} 0%,${c1} 55%,${c2} 100%)`, ...style }}>
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20" style={{ background: c2 }} />
      <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full opacity-15" style={{ background: c1 }} />
      {icon
        ? <div className="opacity-30 z-10">{icon}</div>
        : <span className="text-white font-black opacity-40 z-10 select-none leading-none"
            style={{ fontSize: 'clamp(1.5rem,5vw,3rem)' }}>
            {initials}
          </span>
      }
    </div>
  );
}
