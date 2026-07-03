import { PageLoader } from '../components/ui/Spinner';
import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { decodeId } from '../utils/slugId';
import {
  Radio, Eye, Send, X, StopCircle, ChevronLeft,
  Mic, MicOff, VideoIcon, VideoOff, Gift, Hand, FlipHorizontal,
  ShieldOff, Ban, Lock, Users, Trash2, Slash, RefreshCw,
  Smile, ArrowDown, UserCheck, UserPlus, Settings, ThumbsUp, ThumbsDown, MoreVertical,
} from 'lucide-react';
import {
  LiveKitRoom,
  VideoTrack,
  useParticipants,
  useTracks,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
} from '@livekit/components-react';
import { Track, VideoPresets, RoomEvent, ParticipantEvent } from 'livekit-client';
import type { LiveStream, StreamToken } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useApi } from '../hooks/useApi';
import { useWs } from '../context/WebSocketContext';
import { Spinner } from '../components/ui/Spinner';
import { Avatar } from '../components/ui/Avatar';
import { WS_BASE_URL, API_BASE_URL } from '../utils/constants';
import { useAuthStore } from '../store/authStore';
import {
  LiveLikeButton,
  LiveReactionPicker,
  FloatingEmojiOverlay,
  LiveTimer,
  LIVE_ANIMATIONS_CSS,
} from '../components/live/LiveInteractions';
import {
  LiveGiftModal,
  GiftTicker,
  GiftToast,
  type GiftNotif,
} from '../components/live/LiveGiftModal';
import { LiveSettingsSheet } from '../components/live/LiveSettingsSheet';
import { LiveAccessGate } from '../components/live/LiveAccessGate';
import { StageAccessGate } from '../components/live/StageAccessGate';
import { useLiveSuggestions, LiveSuggestionsBar, LiveBoostedRail } from '../components/live/LiveSuggestions';
import { useConfirm } from '../components/ui/Dialog';

// ── LiveKit quality config ─────────────────────────────────────────────────────

const CREATOR_ROOM_OPTIONS = {
  adaptiveStream: true,
  dynacast: true,
  publishDefaults: {
    videoCodec: 'h264' as const,
    simulcast: true,
    videoSimulcastLayers: [VideoPresets.h720],
    videoEncoding: { maxBitrate: 4_000_000, maxFramerate: 30 },
  },
};

const VIEWER_ROOM_OPTIONS = {
  adaptiveStream: true,
  dynacast: false,
  publishDefaults: {
    videoCodec: 'h264' as const,
    videoSimulcastLayers: [VideoPresets.h720],
  },
};

// ── Types internes ─────────────────────────────────────────────────────────────

interface ChatMsg {
  id:      string;
  user:    string;
  userId?: string;
  avatar?: string | null;
  text:    string;
  isSys?:  boolean;
  isGift?: boolean;
  likeCount?:    number;
  dislikeCount?: number;
  myReaction?:   'like' | 'dislike' | null;
}
interface EmojiFloat  { id: number; emoji: string; x: number; size: number; }
interface HandRequest { identity: string; name: string; avatar?: string | null; }
interface GiftTick    { id: string; emoji: string; senderName: string; giftName: string; coins: number; }

// ── Chat ──────────────────────────────────────────────────────────────────────

interface LiveChatHandle { addSysMsg: (text: string) => void; }

const LiveChat = forwardRef<LiveChatHandle, {
  liveId: string; accessToken: string | null; isHost: boolean; hostId?: string | null;
  mobileInputTarget?: HTMLElement | null;
  onWsEvent: (d: any) => void;
}>(function LiveChatInner({ liveId, accessToken, isHost, hostId, mobileInputTarget, onWsEvent }, ref) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const wsRef        = useRef<WebSocket | null>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const onWsEventRef = useRef(onWsEvent);
  const { user }  = useAuthStore();
  const { confirm: confirmChat, ConfirmDialog: ConfirmChatDialog } = useConfirm();

  // Garder la ref a jour sans recréer le WS
  useEffect(() => { onWsEventRef.current = onWsEvent; }, [onWsEvent]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    const base = WS_BASE_URL || window.location.origin.replace(/^http/, 'ws');
    const ws = new WebSocket(`${base}/api/v1/social/comments/ws/live/${liveId}?token=${accessToken}`);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      if (cancelled) return;
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'comment_added' && d.comment) {
          const c = d.comment;
          setMessages(prev => {
            // Si c'est l'écho de notre propre message, remplacer l'entrée locale
            // optimiste (id "local-...") au lieu d'en ajouter une deuxième.
            const isOwnEcho = c.author?.id && user && c.author.id === user.id;
            const withoutLocalDupe = isOwnEcho
              ? prev.filter(m => !(m.id.startsWith('local-') && m.text === c.body && m.userId === user!.id))
              : prev;
            return [...withoutLocalDupe.slice(-149), {
              id:     c.id ?? String(Date.now()),
              user:   c.author?.display_name ?? c.author?.username ?? 'Anonyme',
              userId: c.author?.id ?? null,
              avatar: c.author?.avatar_url ?? null,
              text:   c.body,
              likeCount:    c.like_count ?? 0,
              dislikeCount: c.dislike_count ?? 0,
            }];
          });
        }
        if (d.type === 'reaction_updated' && d.comment_id) {
          setMessages(prev => prev.map(m => m.id === d.comment_id
            ? { ...m, likeCount: d.like_count ?? m.likeCount, dislikeCount: d.dislike_count ?? m.dislikeCount }
            : m));
        }
        if (d.type === 'gift_received' && d.gift) {
          const gName   = d.gift.gift_type?.name  ?? d.gift.name  ?? 'Cadeau';
          const gSender = d.gift.sender?.display_name ?? d.gift.sender?.username ?? 'Quelqu\'un';
          setMessages(prev => [...prev.slice(-149), {
            id:     `gift-${Date.now()}`,
            user:   gSender,
            text:   `${gSender} a envoyé ${gName}`,
            isGift: true,
          }]);
        }
        onWsEventRef.current(d);
      } catch { /* ignore */ }
    };
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('{"type":"ping"}');
    }, 25_000);
    return () => {
      cancelled = true;
      clearInterval(ping);
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => ws.close();
      } else {
        ws.close();
      }
    };
  }, [liveId, accessToken]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function toggleCommentReaction(msgId: string, type: 'like' | 'dislike') {
    if (msgId.startsWith('local-')) return; // pas encore d'id serveur
    const prevMsgs = messages;
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const wasLike    = m.myReaction === 'like';
      const wasDislike = m.myReaction === 'dislike';
      const nowSame    = m.myReaction === type;
      return {
        ...m,
        myReaction:   nowSame ? null : type,
        likeCount:    (m.likeCount ?? 0)    + (type === 'like'    ? (nowSame ? -1 : wasLike    ? 0 : 1) : (wasLike    ? -1 : 0)),
        dislikeCount: (m.dislikeCount ?? 0) + (type === 'dislike' ? (nowSame ? -1 : wasDislike ? 0 : 1) : (wasDislike ? -1 : 0)),
      };
    }));
    try {
      await apiClient.post(Endpoints.social.toggleReaction, { reaction_type: type, comment_id: msgId });
    } catch {
      setMessages(prevMsgs); // rollback
    }
  }

  async function send() {
    if (!input.trim() || sending) return;
    const body = input.trim();
    setMessages(prev => [...prev.slice(-149), {
      id: `local-${Date.now()}`, user: user?.display_name ?? user?.username ?? 'Moi',
      userId: user?.id, avatar: user?.avatar_url ?? null, text: body,
    }]);
    setInput('');
    setSending(true);
    try { await apiClient.post(Endpoints.social.comments, { body, live_id: liveId }); }
    catch { /* silencieux */ }
    finally { setSending(false); }
  }

  const addSysMsg = useCallback((text: string) => {
    setMessages(prev => [...prev.slice(-149), { id: `sys-${Date.now()}`, user: '', text, isSys: true }]);
  }, []);

  useImperativeHandle(ref, () => ({ addSysMsg }), [addSysMsg]);

  async function deleteMsg(msgId: string) {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    try { await apiClient.delete(Endpoints.social.commentById(msgId)); } catch { /* ignore */ }
  }

  async function banFromMsg(identity: string, name: string) {
    const ok = await confirmChat({ title: `Exclure ${name} ?`, message: 'Le viewer sera banni de ce live.', danger: true, confirmLabel: 'Exclure' });
    if (!ok) return;
    try { await apiClient.post(Endpoints.lives.ban(liveId, identity)); } catch { /* ignore */ }
    addSysMsg(`${name} a été exclu du live`);
  }

  async function sendQuick(text: string) {
    if (sending) return;
    setMessages(prev => [...prev.slice(-149), {
      id: `local-${Date.now()}`, user: user?.display_name ?? user?.username ?? 'Moi',
      userId: user?.id, avatar: user?.avatar_url ?? null, text,
    }]);
    setSending(true);
    try { await apiClient.post(Endpoints.social.comments, { body: text, live_id: liveId }); }
    catch { /* silencieux */ }
    finally { setSending(false); }
  }

  const QUICK_REACTIONS = [
    { label: 'Salut',    emoji: '👋' },
    { label: "J'adore",  emoji: '😍' },
    { label: 'Haha',     emoji: '😂' },
    { label: 'Wow',      emoji: '😮' },
    { label: 'Triste',   emoji: '😢' },
  ];

  const inputBar = (
    <div className="flex flex-col gap-2 pointer-events-auto min-w-0">
      {/* Réactions rapides — un tap envoie directement le commentaire */}
      <div className="flex items-center gap-1.5 overflow-x-auto min-w-0" style={{ scrollbarWidth: 'none' }}>
        {QUICK_REACTIONS.map(r => (
          <button key={r.label} onClick={() => sendQuick(`${r.emoji} ${r.label}`)}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-transform active:scale-95"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <span>{r.emoji}</span> {r.label}
          </button>
        ))}
      </div>
      <div className="relative flex gap-2">
        <input
          className="flex-1 min-w-0 text-white text-sm rounded-full px-3.5 py-2 focus:outline-none focus:ring-1"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', '--tw-ring-color': '#7B3FF2' } as any}
          placeholder="Écris un commentaire..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
        />
        <button onClick={send} disabled={sending || !input.trim()}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
          <Send size={14} className="text-white" />
        </button>
      </div>
    </div>
  );

  // Liste de commentaires en flux normal (fond opaque), plus un overlay flottant
  // sur la vidéo — chaque message est une ligne avatar + nom + texte, scrollable
  // indépendamment. La saisie est fournie par le composant parent (LiveCommentBar)
  // et rendue ici en portail pour rester dans le même flux WS/état que la liste.
  return (
    <div className="px-3 py-2 flex flex-col gap-2"
      style={{ background: 'rgba(15,15,20,0.97)', flex: '1 1 0%', minHeight: 0, overflowY: 'auto' }}>
      {messages.length === 0 && (
        <p className="text-xs text-center py-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Aucun commentaire pour le moment
        </p>
      )}
      {messages.map(m => {
        if (m.isSys) return (
          <div key={m.id} className="text-[11px] py-1 px-2.5 rounded-full w-fit"
            style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.06)' }}>{m.text}</div>
        );
        if (m.isGift) return (
          <div key={m.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs w-fit"
            style={{ background: 'rgba(80,60,0,0.35)', border: '1px solid rgba(255,215,0,0.3)' }}>
            <Gift size={13} style={{ color: '#fbbf24', flexShrink: 0 }} />
            <span className="font-medium" style={{ color: '#fde68a' }}>{m.text}</span>
          </div>
        );
        const isMe   = m.userId && user && m.userId === user.id;
        const canMod = isHost && m.userId && !isMe;
        const isMsgHost = m.userId && hostId && m.userId === hostId;
        return (
          <div key={m.id} className="group flex items-start gap-2">
            <Avatar src={m.avatar} name={m.user} size="xs" className="shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold" style={{ color: isMsgHost ? '#c4b5fd' : '#a78bfa' }}>
                  {m.user}
                </span>
                {isMsgHost && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: '#7B3FF2' }}>Hôte</span>
                )}
              </div>
              <span className="text-sm break-words whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.92)' }}>{m.text}</span>
            </div>
            {!m.id.startsWith('local-') && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => toggleCommentReaction(m.id, 'like')}
                  className="flex items-center gap-0.5 transition-transform active:scale-90"
                  style={{ color: m.myReaction === 'like' ? '#7B3FF2' : 'rgba(255,255,255,0.4)' }}>
                  <ThumbsUp size={12} fill={m.myReaction === 'like' ? '#7B3FF2' : 'none'} />
                  {!!m.likeCount && <span className="text-[10px] font-semibold">{m.likeCount}</span>}
                </button>
                {canMod && (
                  <div className="hidden group-hover:flex gap-1.5 shrink-0">
                    <button onClick={() => deleteMsg(m.id)} title="Supprimer" style={{ color: '#f87171' }}>
                      <Trash2 size={12} />
                    </button>
                    <button onClick={() => banFromMsg(m.userId!, m.user)} title="Exclure" style={{ color: '#f87171' }}>
                      <Slash size={12} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <div ref={bottomRef} />

      {/* Saisie téléportée depuis le composant parent (LiveCommentBar, tout en bas de page) */}
      {mobileInputTarget && createPortal(inputBar, mobileInputTarget)}

      {ConfirmChatDialog}
    </div>
  );
});

// ── Panel demandes de prise de parole ─────────────────────────────────────────

function HandRequestsPanel({
  requests, onInvite, onDismiss, onClose,
}: {
  requests: HandRequest[];
  onInvite: (identity: string) => void;
  onDismiss: (identity: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 w-72"
      style={{
        background: 'rgba(10,10,25,0.95)', backdropFilter: 'blur(20px)',
        borderRadius: '1.25rem', border: '1px solid rgba(255,215,0,0.3)',
        boxShadow: '0 8px 40px rgba(255,215,0,0.15)',
        animation: 'fadeInDown 0.25s ease-out',
      }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,215,0,0.2)' }}>
        <span className="text-sm font-bold flex items-center gap-2" style={{ color: '#fbbf24' }}>
          <Hand size={14} />
          {requests.length} demande{requests.length > 1 ? 's' : ''} de scène
        </span>
        <button onClick={onClose} className="transition-colors p-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <X size={14} />
        </button>
      </div>
      {requests.length === 0 ? (
        <p className="text-xs px-4 py-5 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>Aucune demande en attente</p>
      ) : (
        <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
          {requests.map(r => (
            <div key={r.identity} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)' }}>
              <Avatar src={r.avatar} name={r.name} size="sm" className="shrink-0" />
              <span className="text-sm text-white truncate flex-1 font-semibold">{r.name}</span>
              <button onClick={() => onInvite(r.identity)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shrink-0 transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg,#7B3FF2,#A855F7)', boxShadow: '0 2px 10px rgba(123,63,242,0.4)' }}>
                <UserCheck size={12} className="inline mr-1" />Inviter
              </button>
              <button onClick={() => onDismiss(r.identity)} className="transition-colors shrink-0"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#f87171'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)'}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Panel participants sur scène ──────────────────────────────────────────────

function OnStagePanel({
  identities, names, onDemote, onClose,
}: {
  identities: Set<string>;
  names: Map<string, string>;
  onDemote: (identity: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute top-16 left-3 z-40 w-56"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', borderRadius: '1rem', border: '1px solid rgba(74,222,128,0.3)' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'rgba(74,222,128,0.2)' }}>
        <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: '#4ade80' }}>
          <Users size={12} /> Sur scène ({identities.size})
        </span>
        <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)' }}>
          <X size={13} />
        </button>
      </div>
      <div className="p-2 space-y-2 max-h-48 overflow-y-auto">
        {[...identities].map(id => (
          <div key={id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
            style={{ background: 'rgba(74,222,128,0.08)' }}>
            <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
            <span className="text-xs text-white truncate flex-1">{names.get(id) ?? id}</span>
            <button onClick={() => onDemote(id)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold"
              style={{ color: '#fb923c', background: 'rgba(251,146,60,0.15)' }}>
              <ArrowDown size={9} /> Retirer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Panel liste des participants ──────────────────────────────────────────────

function ParticipantsPanel({
  onGiftClick, onClose,
}: {
  onGiftClick: (identity: string, name: string) => void;
  onClose: () => void;
}) {
  const participants = useParticipants();
  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 w-72"
      style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(16px)', borderRadius: '1rem', border: '1px solid rgba(123,63,242,0.3)' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'rgba(123,63,242,0.2)' }}>
        <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: '#a78bfa' }}>
          <Users size={12} /> Participants ({participants.length})
        </span>
        <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)' }}>
          <X size={13} />
        </button>
      </div>
      <div className="p-2 space-y-1.5 max-h-72 overflow-y-auto">
        {participants.map(p => {
          const name = p.isLocal ? 'Toi' : (p.name || p.identity || 'Participant');
          return (
            <div key={p.identity} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg,#7B3FF2,#EC4899)' }}>
                {name[0]?.toUpperCase() ?? '?'}
              </div>
              <span className="text-xs text-white truncate flex-1">{name}</span>
              {!p.isLocal && (
                <button onClick={() => onGiftClick(p.identity, name)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0"
                  style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.15)' }}>
                  <Gift size={10} /> Cadeau
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Panel cadeaux reçus (host) ────────────────────────────────────────────────

function GiftHistoryPanel({
  history, onClose,
}: {
  history: GiftTick[];
  onClose: () => void;
}) {
  const total = history.reduce((s, t) => s + t.coins, 0);
  return (
    <div className="absolute top-16 right-3 z-40 w-64"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', borderRadius: '1rem', border: '1px solid rgba(255,215,0,0.25)' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'rgba(255,215,0,0.2)' }}>
        <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: '#fbbf24' }}>
          <Gift size={12} /> Cadeaux reçus ({history.length})
        </span>
        <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)' }}>
          <X size={13} />
        </button>
      </div>
      <div className="px-3 py-1.5 border-b" style={{ borderColor: 'rgba(255,215,0,0.1)' }}>
        <span className="text-xs font-bold" style={{ color: '#fde68a' }}>Total : {total.toLocaleString()} coins</span>
      </div>
      <div className="p-2 space-y-2 max-h-56 overflow-y-auto">
        {history.slice(0, 20).map((t, i) => (
          <div key={`${t.id}-${i}`} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,215,0,0.06)' }}>
            <span className="text-xl shrink-0">{t.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white font-semibold truncate">{t.senderName}</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{t.giftName}</p>
            </div>
            <span className="text-[10px] font-bold shrink-0" style={{ color: '#fbbf24' }}>{t.coins}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Menu modération vignette ──────────────────────────────────────────────────

function ParticipantContextMenu({
  identity, name, liveId, isOnStage, onDone,
}: {
  identity: string; name: string; liveId: string;
  isOnStage: boolean; onDone: () => void;
}) {
  async function act(endpoint: string) {
    try {
      await apiClient.post(endpoint);
    } catch (e: any) {
      import('react-hot-toast').then(({ default: toast }) =>
        toast.error(e?.response?.data?.detail ?? 'Action échouée'));
      return;
    }
    onDone();
  }

  return (
    <div
      className="absolute left-full top-0 ml-2 z-50 flex flex-col gap-0.5 py-1.5 px-1.5 rounded-xl shadow-2xl min-w-[140px]"
      style={{ background: 'rgba(15,15,20,0.96)', border: '1px solid rgba(255,255,255,0.08)' }}
      onClick={e => e.stopPropagation()}
    >
      <p className="text-[10px] px-2 py-0.5 mb-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{name}</p>
      {isOnStage ? (
        <button onClick={() => act(Endpoints.lives.demote(liveId, identity))}
          className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-lg w-full text-left hover:bg-white/10 transition-colors"
          style={{ color: '#fb923c' }}>
          <ArrowDown size={11} /> Retirer de scène
        </button>
      ) : (
        <button onClick={() => act(Endpoints.lives.invite(liveId, identity))}
          className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-lg w-full text-left hover:bg-white/10 transition-colors"
          style={{ color: '#a78bfa' }}>
          <UserCheck size={11} /> Monter sur scène
        </button>
      )}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '2px 4px' }} />
      <button onClick={() => act(Endpoints.lives.ban(liveId, identity))}
        className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-lg w-full text-left hover:bg-white/10 transition-colors"
        style={{ color: '#fca5a5' }}>
        <Ban size={11} /> Éjecter maintenant
      </button>
      <button onClick={() => act(Endpoints.lives.globalBan(liveId, identity))}
        className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-lg w-full text-left hover:bg-white/10 transition-colors"
        style={{ color: '#f87171' }}>
        <Ban size={11} /> Bannir (tous lives)
      </button>
      <button onClick={() => act(Endpoints.lives.blockUser(identity))}
        className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-lg w-full text-left hover:bg-white/10 transition-colors"
        style={{ color: '#a78bfa' }}>
        <Lock size={11} /> Bloquer de mes lives
      </button>
    </div>
  );
}

// ── Zone vidéo ────────────────────────────────────────────────────────────────

function useActiveSpeakersSet(): Set<string> {
  const room = useRoomContext();
  const [ids, setIds] = useState<Set<string>>(() => new Set(room.activeSpeakers.map(p => p.identity)));
  useEffect(() => {
    const handler = () => setIds(new Set(room.activeSpeakers.map(p => p.identity)));
    room.on(RoomEvent.ActiveSpeakersChanged, handler);
    return () => { room.off(RoomEvent.ActiveSpeakersChanged, handler); };
  }, [room]);
  return ids;
}

// Source de vérité unique pour l'état micro local — évite un state dupliqué
// entre l'avatar (LiveKitViewer) et la barre de contrôles (MediaControls).
function useLocalMicEnabled(): boolean {
  const { localParticipant } = useLocalParticipant();
  const [enabled, setEnabled] = useState(() => localParticipant.isMicrophoneEnabled);
  useEffect(() => {
    const sync = () => setEnabled(localParticipant.isMicrophoneEnabled);
    sync();
    localParticipant.on('trackMuted', sync);
    localParticipant.on('trackUnmuted', sync);
    localParticipant.on('localTrackPublished', sync);
    return () => {
      localParticipant.off('trackMuted', sync);
      localParticipant.off('trackUnmuted', sync);
      localParticipant.off('localTrackPublished', sync);
    };
  }, [localParticipant]);
  return enabled;
}

function LiveKitViewer({
  isHost, liveId, stageIdentities, participantNames, onGiftClick, streamerAvatarUrl, streamerName,
}: {
  isHost: boolean; liveId: string; stageIdentities: Set<string>;
  participantNames: Map<string, string>;
  onGiftClick: (identity: string, name: string) => void;
  streamerAvatarUrl?: string | null;
  streamerName?: string | null;
}) {
  const tracks       = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const participants = useParticipants();
  const speakingIds  = useActiveSpeakersSet();
  const { localParticipant } = useLocalParticipant();
  const micOn = useLocalMicEnabled();
  const [spotlightId,   setSpotlightId]   = useState<string | null>(null);
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [showMicHint,   setShowMicHint]   = useState(false);
  const micHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (micHintTimer.current) clearTimeout(micHintTimer.current); }, []);

  function revealMicHint() {
    if (!isHost) return;
    setShowMicHint(true);
    if (micHintTimer.current) clearTimeout(micHintTimer.current);
    micHintTimer.current = setTimeout(() => setShowMicHint(false), 2500);
  }

  async function activateCamera() {
    if (!isHost) return;
    try { await localParticipant.setCameraEnabled(true); } catch { /* permission refusée */ }
  }

  async function toggleMicFromAvatar(e: React.MouseEvent) {
    e.stopPropagation();
    try { await localParticipant.setMicrophoneEnabled(!micOn); } catch { /* permission refusée */ }
  }

  useEffect(() => {
    if (!contextMenuId) return;
    const close = () => setContextMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [contextMenuId]);

  const activeTracks = tracks.filter(t => !t.publication?.isMuted);

  const defaultSpotlight = isHost
    ? (activeTracks.find(t => t.participant.isLocal) ?? activeTracks[0] ?? null)
    : (activeTracks.find(t => !t.participant.isLocal) ?? activeTracks[0] ?? null);

  const spotlightTrack  = activeTracks.find(t => t.participant.identity === spotlightId) ?? defaultSpotlight;
  const thumbnailTracks = activeTracks.filter(t => t !== spotlightTrack);
  const localTrack      = activeTracks.find(t => t.participant.isLocal) ?? null;

  const showHostPip = isHost && spotlightTrack && !spotlightTrack.participant.isLocal && localTrack != null;

  // Grille façon TikTok multi-guest — dès 2 participants ou plus, tout le monde
  // s'affiche en cases égales adaptées au nombre (2 cases empilées, 3 en L, 4 en 2×2).
  // Avec 1 seul participant, on garde le mode spotlight plein écran classique.
  const isGridMode = activeTracks.length >= 2;

  if (activeTracks.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-white gap-3">
        <div className="relative"
          onMouseEnter={revealMicHint}
          onTouchStart={revealMicHint}
        >
          <button
            onClick={activateCamera}
            disabled={!isHost}
            className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-transform"
            style={{
              boxShadow: '0 0 0 3px rgba(123,63,242,0.5), 0 0 30px rgba(123,63,242,0.35)',
              cursor: isHost ? 'pointer' : 'default',
            }}
            title={isHost ? 'Activer ma caméra' : undefined}
          >
            <Avatar src={streamerAvatarUrl} name={streamerName} size="xl" className="w-full h-full animate-pulse" />
          </button>
          {isHost && showMicHint && (
            <button
              onClick={toggleMicFromAvatar}
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full flex items-center justify-center transition-all"
              style={{
                background: micOn ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)',
                border: '2px solid rgba(0,0,0,0.6)',
                animation: 'fadeInScale 0.2s ease-out',
              }}
              title={micOn ? 'Couper le micro' : 'Activer le micro'}
            >
              {micOn ? <Mic size={16} color="#fff" /> : <MicOff size={16} color="#fff" />}
            </button>
          )}
        </div>
        <p className="text-sm font-semibold">{streamerName}</p>
        <p className="text-sm opacity-60">
          {isHost ? 'Clique sur ta photo pour activer ta caméra' : 'En attente de la diffusion...'}
        </p>
        <p className="text-xs opacity-40">{participants.length} connecté(s)</p>
      </div>
    );
  }

  // ── Mode grille (2+ participants) — mosaïque égale façon TikTok multi-guest ──
  if (isGridMode) {
    // Disposition des cases : 2 → colonne de 2 (empilées), 3 → 1 en haut + 2 en bas,
    // 4 → 2×2, 5+ → 2 colonnes, hauteur de case fixe et scroll vertical si ça déborde.
    const n = activeTracks.length;
    const gridClass =
      n === 2 ? 'grid-cols-1 grid-rows-2' :
      n === 3 ? 'grid-cols-2 grid-rows-2' :
      n === 4 ? 'grid-cols-2 grid-rows-2' :
      'grid-cols-2 auto-rows-[160px]';
    const scrollable = n > 4;

    return (
      <div className="relative w-full h-full bg-black overflow-hidden">
        <RoomAudioRenderer />
        <div className={`grid ${gridClass} w-full gap-1.5 p-1.5 ${scrollable ? 'h-full overflow-y-auto' : 'h-full'}`}>
          {activeTracks.map((t, i) => {
            const identity = t.participant.identity;
            const name     = t.participant.isLocal ? 'Toi' : (participantNames.get(identity) ?? t.participant.name ?? identity);
            const onStage  = stageIdentities.has(identity);
            const speaking = speakingIds.has(identity);
            const showMenu = contextMenuId === identity;
            // Cas à 3 : le premier participant occupe toute la largeur du haut (col-span-2)
            const spanFull = n === 3 && i === 0;
            return (
              <div
                key={identity}
                className={`relative overflow-hidden rounded-xl ${spanFull ? 'col-span-2' : ''}`}
                style={{ border: `1.5px solid ${speaking ? '#22c55e' : 'rgba(255,255,255,0.12)'}` }}
                onClick={() => { if (showMenu) setContextMenuId(null); }}
              >
                <VideoTrack trackRef={t} className="w-full h-full object-cover" />
                {speaking && (
                  <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 3px #22c55e' }} />
                )}
                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
                  {onStage && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />}
                  {name}
                </div>
                {!t.participant.isLocal && (
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1.5">
                    <button
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.55)' }}
                      onClick={e => { e.stopPropagation(); onGiftClick(identity, name); }}>
                      <Gift size={13} style={{ color: '#fbbf24' }} />
                    </button>
                    {isHost && (
                      <button
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.55)' }}
                        onClick={e => { e.stopPropagation(); setContextMenuId(showMenu ? null : identity); }}>
                        <MoreVertical size={13} color="#fff" />
                      </button>
                    )}
                  </div>
                )}
                {showMenu && (
                  <ParticipantContextMenu
                    identity={identity} name={name} liveId={liveId}
                    isOnStage={onStage}
                    onDone={() => setContextMenuId(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Mode spotlight (1 seul participant) ──────────────────────────────────────
  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <RoomAudioRenderer />

      {spotlightTrack && (
        <VideoTrack trackRef={spotlightTrack} className="w-full h-full object-contain" />
      )}

      {spotlightTrack && (
        <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm z-10 flex items-center gap-1.5">
          {(stageIdentities.has(spotlightTrack.participant.identity) || speakingIds.has(spotlightTrack.participant.identity)) && (
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          )}
          {spotlightTrack.participant.isLocal ? 'Toi' : (participantNames.get(spotlightTrack.participant.identity) ?? spotlightTrack.participant.name ?? spotlightTrack.participant.identity)}
        </div>
      )}

      {/* PiP host */}
      {showHostPip && localTrack && (
        <div
          className="absolute bottom-20 right-4 w-28 h-40 rounded-2xl overflow-hidden shadow-2xl cursor-pointer z-20 transition-all"
          style={{ border: '2px solid rgba(255,255,255,0.4)' }}
          onClick={() => setSpotlightId(null)}
          title="Revenir sur ta vue"
        >
          <VideoTrack trackRef={localTrack} className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 text-white text-[10px] text-center py-1" style={{ background: 'rgba(0,0,0,0.6)' }}>Toi</div>
        </div>
      )}
    </div>
  );
}

// ── Avatars viewers empilés ───────────────────────────────────────────────────

function ViewerAvatars({ onGiftClick, fallbackButton, clickable = true }: {
  onGiftClick: (identity: string, name: string) => void;
  /** Affiche un cercle-icône Users par défaut quand personne n'est connecté,
   * au lieu de ne rien rendre — utile dans une barre d'actions (bouton toujours visible). */
  fallbackButton?: boolean;
  /** Désactive le clic individuel d'envoi de cadeau sur chaque avatar — utile
   * quand ce composant sert juste d'aperçu visuel dans un bouton englobant
   * (ex: "Participants") dont le clic doit toujours ouvrir la liste complète. */
  clickable?: boolean;
}) {
  const participants = useParticipants();
  const remotesAll   = participants.filter(p => !p.isLocal);
  const remotes       = remotesAll.slice(0, 6);
  const extraMobile   = Math.max(0, remotesAll.length - 3);
  const extraDesktop  = Math.max(0, remotesAll.length - 6);
  if (remotes.length === 0) {
    if (!fallbackButton) return null;
    return (
      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.15)' }}>
        <Users size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
      </div>
    );
  }
  return (
    <div className="flex items-center">
      {remotes.map((p, i) => {
        const name = p.name || p.identity || '?';
        const commonProps = {
          key: p.identity,
          style: { marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i, background: 'linear-gradient(135deg,#7B3FF2,#EC4899)', borderColor: 'rgba(0,0,0,0.6)' } as React.CSSProperties,
          className: `${i >= 3 ? 'hidden sm:flex' : 'flex'} w-6 h-6 sm:w-7 sm:h-7 rounded-full items-center justify-center text-white text-[9px] sm:text-[10px] font-bold border-2 ${clickable ? 'hover:scale-110 transition-transform' : ''}`,
        };
        if (!clickable) {
          return <div {...commonProps}>{name[0].toUpperCase()}</div>;
        }
        return (
          <button
            {...commonProps}
            onClick={() => onGiftClick(p.identity, name)}
            title={`Envoyer un cadeau à ${name}`}
          >
            {name[0].toUpperCase()}
          </button>
        );
      })}
      {extraMobile > 0 && (
        <div
          className="sm:hidden w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold border-2 border-black/60"
          style={{ marginLeft: -8, background: 'rgba(255,255,255,0.2)' }}>
          +{extraMobile}
        </div>
      )}
      {extraDesktop > 0 && (
        <div
          className="hidden sm:flex w-7 h-7 rounded-full items-center justify-center text-white text-[9px] font-bold border-2 border-black/60"
          style={{ marginLeft: -8, background: 'rgba(255,255,255,0.2)' }}>
          +{extraDesktop}
        </div>
      )}
    </div>
  );
}

// ── Compteur viewers ──────────────────────────────────────────────────────────

function ViewerCount() {
  const participants = useParticipants();
  return (
    <span className="text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm shrink-0"
      style={{ background: 'rgba(0,0,0,0.6)' }}>
      <Eye size={10} className="shrink-0" /> {participants.length.toLocaleString()}
    </span>
  );
}

// ── Contrôles média latéraux ──────────────────────────────────────────────────

function MediaControls({
  isHost, liveId, onStop, stopping, onLeave, onHandRaise, handRaised,
  onToggleRequests, pendingCount, onToggleOnStage, onStageCount,
  onToggleGifts, giftsCount, onGiftToHost,
  isOnStage, onLeaveStage, onToggleSettings, onStageDetected,
}: {
  isHost: boolean; liveId: string;
  onStop: () => void; stopping: boolean; onLeave: () => void;
  onHandRaise: () => void; handRaised: boolean;
  onToggleRequests: () => void; pendingCount: number;
  onToggleOnStage: () => void; onStageCount: number;
  onToggleGifts: () => void; giftsCount: number;
  onGiftToHost?: () => void;
  isOnStage?: boolean; onLeaveStage?: () => void;
  onToggleSettings?: () => void;
  /** Appelé dès que LiveKit confirme can_publish=true pour ce participant —
   * source de vérité indépendante de l'event WS applicatif live_guest_invited
   * (qui transite par un canal séparé et peut se perdre si la connexion WS
   * de chat est coupée au mauvais moment). */
  onStageDetected?: () => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const micOn = useLocalMicEnabled();
  const [camOn, setCamOn] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // Filet de sécurité : synchronise isOnStage sur la vraie permission LiveKit,
  // au cas où l'event WS live_guest_invited n'arrive jamais côté viewer.
  useEffect(() => {
    if (isHost) return;
    function sync() {
      if (localParticipant.permissions?.canPublish) onStageDetected?.();
    }
    sync();
    localParticipant.on(ParticipantEvent.ParticipantPermissionsChanged, sync);
    return () => { localParticipant.off(ParticipantEvent.ParticipantPermissionsChanged, sync); };
  }, [localParticipant, isHost, onStageDetected]);

  // Active cam+mic automatiquement pour le host
  useEffect(() => {
    if (!isHost) return;
    let cancelled = false;
    async function enableMedia() {
      try {
        await localParticipant.setCameraEnabled(true);
        if (!cancelled) setCamOn(true);
        await localParticipant.setMicrophoneEnabled(true);
      } catch { /* permission refusée */ }
    }
    enableMedia();
    return () => { cancelled = true; };
  }, [localParticipant, isHost]);

  // Active cam+mic automatiquement pour le guest dès qu'il monte sur scène —
  // sinon il apparaît sur scène sans image/son tant qu'il n'a pas cliqué
  // manuellement sur Cam/Micro, ce qui donnait l'impression qu'il ne montait pas.
  useEffect(() => {
    if (isHost || !isOnStage) return;
    let cancelled = false;
    async function enableGuestMedia() {
      try {
        await localParticipant.setCameraEnabled(true);
        if (!cancelled) setCamOn(true);
        await localParticipant.setMicrophoneEnabled(true);
      } catch { /* permission refusée */ }
    }
    enableGuestMedia();
    return () => { cancelled = true; };
  }, [localParticipant, isHost, isOnStage]);

  async function toggleCam() {
    const next = !camOn;
    await localParticipant.setCameraEnabled(next);
    setCamOn(next);
  }

  async function flipCam() {
    try {
      const devices    = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      if (videoInputs.length < 2) return;
      const current   = localParticipant.getTrackPublication(Track.Source.Camera);
      const currentId = (current?.track as any)?.mediaStreamTrack?.getSettings?.()?.deviceId;
      const next      = videoInputs.find(d => d.deviceId !== currentId) ?? videoInputs[0];
      await (localParticipant as any).switchActiveDevice('videoinput', next.deviceId);
    } catch { /* ignore */ }
  }

  // Contrôles guest sur scène — câblage LiveKit réel
  async function toggleGuestCam() {
    const pub = localParticipant.getTrackPublication(Track.Source.Camera);
    if (pub?.track) {
      const next = pub.isMuted;
      await localParticipant.setCameraEnabled(next);
      setCamOn(next);
    } else {
      try {
        await localParticipant.setCameraEnabled(true);
        setCamOn(true);
      } catch { /* permission refusée */ }
    }
  }
  async function toggleGuestMic() {
    const pub = localParticipant.getTrackPublication(Track.Source.Microphone);
    if (pub?.track) {
      await localParticipant.setMicrophoneEnabled(pub.isMuted);
    } else {
      try { await localParticipant.setMicrophoneEnabled(true); } catch { /* permission refusée */ }
    }
  }

  // Sync état cam avec l'état LiveKit réel pour le guest (le micro suit useLocalMicEnabled)
  useEffect(() => {
    if (isHost || !isOnStage) return;
    const camPub = localParticipant.getTrackPublication(Track.Source.Camera);
    setCamOn(camPub ? !camPub.isMuted : false);
  }, [isOnStage, localParticipant, isHost]);

  function SideBtn({ icon, label, onClick, active, color, badge, danger }: {
    icon: React.ReactNode; label: string; onClick?: () => void;
    active?: boolean; color?: string; badge?: number; danger?: boolean;
  }) {
    const bg     = danger ? 'rgba(239,68,68,0.2)' : active ? `${color ?? '#7B3FF2'}25` : 'rgba(255,255,255,0.12)';
    const border = danger ? '#EF4444' : active ? (color ?? '#7B3FF2') : 'rgba(255,255,255,0.15)';
    const txt    = danger ? '#EF4444' : active ? (color ?? '#7B3FF2') : 'rgba(255,255,255,0.7)';
    return (
      <button onClick={onClick} className="flex flex-col items-center gap-0.5 sm:gap-1 relative shrink-0" style={{ minWidth: 40 }}>
        <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all"
          style={{ background: bg, border: `1.5px solid ${border}`, color: danger ? '#EF4444' : active ? (color ?? '#7B3FF2') : '#fff' }}>
          {icon}
        </div>
        {badge !== undefined && badge > 0 && (
          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ background: color ?? '#7B3FF2' }}>
            {badge}
          </div>
        )}
        <span className="text-[9px] sm:text-[10px] font-semibold whitespace-nowrap" style={{ color: txt }}>{label}</span>
      </button>
    );
  }

  function MoreMenuItem({ icon, label, onClick, badge }: {
    icon: React.ReactNode; label: string; onClick: () => void; badge?: number;
  }) {
    return (
      <button onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors"
        style={{ color: '#fff' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: '#7B3FF2' }}>
            {badge}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-4 shrink-0">

      {/* HOST — barre principale : essentiel uniquement, le reste dans le menu "Plus" */}
      {isHost && (
        <>
          <SideBtn icon={camOn ? <VideoIcon size={19} /> : <VideoOff size={19} />}
            label={camOn ? 'Cam' : 'Cam off'} onClick={toggleCam} active={camOn} color="#10B981" />

          <SideBtn icon={<StopCircle size={19} />}
            label={stopping ? '...' : 'Terminer'} onClick={onStop} danger />
        </>
      )}

      {/* VIEWER sur scène */}
      {!isHost && isOnStage && (
        <>
          <SideBtn
            icon={camOn ? <VideoIcon size={19} /> : <VideoOff size={19} />}
            label={camOn ? 'Cam' : 'Cam off'}
            onClick={toggleGuestCam} active={camOn} color="#10B981" />
          <SideBtn
            icon={micOn ? <Mic size={19} /> : <MicOff size={19} />}
            label={micOn ? 'Micro' : 'Muet'}
            onClick={toggleGuestMic} active={micOn} color="#10B981" />
          <SideBtn
            icon={<ArrowDown size={19} />} label="Descendre"
            onClick={onLeaveStage} danger />
          <SideBtn
            icon={<X size={19} />} label="Quitter"
            onClick={onLeave} danger />
        </>
      )}

      {/* VIEWER normal */}
      {!isHost && !isOnStage && (
        <>
          <SideBtn
            icon={<Hand size={19} />}
            label={handRaised ? 'En attente...' : 'Lever main'}
            onClick={onHandRaise} active={handRaised} color="#fbbf24" />
          <SideBtn
            icon={<X size={19} />} label="Quitter"
            onClick={onLeave} danger />
        </>
      )}
    </div>
  );
}

// ── Watcher toast arrivée viewer ──────────────────────────────────────────────

function JoinToastWatcher({ isHost, onJoin }: { isHost: boolean; onJoin: (name: string) => void }) {
  const participants = useParticipants();
  const prevCount = useRef(0);
  useEffect(() => {
    if (!isHost) return;
    const curr = participants.filter(p => !p.isLocal).length;
    if (curr > prevCount.current) {
      const newest = participants.filter(p => !p.isLocal).at(-1);
      if (newest) onJoin(newest.name || newest.identity || 'Quelqu\'un');
    }
    prevCount.current = curr;
  }, [participants, isHost, onJoin]);
  return null;
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function LiveSimplePage() {
  const { id: slug }  = useParams<{ id: string }>();
  const id             = decodeId(slug!);
  const navigate       = useNavigate();
  const location       = useLocation();
  const { user, accessToken } = useAuthStore();
  const { confirm, ConfirmDialog } = useConfirm();

  const stateToken: string | null = (location.state as any)?.publisherToken ?? null;
  const stateLkUrl: string | null = (location.state as any)?.livekitUrl ?? null;

  const [lkToken,  setLkToken]  = useState<string | null>(stateToken);
  const [lkUrl,    setLkUrl]    = useState<string | null>(stateLkUrl);
  const [stopping, setStopping] = useState(false);
  const [showLaunchBanner, setShowLaunchBanner] = useState(false);
  const [joinToast, setJoinToast] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);

  const [emojiFloats, setEmojiFloats] = useState<EmojiFloat[]>([]);

  // Cadeaux
  const [giftNotifs,  setGiftNotifs]  = useState<GiftNotif[]>([]);
  const [activeToast, setActiveToast] = useState<GiftNotif | null>(null);
  const [giftTarget,  setGiftTarget]  = useState<{ id: string; name: string } | null>(null);
  const [giftHistory, setGiftHistory] = useState<GiftTick[]>([]);

  // Modération
  const [handRequests,     setHandRequests]     = useState<HandRequest[]>([]);
  const [stageIdentities,  setStageIdentities]  = useState<Set<string>>(new Set());
  const [participantNames, setParticipantNames] = useState<Map<string, string>>(new Map());
  const [handRaised,       setHandRaised]       = useState(false);

  // Scène payante — modal de confirmation avant hand-raise
  const [showStageGate, setShowStageGate] = useState(false);
  const [stageGateLive, setStageGateLive] = useState<LiveStream | null>(null);

  // Guest sur scène
  const [isOnStage,  setIsOnStage]  = useState(false);

  // Panels
  const [showRequests,     setShowRequests]     = useState(false);
  const [showOnStage,      setShowOnStage]      = useState(false);
  const [showGifts,        setShowGifts]        = useState(false);
  const [showSettings,     setShowSettings]     = useState(false);
  const [showDesktopMore,  setShowDesktopMore]  = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  // Données live localement mutable (monétisation)
  const [liveOverride, setLiveOverride] = useState<Partial<LiveStream>>({});


  const chatRef             = useRef<LiveChatHandle>(null);
  const participantNamesRef = useRef<Map<string, string>>(new Map());
  const [mobileChatInputEl, setMobileChatInputEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => { participantNamesRef.current = participantNames; }, [participantNames]);

  const liveApi = useApi<LiveStream>(() => apiClient.get<LiveStream>(Endpoints.lives.byId(id!)), [id]);
  const { lastLiveEnded } = useWs();
  const suggestedLives = useLiveSuggestions(id!);

  const live     = liveApi.data ? { ...liveApi.data, ...liveOverride } as LiveStream : null;
  const isHost   = !!(live && user && live.user_id === user.id);
  const isActive = live?.status === 'active';

  // Charge le vrai statut d'abonnement au host — sinon le bouton "Suivre"
  // repart toujours à zéro visuellement même si on le suit déjà.
  useEffect(() => {
    if (!live?.user?.id || isHost) return;
    apiClient.get<{ is_followed?: boolean }>(Endpoints.users.publicProfile(live.user.id))
      .then(r => setFollowing(!!r.data?.is_followed))
      .catch(() => {});
  }, [live?.user?.id, isHost]);

  // Filet de sécurité : si le host ferme l'onglet / rafraîchit / perd la connexion
  // sans passer par le bouton Quitter/Terminer, on tente quand même d'arrêter le
  // live côté serveur pour ne jamais le laisser actif sans personne pour le stopper.
  // keepalive:true permet à la requête de survivre à la fermeture de la page
  // (contrairement à sendBeacon, qui ne peut pas porter le header Authorization).
  // stopRequestedRef évite un appel redondant quand l'arrêt volontaire (bouton
  // Terminer/Quitter) a déjà été déclenché juste avant que la page se décharge.
  const stopRequestedRef = useRef(false);
  useEffect(() => {
    if (!isHost || !isActive || !id || !accessToken) return;
    const stopBeacon = () => {
      if (stopRequestedRef.current) return;
      try {
        fetch(`${API_BASE_URL}/api/v1/lives/${id}/stop`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          keepalive: true,
        });
      } catch { /* ignore */ }
    };
    window.addEventListener('pagehide', stopBeacon);
    return () => window.removeEventListener('pagehide', stopBeacon);
  }, [isHost, isActive, id, accessToken]);

  // Accès payant — vérifié avant de charger le token LiveKit (viewers uniquement,
  // le host a toujours accès à son propre live).
  const [accessGranted,  setAccessGranted]  = useState(false);
  const [accessChecked,  setAccessChecked]  = useState(false);
  const needsAccessGate = !!(live && live.is_monetized && !isHost && !accessGranted);

  useEffect(() => {
    if (!id || !live || isHost || !live.is_monetized) { setAccessChecked(true); return; }
    apiClient.get<{ has_access: boolean }>(Endpoints.lives.checkAccess(id))
      .then(r => { if (r.data.has_access) setAccessGranted(true); })
      .catch(() => {})
      .finally(() => setAccessChecked(true));
  }, [id, live?.is_monetized, isHost]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!id || !isActive || !live || lkToken) return;
    if (needsAccessGate || !accessChecked) return;
    apiClient.get<StreamToken>(Endpoints.lives.token(id))
      .then(r => {
        setLkToken(r.data.token);
        setLkUrl(r.data.livekit_url);
        if (isHost) {
          setShowLaunchBanner(true);
          setTimeout(() => setShowLaunchBanner(false), 4000);
        }
      })
      .catch(() => {});
  }, [id, isActive, live, lkToken, isHost, needsAccessGate, accessChecked]);

  useEffect(() => {
    if (!lastLiveEnded || lastLiveEnded !== id) return;
    liveApi.refetch();
  }, [lastLiveEnded, id]);

  const handleWsEvent = useCallback((d: any) => {
    switch (d.type) {
      case 'gift_received': {
        const receiverId = d.gift?.receiver_id ?? null;
        // Le cadeau peut être destiné à n'importe qui dans le live (host ou
        // guest sur scène) — on précise le destinataire dès que ce n'est pas
        // le host, sinon le toast/ticker laisse croire qu'il l'a reçu lui-même.
        const isForHost = !!receiverId && receiverId === live?.user?.id;
        const n: GiftNotif = {
          id:         d.gift?.id ?? String(Date.now()),
          senderName: d.gift?.sender?.display_name ?? d.gift?.sender?.username ?? 'Quelqu\'un',
          emoji:      d.gift?.gift_type?.emoji ?? d.gift?.emoji ?? '',
          giftName:   d.gift?.gift_type?.name  ?? d.gift?.name  ?? 'Cadeau',
          coins:      d.gift?.coins_spent ?? d.gift?.coins_cost ?? 0,
          receiverName: isForHost ? undefined : (participantNamesRef.current.get(receiverId) ?? undefined),
        };
        setGiftNotifs(prev => [...prev.slice(-9), n]);
        setGiftHistory(prev => [...prev, { ...n }]);
        if (isHost && isForHost) setActiveToast(n);
        setTimeout(() => setGiftNotifs(prev => prev.filter(x => x.id !== n.id)), 4000);
        break;
      }
      case 'reaction_added': {
        const emoji = d.reaction?.emoji ?? d.emoji ?? '❤️';
        const floatId = Date.now();
        const items: EmojiFloat[] = Array.from({ length: 5 }, (_, i) => ({
          id: floatId + i, emoji,
          x: (Math.random() - 0.5) * 40, size: Math.random() * 12 + 26,
        }));
        setEmojiFloats(prev => [...prev.slice(-30), ...items]);
        items.forEach(f => {
          setTimeout(() => setEmojiFloats(prev => prev.filter(x => x.id !== f.id)), 1800);
        });
        break;
      }
      case 'live_hand_raise': {
        const identity = d.identity ?? d.user?.identity;
        const name     = d.display_name ?? d.user?.display_name ?? d.user?.username ?? identity;
        const avatar   = d.avatar_url ?? d.user?.avatar_url ?? null;
        if (!identity) break;
        setHandRequests(prev => prev.some(r => r.identity === identity) ? prev : [...prev, { identity, name, avatar }]);
        setParticipantNames(prev => new Map(prev).set(identity, name));
        if (isHost) { setShowRequests(true); setShowOnStage(false); setShowGifts(false); }
        break;
      }
      case 'live_hand_dismissed': {
        // Le host a rejeté la demande — sans ça le bouton "Lever main" restait
        // bloqué en "En attente..." indéfiniment côté viewer concerné.
        const identity = d.identity ?? d.user?.identity;
        if (!identity) break;
        setHandRequests(prev => prev.filter(r => r.identity !== identity));
        if (user && identity === user.id) setHandRaised(false);
        break;
      }
      case 'live_guest_invited': {
        const identity = d.identity ?? d.user?.identity;
        if (!identity) break;
        setStageIdentities(prev => new Set([...prev, identity]));
        setHandRequests(prev => prev.filter(r => r.identity !== identity));
        chatRef.current?.addSysMsg(`${participantNamesRef.current.get(identity) ?? identity} est monté sur scène`);
        if (user && identity === user.id) { setIsOnStage(true); setHandRaised(false); }
        break;
      }
      case 'live_guest_demoted': {
        const identity = d.identity ?? d.user?.identity;
        if (!identity) break;
        setStageIdentities(prev => { const s = new Set(prev); s.delete(identity); return s; });
        chatRef.current?.addSysMsg(`${participantNamesRef.current.get(identity) ?? identity} a quitté la scène`);
        if (user && identity === user.id) setIsOnStage(false);
        break;
      }
      case 'viewer_kicked':
      case 'live_user_globally_banned': {
        const kickedId = d.identity ?? d.user_id;
        if (kickedId && user && kickedId === user.id) navigate(-1);
        break;
      }
      case 'like_added': {
        const floatId = Date.now();
        const items: EmojiFloat[] = Array.from({ length: 3 }, (_, i) => ({
          id: floatId + i, emoji: '❤️',
          x: (Math.random() - 0.5) * 30, size: Math.random() * 8 + 22,
        }));
        setEmojiFloats(prev => [...prev.slice(-30), ...items]);
        items.forEach(f => {
          setTimeout(() => setEmojiFloats(prev => prev.filter(x => x.id !== f.id)), 1800);
        });
        break;
      }
    }
  }, [isHost, user, navigate, live?.user?.id]);

  const handleStop = useCallback(async () => {
    if (!id) return;
    const ok = await confirm({ title: 'Terminer le live ?', message: 'Tous les viewers seront déconnectés.', danger: true, confirmLabel: 'Terminer' });
    if (!ok) return;
    stopRequestedRef.current = true;
    setStopping(true);
    try {
      await apiClient.post(Endpoints.lives.stop(id));
      liveApi.refetch();
    } catch { stopRequestedRef.current = false; }
    finally { setStopping(false); }
  }, [id, liveApi, confirm]);

  const handleLeave = useCallback(async () => {
    // Le host qui quitte arrête le live pour tout le monde (même confirmation
    // que le bouton Terminer) — un live ne doit jamais rester actif sans host.
    if (isHost && isActive) {
      await handleStop();
      navigate(-1);
      return;
    }
    if (isActive) {
      const ok = await confirm({ title: 'Quitter le live ?', danger: false, confirmLabel: 'Quitter' });
      if (!ok) return;
    }
    navigate(-1);
  }, [navigate, isActive, isHost, handleStop, confirm]);

  const toggleFollow = useCallback(async () => {
    if (!live?.user?.id) return;
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    try {
      if (wasFollowing) await apiClient.delete(Endpoints.users.follow(live.user.id));
      else await apiClient.post(Endpoints.users.follow(live.user.id));
    } catch { setFollowing(wasFollowing); }
  }, [live?.user?.id, following]);

  const doRaiseHand = useCallback(async () => {
    if (!id || !user) return;
    setHandRaised(true);
    try { await apiClient.post(Endpoints.lives.handRaise(id, user.id)); }
    catch { setHandRaised(false); }
  }, [id, user]);

  const handleHandRaise = useCallback(async () => {
    if (!id || !user || handRaised) return;
    // Refetch le live pour connaître l'état le plus récent de stage_monetized
    // (le host peut l'avoir activé après le chargement initial de la page).
    let current = live;
    try {
      const r = await apiClient.get<LiveStream>(Endpoints.lives.byId(id));
      current = r.data;
    } catch { /* on retente avec l'état déjà connu */ }
    if (current?.stage_monetized) {
      setStageGateLive(current);
      setShowStageGate(true);
      return;
    }
    await doRaiseHand();
  }, [id, user, handRaised, live, doRaiseHand]);

  const handleInvite = useCallback(async (identity: string) => {
    if (!id) return;
    try { await apiClient.post(Endpoints.lives.invite(id, identity)); } catch { /* silencieux */ }
    setStageIdentities(prev => new Set([...prev, identity]));
    setHandRequests(prev => prev.filter(r => r.identity !== identity));
    chatRef.current?.addSysMsg(`${participantNamesRef.current.get(identity) ?? identity} a été invité sur scène`);
  }, [id]);

  const handleDemote = useCallback(async (identity: string) => {
    if (!id) return;
    try { await apiClient.post(Endpoints.lives.demote(id, identity)); } catch { /* silencieux */ }
    setStageIdentities(prev => { const s = new Set(prev); s.delete(identity); return s; });
    chatRef.current?.addSysMsg(`${participantNamesRef.current.get(identity) ?? identity} a quitté la scène`);
  }, [id]);

  const handleDismiss = useCallback((identity: string) => {
    setHandRequests(prev => prev.filter(r => r.identity !== identity));
    if (id) apiClient.post(Endpoints.lives.dismissHand(id, identity)).catch(() => {});
  }, [id]);

  if (liveApi.loading) return <PageLoader />;
  if (!live) return <div className="p-6" style={{ color: 'var(--text-secondary)' }}>Live introuvable.</div>;

  if (isActive && needsAccessGate && accessChecked) {
    return (
      <LiveAccessGate
        live={live}
        liveId={id!}
        onAccessGranted={() => setAccessGranted(true)}
        onLeave={() => navigate(-1)}
      />
    );
  }

  return (
    <>
      <style>{LIVE_ANIMATIONS_CSS}</style>
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideUpSheet {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>

      <div className="flex h-full overflow-hidden bg-black lg:justify-center lg:gap-4 lg:p-4">
        <div className="flex-1 flex flex-col min-w-0 min-h-0 lg:flex-none lg:w-[980px]">

          {/* Header desktop — au-dessus de la carte vidéo, sur fond transparent */}
          <div className="hidden lg:flex items-start gap-3 mb-3">
            <button onClick={handleLeave}
              className="shrink-0 p-2 rounded-xl transition-colors mt-1"
              style={{ color: 'rgba(255,255,255,0.6)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
              title="Quitter le live">
              <ChevronLeft size={22} />
            </button>
            <Avatar src={live.user?.avatar_url} name={live.user?.display_name ?? live.user?.username} size="lg" className="shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-white text-base truncate">{live.title}</p>
                <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <Eye size={12} /> {(live.current_viewers ?? 0).toLocaleString()}
                </span>
              </div>
              <p className="text-sm truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {live.user?.display_name ?? live.user?.username}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isHost && (
                <button onClick={toggleFollow}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: following ? 'rgba(123,63,242,0.12)' : 'linear-gradient(135deg,#7B3FF2,#5B2EC4)',
                    color: following ? 'var(--primary)' : '#fff',
                    border: following ? '1px solid rgba(123,63,242,0.3)' : 'none',
                  }}>
                  {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
                  {following ? 'Suivi' : 'Suivre'}
                </button>
              )}
              <button onClick={() => navigator.clipboard?.writeText(window.location.href)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Send size={14} /> Partager
              </button>
              {isHost && (
                <>
                  <button
                    onClick={() => { setShowRequests(v => !v); setShowOnStage(false); setShowGifts(false); setShowSettings(false); }}
                    className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all"
                    style={{
                      background: showRequests || handRequests.length > 0 ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.08)',
                      color: showRequests || handRequests.length > 0 ? '#fbbf24' : '#fff',
                      border: `1px solid ${showRequests || handRequests.length > 0 ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.15)'}`,
                    }}>
                    <Hand size={14} /> Demandes
                    {handRequests.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: '#fbbf24' }}>
                        {handRequests.length}
                      </span>
                    )}
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowDesktopMore(v => !v)}
                      className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
                      style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
                      <MoreVertical size={16} />
                    </button>
                    {showDesktopMore && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setShowDesktopMore(false)} />
                        <div className="absolute top-full right-0 mt-2 z-40 rounded-2xl overflow-hidden shadow-2xl"
                          style={{ background: 'rgba(20,20,26,0.97)', border: '1px solid rgba(255,255,255,0.12)', minWidth: 200, backdropFilter: 'blur(12px)' }}>
                          <button
                            onClick={() => { setShowOnStage(v => !v); setShowRequests(false); setShowGifts(false); setShowSettings(false); setShowDesktopMore(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors"
                            style={{ color: '#fff' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <Users size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
                            <span className="flex-1 text-left">Sur scène</span>
                            {stageIdentities.size > 0 && (
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#7B3FF2' }}>
                                {stageIdentities.size}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => { setShowGifts(v => !v); setShowRequests(false); setShowOnStage(false); setShowSettings(false); setShowDesktopMore(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors"
                            style={{ color: '#fff' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <Gift size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
                            <span className="flex-1 text-left">Cadeaux reçus</span>
                            {giftHistory.length > 0 && (
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#7B3FF2' }}>
                                {giftHistory.length}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => { setShowSettings(v => !v); setShowDesktopMore(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors"
                            style={{ color: '#fff' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <Settings size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
                            <span className="flex-1 text-left">Paramètres</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col min-w-0 lg:w-full lg:rounded-2xl lg:overflow-hidden"
            style={{ flex: '1 1 0%', minHeight: 0, overflow: 'hidden' }}>
          {isActive && lkToken && lkUrl ? (
            <LiveKitRoom
              token={lkToken}
              serverUrl={lkUrl}
              connect
              options={isHost ? CREATOR_ROOM_OPTIONS : VIEWER_ROOM_OPTIONS}
              className="flex flex-col min-w-0 lg:flex-row-reverse"
              style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}
            >
              <RoomAudioRenderer />
              <JoinToastWatcher isHost={isHost} onJoin={name => {
                setJoinToast(name);
                setTimeout(() => setJoinToast(null), 3000);
              }} />

            <div className="shrink-0 flex flex-col min-w-0 lg:flex-1 lg:h-full lg:min-h-0 lg:justify-between lg:overflow-y-auto">
              {/* Header mobile — remplacé par le header desktop au-dessus de la carte sur lg+ */}
              <div className="flex lg:hidden items-center gap-1.5 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 border-b shrink-0 flex-nowrap overflow-hidden"
                style={{ background: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)' }}>
                <button onClick={handleLeave} style={{ color: 'rgba(255,255,255,0.6)' }}
                  className="hover:text-white transition-colors shrink-0">
                  <ChevronLeft size={18} className="sm:hidden" />
                  <ChevronLeft size={20} className="hidden sm:block" />
                </button>
                <Avatar src={live.user?.avatar_url} name={live.user?.display_name ?? live.user?.username} size="sm" className="shrink-0 w-7 h-7 sm:w-8 sm:h-8" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white text-xs sm:text-sm truncate">{live.title}</p>
                  <p className="text-[10px] sm:text-xs truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{live.user?.display_name ?? live.user?.username}</p>
                </div>

                <div className="shrink-0">
                  <ViewerAvatars onGiftClick={(id, name) => setGiftTarget({ id, name })} />
                </div>

                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <span className="flex items-center gap-1 text-[10px] sm:text-xs font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-white"
                    style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 0 10px rgba(123,63,242,0.5)' }}>
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                  </span>
                  {live.is_private && (
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-white"
                      style={{ background: 'rgba(123,63,242,0.85)', border: '1px solid rgba(123,63,242,0.5)' }}>
                      <Lock size={10} /> Abonnés
                    </span>
                  )}
                  <LiveTimer startedAt={live.started_at} />
                  <ViewerCount />
                  {isHost && (
                    <>
                      <button
                        onClick={() => { setShowRequests(v => !v); setShowOnStage(false); setShowGifts(false); setShowSettings(false); }}
                        className="relative w-7 h-7 rounded-full flex items-center justify-center"
                        style={{
                          background: showRequests || handRequests.length > 0 ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.1)',
                          color: showRequests || handRequests.length > 0 ? '#fbbf24' : '#fff',
                        }}>
                        <Hand size={13} />
                        {handRequests.length > 0 && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                            style={{ background: '#fbbf24' }}>
                            {handRequests.length}
                          </span>
                        )}
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setShowDesktopMore(v => !v)}
                          className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                          <MoreVertical size={13} />
                        </button>
                        {showDesktopMore && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setShowDesktopMore(false)} />
                            <div className="absolute top-full right-0 mt-2 z-40 rounded-2xl overflow-hidden shadow-2xl"
                              style={{ background: 'rgba(20,20,26,0.97)', border: '1px solid rgba(255,255,255,0.12)', minWidth: 190, backdropFilter: 'blur(12px)' }}>
                              <button
                                onClick={() => { setShowOnStage(v => !v); setShowRequests(false); setShowGifts(false); setShowSettings(false); setShowDesktopMore(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors"
                                style={{ color: '#fff' }}>
                                <Users size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
                                <span className="flex-1 text-left">Sur scène</span>
                                {stageIdentities.size > 0 && (
                                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#7B3FF2' }}>
                                    {stageIdentities.size}
                                  </span>
                                )}
                              </button>
                              <button
                                onClick={() => { setShowGifts(v => !v); setShowRequests(false); setShowOnStage(false); setShowSettings(false); setShowDesktopMore(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors"
                                style={{ color: '#fff' }}>
                                <Gift size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
                                <span className="flex-1 text-left">Cadeaux reçus</span>
                                {giftHistory.length > 0 && (
                                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#7B3FF2' }}>
                                    {giftHistory.length}
                                  </span>
                                )}
                              </button>
                              <button
                                onClick={() => { setShowSettings(v => !v); setShowDesktopMore(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors"
                                style={{ color: '#fff' }}>
                                <Settings size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
                                <span className="flex-1 text-left">Paramètres</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>

              </div>

              {/* Vidéo — hauteur contenue, ne prend plus tout l'écran restant */}
              <div className="relative bg-black overflow-hidden shrink-0 rounded-2xl mx-2 mt-2 sm:mx-3 sm:mt-3 lg:mx-0 lg:mt-0 lg:rounded-none"
                style={{ height: '42vh', minHeight: 220, maxHeight: 420 }}>
                <LiveKitViewer
                  isHost={isHost} liveId={id!}
                  stageIdentities={stageIdentities}
                  participantNames={participantNames}
                  onGiftClick={(identity, name) => setGiftTarget({ id: identity, name })}
                  streamerAvatarUrl={live.user?.avatar_url}
                  streamerName={live.user?.display_name ?? live.user?.username}
                />

                {/* Badge "Tu es sur scène" */}
                {!isHost && isOnStage && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 0 20px rgba(123,63,242,0.6)' }}>
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    Tu es sur scène
                  </div>
                )}

                {/* Launch banner */}
                {showLaunchBanner && (
                  <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                    <div className="flex flex-col items-center gap-3 px-8 py-6 rounded-3xl text-white text-center"
                      style={{ background: 'rgba(123,63,242,0.9)', backdropFilter: 'blur(20px)', boxShadow: '0 0 60px rgba(123,63,242,0.5)', animation: 'fadeInScale 0.4s ease-out' }}>
                      <Radio size={36} style={{ color: '#fff' }} />
                      <p className="text-xl font-black">Tu es en direct !</p>
                      <p className="text-sm opacity-80">{live.title}</p>
                    </div>
                  </div>
                )}

                {/* Toast arrivée viewer */}
                {joinToast && (
                  <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2 px-3 py-2 rounded-xl text-white text-xs font-semibold"
                    style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', animation: 'fadeInLeft 0.3s ease' }}>
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    {joinToast} a rejoint
                  </div>
                )}

                {/* Panels modération */}
                {showRequests && (
                  <HandRequestsPanel
                    requests={handRequests}
                    onInvite={handleInvite} onDismiss={handleDismiss}
                    onClose={() => setShowRequests(false)}
                  />
                )}
                {showOnStage && stageIdentities.size > 0 && (
                  <OnStagePanel
                    identities={stageIdentities}
                    names={participantNames}
                    onDemote={handleDemote}
                    onClose={() => setShowOnStage(false)}
                  />
                )}
                {showGifts && giftHistory.length > 0 && (
                  <GiftHistoryPanel history={giftHistory} onClose={() => setShowGifts(false)} />
                )}
                {showParticipants && (
                  <ParticipantsPanel
                    onGiftClick={(pid, name) => { setGiftTarget({ id: pid, name }); setShowParticipants(false); }}
                    onClose={() => setShowParticipants(false)}
                  />
                )}

                <FloatingEmojiOverlay floats={emojiFloats} />

                {/* Gift toast host */}
                {isHost && activeToast && (
                  <div className="absolute top-3 right-3 z-30">
                    <GiftToast notif={activeToast} onDone={() => setActiveToast(null)} />
                  </div>
                )}
              </div>

              {/* Groupe bas — barre d'actions + description, collés ensemble et
                  poussés en bas de la carte sur desktop (justify-between sur le parent). */}
              <div className="shrink-0 flex flex-col">
              {/* Barre d'actions unique — contrôles techniques host (Cam/Terminer) et
                  interactions sociales (Like/Cadeau/Participants/Partager) sur la même
                  ligne, même gabarit de bouton (cercle w-9/sm:w-12 + label en dessous). */}
              <div className="shrink-0 flex items-center gap-2 sm:gap-4 px-2.5 sm:px-4 py-1.5 border-b"
                style={{ background: 'rgba(0,0,0,0.9)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <MediaControls
                  isHost={isHost} liveId={id!}
                  onStop={handleStop} stopping={stopping}
                  onLeave={handleLeave}
                  onHandRaise={handleHandRaise} handRaised={handRaised}
                  onToggleRequests={() => { setShowRequests(v => !v); setShowOnStage(false); setShowGifts(false); setShowSettings(false); }}
                  pendingCount={handRequests.length}
                  onToggleOnStage={() => { setShowOnStage(v => !v); setShowRequests(false); setShowGifts(false); setShowSettings(false); }}
                  onStageCount={stageIdentities.size}
                  onToggleGifts={() => { setShowGifts(v => !v); setShowRequests(false); setShowOnStage(false); setShowSettings(false); }}
                  giftsCount={giftHistory.length}
                  onGiftToHost={() => live?.user?.id && setGiftTarget({ id: live.user.id, name: live.user?.display_name ?? live.user?.username ?? 'Host' })}
                  isOnStage={isOnStage}
                  onLeaveStage={async () => {
                    try { await apiClient.post(Endpoints.lives.demote(id!, user?.id ?? '')); } catch {}
                    setIsOnStage(false);
                  }}
                  onToggleSettings={() => setShowSettings(v => !v)}
                  onStageDetected={() => setIsOnStage(true)}
                />
                <LiveLikeButton liveId={id!} initialCount={live.likes_count ?? 0} isHost={isHost} />
                {!isHost && (
                  <button
                    onClick={() => live?.user?.id && setGiftTarget({ id: live.user.id, name: live.user?.display_name ?? live.user?.username ?? 'Hôte' })}
                    className="flex flex-col items-center gap-0.5 sm:gap-1 shrink-0" style={{ minWidth: 40 }}>
                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all"
                      style={{ background: 'rgba(251,191,36,0.15)', border: '1.5px solid rgba(251,191,36,0.4)' }}>
                      <Gift size={18} style={{ color: '#fbbf24' }} />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-semibold whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.7)' }}>Cadeau</span>
                  </button>
                )}
                <div
                  role="button" tabIndex={0}
                  onClick={() => { setShowParticipants(v => !v); setShowRequests(false); setShowOnStage(false); setShowGifts(false); setShowSettings(false); }}
                  className="flex flex-col items-center gap-0.5 sm:gap-1 shrink-0 cursor-pointer" style={{ minWidth: 40 }}>
                  {/* Avatars non-cliquables ici — tout clic dans cette zone ouvre le
                      panel Participants, l'envoi de cadeau se fait depuis le panel. */}
                  <div className="flex items-center justify-center h-9 sm:h-12">
                    <ViewerAvatars fallbackButton clickable={false} onGiftClick={() => {}} />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-semibold whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.7)' }}>Participants</span>
                </div>
                <button
                  onClick={() => { navigator.clipboard?.writeText(window.location.href); }}
                  className="flex flex-col items-center gap-0.5 sm:gap-1 shrink-0" style={{ minWidth: 40 }}>
                  <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.15)' }}>
                    <Send size={17} style={{ color: 'rgba(255,255,255,0.85)' }} />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-semibold whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.7)' }}>Partager</span>
                </button>
                <div className="ml-auto">
                  <LiveReactionPicker
                    liveId={id!}
                    onFloats={items => {
                      setEmojiFloats(prev => [...prev.slice(-15), ...items]);
                      items.forEach(f => setTimeout(() => setEmojiFloats(prev => prev.filter(x => x.id !== f.id)), 2000));
                    }}
                  />
                </div>
              </div>

              {live.description && (
                <div className="hidden lg:block shrink-0 px-4 py-2.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.8)' }}>
                  <p className="text-xs line-clamp-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{live.description}</p>
                </div>
              )}
              </div>

              {/* Paramètres host — à l'intérieur de LiveKitRoom pour accès à useLocalParticipant */}
              {isHost && showSettings && (
                <LiveSettingsSheet
                  liveId={id!}
                  live={live}
                  handRequests={handRequests}
                  onInvite={handleInvite}
                  onDismissHand={handleDismiss}
                  onStopLive={() => { setShowSettings(false); handleStop(); }}
                  onMonetizationUpdated={patch => setLiveOverride(prev => ({ ...prev, ...patch }))}
                  onClose={() => setShowSettings(false)}
                />
              )}
            </div>

            {/* Colonne commentaires — à gauche du live sur desktop (lg:flex-row-reverse
                sur LiveKitRoom place cette colonne, déclarée en 2e, visuellement en 1er). */}
            <div className="flex-1 flex flex-col lg:w-[420px] lg:flex-none lg:shrink-0 lg:border-r"
              style={{ borderColor: 'rgba(255,255,255,0.08)', minHeight: 0, height: '100%', overflow: 'hidden' }}>
              {/* Gift ticker — juste au-dessus des commentaires */}
              {giftNotifs.length > 0 && (
                <div className="shrink-0 px-3 py-1.5">
                  <GiftTicker notifs={giftNotifs} />
                </div>
              )}

              {/* Commentaires — liste opaque en flux, scroll indépendant */}
              <LiveChat
                ref={chatRef}
                liveId={id!} accessToken={accessToken}
                isHost={isHost} hostId={live.user?.id}
                mobileInputTarget={mobileChatInputEl}
                onWsEvent={handleWsEvent}
              />

              {/* Réactions rapides + saisie — toujours tout en bas de la colonne */}
              <div className="shrink-0 min-w-0 px-3 py-2 border-t" style={{ background: 'rgba(15,15,20,0.98)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <div ref={setMobileChatInputEl} className="min-w-0" />
              </div>

              {live.description && (
                <div className="lg:hidden shrink-0 px-4 py-2.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.8)' }}>
                  <p className="text-xs line-clamp-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{live.description}</p>
                </div>
              )}
            </div>
            </LiveKitRoom>

          ) : isActive ? (
            <>
              <div className="flex lg:hidden items-center gap-3 px-4 py-3 border-b shrink-0"
                style={{ background: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)' }}>
                <button onClick={handleLeave} style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <ChevronLeft size={20} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{live.title}</p>
                </div>
                <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-white"
                  style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                </span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-white gap-3">
                <div className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <Radio size={28} className="opacity-60" />
                </div>
                <p className="text-sm opacity-60">Connexion au live...</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex lg:hidden items-center gap-3 px-4 py-3 border-b shrink-0"
                style={{ background: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)' }}>
                <button onClick={handleLeave} style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <ChevronLeft size={20} />
                </button>
                <p className="font-semibold text-white text-sm truncate flex-1">{live.title}</p>
                <span className="text-xs px-2.5 py-1 rounded-full"
                  style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)' }}>Terminé</span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-white gap-3">
                <Radio size={40} className="opacity-30" />
                <p className="font-semibold opacity-60">Ce live est terminé</p>
                <button onClick={() => navigate('/lives')}
                  className="text-sm mt-2 px-4 py-2 rounded-xl border transition-colors"
                  style={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.2)' }}>
                  Voir d'autres lives
                </button>
              </div>
            </>
          )}
          </div>
        </div>

        <LiveBoostedRail lives={suggestedLives} />

      </div>

      {/* Gift modal */}
      {giftTarget && live.user?.id && (
        <LiveGiftModal
          liveId={id!}
          receiverId={giftTarget.id}
          receiverName={giftTarget.name}
          onClose={() => setGiftTarget(null)}
          onSent={notif => {
            setGiftNotifs(prev => [...prev.slice(-9), notif]);
            setGiftHistory(prev => [...prev, { ...notif }]);
            setGiftTarget(null);
            setTimeout(() => setGiftNotifs(prev => prev.filter(x => x.id !== notif.id)), 4000);
          }}
        />
      )}

      {/* Scène payante — modal de confirmation avant hand-raise */}
      {showStageGate && stageGateLive && user && (
        <StageAccessGate
          live={stageGateLive}
          liveId={id!}
          identity={user.id}
          onRequested={() => { setShowStageGate(false); setHandRaised(true); }}
          onClose={() => setShowStageGate(false)}
          onOpenGift={(receiverId, receiverName) => setGiftTarget({ id: receiverId, name: receiverName })}
        />
      )}

      {ConfirmDialog}
    </>
  );
}
