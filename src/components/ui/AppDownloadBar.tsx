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
    // Utilisée sur le panneau de marque violet foncé : texte clair, carte en verre dépoli,
    // bouton blanc à texte violet (contraste maximal, rien d'illisible sur le fond).
    return (
      <div className={`rounded-[28px] p-5 ${className}`}
        style={{
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)',
          WebkitBackdropFilter: 'blur(10px)', backdropFilter: 'blur(10px)',
        }}>
        <div className="flex items-center gap-3.5 mb-4">
          <RoundLogo size={44} />
          <div className="min-w-0">
            <p className="font-black text-base leading-tight" style={{ color: '#fff' }}>Télécharger Gofolyx</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.78)' }}>
              Disponible sur Android{version ? ` · v${version}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {PLAY_STORE_URL && (
            <a href={PLAY_STORE_URL} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 h-12 px-5 rounded-full text-sm font-black no-underline transition-all hover:-translate-y-0.5"
              style={{ background: '#fff', color: '#5B2EC4', boxShadow: '0 6px 18px rgba(0,0,0,0.25)' }}>
              Google Play
            </a>
          )}
          {APP_STORE_URL && (
            <a href={APP_STORE_URL} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 h-12 px-5 rounded-full text-sm font-bold no-underline transition-all"
              style={{ background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.45)' }}>
              App Store
            </a>
          )}
        </div>
      </div>
    );
  }

  // variant = 'bar'
  return (
    <div className={`flex items-center justify-between gap-3 pl-3 pr-2.5 py-2.5 rounded-full ${className}`}
      style={{ background: 'rgba(123,63,242,0.08)', border: '1px solid rgba(123,63,242,0.18)' }}>
      <div className="flex items-center gap-2 min-w-0">
        <RoundLogo size={24} />
        <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          Télécharger l'app Gofolyx
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {PLAY_STORE_URL && (
          <a href={PLAY_STORE_URL} target="_blank" rel="noreferrer"
            className="text-xs font-bold px-4 py-2 rounded-full no-underline transition-all"
            style={{ background: 'var(--primary)', color: '#fff' }}>
            Play Store
          </a>
        )}
        {APP_STORE_URL && (
          <a href={APP_STORE_URL} target="_blank" rel="noreferrer"
            className="text-xs font-bold px-4 py-2 rounded-full no-underline transition-all"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
            App Store
          </a>
        )}
      </div>
    </div>
  );
}
