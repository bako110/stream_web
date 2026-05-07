import { useState, useEffect, useRef } from 'react';
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
import type { LiveStream, LiveStatusResponse, StreamToken } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useApi } from '../hooks/useApi';
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

  // WS — reception uniquement
  useEffect(() => {
    if (!accessToken) return;
    const ws = new WebSocket(`${WS_BASE_URL}/api/v1/social/comments/ws/live/${liveId}?token=${accessToken}`);
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
    // Ping toutes les 25s pour garder la connexion ouverte
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('{"type":"ping"}');
    }, 25_000);
    return () => { clearInterval(ping); ws.close(); };
  }, [liveId, accessToken]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Envoi via REST → le backend broadcast via WS à tous les connectés
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

// ── Viewer LiveKit ─────────────────────────────────────────────────────────────

function LiveKitViewer({ isHost }: { isHost: boolean }) {
  // onlySubscribed: false → inclut aussi les tracks locaux (nécessaire pour le host)
  const tracks       = useTracks([Track.Source.Camera, Track.Source.ScreenShare], { onlySubscribed: false });
  const participants = useParticipants();

  // Host : affiche son propre track local. Viewer : affiche le track distant.
  const videoTrack = isHost
    ? tracks.find(t => t.participant.isLocal)
    : tracks.find(t => !t.participant.isLocal);

  if (!videoTrack) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-white gap-3">
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center animate-pulse">
          <Radio size={28} className="opacity-60" />
        </div>
        <p className="text-sm opacity-60">
          {isHost ? 'Active ta caméra pour démarrer la diffusion' : 'En attente de la diffusion...'}
        </p>
        <p className="text-xs opacity-40">{participants.length} connecté(s)</p>
      </div>
    );
  }

  return (
    <>
      <RoomAudioRenderer />
      <VideoTrack trackRef={videoTrack} className="w-full h-full object-contain" />
    </>
  );
}

// ── Compteur viewers temps réel ───────────────────────────────────────────────

function ViewerCount() {
  const participants = useParticipants();
  return (
    <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
      <Eye size={11} /> {participants.length.toLocaleString()}
    </span>
  );
}

// ── Contrôles host ────────────────────────────────────────────────────────────

function HostControls({ onStop, stopping }: { onStop: () => void; stopping: boolean }) {
  const { localParticipant } = useLocalParticipant();
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);

  // Active cam + micro automatiquement dès que le participant local est prêt
  useEffect(() => {
    let cancelled = false;
    async function enableMedia() {
      try {
        await localParticipant.setCameraEnabled(true);
        if (!cancelled) setCamOn(true);
        await localParticipant.setMicrophoneEnabled(true);
        if (!cancelled) setMicOn(true);
      } catch {
        // permission refusée ou pas de device
      }
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
      <button onClick={onStop} disabled={stopping}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all">
        {stopping ? <Spinner size="sm" /> : <StopCircle size={13} />}
        {stopping ? 'Arrêt...' : 'Terminer'}
      </button>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function LiveSimplePage() {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const location     = useLocation();
  const { user, accessToken } = useAuthStore();

  // Token publisher passé en state si on vient de GoLivePage
  const stateToken: string | null = (location.state as any)?.publisherToken ?? null;
  const stateLkUrl: string | null = (location.state as any)?.livekitUrl ?? null;

  const [lkToken,  setLkToken]  = useState<string | null>(stateToken);
  const [lkUrl,    setLkUrl]    = useState<string | null>(stateLkUrl);
  const [showChat, setShowChat] = useState(true);
  const [stopping, setStopping] = useState(false);

  const liveApi   = useApi<LiveStream>(() => apiClient.get<LiveStream>(Endpoints.lives.byId(id!)), [id]);
  const statusApi = useApi<LiveStatusResponse>(() => apiClient.get<LiveStatusResponse>(Endpoints.lives.status(id!)), [id]);

  const live     = liveApi.data;
  const isHost   = !!(live && user && live.user_id === user.id);
  const isActive = live?.status === 'active';

  // Dès que live est chargé et qu'on n'a pas encore de token → fetch
  useEffect(() => {
    if (!id || !isActive || !live || lkToken) return;
    apiClient.get<StreamToken>(Endpoints.lives.token(id))
      .then(r => { setLkToken(r.data.token); setLkUrl(r.data.livekit_url); })
      .catch(() => {});
  }, [id, isActive, live, lkToken]);

  // Refresh viewers toutes les 15s
  useEffect(() => {
    if (!isActive || !id) return;
    const iv = setInterval(() => { statusApi.refetch(); }, 15_000);
    return () => clearInterval(iv);
  }, [isActive, id]);

  async function handleStop() {
    if (!id) return;
    setStopping(true);
    try {
      await apiClient.post(Endpoints.lives.stop(id));
      await liveApi.refetch();
    } catch { /* error */ }
    finally { setStopping(false); }
  }

  if (liveApi.loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;
  if (!live) return <div className="p-6 text-[var(--text-secondary)]">Live introuvable.</div>;

  const viewers = statusApi.data?.current_viewers ?? live.current_viewers;

  // Contenu rendu DANS la LiveKitRoom — a accès au contexte LK
  function RoomContent() {
    return (
      <>
        <RoomAudioRenderer />

        {/* Header — ViewerCount utilise useParticipants() du contexte LK parent */}
        <div className="flex items-center gap-3 px-4 py-3 bg-black/80 border-b border-white/10 shrink-0">
          <button onClick={() => navigate(-1)} className="text-white/60 hover:text-white transition-colors">
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
            <ViewerCount />
          </div>
          <button onClick={() => setShowChat(v => !v)} className="text-white/60 hover:text-white transition-colors ml-1 lg:hidden">
            <MessageCircle size={18} />
          </button>
        </div>

        {/* Player */}
        <div className="flex-1 relative bg-black overflow-hidden">
          <LiveKitViewer isHost={!!isHost} />

          {/* Contrôles host overlay */}
          {isHost && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20">
              <HostControls onStop={handleStop} stopping={stopping} />
            </div>
          )}
        </div>

        {/* Info bar */}
        {live.description && (
          <div className="shrink-0 px-4 py-2.5 border-t border-white/10 bg-black/80">
            <p className="text-xs text-white/60 line-clamp-1">{live.description}</p>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden bg-black">

      {/* Zone vidéo — une seule LiveKitRoom pour tout */}
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
            {/* Header sans LK */}
            <div className="flex items-center gap-3 px-4 py-3 bg-black/80 border-b border-white/10 shrink-0">
              <button onClick={() => navigate(-1)} className="text-white/60 hover:text-white transition-colors">
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
              <button onClick={() => navigate(-1)} className="text-white/60 hover:text-white transition-colors">
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

      {/* Chat panel */}
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
