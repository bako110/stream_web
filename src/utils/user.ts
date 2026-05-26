type UserLike = {
  display_name?: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

/** Retourne le meilleur nom à afficher — jamais null/undefined */
export function displayName(u?: UserLike | null, fallback = 'Utilisateur'): string {
  if (!u) return fallback;
  if (u.display_name?.trim()) return u.display_name.trim();
  if (u.username?.trim())     return u.username.trim();
  const full = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
  if (full) return full;
  return fallback;
}

/** Retourne @handle ou chaîne vide */
export function displayHandle(u?: UserLike | null): string {
  if (!u?.username?.trim()) return '';
  return `@${u.username.trim()}`;
}
