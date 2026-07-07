import { Download } from 'lucide-react';
import { RoundLogo } from './RoundLogo';

const APK_URL     = 'https://gofolyx.com/uploads/apk/gofolyx-1.0.0.2.apk';
const APK_VERSION = '1.0.0.2';

// Liens stores (à remplir quand les apps seront publiées)
const PLAY_STORE_URL  = null; // ex: 'https://play.google.com/store/apps/details?id=com.gofolyx.mobile'
const APP_STORE_URL   = null; // ex: 'https://apps.apple.com/app/gofolyx/idXXXXXXXXX'

interface Props {
  /** 'bar' = bandeau horizontal compact | 'card' = carte avec icônes stores */
  variant?: 'bar' | 'card';
  className?: string;
}

export function AppDownloadBar({ variant = 'bar', className = '' }: Props) {
  if (variant === 'card') {
    return (
      <div className={`rounded-2xl p-5 ${className}`}
        style={{ background: 'rgba(123,63,242,0.08)', border: '1px solid rgba(123,63,242,0.2)' }}>
        <div className="flex items-center gap-3 mb-4">
          <RoundLogo size={40} />
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Télécharger GoFolyX</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Disponible sur Android</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {/* APK direct */}
          <a href={APK_URL} download
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold no-underline transition-all"
            style={{ background: 'var(--primary)', color: '#fff' }}
            onMouseEnter={e => { (e.currentTarget.style.opacity = '0.9'); }}
            onMouseLeave={e => { (e.currentTarget.style.opacity = '1'); }}
          >
            <Download size={15} />
            Télécharger l'APK v{APK_VERSION}
          </a>
          {/* Play Store */}
          {PLAY_STORE_URL && (
            <a href={PLAY_STORE_URL} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold no-underline transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
              Google Play
            </a>
          )}
          {/* App Store */}
          {APP_STORE_URL && (
            <a href={APP_STORE_URL} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold no-underline transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
              App Store
            </a>
          )}
        </div>
      </div>
    );
  }

  // variant = 'bar'
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl ${className}`}
      style={{ background: 'rgba(123,63,242,0.08)', border: '1px solid rgba(123,63,242,0.18)' }}>
      <div className="flex items-center gap-2 min-w-0">
        <RoundLogo size={24} />
        <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          Télécharger l'app GoFolyX
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {PLAY_STORE_URL && (
          <a href={PLAY_STORE_URL} target="_blank" rel="noreferrer"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg no-underline transition-all"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
            Play Store
          </a>
        )}
        {APP_STORE_URL && (
          <a href={APP_STORE_URL} target="_blank" rel="noreferrer"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg no-underline transition-all"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
            App Store
          </a>
        )}
        <a href={APK_URL} download
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg no-underline transition-all"
          style={{ background: 'var(--primary)', color: '#fff' }}
          onMouseEnter={e => { (e.currentTarget.style.opacity = '0.88'); }}
          onMouseLeave={e => { (e.currentTarget.style.opacity = '1'); }}
        >
          <Download size={12} />
          Android APK
        </a>
      </div>
    </div>
  );
}
