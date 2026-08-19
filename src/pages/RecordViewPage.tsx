// ── Page d'enregistrement (headless) ─────────────────────────────────────────
// Jamais visitée par un vrai utilisateur — uniquement ouverte par le navigateur
// headless de LiveKit WebEgress (voir livekit_service.py::start_web_egress_recording)
// pour produire une vidéo complète du live/battle/concert : tous les participants
// en grille + le chat en overlay, sans aucune UI interactive (pas de boutons, pas
// de navigation). Le token LiveKit et le JWT de chat sont passés en query params
// par le backend au moment de démarrer l'egress, pas via un compte utilisateur réel.
import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  LiveKitRoom, useTracks, useParticipants, VideoTrack, RoomAudioRenderer,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { openAuthenticatedWs } from '../utils/authenticatedWs';
import { WS_BASE_URL } from '../utils/constants';
import { Avatar } from '../components/ui/Avatar';

type RecordType = 'live' | 'concert' | 'battle';

interface ChatMsg { id: string; user: string; avatar?: string | null; text: string; }

// ── Grille vidéo — s'adapte au nombre de participants (1 = plein écran,
// 2 = split-screen côte à côte, 3+ = grille), même esprit que BattleScreen.tsx
// (mobile) mais générique aux 3 types plutôt que spécifique à 2 hosts. ──────────
function VideoGrid() {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], { onlySubscribed: true });
  const participants = useParticipants();

  if (tracks.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">
        En attente de la diffusion… ({participants.length} participant(s) connecté(s))
      </div>
    );
  }

  const cols = tracks.length <= 1 ? 1 : tracks.length <= 2 ? 2 : tracks.length <= 4 ? 2 : 3;

  return (
    <>
      <RoomAudioRenderer />
      <div className="w-full h-full grid gap-0.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {tracks.map(t => (
          <div key={`${t.participant.identity}-${t.source}`} className="relative bg-black overflow-hidden">
            <VideoTrack trackRef={t} className="w-full h-full object-cover" />
            <span className="absolute bottom-2 left-2 text-white text-xs font-semibold bg-black/50 px-2 py-0.5 rounded-full">
              {t.participant.name || t.participant.identity}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Chat overlay — lecture seule, pas d'input (rien à saisir côté headless) ──
function ChatOverlay({ targetType, targetId, chatToken }: { targetType: string; targetId: string; chatToken: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!chatToken) return;
    const ws = openAuthenticatedWs(`${WS_BASE_URL}/api/v1/social/comments/ws/${targetType}/${targetId}`, chatToken);
    wsRef.current = ws;
    ws.onmessage = e => {
      try {
        const data = JSON.parse(e.data);
        if (data.type !== 'comment_added') return;
        const c = data.comment ?? data;
        setMessages(prev => [...prev.slice(-11), {
          id: c.id ?? String(Date.now()),
          user: c.author?.display_name ?? c.author?.username ?? 'Anonyme',
          avatar: c.author?.avatar_url ?? null,
          text: c.body ?? '',
        }]);
      } catch { /* ignore */ }
    };
    return () => ws.close();
  }, [targetType, targetId, chatToken]);

  return (
    <div className="absolute bottom-4 left-4 w-80 max-w-[40%] flex flex-col gap-1.5 pointer-events-none">
      {messages.map(m => (
        <div key={m.id} className="flex items-start gap-2 bg-black/55 rounded-xl px-2.5 py-1.5 backdrop-blur-sm">
          <Avatar src={m.avatar} name={m.user} size="xs" className="shrink-0 mt-0.5" />
          <p className="text-xs text-white leading-snug break-words">
            <span className="font-bold">{m.user} </span>{m.text}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function RecordViewPage() {
  const { type, id } = useParams<{ type: RecordType; id: string }>();
  const [params] = useSearchParams();

  const lkToken = params.get('token') ?? '';
  const lkUrl = params.get('livekit_url') ?? '';
  const chatToken = params.get('chat_token') ?? '';

  const chatTargetType = useMemo(() => {
    // Le WS de commentaires distingue live/concert/battle nativement (voir
    // social.py::comments_ws, _VALID_TARGETS) — aucune traduction nécessaire.
    return type ?? 'live';
  }, [type]);

  if (!id || !lkToken || !lkUrl) {
    return <div className="w-screen h-screen bg-black" />;
  }

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden">
      <LiveKitRoom token={lkToken} serverUrl={lkUrl} connect={true} className="w-full h-full">
        <VideoGrid />
      </LiveKitRoom>
      {chatToken && <ChatOverlay targetType={chatTargetType} targetId={id} chatToken={chatToken} />}
    </div>
  );
}
