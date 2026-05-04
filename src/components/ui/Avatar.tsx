import { clsx } from 'clsx';

interface Props {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  verified?: boolean;
}

const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-14 h-14 text-lg', xl: 'w-20 h-20 text-2xl' };

export function Avatar({ src, name, size = 'md', className, verified }: Props) {
  const initials = name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?';
  return (
    <div className={clsx('relative inline-flex shrink-0', sizes[size], className)}>
      {src ? (
        <img src={src} alt={name ?? ''} className="w-full h-full rounded-full object-cover bg-[var(--bg-tertiary)]" />
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
