import { useEffect, useState } from 'react';
import { RoundLogo } from './RoundLogo';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';

// Liens stores
const PLAY_STORE_URL  = 'https://play.google.com/store/apps/details?id=com.gofolyx.mobile';
const APP_STORE_URL   = null; // à remplir quand l'app iOS sera publiée — ex: 'https://apps.apple.com/app/gofolyx/idXXXXXXXXX'

interface AppVersionResponse {
  version_name: string;
  apk_url: string | null;
}

interface Props {
  /** 'bar' = bandeau horizontal compact | 'card' = carte avec icônes stores */
  variant?: 'bar' | 'card';
  className?: string;
}

export function AppDownloadBar({ variant = 'bar', className = '' }: Props) {
  // Version/lien APK auto-détectés depuis le backend (jamais codés en dur) —
  // uniquement pour la vitrine Play Store, pas de téléchargement APK brut ici.
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<AppVersionResponse>(Endpoints.app.version)
      .then(r => { if (r.data?.version_name) setVersion(r.data.version_name); })
      .catch(() => {});
  }, []);

  if (variant === 'card') {
    return (
      <div className={`rounded-2xl p-5 ${className}`}
        style={{ background: 'rgba(123,63,242,0.08)', border: '1px solid rgba(123,63,242,0.2)' }}>
        <div className="flex items-center gap-3 mb-4">
          <RoundLogo size={40} />
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Télécharger GoFolyX</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Disponible sur Android{version ? ` · v${version}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {/* Play Store */}
          {PLAY_STORE_URL && (
            <a href={PLAY_STORE_URL} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold no-underline transition-all"
              style={{ background: 'var(--primary)', color: '#fff' }}>
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
            style={{ background: 'var(--primary)', color: '#fff' }}>
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
      </div>
    </div>
  );
}
