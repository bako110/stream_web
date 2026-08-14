import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Send, Award, User, Heart, Users, Gift, Zap } from 'lucide-react';
import {
  LiveKitRoom, VideoTrack, useTracks, useParticipants, RoomAudioRenderer,
} from '@livekit/components-react';
import { Track, VideoPresets } from 'livekit-client';
import { PageLoader, Spinner } from '../components/ui/Spinner';
import { useConfirm } from '../components/ui/Dialog';
import { decodeId } from '../utils/slugId';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { WS_BASE_URL } from '../utils/constants';
import { openAuthenticatedWs } from '../utils/authenticatedWs';
import { useAuthStore } from '../store/authStore';
import { useWs } from '../context/WebSocketContext';
import { battlesApi, type Battle, type BattleRanking } from '../api/battles';
import { MatchResultModal, type MatchResultData } from '../components/live/MatchResultModal';
import { LiveGiftModal } from '../components/live/LiveGiftModal';

const BIG_GIFT_THRESHOLD = 500;

interface GiftTick { id: string; side: 'a' | 'b'; senderName: string; emoji: string; giftName: string; gogold: number; }

const BATTLE_ROOM_OPTIONS = {
  adaptiveStream: true,
  dynacast: true,
  publishDefaults: {
    videoCodec: 'h264' as const,
    videoSimulcastLayers: [VideoPresets.h720],
  },
};

interface ChatMsg { id: string; side: 'a' | 'b'; user: string; text: string; }

function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
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

function BattleVideoHalf({ hostId, hostName, hostAvatar, side, leading, giftTicks, crownKey, onGiftClick }: {
  hostId: string | undefined; hostName: string; hostAvatar: string | null; side: 'a' | 'b'; leading: boolean;
  giftTicks: GiftTick[]; crownKey: string | null; onGiftClick?: () => void;
}) {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const track = tracks.find(t => t.participant.identity === hostId);
  const color = side === 'a' ? '#7B3FF2' : '#F0365A';

  return (
    <div className="relative flex-1 h-full overflow-hidden rounded-lg"
      style={{
        boxShadow: leading ? `inset 0 0 0 3px ${color}, 0 0 20px ${color}66` : `inset 0 0 0 1px rgba(255,255,255,0.08)`,
        transition: 'box-shadow 0.3s ease',
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

      {crownKey && (
        <span key={crownKey} className="absolute top-3 left-1/2 -translate-x-1/2 text-3xl z-10"
          style={{ animation: 'battle-crown-pop 2.6s ease-out forwards' }}>👑</span>
      )}

      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full backdrop-blur-sm z-10"
        style={{ background: 'rgba(0,0,0,0.55)', border: `1px solid ${color}55` }}>
        {hostAvatar
          ? <img src={hostAvatar} className="w-5 h-5 rounded-full object-cover" />
          : <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: color }}><User size={10} color="#fff" /></div>}
        <span className="text-white text-xs font-bold truncate max-w-[110px]">{hostName}</span>
        {leading && <span className="text-xs">👑</span>}
      </div>

      {onGiftClick && (
        <button onClick={onGiftClick} className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center z-10"
          style={{ background: 'rgba(0,0,0,0.55)' }}>
          <Gift size={14} color="#fbbf24" />
        </button>
      )}

      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10 max-w-[75%]">
        {giftTicks.map(t => (
          <div key={t.id} className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold text-white truncate"
            style={{
              background: side === 'a' ? 'linear-gradient(135deg,#7B3FF2,#4C1D95)' : 'linear-gradient(135deg,#F0365A,#9B1C3F)',
              animation: 'battle-gift-tick 4.2s ease-out forwards',
            }}>
            <span>{t.emoji}</span>
            <span className="truncate">{t.senderName} · {t.gogold}🪙</span>
          </div>
        ))}
      </div>
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
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [ended, setEnded] = useState<{ winner_id: string | null; score_a: number; score_b: number } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [hostNameA, setHostNameA] = useState('Créateur A');
  const [hostNameB, setHostNameB] = useState('Créateur B');
  const [hostAvatarA, setHostAvatarA] = useState<string | null>(null);
  const [hostAvatarB, setHostAvatarB] = useState<string | null>(null);
  const [giftTicksA, setGiftTicksA] = useState<GiftTick[]>([]);
  const [giftTicksB, setGiftTicksB] = useState<GiftTick[]>([]);
  const [crownA, setCrownA] = useState<string | null>(null);
  const [crownB, setCrownB] = useState<string | null>(null);
  const [bigGift, setBigGift] = useState<{ id: string; senderName: string; emoji: string; giftName: string; gogold: number } | null>(null);
  const [giftSide, setGiftSide] = useState<'a' | 'b' | null>(null);

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
      } catch { /* silencieux */ } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [battleId]);

  useEffect(() => {
    if (!battle?.host_a_id) return;
    apiClient.get<any>(Endpoints.users.publicProfile(battle.host_a_id))
      .then(r => { setHostNameA(r.data.display_name || r.data.username || 'Créateur A'); setHostAvatarA(r.data.avatar_url); })
      .catch(() => {});
  }, [battle?.host_a_id]);

  useEffect(() => {
    if (!battle?.host_b_id) return;
    apiClient.get<any>(Endpoints.users.publicProfile(battle.host_b_id))
      .then(r => { setHostNameB(r.data.display_name || r.data.username || 'Créateur B'); setHostAvatarB(r.data.avatar_url); })
      .catch(() => {});
  }, [battle?.host_b_id]);

  const refreshRanking = useCallback(() => {
    battlesApi.getRanking(battleId).then(setRanking).catch(() => {});
  }, [battleId]);

  // WS global — battle_started / battle_ended
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
      if (payload.type === 'battle_score_update') {
        setBattle(prev => prev ? { ...prev, score_a: payload.score_a, score_b: payload.score_b } : prev);
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
            (side === 'a' ? setGiftTicksA : setGiftTicksB)(prev => [...prev.slice(-3), tick]);
            setTimeout(() => (side === 'a' ? setGiftTicksA : setGiftTicksB)(prev => prev.filter(t => t.id !== tick.id)), 4200);

            (side === 'a' ? setCrownA : setCrownB)(tick.id);
            setTimeout(() => (side === 'a' ? setCrownA : setCrownB)(prev => prev === tick.id ? null : prev), 2600);

            if (tick.gogold >= BIG_GIFT_THRESHOLD) {
              setBigGift({ id: tick.id, senderName, emoji: tick.emoji, giftName: tick.giftName, gogold: tick.gogold });
              setTimeout(() => setBigGift(prev => prev?.id === tick.id ? null : prev), 3800);
            }
            refreshRanking();
          }
        } catch { /* ignore */ }
      };
      sockets.push(ws);
    });
    wsRef.current = sockets[myHostSide === 'b' ? 1 : 0];
    return () => { cancelled = true; sockets.forEach(s => s.close()); };
  }, [accessToken, battle?.live_a_id, battle?.live_b_id, refreshRanking, myHostSide]);

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
    battlesApi.react(battleId, side).catch(() => {});
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

  if (loading) return <PageLoader />;

  // Battle déjà terminé au chargement (pas de token LiveKit à obtenir) — on
  // affiche directement le résultat, sans essayer de monter une room LiveKit.
  if (ended && (!token || !wsUrl)) {
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

  const scoreA = battle?.score_a ?? 0;
  const scoreB = battle?.score_b ?? 0;
  const total = scoreA + scoreB;
  const pctA = total > 0 ? (scoreA / total) * 100 : 50;
  const leadingSide: 'a' | 'b' | null = total === 0 ? null : scoreA > scoreB ? 'a' : scoreB > scoreA ? 'b' : null;
  const topDonor = ranking?.top_donor;

  return (
    <>
    <LiveKitRoom serverUrl={wsUrl} token={token} connect options={BATTLE_ROOM_OPTIONS} className="h-[calc(100vh-57px)]">
      <RoomAudioRenderer />
      <div className="flex flex-col h-full bg-black">
        {/* Header — fermer, participants, countdown+score+barre, top supporter */}
        <div className="shrink-0 px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">
          <button onClick={handleClose} disabled={leaving} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
            {leaving ? <Spinner size="sm" /> : <X size={18} color="#fff" />}
          </button>
          <ParticipantsCount />

          <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <span className="text-white font-mono text-sm font-bold">{formatCountdown(remaining)}</span>
            <div className="w-full max-w-xs h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="h-full transition-all duration-500" style={{ width: `${pctA}%`, background: 'linear-gradient(90deg,#7B3FF2,#F0365A)' }} />
            </div>
            <div className="flex items-center gap-2.5">
              <BouncyScore value={scoreA} color="#A78BFA" />
              <Zap size={16} color="#FFD700" />
              <BouncyScore value={scoreB} color="#F87A9C" />
            </div>
          </div>

          {topDonor ? (
            <button onClick={() => setShowRanking(true)}
              className="flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 shrink-0 max-w-[120px] sm:max-w-[150px]"
              style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.3)' }}>
              {topDonor.avatar_url
                ? <img src={topDonor.avatar_url} className="w-[18px] h-[18px] rounded-full object-cover shrink-0" />
                : <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}><User size={10} color="#fff" /></div>}
              <span className="text-[10px] font-bold truncate" style={{ color: '#FFD700' }}>👑 {topDonor.display_name ?? 'Supporter'}</span>
            </button>
          ) : (
            <button onClick={() => setShowRanking(true)} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <Award size={17} color="#FFD700" />
            </button>
          )}
        </div>

        {/* Video zone — deux colonnes nettement séparées */}
        <div className="flex-1 flex relative min-h-0 gap-[3px] px-[3px]" style={{ background: '#000' }}>
          <BattleVideoHalf hostId={battle?.host_a_id} hostName={hostNameA} hostAvatar={hostAvatarA} side="a" leading={leadingSide === 'a'}
            giftTicks={giftTicksA} crownKey={crownA} onGiftClick={battle ? () => setGiftSide('a') : undefined} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 px-3 py-1.5 rounded-full font-black text-white text-xs shadow-lg"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#F0365A)', boxShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>VS</div>
          <BattleVideoHalf hostId={battle?.host_b_id} hostName={hostNameB} hostAvatar={hostAvatarB} side="b" leading={leadingSide === 'b'}
            giftTicks={giftTicksB} crownKey={crownB} onGiftClick={battle ? () => setGiftSide('b') : undefined} />
        </div>

        {/* Bottom: chat + actions */}
        <div className="shrink-0 flex flex-col" style={{ height: '38%', background: 'rgba(15,15,20,0.97)' }}>
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
            <button onClick={() => handleReact('a')} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(123,63,242,0.25)' }}>
              <Heart size={15} color="#fff" />
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
            <button onClick={() => handleReact('b')} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(240,54,90,0.25)' }}>
              <Heart size={15} color="#fff" />
            </button>
          </div>
        </div>

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

      {/* Gros cadeau — bannière plein écran avec trône + nom du donateur */}
      {bigGift && (
        <div key={bigGift.id} className="fixed inset-0 z-[65] flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-1.5 px-8 py-7 rounded-3xl text-center"
            style={{ background: 'linear-gradient(135deg,#F59E0B,#F0365A,#9B65F5)', animation: 'battle-biggift-in 0.45s ease-out' }}>
            <span className="text-4xl">🪑</span>
            <span className="text-2xl -mt-3">👑</span>
            <p className="text-white text-xs font-black tracking-widest">LE ROI DU MATCH</p>
            <span className="text-4xl mt-1">{bigGift.emoji}</span>
            <p className="text-white text-sm font-bold">{bigGift.giftName}</p>
            <p className="text-white/90 text-sm font-semibold truncate max-w-[220px]">{bigGift.senderName}</p>
            <div className="mt-1 px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <span className="text-white text-xs font-bold">🪙 {bigGift.gogold.toLocaleString('fr-FR')} GoGold</span>
            </div>
          </div>
        </div>
      )}

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

      <MatchResultModal result={matchResult} onClose={() => setEnded(null)} />

      <style>{`
        @keyframes battle-crown-pop {
          0%   { transform: translateY(10px) scale(0.6); opacity: 0; }
          15%  { transform: translateY(0) scale(1.1); opacity: 1; }
          25%  { transform: scale(1); opacity: 1; }
          85%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes battle-gift-tick {
          0%   { transform: scale(0.7); opacity: 0; }
          10%  { transform: scale(1); opacity: 1; }
          88%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes battle-biggift-in {
          0%   { transform: scale(0.3); opacity: 0; }
          60%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </LiveKitRoom>
    {ConfirmDialog}
    </>
  );
}

function ParticipantsCount() {
  const participants = useParticipants();
  return (
    <span className="flex items-center gap-1 text-white text-xs font-bold px-2 py-1 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
      <Users size={12} /> {participants.length}
    </span>
  );
}
