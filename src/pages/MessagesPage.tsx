import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, MessageCircle, X, Edit3, Search, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import type { Conversation, Message, UserPublic } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { useAuthStore } from '../store/authStore';
import { useMessagesWebSocket } from '../hooks/useMessagesWebSocket';
import type { WsPayload } from '../hooks/useMessagesWebSocket';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface ConvoListHandle {
  updatePreview: (senderId: string, preview: string) => void;
}

function norm<T>(raw: unknown): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  const o = raw as any;
  for (const k of ['items', 'results', 'data', 'messages', 'conversations']) {
    if (Array.isArray(o[k])) return o[k] as T[];
  }
  return [];
}

// ── New conversation modal ─────────────────────────────────────────────────────

function NewConversationModal({ onClose, onSelect }: {
  onClose: () => void; onSelect: (userId: string) => void;
}) {
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState<UserPublic[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiClient.get<unknown>(
          `${Endpoints.search.query}?q=${encodeURIComponent(query.trim())}&limit=15`
        );
        const raw = res.data as any;
        setResults(Array.isArray(raw?.users) ? raw.users : norm<UserPublic>(raw));
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col w-[calc(100vw-2rem)] max-w-md"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1.25rem',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)', maxHeight: '70vh' }}>
        <div className="flex items-center gap-3 px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-bold text-base flex-1" style={{ color: 'var(--text-primary)' }}>Nouvelle conversation</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl" style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <X size={17} />
          </button>
        </div>
        <div className="px-4 py-3 shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher un utilisateur…" className="input pl-9 text-sm" />
            {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner size="sm" /></div>}
          </div>
        </div>
        <div className="overflow-y-auto flex-1 pb-3">
          {!query.trim() ? (
            <div className="text-center py-8">
              <Search size={26} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Tapez un nom ou @username</p>
            </div>
          ) : results.length === 0 && !searching ? (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--text-tertiary)' }}>Aucun utilisateur trouvé</p>
          ) : results.map(u => (
            <button key={u.id} onClick={() => { onSelect(u.id); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <Avatar src={u.avatar_url} name={u.display_name ?? u.username ?? '?'} size="sm" verified={u.is_verified} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{u.display_name ?? u.username}</p>
                {u.username && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>@{u.username}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Conversation list ──────────────────────────────────────────────────────────

const ConversationList = forwardRef<ConvoListHandle, {
  selected?: string;
  onSelect: (id: string) => void;
}>(function ConversationList({ selected, onSelect }, ref) {
  const [convos,  setConvos]  = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await apiClient.get<unknown>(Endpoints.messages.conversations);
      const raw = norm<any>(res.data);
      const list = raw
        .filter((c: any) => c?.partner_id ?? c?.user?.id)
        .map((c: any) => ({ ...c, user: c.user ?? c.partner }));
      setConvos(list);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updatePreview = useCallback((senderId: string, preview: string) => {
    setConvos(prev => {
      const idx = prev.findIndex(c => c.user.id === senderId);
      if (idx === -1) { load(false); return prev; }
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        last_message: preview,
        unread_count: senderId !== selected ? (updated[idx].unread_count ?? 0) + 1 : 0,
      };
      updated.unshift(...updated.splice(idx, 1));
      return updated;
    });
  }, [selected, load]);

  useImperativeHandle(ref, () => ({ updatePreview }), [updatePreview]);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  if (error) return (
    <div className="flex flex-col items-center justify-center py-16 px-4 gap-3">
      <MessageCircle size={28} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
      <p className="text-sm text-center" style={{ color: 'var(--text-tertiary)' }}>Impossible de charger</p>
      <button onClick={() => load()} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
        <RefreshCw size={11} /> Réessayer
      </button>
    </div>
  );

  if (convos.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 px-4 gap-3">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
        <MessageCircle size={22} style={{ color: 'var(--text-tertiary)' }} />
      </div>
      <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Aucune conversation</p>
      <p className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>Démarrez une discussion ✏️</p>
    </div>
  );

  return (
    <div className="overflow-y-auto flex-1">
      {convos.map(c => (
        <button key={c.user.id} onClick={() => onSelect(c.user.id)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
          style={{ background: selected === c.user.id ? 'var(--bg-secondary)' : 'transparent', borderBottom: '1px solid var(--border)' }}
          onMouseEnter={e => { if (selected !== c.user.id) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
          onMouseLeave={e => { if (selected !== c.user.id) e.currentTarget.style.background = 'transparent'; }}>
          <div className="relative shrink-0">
            <Avatar src={c.user.avatar_url} name={c.user.display_name ?? c.user.username ?? '?'} size="md" />
            {c.user.is_online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                style={{ background: '#22c55e', borderColor: 'var(--bg)' }} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
              {c.user.display_name ?? c.user.username}
            </p>
            {c.last_message && (
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>{c.last_message}</p>
            )}
          </div>
          {(c.unread_count ?? 0) > 0 && (
            <span className="shrink-0 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
              {c.unread_count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
});

// ── Chat window ────────────────────────────────────────────────────────────────

function ChatWindow({ userId, wsPayload, isWsConnected, onSendWs, onMessageSent }: {
  userId: string;
  wsPayload: WsPayload | null;
  isWsConnected: boolean;
  onSendWs: (payload: object) => void;
  onMessageSent: (preview: string) => void;
}) {
  const { user: me }            = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [peer,     setPeer]     = useState<UserPublic | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const loadMessages = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await apiClient.get<unknown>(Endpoints.messages.conversation(userId));
      // API retourne `content` au lieu de `body` — normaliser
      const msgs = norm<Message>(res.data).map((m: any) => ({
        ...m, body: m.body ?? m.content ?? '',
      }));
      setMessages(msgs);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setMessages([]);
    setError(null);
    setPeer(null);
    loadMessages(true);

    apiClient.get<unknown>(Endpoints.users.publicProfile(userId))
      .then(r => { const raw = r.data as any; setPeer(raw?.user ?? raw); })
      .catch(() => {});

    // Marquer lu — PUT uniquement (POST retourne 405)
    apiClient.put(Endpoints.messages.markRead(userId)).catch(() => {});
  }, [userId, loadMessages]);

  // Traiter les événements WebSocket entrants
  useEffect(() => {
    if (!wsPayload) return;

    if (wsPayload.type === 'message') {
      const msg = wsPayload as any;
      const partnerId = msg.sender_id === me?.id ? msg.receiver_id : msg.sender_id;
      if (partnerId !== userId && msg.sender_id !== me?.id) return;
      // Dédupliquer
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, { ...msg, body: msg.body ?? msg.content ?? '' }];
      });
      // Marquer lu si c'est un message entrant
      if (msg.sender_id !== me?.id) {
        apiClient.post(Endpoints.messages.markRead(userId)).catch(() => {});
      }
    }

    if (wsPayload.type === 'read') {
      // L'autre a lu nos messages
      setMessages(prev => prev.map(m => m.sender_id === me?.id ? { ...m, read: true } : m));
    }
  }, [wsPayload, userId, me?.id]);

  // Scroll automatique en bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || sending) return;
    const body = input.trim();
    setInput('');
    setSending(true);

    // Message optimiste
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId, sender_id: me?.id ?? '', receiver_id: userId,
      body, created_at: new Date().toISOString(), read: false,
    } as any;
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await apiClient.post<unknown>(
        Endpoints.messages.conversation(userId), { body }
      );
      const raw = res.data as any;
      const msg: Message = raw?.id ? raw : (raw?.message ?? raw?.data);
      if (msg?.id) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...msg, body: msg.body ?? body } : m));
      } else {
        await loadMessages(false);
      }
      onMessageSent(body);
    } catch {
      // Retirer le message optimiste en cas d'erreur
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        {peer ? (
          <>
            <div className="relative">
              <Avatar src={peer.avatar_url} name={peer.display_name ?? peer.username ?? '?'} size="sm" verified={peer.is_verified} />
              {peer.is_online && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                  style={{ background: '#22c55e', borderColor: 'var(--surface)' }} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                {peer.display_name ?? peer.username}
              </p>
              <p className="text-xs" style={{ color: peer.is_online ? '#22c55e' : 'var(--text-tertiary)' }}>
                {peer.is_online ? 'En ligne' : `@${peer.username}`}
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
            <div className="h-3 w-28 rounded-full animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
          </div>
        )}
        {/* Indicateur WS */}
        <div title={isWsConnected ? 'Connecté en temps réel' : 'Reconnexion…'}>
          {isWsConnected
            ? <Wifi size={14} style={{ color: '#22c55e' }} />
            : <WifiOff size={14} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
          }
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-sm text-center" style={{ color: 'var(--text-tertiary)' }}>
              Impossible de charger les messages
            </p>
            <button onClick={() => loadMessages(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              <RefreshCw size={11} /> Réessayer
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-60">
            <MessageCircle size={30} style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Démarrez la conversation</p>
          </div>
        ) : messages.map(msg => {
          const isMe = msg.sender_id === me?.id;
          const isTemp = msg.id?.startsWith('temp-');
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[72%] px-3.5 py-2.5 rounded-2xl text-sm transition-opacity"
                style={{
                  background: isMe ? 'linear-gradient(135deg,#7B3FF2,#E0389A)' : 'var(--bg-secondary)',
                  color: isMe ? '#fff' : 'var(--text-primary)',
                  borderBottomRightRadius: isMe ? 4 : undefined,
                  borderBottomLeftRadius:  isMe ? undefined : 4,
                  boxShadow: isMe ? '0 4px 16px rgba(123,63,242,0.25)' : 'none',
                  opacity: isTemp ? 0.6 : 1,
                }}>
                <p className="leading-relaxed">{(msg as any).body ?? (msg as any).content}</p>
                <p className="text-[10px] mt-1 opacity-60 text-right">
                  {isTemp ? 'Envoi…' : formatDistanceToNow(new Date(msg.created_at), { locale: fr, addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 p-3 flex gap-2 items-center"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <input ref={inputRef}
          className="input flex-1 text-sm"
          placeholder="Écrire un message…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
        />
        <button onClick={sendMessage} disabled={!input.trim() || sending}
          className="btn-primary p-2.5 shrink-0 aspect-square">
          {sending ? <Spinner size="sm" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const navigate   = useNavigate();
  const { userId } = useParams<{ userId?: string }>();
  const [selectedId,    setSelectedId]    = useState<string | undefined>(userId);
  const [showNewConvo,  setShowNewConvo]  = useState(false);
  const [lastWsPayload, setLastWsPayload] = useState<WsPayload | null>(null);
  const convoListRef = useRef<ConvoListHandle>(null);

  const { user: me } = useAuthStore();

  const handleWsMessage = useCallback((payload: WsPayload) => {
    if (payload.type === 'pong') return;
    setLastWsPayload(payload);

    if (payload.type === 'message') {
      const msg = payload as any;
      const partnerId = msg.sender_id === me?.id ? msg.receiver_id : msg.sender_id;
      const preview = msg.body ?? msg.content ?? '';
      convoListRef.current?.updatePreview(partnerId, preview);
    }
  }, [me?.id]);

  const { sendWsMessage, isConnected } = useMessagesWebSocket(handleWsMessage);

  function handleSelect(id: string) {
    setSelectedId(id);
    navigate(`/messages/${id}`, { replace: true });
  }

  return (
    <div className="flex h-full">
      {showNewConvo && (
        <NewConversationModal onClose={() => setShowNewConvo(false)} onSelect={handleSelect} />
      )}

      {/* Liste */}
      <div className={`flex flex-col shrink-0 ${selectedId ? 'hidden lg:flex' : 'flex w-full'} lg:w-80`}
        style={{ borderRight: '1px solid var(--border)', background: 'var(--bg)' }}>
        <div className="flex items-center justify-between px-4 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-black text-base" style={{ color: 'var(--text-primary)' }}>Messages</h2>
          <button onClick={() => setShowNewConvo(true)}
            className="p-2 rounded-xl transition-all" title="Nouvelle conversation"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
            <Edit3 size={16} />
          </button>
        </div>
        <ConversationList
          ref={convoListRef}
          selected={selectedId}
          onSelect={handleSelect}
        />
      </div>

      {/* Chat */}
      <div className={`flex-1 flex flex-col min-w-0 ${!selectedId ? 'hidden lg:flex' : 'flex'}`}
        style={{ background: 'var(--bg)' }}>
        {selectedId ? (
          <>
            <button
              onClick={() => { setSelectedId(undefined); navigate('/messages', { replace: true }); }}
              className="flex items-center gap-2 text-sm px-4 py-3 shrink-0 lg:hidden transition-all"
              style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
              <ArrowLeft size={16} /> Retour
            </button>
            <ChatWindow
              key={selectedId}
              userId={selectedId}
              wsPayload={lastWsPayload}
              isWsConnected={isConnected}
              onSendWs={sendWsMessage}
              onMessageSent={(preview) => {
                convoListRef.current?.updatePreview(selectedId, preview);
              }}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-50">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--bg-secondary)' }}>
              <MessageCircle size={28} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Sélectionnez une conversation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
