import { useEffect, useRef, useCallback, useState } from 'react';
import { WS_BASE_URL } from '../utils/constants';

const STORAGE_KEY   = 'gofolyx-auth-tokens';
const MAX_RETRIES   = 6;
const INITIAL_DELAY = 1_000;
const PING_INTERVAL = 25_000;

export type WsPayload =
  | { type: 'message'; id: string; sender_id: string; receiver_id: string; body: string; content?: string; message_type?: string; created_at: string; read: boolean }
  | { type: 'read';    partner_id: string }
  | { type: 'pong' }
  | { type: string; [key: string]: unknown };

function getToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access ?? parsed?.access_token ?? null;
  } catch {
    return null;
  }
}

export function useMessagesWebSocket(onMessage: (payload: WsPayload) => void) {
  const wsRef        = useRef<WebSocket | null>(null);
  const retryCount   = useRef(0);
  const retryTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimer    = useRef<ReturnType<typeof setInterval> | null>(null);
  const onMessageRef = useRef(onMessage);
  const isMounted    = useRef(true);

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  const connect = useCallback(() => {
    const token = getToken();
    if (!token) return;

    const base = WS_BASE_URL || window.location.origin.replace(/^http/, 'ws');
    const url  = `${base}/api/v1/messages/ws`;
    const ws   = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', token }));
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
        if (isMounted.current) onMessageRef.current(payload);
      } catch { /* ignorer */ }
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

      // Ignorer les fermetures propres (code 1000/1001)
      if (event.code === 1000 || event.code === 1001) return;

      if (retryCount.current < MAX_RETRIES) {
        const delay = INITIAL_DELAY * Math.pow(2, retryCount.current);
        retryCount.current++;
        retryTimer.current = setTimeout(connect, delay);
      }
    };
  }, []);

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

  const sendWsMessage = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  return { sendWsMessage, isConnected };
}
