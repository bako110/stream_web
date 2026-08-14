/**
 * accountsService — multi-compte façon TikTok (jusqu'à MAX_ACCOUNTS comptes
 * stockés localement), portage du système mobile (stream_mobile/src/services/
 * accountsService.ts). La clé localStorage existante ('gofolyx-auth-tokens',
 * gérée par authStore) reste la source de vérité pour le compte ACTIF courant
 * — ce service ajoute une couche par-dessus (liste de comptes en miroir),
 * sans rien changer au fonctionnement mono-compte existant.
 */
import { useAuthStore } from '../store/authStore';
import type { User } from '../types';

const ACCOUNTS_KEY = 'gofolyx-accounts-v1';
const AUTH_TOKENS_KEY = 'gofolyx-auth-tokens';
export const MAX_ACCOUNTS = 4;

export interface StoredAccount {
  user_id: string;
  access_token: string;
  refresh_token: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  is_active: boolean;
  added_at: number;
}

function _readAll(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as StoredAccount[]) : [];
  } catch { return []; }
}

function _writeAll(accounts: StoredAccount[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function _toStoredAccount(accessToken: string, refreshToken: string, user: User, isActive: boolean): StoredAccount {
  return {
    user_id: String(user.id),
    access_token: accessToken,
    refresh_token: refreshToken ?? '',
    display_name: user.display_name ?? user.username ?? '',
    username: user.username ?? '',
    avatar_url: user.avatar_url ?? null,
    is_active: isActive,
    added_at: Date.now(),
  };
}

export const accountsService = {
  /** Migration idempotente — reconstruit un slot unique depuis la session
   * active existante si la liste de comptes n'existe pas encore. */
  migrateIfNeeded(): void {
    if (localStorage.getItem(ACCOUNTS_KEY) !== null) return;
    try {
      const raw = localStorage.getItem(AUTH_TOKENS_KEY);
      if (!raw) { _writeAll([]); return; }
      const { access, refresh } = JSON.parse(raw);
      if (!access) { _writeAll([]); return; }
      const user = useAuthStore.getState().user;
      if (!user) { _writeAll([]); return; }
      _writeAll([_toStoredAccount(access, refresh ?? '', user, true)]);
    } catch { _writeAll([]); }
  },

  listAccounts(): StoredAccount[] {
    return _readAll();
  },

  getActiveAccount(): StoredAccount | null {
    return _readAll().find(a => a.is_active) ?? null;
  },

  canAddAccount(): boolean {
    return _readAll().length < MAX_ACCOUNTS;
  },

  /** Enregistre la session active courante (déjà posée dans authStore par un
   * login réussi) comme nouveau compte dans la liste. */
  addCurrentSessionAsAccount(): StoredAccount {
    const { user, accessToken, refreshToken } = useAuthStore.getState();
    if (!user || !accessToken) throw new Error('Session active introuvable');

    const accounts = _readAll();
    const next = _toStoredAccount(accessToken, refreshToken ?? '', user, true);
    const withoutDup = accounts.filter(a => a.user_id !== next.user_id);
    const updated = [...withoutDup.map(a => ({ ...a, is_active: false })), next];
    _writeAll(updated.slice(-MAX_ACCOUNTS));
    return next;
  },

  /**
   * Bascule vers un compte déjà stocké — aucun appel réseau de connexion,
   * réutilise le refresh_token stocké. L'appelant doit recharger la page
   * après succès (window.location.reload()) pour repartir sur un état
   * propre (WebSocket, caches en mémoire, etc.) — même principe que le
   * remount complet de l'arbre React sur mobile (sessionKey).
   */
  async switchAccount(userId: string): Promise<StoredAccount> {
    const accounts = _readAll();
    const target = accounts.find(a => a.user_id === userId);
    if (!target) throw new Error('Compte introuvable');

    localStorage.setItem(AUTH_TOKENS_KEY, JSON.stringify({ access: target.access_token, refresh: target.refresh_token }));
    _writeAll(accounts.map(a => ({ ...a, is_active: a.user_id === userId })));
    return target;
  },

  /**
   * Retire un compte de la liste — pas une déconnexion globale. Si c'est le
   * compte actif, bascule vers le premier compte restant (l'appelant doit
   * recharger la page), ou signale qu'il faut une déconnexion complète si
   * plus aucun compte ne reste.
   */
  async removeAccount(userId: string): Promise<StoredAccount | null> {
    const accounts = _readAll();
    const removed = accounts.find(a => a.user_id === userId);
    const remaining = accounts.filter(a => a.user_id !== userId);

    if (removed?.is_active) {
      if (remaining.length === 0) {
        _writeAll([]);
        await useAuthStore.getState().logout().catch(() => {});
        return null;
      }
      _writeAll(remaining);
      return accountsService.switchAccount(remaining[0].user_id);
    }

    _writeAll(remaining);
    return accountsService.getActiveAccount();
  },
};
