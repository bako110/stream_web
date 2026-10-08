/**
 * Kit de design des sections Live / 1 vs 1 / Tournois (web).
 *
 * Palette harmonisée — une seule couleur de marque + 3 couleurs de statut, plus de
 * teintes ad hoc (jaune, orange, rose vif, rouge sombre) qui se mélangeaient :
 *   violet  : marque, actions principales
 *   rouge   : EN DIRECT uniquement (point + badge LIVE)
 *   ambre   : boost / mise en avant / paiement
 *   vert    : gratuit / succès
 *   rose    : second camp d'un 1 vs 1 (complément du violet)
 * Coins : cartes 28 px, pilules/boutons 999 px, icônes rondes — comme le reste de l'app.
 */
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

export const LIVE_COLORS = {
  violet: '#7B3FF2',
  violetDark: '#5B2EC4',
  violetSoft: '#9B65F5',
  rose: '#E85DAD',
  live: '#EF4444',
  gold: '#F59E0B',
  green: '#22C55E',
} as const;

export const LIVE_GRADIENT = `linear-gradient(135deg,${LIVE_COLORS.violet},${LIVE_COLORS.violetDark})`;
export const CARD_SHADOW = '0 1px 2px rgba(11,11,16,0.04), 0 8px 24px rgba(11,11,16,0.06)';
export const CARD_SHADOW_HOVER = '0 2px 4px rgba(11,11,16,0.06), 0 16px 36px rgba(123,63,242,0.18)';

/** Conteneur de page : largeur bornée, gouttières identiques partout. */
export function LivePage({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 pb-10" data-dark={dark ? '' : undefined}>
      {children}
    </div>
  );
}

/** En-tête : pilule flottante collée en haut (retour rond · icône · titre/sous-titre · actions). */
export function LiveHeader({ icon, title, subtitle, onBack, actions }: {
  icon: ReactNode; title: string; subtitle?: ReactNode; onBack?: () => void; actions?: ReactNode;
}) {
  return (
    <div className="sticky top-2 z-20 mt-2 mb-5 flex items-center gap-2.5 pl-2 pr-2.5 py-2 rounded-full"
      style={{
        background: 'color-mix(in srgb, var(--surface) 90%, transparent)',
        WebkitBackdropFilter: 'blur(14px) saturate(160%)', backdropFilter: 'blur(14px) saturate(160%)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 2px rgba(11,11,16,0.05), 0 8px 20px rgba(11,11,16,0.08)',
      }}>
      {onBack && (
        <button onClick={onBack} title="Retour"
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={16} />
        </button>
      )}
      <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white" style={{ background: LIVE_GRADIENT }}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-black leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        {subtitle && <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
    </div>
  );
}

/** Bouton pilule : solid (violet) | soft (teinté) | ghost (bordure). */
export function PillButton({ children, onClick, variant = 'solid', icon, disabled, title, className = '' }: {
  children?: ReactNode; onClick?: (e: React.MouseEvent) => void; variant?: 'solid' | 'soft' | 'ghost';
  icon?: ReactNode; disabled?: boolean; title?: string; className?: string;
}) {
  const styles: Record<string, React.CSSProperties> = {
    solid: { background: LIVE_GRADIENT, color: '#fff', boxShadow: '0 4px 14px rgba(123,63,242,0.3)' },
    soft:  { background: 'rgba(123,63,242,0.1)', color: LIVE_COLORS.violet },
    ghost: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
  };
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-bold whitespace-nowrap disabled:opacity-50 ${className}`}
      style={styles[variant]}>
      {icon}{children}
    </button>
  );
}

/** Badge EN DIRECT — rouge, seule utilisation du rouge « statut ». */
export function LiveBadge({ small = false }: { small?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-black text-white rounded-full ${small ? 'text-[9px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1'}`}
      style={{ background: LIVE_COLORS.live, letterSpacing: '0.06em', boxShadow: '0 2px 10px rgba(239,68,68,0.45)' }}>
      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
    </span>
  );
}

/** Pastille sur fond d'image (spectateurs, durée, accès…) — verre sombre. */
export function GlassChip({ children, tone }: { children: ReactNode; tone?: 'violet' | 'gold' | 'green' }) {
  const bg = tone === 'violet' ? 'rgba(123,63,242,0.85)' : tone === 'gold' ? 'rgba(245,158,11,0.9)' : tone === 'green' ? 'rgba(34,197,94,0.9)' : 'rgba(0,0,0,0.55)';
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white px-2.5 py-1 rounded-full"
      style={{ background: bg, WebkitBackdropFilter: 'blur(6px)', backdropFilter: 'blur(6px)' }}>
      {children}
    </span>
  );
}

/** Titre de section : puce d'icône ronde + titre + compteur. */
export function SectionTitle({ icon, title, count, tone = 'violet', pulse = false }: {
  icon: ReactNode; title: string; count?: number; tone?: 'violet' | 'live' | 'gold'; pulse?: boolean;
}) {
  const c = tone === 'live' ? LIVE_COLORS.live : tone === 'gold' ? LIVE_COLORS.gold : LIVE_COLORS.violet;
  return (
    <div className="flex items-center gap-2.5 mb-3.5">
      <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${pulse ? 'animate-pulse' : ''}`}
        style={{ background: `${c}1f`, color: c }}>{icon}</span>
      <h2 className="font-black text-[15px]" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {count != null && count > 0 && (
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: `${c}1f`, color: c }}>{count}</span>
      )}
    </div>
  );
}

/** État vide : carte arrondie, icône ronde, texte, action. */
export function EmptyCard({ icon, title, description, action }: {
  icon: ReactNode; title: string; description?: string; action?: ReactNode;
}) {
  return (
    <div className="rounded-[28px] py-12 px-6 flex flex-col items-center gap-3.5 text-center"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: CARD_SHADOW }}>
      <span className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(123,63,242,0.1)', color: LIVE_COLORS.violet }}>
        {icon}
      </span>
      <div>
        <p className="font-black text-base" style={{ color: 'var(--text-primary)' }}>{title}</p>
        {description && <p className="text-sm mt-1 max-w-sm" style={{ color: 'var(--text-tertiary)' }}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Bandeau d'info (récap « 3 matchs en direct » etc.). */
export function InfoStrip({ icon, title, subtitle, tone = 'violet', onClick, trailing }: {
  icon: ReactNode; title: string; subtitle?: string; tone?: 'violet' | 'gold'; onClick?: () => void; trailing?: ReactNode;
}) {
  const c = tone === 'gold' ? LIVE_COLORS.gold : LIVE_COLORS.violet;
  const Tag: any = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick}
      className="w-full flex items-center gap-3 rounded-full pl-2 pr-5 py-2 mb-5 text-left"
      style={{ background: `${c}12`, border: `1px solid ${c}33` }}>
      <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: `${c}24`, color: c }}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-black truncate" style={{ color: 'var(--text-primary)' }}>{title}</span>
        {subtitle && <span className="block text-xs font-semibold truncate" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</span>}
      </span>
      {trailing}
    </Tag>
  );
}
