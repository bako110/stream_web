/**
 * Contexte WebSocket global — une seule connexion pour toute l'app.
 *
 * Events dispatches :
 *   feed_updated, story_added, concert_live, concert_ended
 *   live_started, live_ended, live_viewers_updated
 *   new_follower, gogold_transfer_received, gift_received
 *   reaction_on_content, comment_on_content
 *   presence, activity, notification
 *   message, read (messages directs)
 */
import React, {
  createContext, useContext, useEffect, useRef,
  useCallback, useState, useMemo,
} from 'react';
import { WS_BASE_URL } from '../utils/constants';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';

// ── Types payloads ────────────────────────────────────────────────────────────

export type WsPayload = { type: string; [key: string]: unknown };

export interface LiveStream {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  status: string;
  current_viewers: number;
  peak_viewers: number;
  is_featured: boolean;
  started_at: string;
  ended_at?: string | null;
  user?: { id: string; username?: string | null; display_name?: string | null; avatar_url?: string | null } | null;
}

export interface ConcertLivePayload   { concert_id: string; title: string; artist_id: string; }
export interface LiveStartedPayload   { live: LiveStream; }
export interface LiveViewersPayload   { live_id: string; current_viewers: number; }
export interface NewFollowerPayload   { from_user_id: string; from_username: string; from_display_name?: string; from_avatar?: string; }
export interface StoryAddedPayload    { user_id: string; username: string; display_name?: string; avatar_url?: string; }
export interface ReactionPayload      { action: string; target_type: string; target_id: string; reaction_type: string; from_user_id: string; from_username: string; }
export interface CommentPayload       { target_type: string; target_id: string; comment: unknown; from_user_id: string; from_username: string; }
export interface GoGoldTransferPayload  { gogold_amount: number; note?: string; from_user_id: string; from_username: string; }
export interface GiftReceivedPayload  { gogold_amount: number; gift_name: string; gift_emoji: string; reel_id?: string; from_user_id: string; from_username: string; }
export interface PresencePayload      { user_id: string; is_online: boolean; last_seen_at?: string; }

// ── Valeur du contexte ────────────────────────────────────────────────────────

interface WsContextValue {
  isConnected:          boolean;
  sendMessage:          (payload: object) => void;
  addListener:          (fn: (p: WsPayload) => void) => void;
  removeListener:       (fn: (p: WsPayload) => void) => void;
  // Events spécialisés (state React — déclenche re-render)
  lastLiveStarted:      LiveStartedPayload | null;
  lastLiveEnded:        string | null;
  liveUserIds:          Set<string>;
  /** user_id → live_id — permet de naviguer directement vers le live d'un utilisateur en direct. */
  liveIdByUserId:       Map<string, string>;
  lastLiveViewersUpdated: LiveViewersPayload | null;
  lastConcertLive:      ConcertLivePayload | null;
  lastConcertEnded:     string | null;
  lastNewFollower:      NewFollowerPayload | null;
  lastStoryAdded:       StoryAddedPayload | null;
  lastReactionOnContent: ReactionPayload | null;
  lastCommentOnContent:  CommentPayload | null;
  lastGoGoldTransfer:     GoGoldTransferPayload | null;
  lastGiftReceived:     GiftReceivedPayload | null;
  lastPresenceUpdate:   PresencePayload | null;
  unreadMessages:       number;
  unreadActivity:       number;
  unreadNotifications:  number;
  clearUnreadMessages:      () => void;
  clearUnreadActivity:      () => void;
  clearUnreadNotifications: () => void;
}

const Ctx = createContext<WsContextValue>({
  isConnected: false,
  sendMessage: () => {},
  addListener: () => {},
  removeListener: () => {},
  lastLiveStarted: null,
  lastLiveEnded: null,
  liveUserIds: new Set(),
  liveIdByUserId: new Map(),
  lastLiveViewersUpdated: null,
  lastConcertLive: null,
  lastConcertEnded: null,
  lastNewFollower: null,
  lastStoryAdded: null,
  lastReactionOnContent: null,
  lastCommentOnContent: null,
  lastGoGoldTransfer: null,
  lastGiftReceived: null,
  lastPresenceUpdate: null,
  unreadMessages: 0,
  unreadActivity: 0,
  unreadNotifications: 0,
  clearUnreadMessages: () => {},
  clearUnreadActivity: () => {},
  clearUnreadNotifications: () => {},
});

// ── Helpers token ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'gofolyx-auth-tokens';
const MAX_RETRIES   = 6;
const INITIAL_DELAY = 1_000;
const PING_INTERVAL = 25_000;

function getToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access ?? parsed?.access_token ?? null;
  } catch { return null; }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  const wsRef        = useRef<WebSocket | null>(null);
  const retryCount   = useRef(0);
  const retryTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimer    = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted    = useRef(true);
  const listeners    = useRef<Set<(p: WsPayload) => void>>(new Set());

  const [isConnected,          setIsConnected]          = useState(false);
  const [unreadMessages,       setUnreadMessages]       = useState(0);
  const [unreadActivity,       setUnreadActivity]       = useState(0);
  const [unreadNotifications,  setUnreadNotifications]  = useState(0);
  const [lastLiveStarted,      setLastLiveStarted]      = useState<LiveStartedPayload | null>(null);
  const [lastLiveEnded,        setLastLiveEnded]        = useState<string | null>(null);
  // IDs des utilisateurs actuellement en live — alimente l'anneau "Live" sur les avatars
  // partout dans l'app, mis à jour en temps réel sans recharger la page.
  const [liveUserIds,          setLiveUserIds]          = useState<Set<string>>(new Set());
  const [liveIdByUserId,       setLiveIdByUserId]       = useState<Map<string, string>>(new Map());
  const [lastLiveViewersUpdated, setLastLiveViewersUpdated] = useState<LiveViewersPayload | null>(null);
  const [lastConcertLive,      setLastConcertLive]      = useState<ConcertLivePayload | null>(null);
  const [lastConcertEnded,     setLastConcertEnded]     = useState<string | null>(null);
  const [lastNewFollower,      setLastNewFollower]      = useState<NewFollowerPayload | null>(null);
  const [lastStoryAdded,       setLastStoryAdded]       = useState<StoryAddedPayload | null>(null);
  const [lastReactionOnContent, setLastReactionOnContent] = useState<ReactionPayload | null>(null);
  const [lastCommentOnContent,  setLastCommentOnContent]  = useState<CommentPayload | null>(null);
  const [lastGoGoldTransfer,     setLastGoGoldTransfer]     = useState<GoGoldTransferPayload | null>(null);
  const [lastGiftReceived,     setLastGiftReceived]     = useState<GiftReceivedPayload | null>(null);
  const [lastPresenceUpdate,   setLastPresenceUpdate]   = useState<PresencePayload | null>(null);

  const connectRef     = useRef<((token: string) => void) | null>(null);
  const addListener    = useCallback((fn: (p: WsPayload) => void) => { listeners.current.add(fn); }, []);
  const removeListener = useCallback((fn: (p: WsPayload) => void) => { listeners.current.delete(fn); }, []);

  const dispatch = useCallback((payload: WsPayload) => {
    // Dispatcher vers tous les listeners generiques
    listeners.current.forEach(fn => { try { fn(payload); } catch {} });

    // Router vers les states specifiques
    switch (payload.type) {
      case 'message':
        setUnreadMessages(n => n + 1);
        break;
      case 'live_started': {
        const started = payload as unknown as LiveStartedPayload;
        setLastLiveStarted(started);
        const uid = started.live?.user_id;
        const lid = started.live?.id;
        if (uid) setLiveUserIds(prev => { const next = new Set(prev); next.add(uid); return next; });
        if (uid && lid) setLiveIdByUserId(prev => { const next = new Map(prev); next.set(uid, lid); return next; });
        break;
      }
      case 'live_ended': {
        const liveId = (payload as any).live_id as string;
        const endedUid = (payload as any).user_id as string | undefined;
        setLastLiveEnded(liveId);
        if (endedUid) setLiveUserIds(prev => { const next = new Set(prev); next.delete(endedUid); return next; });
        if (endedUid) setLiveIdByUserId(prev => { const next = new Map(prev); next.delete(endedUid); return next; });
        break;
      }
      case 'live_viewers_updated':
        setLastLiveViewersUpdated(payload as unknown as LiveViewersPayload);
        break;
      case 'concert_live':
        setLastConcertLive(payload as unknown as ConcertLivePayload);
        break;
      case 'concert_ended':
        setLastConcertEnded((payload as any).concert_id as string);
        break;
      case 'new_follower':
        setLastNewFollower(payload as unknown as NewFollowerPayload);
        break;
      case 'story_added':
        setLastStoryAdded(payload as unknown as StoryAddedPayload);
        break;
      case 'reaction_on_content':
        setLastReactionOnContent(payload as unknown as ReactionPayload);
        break;
      case 'comment_on_content':
        setLastCommentOnContent(payload as unknown as CommentPayload);
        break;
      case 'gogold_transfer_received':
        setLastGoGoldTransfer(payload as unknown as GoGoldTransferPayload);
        break;
      case 'gift_received':
        setLastGiftReceived(payload as unknown as GiftReceivedPayload);
        break;
      case 'presence':
        setLastPresenceUpdate(payload as unknown as PresencePayload);
        break;
      // NOTE: l'incrément de unreadActivity/unreadNotifications pour un même événement
      // (like, commentaire, follow, cadeau...) est géré exclusivement ici, sur les types
      // génériques 'activity'/'notification' envoyés en parallèle par le backend — pas sur
      // les events bruts ci-dessus (comment_on_content, reaction_on_content, new_follower,
      // gift_received...), qui ne servent qu'à la mise à jour UI en direct. Sinon un seul
      // événement métier compte double (même pattern que stream_mobile).
      case 'activity':
        setUnreadActivity(n => n + 1);
        break;
      case 'notification':
        setUnreadNotifications(n => n + 1);
        break;
    }
  }, []);

  // Charge le nombre réel de non-lus (messages + notifications) — appelé à la connexion,
  // car les compteurs en state ne sont sinon incrémentés que par les events WS en direct
  // (donc restaient à 0 pour les non-lus déjà existants avant l'ouverture de l'app).
  const refreshUnread = useCallback(() => {
    apiClient.get<{ unread_count: number }>(Endpoints.messages.unreadCount)
      .then(r => { if (isMounted.current) setUnreadMessages(r.data.unread_count); })
      .catch(() => {});
    apiClient.get<{ unread_count: number }>(Endpoints.notifications.unreadCount)
      .then(r => { if (isMounted.current) setUnreadNotifications(r.data.unread_count); })
      .catch(() => {});
    // Lives déjà actifs au moment de la connexion — sinon liveUserIds resterait vide
    // jusqu'au prochain live_started reçu en direct pendant la session.
    apiClient.get<LiveStream[]>(Endpoints.lives.list)
      .then(r => {
        if (!isMounted.current) return;
        const lives = r.data ?? [];
        setLiveUserIds(new Set(lives.map(l => l.user_id)));
        setLiveIdByUserId(new Map(lives.map(l => [l.user_id, l.id])));
      })
      .catch(() => {});
  }, []);
  const refreshUnreadRef = useRef(refreshUnread);
  useEffect(() => { refreshUnreadRef.current = refreshUnread; }, [refreshUnread]);

  const connect = useCallback((token: string) => {
    const base = WS_BASE_URL || window.location.origin.replace(/^http/, 'ws');
    const url  = `${base}/api/v1/messages/ws?token=${encodeURIComponent(token)}`;
    const ws   = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) return;
      retryCount.current = 0;
      setIsConnected(true);
      refreshUnreadRef.current();
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
      }, PING_INTERVAL);
    };

    ws.onmessage = (event) => {
      try {
        const payload: WsPayload = JSON.parse(event.data as string);
        if (payload.type === 'pong') return;
        if (isMounted.current) dispatch(payload);
      } catch {}
    };

    ws.onerror = () => {};

    ws.onclose = (event) => {
      wsRef.current = null;
      if (pingTimer.current) { clearInterval(pingTimer.current); pingTimer.current = null; }
      if (!isMounted.current) return;
      setIsConnected(false);

      const currentToken = getToken();
      if (!currentToken) return;

      if (event.code === 4001) {
        retryTimer.current = setTimeout(() => connectRef.current?.(currentToken), 3_000);
        return;
      }
      if (event.code === 1000 || event.code === 1001) return;

      if (retryCount.current < MAX_RETRIES) {
        const delay = INITIAL_DELAY * Math.pow(2, retryCount.current);
        retryCount.current++;
        retryTimer.current = setTimeout(() => connectRef.current?.(currentToken), delay);
      }
    };
  }, [dispatch]);

  // Garder connectRef toujours a jour
  useEffect(() => { connectRef.current = connect; }, [connect]);

  useEffect(() => {
    isMounted.current = true;
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }

    const token = getToken();

    if (!isAuthenticated || !token) {
      if (wsRef.current) {
        wsRef.current.close(1000);
        wsRef.current = null;
      }
      retryCount.current = 0;
      return;
    }

    // Authentifié — connecter seulement si pas déjà connecté
    if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
      retryCount.current = 0;
      connect(token);
    }

    return () => {
      isMounted.current = false;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (pingTimer.current)  clearInterval(pingTimer.current);
      wsRef.current?.close();
    };
  }, [isAuthenticated, connect]);

  const sendMessage = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const value = useMemo(() => ({
    isConnected,
    sendMessage,
    addListener,
    removeListener,
    lastLiveStarted,
    lastLiveEnded,
    liveUserIds,
    liveIdByUserId,
    lastLiveViewersUpdated,
    lastConcertLive,
    lastConcertEnded,
    lastNewFollower,
    lastStoryAdded,
    lastReactionOnContent,
    lastCommentOnContent,
    lastGoGoldTransfer,
    lastGiftReceived,
    lastPresenceUpdate,
    unreadMessages,
    unreadActivity,
    unreadNotifications,
    clearUnreadMessages:      () => setUnreadMessages(0),
    clearUnreadActivity:      () => setUnreadActivity(0),
    clearUnreadNotifications: () => setUnreadNotifications(0),
  }), [
    isConnected, sendMessage, addListener, removeListener,
    lastLiveStarted, lastLiveEnded, liveUserIds, liveIdByUserId, lastLiveViewersUpdated,
    lastConcertLive, lastConcertEnded,
    lastNewFollower, lastStoryAdded,
    lastReactionOnContent, lastCommentOnContent,
    lastGoGoldTransfer, lastGiftReceived, lastPresenceUpdate,
    unreadMessages, unreadActivity, unreadNotifications,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useWs = () => useContext(Ctx);
