// ── Stickers SVG — illustrations line-art dessinées sur-mesure ─────────────────
// Style unique : trait ~1.6, coins arrondis, un seul accent (currentColor pour
// le trait, remplissage en accent uniquement sur le détail qui compte).
// Utilisés dans le bandeau défilant de la landing / onboarding — jamais d'emoji.

interface StickerProps { size?: number; className?: string; }

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function StickerTicket({ size = 28, className }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
      <path {...base} d="M4 12.5a2.5 2.5 0 0 0 0-5V6a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v1.5a2.5 2.5 0 0 0 0 5V21a2.5 2.5 0 0 0 0 5V26a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.5a2.5 2.5 0 0 0 0-5V12.5Z" />
      <path {...base} d="M13 4v24" strokeDasharray="1.6 3.2" />
      <circle cx="20" cy="16" r="2.4" fill="var(--stk-accent)" stroke="none" />
    </svg>
  );
}

export function StickerClap({ size = 28, className }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
      <path {...base} d="M5 14.5 24.5 5l2.4 5.1L7.4 19.5Z" />
      <path {...base} d="M5 14.5 27 18.5 24 27H8a3 3 0 0 1-3-3Z" />
      <path {...base} d="M11.5 10.2 14 15" />
      <path {...base} d="M17 8 19.5 12.8" />
      <circle cx="16" cy="21.5" r="2" fill="var(--stk-accent)" stroke="none" />
    </svg>
  );
}

export function StickerWave({ size = 28, className }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
      <rect x="4" y="14" width="3" height="6" rx="1.5" {...base} />
      <rect x="9.5" y="9" width="3" height="16" rx="1.5" {...base} />
      <rect x="15" y="4" width="3" height="26" rx="1.5" fill="var(--stk-accent)" stroke="none" />
      <rect x="20.5" y="9" width="3" height="16" rx="1.5" {...base} />
      <rect x="26" y="14" width="3" height="6" rx="1.5" {...base} />
    </svg>
  );
}

export function StickerBadgeLive({ size = 28, className }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
      <circle cx="16" cy="16" r="11.5" {...base} />
      <circle cx="16" cy="16" r="4" fill="var(--stk-accent)" stroke="none" />
      <path {...base} d="M8.5 8.5a10.6 10.6 0 0 0 0 15" opacity="0.5" />
      <path {...base} d="M23.5 8.5a10.6 10.6 0 0 1 0 15" opacity="0.5" />
    </svg>
  );
}

export function StickerHeart({ size = 28, className }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
      <path {...base} d="M16 26.5S4.5 19.3 4.5 11.6A6.1 6.1 0 0 1 16 8.2a6.1 6.1 0 0 1 11.5 3.4C27.5 19.3 16 26.5 16 26.5Z" />
      <circle cx="16" cy="15" r="1.6" fill="var(--stk-accent)" stroke="none" />
    </svg>
  );
}

export function StickerCalendarStar({ size = 28, className }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
      <rect x="4.5" y="7" width="23" height="21" rx="3" {...base} />
      <path {...base} d="M4.5 13h23" />
      <path {...base} d="M10 4v6M22 4v6" />
      <path d="M16 17.5 17.1 20l2.7.2-2.1 1.8.7 2.6-2.4-1.4-2.4 1.4.7-2.6-2.1-1.8 2.7-.2Z"
        fill="var(--stk-accent)" stroke="var(--stk-accent)" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

export function StickerUsers({ size = 28, className }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
      <circle cx="12.5" cy="11" r="4" {...base} />
      <path {...base} d="M5 26v-2a7.5 7.5 0 0 1 15 0v2" />
      <circle cx="22" cy="9.5" r="3" fill="var(--stk-accent)" stroke="none" opacity="0.9" />
      <path {...base} d="M20.5 26v-1.6a6.4 6.4 0 0 1 8-6.2" />
    </svg>
  );
}

export function StickerCoin({ size = 28, className }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
      <circle cx="16" cy="16" r="11.5" {...base} />
      <circle cx="16" cy="16" r="7" {...base} strokeDasharray="1.6 3" />
      <path d="M16 11v10M13.2 13.6c0-1.4 1.3-2.1 2.8-2.1s2.8.7 2.8 2c0 2.8-5.6 1.4-5.6 4.1 0 1.3 1.3 2 2.8 2s2.8-.7 2.8-2"
        fill="none" stroke="var(--stk-accent)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function StickerPlay({ size = 28, className }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
      <path {...base} d="M6 5.5 26 16 6 26.5Z" />
      <circle cx="16" cy="16" r="1.4" fill="var(--stk-accent)" stroke="none" />
    </svg>
  );
}

export const STICKERS = [
  { Icon: StickerTicket,      label: 'Billetterie' },
  { Icon: StickerClap,        label: 'Films & séries' },
  { Icon: StickerWave,        label: 'Concerts live' },
  { Icon: StickerBadgeLive,   label: 'En direct' },
  { Icon: StickerHeart,       label: 'Communautés' },
  { Icon: StickerCalendarStar,label: 'Événements' },
  { Icon: StickerUsers,       label: 'Créateurs' },
  { Icon: StickerCoin,        label: 'Monétisation' },
  { Icon: StickerPlay,        label: 'Reels' },
] as const;
