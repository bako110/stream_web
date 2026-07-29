import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Eye, ChevronLeft, User } from 'lucide-react';
import { PageLoader } from '../components/ui/Spinner';
import { battlesApi, type ActiveBattle } from '../api/battles';
import { useWs } from '../context/WebSocketContext';
import { useAuthStore } from '../store/authStore';
import { encodeId } from '../utils/slugId';
import { MatchResultModal, type MatchResultData } from '../components/live/MatchResultModal';

function BattleCard({ battle, onWatch }: { battle: ActiveBattle; onWatch: () => void }) {
  return (
    <button onClick={onWatch}
      className="rounded-2xl overflow-hidden text-left transition-transform hover:scale-[1.02]"
      style={{ background: 'rgba(155,101,245,0.08)', border: '1px solid rgba(155,101,245,0.25)' }}>
      <div className="flex items-center" style={{ aspectRatio: '16/10' }}>
        <div className="flex-1 h-full flex flex-col items-center justify-center gap-1.5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#7B3FF233,#4C1D9522)' }}>
          {battle.host_a_avatar ? (
            <img src={battle.host_a_avatar} alt={battle.host_a_name ?? ''} className="w-12 h-12 rounded-full object-cover border-2" style={{ borderColor: '#7B3FF2' }} />
          ) : (
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#7B3FF2]"><User size={20} color="#fff" /></div>
          )}
          <span className="text-white text-xs font-bold truncate max-w-[90%]">{battle.host_a_name ?? 'Créateur A'}</span>
        </div>
        <div className="shrink-0 px-2 py-1 rounded-full text-[10px] font-black text-white z-10"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#F0365A)' }}>VS</div>
        <div className="flex-1 h-full flex flex-col items-center justify-center gap-1.5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#F0365A22,#9B1C3F33)' }}>
          {battle.host_b_avatar ? (
            <img src={battle.host_b_avatar} alt={battle.host_b_name ?? ''} className="w-12 h-12 rounded-full object-cover border-2" style={{ borderColor: '#F0365A' }} />
          ) : (
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#F0365A]"><User size={20} color="#fff" /></div>
          )}
          <span className="text-white text-xs font-bold truncate max-w-[90%]">{battle.host_b_name ?? 'Créateur B'}</span>
        </div>
      </div>
      <div className="flex items-center justify-between px-3 py-2" style={{ background: 'rgba(0,0,0,0.25)' }}>
        <span className="text-sm font-black" style={{ color: '#F0EFF8' }}>{battle.score_a} — {battle.score_b}</span>
        <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#9390AB' }}>
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

  const totalViewers = battles.reduce((sum, b) => sum + (b.viewer_count ?? 0), 0);

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-[calc(100vh-57px)]" style={{ background: 'linear-gradient(180deg,#1C1033,#0B0812)' }}>
      <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: 'rgba(155,101,245,0.25)', background: 'rgba(28,16,51,0.55)' }}>
        <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white transition-colors">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-lg font-extrabold" style={{ color: '#F0EFF8' }}>1 vs 1</h1>
      </div>

      <div className="w-full mx-auto p-4">
        {battles.length > 0 && (
          <div className="flex items-center gap-3 rounded-2xl p-4 mb-4"
            style={{ background: 'linear-gradient(135deg,#9B65F522,#7B3FF210)', border: '1px solid rgba(155,101,245,0.3)' }}>
            <div className="w-11 h-11 rounded-[13px] flex items-center justify-center shrink-0" style={{ background: 'rgba(155,101,245,0.18)' }}>
              <Zap size={20} color="#9B65F5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-extrabold" style={{ color: '#F0EFF8' }}>
                {battles.length} match{battles.length > 1 ? 's' : ''} en direct
              </p>
              <p className="text-xs font-semibold mt-0.5" style={{ color: '#9390AB' }}>
                {totalViewers.toLocaleString('fr-FR')} spectateur{totalViewers > 1 ? 's' : ''} en ce moment
              </p>
            </div>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#EF4444' }} />
          </div>
        )}

        {battles.length === 0 ? (
          <div className="flex flex-col items-center gap-3.5 pt-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(155,101,245,0.12)' }}>
              <Zap size={30} color="#9B65F5" />
            </div>
            <p className="text-sm font-semibold text-center px-8" style={{ color: '#9390AB' }}>
              Aucun match 1 vs 1 en direct pour le moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {battles.map(b => (
              <BattleCard key={b.id} battle={b} onWatch={() => navigate(`/battles/${encodeId(b.id)}`)} />
            ))}
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center mt-6">
            <button onClick={loadMore} disabled={loadingMore}
              className="btn-ghost text-sm px-5 py-2 text-white/70 border-white/20 hover:bg-white/10">
              {loadingMore ? 'Chargement...' : 'Voir plus'}
            </button>
          </div>
        )}
      </div>

      <MatchResultModal result={matchResult} onClose={() => setMatchResult(null)} />
    </div>
  );
}
