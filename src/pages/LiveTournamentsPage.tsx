import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Award, Users, Coins } from 'lucide-react';
import { PageLoader, Spinner } from '../components/ui/Spinner';
import { tournamentsApi, type ActiveTournament } from '../api/tournaments';
import { useWs } from '../context/WebSocketContext';
import { encodeId } from '../utils/slugId';
import { LiveHeader, LivePage, PillButton, EmptyCard, InfoStrip, GlassChip, LIVE_COLORS, CARD_SHADOW, CARD_SHADOW_HOVER } from '../components/live/liveKit';
import { CreateTournamentModal } from '../components/live/CreateTournamentModal';

function TournamentCard({ tournament, onView }: { tournament: ActiveTournament; onView: () => void }) {
  return (
    <button onClick={onView}
      className="group rounded-[28px] overflow-hidden text-left transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: CARD_SHADOW }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = CARD_SHADOW_HOVER; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = CARD_SHADOW; }}>
      <div className="relative flex items-center justify-center overflow-hidden" style={{ aspectRatio: '16/10', background: 'linear-gradient(135deg,#1a0a33,#2d1366)' }}>
        {tournament.image_url ? (
          <img src={tournament.image_url} alt={tournament.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <Award size={34} style={{ color: LIVE_COLORS.gold }} />
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.55),transparent)' }} />
        <span className="absolute top-3 left-3"><GlassChip>{tournament.format} joueurs</GlassChip></span>
        {tournament.prize_pool > 0 && (
          <span className="absolute top-3 right-3"><GlassChip tone="gold"><Coins size={11} /> {tournament.prize_pool.toLocaleString('fr-FR')}</GlassChip></span>
        )}
      </div>
      <div className="px-4 py-3.5 flex items-center justify-between gap-3">
        <p className="text-sm font-black truncate" style={{ color: 'var(--text-primary)' }}>{tournament.name}</p>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
          <Users size={12} /> {tournament.participants_count.toLocaleString('fr-FR')}
        </span>
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
  const sentinelRef = useRef<HTMLDivElement>(null);

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

  const totalParticipants = tournaments.reduce((sum, t) => sum + (t.participants_count ?? 0), 0);

  async function handleCreated(t: { id: string }) {
    await loadTournaments();
    navigate(`/tournaments/${encodeId(t.id)}`);
  }

  if (loading) return <PageLoader />;

  return (
    <LivePage>
      <LiveHeader
        icon={<Award size={16} />}
        title="Tournois en cours"
        subtitle={tournaments.length > 0 ? `${tournaments.length} actif${tournaments.length > 1 ? 's' : ''}` : 'Compétitions en direct'}
        onBack={() => navigate(-1)}
        actions={<PillButton icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>Créer</PillButton>}
      />

      {tournaments.length > 0 && (
        <InfoStrip
          tone="gold"
          icon={<Award size={18} />}
          title={`${tournaments.length} tournoi${tournaments.length > 1 ? 's' : ''} actif${tournaments.length > 1 ? 's' : ''}`}
          subtitle={`${totalParticipants.toLocaleString('fr-FR')} participant${totalParticipants > 1 ? 's' : ''} au total`}
        />
      )}

      {tournaments.length === 0 ? (
        <EmptyCard icon={<Award size={28} />} title="Aucun tournoi en cours"
          description="Les tournois démarrés apparaîtront ici."
          action={<PillButton icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>Créer un tournoi</PillButton>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {tournaments.map(t => (
            <TournamentCard key={t.id} tournament={t} onView={() => navigate(`/tournaments/${encodeId(t.id)}`)} />
          ))}
        </div>
      )}

      {hasMore && tournaments.length > 0 && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {loadingMore && <Spinner size="sm" />}
        </div>
      )}

      <CreateTournamentModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
    </LivePage>
  );
}
