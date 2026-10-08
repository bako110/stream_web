/**
 * Préchargement — équivalent web de FeedScreen.prefetchUpcomingImages et de
 * reelsPrefetchService (mobile).
 *
 * - prefetchImages : télécharge les images à l'avance (le navigateur les garde
 *   en cache HTTP/mémoire, donc l'affichage au scroll est instantané).
 * - startReelsPrefetch / consumeReelsPrefetch : charge la 1ère page du feed
 *   Reels + la 1ère vidéo dès l'entrée dans l'app, AVANT le clic sur l'onglet.
 *   ReelsPage relit ce résultat au montage (une seule fois) pour éviter un
 *   second fetch redondant.
 */
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';

const prefetched = new Set<string>();
const MAX_TRACKED = 600;

// Connexion lente / économie de données : on réduit la voilure, comme le mobile
// (4 images d'avance en wifi, 2 sinon).
function connectionAhead(): number {
  const c = (navigator as any).connection;
  if (c?.saveData) return 0;
  const t: string | undefined = c?.effectiveType;
  if (t === 'slow-2g' || t === '2g') return 0;
  if (t === '3g') return 2;
  return 4;
}
export const imagesAhead = connectionAhead;

export function prefetchImages(urls: Array<string | null | undefined>, limit = Infinity): void {
  let n = 0;
  for (const url of urls) {
    if (n >= limit) break;
    if (!url || prefetched.has(url)) continue;
    if (prefetched.size > MAX_TRACKED) prefetched.clear();
    prefetched.add(url);
    n++;
    const img = new Image();
    img.decoding = 'async';
    (img as any).fetchPriority = 'low';
    img.src = url;
  }
}

// ── Reels ────────────────────────────────────────────────────────────────────
interface ReelsPage1 { data: any }
let pending: Promise<ReelsPage1 | null> | null = null;
let result: ReelsPage1 | null = null;
let consumed = false;
let warmVideo: HTMLVideoElement | null = null;

export function startReelsPrefetch(): void {
  if (pending || result || consumed) return;
  pending = apiClient.get<any>(`${Endpoints.reels.feed}?limit=15&page=1`)
    .then(res => {
      result = { data: res.data };
      const raw = res.data;
      const list: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : Array.isArray(raw?.data) ? raw.data : [];
      prefetchImages(list.slice(0, 4).map(r => r?.thumbnail_url));
      // Vidéo du 1er reel : un <video preload="auto"> détaché démarre le
      // téléchargement (cache HTTP réutilisé ensuite par le vrai lecteur).
      const first = list.find(r => r?.mp4_url);
      if (first?.mp4_url && connectionAhead() > 0) {
        warmVideo = document.createElement('video');
        warmVideo.preload = 'auto';
        warmVideo.muted = true;
        warmVideo.src = first.mp4_url;
        warmVideo.load();
        // Libère la référence après quelques secondes — le cache HTTP suffit.
        setTimeout(() => { if (warmVideo) { warmVideo.removeAttribute('src'); warmVideo.load(); warmVideo = null; } }, 15000);
      }
      return result;
    })
    .catch(() => null)
    .finally(() => { pending = null; });
}

/** Résultat préchargé (une seule fois) — null si rien de prêt / déjà consommé. */
export function consumeReelsPrefetch(): ReelsPage1 | null {
  if (consumed || !result) return null;
  consumed = true;
  const r = result;
  result = null;
  return r;
}
