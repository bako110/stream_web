import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Award, Radio } from 'lucide-react';
import { PageLoader, Spinner } from '../components/ui/Spinner';
import { tournamentsApi, type OpenTournament, type Tournament } from '../api/tournaments';
import { encodeId } from '../utils/slugId';
import { LiveHeader, LivePage, PillButton, EmptyCard, InfoStrip, LIVE_COLORS, LIVE_GRADIENT, CARD_SHADOW, CARD_SHADOW_HOVER } from '../components/live/liveKit';
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
    <LivePage>
      <LiveHeader
        icon={<Award size={16} />}
        title="Tournois"
        subtitle="Ouverts à l'inscription"
        onBack={() => navigate(-1)}
        actions={
          <>
            <PillButton variant="soft" icon={<Radio size={14} />} onClick={() => navigate('/tournaments/active')}>En cours</PillButton>
            <PillButton icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>Créer</PillButton>
          </>
        }
      />

      <InfoStrip tone="gold" icon={<Radio size={18} />} title="Voir les tournois en cours"
        subtitle="Suis les matchs en direct" onClick={() => navigate('/tournaments/active')} />

      {tournaments.length === 0 ? (
        <EmptyCard icon={<Award size={28} />} title="Aucun tournoi ouvert"
          description="Crée le premier tournoi et invite les créateurs à s'inscrire."
          action={<PillButton icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>Créer un tournoi</PillButton>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {tournaments.map(t => {
            const full = t.participants_count >= t.max_participants;
            const pct  = t.max_participants > 0 ? Math.min(100, (t.participants_count / t.max_participants) * 100) : 0;
            return (
              <div key={t.id}
                className="flex items-center gap-3.5 p-3.5 cursor-pointer rounded-[28px] transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: CARD_SHADOW }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = CARD_SHADOW_HOVER; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = CARD_SHADOW; }}
                onClick={() => handleOpenBracket(t)}>
                {t.image_url ? (
                  <img src={t.image_url} alt="" className="w-14 h-14 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 font-black text-sm"
                    style={{ background: 'rgba(123,63,242,0.12)', color: LIVE_COLORS.violet }}>
                    {t.format}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm truncate" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                  <p className="text-xs mt-0.5 font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                    {t.format} joueurs · {t.participants_count} / {t.max_participants} inscrits
                  </p>
                  <div className="h-1.5 rounded-full overflow-hidden mt-2" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: full ? LIVE_COLORS.gold : LIVE_COLORS.violet }} />
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleJoin(t); }}
                  disabled={!!joining || full}
                  className="shrink-0 h-9 px-4 rounded-full text-[13px] font-bold min-w-[92px] inline-flex items-center justify-center disabled:opacity-100"
                  style={full
                    ? { background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }
                    : { background: LIVE_GRADIENT, color: '#fff', boxShadow: '0 4px 14px rgba(123,63,242,0.3)' }}
                >
                  {joining === t.id ? <Spinner size="sm" /> : full ? 'Complet' : 'Rejoindre'}
                </button>
              </div>
            );
          })}
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
