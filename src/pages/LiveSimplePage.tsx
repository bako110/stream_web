import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Radio, Eye, MessageCircle, Send, X, StopCircle, ChevronLeft, Mic, MicOff, VideoIcon, VideoOff } from 'lucide-react';
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

// ── Chat ──────────────────────────────────────────────────────────────────────

interface ChatMsg { id: string; user: string; avatar?: string | null; text: string; }

function LiveChat({ liveId, accessToken }: { liveId: string; accessToken: string | null }) {
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
      } catch { /* ignore */ }
    };
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('{"type":"ping"}');
    }, 25_000);
    return () => { clearInterval(ping); ws.close(); };
  }, [liveId, accessToken]);

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

// ── Zone vidéo multi-participants ─────────────────────────────────────────────
// - Spotlight (plein écran) : par défaut le host, sinon le 1er remote
// - Cliquer sur une vignette met ce participant en spotlight
// - Le host passe en PiP (coin bas droit) quand un viewer est en spotlight
// - Cliquer sur le PiP revient au spotlight du host

function LiveKitViewer({ isHost }: { isHost: boolean }) {
  const tracks      = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const participants = useParticipants();
  const [spotlightId, setSpotlightId] = useState<string | null>(null);

  // Tracks avec vidéo active (non muté)
  const activeTracks = tracks.filter(t => !t.publication?.isMuted);

  // Spotlight par défaut
  const defaultSpotlight = isHost
    ? (activeTracks.find(t => t.participant.isLocal) ?? activeTracks[0] ?? null)
    : (activeTracks.find(t => !t.participant.isLocal) ?? activeTracks[0] ?? null);

  const spotlightTrack = activeTracks.find(t => t.participant.identity === spotlightId) ?? defaultSpotlight;
  const thumbnailTracks = activeTracks.filter(t => t !== spotlightTrack);
  const localTrack = activeTracks.find(t => t.participant.isLocal) ?? null;

  // PiP host visible quand un viewer est en spotlight
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

      {/* Plein écran — spotlight */}
      {spotlightTrack && (
        <VideoTrack trackRef={spotlightTrack} className="w-full h-full object-cover" />
      )}

      {/* Nom du participant en spotlight */}
      {spotlightTrack && (
        <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm z-10">
          {spotlightTrack.participant.isLocal ? 'Toi' : (spotlightTrack.participant.name || spotlightTrack.participant.identity)}
        </div>
      )}

      {/* PiP du host quand un viewer est en spotlight */}
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

      {/* Vignettes — autres participants avec caméra active */}
      {thumbnailTracks.length > 0 && (
        <div className="absolute bottom-20 left-3 flex flex-col gap-2 z-20">
          {thumbnailTracks.map(t => (
            <div
              key={t.participant.identity}
              className="w-24 h-36 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl cursor-pointer hover:border-brand-primary transition-all relative"
              onClick={() => setSpotlightId(t.participant.identity)}
              title={`Mettre en plein écran`}
            >
              <VideoTrack trackRef={t} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] truncate text-center py-1 px-1">
                {t.participant.isLocal ? 'Toi' : (t.participant.name || t.participant.identity)}
              </div>
            </div>
          ))}
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
  onStop,
  stopping,
  onLeave,
}: {
  isHost: boolean;
  onStop: () => void;
  stopping: boolean;
  onLeave: () => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);

  useEffect(() => {
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
  }, [localParticipant]);

  async function toggleCam() {
    await localParticipant.setCameraEnabled(!camOn);
    setCamOn(v => !v);
  }
  async function toggleMic() {
    await localParticipant.setMicrophoneEnabled(!micOn);
    setMicOn(v => !v);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleCam}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${camOn ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'}`}
      >
        {camOn ? <VideoIcon size={13} /> : <VideoOff size={13} />}
        {camOn ? 'Cam ON' : 'Cam OFF'}
      </button>
      <button
        onClick={toggleMic}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${micOn ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'}`}
      >
        {micOn ? <Mic size={13} /> : <MicOff size={13} />}
        {micOn ? 'Micro ON' : 'Micro OFF'}
      </button>

      {isHost ? (
        <button
          onClick={onStop}
          disabled={stopping}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
        >
          {stopping ? <Spinner size="sm" /> : <StopCircle size={13} />}
          {stopping ? 'Arrêt...' : 'Terminer le live'}
        </button>
      ) : (
        <button
          onClick={onLeave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/10 text-white/70 hover:bg-white/20 transition-all"
        >
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

  if (liveApi.loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;
  if (!live) return <div className="p-6 text-[var(--text-secondary)]">Live introuvable.</div>;

  function RoomContent() {
    return (
      <>
        <RoomAudioRenderer />

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-black/80 border-b border-white/10 shrink-0">
          <button onClick={handleLeave} className="text-white/60 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <Avatar src={live!.user?.avatar_url} name={live!.user?.display_name ?? live!.user?.username} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm truncate">{live!.title}</p>
            <p className="text-xs text-white/50 truncate">{live!.user?.display_name ?? live!.user?.username}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-white"
              style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)', boxShadow: '0 0 10px rgba(240,54,90,0.5)' }}
            >
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
            </span>
            <ViewerCount />
          </div>
          <button onClick={() => setShowChat(v => !v)} className="text-white/60 hover:text-white transition-colors ml-1 lg:hidden">
            <MessageCircle size={18} />
          </button>
        </div>

        {/* Player */}
        <div className="flex-1 relative bg-black overflow-hidden">
          <LiveKitViewer isHost={isHost} />

          {/* Contrôles overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-30">
            <MediaControls
              isHost={isHost}
              onStop={handleStop}
              stopping={stopping}
              onLeave={handleLeave}
            />
          </div>
        </div>

        {live!.description && (
          <div className="shrink-0 px-4 py-2.5 border-t border-white/10 bg-black/80">
            <p className="text-xs text-white/60 line-clamp-1">{live!.description}</p>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden bg-black">

      <div className="flex-1 flex flex-col min-w-0">
        {isActive && lkToken && lkUrl ? (
          <LiveKitRoom
            token={lkToken}
            serverUrl={lkUrl}
            connect
            className="flex-1 flex flex-col min-w-0 min-h-0"
          >
            <RoomContent />
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
            <LiveChat liveId={id!} accessToken={accessToken} />
          </div>
        </div>
      )}
    </div>
  );
}
