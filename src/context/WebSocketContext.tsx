/**
 * Contexte WebSocket global — une seule connexion pour toute l'app.
 *
 * Events dispatches :
 *   feed_updated, story_added, concert_live, concert_ended
 *   live_started, live_ended, live_viewers_updated
 *   new_follower, coin_transfer_received, gift_received
 *   reaction_on_content, comment_on_content
 *   presence, activity, notification
 *   message, read (messages directs)
 */
import React, {
  createContext, useContext, useEffect, useRef,
  useCallback, useState, useMemo,
} from 'react';
import { WS_BASE_URL } from '../utils/constants';

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
export interface CoinTransferPayload  { coins_amount: number; note?: string; from_user_id: string; from_username: string; }
export interface GiftReceivedPayload  { coins_amount: number; gift_name: string; gift_emoji: string; reel_id?: string; from_user_id: string; from_username: string; }
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
  lastLiveViewersUpdated: LiveViewersPayload | null;
  lastConcertLive:      ConcertLivePayload | null;
  lastConcertEnded:     string | null;
  lastNewFollower:      NewFollowerPayload | null;
  lastStoryAdded:       StoryAddedPayload | null;
  lastReactionOnContent: ReactionPayload | null;
  lastCommentOnContent:  CommentPayload | null;
  lastCoinTransfer:     CoinTransferPayload | null;
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
  lastLiveViewersUpdated: null,
  lastConcertLive: null,
  lastConcertEnded: null,
  lastNewFollower: null,
  lastStoryAdded: null,
  lastReactionOnContent: null,
  lastCommentOnContent: null,
  lastCoinTransfer: null,
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

const STORAGE_KEY = 'folix-auth-tokens';
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
  const [lastLiveViewersUpdated, setLastLiveViewersUpdated] = useState<LiveViewersPayload | null>(null);
  const [lastConcertLive,      setLastConcertLive]      = useState<ConcertLivePayload | null>(null);
  const [lastConcertEnded,     setLastConcertEnded]     = useState<string | null>(null);
  const [lastNewFollower,      setLastNewFollower]      = useState<NewFollowerPayload | null>(null);
  const [lastStoryAdded,       setLastStoryAdded]       = useState<StoryAddedPayload | null>(null);
  const [lastReactionOnContent, setLastReactionOnContent] = useState<ReactionPayload | null>(null);
  const [lastCommentOnContent,  setLastCommentOnContent]  = useState<CommentPayload | null>(null);
  const [lastCoinTransfer,     setLastCoinTransfer]     = useState<CoinTransferPayload | null>(null);
  const [lastGiftReceived,     setLastGiftReceived]     = useState<GiftReceivedPayload | null>(null);
  const [lastPresenceUpdate,   setLastPresenceUpdate]   = useState<PresencePayload | null>(null);

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
      case 'live_started':
        setLastLiveStarted(payload as unknown as LiveStartedPayload);
        break;
      case 'live_ended':
        setLastLiveEnded((payload as any).live_id as string);
        break;
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
        setUnreadActivity(n => n + 1);
        break;
      case 'story_added':
        setLastStoryAdded(payload as unknown as StoryAddedPayload);
        break;
      case 'reaction_on_content':
        setLastReactionOnContent(payload as unknown as ReactionPayload);
        setUnreadActivity(n => n + 1);
        break;
      case 'comment_on_content':
        setLastCommentOnContent(payload as unknown as CommentPayload);
        setUnreadActivity(n => n + 1);
        break;
      case 'coin_transfer_received':
        setLastCoinTransfer(payload as unknown as CoinTransferPayload);
        setUnreadNotifications(n => n + 1);
        break;
      case 'gift_received':
        setLastGiftReceived(payload as unknown as GiftReceivedPayload);
        setUnreadNotifications(n => n + 1);
        break;
      case 'presence':
        setLastPresenceUpdate(payload as unknown as PresencePayload);
        break;
      case 'activity':
        setUnreadActivity(n => n + 1);
        break;
      case 'notification':
        setUnreadNotifications(n => n + 1);
        break;
    }
  }, []);

  const connect = useCallback(() => {
    const token = getToken();
    if (!token) return;

    const base = WS_BASE_URL || window.location.origin.replace(/^http/, 'ws');
    const url  = `${base}/api/v1/messages/ws?token=${encodeURIComponent(token)}`;
    const ws   = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) return;
      retryCount.current = 0;
      setIsConnected(true);
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

      if (event.code === 4001) {
        retryTimer.current = setTimeout(connect, 3_000);
        return;
      }
      if (event.code === 1000 || event.code === 1001) return;

      if (retryCount.current < MAX_RETRIES) {
        const delay = INITIAL_DELAY * Math.pow(2, retryCount.current);
        retryCount.current++;
        retryTimer.current = setTimeout(connect, delay);
      }
    };
  }, [dispatch]);

  useEffect(() => {
    isMounted.current = true;
    connect();
    return () => {
      isMounted.current = false;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (pingTimer.current)  clearInterval(pingTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

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
    lastLiveViewersUpdated,
    lastConcertLive,
    lastConcertEnded,
    lastNewFollower,
    lastStoryAdded,
    lastReactionOnContent,
    lastCommentOnContent,
    lastCoinTransfer,
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
    lastLiveStarted, lastLiveEnded, lastLiveViewersUpdated,
    lastConcertLive, lastConcertEnded,
    lastNewFollower, lastStoryAdded,
    lastReactionOnContent, lastCommentOnContent,
    lastCoinTransfer, lastGiftReceived, lastPresenceUpdate,
    unreadMessages, unreadActivity, unreadNotifications,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useWs = () => useContext(Ctx);
