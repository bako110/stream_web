import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Radio, Eye, MessageCircle, Send, X, StopCircle, ChevronLeft,
  Mic, MicOff, VideoIcon, VideoOff, Gift, Hand, FlipHorizontal,
  ShieldOff, Ban, Lock,
} from 'lucide-react';
import {
  LiveKitRoom,
  VideoTrack,
  useParticipants,
  useTracks,
  RoomAudioRenderer,
  useLocalParticipant,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
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

// ── Types internes ─────────────────────────────────────────────────────────────

interface ChatMsg { id: string; user: string; avatar?: string | null; text: string; }
interface EmojiFloat { id: number; emoji: string; x: number; size: number; }
interface HandRaiseRequest { identity: string; name: string; }

// ── Chat ──────────────────────────────────────────────────────────────────────

function LiveChat({
  liveId,
  accessToken,
  onWsEvent,
}: {
  liveId: string;
  accessToken: string | null;
  onWsEvent: (d: any) => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const wsRef     = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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
            avatar: c.author?.avatar_url ?? null,
            text:   c.body,
          }]);
        }
        // Propagate all events to parent
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
    setInput('');
    setSending(true);
    try {
      await apiClient.post(Endpoints.social.comments, { body, live_id: liveId });
    } catch { /* silencieux */ }
    finally { setSending(false); }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-center text-xs text-[var(--text-tertiary)] pt-8">Aucun message pour l'instant</p>
        )}
        {messages.map(m => (
          <div key={m.id} className="flex gap-2 items-start">
            <Avatar src={m.avatar} name={m.user} size="xs" className="shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-xs font-semibold text-brand-primary">{m.user} </span>
              <span className="text-xs text-[var(--text-primary)] break-words">{m.text}</span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-[var(--border)] flex gap-2 shrink-0">
        <input
          className="input text-sm py-1.5 flex-1 min-w-0"
          placeholder="Commenter..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
        />
        <button onClick={send} className="btn-primary p-2 aspect-square shrink-0">
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Panel demandes de prise de parole (host) ──────────────────────────────────

function HandRequestsPanel({
  liveId,
  requests,
  onInvite,
  onDismiss,
}: {
  liveId: string;
  requests: HandRaiseRequest[];
  onInvite: (identity: string) => void;
  onDismiss: (identity: string) => void;
}) {
  if (requests.length === 0) return null;
  return (
    <div className="absolute top-16 left-3 z-30 space-y-2 max-w-[200px]">
      {requests.map(r => (
        <div key={r.identity}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl text-xs text-white"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)' }}>
          <Hand size={12} className="text-yellow-400 shrink-0" />
          <span className="truncate flex-1">{r.name}</span>
          <button
            onClick={() => onInvite(r.identity)}
            className="px-2 py-0.5 rounded-lg font-semibold text-[10px] text-white shrink-0"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#A855F7)' }}>
            Inviter
          </button>
          <button onClick={() => onDismiss(r.identity)} className="text-white/40 hover:text-white shrink-0">
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Menu modération sur vignette ───────────────────────────────────────────────

function ParticipantContextMenu({
  identity,
  name,
  liveId,
  isHost,
  isOnStage,
  onDone,
}: {
  identity: string;
  name: string;
  liveId: string;
  isHost: boolean;
  isOnStage: boolean;
  onDone: () => void;
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
    <div className="absolute inset-0 bg-black/80 rounded-2xl flex flex-col items-center justify-center gap-2 z-10 p-2">
      <p className="text-[10px] text-white/70 text-center truncate w-full">{name}</p>
      {isOnStage ? (
        <button onClick={() => act(Endpoints.lives.demote(liveId, identity))}
          className="flex items-center gap-1 text-[10px] text-orange-300 bg-orange-400/20 px-2 py-1 rounded-lg w-full justify-center">
          <ShieldOff size={10} /> Retirer
        </button>
      ) : (
        <button onClick={() => act(Endpoints.lives.invite(liveId, identity))}
          className="flex items-center gap-1 text-[10px] text-purple-300 bg-purple-400/20 px-2 py-1 rounded-lg w-full justify-center">
          <Hand size={10} /> Inviter
        </button>
      )}
      <button onClick={() => act(Endpoints.lives.ban(liveId, identity))}
        className="flex items-center gap-1 text-[10px] text-red-300 bg-red-400/20 px-2 py-1 rounded-lg w-full justify-center">
        <Ban size={10} /> Exclure ce live
      </button>
      <button onClick={() => act(Endpoints.lives.globalBan(liveId, identity))}
        className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/25 px-2 py-1 rounded-lg w-full justify-center">
        <Ban size={10} /> Bannir (tous lives)
      </button>
      <button onClick={() => act(Endpoints.lives.blockUser(identity))}
        className="flex items-center gap-1 text-[10px] text-purple-300 bg-purple-500/20 px-2 py-1 rounded-lg w-full justify-center">
        <Lock size={10} /> Bloquer de mes lives
      </button>
      <button onClick={onDone} className="text-[10px] text-white/40 mt-1">Annuler</button>
    </div>
  );
}

// ── Zone vidéo multi-participants ─────────────────────────────────────────────

function LiveKitViewer({
  isHost,
  liveId,
  stageIdentities,
  onGiftClick,
}: {
  isHost: boolean;
  liveId: string;
  stageIdentities: Set<string>;
  onGiftClick: (identity: string, name: string) => void;
}) {
  const tracks       = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const participants = useParticipants();
  const [spotlightId,    setSpotlightId]    = useState<string | null>(null);
  const [contextMenuId,  setContextMenuId]  = useState<string | null>(null);

  const activeTracks = tracks.filter(t => !t.publication?.isMuted);

  const defaultSpotlight = isHost
    ? (activeTracks.find(t => t.participant.isLocal) ?? activeTracks[0] ?? null)
    : (activeTracks.find(t => !t.participant.isLocal) ?? activeTracks[0] ?? null);

  const spotlightTrack  = activeTracks.find(t => t.participant.identity === spotlightId) ?? defaultSpotlight;
  const thumbnailTracks = activeTracks.filter(t => t !== spotlightTrack);
  const localTrack      = activeTracks.find(t => t.participant.isLocal) ?? null;

  const showHostPip = isHost
    && spotlightTrack
    && !spotlightTrack.participant.isLocal
    && localTrack != null;

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
        <VideoTrack trackRef={spotlightTrack} className="w-full h-full object-cover" />
      )}

      {spotlightTrack && (
        <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm z-10 flex items-center gap-1.5">
          {stageIdentities.has(spotlightTrack.participant.identity) && (
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          )}
          {spotlightTrack.participant.isLocal ? 'Toi' : (spotlightTrack.participant.name || spotlightTrack.participant.identity)}
        </div>
      )}

      {showHostPip && localTrack && (
        <div
          className="absolute bottom-20 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/40 shadow-2xl cursor-pointer z-20 hover:border-brand-primary transition-all"
          onClick={() => setSpotlightId(null)}
          title="Revenir sur ta vue"
        >
          <VideoTrack trackRef={localTrack} className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-1">
            Toi
          </div>
        </div>
      )}

      {thumbnailTracks.length > 0 && (
        <div className="absolute bottom-20 left-3 flex flex-col gap-2 z-20">
          {thumbnailTracks.map(t => {
            const identity  = t.participant.identity;
            const name      = t.participant.isLocal ? 'Toi' : (t.participant.name || identity);
            const onStage   = stageIdentities.has(identity);
            const showMenu  = contextMenuId === identity;
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
                title={isHost && !t.participant.isLocal ? 'Options modération' : 'Mettre en plein écran'}
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
                    identity={identity}
                    name={name}
                    liveId={liveId}
                    isHost={isHost}
                    isOnStage={onStage}
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

// ── Compteur viewers ──────────────────────────────────────────────────────────

function ViewerCount() {
  const participants = useParticipants();
  return (
    <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
      <Eye size={11} /> {participants.length.toLocaleString()}
    </span>
  );
}

// ── Contrôles media ───────────────────────────────────────────────────────────

function MediaControls({
  isHost,
  liveId,
  onStop,
  stopping,
  onLeave,
  onHandRaise,
  handRaised,
}: {
  isHost: boolean;
  liveId: string;
  onStop: () => void;
  stopping: boolean;
  onLeave: () => void;
  onHandRaise: () => void;
  handRaised: boolean;
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
      const current = localParticipant.getTrackPublication(Track.Source.Camera);
      const currentId = (current?.track as any)?.mediaStreamTrack?.getSettings?.()?.deviceId;
      const next = videoInputs.find(d => d.deviceId !== currentId) ?? videoInputs[0];
      await (localParticipant as any).switchActiveDevice('videoinput', next.deviceId);
    } catch { /* ignore */ }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isHost && (
        <>
          <button onClick={toggleCam}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${camOn ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'}`}>
            {camOn ? <VideoIcon size={13} /> : <VideoOff size={13} />}
            {camOn ? 'Cam ON' : 'Cam OFF'}
          </button>
          <button onClick={toggleMic}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${micOn ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'}`}>
            {micOn ? <Mic size={13} /> : <MicOff size={13} />}
            {micOn ? 'Micro ON' : 'Micro OFF'}
          </button>
          <button onClick={flipCam}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/10 text-white/60 hover:bg-white/20 transition-all"
            title="Retourner la caméra">
            <FlipHorizontal size={13} />
          </button>
        </>
      )}

      {!isHost && (
        <button onClick={onHandRaise}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${handRaised ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-white/60'}`}>
          <Hand size={13} />
          {handRaised ? 'Main levée' : 'Lever la main'}
        </button>
      )}

      {isHost ? (
        <button onClick={onStop} disabled={stopping}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all">
          {stopping ? <Spinner size="sm" /> : <StopCircle size={13} />}
          {stopping ? 'Arrêt...' : 'Terminer le live'}
        </button>
      ) : (
        <button onClick={onLeave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/10 text-white/70 hover:bg-white/20 transition-all">
          <ChevronLeft size={13} />
          Quitter
        </button>
      )}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function LiveSimplePage() {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const location     = useLocation();
  const { user, accessToken } = useAuthStore();

  const stateToken: string | null = (location.state as any)?.publisherToken ?? null;
  const stateLkUrl: string | null = (location.state as any)?.livekitUrl ?? null;

  const [lkToken,  setLkToken]  = useState<string | null>(stateToken);
  const [lkUrl,    setLkUrl]    = useState<string | null>(stateLkUrl);
  const [showChat, setShowChat] = useState(true);
  const [stopping, setStopping] = useState(false);

  // Likes / réactions / emojis flottants
  const [emojiFloats, setEmojiFloats] = useState<EmojiFloat[]>([]);

  // Cadeaux
  const [giftNotifs,   setGiftNotifs]   = useState<GiftNotif[]>([]);
  const [activeToast,  setActiveToast]  = useState<GiftNotif | null>(null);
  const [giftTarget,   setGiftTarget]   = useState<{ id: string; name: string } | null>(null);

  // Modération
  const [handRequests,    setHandRequests]    = useState<HandRaiseRequest[]>([]);
  const [stageIdentities, setStageIdentities] = useState<Set<string>>(new Set());
  const [handRaised,      setHandRaised]      = useState(false);

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

  // Gestion des événements WS live
  const handleWsEvent = useCallback((d: any) => {
    switch (d.type) {
      case 'gift_received': {
        const n: GiftNotif = {
          id:         d.gift?.id ?? String(Date.now()),
          senderName: d.gift?.sender?.display_name ?? d.gift?.sender?.username ?? 'Quelqu\'un',
          emoji:      d.gift?.emoji ?? '🎁',
          giftName:   d.gift?.name ?? 'Cadeau',
          coins:      d.gift?.coins_cost ?? 0,
        };
        setGiftNotifs(prev => [...prev.slice(-9), n]);
        if (isHost) setActiveToast(n);
        break;
      }
      case 'like_added':
        // remote heart already tracked by LiveLikeButton via initialCount
        break;
      case 'reaction_added': {
        const emoji = d.reaction?.emoji ?? '❤️';
        const floatId = Date.now();
        const items: EmojiFloat[] = Array.from({ length: 5 }, (_, i) => ({
          id:    floatId + i,
          emoji,
          x:     Math.random() * 80 + 10,
          size:  Math.random() * 16 + 24,
        }));
        setEmojiFloats(prev => [...prev.slice(-30), ...items]);
        items.forEach(f => {
          setTimeout(() => setEmojiFloats(prev => prev.filter(x => x.id !== f.id)), 1800);
        });
        break;
      }
      case 'live_hand_raise': {
        const identity = d.identity ?? d.user?.identity;
        const name     = d.user?.display_name ?? d.user?.username ?? identity;
        if (!identity) break;
        setHandRequests(prev => prev.some(r => r.identity === identity) ? prev : [...prev, { identity, name }]);
        break;
      }
      case 'live_guest_invited': {
        const identity = d.identity ?? d.user?.identity;
        if (!identity) break;
        setStageIdentities(prev => new Set([...prev, identity]));
        setHandRequests(prev => prev.filter(r => r.identity !== identity));
        break;
      }
      case 'live_guest_demoted': {
        const identity = d.identity ?? d.user?.identity;
        if (!identity) break;
        setStageIdentities(prev => { const s = new Set(prev); s.delete(identity); return s; });
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
    setStopping(true);
    try {
      await apiClient.post(Endpoints.lives.stop(id));
      liveApi.refetch();
    } catch { /* error */ }
    finally { setStopping(false); }
  }, [id, liveApi]);

  const handleLeave = useCallback(() => { navigate(-1); }, [navigate]);

  const handleHandRaise = useCallback(async () => {
    if (!id || !user) return;
    setHandRaised(true);
    try {
      await apiClient.post(Endpoints.lives.handRaise(id, user.id));
    } catch { /* silencieux */ }
  }, [id, user]);

  const handleInvite = useCallback(async (identity: string) => {
    if (!id) return;
    try { await apiClient.post(Endpoints.lives.invite(id, identity)); } catch { /* silencieux */ }
    setStageIdentities(prev => new Set([...prev, identity]));
    setHandRequests(prev => prev.filter(r => r.identity !== identity));
  }, [id]);

  const handleDismissHandRaise = useCallback((identity: string) => {
    setHandRequests(prev => prev.filter(r => r.identity !== identity));
  }, []);

  if (liveApi.loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;
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
              className="flex-1 flex flex-col min-w-0 min-h-0"
            >
              <RoomAudioRenderer />

              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-black/80 border-b border-white/10 shrink-0">
                <button onClick={handleLeave} className="text-white/60 hover:text-white transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <Avatar src={live.user?.avatar_url} name={live.user?.display_name ?? live.user?.username} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{live.title}</p>
                  <p className="text-xs text-white/50 truncate">{live.user?.display_name ?? live.user?.username}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-white"
                    style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)', boxShadow: '0 0 10px rgba(240,54,90,0.5)' }}>
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

              {/* Player + overlays */}
              <div className="flex-1 relative bg-black overflow-hidden">
                <LiveKitViewer
                  isHost={isHost}
                  liveId={id!}
                  stageIdentities={stageIdentities}
                  onGiftClick={(identity, name) => setGiftTarget({ id: identity, name })}
                />

                {/* Hand requests panel (host) */}
                <HandRequestsPanel
                  liveId={id!}
                  requests={handRequests}
                  onInvite={handleInvite}
                  onDismiss={handleDismissHandRaise}
                />

                {/* Floating emoji overlay */}
                <FloatingEmojiOverlay floats={emojiFloats} />

                {/* Gift ticker — bottom left */}
                <div className="absolute bottom-20 left-3 z-30">
                  <GiftTicker notifs={giftNotifs} />
                </div>

                {/* Gift toast pour le host */}
                {isHost && activeToast && (
                  <div className="absolute top-16 right-3 z-30">
                    <GiftToast notif={activeToast} onDone={() => setActiveToast(null)} />
                  </div>
                )}

                {/* Barre controls + interactions */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-30">
                  <div className="flex items-end gap-3">
                    {/* Interactions verticales — droite */}
                    <div className="flex flex-col gap-3 ml-auto">
                      <LiveLikeButton liveId={id!} initialCount={live.likes_count ?? 0} />
                      <LiveReactionPicker
                        liveId={id!}
                        onFloats={items => {
                          setEmojiFloats(prev => [...prev.slice(-30), ...items]);
                          items.forEach(f => {
                            setTimeout(() => setEmojiFloats(prev => prev.filter(x => x.id !== f.id)), 1800);
                          });
                        }}
                      />
                      {!isHost && live.user?.id && (
                        <button
                          onClick={() => setGiftTarget({ id: live.user!.id, name: live.user?.display_name ?? live.user?.username ?? 'Hôte' })}
                          className="flex flex-col items-center gap-1">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                            style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                            🎁
                          </div>
                          <span className="text-white text-xs font-bold" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>Cadeau</span>
                        </button>
                      )}
                    </div>

                    {/* Controles media — gauche */}
                    <div className="flex-1 min-w-0">
                      <MediaControls
                        isHost={isHost}
                        liveId={id!}
                        onStop={handleStop}
                        stopping={stopping}
                        onLeave={handleLeave}
                        onHandRaise={handleHandRaise}
                        handRaised={handRaised}
                      />
                    </div>
                  </div>
                </div>
              </div>

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
                  style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)' }}>
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

        {/* Chat */}
        {showChat && (
          <div className="w-80 border-l border-white/10 bg-[var(--surface)] flex flex-col hidden lg:flex shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
              <h3 className="font-semibold text-[var(--text-primary)] text-sm flex items-center gap-2">
                <MessageCircle size={15} className="text-brand-primary" /> Chat
              </h3>
              <button onClick={() => setShowChat(false)} className="btn-ghost p-1 text-[var(--text-tertiary)]">
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <LiveChat liveId={id!} accessToken={accessToken} onWsEvent={handleWsEvent} />
            </div>
          </div>
        )}
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
            setGiftTarget(null);
          }}
        />
      )}
    </>
  );
}
