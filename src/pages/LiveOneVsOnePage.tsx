import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Eye, User, Award } from 'lucide-react';
import { PageLoader, Spinner } from '../components/ui/Spinner';
import { battlesApi, type ActiveBattle } from '../api/battles';
import { useWs } from '../context/WebSocketContext';
import { useAuthStore } from '../store/authStore';
import { encodeId } from '../utils/slugId';
import { LiveHeader, LivePage, PillButton, EmptyCard, InfoStrip, LiveBadge, LIVE_COLORS, CARD_SHADOW, CARD_SHADOW_HOVER } from '../components/live/liveKit';
import { MatchResultModal, type MatchResultData } from '../components/live/MatchResultModal';

// Les deux camps : violet (A) vs rose (B) — paire harmonisée avec la palette de l'app.
const SIDE_A = LIVE_COLORS.violetSoft;
const SIDE_B = LIVE_COLORS.rose;

function Fighter({ avatar, name, color, fallback }: { avatar?: string | null; name?: string | null; color: string; fallback: string }) {
  return (
    <div className="relative flex-1 h-full flex flex-col items-center justify-center gap-2 px-2">
      {avatar ? (
        <img src={avatar} alt={name ?? ''} className="w-16 h-16 rounded-full object-cover"
          style={{ border: `3px solid ${color}`, boxShadow: `0 0 18px ${color}88` }} />
      ) : (
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: color, boxShadow: `0 0 18px ${color}88` }}>
          <User size={24} color="#fff" />
        </div>
      )}
      <span className="text-white text-xs font-bold truncate max-w-[90%]" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
        {name ?? fallback}
      </span>
    </div>
  );
}

function BattleCard({ battle, onWatch }: { battle: ActiveBattle; onWatch: () => void }) {
  return (
    <button onClick={onWatch}
      className="group rounded-[28px] overflow-hidden text-left transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: CARD_SHADOW }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = CARD_SHADOW_HOVER; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = CARD_SHADOW; }}>
      {/* Scène sombre : les deux combattants face à face */}
      <div className="relative flex items-center" style={{ aspectRatio: '16/10', background: '#120b22' }}>
        <div className="absolute inset-0" style={{
          background: `radial-gradient(circle at 20% 35%,${SIDE_A}66,transparent 58%), radial-gradient(circle at 80% 65%,${SIDE_B}66,transparent 58%)`,
        }} />
        <Fighter avatar={battle.host_a_avatar} name={battle.host_a_name} color={SIDE_A} fallback="Créateur A" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: `linear-gradient(135deg,${SIDE_A},${SIDE_B})`, border: '3px solid #120b22', boxShadow: '0 4px 14px rgba(0,0,0,0.5)' }}>
          <span className="text-white text-[11px] font-black tracking-wide">VS</span>
        </div>
        <Fighter avatar={battle.host_b_avatar} name={battle.host_b_name} color={SIDE_B} fallback="Créateur B" />
        <div className="absolute top-3 left-3"><LiveBadge small /></div>
      </div>

      {/* Score + spectateurs */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-base font-black tabular-nums" style={{ color: 'var(--text-primary)' }}>
          <span style={{ color: SIDE_A }}>{battle.score_a}</span>
          <span style={{ color: 'var(--text-tertiary)' }}> — </span>
          <span style={{ color: SIDE_B }}>{battle.score_b}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
          <Eye size={12} /> {battle.viewer_count.toLocaleString('fr-FR')}
        </span>
      </div>
    </button>
  );
}

export default function LiveOneVsOnePage() {
  const navigate = useNavigate();
  const { addListener, removeListener } = useWs();
  const { user } = useAuthStore();

  const [battles, setBattles]   = useState<ActiveBattle[]>([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResultData | null>(null);
  const battlesRef = useRef(battles);
  battlesRef.current = battles;
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadBattles = useCallback(async () => {
    try {
      const p = await battlesApi.listActive(1);
      setBattles(p.items);
      setPage(1);
      setHasMore(p.has_more);
    } catch { /* silencieux */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadBattles(); }, [loadBattles]);

  useEffect(() => {
    const iv = setInterval(() => { loadBattles(); }, 60_000);
    return () => clearInterval(iv);
  }, [loadBattles]);

  useEffect(() => {
    const handler = (payload: any) => {
      if (payload.type === 'battle_started_broadcast') {
        loadBattles();
      } else if (payload.type === 'battle_ended_broadcast') {
        const battle = battlesRef.current.find(b => b.id === payload.battle_id);
        if (battle) {
          const winnerId: string | null = payload.winner_id ?? null;
          const isDraw = winnerId === null;
          const winnerIsA = winnerId === battle.host_a_id;
          const myId = user?.id ? String(user.id) : null;
          const viewerRole: 'won' | 'lost' | 'spectator' =
            isDraw || !myId ? 'spectator'
            : myId === battle.host_a_id ? (winnerIsA ? 'won' : 'lost')
            : myId === battle.host_b_id ? (winnerIsA ? 'lost' : 'won')
            : 'spectator';
          setMatchResult({
            isDraw,
            viewerRole,
            winnerName: isDraw ? '' : (winnerIsA ? battle.host_a_name : battle.host_b_name) ?? 'Créateur',
            loserName:  isDraw ? '' : (winnerIsA ? battle.host_b_name : battle.host_a_name) ?? 'Créateur',
            winnerAvatar: isDraw ? null : (winnerIsA ? battle.host_a_avatar : battle.host_b_avatar) ?? null,
            scoreA: Number(payload.score_a ?? battle.score_a ?? 0),
            scoreB: Number(payload.score_b ?? battle.score_b ?? 0),
            winnerGoGold: isDraw ? null : (winnerIsA ? payload.score_a : payload.score_b) ?? null,
          });
        }
        setBattles(prev => prev.filter(b => b.id !== payload.battle_id));
      } else if (payload.type === 'battle_score_update_broadcast') {
        setBattles(prev => prev.map(b => b.id === payload.battle_id ? { ...b, score_a: payload.score_a, score_b: payload.score_b } : b));
      }
    };
    addListener(handler);
    return () => removeListener(handler);
  }, [addListener, removeListener, loadBattles, user?.id]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const p = await battlesApi.listActive(nextPage);
      setBattles(prev => [...prev, ...p.items]);
      setHasMore(p.has_more);
      setPage(nextPage);
    } catch { /* silencieux */ } finally { setLoadingMore(false); }
  }, [loading, loadingMore, hasMore, page]);

  // Scroll infini via IntersectionObserver — `loading` dans les deps est
  // nécessaire : le sentinel n'est monté qu'une fois le chargement initial
  // terminé, sinon l'effet peut tourner une fois avec sentinelRef.current
  // encore null et ne jamais re-observer le sentinel une fois réellement
  // présent (même pattern que FeedPage.tsx / ExploreReelsPage.tsx).
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || !hasMore) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '400px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loading, hasMore, loadMore]);

  const totalViewers = battles.reduce((sum, b) => sum + (b.viewer_count ?? 0), 0);

  if (loading) return <PageLoader />;

  return (
    <LivePage>
      <LiveHeader
        icon={<Zap size={16} />}
        title="1 vs 1"
        subtitle={battles.length > 0 ? `${battles.length} match${battles.length > 1 ? 's' : ''} en direct` : 'Défis en direct entre créateurs'}
        onBack={() => navigate(-1)}
        actions={<PillButton variant="soft" icon={<Award size={14} />} onClick={() => navigate('/tournaments')}>Tournois</PillButton>}
      />

      {battles.length > 0 && (
        <InfoStrip
          icon={<Zap size={18} />}
          title={`${battles.length} match${battles.length > 1 ? 's' : ''} en direct`}
          subtitle={`${totalViewers.toLocaleString('fr-FR')} spectateur${totalViewers > 1 ? 's' : ''} en ce moment`}
          trailing={<LiveBadge small />}
        />
      )}

      {battles.length === 0 ? (
        <EmptyCard icon={<Zap size={28} />} title="Aucun match en direct"
          description="Les défis 1 vs 1 en cours apparaîtront ici dès qu'ils commenceront." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {battles.map(b => (
            <BattleCard key={b.id} battle={b} onWatch={() => navigate(`/battles/${encodeId(b.id)}`)} />
          ))}
        </div>
      )}

      {hasMore && battles.length > 0 && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {loadingMore && <Spinner size="sm" />}
        </div>
      )}

      <MatchResultModal result={matchResult} onClose={() => setMatchResult(null)} />
    </LivePage>
  );
}
