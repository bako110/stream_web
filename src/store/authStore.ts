import { create } from 'zustand';
import type { User, LoginRequest, RegisterRequest, AuthToken } from '../types';
import { apiClient, setAuthToken, setRefreshTokenFn, setOnUnauthorized } from '../api';
import { Endpoints } from '../api/endpoints';

const STORAGE_KEY = 'folix-auth-tokens';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuthState {
  user:            User | null;
  accessToken:     string | null;
  refreshToken:    string | null;
  isAuthenticated: boolean;
  isLoading:       boolean;
  isInitializing:  boolean;
  error:           string | null;

  login:              (data: LoginRequest)     => Promise<void>;
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
  error:           null,

  login: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post<AuthToken>(Endpoints.auth.login, data);
      const { access_token, refresh_token } = res.data;
      setAuthToken(access_token);
      saveTokens(access_token, refresh_token);
      set({ accessToken: access_token, refreshToken: refresh_token, isLoading: false });
      await get().fetchMe();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur de connexion';
      set({ isLoading: false, error: msg, isAuthenticated: false });
      throw e;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post<AuthToken>(Endpoints.auth.register, data);
      const { access_token, refresh_token } = res.data;
      setAuthToken(access_token);
      saveTokens(access_token, refresh_token);
      set({ accessToken: access_token, refreshToken: refresh_token, isLoading: false });
      await get().fetchMe();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur d'inscription";
      set({ isLoading: false, error: msg, isAuthenticated: false });
      throw e;
    }
  },

  logout: async () => {
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
    try { await apiClient.post(Endpoints.auth.logout); } catch { /* ignore */ }
  },

  refreshAccessToken: async () => {
    const { refreshToken } = get();
    if (!refreshToken) {
      await get().logout();
      throw new Error('No refresh token');
    }
    try {
      const res = await apiClient.post<AuthToken>(
        Endpoints.auth.refresh,
        { refresh_token: refreshToken },
      );
      const newToken = res.data.access_token;
      setAuthToken(newToken);
      saveTokens(newToken, refreshToken);
      set({ accessToken: newToken });
      return newToken;
    } catch (e) {
      setAuthToken(null);
      saveTokens(null, null);
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isInitializing: false });
      throw e;
    }
  },

  fetchMe: async () => {
    try {
      const res = await apiClient.get<User>(Endpoints.auth.me);
      set({ user: res.data, isAuthenticated: true, isInitializing: false });
    } catch {
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
