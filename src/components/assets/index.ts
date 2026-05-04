// Centralisation des assets — utiliser uniquement via cet index

import logoLightUrl from './images/stream_logo_light.png';
import logoDarkUrl  from './images/stream_logo_dark.png';

export const Images = {
  logoLight: logoLightUrl,
  logoDark:  logoDarkUrl,
} as const;

export type ImageKey = keyof typeof Images;

// Helper : retourne le bon logo selon le thème
export const getLogo = (isDark: boolean) =>
  isDark ? Images.logoDark : Images.logoLight;
