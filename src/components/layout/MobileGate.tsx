import { useEffect, useState } from 'react';

const BREAKPOINT = 768; // px — en-dessous = mobile bloqué

const PLAY_STORE_URL  = 'https://play.google.com/store/apps/details?id=com.sahelys.folix';
const APP_STORE_URL   = 'https://apps.apple.com/app/folix/id0000000000';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < BREAKPOINT);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export function MobileGate({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  if (!isMobile) return <>{children}</>;
  return <MobileDownloadScreen />;
}

function MobileDownloadScreen() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-between overflow-hidden"
      style={{ background: '#0a0a0a', fontFamily: 'system-ui, sans-serif' }}
    >
      {/* Fond dégradé animé */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(123,63,242,0.35) 0%, transparent 70%)',
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 40% at 50% 110%, rgba(224,56,154,0.25) 0%, transparent 70%)',
      }} />

      {/* Logo + nom */}
      <div className="relative z-10 flex flex-col items-center pt-16 gap-4">
        <div className="relative w-20 h-20">
          <div
            className="absolute inset-0 rounded-3xl"
            style={{
              background: 'linear-gradient(135deg,#7B3FF2,#E0389A)',
              transform: 'rotate(12deg)',
            }}
          />
          <div
            className="absolute inset-1 rounded-2xl flex items-center justify-center"
            style={{ background: '#0a0a0a' }}
          >
            <span style={{
              fontSize: 28,
              fontWeight: 900,
              background: 'linear-gradient(135deg,#7B3FF2,#E0389A)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>FX</span>
          </div>
        </div>
        <span style={{ color: '#fff', fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px' }}>
          FoliX
        </span>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 500, textAlign: 'center', maxWidth: 260, lineHeight: 1.5 }}>
          La plateforme de streaming live, reels & communautés
        </span>
      </div>

      {/* Illustration centrale — mockup téléphone stylisé */}
      <div className="relative z-10 flex items-center justify-center" style={{ flex: 1 }}>
        <div style={{ position: 'relative', width: 180 }}>
          {/* Téléphone */}
          <div style={{
            width: 180,
            height: 320,
            borderRadius: 32,
            background: 'linear-gradient(160deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)',
            border: '1.5px solid rgba(255,255,255,0.12)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}>
            {/* Encoche */}
            <div style={{
              width: 60, height: 6, borderRadius: 4,
              background: 'rgba(255,255,255,0.15)',
              marginTop: 14,
            }} />
            {/* Contenu écran simulé */}
            <div style={{ flex: 1, width: '100%', padding: '12px 10px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[0.9, 0.7, 0.8, 0.6].map((w, i) => (
                <div key={i} style={{
                  height: i === 0 ? 90 : 36,
                  borderRadius: 10,
                  background: i === 0
                    ? 'linear-gradient(135deg,rgba(123,63,242,0.4),rgba(224,56,154,0.4))'
                    : 'rgba(255,255,255,0.06)',
                  width: `${w * 100}%`,
                }} />
              ))}
            </div>
            {/* Barre nav bas */}
            <div style={{
              width: '100%', height: 48,
              background: 'rgba(255,255,255,0.04)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-around',
              padding: '0 16px',
            }}>
              {['●', '▲', '■', '◆'].map((s, i) => (
                <span key={i} style={{ fontSize: i === 1 ? 14 : 10, opacity: i === 1 ? 1 : 0.3, color: i === 1 ? '#7B3FF2' : '#fff' }}>{s}</span>
              ))}
            </div>
          </div>
          {/* Halo derrière */}
          <div style={{
            position: 'absolute', inset: -20, zIndex: -1,
            borderRadius: 48,
            background: 'radial-gradient(circle, rgba(123,63,242,0.3) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }} />
        </div>
      </div>

      {/* Boutons téléchargement */}
      <div className="relative z-10 w-full flex flex-col items-center gap-3 px-6 pb-12">
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 4, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>
          Disponible sur
        </p>

        {/* Google Play */}
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noreferrer"
          style={{
            width: '100%',
            maxWidth: 320,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 20px',
            borderRadius: 16,
            background: '#fff',
            textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <GooglePlayIcon />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 11, color: '#333', fontWeight: 500, lineHeight: 1 }}>Disponible sur</span>
            <span style={{ fontSize: 18, color: '#000', fontWeight: 800, lineHeight: 1.3 }}>Google Play</span>
          </div>
        </a>

        {/* App Store */}
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noreferrer"
          style={{
            width: '100%',
            maxWidth: 320,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 20px',
            borderRadius: 16,
            background: '#000',
            border: '1.5px solid rgba(255,255,255,0.15)',
            textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          <AppleIcon />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500, lineHeight: 1 }}>Télécharger sur</span>
            <span style={{ fontSize: 18, color: '#fff', fontWeight: 800, lineHeight: 1.3 }}>App Store</span>
          </div>
        </a>
      </div>
    </div>
  );
}

function GooglePlayIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M4 3.5L18.5 16L4 28.5V3.5Z" fill="url(#gp1)" />
      <path d="M4 3.5L18.5 16L23.5 11L8 3L4 3.5Z" fill="url(#gp2)" />
      <path d="M4 28.5L18.5 16L23.5 21L8 29L4 28.5Z" fill="url(#gp3)" />
      <path d="M23.5 11L28 13.5C29.2 14.2 29.2 17.8 28 18.5L23.5 21L18.5 16L23.5 11Z" fill="url(#gp4)" />
      <defs>
        <linearGradient id="gp1" x1="4" y1="3.5" x2="18.5" y2="28.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00D2FF" />
          <stop offset="1" stopColor="#0088FF" />
        </linearGradient>
        <linearGradient id="gp2" x1="4" y1="3.5" x2="23.5" y2="11" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00E676" />
          <stop offset="1" stopColor="#00BCD4" />
        </linearGradient>
        <linearGradient id="gp3" x1="4" y1="28.5" x2="23.5" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6D00" />
          <stop offset="1" stopColor="#FF1744" />
        </linearGradient>
        <linearGradient id="gp4" x1="18.5" y1="11" x2="28" y2="18.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF1744" />
          <stop offset="1" stopColor="#FF6D00" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="white">
      <path d="M23.5 17.1c0-3.2 2.6-4.8 2.7-4.8-1.5-2.1-3.7-2.4-4.5-2.4-1.9-.2-3.8 1.1-4.7 1.1-1 0-2.5-1.1-4.1-1.1-2.1 0-4 1.2-5.1 3.1-2.2 3.7-.6 9.3 1.5 12.3 1 1.5 2.2 3.1 3.8 3.1 1.5-.1 2.1-1 3.9-1s2.4 1 4 .9c1.6 0 2.7-1.5 3.7-3 1.2-1.7 1.6-3.4 1.7-3.5-.1 0-3.9-1.5-3.9-5.7zM20.4 7.6c.8-1 1.4-2.4 1.2-3.8-1.2.1-2.6.8-3.5 1.8-.8.9-1.4 2.3-1.2 3.6 1.3.1 2.6-.6 3.5-1.6z" />
    </svg>
  );
}
