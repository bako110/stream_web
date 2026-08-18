import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Send, Award, User, Heart, Users, Gift, VideoIcon, VideoOff, Mic, MicOff } from 'lucide-react';
import {
  LiveKitRoom, VideoTrack, useTracks, useParticipants, useLocalParticipant, RoomAudioRenderer,
} from '@livekit/components-react';
import { Track, VideoPresets, ParticipantEvent } from 'livekit-client';
import { PageLoader, Spinner } from '../components/ui/Spinner';
import { useConfirm } from '../components/ui/Dialog';
import { decodeId } from '../utils/slugId';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { WS_BASE_URL } from '../utils/constants';
import { openAuthenticatedWs } from '../utils/authenticatedWs';
import { useAuthStore } from '../store/authStore';
import { useWs } from '../context/WebSocketContext';
import { battlesApi, type Battle, type BattleRanking, type BattleGoal, type SideDonor } from '../api/battles';
import { MatchResultModal, type MatchResultData } from '../components/live/MatchResultModal';
import { LiveGiftModal } from '../components/live/LiveGiftModal';

const BIG_GIFT_THRESHOLD = 500;

interface GiftTick { id: string; side: 'a' | 'b'; senderName: string; emoji: string; giftName: string; gogold: number; }

// Chaque badge gère son propre minuteur d'auto-retrait via son propre useEffect
// (mount = démarre le timer, unmount = clearTimeout), et pilote sa disparition
// visuelle via un state React (opacity/transform), PAS via une animation CSS
// nommée en "forwards" : BattleVideoHalf (le parent direct) re-render très
// fréquemment à cause de useTracks() (stats LiveKit republiées en continu), et
// réappliquer le même style `animation: '... forwards'` sur un élément à
// chaque re-render peut redémarrer l'animation depuis 0% côté navigateur —
// c'était la vraie cause du badge qui restait figé indéfiniment à l'écran :
// il "disparaissait" recommençait sans cesse avant d'avoir fini.
function GiftTickItem({ tick, side, onExpire }: { tick: GiftTick; side: 'a' | 'b'; onExpire: (id: string) => void }) {
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Double rAF avant de passer entered=true : force le navigateur à peindre
    // l'état initial (opacity 0/scale 0.7) au moins une fois avant la
    // transition, sinon le premier render "sauterait" directement à l'état
    // final sans jouer l'entrée (React batch le state initial + entered=true
    // du même tick sinon).
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf2);
    });
    const leaveTimer = setTimeout(() => setLeaving(true), 1600);
    const removeTimer = setTimeout(() => onExpire(tick.id), 2000);
    return () => { cancelAnimationFrame(raf1); clearTimeout(leaveTimer); clearTimeout(removeTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick.id]);

  const visible = entered && !leaving;
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold text-white truncate"
      style={{
        background: side === 'a' ? 'linear-gradient(135deg,#7B3FF2,#4C1D95)' : 'linear-gradient(135deg,#F0365A,#9B1C3F)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.7)',
        transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
      }}>
      <span>{tick.emoji}</span>
      <span className="truncate">{tick.senderName} · {tick.gogold}🪙</span>
    </div>
  );
}

const BATTLE_ROOM_OPTIONS = {
  adaptiveStream: true,
  dynacast: true,
  publishDefaults: {
    videoCodec: 'h264' as const,
    videoSimulcastLayers: [VideoPresets.h720],
  },
};

// Active caméra + micro pour le host côté web dès la connexion à la room de
// battle — <LiveKitRoom connect> seul ne publie AUCUN flux local par défaut,
// contrairement au SDK mobile qui active la caméra nativement à l'entrée. Sans
// cette activation, deux hosts web l'un contre l'autre se connectent bien à la
// même room LiveKit (is_publisher=True côté token, cf. battle_service.py) mais
// aucun des deux ne publie jamais de piste vidéo : chacun voit un écran noir/
// spinner infini côté adversaire ET côté sa propre vignette — pas un problème
// réseau, juste un flux jamais démarré. Même pattern que LiveSimplePage.tsx.
//
// L'activation automatique (sans clic préalable) peut être bloquée
// silencieusement par le navigateur (permission jamais accordée pour ce
// domaine, "user gesture" exigé avant getUserMedia()), OU réussir côté
// Promise mais ne jamais aboutir à un flux réellement publié/vu par
// l'adversaire (device déconnecté entre-temps, track qui échoue à la
// négociation WebRTC après coup) — dans ce second cas camActive passe à
// true sans qu'aucune vidéo ne soit visible, et l'ancien composant
// (BattleMediaActivator) ne montrait alors plus AUCUN bouton de secours,
// laissant le host bloqué sans recours visible. Ce composant expose donc un
// bouton Cam/Mic PERSISTANT dans le header (comme le SideBtn de
// LiveSimplePage.tsx), pas seulement un écran de blocage transitoire.
function useLocalMediaEnabled() {
  const { localParticipant } = useLocalParticipant();
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);

  useEffect(() => {
    const sync = () => {
      const camPub = localParticipant.getTrackPublication(Track.Source.Camera);
      const micPub = localParticipant.getTrackPublication(Track.Source.Microphone);
      setCamOn(camPub ? !camPub.isMuted : false);
      setMicOn(micPub ? !micPub.isMuted : false);
    };
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

  return { camOn, micOn, localParticipant };
}

function BattleMediaControls({ isHost }: { isHost: boolean }) {
  const { camOn, micOn, localParticipant } = useLocalMediaEnabled();
  const [needsRetry, setNeedsRetry] = useState(false);

  const activate = useCallback(async () => {
    if (!isHost) return;
    try {
      await localParticipant.setCameraEnabled(true);
      await localParticipant.setMicrophoneEnabled(true);
      setNeedsRetry(false);
    } catch {
      setNeedsRetry(true);
    }
  }, [localParticipant, isHost]);

  useEffect(() => { activate(); }, [activate]);

  const toggleCam = useCallback(async () => {
    try {
      await localParticipant.setCameraEnabled(!camOn);
      setNeedsRetry(false);
    } catch { setNeedsRetry(true); }
  }, [localParticipant, camOn]);

  const toggleMic = useCallback(async () => {
    try { await localParticipant.setMicrophoneEnabled(!micOn); } catch { /* ignore */ }
  }, [localParticipant, micOn]);

  if (!isHost) return null;

  return (
    <>
      {/* Boutons persistants — restent visibles et cliquables en permanence
          (pas seulement en cas d'échec), pour que l'hôte puisse couper/
          réactiver sa caméra ou son micro à tout moment pendant le match. */}
      <button onClick={toggleCam}
        className="w-9 h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: camOn ? 'rgba(255,255,255,0.1)' : 'rgba(240,54,90,0.25)' }}>
        {camOn ? <VideoIcon size={16} color="#fff" /> : <VideoOff size={16} color="#F0365A" />}
      </button>
      <button onClick={toggleMic}
        className="w-9 h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: micOn ? 'rgba(255,255,255,0.1)' : 'rgba(240,54,90,0.25)' }}>
        {micOn ? <Mic size={16} color="#fff" /> : <MicOff size={16} color="#F0365A" />}
      </button>

      {needsRetry && !camOn && (
        <button onClick={activate}
          className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-2"
          style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <User size={22} color="#fff" />
          </div>
          <p className="text-white text-sm font-bold">Activer ma caméra</p>
          <p className="text-white/60 text-xs px-8 text-center">Ton adversaire ne te voit pas — appuie pour autoriser caméra et micro</p>
        </button>
      )}
    </>
  );
}

interface ChatMsg { id: string; side: 'a' | 'b'; user: string; text: string; }

function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function VerifiedCheck() {
  return (
    <span className="inline-flex items-center justify-center shrink-0 rounded-full" style={{ width: 13, height: 13, background: '#1D9BF0' }}>
      <svg width={8} height={8} viewBox="0 0 10 10" fill="none">
        <path d="M2 5.2L4 7L8 3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function BouncyScore({ value, color }: { value: number; color: string }) {
  const [bump, setBump] = useState(false);
  const prevRef = useRef(value);
  useEffect(() => {
    if (prevRef.current !== value) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 260);
      prevRef.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);
  return (
    <span className="text-2xl font-black tabular-nums inline-block transition-transform" style={{ color, transform: bump ? 'scale(1.32)' : 'scale(1)', transitionDuration: bump ? '140ms' : '220ms' }}>
      {value}
    </span>
  );
}

// ── Message de hype contextuel — façon TikTok Live, réagit à l'état réel du
// match (temps restant, score, écart, retournement de situation) plutôt que
// de défiler au hasard. Priorité du plus urgent au plus générique : dernières
// secondes > retournement tout juste survenu > score très serré > un camp
// mène largement > accueil en tout début de match.
function useHypeMessage(params: {
  remaining: number; scoreA: number; scoreB: number;
  leadingSide: 'a' | 'b' | null; hostNameA: string; hostNameB: string;
  isActive: boolean;
}): { text: string; key: string } {
  const { remaining, scoreA, scoreB, leadingSide, hostNameA, hostNameB, isActive } = params;
  const prevLeaderRef = useRef<'a' | 'b' | null>(null);
  const [flipMsg, setFlipMsg] = useState<{ text: string; key: string } | null>(null);

  // Détecte un retournement de situation — message prioritaire pendant 3s
  useEffect(() => {
    const prev = prevLeaderRef.current;
    if (prev !== null && leadingSide !== null && prev !== leadingSide) {
      const name = leadingSide === 'a' ? hostNameA : hostNameB;
      setFlipMsg({ text: `🔥 ${name} prend le dessus !`, key: `flip-${Date.now()}` });
      const t = setTimeout(() => setFlipMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [leadingSide, hostNameA, hostNameB]);
  useEffect(() => { prevLeaderRef.current = leadingSide; }, [leadingSide]);

  return useMemo(() => {
    if (!isActive) return { text: '⚔️ Le combat va commencer…', key: 'idle' };
    if (flipMsg) return flipMsg;
    if (remaining <= 10 && remaining > 0) return { text: '⏱️ DERNIERS INSTANTS !!', key: 'final-seconds' };
    if (remaining <= 30 && remaining > 10) return { text: '⚡ Ça se termine bientôt…', key: 'closing' };

    const total = scoreA + scoreB;
    if (total === 0) return { text: '💬 Envoie un cadeau pour soutenir ton camp !', key: 'start' };

    const diff = Math.abs(scoreA - scoreB);
    const diffPct = total > 0 ? (diff / total) * 100 : 0;

    if (diffPct < 10) return { text: '😱 Match ULTRA serré, tout peut basculer !', key: 'tight' };
    if (leadingSide) {
      const leaderName = leadingSide === 'a' ? hostNameA : hostNameB;
      const trailingName = leadingSide === 'a' ? hostNameB : hostNameA;
      return diffPct > 60
        ? { text: `👑 ${leaderName} domine le combat !`, key: 'dominant' }
        : { text: `💪 ${trailingName} peut encore renverser la situation !`, key: 'comeback' };
    }
    return { text: '🎯 Qui va prendre l\'avantage ?', key: 'neutral' };
  }, [isActive, flipMsg, remaining, scoreA, scoreB, leadingSide, hostNameA, hostNameB]);
}

function HypeBanner({ message }: { message: { text: string; key: string } }) {
  return (
    <div className="relative h-5 overflow-hidden flex-1 min-w-0 flex items-center justify-center px-1">
      <span
        key={message.key}
        className="truncate max-w-full text-[10px] sm:text-[11px] lg:text-xs font-bold px-1"
        style={{
          color: '#fff',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          animation: 'hype-msg-in 0.35s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        {message.text}
      </span>
    </div>
  );
}

function BattleVideoHalf({ hostId, hostName, hostAvatar, side, leading, giftTicks, onGiftTickExpire, crownKey, onGiftClick, winCount, topDonors, showDonors }: {
  hostId: string | undefined; hostName: string; hostAvatar: string | null; side: 'a' | 'b'; leading: boolean;
  giftTicks: GiftTick[]; onGiftTickExpire: (id: string) => void; crownKey: string | null; onGiftClick?: () => void;
  winCount: number; topDonors: SideDonor[]; showDonors: boolean;
}) {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const track = tracks.find(t => t.participant.identity === hostId);
  const color = side === 'a' ? '#7B3FF2' : '#F0365A';

  return (
    <div
      className="relative flex-1 min-w-0 h-full overflow-hidden rounded-xl"
      onClick={onGiftClick}
      role={onGiftClick ? 'button' : undefined}
      style={{
        border: `1.5px solid ${leading ? color : 'rgba(255,255,255,0.12)'}`,
        boxShadow: leading ? `0 0 20px ${color}66` : 'none',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        cursor: onGiftClick ? 'pointer' : 'default',
      }}>
      {track ? (
        <VideoTrack trackRef={track} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ background: side === 'a' ? '#150F24' : '#1C0F18' }}>
          <Spinner size="lg" />
        </div>
      )}

      {/* Voile de couleur pour identifier le camp d'un coup d'œil */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(${side === 'a' ? '90deg' : '270deg'}, ${color}22, transparent 40%)` }} />
      {/* Voile bas plus sombre pour la lisibilité des cartes donateurs/avatars */}
      <div className="absolute inset-x-0 bottom-0 h-28 pointer-events-none" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.65), transparent)' }} />

      {crownKey && (
        <span key={crownKey} className="absolute top-3 left-1/2 -translate-x-1/2 text-3xl z-10"
          style={{ animation: 'battle-crown-pop 2.6s ease-out forwards' }}>👑</span>
      )}

      {winCount > 0 && (
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 lg:px-2.5 py-0.5 lg:py-1 rounded-full z-10"
          style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,215,0,0.4)' }}>
          <span className="text-[10px] lg:text-xs font-black italic" style={{ color: '#FFD700' }}>WIN</span>
          <span className="text-[10px] lg:text-xs font-bold text-white">×{winCount}</span>
        </div>
      )}

      <div className="absolute top-9 lg:top-11 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full backdrop-blur-sm z-10"
        style={{ background: 'rgba(0,0,0,0.55)', border: `1px solid ${color}55` }}>
        {hostAvatar
          ? <img src={hostAvatar} className="w-5 h-5 lg:w-6 lg:h-6 rounded-full object-cover" />
          : <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center" style={{ background: color }}><User size={10} color="#fff" /></div>}
        <span className="text-white text-xs lg:text-sm font-bold truncate max-w-[110px] lg:max-w-[160px]">{hostName}</span>
        {leading && <span className="text-xs">👑</span>}
      </div>

      {/* Repère visuel seulement — toute la carte est cliquable (onClick sur le
          conteneur racine) pour ouvrir le modal de cadeaux, pas besoin de viser
          précisément ce bouton. pointer-events-none pour ne pas intercepter le
          clic avant qu'il ne remonte au parent. */}
      {onGiftClick && (
        <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center z-10 pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.55)' }}>
          <Gift size={14} color="#fbbf24" />
        </div>
      )}

      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10 max-w-[75%]">
        {giftTicks.map(t => (
          <GiftTickItem key={t.id} tick={t} side={side} onExpire={onGiftTickExpire} />
        ))}
      </div>

      {/* Top 3 donateurs de ce camp — avatar, nom, dernier cadeau envoyé (icône
          en grand à droite) + quantité totale, façon carte plutôt que pilule
          pour laisser le cadeau bien lisible comme dans la maquette. Reste
          affichée tant que des cadeaux arrivent pour ce camp, se masque après
          8s sans nouveau cadeau (cf. bumpDonorsVisibility) — contrairement au
          badge GiftTickItem (notif ponctuelle de 2s), reflète une activité
          continue tant qu'elle dure. */}
      {topDonors.length > 0 && showDonors && (
        <div className="absolute bottom-9 lg:bottom-11 left-2 right-2 flex flex-col gap-1 z-10">
          {topDonors.slice(0, 3).map(d => (
            <div key={d.id} className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 lg:py-1.5 rounded-xl backdrop-blur-sm max-w-full"
              style={{ background: 'rgba(20,16,28,0.6)' }} onClick={e => e.stopPropagation()}>
              {d.avatar_url
                ? <img src={d.avatar_url} className="w-7 h-7 lg:w-8 lg:h-8 rounded-full object-cover shrink-0" />
                : <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: color }}><User size={13} color="#fff" /></div>}
              <div className="min-w-0 flex-1">
                <p className="text-white text-[11px] lg:text-xs font-bold truncate leading-tight">{d.display_name}</p>
                <p className="text-[9px] lg:text-[10px] truncate leading-tight" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  a envoyé {d.last_gift_name ?? 'un cadeau'}
                </p>
              </div>
              {d.last_gift_emoji && <span className="text-xl lg:text-2xl shrink-0">{d.last_gift_emoji}</span>}
              <span className="text-xs lg:text-sm font-black shrink-0" style={{ color: '#FDE68A' }}>×{d.gifts_count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Avatars des top supporters — superposés en cascade façon "qui a vu",
          dernier slot = badge MVP (plus gros donateur du camp). */}
      {topDonors.length > 0 && (
        <div className="absolute bottom-2 left-2 flex items-center z-10">
          {topDonors.slice(0, 3).map((d, i) => (
            d.avatar_url
              ? <img key={d.id} src={d.avatar_url} className="w-7 h-7 lg:w-8 lg:h-8 rounded-full object-cover border-2"
                  style={{ borderColor: '#0B0812', marginLeft: i === 0 ? 0 : -8 }} />
              : <div key={d.id} className="w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center border-2"
                  style={{ borderColor: '#0B0812', marginLeft: i === 0 ? 0 : -8, background: color }}><User size={12} color="#fff" /></div>
          ))}
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] lg:text-[10px] font-black text-black" style={{ background: '#FFD700' }}>MVP</span>
        </div>
      )}
    </div>
  );
}

export default function BattlePage() {
  const { id: slug } = useParams<{ id: string }>();
  const battleId = decodeId(slug!);
  const navigate = useNavigate();
  const { user, accessToken } = useAuthStore();
  const { addListener, removeListener } = useWs();
  const { confirm, ConfirmDialog } = useConfirm();

  const [battle, setBattle] = useState<Battle | null>(null);
  const [token, setToken]   = useState<string | null>(null);
  const [wsUrl, setWsUrl]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState(0);
  const [ranking, setRanking] = useState<BattleRanking | null>(null);
  const [showRanking, setShowRanking] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [ended, setEnded] = useState<{ winner_id: string | null; score_a: number; score_b: number } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [hostNameA, setHostNameA] = useState('Créateur A');
  const [hostNameB, setHostNameB] = useState('Créateur B');
  const [hostAvatarA, setHostAvatarA] = useState<string | null>(null);
  const [hostAvatarB, setHostAvatarB] = useState<string | null>(null);
  const [likesA, setLikesA] = useState(0);
  const [likesB, setLikesB] = useState(0);
  const [followingA, setFollowingA] = useState(false);
  const [followingB, setFollowingB] = useState(false);
  const [verifiedA, setVerifiedA] = useState(false);
  const [verifiedB, setVerifiedB] = useState(false);
  const [giftTicksA, setGiftTicksA] = useState<GiftTick[]>([]);
  const [giftTicksB, setGiftTicksB] = useState<GiftTick[]>([]);
  // Références stables (useCallback) — un handler recréé à chaque render de
  // BattlePage (countdown qui tick chaque seconde, scores, etc.) ferait que le
  // useEffect de GiftTickItem, qui dépend de cette fonction, se redéclencherait
  // en boucle et repousserait indéfiniment son propre setTimeout de retrait —
  // c'est ce qui faisait que le badge de cadeau ne disparaissait jamais.
  const expireGiftTickA = useCallback((id: string) => setGiftTicksA(prev => prev.filter(t => t.id !== id)), []);
  const expireGiftTickB = useCallback((id: string) => setGiftTicksB(prev => prev.filter(t => t.id !== id)), []);
  // Carte "top donateurs" (classement en bas de la vidéo) — visible tant qu'il
  // y a des cadeaux qui arrivent pour ce camp, se masque si plus aucun cadeau
  // n'arrive pendant 8s (mais reste affichée en continu tant que les cadeaux
  // s'enchaînent, contrairement à GiftTickItem qui est une notif ponctuelle de
  // 2s) ; réapparaît instantanément dès qu'un nouveau cadeau arrive.
  const [showDonorsA, setShowDonorsA] = useState(false);
  const [showDonorsB, setShowDonorsB] = useState(false);
  const donorsHideTimerA = useRef<ReturnType<typeof setTimeout> | null>(null);
  const donorsHideTimerB = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bumpDonorsVisibility = useCallback((side: 'a' | 'b') => {
    const setShow = side === 'a' ? setShowDonorsA : setShowDonorsB;
    const timerRef = side === 'a' ? donorsHideTimerA : donorsHideTimerB;
    setShow(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShow(false), 8000);
  }, []);
  useEffect(() => () => {
    if (donorsHideTimerA.current) clearTimeout(donorsHideTimerA.current);
    if (donorsHideTimerB.current) clearTimeout(donorsHideTimerB.current);
  }, []);
  const [crownA, setCrownA] = useState<string | null>(null);
  const [crownB, setCrownB] = useState<string | null>(null);
  const [bigGift, setBigGift] = useState<{ id: string; side: 'a' | 'b'; senderName: string; emoji: string; giftName: string; gogold: number } | null>(null);
  const [giftSide, setGiftSide] = useState<'a' | 'b' | null>(null);
  // Coeurs "façon TikTok" — purement visuels (ne comptent pas dans le score,
  // cf. BattleService.react côté backend), déclenchés par le broadcast WS
  // battle_reaction reçu par TOUS les clients (soi-même inclus, pas de mise
  // à jour optimiste locale — même pattern que le mobile, BattleScreen.tsx).
  const [heartFloaters, setHeartFloaters] = useState<{ id: string; side: 'a' | 'b'; drift: number }[]>([]);
  const [heartCountA, setHeartCountA] = useState(0);
  const [heartCountB, setHeartCountB] = useState(0);
  const [battleGoal, setBattleGoal] = useState<BattleGoal | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoEndTriggeredRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const isHost = !!user && battle && (user.id === battle.host_a_id || user.id === battle.host_b_id);
  const myHostSide: 'a' | 'b' | null = !battle || !user
    ? null
    : user.id === battle.host_a_id ? 'a' : user.id === battle.host_b_id ? 'b' : null;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const b = await battlesApi.get(battleId);
        if (!mounted) return;
        setBattle(b);
        if (b.status === 'active') {
          setRemaining(Math.max(0, b.duration_seconds - Math.floor((Date.now() - new Date(b.started_at ?? Date.now()).getTime()) / 1000)));
          // Le token LiveKit n'existe que pour un battle encore actif — le demander
          // pour un battle déjà terminé échoue côté serveur et bloquait toute la
          // page sur un loader indéfini, empêchant le modal de résultat de s'afficher.
          try {
            const t = await battlesApi.getToken(battleId);
            if (mounted) { setToken(t.token); setWsUrl(t.ws_url); }
          } catch { /* battle terminé entre les deux appels — pas bloquant */ }
        } else if (b.status === 'ended') {
          setEnded({ winner_id: b.winner_id, score_a: b.score_a, score_b: b.score_b });
        }
        const rank = await battlesApi.getRanking(battleId).catch(() => null);
        if (mounted) setRanking(rank);
        const goal = await battlesApi.getActiveGoal(battleId).catch(() => null);
        if (mounted) setBattleGoal(goal);
      } catch { /* silencieux */ } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [battleId]);

  useEffect(() => {
    if (!battle?.host_a_id) return;
    apiClient.get<any>(Endpoints.users.publicProfile(battle.host_a_id))
      .then(r => {
        setHostNameA(r.data.display_name || r.data.username || 'Créateur A');
        setHostAvatarA(r.data.avatar_url);
        setFollowingA(!!r.data.is_followed);
        setVerifiedA(!!r.data.is_verified);
      })
      .catch(() => {});
  }, [battle?.host_a_id]);

  useEffect(() => {
    if (!battle?.host_b_id) return;
    apiClient.get<any>(Endpoints.users.publicProfile(battle.host_b_id))
      .then(r => {
        setHostNameB(r.data.display_name || r.data.username || 'Créateur B');
        setHostAvatarB(r.data.avatar_url);
        setFollowingB(!!r.data.is_followed);
        setVerifiedB(!!r.data.is_verified);
      })
      .catch(() => {});
  }, [battle?.host_b_id]);

  // "X j'aime" affiché sous chaque host = like_count du LIVE d'origine (pas le
  // nombre d'abonnés du compte) — vient de GET /lives/{id}, pas du profil public.
  useEffect(() => {
    if (!battle?.live_a_id) return;
    apiClient.get<any>(Endpoints.lives.byId(battle.live_a_id))
      .then(r => setLikesA(r.data?.like_count ?? 0))
      .catch(() => {});
  }, [battle?.live_a_id]);

  useEffect(() => {
    if (!battle?.live_b_id) return;
    apiClient.get<any>(Endpoints.lives.byId(battle.live_b_id))
      .then(r => setLikesB(r.data?.like_count ?? 0))
      .catch(() => {});
  }, [battle?.live_b_id]);

  const toggleFollow = useCallback(async (side: 'a' | 'b') => {
    if (!battle) return;
    const hostId = side === 'a' ? battle.host_a_id : battle.host_b_id;
    const currentlyFollowing = side === 'a' ? followingA : followingB;
    const setFollowing = side === 'a' ? setFollowingA : setFollowingB;
    setFollowing(!currentlyFollowing);
    try {
      if (currentlyFollowing) await apiClient.delete(Endpoints.users.follow(hostId));
      else await apiClient.post(Endpoints.users.follow(hostId));
    } catch {
      setFollowing(currentlyFollowing);
    }
  }, [battle, followingA, followingB]);

  const refreshRanking = useCallback(() => {
    battlesApi.getRanking(battleId).then(setRanking).catch(() => {});
  }, [battleId]);

  // WS global — battle_started / battle_ended (battle_score_update, LUI, est
  // diffusé sur le canal dédié "battle" via comment_room_manager, pas ici —
  // cf. le useEffect plus bas qui ouvre ws/battle/{battleId}. Avant ce fix, ce
  // handler écoutait battle_score_update sur le mauvais canal : ce type précis
  // n'y arrive jamais (seul battle_score_update_broadcast y transite), donc le
  // score affiché ne bougeait jamais en cours de match malgré des cadeaux reçus.
  useEffect(() => {
    const handler = (payload: any) => {
      if (payload.battle_id !== battleId) return;
      if (payload.type === 'battle_started') {
        setBattle(prev => ({ ...(prev ?? {}), id: battleId, ...payload, status: 'active' } as Battle));
        setRemaining(payload.duration_seconds);
      }
      if (payload.type === 'battle_ended') {
        setEnded({ winner_id: payload.winner_id, score_a: payload.score_a, score_b: payload.score_b });
        setBattle(prev => prev ? { ...prev, status: 'ended', score_a: payload.score_a, score_b: payload.score_b, winner_id: payload.winner_id } : prev);
      }
    };
    addListener(handler);
    return () => removeListener(handler);
  }, [addListener, removeListener, battleId]);

  // WS room "battle" — chat + cadeaux fusionnés des deux lives, via /comments/ws
  useEffect(() => {
    if (!accessToken || !battle?.live_a_id || !battle?.live_b_id) return;
    let cancelled = false;
    const sockets: WebSocket[] = [];
    (['a', 'b'] as const).forEach(side => {
      const liveId = side === 'a' ? battle.live_a_id : battle.live_b_id;
      const base = WS_BASE_URL || window.location.origin.replace(/^http/, 'ws');
      const ws = openAuthenticatedWs(`${base}/api/v1/social/comments/ws/live/${liveId}`, accessToken);
      ws.onmessage = (e) => {
        if (cancelled) return;
        try {
          const d = JSON.parse(e.data);
          if (d.type === 'comment_added' && d.comment) {
            const c = d.comment;
            setMessages(prev => [...prev.slice(-149), {
              id: c.id ?? String(Date.now()), side,
              user: c.author?.display_name ?? c.author?.username ?? 'Anonyme',
              text: c.body,
            }]);
          }
          if (d.type === 'gift_received' && d.gift) {
            const gf = d.gift;
            const senderName = gf.sender?.display_name ?? gf.sender?.username ?? 'Quelqu\'un';
            const tick: GiftTick = {
              id: gf.id ?? `${Date.now()}-${Math.random()}`,
              side, senderName,
              emoji: gf.gift_type?.emoji ?? '🎁',
              giftName: gf.gift_type?.name ?? 'Cadeau',
              gogold: gf.gogold_spent ?? 0,
            };
            // Le retrait après 2s est géré par GiftTickItem lui-même (son propre
            // useEffect/setTimeout au montage) — pas ici, cf. commentaire sur
            // GiftTickItem plus haut dans le fichier.
            //
            // UN SEUL badge affiché à la fois (le plus récent remplace le
            // précédent), pas un empilement — avant ce fix, [...prev.slice(-3),
            // tick] gardait jusqu'à 4 badges simultanés en colonne ; en cas de
            // cadeaux rapprochés (moins de 2s d'écart), un nouveau item
            // apparaissait toujours avant que le précédent ait fini de
            // disparaître, donnant l'illusion qu'"un badge" restait figé en
            // continu à l'écran alors qu'il s'agissait d'une succession de
            // badges différents qui ne se vidait jamais complètement.
            (side === 'a' ? setGiftTicksA : setGiftTicksB)([tick]);

            (side === 'a' ? setCrownA : setCrownB)(tick.id);
            setTimeout(() => (side === 'a' ? setCrownA : setCrownB)(prev => prev === tick.id ? null : prev), 2600);

            if (tick.gogold >= BIG_GIFT_THRESHOLD) {
              setBigGift({ id: tick.id, side, senderName, emoji: tick.emoji, giftName: tick.giftName, gogold: tick.gogold });
              setTimeout(() => setBigGift(prev => prev?.id === tick.id ? null : prev), 3800);
            }
            refreshRanking();
            bumpDonorsVisibility(side);
          }
          if (d.type === 'like_added' && typeof d.total === 'number') {
            (side === 'a' ? setLikesA : setLikesB)(d.total);
          }
        } catch { /* ignore */ }
      };
      sockets.push(ws);
    });
    wsRef.current = sockets[myHostSide === 'b' ? 1 : 0];
    return () => { cancelled = true; sockets.forEach(s => s.close()); };
  }, [accessToken, battle?.live_a_id, battle?.live_b_id, refreshRanking, myHostSide, bumpDonorsVisibility]);

  // WS room "battle" dédié — événements propres au match (réactions coeur,
  // score en temps réel, objectifs, effets), diffusés via
  // comment_room_manager.broadcast("battle", ...) côté backend, un canal
  // DISTINCT des deux room "live" ci-dessus (qui ne portent que chat + cadeaux
  // de chaque live d'origine) ET du WS global (qui ne porte que battle_started/
  // battle_ended/battle_score_update_broadcast). Sans ce socket séparé,
  // battle_reaction n'était jamais reçu côté web (coeur qui monte au clic), et
  // battle_score_update (le VRAI temps réel du score pendant le match, cf.
  // wallet.py) non plus — le score affiché ne bougeait qu'au tout début/fin du
  // battle. Même pattern que le mobile, cf. BattleScreen.tsx::useRoomSocket('battle', ...).
  useEffect(() => {
    if (!accessToken || !battleId) return;
    let cancelled = false;
    const base = WS_BASE_URL || window.location.origin.replace(/^http/, 'ws');
    const ws = openAuthenticatedWs(`${base}/api/v1/social/comments/ws/battle/${battleId}`, accessToken);
    ws.onmessage = (e) => {
      if (cancelled) return;
      try {
        const d = JSON.parse(e.data);
        // Notre propre réaction est déjà appliquée de façon optimiste dans
        // handleReact() au moment du clic — l'appliquer une seconde fois ici
        // quand le broadcast revient (le backend ne s'exclut pas lui-même de
        // comment_room_manager.broadcast) doublerait le compteur et ferait
        // monter deux coeurs pour un seul clic.
        if (d.type === 'battle_reaction' && (d.side === 'a' || d.side === 'b') && d.user_id !== user?.id) {
          const id = `${Date.now()}-${Math.random()}`;
          const drift = (Math.random() - 0.5) * 40;
          setHeartFloaters(prev => [...prev.slice(-20), { id, side: d.side, drift }]);
          setTimeout(() => setHeartFloaters(prev => prev.filter(f => f.id !== id)), 1800);
          (d.side === 'a' ? setHeartCountA : setHeartCountB)(c => c + 1);
        }
        if (d.type === 'battle_score_update') {
          setBattle(prev => prev ? { ...prev, score_a: d.score_a, score_b: d.score_b } : prev);
        }
        if (d.type === 'battle_goal_started' || d.type === 'battle_goal_progress') {
          setBattleGoal(d as BattleGoal);
        }
        if (d.type === 'battle_goal_succeeded' || d.type === 'battle_goal_failed') {
          setBattleGoal(d as BattleGoal);
          setTimeout(() => setBattleGoal(prev => (prev?.id === d.id ? null : prev)), 5000);
        }
      } catch { /* ignore */ }
    };
    return () => { cancelled = true; ws.close(); };
  }, [accessToken, battleId, user?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!battle?.started_at || battle.status !== 'active') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    autoEndTriggeredRef.current = false;
    const startedAt = new Date(battle.started_at).getTime();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = Math.max(0, battle.duration_seconds - elapsed);
      setRemaining(left);
      if (left === 0 && isHost && !autoEndTriggeredRef.current) {
        autoEndTriggeredRef.current = true;
        battlesApi.end(battleId).catch(() => {});
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [battle?.started_at, battle?.status, battle?.duration_seconds, isHost, battleId]);

  function handleReact(side: 'a' | 'b') {
    // Mise à jour optimiste locale immédiate — avant ce fix, le coeur/compteur ne
    // bougeait QUE si le broadcast WS battle_reaction revenait (cf. le socket
    // ws/battle/{battleId} plus bas), donc un aller-retour réseau complet avant
    // le moindre retour visuel ; en cas de coupure/latence WS ponctuelle,
    // l'utilisateur clique sans jamais rien voir. Les coeurs des AUTRES viewers
    // continuent d'arriver via ce même WS, qui reste la source de vérité pour eux.
    const id = `local-${Date.now()}-${Math.random()}`;
    const drift = (Math.random() - 0.5) * 40;
    setHeartFloaters(prev => [...prev.slice(-20), { id, side, drift }]);
    setTimeout(() => setHeartFloaters(prev => prev.filter(f => f.id !== id)), 1800);
    (side === 'a' ? setHeartCountA : setHeartCountB)(c => c + 1);

    battlesApi.react(battleId, side).catch((e) => {
      console.error('battle react failed', e);
    });
  }

  async function handleSendChat() {
    const text = chatInput.trim();
    if (!text || !battle) return;
    setChatInput('');
    const liveId = myHostSide === 'b' ? battle.live_b_id : battle.live_a_id;
    try { await apiClient.post(Endpoints.social.comments, { body: text, live_id: liveId }); } catch { /* silencieux */ }
  }

  async function handleClose() {
    if (!isHost || !battle || battle.status !== 'active') { navigate(-1); return; }
    const myScore = myHostSide === 'b' ? battle.score_b : battle.score_a;
    const otherScore = myHostSide === 'b' ? battle.score_a : battle.score_b;
    const isLeading = myScore > otherScore;
    const halfGogold = Math.floor(myScore / 2);
    const msg = isLeading && halfGogold > 0
      ? `Tu es en tête, mais si tu abandonnes maintenant tu perds automatiquement ce match ET tu reverses la moitié de tes GoGold gagnés (${halfGogold} GoGold) à ton adversaire.`
      : 'Si tu quittes maintenant, tu perds automatiquement ce match.';
    const ok = await confirm({ title: 'Quitter le battle ?', message: msg, confirmLabel: 'Continuer', danger: true });
    if (!ok) return;
    setLeaving(true);
    try { await battlesApi.end(battleId, true); } catch { /* silencieux */ }
    navigate(-1);
  }

  const myId = user?.id ?? null;
  const matchResult: MatchResultData | null = useMemo(() => {
    if (!ended || !battle) return null;
    const iWon = ended.winner_id !== null && ended.winner_id === myId;
    const winnerName = ended.winner_id === battle.host_a_id ? hostNameA : hostNameB;
    const loserName  = ended.winner_id === battle.host_a_id ? hostNameB : hostNameA;
    const winnerAvatar = ended.winner_id === battle.host_a_id ? hostAvatarA : hostAvatarB;
    const winnerGoGold = ended.winner_id === battle.host_a_id ? ended.score_a : ended.score_b;
    const amParticipant = !!myId && (myId === battle.host_a_id || myId === battle.host_b_id);
    const viewerRole: 'won' | 'lost' | 'spectator' =
      ended.winner_id === null || !amParticipant ? 'spectator' : iWon ? 'won' : 'lost';
    return {
      isDraw: ended.winner_id === null,
      viewerRole,
      winnerName, loserName, winnerAvatar,
      scoreA: ended.score_a, scoreB: ended.score_b,
      winnerGoGold,
    };
  }, [ended, battle, myId, hostNameA, hostNameB, hostAvatarA, hostAvatarB]);

  // Calculés ici (avant les early return) car useHypeMessage est un hook —
  // doit être appelé inconditionnellement à chaque render, comme tous les hooks.
  const scoreA = battle?.score_a ?? 0;
  const scoreB = battle?.score_b ?? 0;
  const leadingSide: 'a' | 'b' | null = (scoreA + scoreB) === 0 ? null : scoreA > scoreB ? 'a' : scoreB > scoreA ? 'b' : null;
  // Position de la ligne de partage de la barre de score — reflète la part
  // réelle de chaque camp (scoreA / total), pas un centre fixe à 50%. Bornée
  // à [15, 85] pour qu'aucun des deux camps ne disparaisse visuellement de
  // la barre même en cas de domination écrasante.
  const scoreTotal = scoreA + scoreB;
  const scoreSplitPct = scoreTotal > 0 ? Math.min(85, Math.max(15, (scoreA / scoreTotal) * 100)) : 50;
  const hypeMessage = useHypeMessage({
    remaining, scoreA, scoreB, leadingSide, hostNameA, hostNameB,
    isActive: battle?.status === 'active',
  });

  if (loading) return <PageLoader />;

  // Battle terminé — que ce soit déjà le cas au chargement (pas de token
  // LiveKit à obtenir) OU reçu en direct via battle_ended pendant qu'on
  // regarde : coupe la vidéo (démonte LiveKitRoom, ne reste PAS connecté
  // en arrière-plan derrière le modal de résultat) et affiche le score
  // final + vainqueur. Avant ce fix, seul le cas "déjà terminé au
  // chargement" coupait la vidéo — un battle qui se terminait EN COURS de
  // visionnage laissait LiveKitRoom connecté, le modal de résultat
  // flottant juste en semi-transparence par-dessus la vidéo toujours active.
  if (ended) {
    return (
      <div className="h-[calc(100vh-57px)] bg-black flex items-center justify-center">
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <X size={18} color="#fff" />
        </button>
        <MatchResultModal result={matchResult} onClose={() => navigate(-1)} />
      </div>
    );
  }

  if (!token || !wsUrl) return <PageLoader />;

  const topDonor = ranking?.top_donor;

  return (
    <>
    <LiveKitRoom serverUrl={wsUrl} token={token} connect options={BATTLE_ROOM_OPTIONS} className="h-[calc(100vh-57px)]">
      <RoomAudioRenderer />
      {/* Desktop (lg+) : chat en colonne fixe à gauche, vidéo à droite prenant tout
          l'espace restant (flex-row-reverse, même pattern que LiveSimplePage) —
          mobile web : empilé verticalement comme avant. */}
      <div className="flex flex-col lg:flex-row-reverse h-full bg-black">

        {/* ── Colonne vidéo + header ── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Header — fermer, participants, countdown, classement/top supporter */}
          <div className="relative shrink-0 px-3 sm:px-4 lg:px-5 py-2.5 lg:py-3 flex items-center gap-2 sm:gap-3">
            <button onClick={handleClose} disabled={leaving} className="w-9 h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
              {leaving ? <Spinner size="sm" /> : <X size={18} color="#fff" />}
            </button>
            <ParticipantsCount onClick={() => setShowParticipants(v => !v)} />
            {/* Cam/Mic — persistants, hôte uniquement (un viewer n'a rien à publier) */}
            <BattleMediaControls isHost={!!isHost} />

            {/* Centré par rapport à TOUT le header (position absolute), pas juste à
                l'espace restant entre les boutons — sinon le centre visuel dérive dès
                que les deux côtés (fermer+participants vs top supporter) n'ont pas la
                même largeur, cf. le badge topDonor qui peut aller jusqu'à 150px. */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
              <span className="text-white text-xs lg:text-sm font-black tracking-wide">BATTLE LIVE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            </div>

            <div className="flex-1" />

            {topDonor ? (
              <button onClick={() => setShowRanking(true)}
                className="flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 shrink-0 max-w-[120px] sm:max-w-[150px] lg:max-w-[180px]"
                style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.3)' }}>
                {topDonor.avatar_url
                  ? <img src={topDonor.avatar_url} className="w-[18px] h-[18px] lg:w-6 lg:h-6 rounded-full object-cover shrink-0" />
                  : <div className="w-[18px] h-[18px] lg:w-6 lg:h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}><User size={10} color="#fff" /></div>}
                <span className="text-[10px] lg:text-xs font-bold truncate" style={{ color: '#FFD700' }}>👑 {topDonor.display_name ?? 'Supporter'}</span>
              </button>
            ) : (
              <button onClick={() => setShowRanking(true)} className="w-9 h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <Award size={17} color="#FFD700" />
              </button>
            )}
          </div>

          {/* Rangée hosts — avatar + nom + followers + bouton Suivre, un par camp
              (seule source du nom/avatar dans le header : le badge nom qui apparaît
              aussi sur la vidéo elle-même, plus bas, reste car utile même quand le
              spectateur a scrollé/zoomé sur la vidéo, mais n'est plus dupliqué ici). */}
          <div className="shrink-0 flex items-center justify-between gap-2 px-3 sm:px-4 lg:px-5 pb-2 lg:pb-3">
            <div className="flex items-center gap-2 min-w-0">
              {hostAvatarA
                ? <img src={hostAvatarA} className="w-8 h-8 lg:w-10 lg:h-10 rounded-full object-cover border-2 shrink-0" style={{ borderColor: '#7B3FF2' }} />
                : <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: '#7B3FF2' }}><User size={14} color="#fff" /></div>}
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-white text-xs lg:text-sm font-bold truncate max-w-[90px] sm:max-w-[140px] lg:max-w-[200px]">
                  <span className="truncate">{hostNameA}</span>
                  {verifiedA && <VerifiedCheck />}
                </p>
                <p className="text-[10px] lg:text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>{likesA.toLocaleString('fr-FR')} j'aime</p>
              </div>
              {myHostSide !== 'a' && (
                <button onClick={() => toggleFollow('a')}
                  className="shrink-0 px-2.5 lg:px-3.5 py-1 lg:py-1.5 rounded-full text-[11px] lg:text-xs font-bold"
                  style={{
                    background: followingA ? 'rgba(255,255,255,0.12)' : 'linear-gradient(135deg,#7B3FF2,#5B2EC4)',
                    color: '#fff',
                  }}>
                  {followingA ? 'Suivi' : 'Suivre'}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 min-w-0 flex-row-reverse">
              {hostAvatarB
                ? <img src={hostAvatarB} className="w-8 h-8 lg:w-10 lg:h-10 rounded-full object-cover border-2 shrink-0" style={{ borderColor: '#F0365A' }} />
                : <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: '#F0365A' }}><User size={14} color="#fff" /></div>}
              <div className="min-w-0 text-right">
                <p className="flex items-center justify-end gap-1 text-white text-xs lg:text-sm font-bold truncate max-w-[90px] sm:max-w-[140px] lg:max-w-[200px]">
                  {verifiedB && <VerifiedCheck />}
                  <span className="truncate">{hostNameB}</span>
                </p>
                <p className="text-[10px] lg:text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>{likesB.toLocaleString('fr-FR')} j'aime</p>
              </div>
              {myHostSide !== 'b' && (
                <button onClick={() => toggleFollow('b')}
                  className="shrink-0 px-2.5 lg:px-3.5 py-1 lg:py-1.5 rounded-full text-[11px] lg:text-xs font-bold"
                  style={{
                    background: followingB ? 'rgba(255,255,255,0.12)' : 'linear-gradient(135deg,#F0365A,#9B1C3F)',
                    color: '#fff',
                  }}>
                  {followingB ? 'Suivi' : 'Suivre'}
                </button>
              )}
            </div>
          </div>

          {/* Barre de score pleine largeur — un score par camp aux extrémités,
              dégradé violet→rose dont la ligne de partage suit réellement la
              proportion du score de chaque camp (scoreSplitPct), pas un centre
              fixe à 50% : le camp qui domine visuellement gagne du terrain sur
              la barre, transition douce en largeur. */}
          <div className="relative shrink-0 flex items-center justify-between px-3 sm:px-4 lg:px-5 py-1.5 lg:py-2 overflow-hidden"
            style={{ background: '#2A1D42' }}>
            <div className="absolute inset-0 transition-all duration-700 ease-out"
              style={{
                background: `linear-gradient(90deg,#7B3FF2,#4C1D95 ${scoreSplitPct - 2}%,#9B1C3F ${scoreSplitPct + 2}%,#F0365A)`,
              }} />
            <div className="relative"><BouncyScore value={scoreA} color="#fff" /></div>
            <div className="relative flex-1 min-w-0 flex"><HypeBanner message={hypeMessage} /></div>
            <div className="relative"><BouncyScore value={scoreB} color="#fff" /></div>
          </div>

          {/* Video zone — deux colonnes nettement séparées, prend tout l'espace
              restant (flex-1) sur desktop au lieu d'une hauteur mobile figée. */}
          <div className="flex-1 flex relative min-h-0 gap-1.5 p-1.5" style={{ background: '#000' }}>
            <BattleVideoHalf hostId={battle?.host_a_id} hostName={hostNameA} hostAvatar={hostAvatarA} side="a" leading={leadingSide === 'a'}
              giftTicks={giftTicksA} onGiftTickExpire={expireGiftTickA}
              crownKey={crownA} onGiftClick={battle ? () => setGiftSide('a') : undefined}
              winCount={battle?.win_count_a ?? 0} topDonors={ranking?.top_donors_a ?? []} showDonors={showDonorsA} />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5">
              <span className="px-3 py-1.5 rounded-full font-black text-white text-xs shadow-lg"
                style={{ background: 'linear-gradient(135deg,#7B3FF2,#F0365A)', boxShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>VS</span>
              <span className="px-2.5 py-1 rounded-full text-white font-mono text-xs lg:text-sm font-bold"
                style={{ background: 'rgba(0,0,0,0.6)', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                {formatCountdown(remaining)}
              </span>
            </div>
            <BattleVideoHalf hostId={battle?.host_b_id} hostName={hostNameB} hostAvatar={hostAvatarB} side="b" leading={leadingSide === 'b'}
              giftTicks={giftTicksB} onGiftTickExpire={expireGiftTickB}
              crownKey={crownB} onGiftClick={battle ? () => setGiftSide('b') : undefined}
              winCount={battle?.win_count_b ?? 0} topDonors={ranking?.top_donors_b ?? []} showDonors={showDonorsB} />

            {/* Bandeau objectif communautaire — cible commune aux deux camps
                (BattleGoal côté backend), affiché tant qu'un objectif est actif. */}
            {battleGoal && battleGoal.status === 'active' && (
              <div className="absolute bottom-2 lg:bottom-3 left-1/2 -translate-x-1/2 z-20 px-3.5 lg:px-4 py-1.5 lg:py-2 rounded-full flex items-center gap-2"
                style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,215,0,0.35)', backdropFilter: 'blur(6px)' }}>
                <span className="text-white text-[11px] lg:text-xs font-bold whitespace-nowrap">
                  {battleGoal.mode === 'boss' ? '👹' : '🎯'} {battleGoal.title} : {battleGoal.current_amount.toLocaleString('fr-FR')} / {battleGoal.target_amount.toLocaleString('fr-FR')}
                </span>
              </div>
            )}

            {/* Coeurs "façon TikTok" — purement visuels, un par réaction reçue via WS
                (soi-même inclus), montent depuis le bas de la moitié d'écran du camp
                concerné. z-30 : au-dessus des cadres vidéo et du badge VS (z-20). */}
            <div className="absolute pointer-events-none z-30" style={{ bottom: 12, left: '12%', width: 10, height: 10, overflow: 'visible' }}>
              {heartFloaters.filter(f => f.side === 'a').map(f => (
                <span key={f.id} style={{
                  position: 'absolute', left: -18, top: -18, width: 36, height: 36,
                  fontSize: 26, textAlign: 'center', lineHeight: '36px',
                  animation: 'liveHeartRise 1700ms cubic-bezier(0.22,1,0.36,1) forwards',
                  // @ts-expect-error custom property lue par le keyframe via var()
                  '--drift-x': `${f.drift}px`,
                }}>💜</span>
              ))}
            </div>
            <div className="absolute pointer-events-none z-30" style={{ bottom: 12, right: '12%', width: 10, height: 10, overflow: 'visible' }}>
              {heartFloaters.filter(f => f.side === 'b').map(f => (
                <span key={f.id} style={{
                  position: 'absolute', left: -18, top: -18, width: 36, height: 36,
                  fontSize: 26, textAlign: 'center', lineHeight: '36px',
                  animation: 'liveHeartRise 1700ms cubic-bezier(0.22,1,0.36,1) forwards',
                  // @ts-expect-error custom property lue par le keyframe via var()
                  '--drift-x': `${f.drift}px`,
                }}>🩷</span>
              ))}
            </div>

            {/* Gros cadeau — centré au-dessus de la tête du DESTINATAIRE (moitié
                gauche/droite de la zone vidéo selon le camp), pas au centre de tout
                l'écran comme avant (aucun rapport visuel avec qui a reçu le cadeau). */}
            {bigGift && (
              <div key={bigGift.id} className="absolute inset-y-0 z-[65] flex items-center justify-center pointer-events-none"
                style={{ left: bigGift.side === 'a' ? 0 : '50%', width: '50%' }}>
                <div className="flex flex-col items-center gap-1.5 px-6 py-6 rounded-3xl text-center mx-2"
                  style={{ background: 'linear-gradient(135deg,#F59E0B,#F0365A,#9B65F5)', animation: 'battle-biggift-in 0.45s ease-out' }}>
                  <span className="text-3xl">🪑</span>
                  <span className="text-xl -mt-3">👑</span>
                  <p className="text-white text-[10px] font-black tracking-widest">LE ROI DU MATCH</p>
                  <span className="text-3xl mt-1">{bigGift.emoji}</span>
                  <p className="text-white text-xs font-bold">{bigGift.giftName}</p>
                  <p className="text-white/90 text-xs font-semibold truncate max-w-[160px]">{bigGift.senderName}</p>
                  <div className="mt-1 px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <span className="text-white text-[10px] font-bold">🪙 {bigGift.gogold.toLocaleString('fr-FR')} GoGold</span>
                  </div>
                </div>
              </div>
            )}

            {showParticipants && <BattleParticipantsPanel onClose={() => setShowParticipants(false)} />}

            {/* Ranking modal — centré, compact, pas plein écran */}
            {showRanking && (
              <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/60" onClick={() => setShowRanking(false)}>
                <div className="w-full max-w-xs rounded-2xl p-4 max-h-[70vh] overflow-y-auto" style={{ background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>🏆 Classement des supporters</p>
                    <button onClick={() => setShowRanking(false)} style={{ color: 'var(--text-tertiary)' }}><X size={16} /></button>
                  </div>
                  {!ranking || ranking.top_10.length === 0 ? (
                    <p className="text-sm text-center py-6" style={{ color: 'var(--text-tertiary)' }}>Aucun cadeau envoyé pour le moment.</p>
                  ) : (
                    ranking.top_10.map((item, i) => (
                      <div key={`${item.id}-${i}`} className="flex items-center gap-2.5 py-1.5">
                        <span className="text-sm font-bold w-4" style={{ color: 'var(--text-tertiary)' }}>{i + 1}</span>
                        {item.avatar_url
                          ? <img src={item.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                          : <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}><User size={14} className="text-[var(--text-tertiary)]" /></div>}
                        <span className="flex-1 text-sm truncate font-medium" style={{ color: 'var(--text-primary)' }}>{item.display_name ?? 'Supporter'}</span>
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{(item as any).gogold_spent} 🪙</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Colonne chat — en bas sur mobile (hauteur fixe 38%), colonne latérale
            fixe sur desktop (lg:w-[380px], hauteur pleine) ── */}
        <div className="shrink-0 flex flex-col lg:w-[380px] lg:!h-full lg:border-r"
          style={{ height: '38%', background: 'rgba(15,15,20,0.97)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
            {messages.map(m => (
              <div key={m.id} className="flex items-start gap-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: m.side === 'a' ? '#7B3FF2' : '#F0365A' }} />
                <p className="text-sm text-white/90 min-w-0">
                  <span className="font-bold" style={{ color: m.side === 'a' ? '#A78BFA' : '#F87A9C' }}>{m.user}</span>{'  '}{m.text}
                </p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="shrink-0 flex items-center gap-2 px-3 py-2">
            <button onClick={() => handleReact('a')} className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(123,63,242,0.25)' }}>
              <Heart size={15} color="#fff" />
              {heartCountA > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: '#7B3FF2' }}>
                  {heartCountA > 99 ? '99+' : heartCountA}
                </span>
              )}
            </button>
            <input
              className="flex-1 min-w-0 text-white text-sm rounded-full px-3.5 py-2 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              placeholder="Écris un commentaire…"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendChat(); }}
            />
            <button onClick={handleSendChat} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
              <Send size={14} color="#fff" />
            </button>
            <button onClick={() => handleReact('b')} className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(240,54,90,0.25)' }}>
              <Heart size={15} color="#fff" />
              {heartCountB > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: '#F0365A' }}>
                  {heartCountB > 99 ? '99+' : heartCountB}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Envoyer un cadeau à l'un des deux compétiteurs */}
      {giftSide && battle && (
        <LiveGiftModal
          liveId={giftSide === 'a' ? battle.live_a_id : battle.live_b_id}
          receiverId={giftSide === 'a' ? battle.host_a_id : battle.host_b_id}
          receiverName={giftSide === 'a' ? hostNameA : hostNameB}
          onClose={() => setGiftSide(null)}
          onSent={() => setGiftSide(null)}
        />
      )}

      <style>{`
        @keyframes battle-crown-pop {
          0%   { transform: translateY(10px) scale(0.6); opacity: 0; }
          15%  { transform: translateY(0) scale(1.1); opacity: 1; }
          25%  { transform: scale(1); opacity: 1; }
          85%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes battle-biggift-in {
          0%   { transform: scale(0.3); opacity: 0; }
          60%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        /* Coeurs de réaction (heartFloaters) — même keyframe que LiveHeartsOverlay
           (LiveInteractions.tsx), redéclarée ici car pas importée sur cette page.
           Déplacement en pixels absolus (pas de %, qui se base sur la taille de
           l'élément animé lui-même — 36px — et rendrait la montée invisible). */
        @keyframes liveHeartRise {
          0%   { transform: translate(0, 0) scale(0);   opacity: 1; }
          15%  { transform: translate(calc(var(--drift-x) * 0.2), -70px) scale(1); }
          100% { transform: translate(var(--drift-x), -320px) scale(1); opacity: 0; }
        }
        /* Message de hype (HypeBanner) — slide-up + fade façon TikTok à chaque
           changement de message (nouvelle key = nouveau montage = animation rejouée). */
        @keyframes hype-msg-in {
          0%   { transform: translateY(6px); opacity: 0; }
          100% { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </LiveKitRoom>
    {ConfirmDialog}
    </>
  );
}

function ParticipantsCount({ onClick }: { onClick: () => void }) {
  const participants = useParticipants();
  return (
    <button onClick={onClick}
      className="flex items-center gap-1 text-white text-xs font-bold px-2 py-1 rounded-full shrink-0 transition-colors hover:bg-white/20"
      style={{ background: 'rgba(255,255,255,0.1)' }}>
      <Users size={12} /> {participants.length}
    </button>
  );
}

// ── Panel participants — tous les viewers connectés à la room du battle
// (spectateurs des deux camps confondus, seuls A et B publient de la vidéo) ──
function BattleParticipantsPanel({ onClose }: { onClose: () => void }) {
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
