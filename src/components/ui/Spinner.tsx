import { clsx } from 'clsx';

interface Props { size?: 'sm' | 'md' | 'lg'; className?: string; }

const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };

export function Spinner({ size = 'md', className }: Props) {
  return (
    <div className={clsx('animate-spin rounded-full border-2 border-[var(--border)] border-t-brand-primary', sizes[size], className)} />
  );
}
