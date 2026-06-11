import { PageLoader } from '../components/ui/Spinner';
import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { decodeId } from '../utils/slugId';
import {
  Radio, Eye, MessageCircle, Send, X, StopCircle, ChevronLeft,
  Mic, MicOff, VideoIcon, VideoOff, Gift, Hand, FlipHorizontal,
  ShieldOff, Ban, Lock, Users, Trash2, Slash, RefreshCw,
} from 'lucide-react';
import {
  LiveKitRoom,
  VideoTrack,
  useParticipants,
  useTracks,
  RoomAudioRenderer,
  useLocalParticipant,
} from '@livekit/components-react';
import { Track, VideoPresets } from 'livekit-client';
import type { LiveStream, StreamToken } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useApi } from '../hooks/useApi';
import { useWs } from '../context/WebSocketContext';
import { Spinner } from '../components/ui/Spinner';
import { Avatar } from '../components/ui/Avatar';
import { WS_BASE_URL } from '../utils/constants';
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
}
interface EmojiFloat  { id: number; emoji: string; x: number; size: number; }
interface HandRequest { identity: string; name: string; avatar?: string | null; }
interface GiftTick    { id: string; emoji: string; senderName: string; giftName: string; coins: number; }

// ── Chat ──────────────────────────────────────────────────────────────────────

interface LiveChatHandle { addSysMsg: (text: string) => void; }

const LiveChat = forwardRef<LiveChatHandle, {
  liveId: string; accessToken: string | null; isHost: boolean;
  onWsEvent: (d: any) => void;
}>(function LiveChatInner({
  liveId, accessToken, isHost, onWsEvent,
}, ref) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const wsRef     = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user }  = useAuthStore();

  useEffect(() => {
    if (!accessToken) return;
    const base = WS_BASE_URL || window.location.origin.replace(/^http/, 'ws');
    const ws = new WebSocket(`${base}/api/v1/social/comments/ws/live/${liveId}?token=${accessToken}`);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'comment_added' && d.comment) {
          const c = d.comment;
          setMessages(prev => [...prev.slice(-149), {
            id:     c.id ?? String(Date.now()),
            user:   c.author?.display_name ?? c.author?.username ?? 'Anonyme',
            userId: c.author?.id ?? null,
            avatar: c.author?.avatar_url ?? null,
            text:   c.body,
          }]);
        }
        if (d.type === 'gift_received' && d.gift) {
          const gName  = d.gift.gift_type?.name  ?? d.gift.name  ?? 'Cadeau';
          const gEmoji = d.gift.gift_type?.emoji ?? d.gift.emoji ?? '🎁';
          const gSender = d.gift.sender?.display_name ?? d.gift.sender?.username ?? 'Quelqu\'un';
          setMessages(prev => [...prev.slice(-149), {
            id:     `gift-${Date.now()}`,
            user:   gSender,
            text:   `${gEmoji} ${gSender} a envoyé ${gName}`,
            isGift: true,
          }]);
        }
        onWsEvent(d);
      } catch { /* ignore */ }
    };
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('{"type":"ping"}');
    }, 25_000);
    return () => { clearInterval(ping); ws.close(); };
  }, [liveId, accessToken, onWsEvent]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    if (!input.trim() || sending) return;
    const body = input.trim();
    // Affichage local immédiat
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

  // Expose addSysMsg au parent via forwardRef
  useImperativeHandle(ref, () => ({ addSysMsg }), [addSysMsg]);

  async function deleteMsg(msgId: string) {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    try { await apiClient.delete(Endpoints.social.commentById(msgId)); } catch { /* ignore */ }
  }

  async function banFromMsg(identity: string, name: string) {
    if (!window.confirm(`Exclure ${name} du live ?`)) return;
    try { await apiClient.post(Endpoints.lives.ban(liveId, identity)); }
    catch { /* ignore */ }
    addSysMsg(`${name} a été exclu du live`);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-center text-xs text-[var(--text-tertiary)] pt-8">Aucun message pour l'instant</p>
        )}
        {messages.map(m => {
          if (m.isSys) return (
            <div key={m.id} className="text-center text-[10px] text-white/40 py-0.5">{m.text}</div>
          );
          if (m.isGift) return (
            <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
              style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)' }}>
              <span className="text-base">🎁</span>
              <span className="text-yellow-300 font-medium">{m.text}</span>
            </div>
          );
          const isMe = m.userId && user && m.userId === user.id;
          const canMod = isHost && m.userId && !isMe;
          return (
            <div key={m.id} className="group flex gap-2 items-start">
              <Avatar src={m.avatar} name={m.user} size="xs" className="shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-brand-primary">{m.user} </span>
                <span className="text-xs text-[var(--text-primary)] break-words">{m.text}</span>
                {canMod && (
                  <div className="flex gap-2 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => deleteMsg(m.id)}
                      className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300">
                      <Trash2 size={9} /> Supprimer
                    </button>
                    <button onClick={() => banFromMsg(m.userId!, m.user)}
                      className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300">
                      <Slash size={9} /> Exclure
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-white/10 flex gap-2 shrink-0">
        <input
          className="flex-1 min-w-0 bg-white/10 text-white text-sm rounded-xl px-3 py-2 placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-brand-primary"
          placeholder="Commenter..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
        />
        <button onClick={send} disabled={!input.trim() || sending}
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all"
          style={{ background: input.trim() ? 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' : 'rgba(255,255,255,0.1)' }}>
          <Send size={13} className="text-white" />
        </button>
      </div>
    </div>
  );
});

// ── Panel demandes de prise de parole ─────────────────────────────────────────

function HandRequestsPanel({
  liveId, requests, onInvite, onDismiss, onClose,
}: {
  liveId: string;
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-500/20">
        <span className="text-sm font-bold text-yellow-400 flex items-center gap-2">
          <span className="text-lg">✋</span>
          {requests.length} demande{requests.length > 1 ? 's' : ''} de scène
        </span>
        <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors p-1">
          <X size={14} />
        </button>
      </div>
      {requests.length === 0 ? (
        <p className="text-xs text-white/40 px-4 py-5 text-center">Aucune demande en attente</p>
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
                Inviter ↑
              </button>
              <button onClick={() => onDismiss(r.identity)} className="text-white/30 hover:text-red-400 shrink-0 transition-colors">
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
  liveId, identities, names, onDemote, onClose,
}: {
  liveId: string;
  identities: Set<string>;
  names: Map<string, string>;
  onDemote: (identity: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute top-16 left-3 z-40 w-56"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', borderRadius: '1rem', border: '1px solid rgba(74,222,128,0.3)' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-green-500/20">
        <span className="text-xs font-bold text-green-400 flex items-center gap-1.5">
          <Users size={12} /> Sur scène ({identities.size})
        </span>
        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
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
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-orange-300"
              style={{ background: 'rgba(251,146,60,0.15)' }}>
              <ShieldOff size={9} /> Retirer
            </button>
          </div>
        ))}
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
      <div className="flex items-center justify-between px-3 py-2 border-b border-yellow-500/20">
        <span className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
          <Gift size={12} /> Cadeaux reçus ({history.length})
        </span>
        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
          <X size={13} />
        </button>
      </div>
      <div className="px-3 py-1.5 border-b border-yellow-500/10">
        <span className="text-xs font-bold text-yellow-300">Total : {total.toLocaleString()} 🪙</span>
      </div>
      <div className="p-2 space-y-2 max-h-56 overflow-y-auto">
        {history.slice(0, 20).map((t, i) => (
          <div key={`${t.id}-${i}`} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,215,0,0.06)' }}>
            <span className="text-xl shrink-0">{t.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white font-semibold truncate">{t.senderName}</p>
              <p className="text-[10px] text-white/50">{t.giftName}</p>
            </div>
            <span className="text-[10px] font-bold text-yellow-400 shrink-0">{t.coins} 🪙</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Menu modération vignette ──────────────────────────────────────────────────

function ParticipantContextMenu({
  identity, name, liveId, isHost, isOnStage, onDone,
}: {
  identity: string; name: string; liveId: string;
  isHost: boolean; isOnStage: boolean; onDone: () => void;
}) {
  if (!isHost) return null;

  async function act(endpoint: string, method: 'post' | 'delete' = 'post') {
    try {
      if (method === 'delete') await apiClient.delete(endpoint);
      else await apiClient.post(endpoint);
    } catch { /* silencieux */ }
    onDone();
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 z-10 p-2"
      style={{ background: 'rgba(0,0,0,0.82)', borderRadius: '1rem' }}>
      <p className="text-[10px] text-white/70 truncate w-full text-center mb-0.5">{name}</p>
      {isOnStage ? (
        <button onClick={() => act(Endpoints.lives.demote(liveId, identity))}
          className="flex items-center gap-1 text-[10px] text-orange-300 px-2 py-1 rounded-lg w-full justify-center"
          style={{ background: 'rgba(251,146,60,0.2)' }}>
          <ShieldOff size={10} /> Retirer de scène
        </button>
      ) : (
        <button onClick={() => act(Endpoints.lives.invite(liveId, identity))}
          className="flex items-center gap-1 text-[10px] text-purple-300 px-2 py-1 rounded-lg w-full justify-center"
          style={{ background: 'rgba(167,139,250,0.2)' }}>
          <Hand size={10} /> Monter sur scène
        </button>
      )}
      <button onClick={() => act(Endpoints.lives.ban(liveId, identity))}
        className="flex items-center gap-1 text-[10px] text-red-300 px-2 py-1 rounded-lg w-full justify-center"
        style={{ background: 'rgba(248,113,113,0.2)' }}>
        <Ban size={10} /> Exclure ce live
      </button>
      <button onClick={() => act(Endpoints.lives.globalBan(liveId, identity))}
        className="flex items-center gap-1 text-[10px] text-red-400 px-2 py-1 rounded-lg w-full justify-center"
        style={{ background: 'rgba(239,68,68,0.2)' }}>
        <Ban size={10} /> Bannir (tous lives)
      </button>
      <button onClick={() => act(Endpoints.lives.blockUser(identity))}
        className="flex items-center gap-1 text-[10px] text-purple-300 px-2 py-1 rounded-lg w-full justify-center"
        style={{ background: 'rgba(139,92,246,0.2)' }}>
        <Lock size={10} /> Bloquer de mes lives
      </button>
      <button onClick={onDone} className="text-[10px] text-white/30 hover:text-white/60 mt-0.5">Annuler</button>
    </div>
  );
}

// ── Zone vidéo ────────────────────────────────────────────────────────────────

function LiveKitViewer({
  isHost, liveId, stageIdentities, participantNames, onGiftClick,
}: {
  isHost: boolean; liveId: string; stageIdentities: Set<string>;
  participantNames: Map<string, string>;
  onGiftClick: (identity: string, name: string) => void;
}) {
  const tracks       = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const participants = useParticipants();
  const [spotlightId,   setSpotlightId]   = useState<string | null>(null);
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);

  const activeTracks = tracks.filter(t => !t.publication?.isMuted);

  const defaultSpotlight = isHost
    ? (activeTracks.find(t => t.participant.isLocal) ?? activeTracks[0] ?? null)
    : (activeTracks.find(t => !t.participant.isLocal) ?? activeTracks[0] ?? null);

  const spotlightTrack  = activeTracks.find(t => t.participant.identity === spotlightId) ?? defaultSpotlight;
  const thumbnailTracks = activeTracks.filter(t => t !== spotlightTrack);
  const localTrack      = activeTracks.find(t => t.participant.isLocal) ?? null;

  const showHostPip = isHost && spotlightTrack && !spotlightTrack.participant.isLocal && localTrack != null;

  if (activeTracks.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-white gap-3">
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center animate-pulse">
          <Radio size={28} className="opacity-60" />
        </div>
        <p className="text-sm opacity-60">
          {isHost ? 'Active ta caméra pour démarrer' : 'En attente de la diffusion...'}
        </p>
        <p className="text-xs opacity-40">{participants.length} connecté(s)</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <RoomAudioRenderer />

      {spotlightTrack && (
        <VideoTrack trackRef={spotlightTrack} className="w-full h-full object-contain" />
      )}

      {spotlightTrack && (
        <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm z-10 flex items-center gap-1.5">
          {stageIdentities.has(spotlightTrack.participant.identity) && (
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          )}
          {spotlightTrack.participant.isLocal ? 'Toi' : (participantNames.get(spotlightTrack.participant.identity) ?? spotlightTrack.participant.name ?? spotlightTrack.participant.identity)}
        </div>
      )}

      {/* PiP host */}
      {showHostPip && localTrack && (
        <div
          className="absolute bottom-20 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/40 shadow-2xl cursor-pointer z-20 hover:border-brand-primary transition-all"
          onClick={() => setSpotlightId(null)}
          title="Revenir sur ta vue"
        >
          <VideoTrack trackRef={localTrack} className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-1">Toi</div>
        </div>
      )}

      {/* Vignettes secondaires */}
      {thumbnailTracks.length > 0 && (
        <div className="absolute bottom-20 left-3 flex flex-col gap-2 z-20">
          {thumbnailTracks.map(t => {
            const identity = t.participant.identity;
            const name     = t.participant.isLocal ? 'Toi' : (participantNames.get(identity) ?? t.participant.name ?? identity);
            const onStage  = stageIdentities.has(identity);
            const showMenu = contextMenuId === identity;
            return (
              <div
                key={identity}
                className="w-24 h-36 rounded-2xl overflow-hidden shadow-xl cursor-pointer relative transition-all"
                style={{ border: `2px solid ${onStage ? '#22c55e' : 'rgba(255,255,255,0.2)'}` }}
                onClick={() => {
                  if (showMenu) { setContextMenuId(null); return; }
                  if (isHost && !t.participant.isLocal) { setContextMenuId(identity); return; }
                  setSpotlightId(identity);
                }}
                title={isHost && !t.participant.isLocal ? 'Options modération' : 'Mettre en avant'}
              >
                <VideoTrack trackRef={t} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] truncate text-center py-1 px-1 flex items-center justify-center gap-1">
                  {onStage && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />}
                  {name}
                </div>
                {!t.participant.isLocal && !isHost && (
                  <button
                    className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(0,0,0,0.6)' }}
                    onClick={e => { e.stopPropagation(); onGiftClick(identity, name); }}>
                    <Gift size={11} className="text-yellow-400" />
                  </button>
                )}
                {showMenu && (
                  <ParticipantContextMenu
                    identity={identity} name={name} liveId={liveId}
                    isHost={isHost} isOnStage={onStage}
                    onDone={() => setContextMenuId(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Avatars viewers empilés ───────────────────────────────────────────────────

function ViewerAvatars({ onGiftClick }: { onGiftClick: (identity: string, name: string) => void }) {
  const participants = useParticipants();
  const remotes      = participants.filter(p => !p.isLocal).slice(0, 6);
  const extra        = Math.max(0, participants.filter(p => !p.isLocal).length - 6);
  if (remotes.length === 0) return null;
  return (
    <div className="flex items-center">
      {remotes.map((p, i) => {
        const name = p.name || p.identity || '?';
        return (
          <button
            key={p.identity}
            onClick={() => onGiftClick(p.identity, name)}
            title={`Envoyer un cadeau à ${name}`}
            style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i }}
            className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold border-2 border-black/60 hover:scale-110 transition-transform"
          >
            {name[0].toUpperCase()}
          </button>
        );
      })}
      {extra > 0 && (
        <div style={{ marginLeft: -8 }}
          className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-[9px] font-bold border-2 border-black/60">
          +{extra}
        </div>
      )}
    </div>
  );
}

// ── Compteur viewers ──────────────────────────────────────────────────────────

function ViewerCount() {
  const participants = useParticipants();
  return (
    <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
      <Eye size={11} /> {participants.length.toLocaleString()}
    </span>
  );
}

// ── Contrôles média latéraux ──────────────────────────────────────────────────

function MediaControls({
  isHost, liveId, onStop, stopping, onLeave, onHandRaise, handRaised,
  onToggleRequests, pendingCount, onToggleOnStage, onStageCount,
  onToggleGifts, giftsCount, onGiftToHost, hostName,
  isOnStage, onLeaveStage, guestCamOn, guestMicOn, onToggleGuestCam, onToggleGuestMic,
}: {
  isHost: boolean; liveId: string;
  onStop: () => void; stopping: boolean; onLeave: () => void;
  onHandRaise: () => void; handRaised: boolean;
  onToggleRequests: () => void; pendingCount: number;
  onToggleOnStage: () => void; onStageCount: number;
  onToggleGifts: () => void; giftsCount: number;
  onGiftToHost?: () => void; hostName?: string;
  isOnStage?: boolean; onLeaveStage?: () => void;
  guestCamOn?: boolean; guestMicOn?: boolean;
  onToggleGuestCam?: () => void; onToggleGuestMic?: () => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);

  useEffect(() => {
    if (!isHost) return;
    let cancelled = false;
    async function enableMedia() {
      try {
        await localParticipant.setCameraEnabled(true);
        if (!cancelled) setCamOn(true);
        await localParticipant.setMicrophoneEnabled(true);
        if (!cancelled) setMicOn(true);
      } catch { /* permission refusée */ }
    }
    enableMedia();
    return () => { cancelled = true; };
  }, [localParticipant, isHost]);

  async function toggleCam() {
    await localParticipant.setCameraEnabled(!camOn);
    setCamOn(v => !v);
  }
  async function toggleMic() {
    await localParticipant.setMicrophoneEnabled(!micOn);
    setMicOn(v => !v);
  }
  async function flipCam() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      if (videoInputs.length < 2) return;
      const current   = localParticipant.getTrackPublication(Track.Source.Camera);
      const currentId = (current?.track as any)?.mediaStreamTrack?.getSettings?.()?.deviceId;
      const next      = videoInputs.find(d => d.deviceId !== currentId) ?? videoInputs[0];
      await (localParticipant as any).switchActiveDevice('videoinput', next.deviceId);
    } catch { /* ignore */ }
  }

  function SideBtn({ icon, label, onClick, active, color, badge, danger }: {
    icon: React.ReactNode; label: string; onClick?: () => void;
    active?: boolean; color?: string; badge?: number; danger?: boolean;
  }) {
    const bg     = danger ? 'rgba(239,68,68,0.2)' : active ? `${color ?? '#7B3FF2'}25` : 'rgba(255,255,255,0.12)';
    const border = danger ? '#EF4444' : active ? (color ?? '#7B3FF2') : 'rgba(255,255,255,0.15)';
    const txt    = danger ? '#EF4444' : active ? (color ?? '#7B3FF2') : 'rgba(255,255,255,0.7)';
    return (
      <button onClick={onClick} className="flex flex-col items-center gap-1 relative" style={{ minWidth: 52 }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
          style={{ background: bg, border: `1.5px solid ${border}`, color: danger ? '#EF4444' : active ? (color ?? '#7B3FF2') : '#fff' }}>
          {icon}
        </div>
        {badge !== undefined && badge > 0 && (
          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ background: color ?? '#7B3FF2' }}>
            {badge}
          </div>
        )}
        <span className="text-[10px] font-semibold" style={{ color: txt }}>{label}</span>
      </button>
    );
  }

  return (
    <div className="flex items-end gap-4 flex-wrap justify-center py-2">

      {/* ── HOST ── */}
      {isHost && (
        <>
          <SideBtn icon={camOn ? <VideoIcon size={19} /> : <VideoOff size={19} />}
            label={camOn ? 'Cam' : 'Cam off'} onClick={toggleCam} active={camOn} color="#10B981" />
          <SideBtn icon={micOn ? <Mic size={19} /> : <MicOff size={19} />}
            label={micOn ? 'Micro' : 'Muet'} onClick={toggleMic} active={micOn} color="#10B981" />
          <SideBtn icon={<RefreshCw size={19} />} label="Flip" onClick={flipCam} />
          <SideBtn icon={<span className="text-lg">✋</span>}
            label={pendingCount > 0 ? `${pendingCount} dem.` : 'Demandes'}
            onClick={onToggleRequests} active={pendingCount > 0} color="#FFD700" badge={pendingCount} />
          {onStageCount > 0 && (
            <SideBtn icon={<Users size={19} />} label="Scène"
              onClick={onToggleOnStage} active color="#22c55e" badge={onStageCount} />
          )}
          {giftsCount > 0 && (
            <SideBtn icon={<Gift size={19} />} label="Cadeaux"
              onClick={onToggleGifts} active color="#FFD700" badge={giftsCount} />
          )}
          <SideBtn icon={<StopCircle size={19} />}
            label={stopping ? '...' : 'Terminer'} onClick={onStop} danger />
        </>
      )}

      {/* ── VIEWER sur scène ── */}
      {!isHost && isOnStage && (
        <>
          <SideBtn
            icon={guestCamOn ? <VideoIcon size={19} /> : <VideoOff size={19} />}
            label={guestCamOn ? 'Cam' : 'Cam off'}
            onClick={onToggleGuestCam} active={guestCamOn} color="#10B981" />
          <SideBtn
            icon={guestMicOn ? <Mic size={19} /> : <MicOff size={19} />}
            label={guestMicOn ? 'Micro' : 'Muet'}
            onClick={onToggleGuestMic} active={guestMicOn} color="#10B981" />
          <SideBtn
            icon={<Gift size={19} />} label="Cadeau"
            onClick={onGiftToHost} color="#FFD700" active />
          <SideBtn
            icon={<ChevronLeft size={19} />} label="Descendre"
            onClick={onLeaveStage} danger />
          <SideBtn
            icon={<X size={19} />} label="Quitter"
            onClick={onLeave} danger />
        </>
      )}

      {/* ── VIEWER normal (pas sur scène) ── */}
      {!isHost && !isOnStage && (
        <>
          <SideBtn
            icon={<Gift size={19} />} label="Cadeau"
            onClick={onGiftToHost} color="#FFD700" active />
          <SideBtn
            icon={<Hand size={19} />}
            label={handRaised ? 'En attente...' : 'Lever main'}
            onClick={onHandRaise} active={handRaised} color="#FFD700" />
          <SideBtn
            icon={<X size={19} />} label="Quitter"
            onClick={onLeave} danger />
        </>
      )}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function LiveSimplePage() {
  const { id: slug }  = useParams<{ id: string }>();
  const id             = decodeId(slug!);
  const navigate       = useNavigate();
  const location       = useLocation();
  const { user, accessToken } = useAuthStore();

  const stateToken: string | null = (location.state as any)?.publisherToken ?? null;
  const stateLkUrl: string | null = (location.state as any)?.livekitUrl ?? null;

  const [lkToken,  setLkToken]  = useState<string | null>(stateToken);
  const [lkUrl,    setLkUrl]    = useState<string | null>(stateLkUrl);
  const [showChat, setShowChat] = useState(true);
  const [stopping, setStopping] = useState(false);

  // Emojis flottants
  const [emojiFloats, setEmojiFloats] = useState<EmojiFloat[]>([]);

  // Cadeaux
  const [giftNotifs,  setGiftNotifs]  = useState<GiftNotif[]>([]);
  const [activeToast, setActiveToast] = useState<GiftNotif | null>(null);
  const [giftTarget,  setGiftTarget]  = useState<{ id: string; name: string } | null>(null);
  const [giftHistory, setGiftHistory] = useState<GiftTick[]>([]);

  // Modération
  const [handRequests,    setHandRequests]    = useState<HandRequest[]>([]);
  const [stageIdentities, setStageIdentities] = useState<Set<string>>(new Set());
  const [participantNames, setParticipantNames] = useState<Map<string, string>>(new Map());
  const [handRaised,      setHandRaised]      = useState(false);

  // Guest sur scène (viewer invité)
  const [isOnStage,    setIsOnStage]    = useState(false);
  const [guestCamOn,   setGuestCamOn]   = useState(false);
  const [guestMicOn,   setGuestMicOn]   = useState(false);

  // Panels
  const [showRequests, setShowRequests] = useState(false);
  const [showOnStage,  setShowOnStage]  = useState(false);
  const [showGifts,    setShowGifts]    = useState(false);

  const chatRef            = useRef<LiveChatHandle>(null);
  const participantNamesRef = useRef<Map<string, string>>(new Map());

  // Synchronise le ref à chaque update du state pour éviter les closures stales
  useEffect(() => { participantNamesRef.current = participantNames; }, [participantNames]);

  const liveApi = useApi<LiveStream>(() => apiClient.get<LiveStream>(Endpoints.lives.byId(id!)), [id]);
  const { lastLiveEnded } = useWs();

  const live     = liveApi.data;
  const isHost   = !!(live && user && live.user_id === user.id);
  const isActive = live?.status === 'active';

  useEffect(() => {
    if (!id || !isActive || !live || lkToken) return;
    apiClient.get<StreamToken>(Endpoints.lives.token(id))
      .then(r => { setLkToken(r.data.token); setLkUrl(r.data.livekit_url); })
      .catch(() => {});
  }, [id, isActive, live, lkToken]);

  useEffect(() => {
    if (!lastLiveEnded || lastLiveEnded !== id) return;
    liveApi.refetch();
  }, [lastLiveEnded, id]);

  const handleWsEvent = useCallback((d: any) => {
    switch (d.type) {
      case 'gift_received': {
        const n: GiftNotif = {
          id:         d.gift?.id ?? String(Date.now()),
          senderName: d.gift?.sender?.display_name ?? d.gift?.sender?.username ?? 'Quelqu\'un',
          emoji:      d.gift?.gift_type?.emoji ?? d.gift?.emoji ?? '🎁',
          giftName:   d.gift?.gift_type?.name  ?? d.gift?.name  ?? 'Cadeau',
          coins:      d.gift?.coins_spent ?? d.gift?.coins_cost ?? 0,
        };
        setGiftNotifs(prev => [...prev.slice(-9), n]);
        setGiftHistory(prev => [...prev, { ...n }]);
        if (isHost) setActiveToast(n);
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
        // Ouvrir automatiquement le panel demandes pour le host
        if (isHost) {
          setShowRequests(true);
          setShowOnStage(false);
          setShowGifts(false);
        }
        break;
      }
      case 'live_guest_invited': {
        const identity = d.identity ?? d.user?.identity;
        if (!identity) break;
        setStageIdentities(prev => new Set([...prev, identity]));
        setHandRequests(prev => prev.filter(r => r.identity !== identity));
        chatRef.current?.addSysMsg(`${participantNamesRef.current.get(identity) ?? identity} est monté sur scène`);
        // Si c'est moi qui suis invité → monter sur scène
        if (user && identity === user.id) {
          setIsOnStage(true);
          setHandRaised(false);
        }
        break;
      }
      case 'live_guest_demoted': {
        const identity = d.identity ?? d.user?.identity;
        if (!identity) break;
        setStageIdentities(prev => { const s = new Set(prev); s.delete(identity); return s; });
        chatRef.current?.addSysMsg(`${participantNamesRef.current.get(identity) ?? identity} a quitté la scène`);
        // Si c'est moi qui suis redescendu
        if (user && identity === user.id) {
          setIsOnStage(false);
          setGuestCamOn(false);
          setGuestMicOn(false);
        }
        break;
      }
      case 'viewer_kicked':
      case 'live_user_globally_banned': {
        const kickedId = d.identity ?? d.user_id;
        if (kickedId && user && kickedId === user.id) navigate(-1);
        break;
      }
    }
  }, [isHost, user, navigate]);

  const handleStop = useCallback(async () => {
    if (!id) return;
    if (!window.confirm('Terminer le live ? Tous les viewers seront déconnectés.')) return;
    setStopping(true);
    try {
      await apiClient.post(Endpoints.lives.stop(id));
      liveApi.refetch();
    } catch { /* error */ }
    finally { setStopping(false); }
  }, [id, liveApi]);

  const handleLeave  = useCallback(() => navigate(-1), [navigate]);

  const handleHandRaise = useCallback(async () => {
    if (!id || !user) return;
    setHandRaised(true);
    try { await apiClient.post(Endpoints.lives.handRaise(id, user.id)); }
    catch { /* silencieux */ }
  }, [id, user]);

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
  }, []);

  if (liveApi.loading) return <PageLoader />;
  if (!live) return <div className="p-6 text-[var(--text-secondary)]">Live introuvable.</div>;

  return (
    <>
      <style>{LIVE_ANIMATIONS_CSS}</style>

      <div className="flex h-[calc(100vh-57px)] overflow-hidden bg-black">
        <div className="flex-1 flex flex-col min-w-0">
          {isActive && lkToken && lkUrl ? (
            <LiveKitRoom
              token={lkToken}
              serverUrl={lkUrl}
              connect
              options={isHost ? CREATOR_ROOM_OPTIONS : VIEWER_ROOM_OPTIONS}
              className="flex-1 flex flex-col min-w-0 min-h-0"
            >
              <RoomAudioRenderer />

              {/* ── Header ───────────────────────────────────────────────── */}
              <div className="flex items-center gap-3 px-4 py-3 bg-black/80 border-b border-white/10 shrink-0 flex-wrap gap-y-2">
                <button onClick={handleLeave} className="text-white/60 hover:text-white transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <Avatar src={live.user?.avatar_url} name={live.user?.display_name ?? live.user?.username} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white text-sm truncate">{live.title}</p>
                  <p className="text-xs text-white/50 truncate">{live.user?.display_name ?? live.user?.username}</p>
                </div>

                {/* Avatars viewers empilés */}
                <ViewerAvatars onGiftClick={(id, name) => setGiftTarget({ id, name })} />

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-white"
                    style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 0 10px rgba(123,63,242,0.5)' }}>
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                  </span>
                  {live.is_private && (
                    <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-white"
                      style={{ background: 'rgba(123,63,242,0.85)', border: '1px solid rgba(123,63,242,0.5)' }}>
                      <Lock size={10} /> Abonnés
                    </span>
                  )}
                  <LiveTimer startedAt={live.started_at} />
                  <ViewerCount />
                </div>
                <button onClick={() => setShowChat(v => !v)} className="text-white/60 hover:text-white transition-colors ml-1 lg:hidden">
                  <MessageCircle size={18} />
                </button>
              </div>

              {/* ── Player + overlays ─────────────────────────────────── */}
              <div className="flex-1 relative bg-black overflow-hidden">
                <LiveKitViewer
                  isHost={isHost} liveId={id!}
                  stageIdentities={stageIdentities}
                  participantNames={participantNames}
                  onGiftClick={(identity, name) => setGiftTarget({ id: identity, name })}
                />

                {/* Panels modération */}
                {showRequests && (
                  <HandRequestsPanel
                    liveId={id!} requests={handRequests}
                    onInvite={handleInvite} onDismiss={handleDismiss}
                    onClose={() => setShowRequests(false)}
                  />
                )}
                {showOnStage && stageIdentities.size > 0 && (
                  <OnStagePanel
                    liveId={id!} identities={stageIdentities}
                    names={participantNames}
                    onDemote={handleDemote}
                    onClose={() => setShowOnStage(false)}
                  />
                )}
                {showGifts && giftHistory.length > 0 && (
                  <GiftHistoryPanel history={giftHistory} onClose={() => setShowGifts(false)} />
                )}

                {/* Emojis flottants */}
                <FloatingEmojiOverlay floats={emojiFloats} />

                {/* Gift ticker bas gauche */}
                <div className="absolute bottom-24 left-3 z-30">
                  <GiftTicker notifs={giftNotifs} />
                </div>

                {/* Gift toast host */}
                {isHost && activeToast && (
                  <div className="absolute top-16 right-3 z-30">
                    <GiftToast notif={activeToast} onDone={() => setActiveToast(null)} />
                  </div>
                )}

                {/* ── Barre bas ────────────────────────────────────────── */}
                <div className="absolute bottom-0 left-0 right-0 p-4 z-20"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
                  <div className="flex items-end gap-4">

                    {/* Contrôles media */}
                    <div className="flex-1 min-w-0">
                      <MediaControls
                        isHost={isHost} liveId={id!}
                        onStop={handleStop} stopping={stopping}
                        onLeave={handleLeave}
                        onHandRaise={handleHandRaise} handRaised={handRaised}
                        onToggleRequests={() => { setShowRequests(v => !v); setShowOnStage(false); setShowGifts(false); }}
                        pendingCount={handRequests.length}
                        onToggleOnStage={() => { setShowOnStage(v => !v); setShowRequests(false); setShowGifts(false); }}
                        onStageCount={stageIdentities.size}
                        onToggleGifts={() => { setShowGifts(v => !v); setShowRequests(false); setShowOnStage(false); }}
                        giftsCount={giftHistory.length}
                        onGiftToHost={() => live?.user?.id && setGiftTarget({ id: live.user.id, name: live.user?.display_name ?? live.user?.username ?? 'Host' })}
                        hostName={live?.user?.display_name ?? live?.user?.username ?? 'Host'}
                        isOnStage={isOnStage}
                        onLeaveStage={async () => {
                          try { await apiClient.post(Endpoints.lives.demote(id!, user?.id ?? '')); } catch {}
                          setIsOnStage(false); setGuestCamOn(false); setGuestMicOn(false);
                        }}
                        guestCamOn={guestCamOn}
                        guestMicOn={guestMicOn}
                        onToggleGuestCam={() => setGuestCamOn(v => !v)}
                        onToggleGuestMic={() => setGuestMicOn(v => !v)}
                      />
                    </div>

                    {/* Interactions droite */}
                    <div className="flex flex-col gap-3 shrink-0">
                      <LiveLikeButton liveId={id!} initialCount={live.likes_count ?? 0} />
                      <LiveReactionPicker
                        liveId={id!}
                        onFloats={items => {
                          setEmojiFloats(prev => [...prev.slice(-15), ...items]);
                          items.forEach(f => setTimeout(() => setEmojiFloats(prev => prev.filter(x => x.id !== f.id)), 2000));
                        }}
                      />
                      {!isHost && live.user?.id && (
                        <button
                          onClick={() => setGiftTarget({ id: live.user!.id, name: live.user?.display_name ?? live.user?.username ?? 'Hôte' })}
                          className="flex flex-col items-center gap-1">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl"
                            style={{ background: 'rgba(123,63,242,0.15)', border: '1.5px solid rgba(123,63,242,0.35)' }}>
                            🎁
                          </div>
                          <span className="text-white text-xs font-bold" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>Cadeau</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {live.description && (
                <div className="shrink-0 px-4 py-2.5 border-t border-white/10 bg-black/80">
                  <p className="text-xs text-white/60 line-clamp-1">{live.description}</p>
                </div>
              )}
            </LiveKitRoom>

          ) : isActive ? (
            <>
              <div className="flex items-center gap-3 px-4 py-3 bg-black/80 border-b border-white/10 shrink-0">
                <button onClick={handleLeave} className="text-white/60 hover:text-white transition-colors">
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
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center animate-pulse">
                  <Radio size={28} className="opacity-60" />
                </div>
                <p className="text-sm opacity-60">Connexion au live...</p>
              </div>
            </>

          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3 bg-black/80 border-b border-white/10 shrink-0">
                <button onClick={handleLeave} className="text-white/60 hover:text-white transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <p className="font-semibold text-white text-sm truncate flex-1">{live.title}</p>
                <span className="text-xs text-white/40 bg-white/5 px-2.5 py-1 rounded-full">Terminé</span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-white gap-3">
                <Radio size={40} className="opacity-30" />
                <p className="font-semibold opacity-60">Ce live est terminé</p>
                <button onClick={() => navigate('/lives')} className="btn-ghost text-white/60 border-white/20 hover:bg-white/10 text-sm mt-2">
                  Voir d'autres lives
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Chat ────────────────────────────────────────────────────── */}
        {showChat && (
          <div className="w-80 border-l border-white/10 bg-black flex flex-col hidden lg:flex shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <MessageCircle size={15} className="text-brand-primary" /> Chat live
              </h3>
              <button onClick={() => setShowChat(false)} className="text-white/40 hover:text-white/70 transition-colors p-1">
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <LiveChat
                ref={chatRef}
                liveId={id!} accessToken={accessToken}
                isHost={isHost}
                onWsEvent={handleWsEvent}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Gift modal ────────────────────────────────────────────────── */}
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
          }}
        />
      )}
    </>
  );
}
