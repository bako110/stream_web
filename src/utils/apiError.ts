/**
 * Extrait un message d'erreur lisible depuis n'importe quelle réponse API.
 *
 * Formats gérés :
 * - FastAPI HTTPException(detail="...")            → string
 * - FastAPI validation Pydantic (422)               → detail: [{msg, ...}, ...]
 * - HTTPException(detail={code, message, ...})      → object avec "message" ou "code"
 * - slowapi rate limit (429)                        → { error: "Rate limit exceeded: ..." }
 */
export function extractApiErrorMessage(err: unknown, fallback = 'Une erreur est survenue.'): string {
  const data = (err as any)?.response?.data;
  const status = (err as any)?.response?.status;

  if (status === 429) {
    return 'Trop de tentatives. Merci de patienter quelques minutes avant de réessayer.';
  }

  const detail = data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg ?? d).join(', ');
  if (detail && typeof detail === 'object') {
    if (typeof detail.message === 'string') return detail.message;
    if (typeof detail.code === 'string') return detail.code;
  }
  if (typeof data?.error === 'string') return data.error;

  return fallback;
}
