/**
 * Préférences de lecture automatique — même sémantique que le mobile
 * (usePlaybackPrefs.ts / useAppPreferences.ts), alimentées par le backend :
 *
 *  - `autoplay` (GET/PUT /users/me/playback, défaut true — Réglages > Lecture) :
 *    lecture auto des vidéos de post, films/séries et premier reel ouvert.
 *  - `feed_autoplay_reels` (GET/PUT /users/me/app-preferences, défaut false,
 *    opt-in — Réglages > Lecture) : aperçu muet des reels croisés dans le fil.
 *
 * Source unique : cache module + localStorage (pas de flash au chargement),
 * rafraîchi une fois par session depuis l'API, partagé entre tous les lecteurs
 * via useSyncExternalStore. Les pages de réglages appellent setPlaybackPrefs
 * pour répercuter immédiatement un changement partout.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';

export interface PlaybackPrefs {
  /** Lecture automatique des vidéos (posts, films, séries, reels plein écran). */
  autoplay: boolean;
  /** Aperçu muet automatique des reels rencontrés dans le fil. */
  feed_autoplay_reels: boolean;
  /** Streaming HD : sans limite de qualité HLS ; désactivé = plafonné à 720p. */
  hd_streaming: boolean;
}

const STORAGE_KEY = 'playback_prefs_v1';
const DEFAULTS: PlaybackPrefs = { autoplay: true, feed_autoplay_reels: false, hd_streaming: false };

function readCache(): PlaybackPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        autoplay: typeof p.autoplay === 'boolean' ? p.autoplay : DEFAULTS.autoplay,
        feed_autoplay_reels: typeof p.feed_autoplay_reels === 'boolean' ? p.feed_autoplay_reels : DEFAULTS.feed_autoplay_reels,
        hd_streaming: typeof p.hd_streaming === 'boolean' ? p.hd_streaming : DEFAULTS.hd_streaming,
      };
    }
  } catch { /* localStorage indisponible */ }
  return DEFAULTS;
}

let current: PlaybackPrefs = readCache();
let fetchedForUser: string | null = null;
const listeners = new Set<() => void>();

function emit() { listeners.forEach(l => l()); }

/** Lecture synchrone (hors React : handlers, effets déjà montés). */
export function getPlaybackPrefs(): PlaybackPrefs { return current; }

/** Met à jour le cache local (et notifie les lecteurs) — n'appelle pas l'API. */
export function setPlaybackPrefs(partial: Partial<PlaybackPrefs>): void {
  const next = { ...current, ...partial };
  if (next.autoplay === current.autoplay && next.feed_autoplay_reels === current.feed_autoplay_reels && next.hd_streaming === current.hd_streaming) return;
  current = next;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); } catch { /* ignore */ }
  emit();
}

async function refreshFromApi(userId: string): Promise<void> {
  if (fetchedForUser === userId) return;
  fetchedForUser = userId;
  const [pb, app] = await Promise.allSettled([
    apiClient.get<{ autoplay?: boolean; hd_streaming?: boolean }>(Endpoints.users.playback),
    apiClient.get<{ feed_autoplay_reels?: boolean }>(Endpoints.users.appPreferences),
  ]);
  const patch: Partial<PlaybackPrefs> = {};
  if (pb.status === 'fulfilled' && typeof pb.value.data?.autoplay === 'boolean') patch.autoplay = pb.value.data.autoplay;
  if (pb.status === 'fulfilled' && typeof pb.value.data?.hd_streaming === 'boolean') patch.hd_streaming = pb.value.data.hd_streaming;
  if (app.status === 'fulfilled' && typeof app.value.data?.feed_autoplay_reels === 'boolean') patch.feed_autoplay_reels = app.value.data.feed_autoplay_reels;
  if (pb.status === 'rejected' && app.status === 'rejected') fetchedForUser = null; // réessaiera au prochain montage
  setPlaybackPrefs(patch);
}

/** Abonnement hors React (ex. instances hls.js). Retourne la fonction de désabonnement. */
export function subscribePlaybackPrefs(cb: () => void): () => void {
  return subscribe(cb);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function usePlaybackPrefs(): PlaybackPrefs {
  const userId = useAuthStore(s => s.user?.id ?? null);
  useEffect(() => {
    if (userId) void refreshFromApi(userId);
    else fetchedForUser = null;
  }, [userId]);
  return useSyncExternalStore(subscribe, getPlaybackPrefs, getPlaybackPrefs);
}
