import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Send, ArrowLeft, MessageCircle, X, SquarePen, Search, RefreshCw,
  Wifi, WifiOff, MoreVertical, Reply, Pencil, Trash2, Forward, Pin,
  PinOff, Smile, Image as ImageIcon, Check, CheckCheck, Trash,
  Mic, MicOff, Play, Square, Paperclip,
} from 'lucide-react';
import type { Conversation, Message, UserPublic } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { useAuthStore } from '../store/authStore';
import { useWs } from '../context/WebSocketContext';
import type { WsPayload } from '../context/WebSocketContext';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

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

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  if (isToday(d))     return format(d, 'HH:mm', { locale: fr });
  if (isYesterday(d)) return 'Hier';
  return format(d, 'd MMM', { locale: fr });
}

function formatLastSeen(iso?: string | null): string {
  if (!iso) return 'Hors ligne';
  return `Vu ${formatDistanceToNow(new Date(iso), { locale: fr, addSuffix: true })}`;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExtMessage extends Message {
  content?: string;
  message_type?: string;
  attachment_url?: string;
  reply_to?: { id: string; content: string; sender_id: string } | null;
  reaction?: string | null;
  edited_at?: string | null;
  deleted?: boolean;
  pinned?: boolean;
}

// ── ConvoListHandle ───────────────────────────────────────────────────────────

export interface ConvoListHandle {
  updatePreview: (senderId: string, preview: string) => void;
  reload: () => void;
}

// ── NewConversationModal ──────────────────────────────────────────────────────

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
              placeholder="Rechercher un utilisateur…" className="input pl-9 text-sm w-full" />
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

// ── ConversationList ──────────────────────────────────────────────────────────

const ConversationList = forwardRef<ConvoListHandle, {
  selected?: string;
  onSelect: (id: string) => void;
}>(function ConversationList({ selected, onSelect }, ref) {
  const [convos,   setConvos]   = useState<Conversation[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [error,    setError]    = useState<string | null>(null);

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
    } finally { setLoading(false); }
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

  const reload = useCallback(() => load(false), [load]);

  useImperativeHandle(ref, () => ({ updatePreview, reload }), [updatePreview, reload]);

  const filtered = search.trim()
    ? convos.filter(c =>
        (c.user.display_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.user.username ?? '').toLowerCase().includes(search.toLowerCase()))
    : convos;

  async function deleteConvo(userId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Supprimer cette conversation ?')) return;
    try {
      await apiClient.delete(Endpoints.messages.deleteConversation(userId));
      setConvos(prev => prev.filter(c => c.user.id !== userId));
      toast.success('Conversation supprimée');
    } catch { toast.error('Erreur'); }
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="flex flex-col h-full">
      {/* Barre recherche */}
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…" className="input pl-8 text-sm w-full py-2" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 gap-3">
            <p className="text-sm text-center" style={{ color: 'var(--text-tertiary)' }}>Impossible de charger</p>
            <button onClick={() => load()} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              <RefreshCw size={11} /> Réessayer
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
              <MessageCircle size={22} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              {search ? 'Aucun résultat' : 'Aucune conversation'}
            </p>
            {!search && <p className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>Démarrez une discussion</p>}
          </div>
        ) : filtered.map(c => (
          <div key={c.user.id} className="group relative">
            <button onClick={() => onSelect(c.user.id)}
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
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {c.user.display_name ?? c.user.username}
                  </p>
                  {(c as any).last_time && (
                    <span className="text-[10px] shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                      {formatMsgTime((c as any).last_time)}
                    </span>
                  )}
                </div>
                {c.last_message && (
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>{c.last_message}</p>
                )}
              </div>
              {(c.unread_count ?? 0) > 0 && (
                <span className="shrink-0 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1"
                  style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
                  {c.unread_count}
                </span>
              )}
            </button>
            {/* Bouton supprimer au hover */}
            <button onClick={e => deleteConvo(c.user.id, e)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
              <Trash size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});

// ── MessageBubble ─────────────────────────────────────────────────────────────

function MessageBubble({ msg, isMe, peer, onReply, onEdit, onDelete, onDeleteForMe, onPin, onReact, onForward, navigate }: {
  msg: ExtMessage; isMe: boolean; peer: UserPublic | null;
  onReply: (msg: ExtMessage) => void;
  onEdit: (msg: ExtMessage) => void;
  onDelete: (id: string) => void;
  onDeleteForMe: (id: string) => void;
  onPin: (id: string, pin: boolean) => void;
  onReact: (id: string, emoji: string) => void;
  onForward: (msg: ExtMessage) => void;
  navigate: (to: string) => void;
}) {
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  // Le backend ne retourne pas sender_display_name — on utilise peer (partenaire connu)
  const senderName   = (msg as any).sender_display_name ?? (msg as any).sender_username
    ?? (!isMe ? (peer?.display_name ?? peer?.username ?? '?') : '');
  const senderAvatar = (msg as any).sender_avatar_url
    ?? (!isMe ? peer?.avatar_url : null);

  const body = (msg.body ?? (msg as any).content ?? '').trim();
  if (msg.deleted) return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[72%] px-3.5 py-2 rounded-2xl text-xs italic opacity-40"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
        Message supprimé
      </div>
    </div>
  );

  return (
    <div className={`flex gap-2 group ${isMe ? 'flex-row-reverse' : ''}`}>
      {!isMe && (
        <button className="mt-1 shrink-0" onClick={() => navigate(`/user/${msg.sender_id}`)}>
          <Avatar src={senderAvatar} name={senderName} size="xs" />
        </button>
      )}
      <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
        {/* Nom de l'expéditeur pour les messages reçus */}
        {!isMe && senderName && (
          <span className="text-[11px] font-semibold px-1" style={{ color: 'var(--primary)' }}>
            {senderName}
          </span>
        )}
        <div className={`flex items-end gap-1 ${isMe ? 'flex-row-reverse' : ''}`}>
          <div className="relative">
            {/* Bulle */}
            <div className={`rounded-2xl text-sm overflow-hidden ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
              style={isMe
                ? { background: 'linear-gradient(135deg,#7B3FF2,#E0389A)', color: '#fff', boxShadow: '0 4px 16px rgba(123,63,242,0.25)' }
                : { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>

              {/* Épinglé */}
              {msg.pinned && (
                <div className="flex items-center gap-1 px-3 pt-1.5 pb-0 opacity-60">
                  <Pin size={9} /> <span className="text-[9px] font-bold">Épinglé</span>
                </div>
              )}

              {/* Reply preview */}
              {msg.reply_to && (
                <div className="px-3 pt-2 pb-1"
                  style={{ borderBottom: `1px solid ${isMe ? 'rgba(255,255,255,0.2)' : 'var(--border)'}` }}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <Reply size={9} style={{ opacity: 0.7 }} />
                    <span className="text-[10px] font-bold opacity-80">
                      {msg.reply_to.sender_id === msg.sender_id && isMe ? 'Toi'
                        : msg.reply_to.sender_id === msg.sender_id ? senderName
                        : peer?.display_name ?? peer?.username ?? 'Toi'}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-70 truncate max-w-[200px]">{msg.reply_to.content}</p>
                </div>
              )}

              {/* Image */}
              {(msg as any).attachment_url && msg.message_type === 'image' && (
                <img src={(msg as any).attachment_url} alt="" className="max-w-[240px] rounded-lg object-cover"
                  style={{ display: 'block', maxHeight: 280 }} />
              )}
              {/* Vidéo */}
              {(msg as any).attachment_url && msg.message_type === 'video' && (
                <video src={(msg as any).attachment_url} controls className="max-w-[240px] rounded-lg"
                  style={{ display: 'block', maxHeight: 240 }} />
              )}
              {/* Audio / Vocal */}
              {(msg as any).attachment_url && (msg.message_type === 'voice' || msg.message_type === 'audio') && (
                <div className="px-3 py-2 flex items-center gap-2" style={{ minWidth: 200 }}>
                  <Mic size={13} style={{ opacity: 0.7, flexShrink: 0 }} />
                  <audio src={(msg as any).attachment_url} controls className="h-8" style={{ maxWidth: 200, flex: 1 }} />
                  {(msg as any).attachment_meta?.duration && (
                    <span className="text-[10px] opacity-60 shrink-0">
                      {Math.floor((msg as any).attachment_meta.duration)}s
                    </span>
                  )}
                </div>
              )}
              {/* Fichier (PDF, doc…) */}
              {(msg as any).attachment_url && msg.message_type === 'file' && (
                <a href={(msg as any).attachment_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2.5 transition-all"
                  style={{ color: 'inherit', textDecoration: 'none' }}
                  onClick={e => e.stopPropagation()}>
                  <Paperclip size={14} style={{ opacity: 0.8, flexShrink: 0 }} />
                  <span className="text-xs font-medium truncate max-w-[180px]">
                    {(msg as any).attachment_meta?.filename ?? 'Fichier'}
                  </span>
                  {(msg as any).attachment_meta?.size && (
                    <span className="text-[10px] opacity-60 shrink-0">
                      {((msg as any).attachment_meta.size / 1024).toFixed(0)}Ko
                    </span>
                  )}
                </a>
              )}

              {/* Texte */}
              {body && (
                <div className="px-3.5 py-2.5">
                  {body}
                  {msg.edited_at && <span className="text-[9px] ml-1.5 opacity-60">modifié</span>}
                </div>
              )}
            </div>

            {/* Réaction */}
            {msg.reaction && (
              <div className={`absolute -bottom-3 ${isMe ? 'left-0' : 'right-0'}`}>
                <button onClick={() => onReact(msg.id, msg.reaction!)}
                  className="text-sm px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  {msg.reaction}
                </button>
              </div>
            )}

            {/* Picker emoji */}
            {emojiOpen && (
              <div className={`absolute z-20 flex gap-1 p-1.5 rounded-2xl shadow-xl ${isMe ? 'right-0' : 'left-0'}`}
                style={{ bottom: '110%', background: 'var(--surface)', border: '1px solid var(--border)' }}
                onClick={e => e.stopPropagation()}>
                {QUICK_EMOJIS.map(em => (
                  <button key={em} onClick={() => { onReact(msg.id, em); setEmojiOpen(false); }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-lg transition-all hover:scale-125">
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions hover */}
          <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
            <button onClick={() => setEmojiOpen(v => !v)}
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
              <Smile size={11} />
            </button>
            <button onClick={() => onReply(msg)}
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
              <Reply size={11} />
            </button>
            <div className="relative">
              <button onClick={() => setMenuOpen(v => !v)}
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                <MoreVertical size={11} />
              </button>
              {menuOpen && (
                <div className={`absolute z-20 py-1 rounded-xl shadow-xl overflow-hidden ${isMe ? 'right-0' : 'left-0'}`}
                  style={{ bottom: '110%', minWidth: 168, background: 'var(--surface)', border: '1px solid var(--border)' }}
                  onClick={e => e.stopPropagation()}>
                  <button onClick={() => { onForward(msg); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <Forward size={12} /> Transférer
                  </button>
                  <button onClick={() => { onPin(msg.id, !msg.pinned); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    {msg.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                    {msg.pinned ? 'Désépingler' : 'Épingler'}
                  </button>
                  {isMe && (
                    <button onClick={() => { onEdit(msg); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <Pencil size={12} /> Modifier
                    </button>
                  )}
                  <button onClick={() => { onDeleteForMe(msg.id); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                    style={{ color: '#F59E0B' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F59E0B10')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <Trash2 size={12} /> Supprimer pour moi
                  </button>
                  {isMe && (
                    <button onClick={() => { onDelete(msg.id); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                      style={{ color: '#EF4444' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#EF444410')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <Trash2 size={12} /> Supprimer pour tous
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timestamp + lu */}
        <div className={`flex items-center gap-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            {formatMsgTime(msg.created_at)}
          </span>
          {isMe && (
            msg.read
              ? <CheckCheck size={11} style={{ color: '#7B3FF2' }} />
              : <Check size={11} style={{ color: 'var(--text-tertiary)' }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── ForwardModal ──────────────────────────────────────────────────────────────

function ForwardModal({ msg, onClose, onForwarded }: {
  msg: ExtMessage; onClose: () => void; onForwarded: () => void;
}) {
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState<UserPublic[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending,   setSending]   = useState(false);

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

  async function forward(receiverId: string) {
    setSending(true);
    try {
      await apiClient.post(Endpoints.messages.messageForward(msg.id), { receiver_id: receiverId });
      toast.success('Message transféré');
      onForwarded(); onClose();
    } catch { toast.error('Erreur'); setSending(false); }
  }

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col w-[calc(100vw-2rem)] max-w-sm"
        style={{ background: 'var(--surface)', borderRadius: '1.25rem', border: '1px solid var(--border)', maxHeight: '60vh' }}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Transférer à</p>
          <button onClick={onClose}><X size={16} style={{ color: 'var(--text-tertiary)' }} /></button>
        </div>
        <div className="px-4 py-2 shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher…" className="input pl-8 text-sm w-full py-2" autoFocus />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pb-3">
          {results.map(u => (
            <button key={u.id} onClick={() => forward(u.id)} disabled={sending}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <Avatar src={u.avatar_url} name={u.display_name ?? u.username ?? '?'} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{u.display_name ?? u.username}</p>
                {u.username && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>@{u.username}</p>}
              </div>
              {sending && <Spinner size="sm" />}
            </button>
          ))}
          {!query.trim() && (
            <p className="text-center py-6 text-xs" style={{ color: 'var(--text-tertiary)' }}>Tapez un nom</p>
          )}
        </div>
      </div>
    </>
  );
}

// ── ChatWindow ────────────────────────────────────────────────────────────────

function ChatWindow({ userId, wsPayload, isWsConnected, onMessageSent, onBack }: {
  userId: string;
  wsPayload: WsPayload | null;
  isWsConnected: boolean;
  onMessageSent: (preview: string) => void;
  onBack?: () => void;
}) {
  const navigate               = useNavigate();
  const { user: me }           = useAuthStore();
  const [messages, setMessages]= useState<ExtMessage[]>([]);
  const [input,    setInput]   = useState('');
  const [loading,  setLoading] = useState(true);
  const [sending,  setSending] = useState(false);
  const [error,    setError]   = useState<string | null>(null);
  const [peer,     setPeer]    = useState<UserPublic | null>(null);
  const [replyTo,  setReplyTo] = useState<ExtMessage | null>(null);
  const [editingId,setEditingId]= useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [searchOpen,setSearchOpen]= useState(false);
  const [searchQuery,setSearchQuery]= useState('');
  const [searchResults,setSearchResults]= useState<ExtMessage[]>([]);
  const [forwardMsg,setForwardMsg]= useState<ExtMessage | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [recording,   setRecording]   = useState(false);
  const [recordTime,  setRecordTime]  = useState(0);
  const mediaRecRef   = useRef<MediaRecorder | null>(null);
  const audioChunks   = useRef<Blob[]>([]);
  const recordTimer   = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);
  const msgRefs   = useRef<Record<string, HTMLDivElement | null>>({});

  const loadMessages = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await apiClient.get<unknown>(Endpoints.messages.conversation(userId));
      // Backend retourne du plus récent au plus ancien → inverser pour afficher chronologiquement
      const msgs = norm<Message>(res.data)
        .map((m: any) => ({ ...m, body: m.body ?? m.content ?? '' }))
        .reverse();
      setMessages(msgs as ExtMessage[]);
      setError(null);
    } catch (e: any) { setError(e?.message ?? 'Erreur'); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => {
    setMessages([]); setError(null); setPeer(null); setReplyTo(null);
    loadMessages(true);
    apiClient.get<unknown>(Endpoints.users.publicProfile(userId))
      .then(r => { const raw = r.data as any; setPeer(raw?.user ?? raw); })
      .catch(() => {});
    apiClient.put(Endpoints.messages.markRead(userId)).catch(() => {});
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
    if (wsPayload.type === 'read') {
      setMessages(prev => prev.map(m => m.sender_id === me?.id ? { ...m, read: true } : m));
    }
    if (wsPayload.type === 'message_deleted') {
      setMessages(prev => prev.map(m => m.id === (wsPayload as any).message_id ? { ...m, deleted: true } : m));
    }
    if (wsPayload.type === 'message_edited') {
      const w = wsPayload as any;
      setMessages(prev => prev.map(m => m.id === w.message_id ? { ...m, body: w.content, edited_at: w.edited_at } : m));
    }
    if (wsPayload.type === 'reaction') {
      const w = wsPayload as any;
      setMessages(prev => prev.map(m => m.id === w.message_id ? { ...m, reaction: w.emoji } : m));
    }
  }, [wsPayload, userId, me?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function sendMessage() {
    if ((!input.trim() && !replyTo) || sending) return;
    const body = input.trim();
    setInput(''); setSending(true);
    const tempId = `temp-${Date.now()}`;
    const tempMsg: ExtMessage = {
      id: tempId, sender_id: me?.id ?? '', receiver_id: userId,
      body, created_at: new Date().toISOString(), read: false,
      reply_to: replyTo ? { id: replyTo.id, content: replyTo.body ?? '', sender_id: replyTo.sender_id } : undefined,
    } as any;
    setMessages(prev => [...prev, tempMsg]);
    setReplyTo(null);
    try {
      const payload: any = { content: body, message_type: 'text' };
      if (tempMsg.reply_to) payload.reply_to_id = tempMsg.reply_to.id;
      const res = await apiClient.post<unknown>(Endpoints.messages.conversation(userId), payload);
      const raw = res.data as any;
      const msg = raw?.id ? raw : (raw?.message ?? raw?.data);
      if (msg?.id) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...msg, body: msg.body ?? msg.content ?? body } : m));
      } else { await loadMessages(false); }
      onMessageSent(body);
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInput(body);
    } finally { setSending(false); setTimeout(() => inputRef.current?.focus(), 50); }
  }

  // ── Upload via presigned URL (même approche que le mobile → bypass validation content_type) ──
  async function uploadViaPresigned(file: File, folder: string): Promise<string> {
    const ext = file.name.split('.').pop() ?? 'bin';
    const r = await apiClient.post<{ upload_url: string; public_url: string; key: string }>(
      '/api/v1/upload/presigned',
      { folder, filename: file.name, content_type: file.type || 'application/octet-stream' },
    );
    const { upload_url, public_url } = r.data;
    // PUT direct vers R2 — pas de validation FastAPI
    await fetch(upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    return public_url;
  }

  // ── Upload fichier via multipart (images, vidéos, fichiers) ──
  async function uploadFile(file: File): Promise<{ url: string; msgType: string; preview: string; meta: Record<string, any> }> {
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const isDoc   = !isVideo && !isAudio && !file.type.startsWith('image/');

    // Déterminer le folder presigned
    let folder: string;
    let msgType: string;
    let preview: string;

    if (isVideo)      { folder = 'messages'; msgType = 'video'; preview = '🎥 Vidéo'; }
    else if (isAudio) { folder = 'messages'; msgType = 'voice'; preview = '🎤 Audio'; }
    else if (isDoc)   { folder = 'messages'; msgType = 'file';  preview = `📎 ${file.name}`; }
    else              { folder = 'messages'; msgType = 'image'; preview = '📷 Photo'; }

    let url: string;
    const meta: Record<string, any> = {};

    try {
      // 1. Essayer multipart backend (le plus simple si le serveur est à jour)
      const form = new FormData();
      form.append('file', file, file.name);

      let endpoint: string;
      if (isVideo)      endpoint = '/api/v1/upload/video?folder=messages';
      else if (isAudio) endpoint = '/api/v1/upload/audio?folder=messages';
      else if (isDoc)   endpoint = '/api/v1/upload/file?folder=messages';
      else              endpoint = '/api/v1/upload/images?folder=messages';

      const r = await apiClient.post<any>(endpoint, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      url = r.data?.uploaded?.[0]?.url ?? r.data?.url ?? r.data?.data?.url;
      if (!url) throw new Error('no url');
      if (r.data?.duration) meta.duration = r.data.duration;
      if (r.data?.filename) meta.filename  = r.data.filename;
      if (r.data?.size)     meta.size      = r.data.size;
    } catch {
      // 2. Fallback : presigned URL (bypass validation — même méthode que le mobile)
      url = await uploadViaPresigned(file, folder);
    }

    if (isDoc && !meta.filename) meta.filename = file.name;
    if (isDoc && !meta.size)     meta.size     = file.size;
    if (isAudio)                 meta.duration = Math.ceil(file.size / 8000);

    return { url, msgType, preview, meta };
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const { url, msgType, preview, meta } = await uploadFile(file);
        await apiClient.post(Endpoints.messages.conversation(userId), {
          content: '',
          message_type: msgType,
          attachment_url: url,
          ...(Object.keys(meta).length > 0 ? { attachment_meta: meta } : {}),
        });
        onMessageSent(preview);
      }
      await loadMessages(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? err?.message ?? 'Erreur lors de l\'upload');
    }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg;codecs=opus';
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecRef.current = mr;
      audioChunks.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunks.current.push(e.data); };
      mr.start(100);
      setRecording(true); setRecordTime(0);
      recordTimer.current = setInterval(() => setRecordTime(t => t + 1), 1000);
    } catch { toast.error('Microphone non disponible'); }
  }

  async function stopRecording(send = true) {
    if (!mediaRecRef.current) return;
    if (recordTimer.current) { clearInterval(recordTimer.current); recordTimer.current = null; }
    setRecording(false); setRecordTime(0);

    const mr = mediaRecRef.current;
    mediaRecRef.current = null;

    if (!send) {
      mr.stream.getTracks().forEach(t => t.stop());
      mr.stop(); audioChunks.current = [];
      return;
    }

    await new Promise<void>(res => { mr.onstop = () => res(); mr.stop(); });
    mr.stream.getTracks().forEach(t => t.stop());

    const rawMime = mr.mimeType.split(';')[0].trim() || 'audio/webm';
    const blob    = new Blob(audioChunks.current, { type: rawMime });
    const ext     = rawMime.includes('ogg') ? 'ogg' : 'webm';
    const file    = new File([blob], `vocal_${Date.now()}.${ext}`, { type: rawMime });
    const durationSec = recordTime || Math.ceil(blob.size / 8000);

    setUploading(true);
    try {
      const { url } = await uploadFile(file);
      await apiClient.post(Endpoints.messages.conversation(userId), {
        content: '',
        message_type: 'voice',
        attachment_url: url,
        attachment_meta: { duration: durationSec },
      });
      await loadMessages(false);
      onMessageSent('🎤 Vocal');
    } catch { toast.error('Erreur envoi vocal'); }
    finally { setUploading(false); audioChunks.current = []; }
  }

  async function handleEdit() {
    if (!editingId || !editText.trim()) return;
    try {
      await apiClient.patch(Endpoints.messages.message(editingId), { content: editText.trim() });
      setMessages(prev => prev.map(m => m.id === editingId ? { ...m, body: editText.trim(), edited_at: new Date().toISOString() } : m));
      toast.success('Message modifié');
    } catch { toast.error('Erreur'); }
    setEditingId(null); setEditText('');
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer pour tous ?')) return;
    try {
      await apiClient.delete(Endpoints.messages.message(id));
      setMessages(prev => prev.map(m => m.id === id ? { ...m, deleted: true } : m));
    } catch { toast.error('Erreur'); }
  }

  async function handleDeleteForMe(id: string) {
    try {
      await apiClient.delete(Endpoints.messages.messageDeleteForMe(id));
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch { toast.error('Erreur'); }
  }

  async function handlePin(id: string, pin: boolean) {
    try {
      if (pin) await apiClient.post(Endpoints.messages.messagePin(id));
      else await apiClient.delete(Endpoints.messages.messagePin(id));
      setMessages(prev => prev.map(m => m.id === id ? { ...m, pinned: pin } : m));
      toast.success(pin ? 'Épinglé' : 'Désépinglé');
    } catch { toast.error('Erreur'); }
  }

  async function handleReact(id: string, emoji: string) {
    try {
      await apiClient.post(Endpoints.messages.messageReact(id), { emoji });
      setMessages(prev => prev.map(m => m.id === id ? { ...m, reaction: m.reaction === emoji ? null : emoji } : m));
    } catch { toast.error('Erreur'); }
  }

  async function handleSearch(q: string) {
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      const res = await apiClient.get<unknown>(`${Endpoints.messages.searchInConvo(userId)}?q=${encodeURIComponent(q.trim())}`);
      setSearchResults(norm<ExtMessage>(res.data));
    } catch { setSearchResults([]); }
  }

  function jumpToMsg(id: string) {
    setSearchOpen(false);
    const el = msgRefs.current[id];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        {onBack && (
          <button onClick={onBack} className="p-1.5 rounded-xl transition-all lg:hidden"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <ArrowLeft size={18} />
          </button>
        )}
        {peer ? (
          <button className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
            onClick={() => navigate(`/user/${userId}`)}>
            <div className="relative shrink-0">
              <Avatar src={peer.avatar_url} name={peer.display_name ?? peer.username ?? '?'} size="sm" verified={peer.is_verified} />
              {peer.is_online && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                  style={{ background: '#22c55e', borderColor: 'var(--surface)' }} />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                {peer.display_name ?? peer.username}
              </p>
              <p className="text-[11px]" style={{ color: peer.is_online ? '#22c55e' : 'var(--text-tertiary)' }}>
                {peer.is_online ? 'En ligne' : formatLastSeen((peer as any).last_seen_at)}
              </p>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
            <div className="h-3 w-28 rounded-full animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
          </div>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => { setSearchOpen(v => !v); if (!searchOpen) setTimeout(() => document.getElementById('msg-search')?.focus(), 60); }}
            className="p-1.5 rounded-xl transition-all"
            style={{ color: searchOpen ? 'var(--primary)' : 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Search size={16} />
          </button>
          <div title={isWsConnected ? 'Temps réel' : 'Reconnexion…'}>
            {isWsConnected
              ? <Wifi size={13} style={{ color: '#22c55e' }} />
              : <WifiOff size={13} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />}
          </div>
        </div>
      </div>

      {/* Barre recherche */}
      {searchOpen && (
        <div className="px-4 py-2 shrink-0" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
            <input id="msg-search" value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); handleSearch(e.target.value); }}
              placeholder="Rechercher dans la conversation…" className="input pl-8 text-sm w-full py-2" />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }}>
                <X size={13} />
              </button>
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {searchResults.map(r => (
                <button key={r.id} onClick={() => jumpToMsg(r.id)}
                  className="w-full text-left text-xs px-2 py-1.5 rounded-lg transition-all truncate"
                  style={{ background: 'var(--surface)', color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
                  {r.body ?? (r as any).content}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ background: 'var(--bg)' }}>
        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Impossible de charger</p>
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
          if (isTemp) return (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[72%] px-3.5 py-2.5 rounded-2xl rounded-br-sm text-sm opacity-60"
                style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)', color: '#fff' }}>
                <p>{msg.body}</p>
                <p className="text-[10px] mt-1 text-right opacity-70">Envoi…</p>
              </div>
            </div>
          );
          return (
            <div key={msg.id} ref={el => { msgRefs.current[msg.id] = el; }}>
              {editingId === msg.id ? (
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className="flex items-center gap-2 max-w-[80%]">
                    <input autoFocus value={editText} onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') { setEditingId(null); setEditText(''); } }}
                      className="input text-sm flex-1 rounded-2xl px-3.5 py-2" style={{ minWidth: 160 }} />
                    <button onClick={handleEdit} className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--primary)', color: '#fff' }}><Check size={13} /></button>
                    <button onClick={() => { setEditingId(null); setEditText(''); }}
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}><X size={13} /></button>
                  </div>
                </div>
              ) : (
                <MessageBubble
                  msg={msg} isMe={isMe} peer={peer}
                  onReply={m => { setReplyTo(m); inputRef.current?.focus(); }}
                  onEdit={m => { setEditingId(m.id); setEditText(m.body ?? ''); }}
                  onDelete={handleDelete}
                  onDeleteForMe={handleDeleteForMe}
                  onPin={handlePin}
                  onReact={handleReact}
                  onForward={m => setForwardMsg(m)}
                  navigate={navigate}
                />
              )}
            </div>
          );
        })}
        {uploading && (
          <div className="flex justify-center items-center gap-2 py-2">
            <Spinner size="sm" />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Envoi en cours…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        {/* Reply preview */}
        {replyTo && (
          <div className="flex items-center gap-2 px-4 pt-2 pb-1" style={{ borderBottom: '1px solid var(--border)' }}>
            <Reply size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold" style={{ color: 'var(--primary)' }}>
                {replyTo.sender_id === me?.id ? 'Toi' : peer?.display_name ?? peer?.username ?? ''}
              </p>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>{replyTo.body}</p>
            </div>
            <button onClick={() => setReplyTo(null)} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}><X size={14} /></button>
          </div>
        )}
        {/* Barre enregistrement vocal */}
        {recording && (
          <div className="flex items-center gap-3 px-4 py-2"
            style={{ borderBottom: '1px solid var(--border)', background: 'rgba(239,68,68,0.06)' }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#EF4444' }} />
            <span className="text-sm font-semibold flex-1" style={{ color: '#EF4444' }}>
              Enregistrement… {Math.floor(recordTime / 60)}:{String(recordTime % 60).padStart(2, '0')}
            </span>
            <button onClick={() => stopRecording(false)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              <X size={12} /> Annuler
            </button>
            <button onClick={() => stopRecording(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white"
              style={{ background: '#EF4444' }}>
              <Send size={12} /> Envoyer
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-2">
          <button onClick={() => fileRef.current?.click()} disabled={uploading || recording}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
            title="Image / Vidéo">
            <ImageIcon size={16} />
          </button>
          <input ref={fileRef} type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" multiple hidden onChange={handleUpload} />
          {!recording && !input.trim() && (
            <button onClick={startRecording} disabled={uploading}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
              title="Message vocal">
              <Mic size={16} />
            </button>
          )}
          <input ref={inputRef}
            className="input flex-1 text-sm rounded-full px-4 py-2.5"
            placeholder={recording ? '' : 'Écrire un message…'}
            value={input}
            disabled={recording}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
          <button onClick={sendMessage} disabled={(!input.trim() && !recording) || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40 transition-all shrink-0"
            style={{ background: input.trim() ? 'var(--primary)' : 'var(--bg-secondary)' }}>
            {sending ? <Spinner size="sm" /> : <Send size={16} style={{ color: input.trim() ? '#fff' : 'var(--text-tertiary)' }} />}
          </button>
        </div>
      </div>

      {forwardMsg && (
        <ForwardModal msg={forwardMsg} onClose={() => setForwardMsg(null)} onForwarded={() => {}} />
      )}
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
  const { sendMessage: sendWsMessage, isConnected, addListener, removeListener } = useWs();

  useEffect(() => {
    const handler = (payload: WsPayload) => {
      if (payload.type === 'pong') return;
      setLastWsPayload(payload);
      if (payload.type === 'message') {
        const msg = payload as any;
        const partnerId = msg.sender_id === me?.id ? msg.receiver_id : msg.sender_id;
        const preview = msg.body ?? msg.content ?? '';
        convoListRef.current?.updatePreview(partnerId, preview);
      }
    };
    addListener(handler);
    return () => removeListener(handler);
  }, [addListener, removeListener, me?.id]);

  function handleSelect(id: string) {
    setSelectedId(id);
    navigate(`/messages/${id}`, { replace: true });
  }

  function handleBack() {
    setSelectedId(undefined);
    navigate('/messages', { replace: true });
  }

  return (
    <div className="flex h-full">
      {showNewConvo && (
        <NewConversationModal onClose={() => setShowNewConvo(false)} onSelect={handleSelect} />
      )}

      {/* Liste */}
      <div className={`flex flex-col shrink-0 ${selectedId ? 'hidden lg:flex' : 'flex w-full'} lg:w-80`}
        style={{ borderRight: '1px solid var(--border)', background: 'var(--bg)' }}>
        <div className="flex items-center justify-between px-4 py-3.5 shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <h2 className="font-black text-base" style={{ color: 'var(--text-primary)' }}>Messages</h2>
          <button onClick={() => setShowNewConvo(true)}
            className="p-2 rounded-xl transition-all" title="Nouvelle conversation"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
            <SquarePen size={16} />
          </button>
        </div>
        <ConversationList ref={convoListRef} selected={selectedId} onSelect={handleSelect} />
      </div>

      {/* Chat */}
      <div className={`flex-1 flex flex-col min-w-0 ${!selectedId ? 'hidden lg:flex' : 'flex'}`}
        style={{ background: 'var(--bg)' }}>
        {selectedId ? (
          <ChatWindow
            key={selectedId}
            userId={selectedId}
            wsPayload={lastWsPayload}
            isWsConnected={isConnected}
            onSendWs={sendWsMessage}
            onMessageSent={preview => convoListRef.current?.updatePreview(selectedId, preview)}
            onBack={handleBack}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-50">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
              <MessageCircle size={28} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Sélectionnez une conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}
