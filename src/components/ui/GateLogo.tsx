import { useThemeStore } from '../../store/themeStore';
import { Images } from '../assets';

// ── Logo sobre pour les pages "gate" (landing / onboarding) — pas de halo
// dégradé rose/violet/ambre comme RoundLogo (utilisé ailleurs dans l'app) :
// ici la palette reste resserrée à l'encre/papier + un seul accent violet. ──
export function GateLogo({ size = 32 }: { size?: number }) {
  const { isDark } = useThemeStore();
  const border = Math.max(1.5, Math.round(size * 0.035));
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      padding: border,
      background: 'var(--gt-accent)',
      flexShrink: 0,
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: '50%',
        background: isDark ? '#16151C' : '#fff',
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
  );
}
