// Formatage de dates — aligné sur le format mobile (PostCard.tsx::timeAgo)
// pour une expérience cohérente entre web et mobile.

/** "maintenant" / "5 min" / "3h" / puis date complète avec heure au-delà de
 * 24h ("4 juin 2026 à 23:00") — pas de palier intermédiaire en jours, jugé
 * illisible passé un mois (même raisonnement que mobile). */
export function formatTimeAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'maintenant';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Date complète avec heure — "5 août 2025 à 14:30". */
export function formatFullDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
