// N'autorise que les chemins internes relatifs ("/feed", "/auth/complete-profile?x=1").
// Rejette les URLs absolues, protocol-relative ("//evil.com") et les variantes
// backslash ("\evil.com", "/\evil.com") qu'un navigateur normalise en hostname.
export function getSafeRedirect(raw: string | null, fallback = '/feed'): string {
  if (!raw) return fallback;
  const normalized = raw.replace(/\\/g, '/');
  if (!normalized.startsWith('/') || normalized.startsWith('//')) return fallback;
  return normalized;
}
