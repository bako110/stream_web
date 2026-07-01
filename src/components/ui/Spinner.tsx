import { clsx } from 'clsx';
import { RoundLogo } from './RoundLogo';

interface Props { size?: 'sm' | 'md' | 'lg'; className?: string; }

const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };

export function Spinner({ size = 'md', className }: Props) {
  return (
    <div className={clsx('animate-spin rounded-full border-2 border-[var(--border)] border-t-brand-primary', sizes[size], className)} />
  );
}

// ── Loader pleine page avec logo GX — à utiliser dans tous les Suspense / états loading ──
interface PageLoaderProps {
  dark?: boolean;   // fond noir (ex: ReelsPage)
  label?: string;   // texte sous les dots, défaut "GoFolyX"
}

export function PageLoader({ dark = false, label = 'GoFolyX' }: PageLoaderProps) {
  const bg     = dark ? '#000' : 'var(--bg)';
  const dotBg  = dark ? '#fff' : 'var(--primary)';

  return (
    <div className="flex items-center justify-center" style={{ background: bg, minHeight: '100dvh' }}>
      <div className="flex flex-col items-center gap-5">
        <RoundLogo size={56} />
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2.5 h-2.5 rounded-full"
              style={{ background: dotBg, animation: `blink 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
        <p className="text-sm font-medium" style={{ color: dark ? 'rgba(255,255,255,0.5)' : 'var(--text-tertiary)' }}>
          {label}
        </p>
      </div>
    </div>
  );
}
