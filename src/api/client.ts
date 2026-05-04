import { API_BASE_URL } from '../utils/constants';

// ── Types ─────────────────────────────────────────────────────────────────────
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeout?: number;   // ms, default 30 000
}

export interface ApiResponse<T> { data: T; status: number; message?: string; }

export class ApiError extends Error {
  status: number;
  data?: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// ── Module-level interceptor state ───────────────────────────────────────────
let _authToken:       string | null = null;
let _refreshTokenFn:  (() => Promise<string>) | null = null;
let _onUnauthorized:  (() => void) | null = null;
let _refreshPromise:  Promise<string> | null = null;  // dedup concurrent refresh

export const setAuthToken      = (t: string | null)           => { _authToken = t; };
export const setRefreshTokenFn = (fn: () => Promise<string>)  => { _refreshTokenFn = fn; };
export const setOnUnauthorized = (fn: () => void)             => { _onUnauthorized = fn; };

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept:         'application/json',
    ...extra,
  };
  if (_authToken) h.Authorization = `Bearer ${_authToken}`;
  return h;
}

// Parse response body safely
async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

// ── Core request with auto-refresh + timeout ──────────────────────────────────
async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
  _isRetry = false,
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    body,
    headers: extraHeaders,
    signal: externalSignal,
    timeout = 30_000,
  } = options;

  // Timeout via AbortController
  const controller  = new AbortController();
  const timeoutId   = setTimeout(() => controller.abort(), timeout);

  // Merge external signal + timeout signal
  const signal = externalSignal
    ? anyAbort([externalSignal, controller.signal])
    : controller.signal;

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: buildHeaders(extraHeaders),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });

    clearTimeout(timeoutId);

    const json = await parseBody(response);

    // ── 401 → try refresh once ────────────────────────────────────────────────
    if (response.status === 401 && !_isRetry && _refreshTokenFn) {
      try {
        // Deduplicate: only one refresh at a time
        if (!_refreshPromise) {
          _refreshPromise = _refreshTokenFn().finally(() => { _refreshPromise = null; });
        }
        const newToken = await _refreshPromise;
        setAuthToken(newToken);
        // Retry original request with new token (no timeout reset needed)
        return request<T>(endpoint, { ...options, signal: externalSignal }, true);
      } catch {
        // Refresh failed → full logout
        _onUnauthorized?.();
        throw new ApiError(401, 'Session expirée. Veuillez vous reconnecter.', json);
      }
    }

    // ── 401 on retry → logout ─────────────────────────────────────────────────
    if (response.status === 401 && _isRetry) {
      _onUnauthorized?.();
      throw new ApiError(401, 'Session expirée. Veuillez vous reconnecter.', json);
    }

    // ── Other error statuses ──────────────────────────────────────────────────
    if (!response.ok) {
      const msg = (json as any)?.message ?? (json as any)?.detail ?? `Erreur ${response.status}`;
      throw new ApiError(response.status, msg, json);
    }

    // ── Success ───────────────────────────────────────────────────────────────
    const data = (json as any)?.data ?? json;
    return { data: data as T, status: response.status, message: (json as any)?.message };

  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;

    const isAbort = (err as Error).name === 'AbortError';
    throw new ApiError(
      isAbort ? 408 : 0,
      isAbort ? 'La requête a expiré. Vérifiez votre connexion.' : 'Erreur réseau. Vérifiez votre connexion.',
    );
  }
}

// Helper: abort when ANY signal fires
function anyAbort(signals: AbortSignal[]): AbortSignal {
  const ctrl = new AbortController();
  for (const sig of signals) {
    if (sig.aborted) { ctrl.abort(); break; }
    sig.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  return ctrl.signal;
}

// ── Upload with same retry logic ──────────────────────────────────────────────
async function upload<T>(
  endpoint: string,
  formData: FormData,
  _isRetry = false,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (_authToken) headers.Authorization = `Bearer ${_authToken}`;

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 120_000); // 2 min for uploads

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const json = await parseBody(response);

    if (response.status === 401 && !_isRetry && _refreshTokenFn) {
      try {
        if (!_refreshPromise) {
          _refreshPromise = _refreshTokenFn().finally(() => { _refreshPromise = null; });
        }
        const newToken = await _refreshPromise;
        setAuthToken(newToken);
        return upload<T>(endpoint, formData, true);
      } catch {
        _onUnauthorized?.();
        throw new ApiError(401, 'Session expirée. Veuillez vous reconnecter.', json);
      }
    }

    if (!response.ok) {
      const msg = (json as any)?.message ?? (json as any)?.detail ?? 'Upload échoué';
      throw new ApiError(response.status, msg, json);
    }

    const data = (json as any)?.data ?? json;
    return { data: data as T, status: response.status };

  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, 'Erreur réseau pendant l\'upload.');
  }
}

// ── Public API client ─────────────────────────────────────────────────────────
export const apiClient = {
  get:    <T>(ep: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(ep, { ...opts, method: 'GET' }),

  post:   <T>(ep: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(ep, { ...opts, method: 'POST', body }),

  put:    <T>(ep: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(ep, { ...opts, method: 'PUT', body }),

  patch:  <T>(ep: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(ep, { ...opts, method: 'PATCH', body }),

  delete: <T>(ep: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(ep, { ...opts, method: 'DELETE' }),

  upload,
};
