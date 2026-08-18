import { PageLoader } from '../components/ui/Spinner';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { encodeId, decodeId } from '../utils/slugId';
import {
  Radio, Users, MessageCircle, Send, X, Zap, StopCircle,
  Eye, Clock, Ticket, Lock, ChevronLeft,
} from 'lucide-react';
import {
  LiveKitRoom,
  VideoTrack,
  useRoomContext,
  useParticipants,
  useLocalParticipant,
  useTracks,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { Track, VideoPresets } from 'livekit-client';
import type { Concert, StreamToken, StreamStatus } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useApi } from '../hooks/useApi';
import { Spinner } from '../components/ui/Spinner';
import { Avatar } from '../components/ui/Avatar';
import { WS_BASE_URL } from '../utils/constants';
import { openAuthenticatedWs } from '../utils/authenticatedWs';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── LiveKit quality config ─────────────────────────────────────────────────────

const VIEWER_ROOM_OPTIONS = {
  adaptiveStream: true,
  dynacast: false,
  publishDefaults: {
    videoCodec: 'h264' as const,
    videoSimulcastLayers: [VideoPresets.h720],
  },
};

// ── Chat ──────────────────────────────────────────────────────────────────────

interface ChatMsg { id: string; user: string; avatar?: string | null; text: string; ts: number; }

function LiveChat({ concertId, accessToken }: { concertId: string; accessToken: string | null }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput]       = useState('');
  const wsRef    = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accessToken) return;
    const ws = openAuthenticatedWs(`${WS_BASE_URL}/api/v1/social/comments/ws/concert/${concertId}`, accessToken);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setMessages(prev => [...prev.slice(-149), {
          id:     data.id ?? String(Date.now()),
          user:   data.author?.display_name ?? data.author?.username ?? 'Anonyme',
          avatar: data.author?.avatar_url ?? null,
          text:   data.body,
          ts:     Date.now(),
        }]);
      } catch { /* ignore */ }
    };
    return () => ws.close();
  }, [concertId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function send() {
    if (!input.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ body: input.trim(), concert_id: concertId }));
    setInput('');
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-center text-xs text-[var(--text-tertiary)] pt-8">Aucun message pour l'instant</p>
        )}
        {messages.map(m => (
          <div key={m.id} className="flex gap-2 items-start">
            <Avatar src={m.avatar} name={m.user} size="xs" className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-semibold text-brand-primary">{m.user} </span>
              <span className="text-xs text-[var(--text-primary)] break-words whitespace-pre-line">{m.text}</span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-[var(--border)] flex gap-2 shrink-0">
        <input
          className="input text-sm py-1.5 flex-1 min-w-0"
          placeholder="Commenter en direct..."
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

// ── LiveKit viewer — reçoit les tracks de la room ─────────────────────────────

function LiveKitViewer() {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], { onlySubscribed: true });
  const participants = useParticipants();
  const videoTrack = tracks.find(t => !t.participant.isLocal);

  if (!videoTrack) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-white gap-3">
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center animate-pulse">
          <Radio size={32} className="opacity-60" />
        </div>
        <p className="text-sm opacity-70">En attente de la diffusion...</p>
        <p className="text-xs opacity-40">{participants.length} participant(s) connecté(s)</p>
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

// ── Compteur de viewers temps réel ───────────────────────────────────────────

function ViewerCount() {
  const participants = useParticipants();
  return (
    <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
      <Eye size={11} /> {participants.length.toLocaleString()}
    </span>
  );
}

// ── Panneau artiste — contrôle du live ────────────────────────────────────────

function ArtistControls({
  concert, publisherToken, livekitUrl, onStart, onStop, isLive, starting, stopping,
}: {
  concert: Concert;
  publisherToken: StreamToken | null;
  livekitUrl: string;
  onStart: () => void;
  onStop: () => void;
  isLive: boolean;
  starting: boolean;
  stopping: boolean;
}) {
  const { localParticipant } = useLocalParticipant();
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);

  async function toggleCam() {
    await localParticipant.setCameraEnabled(!camOn);
    setCamOn(v => !v);
  }
  async function toggleMic() {
    await localParticipant.setMicrophoneEnabled(!micOn);
    setMicOn(v => !v);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!isLive ? (
        <button onClick={onStart} disabled={starting}
          className="btn-primary flex items-center gap-2 text-sm"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
          {starting ? <Spinner size="sm" /> : <Radio size={15} />}
          {starting ? 'Démarrage...' : 'Démarrer le live'}
        </button>
      ) : (
        <>
          <button onClick={toggleCam}
            className={`btn-ghost text-xs px-3 py-1.5 ${camOn ? 'text-green-400' : 'text-[var(--text-tertiary)]'}`}>
            {camOn ? 'Cam ON' : 'Cam OFF'}
          </button>
          <button onClick={toggleMic}
            className={`btn-ghost text-xs px-3 py-1.5 ${micOn ? 'text-green-400' : 'text-[var(--text-tertiary)]'}`}>
            {micOn ? 'Micro ON' : 'Micro OFF'}
          </button>
          <button onClick={onStop} disabled={stopping}
            className="btn-ghost flex items-center gap-1.5 text-sm text-red-400 border-red-400/30 hover:bg-red-400/10">
            {stopping ? <Spinner size="sm" /> : <StopCircle size={15} />}
            {stopping ? 'Arrêt...' : 'Arrêter le live'}
          </button>
        </>
      )}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function LivePage() {
  const { id: slug }  = useParams<{ id: string }>();
  const id             = decodeId(slug!);
  const navigate       = useNavigate();
  const { user, accessToken } = useAuthStore();

  const [showChat,       setShowChat]       = useState(true);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [token,          setToken]          = useState<StreamToken | null>(null);
  const [publisherToken, setPublisherToken] = useState<StreamToken | null>(null);
  const [starting,       setStarting]       = useState(false);
  const [stopping,       setStopping]       = useState(false);
  const [buying,         setBuying]         = useState(false);
  const [viewers,        setViewers]        = useState(0);
  const [lkConnected,    setLkConnected]    = useState(false);

  const concertApi = useApi<Concert>(() => apiClient.get<Concert>(Endpoints.concerts.byId(id!)), [id]);
  const statusApi  = useApi<StreamStatus>(() => apiClient.get<StreamStatus>(Endpoints.streaming.status(id!)), [id]);

  const concert  = concertApi.data;
  const status   = statusApi.data;
  const isLive   = concert?.status === 'live';
  const isArtist = concert && user && concert.artist_id === user.id;

  // Rafraichit le viewer count toutes les 15s si live
  useEffect(() => {
    if (!isLive || !id) return;
    const iv = setInterval(async () => {
      try {
        const r = await apiClient.get<StreamStatus>(Endpoints.streaming.status(id));
        setViewers(r.data.current_viewers);
      } catch { /* silencieux */ }
    }, 15_000);
    return () => clearInterval(iv);
  }, [isLive, id]);

  useEffect(() => {
    if (status) setViewers(status.current_viewers);
  }, [status]);

  // Token viewer (subscriber)
  const fetchViewerToken = useCallback(async () => {
    if (!id || !isLive) return;
    try {
      const r = await apiClient.get<StreamToken>(Endpoints.streaming.token(id));
      setToken(r.data);
    } catch { /* accès refusé ou pas encore live */ }
  }, [id, isLive]);

  useEffect(() => { fetchViewerToken(); }, [fetchViewerToken]);

  // Artiste — token publisher
  useEffect(() => {
    if (!isArtist || !id || !isLive) return;
    apiClient.get<StreamToken>(Endpoints.streaming.token(id))
      .then(r => setPublisherToken(r.data))
      .catch(() => {});
  }, [isArtist, id, isLive]);

  async function handleStart() {
    if (!id) return;
    setStarting(true);
    try {
      const r = await apiClient.post<StreamToken>(Endpoints.streaming.start(id));
      setPublisherToken(r.data);
      setToken(r.data);
      await concertApi.refetch?.();
    } catch { /* error */ }
    finally { setStarting(false); }
  }

  async function handleStop() {
    if (!id) return;
    setStopping(true);
    try {
      await apiClient.post(Endpoints.streaming.stop(id));
      setToken(null);
      setPublisherToken(null);
      await concertApi.refetch?.();
    } catch { /* error */ }
    finally { setStopping(false); }
  }

  async function handleBuyTicket() {
    if (!concert) return;
    setBuying(true);
    try {
      await apiClient.post(Endpoints.concerts.buyTicket(concert.id));
      await fetchViewerToken();
    } catch { /* error */ }
    finally { setBuying(false); }
  }

  if (concertApi.loading) return <PageLoader />;
  if (!concert) return <div className="p-6 text-[var(--text-secondary)]">Concert introuvable.</div>;

  const scheduledDate = concert.scheduled_at
    ? format(new Date(concert.scheduled_at), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })
    : null;

  const needsTicket = concert.access_type === 'ticket' && !token && !isArtist;
  // Meme principe que needsTicket : le backend renvoie 402 si l'abonnement
  // n'est pas actif (streaming.py::get_viewer_token), mais fetchViewerToken()
  // avalait l'erreur silencieusement -- l'utilisateur se retrouvait devant un
  // spinner infini (aucune des conditions du switch ci-dessous ne matchait),
  // sans jamais savoir qu'un abonnement etait requis.
  const needsSubscription = concert.access_type === 'subscription' && !token && !isArtist;

  // URL LiveKit WebSocket
  const livekitUrl = status?.livekit_url ?? token?.livekit_url ?? '';

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden bg-black">

      {/* ── Zone vidéo ── */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        {/* Header navigation — overlay flottant sur mobile (vidéo plein écran), barre fixe sur desktop */}
        <div className="flex items-center gap-3 px-4 py-3 bg-black/80 border-b border-white/10 shrink-0
                         absolute inset-x-0 top-0 z-30 lg:relative lg:bg-black/80"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}>
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <Avatar src={concert.artist?.avatar_url} name={concert.artist?.display_name ?? concert.artist?.username} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate text-sm">{concert.title}</p>
            <p className="text-xs text-white/50 truncate">{concert.artist?.display_name ?? concert.artist?.username}</p>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 shrink-0">
            {isLive ? (
              <>
                <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-white"
                  style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 0 10px rgba(123,63,242,0.5)' }}>
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                </span>
                {!lkConnected ? (
                  <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Eye size={11} /> {viewers.toLocaleString()}
                  </span>
                ) : (
                  token && livekitUrl ? (
                    <LiveKitRoom token={token.token} serverUrl={livekitUrl} connect={isLive} onConnected={() => setLkConnected(true)}>
                      <ViewerCount />
                    </LiveKitRoom>
                  ) : null
                )}
              </>
            ) : concert.status === 'draft' || concert.status === 'published' ? (
              <span className="flex items-center gap-1 text-xs text-white/60 bg-white/10 px-2.5 py-1 rounded-full">
                <Clock size={11} /> Programmé
              </span>
            ) : concert.status === 'ended' ? (
              <span className="text-xs text-white/40 bg-white/5 px-2.5 py-1 rounded-full">Terminé</span>
            ) : null}
          </div>

          <button onClick={() => setShowChat(v => !v)} className="text-white/60 hover:text-white transition-colors ml-1 hidden lg:block">
            <MessageCircle size={18} />
          </button>
        </div>

        {/* ── Lecteur — plein écran sur mobile (pas de recadrage par le header/footer) ── */}
        <div className="flex-1 relative bg-black overflow-hidden">

          {/* Thumbnail de fond (quand pas encore live) */}
          {concert.thumbnail_url && (
            <img src={concert.thumbnail_url} alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" />
          )}

          {/* Accès ticket requis */}
          {needsTicket ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4 z-10">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <Lock size={28} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">Accès payant</p>
                <p className="text-sm text-white/60 mt-1">
                  {concert.ticket_price != null
                    ? `${concert.ticket_price.toLocaleString()} FCFA pour accéder au live`
                    : 'Un ticket est requis pour accéder'}
                </p>
              </div>
              <button onClick={handleBuyTicket} disabled={buying}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
                style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 4px 20px rgba(123,63,242,0.4)' }}>
                {buying ? <Spinner size="sm" /> : <Ticket size={16} />}
                {buying ? 'Traitement...' : `Adhérer — ${concert.ticket_price != null ? concert.ticket_price.toLocaleString() + ' FCFA' : 'Gratuit'}`}
              </button>
            </div>

          ) : needsSubscription ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4 z-10">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <Lock size={28} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">Abonnement requis</p>
                <p className="text-sm text-white/60 mt-1">
                  Un abonnement actif est nécessaire pour accéder à ce live.
                </p>
              </div>
              <button onClick={() => navigate('/wallet/subscription/plans')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
                style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 4px 20px rgba(123,63,242,0.4)' }}>
                <Ticket size={16} /> Voir les abonnements
              </button>
            </div>

          ) : isLive && token && livekitUrl ? (
            /* LiveKit Room */
            <LiveKitRoom
              token={token.token}
              serverUrl={livekitUrl}
              connect={true}
              onConnected={() => setLkConnected(true)}
              options={VIEWER_ROOM_OPTIONS}
              className="w-full h-full"
            >
              <RoomAudioRenderer />
              <LiveKitViewer />
            </LiveKitRoom>

          ) : !isLive && (concert.status === 'draft' || concert.status === 'published') ? (
            /* Programmé — countdown */
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4 z-10">
              <Clock size={48} className="opacity-40" />
              <div className="text-center">
                <p className="font-semibold text-xl">Pas encore en direct</p>
                {scheduledDate && (
                  <p className="text-sm text-white/60 mt-2">Prévu le {scheduledDate}</p>
                )}
              </div>
              {isArtist && (
                <button onClick={handleStart} disabled={starting}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all"
                  style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 4px 20px rgba(123,63,242,0.4)' }}>
                  {starting ? <Spinner size="sm" /> : <Radio size={18} />}
                  {starting ? 'Démarrage...' : 'Démarrer le live maintenant'}
                </button>
              )}
            </div>

          ) : concert.status === 'ended' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 z-10">
              <Radio size={40} className="opacity-30" />
              <p className="font-semibold opacity-60">Ce live est terminé</p>
              {concert.video_url && (
                <button onClick={() => navigate(`/concerts/${encodeId(concert.id)}`)}
                  className="btn-ghost text-white/70 text-sm border-white/20 hover:bg-white/10">
                  Voir le replay
                </button>
              )}
            </div>

          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white z-10">
              <Spinner size="lg" />
            </div>
          )}

          {/* Contrôles artiste (overlay bas) */}
          {isArtist && isLive && publisherToken && livekitUrl && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20">
              <LiveKitRoom token={publisherToken.token} serverUrl={livekitUrl} connect={true}>
                <ArtistControls
                  concert={concert}
                  publisherToken={publisherToken}
                  livekitUrl={livekitUrl}
                  onStart={handleStart}
                  onStop={handleStop}
                  isLive={isLive}
                  starting={starting}
                  stopping={stopping}
                />
              </LiveKitRoom>
            </div>
          )}

          {/* Bouton stop si artiste + live mais pas encore dans la room */}
          {isArtist && isLive && !publisherToken && (
            <div className="absolute bottom-4 left-4 z-20">
              <button onClick={handleStop} disabled={stopping}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-400 border border-red-400/30 bg-black/60 hover:bg-red-400/10 transition-colors">
                {stopping ? <Spinner size="sm" /> : <StopCircle size={15} />}
                {stopping ? 'Arrêt...' : 'Arrêter le live'}
              </button>
            </div>
          )}

          {/* Bandeau "démarrer le live" artiste — overlay bas sur mobile plutôt
              qu'une barre qui rognerait la vidéo (plein écran attendu). */}
          {isArtist && !isLive && (concert.status === 'draft' || concert.status === 'published') && (
            <div className="lg:hidden absolute bottom-0 inset-x-0 z-20 px-4 py-3 flex items-center gap-3"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)', paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))' }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/70">
                  Tu es l'artiste de ce concert. Démarre le live quand tu es prêt.
                </p>
              </div>
              <button onClick={handleStart} disabled={starting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shrink-0 transition-all"
                style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
                {starting ? <Spinner size="sm" /> : <Radio size={14} />}
                {starting ? 'Démarrage...' : 'Go Live'}
              </button>
            </div>
          )}

          {/* Bouton flottant commentaires — mobile uniquement, ouvre le tiroir bas
              (même emplacement/style que les actions sur ReelsPage). */}
          <div className="lg:hidden absolute z-20 flex flex-col items-center gap-0.5"
            style={{ right: 12, bottom: 'max(20px, calc(env(safe-area-inset-bottom, 0px) + 20px))' }}>
            <button onClick={() => setChatDrawerOpen(true)} className="flex flex-col items-center gap-0.5">
              <div className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff' }}>
                <MessageCircle size={20} fill="#fff" />
              </div>
            </button>
          </div>
        </div>

        {/* Info bar artiste — desktop uniquement (mobile : overlay ci-dessus) */}
        {isArtist && !isLive && (concert.status === 'draft' || concert.status === 'published') && (
          <div className="hidden lg:flex shrink-0 px-4 py-3 border-t border-white/10 bg-black/80 items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/50">
                Tu es l'artiste de ce concert. Démarre le live quand tu es prêt.
              </p>
            </div>
            <button onClick={handleStart} disabled={starting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shrink-0 transition-all"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
              {starting ? <Spinner size="sm" /> : <Radio size={14} />}
              {starting ? 'Démarrage...' : 'Go Live'}
            </button>
          </div>
        )}
      </div>

      {/* ── Chat panel — sidebar fixe desktop ── */}
      {showChat && (
        <div className="w-80 border-l border-white/10 bg-[var(--surface)] hidden lg:flex flex-col shrink-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
            <h3 className="font-semibold text-[var(--text-primary)] text-sm flex items-center gap-2">
              <MessageCircle size={15} className="text-brand-primary" /> Chat en direct
            </h3>
            <button onClick={() => setShowChat(false)} className="btn-ghost p-1 text-[var(--text-tertiary)]">
              <X size={15} />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <LiveChat concertId={id!} accessToken={accessToken} />
          </div>
        </div>
      )}

      {/* ── Chat drawer — tiroir depuis le bas sur mobile (même pattern que ReelsPage) ── */}
      <div
        className="lg:hidden fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: 'rgba(0,0,0,0.6)',
          pointerEvents: chatDrawerOpen ? 'auto' : 'none',
          opacity: chatDrawerOpen ? 1 : 0,
        }}
        onClick={() => setChatDrawerOpen(false)}
      />
      <div
        className="lg:hidden fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl overflow-hidden"
        style={{
          height: '72dvh',
          background: 'var(--bg)',
          borderTop: '1px solid var(--border)',
          transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
          transform: chatDrawerOpen ? 'translateY(0)' : 'translateY(100%)',
        }}>
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-8 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>
        <div className="flex items-center justify-between px-4 pb-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm flex items-center gap-2">
            <MessageCircle size={15} className="text-brand-primary" /> Chat en direct
          </h3>
          <button onClick={() => setChatDrawerOpen(false)} className="btn-ghost p-1 text-[var(--text-tertiary)]">
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 min-h-0">
          {chatDrawerOpen && <LiveChat concertId={id!} accessToken={accessToken} />}
        </div>
      </div>
    </div>
  );
}
