import { create } from 'zustand';
import type { User, LoginRequest, RegisterRequest, AuthToken } from '../types';
import { apiClient, setAuthToken, setRefreshTokenFn, setOnUnauthorized } from '../api';
import { Endpoints } from '../api/endpoints';

const STORAGE_KEY = 'gofolyx-auth-tokens';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuthState {
  user:            User | null;
  accessToken:     string | null;
  refreshToken:    string | null;
  isAuthenticated: boolean;
  isLoading:       boolean;
  isInitializing:  boolean;
  isRefreshing:    boolean;
  error:           string | null;

  login:              (data: LoginRequest)     => Promise<void>;
  loginWithQR:        (accessToken: string, refreshToken?: string) => Promise<void>;
  register:           (data: RegisterRequest)  => Promise<void>;
  logout:             ()                       => Promise<void>;
  refreshAccessToken: ()                       => Promise<string>;
  fetchMe:            ()                       => Promise<void>;
  updateUser:         (partial: Partial<User>) => void;
  clearError:         ()                       => void;
}

// ── Token persistence ─────────────────────────────────────────────────────────
function saveTokens(access: string | null, refresh: string | null) {
  try {
    if (access || refresh) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ access, refresh }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch { /* ignore */ }
}

function loadTokens(): { access: string | null; refresh: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { access: null, refresh: null };
    const p = JSON.parse(raw);
    return {
      access:  typeof p.access  === 'string' ? p.access  : null,
      refresh: typeof p.refresh === 'string' ? p.refresh : null,
    };
  } catch {
    return { access: null, refresh: null };
  }
}

// ── Wire API interceptors ─────────────────────────────────────────────────────
function wireInterceptors() {
  setRefreshTokenFn(() => useAuthStore.getState().refreshAccessToken());
  setOnUnauthorized(() => { useAuthStore.getState().logout(); });
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>()((set, get) => ({
  user:            null,
  accessToken:     null,
  refreshToken:    null,
  isAuthenticated: false,
  isLoading:       false,
  isInitializing:  true,
  isRefreshing:    false,
  error:           null,

  loginWithQR: async (accessToken: string, refreshToken?: string) => {
    set({ isLoading: true, error: null });
    try {
      if (!accessToken) throw new Error('Token invalide');
      setAuthToken(accessToken);
      saveTokens(accessToken, refreshToken ?? null);
      set({ accessToken, refreshToken: refreshToken ?? null, isLoading: false });
      await get().fetchMe();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur de connexion QR';
      set({ isLoading: false, error: msg, isAuthenticated: false });
      throw e;
    }
  },

  login: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post<AuthToken>(Endpoints.auth.login, data);
      const token = res.data;
      if (!token?.access_token) throw new Error('Réponse invalide du serveur');
      setAuthToken(token.access_token);
      saveTokens(token.access_token, token.refresh_token);
      set({ accessToken: token.access_token, refreshToken: token.refresh_token, isLoading: false });
      await get().fetchMe();
    } catch (e: unknown) {
      const detail = (e as any)?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : 'Identifiants incorrects';
      set({ isLoading: false, error: msg, isAuthenticated: false });
      throw e;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    // Même logique que le mobile : ne jamais envoyer email/phone/username vides
    const payload: typeof data = {
      first_name:    data.first_name,
      last_name:     data.last_name,
      password:      data.password,
      date_of_birth: data.date_of_birth,
      gender:        data.gender,
      form_started_at: data.form_started_at,
      website_url:     data.website_url,
      device_fingerprint: data.device_fingerprint,
      ...(data.email    ? { email:    data.email }    : {}),
      ...(data.phone    ? { phone:    data.phone }    : {}),
      ...(data.username ? { username: data.username } : {}),
      ...(data.referral_code ? { referral_code: data.referral_code } : {}),
    };
    try {
      // register retourne UserResponse (pas de tokens) — même comportement que mobile
      await apiClient.post(Endpoints.auth.register, payload);
      // Auto-login après inscription avec identifier = email ?? phone
      await get().login({
        identifier: (payload.email ?? payload.phone)!,
        password:   payload.password,
      });
    } catch (e: unknown) {
      const detail = (e as any)?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ')
        : "Erreur d'inscription";
      set({ isLoading: false, error: msg, isAuthenticated: false });
      throw e;
    }
  },

  logout: async () => {
    // Appeler l'API avant de supprimer le token (sinon 403)
    try { await apiClient.post(Endpoints.auth.logout); } catch { /* ignore */ }
    setAuthToken(null);
    saveTokens(null, null);
    set({
      user:            null,
      accessToken:     null,
      refreshToken:    null,
      isAuthenticated: false,
      isInitializing:  false,
      error:           null,
    });
  },

  refreshAccessToken: async () => {
    const { refreshToken } = get();
    if (!refreshToken) {
      await get().logout();
      throw new Error('No refresh token');
    }
    set({ isRefreshing: true });
    try {
      const res = await apiClient.post<AuthToken>(
        Endpoints.auth.refresh,
        { refresh_token: refreshToken },
      );
      const newToken = res.data?.access_token;
      if (!newToken) throw new Error('Token refresh invalide');
      setAuthToken(newToken);
      saveTokens(newToken, refreshToken);
      set({ accessToken: newToken, isRefreshing: false });
      return newToken;
    } catch (e) {
      setAuthToken(null);
      saveTokens(null, null);
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isInitializing: false, isRefreshing: false });
      throw e;
    }
  },

  fetchMe: async () => {
    try {
      const res = await apiClient.get<User>(Endpoints.auth.me);
      set({ user: res.data, isAuthenticated: true, isInitializing: false });
    } catch (e: any) {
      const status = e?.response?.status;
      console.warn('[Auth] fetchMe failed status=', status);
      // Token expiré (401) → tenter un refresh avant de déconnecter
      if (status === 401) {
        try {
          await get().refreshAccessToken();
          const res2 = await apiClient.get<User>(Endpoints.auth.me);
          set({ user: res2.data, isAuthenticated: true, isInitializing: false });
          return;
        } catch {
          // Refresh échoué → déconnecter
        }
      }
      setAuthToken(null);
      saveTokens(null, null);
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isInitializing: false });
    }
  },

  updateUser: (partial) => set(s => ({ user: s.user ? { ...s.user, ...partial } : null })),
  clearError: () => set({ error: null }),
}));

// ── bootstrapAuth ─────────────────────────────────────────────────────────────
// Phase 1 (sync): read token from localStorage and wire it into the API client
//   immediately — so any request made during the first render already has the token.
// Phase 2 (async): validate the token via fetchMe, then set isInitializing → false.
export function bootstrapAuth() {
  const { access, refresh } = loadTokens();

  if (access) {
    // Wire synchronously — token is available for all requests from this point
    setAuthToken(access);
    wireInterceptors();
    useAuthStore.setState({ accessToken: access, refreshToken: refresh, isInitializing: true });
    // Validate asynchronously
    useAuthStore.getState().fetchMe();
  } else {
    wireInterceptors();
    useAuthStore.setState({ isInitializing: false });
  }
}
