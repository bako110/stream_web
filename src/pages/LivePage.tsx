import { PageLoader } from '../components/ui/Spinner';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { encodeId, decodeId } from '../utils/slugId';
import {
  Radio, Users, MessageCircle, Send, X, Zap, StopCircle,
  Eye, Clock, Ticket, Lock, ChevronLeft, Video, Check,
} from 'lucide-react';
import {
  LiveKitRoom,
  VideoTrack,
  useRoomContext,
  useParticipants,
  useLocalParticipant,
  useTracks,
  useConnectionState,
  RoomAudioRenderer,
  StartAudio,
} from '@livekit/components-react';
import { Track, VideoPresets, ConnectionState } from 'livekit-client';
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

interface ChatMsg {
  id: string; userId: string | null; user: string; avatar?: string | null; text: string;
  pending?: boolean; failed?: boolean;
}

function toChatMsg(c: any): ChatMsg {
  return {
    id:     String(c.id),
    userId: c.author?.id ?? null,
    user:   c.author?.display_name ?? c.author?.username ?? 'Anonyme',
    avatar: c.author?.avatar_url ?? null,
    text:   c.body ?? '',
  };
}

// Chat temps réel : historique via REST, nouveaux messages via WebSocket
// (événement `comment_added`), envoi via POST /social/comments — le WebSocket
// commentaires est en lecture seule côté client, le serveur diffuse l'écho.
function LiveChat({ concertId, liveId, accessToken }: { concertId: string; liveId: string | null; accessToken: string | null }) {
  const me = useAuthStore(s => s.user);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput]       = useState('');
  const [online, setOnline]     = useState(false);
  const [sending, setSending]   = useState(false);
  const listRef  = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  const target = liveId ? { type: 'live', id: liveId, key: 'live_id' } : { type: 'concert', id: concertId, key: 'concert_id' };

  const pushMsg = useCallback((m: ChatMsg) => {
    setMessages(prev => {
      if (prev.some(x => x.id === m.id)) return prev;
      // Écho de notre propre message : remplace l'entrée optimiste.
      const idx = m.userId ? prev.findIndex(x => x.pending && x.userId === m.userId && x.text === m.text) : -1;
      if (idx >= 0) { const next = prev.slice(); next[idx] = m; return next; }
      return [...prev.slice(-199), m];
    });
  }, []);

  // Historique
  useEffect(() => {
    let cancelled = false;
    apiClient.get<any[]>(`${Endpoints.social.comments}?${target.key}=${target.id}&limit=50`)
      .then(r => { if (!cancelled) setMessages(prev => {
        const hist = [...r.data].reverse().map(toChatMsg);
        const ids = new Set(hist.map(h => h.id));
        return [...hist, ...prev.filter(p => !ids.has(p.id))];
      }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [target.id]);

  // WebSocket avec reconnexion automatique
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    let ws: WebSocket | null = null;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const base = WS_BASE_URL || window.location.origin.replace(/^http/, 'ws');

    const connect = () => {
      ws = openAuthenticatedWs(`${base}/api/v1/social/comments/ws/${target.type}/${target.id}`, accessToken);
      ws.onopen = () => { retry = 0; setOnline(true); };
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.type === 'comment_added' && d.comment) pushMsg(toChatMsg(d.comment));
          else if (d.type === 'comment_deleted' && d.comment_id) setMessages(prev => prev.filter(m => m.id !== String(d.comment_id)));
        } catch { /* ignore */ }
      };
      ws.onclose = () => {
        setOnline(false);
        if (cancelled) return;
        timer = setTimeout(connect, Math.min(1000 * 2 ** retry++, 15000));
      };
    };
    connect();
    const ping = setInterval(() => { if (ws?.readyState === WebSocket.OPEN) ws.send('{"type":"ping"}'); }, 25000);
    return () => { cancelled = true; clearTimeout(timer); clearInterval(ping); ws?.close(); };
  }, [accessToken, target.type, target.id, pushMsg]);

  // Auto-scroll uniquement si l'utilisateur est déjà en bas
  useEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending || !me) return;
    const localId = `local-${Date.now()}`;
    setInput('');
    setSending(true);
    stickRef.current = true;
    setMessages(prev => [...prev, {
      id: localId, userId: me.id, text, pending: true,
      user: me.display_name ?? me.username ?? 'Moi', avatar: me.avatar_url ?? null,
    }]);
    try {
      const r = await apiClient.post<any>(Endpoints.social.comments, { body: text, [target.key]: target.id });
      const saved = toChatMsg(r.data);
      setMessages(prev => {
        // L'écho WebSocket a pu arriver avant la réponse : on dédoublonne.
        const without = prev.filter(m => m.id !== localId);
        return without.some(m => m.id === saved.id) ? without : [...without, saved];
      });
    } catch {
      setMessages(prev => prev.map(m => m.id === localId ? { ...m, pending: false, failed: true } : m));
    } finally { setSending(false); }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] shrink-0"
        style={{ color: online ? '#22C55E' : 'var(--text-tertiary)' }}>
        <span className={`w-1.5 h-1.5 rounded-full ${online ? '' : 'animate-pulse'}`}
          style={{ background: online ? '#22C55E' : '#F59E0B' }} />
        {online ? 'Connecté en direct' : 'Reconnexion…'}
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 pb-3 space-y-2.5 min-h-0"
        onScroll={e => { const el = e.currentTarget; stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}>
        {messages.length === 0 && (
          <p className="text-center text-xs text-[var(--text-tertiary)] pt-8">Sois le premier à commenter 👋</p>
        )}
        {messages.map(m => {
          const mine = !!me && m.userId === me.id;
          return (
            <div key={m.id} className="flex gap-2 items-start" style={{ opacity: m.pending ? 0.55 : 1 }}>
              <Avatar src={m.avatar} name={m.user} size="xs" className="mt-0.5 shrink-0" />
              <div className="min-w-0 rounded-2xl rounded-tl-sm px-3 py-1.5"
                style={{ background: mine ? 'rgba(123,63,242,0.14)' : 'var(--bg-secondary)' }}>
                <p className="text-[11px] font-bold" style={{ color: mine ? '#7B3FF2' : 'var(--text-secondary)' }}>{m.user}</p>
                <p className="text-sm text-[var(--text-primary)] break-words whitespace-pre-line">{m.text}</p>
                {m.failed && <p className="text-[10px] text-red-400 mt-0.5">Échec de l'envoi</p>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-3 border-t border-[var(--border)] flex gap-2 shrink-0"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
        <input
          className="input text-sm py-2 flex-1 min-w-0"
          placeholder={me ? 'Commenter en direct...' : 'Connecte-toi pour commenter'}
          value={input} maxLength={500} disabled={!me}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button onClick={send} disabled={!input.trim() || !me}
          className="p-2.5 aspect-square shrink-0 rounded-xl text-white disabled:opacity-40 transition-opacity"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

// ── LiveKit viewer — reçoit les tracks de la room ─────────────────────────────

function LiveKitViewer({ concert, onCount }: { concert: Concert; onCount?: (n: number) => void }) {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], { onlySubscribed: true });
  const participants = useParticipants();
  const connection = useConnectionState();
  const videoTrack = tracks.find(t => !t.participant.isLocal);
  const artistName = concert.artist?.display_name ?? concert.artist?.username ?? '';

  useEffect(() => { onCount?.(participants.length); }, [participants.length, onCount]);

  if (!videoTrack) {
    const connecting = connection === ConnectionState.Connecting || connection === ConnectionState.Reconnecting;
    const lost = connection === ConnectionState.Disconnected;
    const title = connecting ? 'Connexion au direct…' : lost ? 'Connexion interrompue' : 'Le direct va démarrer';
    const sub = connecting
      ? 'Nous préparons le flux, ça ne prend qu’un instant.'
      : lost
        ? 'Vérifie ta connexion puis recharge la page.'
        : `${artistName ? artistName + ' arrive' : 'L’artiste arrive'} — le flux s’affichera automatiquement.`;
    const others = Math.max(participants.length - 1, 0);
    return (
      <div className="absolute inset-0 flex items-center justify-center px-6 text-white bg-black">
        {concert.thumbnail_url && (
          <img src={concert.thumbnail_url} alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" />
        )}
        <style>{`
          @keyframes lv-ring { 0% { transform: scale(.6); opacity: .55 } 100% { transform: scale(1.9); opacity: 0 } }
          @keyframes lv-dots { 0%,20% { opacity: .2 } 50% { opacity: 1 } 100% { opacity: .2 } }
        `}</style>
        <div className="flex flex-col items-center text-center gap-5 max-w-sm w-full rounded-3xl px-8 py-9"
          style={{ background: 'rgba(15,12,28,0.55)', backdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.45)' }}>
          <div className="relative w-24 h-24 flex items-center justify-center">
            {!lost && [0, 1, 2].map(i => (
              <span key={i} className="absolute inset-0 rounded-full"
                style={{ border: '2px solid rgba(123,63,242,0.7)', animation: `lv-ring 2.4s ease-out ${i * 0.8}s infinite` }} />
            ))}
            <div className="relative rounded-full p-1" style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 0 30px rgba(123,63,242,0.55)' }}>
              <Avatar src={concert.artist?.avatar_url} name={artistName} size="lg" />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="font-extrabold text-lg leading-tight">{title}</p>
            <p className="text-sm text-white/60 leading-snug">{sub}</p>
          </div>
          {!lost && (
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-2 h-2 rounded-full bg-white"
                  style={{ animation: `lv-dots 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          )}
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <Users size={12} />
            {others > 0 ? `${others} spectateur${others > 1 ? 's' : ''} en attente` : 'Tu es le premier arrivé'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <VideoTrack trackRef={videoTrack} className="absolute inset-0 w-full h-full object-contain bg-black" />
      <StartAudio label="Activer le son"
        className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full text-sm font-bold text-white"
        style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 6px 20px rgba(123,63,242,0.5)' }} />
    </>
  );
}

// Aperçu local de l'artiste (même connexion que les contrôles : une seule
// identité LiveKit par room, sinon la 2e connexion éjecte la 1re).
function ArtistPreview({ concert }: { concert: Concert }) {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const local = tracks.find(t => t.participant.isLocal && t.publication);
  if (!local) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-white px-6 text-center">
        <p className="text-sm text-white/60">Active ta caméra pour apparaître en direct, {concert.artist?.display_name ?? ''}</p>
      </div>
    );
  }
  return <VideoTrack trackRef={local} className="absolute inset-0 w-full h-full object-contain bg-black" />;
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
  const [isRecording,      setIsRecording]      = useState(!!concert.is_recording);
  const [recordingLoading, setRecordingLoading] = useState(false);

  useEffect(() => { setIsRecording(!!concert.is_recording); }, [concert.is_recording]);

  async function toggleCam() {
    await localParticipant.setCameraEnabled(!camOn);
    setCamOn(v => !v);
  }
  async function toggleMic() {
    await localParticipant.setMicrophoneEnabled(!micOn);
    setMicOn(v => !v);
  }

  // Démarre/arrête l'enregistrement à tout moment pendant le live — pas
  // seulement le choix fait à la préparation (query param `record` sur
  // /stream/{id}/start), cf. PATCH /stream/{id}/recording (streaming.py).
  async function toggleRecording() {
    if (recordingLoading) return;
    const next = !isRecording;
    setRecordingLoading(true);
    try {
      await apiClient.patch(Endpoints.streaming.recording(concert.id), { enabled: next });
      setIsRecording(next);
    } catch { /* erreur — état inchangé */ }
    finally { setRecordingLoading(false); }
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
          <button onClick={toggleRecording} disabled={recordingLoading}
            className={`btn-ghost flex items-center gap-1.5 text-xs px-3 py-1.5 ${isRecording ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`}>
            {recordingLoading ? <Spinner size="sm" /> : <Video size={13} />}
            {isRecording ? 'Arrêter l\'enregistrement' : 'Enregistrer'}
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
  const [showRecordConfirm, setShowRecordConfirm] = useState(false);
  const [stopping,       setStopping]       = useState(false);
  const [buying,         setBuying]         = useState(false);
  const [viewers,        setViewers]        = useState(0);
  const [lkCount,        setLkCount]        = useState<number | null>(null);

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

  // Chemin unifié (Live) quand le concert en a un — seul lui permet scène/
  // cadeaux côté mobile et reste cohérent room-wise ("live-{id}" vs
  // "concert-{id}") ; fallback sur l'ancien streaming.py pour les concerts
  // créés avant cette bascule (pas de live_id).
  const liveId = concert?.live_id ?? null;

  // Token viewer (subscriber)
  const fetchViewerToken = useCallback(async () => {
    if (!id || !isLive) return;
    try {
      const r = liveId
        ? await apiClient.get<StreamToken>(Endpoints.lives.token(liveId))
        : await apiClient.get<StreamToken>(Endpoints.streaming.token(id));
      setToken(r.data);
    } catch { /* accès refusé ou pas encore live */ }
  }, [id, isLive, liveId]);

  useEffect(() => { fetchViewerToken(); }, [fetchViewerToken]);

  // Le live peut etre marque "live" avant que le token soit emis : on retente
  // jusqu'a l'obtenir au lieu de rester bloque sur le spinner.
  useEffect(() => {
    if (!isLive || token || isArtist) return;
    const iv = setInterval(fetchViewerToken, 4000);
    return () => clearInterval(iv);
  }, [isLive, token, isArtist, fetchViewerToken]);

  // Artiste — token publisher
  useEffect(() => {
    if (!isArtist || !id || !isLive) return;
    const req = liveId
      ? apiClient.get<StreamToken>(Endpoints.lives.token(liveId))
      : apiClient.get<StreamToken>(Endpoints.streaming.token(id));
    req.then(r => setPublisherToken(r.data)).catch(() => {});
  }, [isArtist, id, isLive, liveId]);

  async function handleStart(record: boolean) {
    if (!id) return;
    setShowRecordConfirm(false);
    setStarting(true);
    try {
      const r = liveId
        ? await apiClient.post<StreamToken>(`${Endpoints.lives.goLive(liveId)}?record=${record}`)
        : await apiClient.post<StreamToken>(`${Endpoints.streaming.start(id)}?record=${record}`);
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
      if (liveId) await apiClient.post(Endpoints.lives.stop(liveId));
      else await apiClient.post(Endpoints.streaming.stop(id));
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
    <>
    {showRecordConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowRecordConfirm(false)}>
        <div className="w-full max-w-sm rounded-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <Video size={20} style={{ color: '#7B3FF2' }} />
            <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Enregistrer ce live ?</p>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Une vidéo complète (image + chat) sera sauvegardée une fois le live terminé.
          </p>
          <div className="flex gap-2">
            <button onClick={() => handleStart(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              Ne pas enregistrer
            </button>
            <button onClick={() => handleStart(true)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5"
              style={{ background: '#7B3FF2' }}>
              <Check size={14} /> Enregistrer
            </button>
          </div>
        </div>
      </div>
    )}
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
                  style={{ background: '#EF4444', boxShadow: '0 0 10px rgba(239,68,68,0.5)' }}>
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                </span>
                <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
                  <Eye size={11} /> {(lkCount ?? viewers).toLocaleString()}
                </span>
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
          {concert.thumbnail_url && !(isLive && ((token && livekitUrl) || publisherToken)) && (
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

          ) : isLive && token && livekitUrl && !(isArtist && publisherToken) ? (
            /* LiveKit Room */
            <LiveKitRoom
              token={token.token}
              serverUrl={livekitUrl}
              connect={true}
              options={VIEWER_ROOM_OPTIONS}
              className="w-full h-full"
            >
              <RoomAudioRenderer />
              <LiveKitViewer concert={concert} onCount={setLkCount} />
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
                <button onClick={() => setShowRecordConfirm(true)} disabled={starting}
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
            <LiveKitRoom token={publisherToken.token} serverUrl={livekitUrl} connect={true} className="absolute inset-0">
              <RoomAudioRenderer />
              <ArtistPreview concert={concert} />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20">
                <ArtistControls
                  concert={concert}
                  publisherToken={publisherToken}
                  livekitUrl={livekitUrl}
                  onStart={() => setShowRecordConfirm(true)}
                  onStop={handleStop}
                  isLive={isLive}
                  starting={starting}
                  stopping={stopping}
                />
              </div>
            </LiveKitRoom>
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
              <button onClick={() => setShowRecordConfirm(true)} disabled={starting}
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
            <button onClick={() => setShowRecordConfirm(true)} disabled={starting}
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
            <LiveChat concertId={id!} liveId={liveId} accessToken={accessToken} />
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
          {chatDrawerOpen && <LiveChat concertId={id!} liveId={liveId} accessToken={accessToken} />}
        </div>
      </div>
    </div>
    </>
  );
}
