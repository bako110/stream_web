/**
 * Extrait un message d'erreur lisible depuis une erreur levée par apiClient
 * (voir api/client.ts : ApiError { status, message, data }, data = body JSON brut).
 *
 * Formats gérés dans `data` :
 * - FastAPI HTTPException(detail="...")            → string
 * - FastAPI validation Pydantic (422)               → detail: [{msg, ...}, ...]
 * - HTTPException(detail={code, message, ...})      → object avec "message" ou "code"
 * - slowapi rate limit (429)                        → { error: "Rate limit exceeded: ..." }
 */
export function extractApiErrorMessage(err: unknown, fallback = 'Une erreur est survenue.'): string {
  const status = (err as any)?.status;
  const data = (err as any)?.data;

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

/** Extrait le `detail` brut (string | array | object) d'une ApiError, sans le transformer en message. */
export function getApiErrorDetail(err: unknown): unknown {
  return (err as any)?.data?.detail;
}
