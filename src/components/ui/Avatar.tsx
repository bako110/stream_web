import { useState } from 'react';
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
  verified?: boolean;
}

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

export function Avatar({ src, name, size = 'md', className, verified }: AvatarProps) {
  const [err, setErr] = useState(false);
  const label = name?.trim() || '?';
  const initials = label.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className={clsx('relative inline-flex shrink-0', sizes[size], className)}>
      {src && !err ? (
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
      )}
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
