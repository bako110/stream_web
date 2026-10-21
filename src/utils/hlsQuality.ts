/**
 * Qualité HLS selon Réglages > Lecture > "Streaming HD".
 *  - HD activé  : aucune limite, hls.js monte jusqu'à la meilleure variante.
 *  - HD désactivé (défaut) : plafonné à 720p pour économiser les données ;
 *    si aucune variante ne descend sous 720p, on garde la plus basse.
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

export function applyHlsQualityPref(hls: HlsLike): void {
  const apply = () => {
    if (getPlaybackPrefs().hd_streaming) { hls.autoLevelCapping = -1; return; }
    const levels = hls.levels ?? [];
    let cap = -1;
    levels.forEach((l, i) => { if ((l.height ?? 0) > 0 && (l.height ?? 0) <= SD_MAX_HEIGHT && i > cap) cap = i; });
    // Variantes triées par bitrate : si toutes dépassent 720p, plafonne à la plus basse.
    if (cap === -1 && levels.length > 1) cap = 0;
    hls.autoLevelCapping = cap;
  };
  hls.on('hlsManifestParsed', apply);
  const unsubscribe = subscribePlaybackPrefs(() => { if (hls.levels?.length) apply(); });
  hls.on('hlsDestroying', unsubscribe);
}
