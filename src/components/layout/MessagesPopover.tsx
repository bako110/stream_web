import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X, Search, SquarePen, Send, ArrowLeft, MessageCircle,
  Check, CheckCheck, Reply, Smile, Mic, ImageIcon,
  RefreshCw, Wifi, WifiOff, Paperclip, Pin, Trash,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Spinner, PageLoader } from '../ui/Spinner';
import { Lightbox } from '../ui/Lightbox';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { useWs } from '../../context/WebSocketContext';
import type { WsPayload } from '../../context/WebSocketContext';
import { encodeId } from '../../utils/slugId';
import type { Conversation, ConversationRequestStatus, UserPublic } from '../../types';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { getApiErrorDetail } from '../../utils/apiError';

// ── Helpers ───────────────────────────────────────────────────────────────────

function norm<T>(raw: unknown): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  const o = raw as any;
  for (const k of ['items', 'results', 'data', 'messages', 'conversations']) {
    if (Array.isArray(o[k])) return o[k] as T[];
  }
  return [];
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (isToday(d))     return format(d, 'HH:mm', { locale: fr });
  if (isYesterday(d)) return 'Hier';
  return format(d, 'd MMM', { locale: fr });
}

function fmtLastSeen(iso?: string | null): string {
  if (!iso) return 'Hors ligne';
  return `Vu ${formatDistanceToNow(new Date(iso), { locale: fr, addSuffix: true })}`;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

// Reconstruit l'URL de navigation d'un contenu partagé (message type=share) —
// même mapping que ShareModal.tsx pour les URLs de partage externe.
function sharedContentUrl(shareType: string, shareId: string): string {
  const path = shareType === 'concert' ? 'concerts'
    : shareType === 'event'   ? 'events'
    : shareType === 'reel'    ? 'reels'
    : shareType === 'content' ? 'films'
    : 'posts';
  return shareType === 'reel' ? `/reels?id=${encodeId(shareId)}` : `/${path}/${encodeId(shareId)}`;
}

// ── Types locaux ──────────────────────────────────────────────────────────────

interface ExtMsg {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
  read?: boolean;
  deleted?: boolean;
  pinned?: boolean;
  edited_at?: string | null;
  reaction?: string | null;
  message_type?: string;
  attachment_url?: string;
  attachment_meta?: Record<string, any>;
  reply_to?: { id: string; content: string; sender_id: string } | null;
}

// ── MiniChatWindow ────────────────────────────────────────────────────────────

function MiniChatWindow({
  userId, wsPayload, isWsConnected, onBack, onMessageSent,
}: {
  userId: string;
  wsPayload: WsPayload | null;
  isWsConnected: boolean;
  onBack: () => void;
  onMessageSent: (preview: string) => void;
}) {
  const navigate = useNavigate();
  const { user: me } = useAuthStore();
  const [messages, setMessages] = useState<ExtMsg[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [peer,     setPeer]     = useState<UserPublic | null>(null);
  const [requestStatus, setRequestStatus] = useState<ConversationRequestStatus>('none');
  const [requestActionLoading, setRequestActionLoading] = useState(false);
  const [replyTo,  setReplyTo]  = useState<ExtMsg | null>(null);
  const [uploading,setUploading]= useState(false);
  const [emojiFor, setEmojiFor] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  // Pagination — les messages plus anciens se chargent en scrollant vers le
  // HAUT (contrairement aux autres listes de l'app qui chargent vers le bas),
  // puisque les plus récents sont affichés en bas comme dans toute messagerie.
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const listRef      = useRef<HTMLDivElement>(null);
  const sentinelRef  = useRef<HTMLDivElement>(null);
  const skipNextAutoScroll = useRef(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  const loadMessages = useCallback(async (spinner = true) => {
    if (spinner) setLoading(true);
    try {
      const res = await apiClient.get<unknown>(`${Endpoints.messages.conversation(userId)}?page=1&limit=30`);
      const msgs = norm<any>(res.data)
        .map((m: any) => ({ ...m, body: m.body ?? m.content ?? '' }))
        .reverse();
      setMessages(msgs);
      setPage(1);
      setHasMore(msgs.length === 30);
      setError(null);
    } catch (e: any) { setError(e?.message ?? 'Erreur'); }
    finally { setLoading(false); }
  }, [userId]);

  const loadOlderMessages = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const el = listRef.current;
    const prevScrollHeight = el?.scrollHeight ?? 0;
    try {
      const res = await apiClient.get<unknown>(`${Endpoints.messages.conversation(userId)}?page=${nextPage}&limit=30`);
      const older = norm<any>(res.data)
        .map((m: any) => ({ ...m, body: m.body ?? m.content ?? '' }))
        .reverse();
      skipNextAutoScroll.current = true;
      setMessages(prev => [...older, ...prev]);
      setHasMore(older.length === 30);
      setPage(nextPage);
      // Préserve la position de lecture — sans ça, ajouter des messages en
      // haut de la liste fait "sauter" visuellement le contenu déjà lu.
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevScrollHeight;
      });
    } catch { setHasMore(false); }
    finally { setLoadingMore(false); }
  }, [userId, page, hasMore, loadingMore]);

  // Scroll infini vers le haut via IntersectionObserver sur un sentinel en
  // tête de liste.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || !hasMore) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadOlderMessages(); },
      { root: listRef.current, rootMargin: '80px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loading, hasMore, loadOlderMessages]);

  useEffect(() => {
    setMessages([]); setPeer(null); setReplyTo(null); setInput(''); setRequestStatus('none');
    loadMessages(true);
    apiClient.get<unknown>(Endpoints.users.publicProfile(userId))
      .then(r => { const raw = r.data as any; setPeer(raw?.user ?? raw); })
      .catch(() => {});
    apiClient.put(Endpoints.messages.markRead(userId)).catch(() => {});
    apiClient.get<{ status: ConversationRequestStatus }>(Endpoints.messages.requestStatus(userId))
      .then(r => setRequestStatus(r.data.status))
      .catch(() => {});
  }, [userId, loadMessages]);

  // WS
  useEffect(() => {
    if (!wsPayload) return;
    if (wsPayload.type === 'message') {
      const msg = wsPayload as any;
      const partnerId = msg.sender_id === me?.id ? msg.receiver_id : msg.sender_id;
      if (partnerId !== userId && msg.sender_id !== me?.id) return;
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, { ...msg, body: msg.body ?? msg.content ?? '' }];
      });
      if (msg.sender_id !== me?.id) apiClient.put(Endpoints.messages.markRead(userId)).catch(() => {});
    }
    if (wsPayload.type === 'read')
      setMessages(prev => prev.map(m => m.sender_id === me?.id ? { ...m, read: true } : m));
    if (wsPayload.type === 'message_deleted') {
      const w = wsPayload as any;
      setMessages(prev => prev.map(m => m.id === w.message_id ? { ...m, deleted: true } : m));
    }
    if (wsPayload.type === 'message_edited') {
      const w = wsPayload as any;
      setMessages(prev => prev.map(m => m.id === w.message_id ? { ...m, body: w.content, edited_at: w.edited_at } : m));
    }
    if (wsPayload.type === 'reaction') {
      const w = wsPayload as any;
      setMessages(prev => prev.map(m => m.id === w.message_id ? { ...m, reaction: w.emoji } : m));
    }
    if (wsPayload.type === 'conversation_accepted' && (wsPayload as any).user_id === userId) {
      setRequestStatus('accepted');
    }
    if (wsPayload.type === 'conversation_blocked' && (wsPayload as any).user_id === userId) {
      setRequestStatus('blocked');
    }
  }, [wsPayload, userId, me?.id]);

  // Ne scrolle vers le bas que pour un nouveau message — jamais quand on
  // vient de charger des messages plus anciens en tête de liste (déjà géré
  // par loadOlderMessages qui préserve la position de lecture).
  useEffect(() => {
    if (skipNextAutoScroll.current) { skipNextAutoScroll.current = false; return; }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || sending) return;
    const body = input.trim();
    setInput(''); setSending(true);
    const tempId = `temp-${Date.now()}`;
    const temp: ExtMsg = {
      id: tempId, sender_id: me?.id ?? '', receiver_id: userId,
      body, created_at: new Date().toISOString(),
      reply_to: replyTo ? { id: replyTo.id, content: replyTo.body, sender_id: replyTo.sender_id } : null,
    };
    setMessages(prev => [...prev, temp]);
    setReplyTo(null);
    try {
      const payload: any = { content: body, message_type: 'text' };
      if (temp.reply_to) payload.reply_to_id = temp.reply_to.id;
      const res = await apiClient.post<unknown>(Endpoints.messages.conversation(userId), payload);
      const raw = res.data as any;
      const msg = raw?.id ? raw : (raw?.message ?? raw?.data);
      if (msg?.id) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...msg, body: msg.body ?? msg.content ?? body } : m));
      } else { await loadMessages(false); }
      onMessageSent(body);
    } catch (e: any) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInput(body);
      const detail = getApiErrorDetail(e);
      const code = detail && typeof detail === 'object' ? (detail as any).code : undefined;
      if (code === 'pending_limit') setRequestStatus('pending_outgoing');
      else if (code === 'conversation_blocked') setRequestStatus('blocked');
      else toast.error('Erreur envoi');
    } finally { setSending(false); setTimeout(() => inputRef.current?.focus(), 50); }
  }

  async function acceptConversation() {
    setRequestActionLoading(true);
    try { await apiClient.post(Endpoints.messages.acceptConversation(userId)); setRequestStatus('accepted'); }
    catch { toast.error('Erreur lors de l\'acceptation'); }
    finally { setRequestActionLoading(false); }
  }

  async function blockConversation() {
    setRequestActionLoading(true);
    try { await apiClient.post(Endpoints.messages.blockConversation(userId)); setRequestStatus('blocked_by_me'); }
    catch { toast.error('Erreur lors du blocage'); }
    finally { setRequestActionLoading(false); }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const isImg = file.type.startsWith('image/');
      const msgType = isImg ? 'image' : 'file';
      const ext = file.name.split('.').pop() ?? 'bin';
      const r = await apiClient.post<{ upload_url: string; public_url: string }>(
        '/api/v1/upload/presigned',
        { folder: 'messages', filename: file.name, content_type: file.type || 'application/octet-stream' },
      );
      await fetch(r.data.upload_url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      await apiClient.post(Endpoints.messages.conversation(userId), {
        content: '', message_type: msgType, attachment_url: r.data.public_url,
        ...(msgType === 'file' ? { attachment_meta: { filename: file.name, size: file.size } } : {}),
      });
      await loadMessages(false);
      onMessageSent(isImg ? '📷 Photo' : `📎 ${file.name}`);
    } catch { toast.error('Erreur upload'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function handleReact(id: string, emoji: string) {
    try {
      await apiClient.post(Endpoints.messages.messageReact(id), { emoji });
      setMessages(prev => prev.map(m => m.id === id ? { ...m, reaction: m.reaction === emoji ? null : emoji } : m));
    } catch { toast.error('Erreur'); }
    setEmojiFor(null);
  }

  async function handleDeleteForMe(id: string) {
    try {
      await apiClient.delete(Endpoints.messages.messageDeleteForMe(id));
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch { toast.error('Erreur'); }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={onBack} className="p-1.5 rounded-lg transition-all"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <ArrowLeft size={15} />
        </button>
        {peer ? (
          <button className="flex items-center gap-2 flex-1 min-w-0 text-left"
            onClick={() => navigate(`/user/${encodeId(userId)}`)}>
            <div className="relative shrink-0">
              <Avatar src={peer.avatar_url} name={peer.display_name ?? peer.username ?? '?'} size="xs" />
              {peer.is_online && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                  style={{ background: '#22c55e', borderColor: 'var(--surface)' }} />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                {peer.display_name ?? peer.username}
              </p>
              <p className="text-[10px]" style={{ color: peer.is_online ? '#22c55e' : 'var(--text-tertiary)' }}>
                {peer.is_online ? 'En ligne' : fmtLastSeen((peer as any).last_seen_at)}
              </p>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 rounded-full animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
            <div className="h-2.5 w-20 rounded animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
          </div>
        )}
        <div title={isWsConnected ? 'Temps réel' : 'Reconnexion…'} className="shrink-0">
          {isWsConnected
            ? <Wifi size={11} style={{ color: '#22c55e' }} />
            : <WifiOff size={11} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />}
        </div>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ background: 'var(--bg)' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full"><Spinner size="sm" /></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Impossible de charger</p>
            <button onClick={() => loadMessages(true)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              <RefreshCw size={10} /> Réessayer
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
            <MessageCircle size={22} style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Démarrez la conversation</p>
          </div>
        ) : <>
          <div ref={sentinelRef} />
          {loadingMore && <div className="flex justify-center py-2"><Spinner size="sm" /></div>}
          {messages.map(msg => {
          const isMe = msg.sender_id === me?.id;
          const isTemp = msg.id.startsWith('temp-');
          const body = msg.body ?? '';

          if (msg.deleted) return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[78%] px-3 py-1.5 rounded-2xl text-xs italic opacity-40"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                Message supprimé
              </div>
            </div>
          );

          return (
            <div key={msg.id} className={`flex gap-1.5 group ${isMe ? 'flex-row-reverse' : ''}`}>
              {!isMe && (
                <div className="mt-1 shrink-0">
                  <Avatar src={peer?.avatar_url} name={peer?.display_name ?? peer?.username ?? '?'} size="xs" />
                </div>
              )}
              <div className={`max-w-[78%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Reply preview */}
                {msg.reply_to && (
                  <div className={`text-[10px] px-2 py-1 rounded-lg mb-0.5 max-w-full truncate opacity-70`}
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderLeft: '2px solid var(--primary)' }}>
                    {msg.reply_to.content}
                  </div>
                )}
                <div className="relative flex items-end gap-1">
                  {/* Bulle */}
                  <div className={`rounded-2xl text-xs overflow-hidden ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                    style={isMe
                      ? { background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', color: '#fff', opacity: isTemp ? 0.6 : 1, boxShadow: '0 2px 10px rgba(123,63,242,0.2)' }
                      : { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                    {/* Image — clic pour ouvrir en plein écran (télécharger/copier) */}
                    {msg.attachment_url && msg.message_type === 'image' && (
                      <button
                        onClick={e => { e.stopPropagation(); setLightboxUrl(msg.attachment_url!); }}
                        className="block transition-opacity hover:opacity-90"
                        style={{ padding: 0, border: 'none', background: 'none', cursor: 'zoom-in' }}
                      >
                        <img src={msg.attachment_url} alt="" className="max-w-[180px] rounded-lg object-cover" style={{ display: 'block', maxHeight: 180 }} />
                      </button>
                    )}
                    {/* Fichier */}
                    {msg.attachment_url && msg.message_type === 'file' && (
                      <a href={msg.attachment_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-2" style={{ color: 'inherit', textDecoration: 'none' }}>
                        <Paperclip size={11} style={{ opacity: 0.8 }} />
                        <span className="text-[11px] font-medium truncate max-w-[140px]">
                          {msg.attachment_meta?.filename ?? 'Fichier'}
                        </span>
                      </a>
                    )}
                    {/* Contenu partagé — preview riche cliquable, comme Instagram/Facebook */}
                    {msg.message_type === 'share' && msg.attachment_meta && (
                      <button
                        onClick={() => navigate(sharedContentUrl(msg.attachment_meta!.share_type, msg.attachment_meta!.share_id))}
                        className="block text-left w-[180px]" style={{ color: 'inherit' }}>
                        {msg.attachment_meta.image && (
                          <img src={msg.attachment_meta.image} alt="" className="w-full object-cover" style={{ maxHeight: 120 }} />
                        )}
                        <div className="px-2.5 py-2">
                          {msg.attachment_meta.author_name && (
                            <p className="text-[10px] font-semibold opacity-70 truncate">{msg.attachment_meta.author_name}</p>
                          )}
                          <p className="text-[11px] font-medium truncate">{msg.attachment_meta.title ?? 'Contenu GoFolyX'}</p>
                        </div>
                      </button>
                    )}
                    {/* Texte */}
                    {body ? (
                      <div className="px-3 py-2 whitespace-pre-line break-words">
                        {body}
                        {msg.edited_at && <span className="text-[9px] ml-1 opacity-50">modifié</span>}
                      </div>
                    ) : null}
                  </div>
                  {/* Réaction */}
                  {msg.reaction && (
                    <button onClick={() => handleReact(msg.id, msg.reaction!)}
                      className="text-xs px-1 py-0.5 rounded-full absolute -bottom-3 left-1"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', zIndex: 1 }}>
                      {msg.reaction}
                    </button>
                  )}
                  {/* Emoji picker */}
                  {emojiFor === msg.id && (
                    <div className={`absolute z-30 flex gap-1 p-1.5 rounded-2xl shadow-xl ${isMe ? 'right-0' : 'left-0'}`}
                      style={{ bottom: '110%', background: 'var(--surface)', border: '1px solid var(--border)' }}
                      onClick={e => e.stopPropagation()}>
                      {QUICK_EMOJIS.map(em => (
                        <button key={em} onClick={() => handleReact(msg.id, em)}
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-base transition-all hover:scale-125">
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Hover actions */}
                  <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'order-first flex-row-reverse' : ''}`}>
                    <button onClick={() => setEmojiFor(v => v === msg.id ? null : msg.id)}
                      className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                      <Smile size={9} />
                    </button>
                    <button onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                      className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                      <Reply size={9} />
                    </button>
                    {!isMe && (
                      <button onClick={() => handleDeleteForMe(msg.id)}
                        className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                        <Trash size={9} />
                      </button>
                    )}
                  </div>
                </div>
                {/* Timestamp */}
                <div className={`flex items-center gap-1 px-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {fmtTime(msg.created_at)}
                  </span>
                  {isMe && !isTemp && (
                    msg.read
                      ? <CheckCheck size={10} style={{ color: '#7B3FF2' }} />
                      : <Check size={10} style={{ color: 'var(--text-tertiary)' }} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </>}
        {uploading && (
          <div className="flex justify-center items-center gap-1.5 py-1">
            <Spinner size="sm" />
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Envoi…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        {replyTo && (
          <div className="flex items-center gap-2 px-3 pt-2 pb-1" style={{ borderBottom: '1px solid var(--border)' }}>
            <Reply size={11} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <p className="text-[10px] flex-1 truncate" style={{ color: 'var(--text-tertiary)' }}>{replyTo.body}</p>
            <button onClick={() => setReplyTo(null)} style={{ color: 'var(--text-tertiary)' }}><X size={12} /></button>
          </div>
        )}
        {/* Demande de conversation entrante */}
        {requestStatus === 'pending_incoming' && (
          <div className="px-3 py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-[11px] mb-2" style={{ color: 'var(--text-tertiary)' }}>
              {peer?.display_name ?? peer?.username ?? 'Cette personne'} vous a envoyé un message.
            </p>
            <div className="flex gap-2">
              <button onClick={acceptConversation} disabled={requestActionLoading}
                className="flex-1 py-1.5 rounded-full text-xs font-bold text-white disabled:opacity-60"
                style={{ background: 'var(--primary)' }}>
                Autoriser
              </button>
              <button onClick={blockConversation} disabled={requestActionLoading}
                className="flex-1 py-1.5 rounded-full text-xs font-bold"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                Bloquer
              </button>
            </div>
          </div>
        )}

        {requestStatus === 'pending_outgoing' && (
          <div className="px-3 py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              En attente d'autorisation de {peer?.display_name ?? peer?.username ?? 'cette personne'}.
            </span>
          </div>
        )}

        {(requestStatus === 'blocked' || requestStatus === 'blocked_by_me') && (
          <div className="px-3 py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              {requestStatus === 'blocked_by_me' ? 'Vous avez bloqué cette conversation.' : 'Cette personne a bloqué la conversation.'}
            </span>
          </div>
        )}

        {requestStatus !== 'pending_outgoing' && requestStatus !== 'blocked' && requestStatus !== 'blocked_by_me' && (
        <div className="flex items-center gap-1.5 px-2.5 py-2">
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
            <ImageIcon size={13} />
          </button>
          <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx" hidden onChange={handleUpload} />
          <input ref={inputRef}
            className="input flex-1 text-xs rounded-full px-3 py-2"
            placeholder="Écrire un message…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
          <button onClick={sendMessage} disabled={!input.trim() || sending}
            className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40 transition-all shrink-0"
            style={{ background: input.trim() ? 'var(--primary)' : 'var(--bg-secondary)' }}>
            {sending ? <Spinner size="sm" /> : <Send size={13} style={{ color: input.trim() ? '#fff' : 'var(--text-tertiary)' }} />}
          </button>
        </div>
        )}
      </div>
      {lightboxUrl && (
        <Lightbox urls={[lightboxUrl]} index={0} onClose={() => setLightboxUrl(null)} />
      )}
    </div>
  );
}

// ── MiniConvoList ─────────────────────────────────────────────────────────────

function MiniConvoList({
  selected, onSelect, wsPayload, onNewConvo,
}: {
  selected?: string;
  onSelect: (id: string) => void;
  wsPayload: WsPayload | null;
  onNewConvo: () => void;
}) {
  const [convos,  setConvos]  = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [search,  setSearch]  = useState('');
  const [error,   setError]   = useState<string | null>(null);
  const { user: me } = useAuthStore();
  const listContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const CONVOS_PAGE_SIZE = 30;

  const load = useCallback(async (spinner = true) => {
    if (spinner) setLoading(true);
    try {
      const res = await apiClient.get<unknown>(`${Endpoints.messages.conversations}?page=1&limit=${CONVOS_PAGE_SIZE}`);
      const raw = norm<any>(res.data);
      const list = raw
        .filter((c: any) => c?.partner_id ?? c?.user?.id)
        .map((c: any) => ({ ...c, user: c.user ?? c.partner }));
      setConvos(list);
      setPage(1);
      setHasMore(list.length === CONVOS_PAGE_SIZE);
      setError(null);
    } catch (e: any) { setError(e?.message ?? 'Erreur'); }
    finally { setLoading(false); }
  }, []);

  const loadMoreConvos = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    apiClient.get<unknown>(`${Endpoints.messages.conversations}?page=${nextPage}&limit=${CONVOS_PAGE_SIZE}`)
      .then(res => {
        const raw = norm<any>(res.data);
        const list = raw
          .filter((c: any) => c?.partner_id ?? c?.user?.id)
          .map((c: any) => ({ ...c, user: c.user ?? c.partner }));
        setConvos(prev => [...prev, ...list]);
        setHasMore(list.length === CONVOS_PAGE_SIZE);
        setPage(nextPage);
      })
      .catch(() => setHasMore(false))
      .finally(() => setLoadingMore(false));
  }, [page, hasMore, loadingMore]);

  useEffect(() => { load(); }, [load]);

  // Scroll infini — désactivé pendant une recherche active (le filtre local
  // ne porte que sur les conversations déjà chargées).
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || !hasMore || search.trim()) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMoreConvos(); },
      { root: listContainerRef.current, rootMargin: '100px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loading, hasMore, search, loadMoreConvos]);

  // Mise à jour preview WS
  useEffect(() => {
    if (!wsPayload || wsPayload.type !== 'message') return;
    const msg = wsPayload as any;
    const partnerId = msg.sender_id === me?.id ? msg.receiver_id : msg.sender_id;
    const preview = msg.body ?? msg.content ?? '';
    setConvos(prev => {
      const idx = prev.findIndex(c => c.user.id === partnerId);
      if (idx === -1) { load(false); return prev; }
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        last_message: preview,
        unread_count: partnerId !== selected ? (updated[idx].unread_count ?? 0) + 1 : 0,
      };
      updated.unshift(...updated.splice(idx, 1));
      return updated;
    });
  }, [wsPayload, selected, me?.id, load]);

  const filtered = search.trim()
    ? convos.filter(c =>
        (c.user.display_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.user.username ?? '').toLowerCase().includes(search.toLowerCase()))
    : convos;

  return (
    <div className="flex flex-col h-full">
      {/* Barre recherche */}
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="input pl-7 text-xs w-full py-1.5" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-tertiary)' }}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div ref={listContainerRef} className="overflow-y-auto flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-32"><Spinner size="sm" /></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Impossible de charger</p>
            <button onClick={() => load()} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              <RefreshCw size={10} /> Réessayer
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <MessageCircle size={20} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {search ? 'Aucun résultat' : 'Aucune conversation'}
            </p>
            {!search && (
              <button onClick={onNewConvo}
                className="text-xs px-3 py-1.5 rounded-full font-semibold"
                style={{ background: 'var(--primary)', color: '#fff' }}>
                Nouvelle discussion
              </button>
            )}
          </div>
        ) : <>
          {filtered.map(c => (
          <button key={c.user.id} onClick={() => onSelect(c.user.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all"
            style={{
              background: selected === c.user.id ? 'var(--bg-secondary)' : 'transparent',
              borderBottom: '1px solid var(--border)',
            }}
            onMouseEnter={e => { if (selected !== c.user.id) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
            onMouseLeave={e => { if (selected !== c.user.id) e.currentTarget.style.background = 'transparent'; }}>
            <div className="relative shrink-0">
              <Avatar src={c.user.avatar_url} name={c.user.display_name ?? c.user.username ?? '?'} size="sm" />
              {c.user.is_online && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                  style={{ background: '#22c55e', borderColor: 'var(--bg)' }} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  <p className="font-semibold text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                    {c.user.display_name ?? c.user.username}
                  </p>
                  {c.request_status === 'pending_incoming' && (
                    <span className="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(123,63,242,0.12)', color: 'var(--primary)' }}>
                      Demande
                    </span>
                  )}
                </div>
                {(c as any).last_time && (
                  <span className="text-[10px] shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                    {fmtTime((c as any).last_time)}
                  </span>
                )}
              </div>
              {c.last_message && (
                <p className="text-[11px] truncate mt-0.5" style={{
                  color: (c.unread_count ?? 0) > 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: (c.unread_count ?? 0) > 0 ? 600 : 400,
                }}>
                  {c.last_message}
                </p>
              )}
            </div>
            {(c.unread_count ?? 0) > 0 && (
              <span className="shrink-0 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
                {c.unread_count}
              </span>
            )}
          </button>
          ))}
          {!search.trim() && (
            <div ref={sentinelRef} />
          )}
          {loadingMore && (
            <div className="flex justify-center py-2"><Spinner size="sm" /></div>
          )}
        </>}
      </div>
    </div>
  );
}

// ── NewConvoModal (mini) ──────────────────────────────────────────────────────

function MiniNewConvoModal({ onClose, onSelect }: {
  onClose: () => void; onSelect: (id: string) => void;
}) {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<UserPublic[]>([]);
  const [searching,setSearching]= useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiClient.get<unknown>(`${Endpoints.search.query}?q=${encodeURIComponent(query.trim())}&limit=10`);
        const raw = res.data as any;
        setResults(Array.isArray(raw?.users) ? raw.users : norm<UserPublic>(raw));
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={onClose} className="p-1.5 rounded-lg transition-all"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <ArrowLeft size={15} />
        </button>
        <p className="font-bold text-sm flex-1" style={{ color: 'var(--text-primary)' }}>Nouvelle conversation</p>
      </div>
      <div className="px-3 py-2 shrink-0">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }} />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher un utilisateur…" className="input pl-7 text-xs w-full py-1.5" />
          {searching && <div className="absolute right-2.5 top-1/2 -translate-y-1/2"><Spinner size="sm" /></div>}
        </div>
      </div>
      <div className="overflow-y-auto flex-1 pb-2">
        {!query.trim() ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Search size={20} style={{ color: 'var(--text-tertiary)', opacity: 0.3 }} />
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Tapez un nom ou @username</p>
          </div>
        ) : results.length === 0 && !searching ? (
          <p className="text-center py-8 text-xs" style={{ color: 'var(--text-tertiary)' }}>Aucun utilisateur trouvé</p>
        ) : results.map(u => (
          <button key={u.id} onClick={() => onSelect(u.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all"
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Avatar src={u.avatar_url} name={u.display_name ?? u.username ?? '?'} size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {u.display_name ?? u.username}
              </p>
              {u.username && <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>@{u.username}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── MessagesPopover (composant principal) ────────────────────────────────────

type View = 'list' | 'chat' | 'new';

export function MessagesPopover({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [view,         setView]        = useState<View>('list');
  const [selectedId,   setSelectedId]  = useState<string | undefined>();
  const [lastWsPayload,setLastWsPayload]= useState<WsPayload | null>(null);
  const { isConnected, addListener, removeListener, unreadMessages } = useWs();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (payload: WsPayload) => {
      if (payload.type !== 'pong') setLastWsPayload(payload);
    };
    addListener(handler);
    return () => removeListener(handler);
  }, [addListener, removeListener]);

  // Pas de fermeture au clic extérieur ni à Escape — contrairement aux autres
  // popovers (ex: NotificationsPopover), celui-ci doit rester fixe pendant que
  // l'utilisateur navigue ailleurs sur le site ; seul le bouton X (ou un
  // "Voir tout" qui navigue) le ferme explicitement.

  function openChat(id: string) {
    setSelectedId(id);
    setView('chat');
  }

  // Portail vers document.body — le header parent a un backdrop-filter, qui crée un
  // nouveau containing block CSS pour les descendants position:fixed. Sans portail,
  // ce popover fixed se retrouve piégé dans la boîte du header (h-14, overflow-hidden)
  // et devient invisible bien que correctement monté dans le DOM.
  return createPortal((
    <div
      ref={panelRef}
      className="msg-popover fixed z-[200] flex flex-col overflow-hidden"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.28), 0 4px 16px rgba(0,0,0,0.12)',
        animation: 'popover-in 0.18s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <style>{`
        @keyframes popover-in {
          from { opacity: 0; transform: scale(0.94) translateY(-8px); transform-origin: top right; }
          to   { opacity: 1; transform: scale(1)    translateY(0);     transform-origin: top right; }
        }
        /* Desktop/tablette — panneau flottant classique en haut à droite */
        .msg-popover {
          top: 60px; right: 12px; width: 360px; height: 520px;
          border-radius: 1.25rem;
        }
        /* Mobile — plein écran (moins la barre de statut) pour garantir que
           la liste et le chat restent scrollables au toucher, sans dépendre
           d'une largeur fixe qui déborderait de l'écran. */
        @media (max-width: 640px) {
          .msg-popover {
            top: 0; right: 0; left: 0; bottom: 0;
            width: auto; height: 100dvh;
            border-radius: 0; border: none;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-2">
          <h3 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>Messages</h3>
          {unreadMessages > 0 && (
            <span className="text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
              {unreadMessages > 99 ? '99+' : unreadMessages}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setView('new')} title="Nouvelle conversation"
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
            <SquarePen size={15} />
          </button>
          <button onClick={() => { navigate('/messages'); onClose(); }} title="Voir tout"
            className="p-1.5 rounded-lg transition-all text-[10px] font-semibold px-2.5"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}>
            Voir tout
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === 'list' && (
          <MiniConvoList
            selected={selectedId}
            onSelect={openChat}
            wsPayload={lastWsPayload}
            onNewConvo={() => setView('new')}
          />
        )}
        {view === 'chat' && selectedId && (
          <MiniChatWindow
            key={selectedId}
            userId={selectedId}
            wsPayload={lastWsPayload}
            isWsConnected={isConnected}
            onBack={() => setView('list')}
            onMessageSent={() => {}}
          />
        )}
        {view === 'new' && (
          <MiniNewConvoModal
            onClose={() => setView('list')}
            onSelect={id => { openChat(id); }}
          />
        )}
      </div>
    </div>
  ), document.body);
}
