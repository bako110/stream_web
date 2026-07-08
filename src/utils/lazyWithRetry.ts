import { lazy, type ComponentType } from 'react';

// Après un déploiement, les anciens chunks JS sont supprimés du serveur — un
// onglet resté ouvert qui navigue vers une route pas encore chargée déclenche
// un import() 404 (`Failed to fetch dynamically imported module`). Sans ce
// wrapper, l'URL change (React Router) mais rien ne s'affiche : le lazy import
// échoue silencieusement et Suspense n'a personne à qui laisser la main.
// On détecte ce cas précis et on force un rechargement complet de la page
// (une seule fois — le flag en sessionStorage évite une boucle si l'erreur a
// une autre cause) pour récupérer les fichiers à jour.
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): ReturnType<typeof lazy<T>> {
  return lazy(async () => {
    try {
      const mod = await factory();
      // Chargement réussi — un futur échec de chunk (après un nouveau déploiement
      // plus tard dans la session) doit pouvoir redéclencher un reload.
      sessionStorage.removeItem('gofolyx_chunk_reload');
      return mod;
    } catch (err: any) {
      const msg = String(err?.message ?? '');
      const isChunkError =
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('error loading dynamically imported module') ||
        msg.includes('Importing a module script failed');

      const reloadKey = 'gofolyx_chunk_reload';
      if (isChunkError && !sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
        // Ne résout jamais — le reload va remplacer la page avant que ça compte.
        return new Promise(() => {});
      }
      throw err;
    }
  });
}
