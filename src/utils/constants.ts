export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
export const WS_BASE_URL  = import.meta.env.VITE_WS_BASE_URL  ?? '';

export const APP_NAME    = 'FoliX';
export const APP_VERSION = '1.0.0';

export const DEFAULT_PAGE_LIMIT = 20;
export const REELS_PAGE_LIMIT   = 10;

export const STORAGE_KEYS = {
  ACCESS_TOKEN:    'folix_access_token',
  REFRESH_TOKEN:   'folix_refresh_token',
  THEME_MODE:      'folix_theme_mode',
  ONBOARDING_DONE: 'folix_onboarding_done',
} as const;

export const PLAN_LABELS = {
  free:    'Gratuit',
  basic:   'Basic',
  premium: 'Premium',
  family:  'Famille',
} as const;
