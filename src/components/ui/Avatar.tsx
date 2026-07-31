import { useState, type CSSProperties } from 'react';
import { clsx } from 'clsx';
import { displayName, displayHandle } from '../../utils/user';

/* ── Vrai badge vérifié (cercle bleu + checkmark blanc) ────────────────────── */
const BADGE_SIZES: Record<string, number> = { xs: 10, sm: 13, md: 15, lg: 18, xl: 22 };

function VerifiedBadgeOverlay({ size }: { size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }) {
  const px = BADGE_SIZES[size] ?? 13;
  return (
    <span
      className="absolute -bottom-0.5 -right-0.5"
      style={{
        width: px, height: px,
        borderRadius: '50%',
        background: '#1D9BF0',
        border: '1.5px solid var(--surface, #fff)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
      }}
    >
      <svg width={px * 0.62} height={px * 0.62} viewBox="0 0 10 10" fill="none">
        <path d="M2 5.2L4 7.5L8 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/* Badge inline (pour côté nom dans les profils) */
export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <span
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: '#1D9BF0',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 1px 4px rgba(29,155,240,0.4)',
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 10 10" fill="none">
        <path d="M2 5.2L4 7.5L8 3" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

type UserLike = {
  display_name?: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean;
};

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  style?: CSSProperties;
  verified?: boolean;
  /** Anneau rouge pulsant — l'utilisateur a un live actif en ce moment. */
  isLive?: boolean | null;
}

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

// Marge nécessaire pour laisser respirer l'anneau live sans qu'il ne rogne l'image
const LIVE_RING_PADDING = {
  xs: 'p-[2px]', sm: 'p-[2px]', md: 'p-[2.5px]', lg: 'p-[3px]', xl: 'p-1',
};

export function Avatar({ src, name, size = 'md', className, style, verified, isLive }: AvatarProps) {
  const [err, setErr] = useState(false);
  const label = name?.trim() || '?';
  const initials = label.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const image = src && !err ? (
    <img
      src={src}
      alt={label}
      className="w-full h-full rounded-full object-cover bg-[var(--bg-tertiary)]"
      onError={() => setErr(true)}
    />
  ) : (
    <div className="w-full h-full rounded-full bg-brand-gradient flex items-center justify-center text-white font-semibold">
      {initials}
    </div>
  );

  if (isLive) {
    return (
      <div className={clsx('relative inline-flex shrink-0', sizes[size], className)} style={style}>
        <div
          className={clsx('absolute inset-0 rounded-full animate-live-ring', LIVE_RING_PADDING[size])}
          style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A,#7B3FF2)' }}
        >
          <div className="w-full h-full rounded-full overflow-hidden" style={{ background: 'var(--surface, #000)' }}>
            {image}
          </div>
        </div>
        <span
          className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] font-black text-white px-1 rounded-full uppercase tracking-wide"
          style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)', lineHeight: '1.4', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
        >
          Live
        </span>
        {verified && <VerifiedBadgeOverlay size={size} />}
      </div>
    );
  }

  return (
    <div className={clsx('relative inline-flex shrink-0', sizes[size], className)} style={style}>
      {image}
      {verified && <VerifiedBadgeOverlay size={size} />}
    </div>
  );
}

interface UserLineProps {
  user?: UserLike | null;
  size?: AvatarProps['size'];
  nameClass?: string;
  handleClass?: string;
  className?: string;
  showHandle?: boolean;
  onClick?: () => void;
}

/**
 * Avatar + nom + @handle sur une ligne.
 * Gère tous les cas : display_name → username → first+last → "Utilisateur".
 * Gère les images cassées via onError.
 */
export function UserLine({
  user,
  size = 'sm',
  nameClass,
  handleClass,
  className,
  showHandle = true,
  onClick,
}: UserLineProps) {
  const name   = displayName(user);
  const handle = displayHandle(user);

  return (
    <div
      className={clsx('flex items-center gap-2 min-w-0', onClick && 'cursor-pointer', className)}
      onClick={onClick}
    >
      <Avatar
        src={user?.avatar_url}
        name={name}
        size={size}
        verified={user?.is_verified}
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className={clsx('font-semibold truncate leading-tight', nameClass ?? 'text-sm')}
          style={{ color: 'var(--text-primary)' }}>
          {name}
        </p>
        {showHandle && handle && (
          <p className={clsx('truncate', handleClass ?? 'text-xs')}
            style={{ color: 'var(--text-tertiary)' }}>
            {handle}
          </p>
        )}
      </div>
    </div>
  );
}
