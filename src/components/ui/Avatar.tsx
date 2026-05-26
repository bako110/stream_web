import { useState } from 'react';
import { clsx } from 'clsx';
import { displayName, displayHandle } from '../../utils/user';

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
      {verified && (
        <span className="absolute bottom-0 right-0 bg-brand-primary rounded-full p-0.5">
          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </span>
      )}
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
