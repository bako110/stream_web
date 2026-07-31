export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
export const WS_BASE_URL  = import.meta.env.VITE_WS_BASE_URL  ?? '';

const R2_PUBLIC_HOST = 'pub-6359d54251d74e879f64e6dc3afdb145.r2.dev';

/**
 * En dev, réécrit les URLs R2 via le proxy Vite /r2 pour contourner le CORS.
 * En prod, retourne l'URL telle quelle (le bucket R2 doit avoir CORS configuré).
 */
export function toProxiedUrl(url: string): string {
  if (import.meta.env.DEV && url.includes(R2_PUBLIC_HOST)) {
    return url.replace(`https://${R2_PUBLIC_HOST}`, '/r2');
  }
  return url;
}

export const APP_NAME    = 'GoFolyX';
export const APP_VERSION = '1.0.0.7';

export const DEFAULT_PAGE_LIMIT = 20;
export const REELS_PAGE_LIMIT   = 10;

export const STORAGE_KEYS = {
  ACCESS_TOKEN:    'gofolyx_access_token',
  REFRESH_TOKEN:   'gofolyx_refresh_token',
  THEME_MODE:      'gofolyx_theme_mode',
  ONBOARDING_DONE: 'gofolyx_onboarding_done',
} as const;

export const PLAN_LABELS = {
  free:    'Gratuit',
  basic:   'Basic',
  premium: 'Premium',
  family:  'Famille',
} as const;
