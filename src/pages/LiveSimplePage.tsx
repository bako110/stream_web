import { PageLoader } from '../components/ui/Spinner';
import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { decodeId, encodeId } from '../utils/slugId';
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
import { StageLayout } from '../components/live/StageLayout';
import type { StageParticipant } from '../components/live/StageLayout';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useApi } from '../hooks/useApi';
import { useWs } from '../context/WebSocketContext';
import { Spinner } from '../components/ui/Spinner';
import { Avatar } from '../components/ui/Avatar';
import { WS_BASE_URL, API_BASE_URL } from '../utils/constants';
import { openAuthenticatedWs } from '../utils/authenticatedWs';
import { useAuthStore } from '../store/authStore';
import {
  LiveLikeButton,
  LiveReactionPicker,
  FloatingEmojiOverlay,
  LiveHeartsOverlay,
  LiveTimer,
  LIVE_ANIMATIONS_CSS,
} from '../components/live/LiveInteractions';
import type { LiveLikeButtonRef, LiveHeartsOverlayRef } from '../components/live/LiveInteractions';
import {
  LiveGiftModal,
  GiftTicker,
  GiftToast,
  type GiftNotif,
} from '../components/live/LiveGiftModal';
import { LiveSettingsSheet } from '../components/live/LiveSettingsSheet';
import { ShareModal } from '../components/ui/ShareModal';
import { CardMoreMenu } from '../components/ui/CardMoreMenu';
import { BattleChallengeSheet } from '../components/live/BattleChallengeSheet';
import { battlesApi } from '../api/battles';
import { LiveAccessGate } from '../components/live/LiveAccessGate';
import { StageAccessGate } from '../components/live/StageAccessGate';
import { useLiveSuggestions, LiveSuggestionsBar, LiveBoostedRail } from '../components/live/LiveSuggestions';
import { useConfirm } from '../components/ui/Dialog';
import { extractApiErrorMessage } from '../utils/apiError';

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
interface GiftTick    { id: string; emoji: string; senderName: string; giftName: string; gogold: number; }

// ── Chat ──────────────────────────────────────────────────────────────────────

interface LiveChatHandle { addSysMsg: (text: string) => void; }

const LiveChat = forwardRef<LiveChatHandle, {
  liveId: string; accessToken: string | null; isHost: boolean; hostId?: string | null;
  mobileInputTarget?: HTMLElement | null;
  /** Portail mobile pour la liste de messages — rend la variante overlay
   *  (transparente, bornée à 200px) dans cette cible plutôt que dans le flux
   *  normal du composant. Une seule instance de LiveChat existe (un seul
   *  WebSocket) ; sur desktop la liste s'affiche dans son flux normal
   *  (colonne dédiée) et cette cible n'est pas fournie. */
  mobileListTarget?: HTMLElement | null;
  onWsEvent: (d: any) => void;
}>(function LiveChatInner({ liveId, accessToken, isHost, hostId, mobileInputTarget, mobileListTarget, onWsEvent }, ref) {
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
    const ws = openAuthenticatedWs(`${base}/api/v1/social/comments/ws/live/${liveId}`, accessToken);
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
    <div className="flex flex-col gap-1.5 pointer-events-auto min-w-0">
      {/* Réactions rapides — un tap envoie directement le commentaire */}
      <div className="flex items-center gap-1.5 overflow-x-auto min-w-0" style={{ scrollbarWidth: 'none' }}>
        {QUICK_REACTIONS.map(r => (
          <button key={r.label} onClick={() => sendQuick(`${r.emoji} ${r.label}`)}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-transform active:scale-95"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <span>{r.emoji}</span> {r.label}
          </button>
        ))}
      </div>
      <div className="relative flex gap-2">
        <input
          className="flex-1 min-w-0 text-white text-sm rounded-full px-3.5 py-2.5 focus:outline-none focus:ring-1"
          style={{ background: 'rgba(20,20,26,0.75)', border: '1px solid rgba(255,255,255,0.22)', '--tw-ring-color': '#7B3FF2' } as any}
          placeholder="Écris un commentaire..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
        />
        <button onClick={send} disabled={sending || !input.trim()}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 2px 10px rgba(123,63,242,0.4)' }}>
          <Send size={15} className="text-white" />
        </button>
      </div>
    </div>
  );

  // Liste de commentaires rendue deux fois avec le même state (pas de second
  // WebSocket) : en flux normal opaque pour la colonne desktop, et — quand
  // mobileListTarget est fourni — en variante overlay (transparente, bornée à
  // 200px) téléportée par-dessus la vidéo plein écran sur mobile.
  function renderList(isOverlay: boolean) {
    return (
    <div className={isOverlay ? 'px-3 py-2 flex flex-col justify-end gap-1.5 overscroll-contain touch-pan-y' : 'px-3 py-2 flex flex-col gap-2'}
      style={isOverlay
        ? { background: 'transparent', height: 130, maxHeight: 130, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 24px)', maskImage: 'linear-gradient(to bottom, transparent, black 24px)' } as React.CSSProperties
        : { background: 'rgba(15,15,20,0.97)', flex: '1 1 0%', minHeight: 0, overflowY: 'auto' }
      }>
      {messages.length === 0 && !isOverlay && (
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
          <div key={m.id} className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full text-xs w-fit"
            style={{ background: 'rgba(80,60,0,0.45)', border: '1px solid rgba(255,215,0,0.4)', boxShadow: '0 0 10px rgba(255,215,0,0.15)' }}>
            <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,215,0,0.2)' }}>
              <Gift size={13} style={{ color: '#fbbf24' }} />
            </span>
            <span className="font-semibold" style={{ color: '#fde68a' }}>{m.text}</span>
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
                <span className="text-xs font-bold"
                  style={{ color: isMsgHost ? '#c4b5fd' : '#a78bfa', textShadow: isOverlay ? '0 1px 3px rgba(0,0,0,0.9)' : 'none' }}>
                  {m.user}
                </span>
                {isMsgHost && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: '#7B3FF2' }}>Hôte</span>
                )}
              </div>
              <span className="text-sm break-words whitespace-pre-line"
                style={{ color: 'rgba(255,255,255,0.92)', textShadow: isOverlay ? '0 1px 3px rgba(0,0,0,0.9)' : 'none' }}>{m.text}</span>
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
      {!isOverlay && <div ref={bottomRef} />}
    </div>
    );
  }

  return (
    <>
      {/* Liste desktop — flux normal opaque dans la colonne dédiée. */}
      <div className={mobileListTarget ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'} style={{ flex: '1 1 0%', minHeight: 0 }}>
        {renderList(false)}
      </div>

      {/* Liste mobile — téléportée en overlay par-dessus la vidéo. */}
      {mobileListTarget && createPortal(renderList(true), mobileListTarget)}

      {/* Saisie desktop — inline dans la colonne dédiée. */}
      <div className="hidden lg:block shrink-0 min-w-0 px-3 py-2 border-t"
        style={{ background: 'rgba(15,15,20,0.98)', borderColor: 'rgba(255,255,255,0.08)' }}>
        {inputBar}
      </div>

      {/* Saisie mobile — téléportée dans le groupe bas overlay. */}
      {mobileInputTarget && createPortal(inputBar, mobileInputTarget)}

      {ConfirmChatDialog}
    </>
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
  const total = history.reduce((s, t) => s + t.gogold, 0);
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
        <span className="text-xs font-bold" style={{ color: '#fde68a' }}>Total : {total.toLocaleString()} GoGold</span>
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
            <span className="text-[10px] font-bold shrink-0" style={{ color: '#fbbf24' }}>{t.gogold}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Menu modération vignette ──────────────────────────────────────────────────

function ParticipantContextMenu({
  identity, name, liveId, isOnStage, anchor, onDone,
}: {
  identity: string; name: string; liveId: string;
  isOnStage: boolean;
  /** Coordonnées écran du bouton cliqué (getBoundingClientRect), en position fixed. */
  anchor: { x: number; y: number; alignRight: boolean };
  onDone: () => void;
}) {
  async function act(endpoint: string) {
    try {
      await apiClient.post(endpoint);
    } catch (e: any) {
      import('react-hot-toast').then(({ default: toast }) =>
        toast.error(extractApiErrorMessage(e, 'Action échouée')));
      return;
    }
    onDone();
  }

  const MENU_WIDTH = 160;
  // Rendu via portail dans document.body (cf. appelant) — position fixed calculée
  // depuis le bouton réellement cliqué, donc jamais rogné par l'overflow-hidden
  // des tuiles vidéo, ni forcé hors écran quand le bouton est collé au bord.
  const left = anchor.alignRight
    ? Math.max(8, anchor.x - MENU_WIDTH)
    : anchor.x;

  return (
    <div
      className="fixed z-[100] flex flex-col gap-0.5 py-1.5 px-1.5 rounded-xl shadow-2xl"
      style={{
        top: anchor.y + 4, left,
        width: MENU_WIDTH,
        background: 'rgba(15,15,20,0.98)', border: '1px solid rgba(255,255,255,0.08)',
      }}
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
  isHost, liveId, hostId, stageIdentities, participantNames, participantAvatars, onGiftClick, streamerAvatarUrl, streamerName,
  pinnedIdentity, onPin,
}: {
  isHost: boolean; liveId: string;
  /** Identité réelle du host, peu importe qui regarde — nécessaire pour lui
   * réserver une case dans la grille même côté viewer (stageIdentities ne
   * couvre que les guests invités, jamais le host lui-même). */
  hostId: string | null;
  stageIdentities: Set<string>;
  participantNames: Map<string, string>;
  participantAvatars: Map<string, string>;
  onGiftClick: (identity: string, name: string) => void;
  streamerAvatarUrl?: string | null;
  streamerName?: string | null;
  // Spotlight synchronisé pour tous les viewers — cf. StageLayout.tsx.
  pinnedIdentity: string | null;
  onPin: (identity: string) => void;
}) {
  const { user: currentUser } = useAuthStore();
  const tracks       = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const participants = useParticipants();
  const speakingIds  = useActiveSpeakersSet();
  const { localParticipant } = useLocalParticipant();
  const micOn = useLocalMicEnabled();
  // Position capturée depuis le bouton "..." cliqué (getBoundingClientRect) — le
  // menu est rendu via portail dans document.body (cf. plus bas), donc il n'est
  // jamais rogné par l'overflow-hidden des tuiles/cadres vidéo qui le contiennent
  // visuellement, ni forcé hors écran par un positionnement absolute relatif à
  // un petit conteneur proche du bord de l'écran.
  const [contextMenu, setContextMenu] = useState<{ identity: string; x: number; y: number; alignRight: boolean } | null>(null);
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
    try {
      await localParticipant.setCameraEnabled(true);
      await localParticipant.setMicrophoneEnabled(true);
    } catch { /* permission refusée */ }
  }

  async function toggleMicFromAvatar(e: React.MouseEvent) {
    e.stopPropagation();
    try { await localParticipant.setMicrophoneEnabled(!micOn); } catch { /* permission refusée */ }
  }

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [contextMenu]);

  const activeTracks = tracks.filter(t => !t.publication?.isMuted);

  // Défaut tant qu'aucun pin explicite n'est actif — le HOST est TOUJOURS
  // l'écran principal par défaut, pour tout le monde (viewers ET le host
  // lui-même), qu'il ait une caméra active ou non — jamais un guest.
  // Identifié par hostId (identité réelle, indépendante des tracks) plutôt
  // que par activeTracks : avant ce fix, sans caméra active nulle part, ce
  // défaut tombait à null pour tout le monde et StageLayout retombait sur
  // participants[0], un ordre de tableau arbitraire — côté viewer ça pouvait
  // afficher SOI-MÊME en grand (son propre avatar) au lieu du host.
  const defaultSpotlightIdentity = hostId ?? (isHost ? localParticipant.identity : null);

  // La place du host reste réservée dès qu'il est connecté à la room, même
  // sans caméra active — sa présence (avatar fallback) ne doit jamais dépendre
  // de sa caméra, ni de celle d'un éventuel guest sur scène. Avant ce fix,
  // l'écran "clique pour activer ta caméra" s'affichait à la place de TOUTE
  // la grille dès qu'aucune caméra n'était active nulle part (host ET guests
  // confondus), masquant même les guests sur scène qui, eux, avaient déjà une
  // case réservée (cf. stageParticipants plus bas) — cet écran ne doit
  // apparaître que si absolument personne n'est présent sur scène.
  const anyoneOnStage = activeTracks.length > 0
    || participants.some(p => stageIdentities.has(p.identity) || (!!hostId && p.identity === hostId));

  if (!anyoneOnStage) {
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

  // ── Affichage multi-participants — bloc principal (organisateur ou personne
  // épinglée par le host) + colonne verticale des autres, cf. StageLayout.tsx.
  // Priorité : pin explicite du host (synchronisé pour tous via WS) > défaut
  // local (l'hôte pour les viewers, soi-même pour le host tant que personne
  // d'autre n'a été mis en avant).
  const mainIdentity = pinnedIdentity ?? defaultSpotlightIdentity;

  const withTrack: StageParticipant[] = activeTracks.map(t => ({
    identity:   t.participant.identity,
    name:       t.participant.isLocal ? 'Toi' : (participantNames.get(t.participant.identity) ?? t.participant.name ?? t.participant.identity),
    track:      t,
    avatarUrl:  participantAvatars.get(t.participant.identity) ?? null,
    isLocal:    t.participant.isLocal,
    onStage:    stageIdentities.has(t.participant.identity),
    isSpeaking: speakingIds.has(t.participant.identity),
  }));
  // Participants sur scène (le host lui-même, ou un guest invité) mais sans
  // caméra active — être sur scène n'oblige pas à publier de vidéo (contrôle
  // entier utilisateur). Sans ce fallback, ils étaient absents de la grille :
  // aucune case affichée, ni pour eux-mêmes ni pour les autres viewers, malgré
  // une place légitimement réservée (host connecté, ou invitation acceptée).
  const withoutTrack: StageParticipant[] = participants
    .filter(p => (stageIdentities.has(p.identity) || p.identity === hostId) && !withTrack.some(w => w.identity === p.identity))
    .map(p => {
      const isThisHost = p.identity === hostId;
      // Priorité de l'avatar affiché : le host garde toujours streamerAvatarUrl
      // (identifié par hostId, peu importe qui regarde — avant ce fix,
      // "isHost && p.isLocal" ne matchait QUE la session du host lui-même,
      // donc un simple viewer ne voyait jamais la case du host sans caméra) ;
      // sinon, si c'est moi (viewer/guest), mon propre avatar (currentUser) ;
      // sinon, l'avatar connu de cet autre participant (participantAvatars).
      const avatarUrl = isThisHost
        ? (streamerAvatarUrl ?? null)
        : p.isLocal
          ? (currentUser?.avatar_url ?? null)
          : (participantAvatars.get(p.identity) ?? null);
      return {
        identity:   p.identity,
        name:       p.isLocal ? 'Toi' : (isThisHost ? (streamerName ?? p.name ?? p.identity) : (participantNames.get(p.identity) ?? p.name ?? p.identity)),
        track:      null,
        avatarUrl,
        isLocal:    p.isLocal,
        onStage:    stageIdentities.has(p.identity),
        isSpeaking: false,
      };
    });
  const stageParticipants: StageParticipant[] = [...withTrack, ...withoutTrack];

  const menuParticipant = contextMenu ? stageParticipants.find(p => p.identity === contextMenu.identity) : null;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <RoomAudioRenderer />
      <StageLayout
        participants={stageParticipants}
        mainIdentity={mainIdentity}
        isHost={isHost}
        onGiftClick={onGiftClick}
        onMenuClick={(identity, anchor) => setContextMenu(prev => prev?.identity === identity ? null : { identity, ...anchor })}
        onPinClick={(identity) => onPin(pinnedIdentity === identity ? '' : identity)}
      />
      {contextMenu && menuParticipant && createPortal(
        <ParticipantContextMenu
          identity={menuParticipant.identity}
          name={menuParticipant.isLocal ? 'Toi' : menuParticipant.name}
          liveId={liveId}
          isOnStage={menuParticipant.onStage}
          anchor={contextMenu}
          onDone={() => setContextMenu(null)}
        />,
        document.body,
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

  // Caméra/micro désactivés par défaut, pour le host comme pour le guest qui
  // monte sur scène — l'utilisateur garde le contrôle entier et doit cliquer
  // explicitement (bouton "Activer ma caméra"/SideBtn Cam) pour publier son
  // flux. Avant ce fix, les deux étaient auto-activés dès la connexion/montée
  // sur scène, sans possibilité de rester caméra coupée par choix.

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

  // Sync état cam avec l'état LiveKit réel — pour le guest sur scène ET pour le
  // host (qui peut activer sa caméra via le gros bouton "Activer ma caméra" de
  // LiveKitViewer, un composant frère distinct de celui-ci ; sans cette sync,
  // le bouton Cam/Cam off de la barre du bas restait affiché "Cam off" même
  // après activation réussie depuis l'autre bouton). Le micro suit useLocalMicEnabled.
  //
  // Se réabonne dès le montage (pas seulement quand isOnStage/isHost passe à
  // true) : l'ancienne condition ratait l'event si la caméra était déjà
  // publiée AVANT que ce useEffect démarre à écouter (ex: le guest clique
  // Cam via toggleGuestCam pendant un court instant où l'effet n'était pas
  // encore réabonné après un changement de isOnStage) — camOn restait
  // bloqué à false indéfiniment malgré une vraie vidéo déjà active, gardant
  // le gros bandeau "active ta caméra" affiché par-dessus sa propre vidéo.
  useEffect(() => {
    function sync() {
      const camPub = localParticipant.getTrackPublication(Track.Source.Camera);
      setCamOn(camPub ? !camPub.isMuted : false);
    }
    sync();
    localParticipant.on(ParticipantEvent.LocalTrackPublished, sync);
    localParticipant.on(ParticipantEvent.LocalTrackUnpublished, sync);
    localParticipant.on(ParticipantEvent.TrackMuted, sync);
    localParticipant.on(ParticipantEvent.TrackUnmuted, sync);
    return () => {
      localParticipant.off(ParticipantEvent.LocalTrackPublished, sync);
      localParticipant.off(ParticipantEvent.LocalTrackUnpublished, sync);
      localParticipant.off(ParticipantEvent.TrackMuted, sync);
      localParticipant.off(ParticipantEvent.TrackUnmuted, sync);
    };
  }, [localParticipant]);

  function SideBtn({ icon, label, onClick, active, color, badge, danger }: {
    icon: React.ReactNode; label: string; onClick?: () => void;
    active?: boolean; color?: string; badge?: number; danger?: boolean;
  }) {
    const bg     = danger ? 'rgba(239,68,68,0.2)' : active ? `${color ?? '#7B3FF2'}25` : 'rgba(255,255,255,0.12)';
    const border = danger ? '#EF4444' : active ? (color ?? '#7B3FF2') : 'rgba(255,255,255,0.15)';
    const txt    = danger ? '#EF4444' : active ? (color ?? '#7B3FF2') : 'rgba(255,255,255,0.7)';
    return (
      <button onClick={onClick} className="flex flex-col items-center gap-0.5 relative shrink-0" style={{ minWidth: 32 }}>
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all"
          style={{ background: bg, border: `1.5px solid ${border}`, color: danger ? '#EF4444' : active ? (color ?? '#7B3FF2') : '#fff' }}>
          {icon}
        </div>
        {badge !== undefined && badge > 0 && (
          <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
            style={{ background: color ?? '#7B3FF2' }}>
            {badge}
          </div>
        )}
        <span className="text-[8px] sm:text-[9px] font-semibold whitespace-nowrap" style={{ color: txt }}>{label}</span>
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
    <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">

      {/* HOST — barre principale : essentiel uniquement, le reste dans le menu "Plus" */}
      {isHost && (
        <>
          <SideBtn icon={camOn ? <VideoIcon size={14} /> : <VideoOff size={14} />}
            label={camOn ? 'Cam' : 'Cam off'} onClick={toggleCam} active={camOn} color="#10B981" />

          <SideBtn icon={<StopCircle size={14} />}
            label={stopping ? '...' : 'Terminer'} onClick={onStop} danger />
        </>
      )}

      {/* VIEWER sur scène */}
      {!isHost && isOnStage && (
        <>
          <SideBtn
            icon={camOn ? <VideoIcon size={14} /> : <VideoOff size={14} />}
            label={camOn ? 'Cam' : 'Cam off'}
            onClick={toggleGuestCam} active={camOn} color="#10B981" />
          <SideBtn
            icon={micOn ? <Mic size={14} /> : <MicOff size={14} />}
            label={micOn ? 'Micro' : 'Muet'}
            onClick={toggleGuestMic} active={micOn} color="#10B981" />
          <SideBtn
            icon={<ArrowDown size={14} />} label="Descendre"
            onClick={onLeaveStage} danger />
          <SideBtn
            icon={<X size={14} />} label="Quitter"
            onClick={onLeave} danger />
        </>
      )}

      {/* VIEWER normal */}
      {!isHost && !isOnStage && (
        <>
          <SideBtn
            icon={<Hand size={14} />}
            label={handRaised ? 'En attente...' : 'Lever main'}
            onClick={onHandRaise} active={handRaised} color="#fbbf24" />
          <SideBtn
            icon={<X size={14} />} label="Quitter"
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
  const likeRef = useRef<LiveLikeButtonRef | null>(null);
  const heartsOverlayRef = useRef<LiveHeartsOverlayRef | null>(null);

  // Cadeaux
  const [giftNotifs,  setGiftNotifs]  = useState<GiftNotif[]>([]);
  const [activeToast, setActiveToast] = useState<GiftNotif | null>(null);
  const [giftTarget,  setGiftTarget]  = useState<{ id: string; name: string } | null>(null);
  const [giftHistory, setGiftHistory] = useState<GiftTick[]>([]);

  // Modération
  const [handRequests,     setHandRequests]     = useState<HandRequest[]>([]);
  const [stageIdentities,  setStageIdentities]  = useState<Set<string>>(new Set());
  // Spotlight épingle par le host — synchronisé pour tous les viewers via
  // POST/DELETE /lives/{id}/spotlight + WS live_spotlight_changed (même
  // mécanisme que la version mobile, cf. stream_mobile SimpleLiveStreamScreen).
  const [pinnedIdentity,   setPinnedIdentity]   = useState<string | null>(null);
  const [participantNames, setParticipantNames] = useState<Map<string, string>>(new Map());
  // Avatar de secours affiché dans la vignette d'un participant sur scène sans
  // caméra active — être sur scène n'oblige pas à publier de vidéo (contrôle
  // entier laissé à l'utilisateur, cf. MediaControls plus haut).
  const [participantAvatars, setParticipantAvatars] = useState<Map<string, string>>(new Map());
  const [handRaised,       setHandRaised]       = useState(false);
  // Un seul vrai partage (ShareModal) — avant, deux boutons "Partager" distincts
  // (header + barre du bas) faisaient juste un clipboard.writeText silencieux,
  // sans confirmation ni options réseaux sociaux.
  const [showShareModal,   setShowShareModal]   = useState(false);

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
  const [showChallenge,    setShowChallenge]    = useState(false);

  // Données live localement mutable (monétisation)
  const [liveOverride, setLiveOverride] = useState<Partial<LiveStream>>({});


  const chatRef             = useRef<LiveChatHandle>(null);
  const participantNamesRef = useRef<Map<string, string>>(new Map());
  const [mobileChatInputEl, setMobileChatInputEl] = useState<HTMLDivElement | null>(null);
  // Portail mobile pour la liste de messages — le même LiveChat (une seule
  // instance, un seul WebSocket) rend sa liste ici en overlay sur mobile, et
  // dans son flux normal (colonne desktop) au-delà de lg via mobileListTarget=null.
  const [mobileChatListEl, setMobileChatListEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => { participantNamesRef.current = participantNames; }, [participantNames]);

  const liveApi = useApi<LiveStream>(() => apiClient.get<LiveStream>(Endpoints.lives.byId(id!)), [id]);
  const { lastLiveEnded } = useWs();
  const suggestedLives = useLiveSuggestions(id!);

  const live     = liveApi.data ? { ...liveApi.data, ...liveOverride } as LiveStream : null;
  const isHost   = !!(live && user && live.user_id === user.id);
  const isActive = live?.status === 'active';

  // Initialise le spotlight depuis le live chargé — sinon un viewer qui rejoint
  // en cours de route ne voit pas le pin déjà posé par le host (le WS ne livre
  // que les CHANGEMENTS survenus après la connexion).
  useEffect(() => {
    if (liveApi.data) setPinnedIdentity(liveApi.data.pinned_identity ?? null);
  }, [liveApi.data]);

  // Le host de ce live est peut-être déjà en plein battle (rejoint après le début
  // du match, donc après l'émission de l'event WS "battle_started") — sans ce
  // check, ce viewer resterait bloqué sur le live simple sans jamais voir le match.
  useEffect(() => {
    if (!live || !id || isHost) return;
    let cancelled = false;
    battlesApi.getActiveForLive(id).then(activeBattle => {
      if (cancelled || !activeBattle || activeBattle.status !== 'active') return;
      navigate(`/battles/${encodeId(activeBattle.id)}`, { replace: true });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [live, id, isHost, navigate]);

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
          gogold:      d.gift?.gogold_spent ?? d.gift?.gogold_cost ?? 0,
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
        if (avatar) setParticipantAvatars(prev => new Map(prev).set(identity, avatar));
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
        // Si ce participant était épinglé en plein écran (spotlight), le retirer
        // du pin — sinon StageLayout reste bloqué sur "Connexion au flux
        // épinglé…" indéfiniment (le participant a disparu de stageParticipants
        // mais mainIdentity continue de pointer vers lui) au lieu de retomber
        // sur le défaut (le host reprend sa position).
        setPinnedIdentity(prev => (prev === identity ? null : prev));
        break;
      }
      case 'viewer_kicked':
      case 'live_user_globally_banned': {
        const kickedId = d.identity ?? d.user_id;
        if (kickedId && user && kickedId === user.id) navigate(-1);
        break;
      }
      case 'battle_started': {
        // Le host de ce live vient d'accepter/démarrer un battle — les viewers
        // basculent aussi vers l'écran de battle en split-screen (comme les deux
        // hosts). replace (pas navigate) : sinon ce live reste monté en dessous
        // avec son propre LiveKitRoom connecté en parallèle de celui du battle.
        if (d.battle_id) navigate(`/battles/${encodeId(d.battle_id)}`, { replace: true });
        break;
      }
      case 'live_spotlight_changed': {
        setPinnedIdentity(d.identity ?? null);
        break;
      }
      case 'like_added': {
        // total = source de vérité serveur — toujours s'aligner dessus plutôt que
        // d'accumuler des deltas locaux (sinon chaque client dérive selon les
        // messages WS qu'il reçoit ou rate). Même logique que côté mobile.
        if (typeof d.total === 'number') likeRef.current?.setRemoteTotal(d.total);
        const isOwnEcho = !!d.from_user_id && !!user?.id && d.from_user_id === user.id;
        if (!isOwnEcho) {
          likeRef.current?.triggerRemote();
          heartsOverlayRef.current?.spawn(d.count ?? 1);
        }
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

  // Épingle un participant en plein écran pour TOUS les viewers (identity vide
  // = désépingler). Optimiste + WS live_spotlight_changed pour les autres clients.
  const handlePin = useCallback(async (identity: string) => {
    if (!id) return;
    setPinnedIdentity(identity || null);
    try {
      if (identity) await apiClient.post(Endpoints.lives.spotlight(id, identity));
      else await apiClient.delete(Endpoints.lives.clearSpotlight(id));
    } catch { /* silencieux — le WS resynchronisera si besoin */ }
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
              className="relative flex flex-col min-w-0 lg:flex-row-reverse"
              style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}
            >
              <RoomAudioRenderer />
              <JoinToastWatcher isHost={isHost} onJoin={name => {
                setJoinToast(name);
                setTimeout(() => setJoinToast(null), 3000);
              }} />

            <div className="relative flex-1 min-h-0 flex flex-col min-w-0 lg:flex-1 lg:h-full lg:justify-between lg:overflow-y-auto">
              {/* Header mobile — overlay flottant sur la vidéo plein écran (dégradé,
                  pas de fond opaque) ; remplacé par le header desktop au-dessus de la
                  carte sur lg+. Pas de overflow-hidden ici : le menu "..." (Sur
                  scène/Cadeaux/Paramètres) s'ouvre en absolute et dépasse la hauteur
                  de ce bandeau — il serait tronqué/invisible sinon. */}
              <div className="flex lg:hidden items-center gap-1.5 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 shrink-0 flex-nowrap absolute inset-x-0 top-0 z-30 lg:static lg:border-b"
                style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)', borderColor: 'rgba(255,255,255,0.1)' }}>
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

              {/* Vidéo — plein écran sur mobile (chat/actions superposés par-dessus,
                  style app) ; sur desktop (lg+) occupe tout l'espace vertical
                  disponible dans la colonne. */}
              <div className="absolute inset-0 bg-black overflow-hidden lg:relative lg:rounded-none lg:flex-1 lg:min-h-0">

                <LiveKitViewer
                  isHost={isHost} liveId={id!}
                  hostId={live.user?.id ?? null}
                  stageIdentities={stageIdentities}
                  participantNames={participantNames}
                  participantAvatars={participantAvatars}
                  onGiftClick={(identity, name) => setGiftTarget({ id: identity, name })}
                  streamerAvatarUrl={live.user?.avatar_url}
                  streamerName={live.user?.display_name ?? live.user?.username}
                  pinnedIdentity={pinnedIdentity}
                  onPin={handlePin}
                />

                {/* Zone tap coeur — comme sur mobile, chaque tap n'importe où sur la
                    vidéo déclenche un coeur (throttlée côté LiveLikeButton pour l'API).
                    likeRef.trigger() anime le petit coeur du bouton like (barre du bas,
                    FloatingHearts) ET incrémente/poste le like — heartsOverlayRef.spawn()
                    anime en plus un coeur qui monte depuis le bas de la VIDÉO elle-même
                    (LiveHeartsOverlay), même comportement que côté mobile
                    (SimpleLiveViewerScreen.handleLike) où le tap déclenche les deux.
                    Pas de onDoubleClick ici : sa présence forcerait le navigateur à
                    retarder chaque clic de ~300ms en attendant de savoir si un second
                    clic arrive, ce qui empêchait de tapoter vite plusieurs fois.
                    z-10, EN DESSOUS des boutons de StageLayout (z-20, cf. StageLayout.tsx)
                    — avant ce fix elle recouvrait tout LiveKitViewer et absorbait les
                    clics sur les boutons cadeau/menu/pin avant qu'ils n'atteignent le
                    vrai bouton en dessous. */}
                <div
                  className="absolute inset-0 z-10"
                  onClick={() => { likeRef.current?.trigger(); heartsOverlayRef.current?.spawn(1); }}
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
                <LiveHeartsOverlay ref={heartsOverlayRef} />

                {/* Gift toast host */}
                {isHost && activeToast && (
                  <div className="absolute top-3 right-3 z-30">
                    <GiftToast notif={activeToast} onDone={() => setActiveToast(null)} />
                  </div>
                )}
              </div>

              {/* Groupe bas — chat (portail mobile) + barre d'actions + description.
                  Sur mobile : overlay flottant collé au bas de l'écran (par-dessus la
                  vidéo plein écran, fond dégradé). Sur desktop (lg+) : bandeau opaque
                  en flux normal, poussé en bas de la carte (justify-between sur le
                  parent). */}
              <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-1.5 pt-6 lg:static lg:gap-0 lg:pt-0 lg:shrink-0"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.55) 55%, transparent)' }}>

              {/* Commentaires — portail mobile uniquement : reçoit la liste de messages
                  (variant overlay, transparent, bornée à 130px) de l'unique instance
                  LiveChat montée plus bas — pas de second montage/WebSocket. */}
              <div ref={setMobileChatListEl} className="lg:hidden shrink-0" />

              {/* Barre d'actions unique — contrôles techniques host (Cam/Terminer) et
                  interactions sociales (Like/Cadeau/Participants/Partager) sur la même
                  ligne, même gabarit de bouton compact (cercle w-7/sm:w-8 + label en dessous)
                  pour laisser le maximum de hauteur à la vidéo au-dessus. */}
              <div className="shrink-0 flex items-center gap-1.5 sm:gap-3 px-2.5 sm:px-3 lg:py-1 lg:border-b"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
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
                <div className="w-px h-7 sm:h-8 shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }} />
                <LiveLikeButton ref={likeRef} liveId={id!} initialCount={live.likes_count ?? 0} isHost={isHost} />
                {!isHost && (
                  <button
                    onClick={() => live?.user?.id && setGiftTarget({ id: live.user.id, name: live.user?.display_name ?? live.user?.username ?? 'Hôte' })}
                    className="flex flex-col items-center gap-0.5 shrink-0" style={{ minWidth: 32 }}>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all"
                      style={{ background: 'rgba(251,191,36,0.15)', border: '1.5px solid rgba(251,191,36,0.4)' }}>
                      <Gift size={13} style={{ color: '#fbbf24' }} />
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-semibold whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.7)' }}>Cadeau</span>
                  </button>
                )}
                <div
                  role="button" tabIndex={0}
                  onClick={() => { setShowParticipants(v => !v); setShowRequests(false); setShowOnStage(false); setShowGifts(false); setShowSettings(false); }}
                  className="flex flex-col items-center gap-0.5 shrink-0 cursor-pointer" style={{ minWidth: 32 }}>
                  {/* Avatars non-cliquables ici — tout clic dans cette zone ouvre le
                      panel Participants, l'envoi de cadeau se fait depuis le panel. */}
                  <div className="flex items-center justify-center h-7 sm:h-8">
                    <ViewerAvatars fallbackButton clickable={false} onGiftClick={() => {}} />
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-semibold whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.7)' }}>Participants</span>
                </div>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex flex-col items-center gap-0.5 shrink-0" style={{ minWidth: 32 }}>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.15)' }}>
                    <Send size={12} style={{ color: 'rgba(255,255,255,0.85)' }} />
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-semibold whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.7)' }}>Partager</span>
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

              {/* Saisie — portail mobile uniquement (desktop : voir colonne commentaires). */}
              <div ref={setMobileChatInputEl} className="lg:hidden shrink-0 px-2.5 sm:px-3 min-w-0"
                style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))' }} />
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
                  onChallenge={() => { setShowSettings(false); setShowChallenge(true); }}
                />
              )}

              {isHost && (
                <BattleChallengeSheet
                  open={showChallenge}
                  onClose={() => setShowChallenge(false)}
                  liveId={id!}
                />
              )}
            </div>

            {/* Colonne commentaires — desktop uniquement (lg:flex-row-reverse sur
                LiveKitRoom la place à gauche du live, visuellement en 1er). Sur
                mobile la même instance LiveChat téléporte sa liste et sa saisie
                dans le groupe bas overlay (mobileListTarget/mobileInputTarget) —
                ce conteneur reste donc monté (hidden, pas démonté) pour garder le
                WebSocket vivant, mais n'occupe plus de place dans le flux mobile. */}
            <div className="hidden lg:flex lg:w-[420px] lg:flex-none lg:shrink-0 lg:border-r"
              style={{ borderColor: 'rgba(255,255,255,0.08)', minHeight: 0, height: '100%', overflow: 'hidden' }}>
              <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
                {/* Gift ticker — juste au-dessus des commentaires */}
                {giftNotifs.length > 0 && (
                  <div className="shrink-0 px-3 py-1.5">
                    <GiftTicker notifs={giftNotifs} />
                  </div>
                )}

                {/* Commentaires — liste opaque en flux, scroll indépendant. La saisie
                    (inputBar) est rendue par LiveChat lui-même : inline ici sur
                    desktop, téléportée dans mobileChatInputEl (groupe bas overlay)
                    sur mobile. */}
                <LiveChat
                  ref={chatRef}
                  liveId={id!} accessToken={accessToken}
                  isHost={isHost} hostId={live.user?.id}
                  mobileInputTarget={mobileChatInputEl}
                  mobileListTarget={mobileChatListEl}
                  onWsEvent={handleWsEvent}
                />

                {live.description && (
                  <div className="lg:hidden shrink-0 px-4 py-2.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.8)' }}>
                    <p className="text-xs line-clamp-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{live.description}</p>
                  </div>
                )}
              </div>
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

      {/* Partage — un seul bouton "Partager" dans toute la page (barre du bas),
          câblé sur le vrai ShareModal (réseaux sociaux, envoi interne, copier le
          lien avec confirmation) au lieu d'un clipboard.writeText silencieux. */}
      {showShareModal && (
        <ShareModal
          open
          onClose={() => setShowShareModal(false)}
          url={window.location.href}
          title={live.title}
          desc={live.description ?? undefined}
          image={live.thumbnail_url ?? undefined}
          targetType="live"
          targetId={id!}
        />
      )}

      {ConfirmDialog}
    </>
  );
}
