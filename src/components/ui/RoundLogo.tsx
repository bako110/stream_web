import { useThemeStore } from '../../store/themeStore';
import { Images } from '../assets';

export function RoundLogo({ size = 40 }: { size?: number }) {
  const { isDark } = useThemeStore();
  const border = Math.max(2, Math.round(size * 0.04));
  return (
    <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      <div style={{
        position: 'absolute', inset: -size * 0.18,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(123,63,242,0.35) 0%, transparent 70%)',
        filter: `blur(${size * 0.14}px)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'relative',
        width: size, height: size,
        borderRadius: '50%',
        padding: border,
        background: 'linear-gradient(135deg, #7B3FF2, #A855F7, #EC4899)',
        boxShadow: `0 ${size * 0.1}px ${size * 0.45}px rgba(123,63,242,0.45)`,
        flexShrink: 0,
      }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: isDark ? '#111' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          <img
            src={isDark ? Images.logoDark : Images.logoLight}
            alt="Gofolyx"
            style={{ width: '78%', height: '78%', objectFit: 'contain', display: 'block' }}
          />
        </div>
      </div>
    </div>
  );
}
