/**
 * tabReselect — équivalent web du popToTabRoot() mobile (cf.
 * stream_mobile/src/navigation/stackHygiene.ts). Sur le web, l'historique
 * du navigateur gère déjà nativement le "retour" (pas de pile custom à
 * corriger) — mais cliquer sur un onglet déjà actif (Sidebar/BottomNav) ne
 * faisait jusqu'ici rien : la page restait scrollée où elle était, sans
 * rafraîchir son contenu, contrairement au comportement attendu façon
 * Instagram/TikTok (retap sur l'onglet actif = retour en haut + refresh).
 *
 * Basé sur un CustomEvent DOM natif plutôt qu'un contexte React — évite de
 * faire remonter une dépendance jusqu'à AppLayout pour un besoin ponctuel,
 * et n'importe quelle page peut s'y abonner sans changer sa position dans
 * l'arbre de composants.
 */
const EVENT_NAME = 'gofolyx:tab-reselect';

/** À appeler par un NavLink/lien d'onglet quand `isActive` est déjà vrai. */
export function emitTabReselect(path: string) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { path } }));
}

/**
 * Hook — écoute les réinvocations de l'onglet correspondant à `path` et
 * appelle `onReselect` (scroll to top, refetch, etc.). `path` doit
 * correspondre exactement à la prop `to` du NavLink concerné.
 */
import { useEffect } from 'react';

export function useTabReselect(path: string, onReselect: () => void) {
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ path: string }>).detail;
      if (detail?.path === path) onReselect();
    }
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, [path, onReselect]);
}
