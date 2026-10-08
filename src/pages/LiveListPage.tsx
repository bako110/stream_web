import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { encodeId } from '../utils/slugId';
import { Radio, Clock, Users, Zap, Ticket, Music, X } from 'lucide-react';
import type { Concert } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useApi } from '../hooks/useApi';
import { Spinner, PageLoader } from '../components/ui/Spinner';
import { Avatar } from '../components/ui/Avatar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { extractApiErrorMessage } from '../utils/apiError';
import { CUSTOM_REACH_CONFIG, computeCustomGoGold } from './wallet/boost/BoostCatalog';
import {
  LiveBadge, GlassChip, LiveHeader, LivePage, PillButton, SectionTitle, EmptyCard,
  LIVE_COLORS, LIVE_GRADIENT, CARD_SHADOW, CARD_SHADOW_HOVER,
} from '../components/live/liveKit';

function AccessBadge({ type, price }: { type: Concert['access_type']; price: number | null }) {
  if (type === 'free') return <GlassChip tone="green">Gratuit</GlassChip>;
  if (type === 'ticket') return (
    <GlassChip tone="gold"><Ticket size={11} /> {price != null ? price.toLocaleString('fr-FR') + ' FCFA' : 'Payant'}</GlassChip>
  );
  return <GlassChip tone="violet">Abonnement</GlassChip>;
}

function ConcertCard({ concert, onBoost }: { concert: Concert; onBoost?: (c: Concert) => void }) {
  const navigate = useNavigate();
  const isLive   = concert.status === 'live';
  const artist   = concert.artist?.display_name ?? concert.artist?.username;

  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-[28px] transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: CARD_SHADOW }}
      onClick={() => navigate(isLive ? `/live/${encodeId(concert.id)}` : `/concerts/${encodeId(concert.id)}`)}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = CARD_SHADOW_HOVER; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = CARD_SHADOW; }}
    >
      {/* Visuel */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '16/9', background: 'var(--bg-tertiary)' }}>
        {concert.thumbnail_url ? (
          <img src={concert.thumbnail_url} alt={concert.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1a0a33,#2d1366)' }}>
            <Music size={32} style={{ color: 'rgba(255,255,255,0.35)' }} />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.65),transparent)' }} />

        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {isLive && <LiveBadge />}
          {isLive && <GlassChip><Users size={11} /> {(concert.current_viewers ?? 0).toLocaleString('fr-FR')}</GlassChip>}
          {!isLive && concert.is_featured && <GlassChip tone="gold"><Zap size={11} /> Boost</GlassChip>}
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {onBoost && (
            <button onClick={e => { e.stopPropagation(); onBoost(concert); }} title="Booster"
              className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-[11px] font-bold text-white px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(123,63,242,0.9)' }}>
              <Zap size={11} /> Boost
            </button>
          )}
          <AccessBadge type={concert.access_type} price={concert.ticket_price} />
        </div>

        {!isLive && concert.scheduled_at && (
          <div className="absolute bottom-3 left-3">
            <GlassChip><Clock size={11} /> {format(new Date(concert.scheduled_at), "d MMM 'à' HH'h'mm", { locale: fr })}</GlassChip>
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="p-4 flex gap-3 items-center">
        <Avatar src={concert.artist?.avatar_url} name={artist} size="md" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-black text-sm line-clamp-1" style={{ color: 'var(--text-primary)' }}>{concert.title}</p>
          <p className="text-xs mt-0.5 truncate font-semibold" style={{ color: 'var(--text-secondary)' }}>{artist}</p>
          {concert.genre && <span className="text-xs mt-0.5 inline-block font-semibold" style={{ color: LIVE_COLORS.violet }}>{concert.genre}</span>}
        </div>
        {isLive ? (
          <span className="shrink-0 h-9 px-4 rounded-full inline-flex items-center text-[13px] font-bold text-white"
            style={{ background: LIVE_GRADIENT, boxShadow: '0 4px 14px rgba(123,63,242,0.3)' }}>Regarder</span>
        ) : (
          <span className="shrink-0 h-9 px-4 rounded-full inline-flex items-center text-[13px] font-bold"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Voir</span>
        )}
      </div>
    </div>
  );
}

// ── Boost modal ───────────────────────────────────────────────────────────────

function BoostModal({ concert, onClose, onDone }: { concert: Concert; onClose: () => void; onDone: () => void }) {
  const [days,    setDays]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Reach fixé au preset le plus bas du catalogue concert_reach — cette
  // modale ne propose qu'un choix de durée, pas de portée. Prix suit la
  // vraie grille tarifaire (computeCustomGoGold) au lieu d'un forfait
  // "maison" (500 GoGold/jour) déconnecté du schéma backend, qui attend
  // boost_option_id/tier_id/gogold_amount (BoostPurchaseRequest côté API).
  const REACH = CUSTOM_REACH_CONFIG.concert_reach.presets[0];
  const gogold = computeCustomGoGold('concert_reach', REACH, days);

  async function handleBoost() {
    setLoading(true);
    setError(null);
    try {
      await apiClient.post(Endpoints.wallet.boostsPurchase, {
        boost_option_id: 'concert_reach',
        tier_id: 'custom',
        gogold_amount: gogold,
        custom_reach: REACH,
        custom_duration: days,
        target_content_id: concert.id,
        target_content_type: 'concert',
        target_content_title: concert.title,
      });
      onDone();
      onClose();
    } catch (e: any) {
      setError(extractApiErrorMessage(e, 'Erreur lors du boost'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="p-6 max-w-sm w-full space-y-5 rounded-[28px]"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.15)', color: LIVE_COLORS.gold }}><Zap size={17} /></span>
          <h2 className="font-black flex-1" style={{ color: 'var(--text-primary)' }}>Booster le live</h2>
          <button onClick={onClose} aria-label="Fermer" className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}><X size={15} /></button>
        </div>

        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Le concert <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{concert.title}</span> sera mis en avant dans la liste des lives et recommandé à plus de spectateurs.
        </p>

        <div className="space-y-2">
          <label className="text-xs font-bold" style={{ color: 'var(--text-tertiary)' }}>Durée du boost</label>
          <div className="grid grid-cols-3 gap-2">
            {[1, 3, 7].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className="py-2.5 rounded-full text-sm font-bold transition-all"
                style={days === d
                  ? { background: 'rgba(123,63,242,0.12)', color: LIVE_COLORS.violet, border: `1.5px solid ${LIVE_COLORS.violet}` }
                  : { color: 'var(--text-secondary)', border: '1.5px solid var(--border)' }}>
                {d}j
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl px-4 py-3 flex items-center justify-between" style={{ background: 'var(--bg-secondary)' }}>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total</span>
          <span className="font-black" style={{ color: 'var(--text-primary)' }}>{gogold.toLocaleString('fr-FR')} GoGold</span>
        </div>

        {error && <p className="text-xs font-semibold" style={{ color: LIVE_COLORS.live }}>{error}</p>}

        <button onClick={handleBoost} disabled={loading}
          className="w-full h-11 rounded-full flex items-center justify-center gap-2 text-sm font-bold text-white disabled:opacity-60"
          style={{ background: LIVE_GRADIENT, boxShadow: '0 4px 14px rgba(123,63,242,0.3)' }}>
          {loading ? <Spinner size="sm" /> : <Zap size={15} />}
          {loading ? 'Traitement...' : 'Confirmer le boost'}
        </button>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function LiveListPage() {
  const navigate = useNavigate();

  const livesApi    = useApi<Concert[]>(() => apiClient.get<Concert[]>(Endpoints.concerts.live));
  const upcomingApi = useApi<Concert[]>(() => apiClient.get<Concert[]>(Endpoints.concerts.upcoming));

  const lives    = livesApi.data    ?? [];
  const upcoming = upcomingApi.data ?? [];
  const boosted  = [...lives, ...upcoming].filter(c => c.is_featured);

  const [boostTarget, setBoostTarget] = useState<Concert | null>(null);

  const loading = livesApi.loading && upcomingApi.loading;

  // Polling toutes les 15s comme le mobile
  useEffect(() => {
    const iv = setInterval(() => {
      livesApi.refetch?.();
    }, 15_000);
    return () => clearInterval(iv);
  }, [livesApi]);

  if (loading) return <PageLoader />;

  return (
    <LivePage>
      <LiveHeader
        icon={<Radio size={16} />}
        title="Lives & Concerts"
        subtitle={`${lives.length} en direct · ${upcoming.length} à venir`}
        actions={<PillButton variant="ghost" onClick={() => navigate('/concerts')}>Tous les concerts</PillButton>}
      />

      <div className="space-y-9">
        {/* En direct */}
        <section>
          <SectionTitle icon={<Radio size={15} />} title="En direct maintenant" count={lives.length} tone="live" pulse />
          {lives.length === 0 ? (
            <EmptyCard icon={<Radio size={28} />} title="Aucun live en cours"
              description="Revenez plus tard ou consultez les concerts programmés ci-dessous." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {lives.map(c => <ConcertCard key={c.id} concert={c} onBoost={setBoostTarget} />)}
            </div>
          )}
        </section>

        {/* Mis en avant */}
        {boosted.length > 0 && (
          <section>
            <SectionTitle icon={<Zap size={15} />} title="Mis en avant" count={boosted.length} tone="gold" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {boosted.map(c => <ConcertCard key={c.id} concert={c} />)}
            </div>
          </section>
        )}

        {/* À venir */}
        <section>
          <SectionTitle icon={<Clock size={15} />} title="Prochains lives programmés" count={upcoming.length} />
          {upcoming.length === 0 ? (
            <EmptyCard icon={<Clock size={28} />} title="Rien de programmé" description="Aucun concert programmé pour le moment." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {upcoming.map(c => <ConcertCard key={c.id} concert={c} onBoost={setBoostTarget} />)}
            </div>
          )}
        </section>
      </div>

      {boostTarget && (
        <BoostModal
          concert={boostTarget}
          onClose={() => setBoostTarget(null)}
          onDone={() => { livesApi.refetch(); upcomingApi.refetch(); }}
        />
      )}
    </LivePage>
  );
}
