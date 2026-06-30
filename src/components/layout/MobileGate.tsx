import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

// ── Config ────────────────────────────────────────────────────────────────────

const BREAKPOINT     = 768;
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.sahelys.gofolyx';
const APP_STORE_URL  = 'https://apps.apple.com/app/gofolyx/id0000000000';

/**
 * Routes BLOQUÉES sur mobile → écran de téléchargement.
 *
 * Critère : lecteur vidéo/streaming, upload, formulaire multi-step,
 * interactions fines (WebRTC, gifting, contrôles vidéo).
 * Ces pages sont inutilisables ou sans sens sur un navigateur mobile.
 */
const MOBILE_BLOCKED_EXACT = new Set([
  '/reels',       // lecteur vidéo plein écran type TikTok
  '/go-live',     // choix de stream, interactions souris
]);

const MOBILE_BLOCKED_PREFIXES = [
  '/create/',         // CreateReel, CreatePost, CreateEvent, CreateConcert
  '/live',            // /live et /live/:id (LivePage WebRTC)
  '/lives',           // /lives et /lives/:id (LiveSimplePage WebRTC)
];

function isBlockedOnMobile(pathname: string): boolean {
  if (MOBILE_BLOCKED_EXACT.has(pathname)) return true;
  return MOBILE_BLOCKED_PREFIXES.some(p => pathname.startsWith(p));
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

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

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// ── Gate principal ────────────────────────────────────────────────────────────

export function MobileGate({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();

  if (!isMobile) return <>{children}</>;

  if (isBlockedOnMobile(pathname)) {
    return <MobileBlockedPage ios={isIOS()} />;
  }

  return (
    <>
      {children}
      <AppBanner ios={isIOS()} />
    </>
  );
}

// ── Page de blocage (routes non dispo sur mobile) ─────────────────────────────

function MobileBlockedPage({ ios }: { ios: boolean }) {
  const storeUrl = ios ? APP_STORE_URL : PLAY_STORE_URL;

  return (
    <div style={{
      position:   'fixed',
      inset:      0,
      background: '#0a0a0a',
      display:    'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      overflow:   'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Halos */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse 90% 50% at 50% -5%, rgba(123,63,242,0.4) 0%, transparent 65%)' }} />
      <div style={{ position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse 70% 40% at 50% 105%, rgba(123,63,242,0.3) 0%, transparent 65%)' }} />

      {/* Logo */}
      <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:12, paddingTop:72 }}>
        <AppLogo size={72} />
        <span style={{ color:'#fff', fontSize:30, fontWeight:900, letterSpacing:'-0.5px' }}>GoFolyX</span>
        <span style={{ color:'rgba(255,255,255,0.4)', fontSize:13, textAlign:'center', maxWidth:240, lineHeight:1.5 }}>
          Films · Concerts · Live · Reels · Communautés
        </span>
      </div>

      {/* Illustration */}
      <div style={{ position:'relative', zIndex:1, flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <PhoneMockup />
      </div>

      {/* Message + CTA */}
      <div style={{ position:'relative', zIndex:1, width:'100%', padding:'0 24px 48px', display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
        <div style={{ textAlign:'center', marginBottom:4 }}>
          <p style={{ color:'#fff', fontWeight:700, fontSize:16, margin:0, lineHeight:1.4 }}>
            Cette page est disponible dans l'application
          </p>
          <p style={{ color:'rgba(255,255,255,0.45)', fontSize:13, margin:'6px 0 0', lineHeight:1.5 }}>
            Télécharge GoFolyX pour profiter de toutes les fonctionnalités
          </p>
        </div>

        <a href={storeUrl} target="_blank" rel="noreferrer" style={{
          width:'100%', maxWidth:320,
          display:'flex', alignItems:'center', gap:14,
          padding:'15px 22px',
          borderRadius:18,
          background: ios ? '#000' : '#fff',
          border: ios ? '1.5px solid rgba(255,255,255,0.15)' : 'none',
          textDecoration:'none',
          boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {ios ? <AppleIcon /> : <GooglePlayIcon />}
          <div style={{ display:'flex', flexDirection:'column' }}>
            <span style={{ fontSize:11, color: ios ? 'rgba(255,255,255,0.55)' : '#555', fontWeight:500, lineHeight:1 }}>
              {ios ? 'Télécharger sur' : 'Disponible sur'}
            </span>
            <span style={{ fontSize:19, color: ios ? '#fff' : '#000', fontWeight:800, lineHeight:1.3 }}>
              {ios ? 'App Store' : 'Google Play'}
            </span>
          </div>
        </a>

        {/* Lien vers l'autre store */}
        <a href={ios ? PLAY_STORE_URL : APP_STORE_URL} target="_blank" rel="noreferrer"
          style={{ color:'rgba(255,255,255,0.35)', fontSize:12, textDecoration:'underline', textUnderlineOffset:3 }}>
          {ios ? 'Aussi sur Google Play' : 'Aussi sur App Store'}
        </a>
      </div>
    </div>
  );
}

// ── Bannière flottante (routes autorisées sur mobile) ─────────────────────────

function AppBanner({ ios }: { ios: boolean }) {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('gofolyx_banner_dismissed') === '1',
  );

  if (dismissed) return null;

  const storeUrl = ios ? APP_STORE_URL : PLAY_STORE_URL;

  function dismiss() {
    sessionStorage.setItem('gofolyx_banner_dismissed', '1');
    setDismissed(true);
  }

  return (
    <div style={{
      position:   'fixed',
      bottom:     0, left:0, right:0,
      zIndex:     9999,
      background: 'rgba(10,10,10,0.96)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop:  '1px solid rgba(255,255,255,0.1)',
      padding:    '12px 16px 28px',
      display:    'flex',
      alignItems: 'center',
      gap:        12,
      boxShadow:  '0 -8px 40px rgba(0,0,0,0.5)',
      animation:  'gofolyx-slide-up 0.35s cubic-bezier(.16,1,.3,1) both',
    }}>
      <style>{`
        @keyframes gofolyx-slide-up {
          from { transform:translateY(100%); opacity:0; }
          to   { transform:translateY(0);    opacity:1; }
        }
      `}</style>

      <button onClick={dismiss} aria-label="Fermer" style={{
        flexShrink:0, width:26, height:26, borderRadius:13,
        background:'rgba(255,255,255,0.1)', border:'none',
        color:'rgba(255,255,255,0.55)', fontSize:14, cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>✕</button>

      <AppLogo size={38} />

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ color:'#fff', fontWeight:700, fontSize:14, lineHeight:1.2 }}>GoFolyX</div>
        <div style={{ color:'rgba(255,255,255,0.45)', fontSize:11, marginTop:1 }}>
          Meilleure expérience sur l'app
        </div>
      </div>

      <a href={storeUrl} target="_blank" rel="noreferrer" style={{
        flexShrink:0,
        padding:'9px 18px',
        borderRadius:20,
        background:'linear-gradient(135deg,#7B3FF2,#5B2EC4)',
        color:'#fff', fontWeight:700, fontSize:13,
        textDecoration:'none', whiteSpace:'nowrap',
        boxShadow:'0 4px 16px rgba(123,63,242,0.45)',
      }}>
        {ios ? 'App Store' : 'Play Store'}
      </a>
    </div>
  );
}

// ── Composants visuels ────────────────────────────────────────────────────────

function AppLogo({ size }: { size: number }) {
  const inner = size * 0.72;
  const offset = (size - inner) / 2;
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <div style={{
        position:'absolute', inset:0, borderRadius:size * 0.28,
        background:'linear-gradient(135deg,#7B3FF2,#5B2EC4)',
        transform:'rotate(10deg)',
      }} />
      <div style={{
        position:'absolute', top:offset, left:offset, width:inner, height:inner,
        borderRadius:inner * 0.25,
        background:'#0a0a0a',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <span style={{
          fontSize:size * 0.32, fontWeight:900,
          background:'linear-gradient(135deg,#7B3FF2,#5B2EC4)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
        }}>GX</span>
      </div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div style={{ position:'relative', width:160 }}>
      <div style={{
        width:160, height:290, borderRadius:28,
        background:'linear-gradient(160deg,rgba(255,255,255,0.09) 0%,rgba(255,255,255,0.03) 100%)',
        border:'1.5px solid rgba(255,255,255,0.11)',
        boxShadow:'0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
        display:'flex', flexDirection:'column', alignItems:'center', overflow:'hidden',
      }}>
        <div style={{ width:52, height:5, borderRadius:3, background:'rgba(255,255,255,0.15)', marginTop:12 }} />
        <div style={{ flex:1, width:'100%', padding:'10px 10px 0', display:'flex', flexDirection:'column', gap:6 }}>
          <div style={{ height:80, borderRadius:10, background:'linear-gradient(135deg,rgba(123,63,242,0.45),rgba(123,63,242,0.45))' }} />
          {[0.85,0.65,0.75].map((w,i) => (
            <div key={i} style={{ height:30, borderRadius:8, background:'rgba(255,255,255,0.06)', width:`${w*100}%` }} />
          ))}
        </div>
        <div style={{
          width:'100%', height:44,
          background:'rgba(255,255,255,0.04)', borderTop:'1px solid rgba(255,255,255,0.07)',
          display:'flex', alignItems:'center', justifyContent:'space-around', padding:'0 14px',
        }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width:i===1?22:16, height:i===1?22:16, borderRadius:'50%',
              background: i===1 ? 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' : 'rgba(255,255,255,0.15)',
            }} />
          ))}
        </div>
      </div>
      <div style={{
        position:'absolute', inset:-24, zIndex:-1, borderRadius:52,
        background:'radial-gradient(circle, rgba(123,63,242,0.28) 0%, transparent 70%)',
        filter:'blur(18px)',
      }} />
    </div>
  );
}

function GooglePlayIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
      <path d="M4 3.5L18.5 16L4 28.5V3.5Z" fill="url(#gp1)"/>
      <path d="M4 3.5L18.5 16L23.5 11L8 3L4 3.5Z" fill="url(#gp2)"/>
      <path d="M4 28.5L18.5 16L23.5 21L8 29L4 28.5Z" fill="url(#gp3)"/>
      <path d="M23.5 11L28 13.5C29.2 14.2 29.2 17.8 28 18.5L23.5 21L18.5 16L23.5 11Z" fill="url(#gp4)"/>
      <defs>
        <linearGradient id="gp1" x1="4" y1="3.5" x2="18.5" y2="28.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00D2FF"/><stop offset="1" stopColor="#0088FF"/>
        </linearGradient>
        <linearGradient id="gp2" x1="4" y1="3.5" x2="23.5" y2="11" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00E676"/><stop offset="1" stopColor="#00BCD4"/>
        </linearGradient>
        <linearGradient id="gp3" x1="4" y1="28.5" x2="23.5" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6D00"/><stop offset="1" stopColor="#FF1744"/>
        </linearGradient>
        <linearGradient id="gp4" x1="18.5" y1="11" x2="28" y2="18.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF1744"/><stop offset="1" stopColor="#FF6D00"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" fill="white">
      <path d="M23.5 17.1c0-3.2 2.6-4.8 2.7-4.8-1.5-2.1-3.7-2.4-4.5-2.4-1.9-.2-3.8 1.1-4.7 1.1-1 0-2.5-1.1-4.1-1.1-2.1 0-4 1.2-5.1 3.1-2.2 3.7-.6 9.3 1.5 12.3 1 1.5 2.2 3.1 3.8 3.1 1.5-.1 2.1-1 3.9-1s2.4 1 4 .9c1.6 0 2.7-1.5 3.7-3 1.2-1.7 1.6-3.4 1.7-3.5-.1 0-3.9-1.5-3.9-5.7zM20.4 7.6c.8-1 1.4-2.4 1.2-3.8-1.2.1-2.6.8-3.5 1.8-.8.9-1.4 2.3-1.2 3.6 1.3.1 2.6-.6 3.5-1.6z"/>
    </svg>
  );
}
