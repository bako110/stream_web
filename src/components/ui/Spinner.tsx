import { clsx } from 'clsx';
import { RoundLogo } from './RoundLogo';

interface Props { size?: 'sm' | 'md' | 'lg'; className?: string; }

const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };

export function Spinner({ size = 'md', className }: Props) {
  return (
    <div className={clsx('animate-spin rounded-full border-2 border-[var(--border)] border-t-brand-primary', sizes[size], className)} />
  );
}

// ── Loader pleine page avec logo rond — à utiliser dans tous les Suspense / états loading ──
interface PageLoaderProps {
  dark?: boolean;   // fond noir (ex: ReelsPage)
}

export function PageLoader({ dark = false }: PageLoaderProps) {
  const bg = dark ? '#000' : 'var(--bg)';

  return (
    <div className="flex items-center justify-center" style={{ background: bg, minHeight: '100dvh' }}>
      <div style={{ animation: 'spin-slow 1.4s linear infinite' }}>
        <RoundLogo size={56} />
      </div>
    </div>
  );
}
