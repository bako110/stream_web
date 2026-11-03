/**
 * Qualité HLS = le plus bas de deux plafonds :
 *  1. le plan d'abonnement (max_height, imposé — SD 480 / HD 1080 / 4K 2160) ;
 *  2. Réglages > Lecture > "Streaming HD" : désactivé (défaut) → 720p pour économiser les données.
 * Si aucune variante ne tient sous le plafond, on garde la plus basse.
 * Suit le réglage en direct (changement dans les paramètres → appliqué au flux
 * en cours sans le recharger) et se désabonne à la destruction de l'instance.
 * Typage volontairement minimal : fonctionne avec n'importe quelle instance hls.js
 * sans importer la lib (qui est chargée en dynamique à plusieurs endroits).
 */
import { getPlaybackPrefs, subscribePlaybackPrefs } from '../hooks/usePlaybackPrefs';

const SD_MAX_HEIGHT = 720;

interface HlsLike {
  levels: { height?: number }[];
  autoLevelCapping: number;
  on: (event: string, cb: () => void) => void;
}

export function applyHlsQualityPref(instance: object, planMaxHeight?: number): void {
  // Cast : le typage strict de hls.js (événements typés) n'est pas assignable à HlsLike.
  const hls = instance as unknown as HlsLike;
  const apply = () => {
    const prefCap = getPlaybackPrefs().hd_streaming ? Infinity : SD_MAX_HEIGHT;
    const capHeight = Math.min(prefCap, planMaxHeight ?? Infinity);
    if (capHeight === Infinity) { hls.autoLevelCapping = -1; return; }
    const levels = hls.levels ?? [];
    let cap = -1;
    levels.forEach((l, i) => { if ((l.height ?? 0) > 0 && (l.height ?? 0) <= capHeight && i > cap) cap = i; });
    // Variantes triées par bitrate : si toutes dépassent le plafond, plafonne à la plus basse.
    if (cap === -1 && levels.length > 1) cap = 0;
    hls.autoLevelCapping = cap;
  };
  hls.on('hlsManifestParsed', apply);
  const unsubscribe = subscribePlaybackPrefs(() => { if (hls.levels?.length) apply(); });
  hls.on('hlsDestroying', unsubscribe);
}
