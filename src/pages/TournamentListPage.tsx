import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Award, Radio } from 'lucide-react';
import { PageLoader, Spinner } from '../components/ui/Spinner';
import { tournamentsApi, type OpenTournament, type Tournament } from '../api/tournaments';
import { encodeId } from '../utils/slugId';
import { CreateTournamentModal } from '../components/live/CreateTournamentModal';

export default function TournamentListPage() {
  const navigate = useNavigate();

  const [tournaments, setTournaments] = useState<OpenTournament[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(true);
  const [page, setPage]               = useState(1);
  const [joining, setJoining]         = useState<string | null>(null);
  const [showCreate, setShowCreate]   = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tournamentsApi.listOpen(1);
      setTournaments(res.items);
      setPage(1);
      setHasMore(res.has_more);
    } catch { /* silencieux */ } finally { setLoading(false); }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await tournamentsApi.listOpen(nextPage);
      setTournaments(prev => [...prev, ...res.items]);
      setPage(nextPage);
      setHasMore(res.has_more);
    } catch { /* silencieux */ } finally { setLoadingMore(false); }
  }, [page, hasMore, loadingMore]);

  useEffect(() => { load(); }, [load]);

  // Scroll infini via IntersectionObserver sur un sentinel — `loading` dans
  // les deps est nécessaire : le sentinel n'est monté qu'une fois le
  // chargement initial terminé, sinon l'effet peut tourner une fois avec
  // sentinelRef.current encore null et ne jamais re-observer le sentinel une
  // fois réellement présent (bug déjà rencontré/corrigé sur FeedPage.tsx et
  // ExploreReelsPage.tsx).
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

  async function handleJoin(t: OpenTournament) {
    if (joining) return;
    setJoining(t.id);
    try {
      await tournamentsApi.join(t.id);
      await load();
    } catch { /* silencieux */ } finally { setJoining(null); }
  }

  function handleOpenBracket(t: OpenTournament) {
    navigate(`/tournaments/${encodeId(t.id)}`);
  }

  async function handleCreated(t: Tournament) {
    await load();
    navigate(`/tournaments/${encodeId(t.id)}`);
  }

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-[calc(100vh-57px)]">
      <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <button onClick={() => navigate(-1)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-lg font-bold flex-1" style={{ color: 'var(--text-primary)' }}>Tournois</h1>
        <button onClick={() => navigate('/tournaments/active')} className="btn-ghost p-2 text-[var(--text-secondary)]" title="Tournois en cours">
          <Radio size={18} />
        </button>
        <button onClick={() => setShowCreate(true)} className="btn-ghost p-2 text-brand-primary">
          <Plus size={20} />
        </button>
      </div>

      <div className="w-full mx-auto p-4">
        <button onClick={() => navigate('/tournaments/active')}
          className="w-full flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-4 border"
          style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)' }}>
          <Radio size={16} color="#F59E0B" />
          <span className="text-sm font-bold" style={{ color: '#F59E0B' }}>Voir les tournois en cours</span>
        </button>

        {tournaments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 pt-16">
            <Award size={32} className="text-[var(--text-tertiary)]" />
            <p className="text-sm text-center text-[var(--text-tertiary)]">Aucun tournoi ouvert pour le moment.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {tournaments.map(t => {
              const full = t.participants_count >= t.max_participants;
              return (
                <div key={t.id}
                  className="card flex items-center gap-3 p-3.5 cursor-pointer hover:border-brand-primary transition-colors"
                  onClick={() => handleOpenBracket(t)}>
                  {t.image_url ? (
                    <img src={t.image_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-sm"
                      style={{ background: 'rgba(123,63,242,0.13)', color: '#7B3FF2' }}>
                      {t.format}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {t.format} joueurs · {t.participants_count} / {t.max_participants} inscrits
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleJoin(t); }}
                    disabled={!!joining || full}
                    className="shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold text-white min-w-[84px] flex items-center justify-center"
                    style={{ background: full ? '#9CA3AF' : '#7B3FF2' }}
                  >
                    {joining === t.id ? <Spinner size="sm" /> : full ? 'Complet' : 'Rejoindre'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && tournaments.length > 0 && (
          <div ref={sentinelRef} className="flex justify-center py-4">
            {loadingMore && <Spinner size="sm" />}
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
