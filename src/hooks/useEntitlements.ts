import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';

/** Droits effectifs de l'utilisateur (GET /subscriptions/entitlements) — plan, écrans, qualité max, quota. */
export interface Entitlements {
  plan: string;
  screens: number;
  quality: string;
  max_height: number;
  downloads: number;
  downloads_used: number;
  downloads_left: number;
  dolby: boolean;
  parental_control: boolean;
  profiles: number;
}

const TTL_MS = 60_000;
let cache: { at: number; value: Promise<Entitlements | null> } | null = null;

/** Droits en cache 1 min (évite un appel par lecture). Renvoie null si le serveur est injoignable → aucun plafond appliqué. */
export function getEntitlements(force = false): Promise<Entitlements | null> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const value = apiClient.get<Entitlements>(Endpoints.subscriptions.entitlements)
    .then(r => r.data ?? null)
    .catch(() => null);
  cache = { at: Date.now(), value };
  return value;
}

/** À appeler après un changement d'abonnement pour que les droits soient relus. */
export function invalidateEntitlements(): void {
  cache = null;
}
