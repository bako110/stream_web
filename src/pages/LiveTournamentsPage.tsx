import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Award, Users } from 'lucide-react';
import { PageLoader } from '../components/ui/Spinner';
import { tournamentsApi, type ActiveTournament } from '../api/tournaments';
import { useWs } from '../context/WebSocketContext';
import { encodeId } from '../utils/slugId';
import { CreateTournamentModal } from '../components/live/CreateTournamentModal';

function TournamentCard({ tournament, onView }: { tournament: ActiveTournament; onView: () => void }) {
  return (
    <button onClick={onView}
      className="rounded-2xl overflow-hidden text-left transition-transform hover:scale-[1.02]"
      style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
      <div className="relative flex items-center justify-center overflow-hidden" style={{ aspectRatio: '16/10', background: 'linear-gradient(135deg,#F59E0B22,#D9770610)' }}>
        {tournament.image_url ? (
          <img src={tournament.image_url} alt={tournament.name} className="absolute inset-0 w-full h-full object-cover opacity-60" />
        ) : (
          <Award size={30} color="#F59E0B" />
        )}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black text-white" style={{ background: 'rgba(0,0,0,0.55)' }}>
          {tournament.format}
        </span>
      </div>
      <div className="p-2.5">
        <p className="text-sm font-bold truncate" style={{ color: '#F0EFF8' }}>{tournament.name}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#9390AB' }}>
            <Users size={11} /> {tournament.participants_count.toLocaleString('fr-FR')}
          </span>
          {tournament.prize_pool > 0 && (
            <span className="text-xs font-bold" style={{ color: '#FFD700' }}>{tournament.prize_pool.toLocaleString('fr-FR')} 🪙</span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function LiveTournamentsPage() {
  const navigate = useNavigate();
  const { addListener, removeListener } = useWs();

  const [tournaments, setTournaments] = useState<ActiveTournament[]>([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const tournamentsRef = useRef(tournaments);
  tournamentsRef.current = tournaments;

  const loadTournaments = useCallback(async () => {
    try {
      const p = await tournamentsApi.listActive(1);
      setTournaments(p.items);
      setPage(1);
      setHasMore(p.has_more);
    } catch { /* silencieux */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTournaments(); }, [loadTournaments]);

  useEffect(() => {
    const iv = setInterval(() => { loadTournaments(); }, 60_000);
    return () => clearInterval(iv);
  }, [loadTournaments]);

  useEffect(() => {
    const handler = (payload: any) => {
      if (payload.type === 'tournament_status_changed') {
        loadTournaments();
      } else if (payload.type === 'tournament_participants_updated') {
        setTournaments(prev => prev.map(t => t.id === payload.tournament_id ? { ...t, participants_count: payload.participants_count } : t));
      }
    };
    addListener(handler);
    return () => removeListener(handler);
  }, [addListener, removeListener, loadTournaments]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const p = await tournamentsApi.listActive(nextPage);
      setTournaments(prev => [...prev, ...p.items]);
      setHasMore(p.has_more);
      setPage(nextPage);
    } catch { /* silencieux */ } finally { setLoadingMore(false); }
  }, [loading, loadingMore, hasMore, page]);

  const totalParticipants = tournaments.reduce((sum, t) => sum + (t.participants_count ?? 0), 0);

  async function handleCreated(t: { id: string }) {
    await loadTournaments();
    navigate(`/tournaments/${encodeId(t.id)}`);
  }

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-[calc(100vh-57px)]" style={{ background: 'linear-gradient(180deg,#2A1F0A,#0B0812)' }}>
      <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(42,31,10,0.55)' }}>
        <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white transition-colors">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-lg font-extrabold flex-1" style={{ color: '#F0EFF8' }}>Tournois</h1>
        <button onClick={() => setShowCreate(true)} className="text-[#F59E0B]"><Plus size={22} /></button>
      </div>

      <div className="max-w-5xl mx-auto p-4">
        {tournaments.length > 0 && (
          <div className="flex items-center gap-3 rounded-2xl p-4 mb-4"
            style={{ background: 'linear-gradient(135deg,#F59E0B22,#F59E0B10)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <div className="w-11 h-11 rounded-[13px] flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.18)' }}>
              <Award size={20} color="#F59E0B" />
            </div>
            <div>
              <p className="text-sm font-extrabold" style={{ color: '#F0EFF8' }}>
                {tournaments.length} tournoi{tournaments.length > 1 ? 's' : ''} actif{tournaments.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs font-semibold mt-0.5" style={{ color: '#9390AB' }}>
                {totalParticipants.toLocaleString('fr-FR')} participant{totalParticipants > 1 ? 's' : ''} au total
              </p>
            </div>
          </div>
        )}

        {tournaments.length === 0 ? (
          <div className="flex flex-col items-center gap-3.5 pt-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)' }}>
              <Award size={30} color="#F59E0B" />
            </div>
            <p className="text-sm font-semibold text-center px-8" style={{ color: '#9390AB' }}>
              Aucun tournoi en cours pour le moment.
            </p>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-full px-4.5 py-2.5 text-sm font-bold text-white mt-1"
              style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>
              <Plus size={14} /> Créer un tournoi
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {tournaments.map(t => (
              <TournamentCard key={t.id} tournament={t} onView={() => navigate(`/tournaments/${encodeId(t.id)}`)} />
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

      <CreateTournamentModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
