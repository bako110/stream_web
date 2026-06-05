import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { encodeId } from '../utils/slugId';
import { Radio, Clock, Users, Zap, Ticket, Music } from 'lucide-react';
import type { Concert } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useApi } from '../hooks/useApi';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-white"
      style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 0 10px rgba(123,63,242,0.5)' }}>
      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
    </span>
  );
}

function AccessBadge({ type, price }: { type: Concert['access_type']; price: number | null }) {
  if (type === 'free') return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-green-400 bg-green-400/15">Gratuit</span>
  );
  if (type === 'ticket') return (
    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-orange-400 bg-orange-400/15">
      <Ticket size={10} /> {price != null ? price.toLocaleString() + ' FCFA' : 'Payant'}
    </span>
  );
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-brand-primary bg-brand-primary/15">Abonnement</span>
  );
}

function ConcertCard({ concert, isLiveCard = false }: { concert: Concert; isLiveCard?: boolean }) {
  const navigate = useNavigate();
  const isLive   = concert.status === 'live';

  return (
    <div
      className="group cursor-pointer overflow-hidden transition-all duration-300"
      style={{
        borderRadius: '1rem',
        border: `1px solid ${isLive ? 'rgba(123,63,242,0.3)' : 'var(--border)'}`,
        background: 'var(--surface)',
        boxShadow: isLive ? '0 4px 24px rgba(123,63,242,0.12)' : 'none',
      }}
      onClick={() => navigate(isLive ? `/live/${encodeId(concert.id)}` : `/concerts/${encodeId(concert.id)}`)}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = isLive
          ? '0 8px 32px rgba(123,63,242,0.25)'
          : '0 8px 32px rgba(123,63,242,0.18)';
        (e.currentTarget as HTMLDivElement).style.borderColor = isLive ? 'rgba(123,63,242,0.6)' : 'var(--primary)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = isLive ? '0 4px 24px rgba(123,63,242,0.12)' : 'none';
        (e.currentTarget as HTMLDivElement).style.borderColor = isLive ? 'rgba(123,63,242,0.3)' : 'var(--border)';
      }}
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '16/9', background: 'var(--bg-tertiary)' }}>
        {concert.thumbnail_url ? (
          <img src={concert.thumbnail_url} alt={concert.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,var(--bg-secondary),var(--bg-tertiary))' }}>
            <Music size={32} style={{ color: 'var(--text-tertiary)' }} />
          </div>
        )}

        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 55%)' }} />

        {/* Top-left badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {isLive && <LiveBadge />}
          {!isLive && concert.is_featured && (
            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full text-yellow-300 bg-yellow-400/20">
              <Zap size={10} /> Boost
            </span>
          )}
          {isLive && (
            <span className="flex items-center gap-1 text-xs text-white px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
              <Users size={10} /> {(concert.current_viewers ?? 0).toLocaleString()}
            </span>
          )}
        </div>

        {/* Top-right — access */}
        <div className="absolute top-3 right-3">
          <AccessBadge type={concert.access_type} price={concert.ticket_price} />
        </div>

        {/* Scheduled date (bas gauche) */}
        {!isLive && concert.scheduled_at && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 text-xs text-white/80">
            <Clock size={11} />
            {format(new Date(concert.scheduled_at), "d MMM 'à' HH'h'mm", { locale: fr })}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex gap-3">
        <Avatar src={concert.artist?.avatar_url} name={concert.artist?.display_name ?? concert.artist?.username} size="sm" className="shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-semibold text-[var(--text-primary)] line-clamp-1 text-sm">{concert.title}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
            {concert.artist?.display_name ?? concert.artist?.username}
          </p>
          {concert.genre && (
            <span className="text-xs text-brand-primary mt-1 inline-block">{concert.genre}</span>
          )}
        </div>

        {/* CTA */}
        <div className="ml-auto shrink-0 self-center">
          {isLive ? (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-all"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
              Regarder
            </span>
          ) : (
            <span className="text-xs font-medium px-3 py-1.5 rounded-lg text-[var(--text-secondary)] border border-[var(--border)] hover:border-brand-primary hover:text-brand-primary transition-all">
              Voir
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Boost modal ───────────────────────────────────────────────────────────────

function BoostModal({ concert, onClose, onDone }: { concert: Concert; onClose: () => void; onDone: () => void }) {
  const [days,    setDays]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const PRICE_PER_DAY = 500;

  async function handleBoost() {
    setLoading(true);
    setError(null);
    try {
      await apiClient.post(Endpoints.wallet.boostsPurchase, {
        target_type: 'concert',
        target_id:   concert.id,
        days,
      });
      onDone();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Erreur lors du boost');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="card p-6 max-w-sm w-full space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Zap size={18} className="text-yellow-400" /> Booster le live
          </h2>
          <button onClick={onClose} className="btn-ghost p-1 text-[var(--text-tertiary)]">✕</button>
        </div>

        <p className="text-sm text-[var(--text-secondary)]">
          Le concert <span className="font-semibold text-[var(--text-primary)]">{concert.title}</span> sera mis en avant dans la liste des lives et recommandé à plus de spectateurs.
        </p>

        <div className="space-y-2">
          <label className="text-xs text-[var(--text-tertiary)] font-medium">Durée du boost</label>
          <div className="grid grid-cols-3 gap-2">
            {[1, 3, 7].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${days === d ? 'border-brand-primary text-brand-primary bg-brand-primary/10' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>
                {d}j
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: 'var(--bg-secondary)' }}>
          <span className="text-sm text-[var(--text-secondary)]">Total</span>
          <span className="font-bold text-[var(--text-primary)]">{(days * PRICE_PER_DAY).toLocaleString()} coins</span>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button onClick={handleBoost} disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
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

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-full px-4 sm:px-6 py-6 space-y-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Radio className="text-red-500" /> Lives & Concerts
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {lives.length} en direct · {upcoming.length} à venir
          </p>
        </div>
        <button onClick={() => navigate('/concerts')}
          className="btn-ghost text-sm text-[var(--text-secondary)] border border-[var(--border)]">
          Tous les concerts
        </button>
      </div>

      {/* Lives en cours */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h2 className="font-semibold text-[var(--text-primary)]">En direct maintenant</h2>
          {lives.length > 0 && (
            <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full ml-1">
              {lives.length}
            </span>
          )}
        </div>

        {lives.length === 0 ? (
          <EmptyState
            icon={<Radio size={40} />}
            title="Aucun live en cours"
            description="Revenez plus tard ou consultez les concerts programmés ci-dessous."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lives.map(c => (
              <div key={c.id} className="relative">
                <ConcertCard concert={c} isLiveCard />
                <button
                  onClick={e => { e.stopPropagation(); setBoostTarget(c); }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium transition-all"
                  style={{ background: 'rgba(123,63,242,0.85)', color: '#fff', backdropFilter: 'blur(4px)' }}
                  title="Booster ce live">
                  <Zap size={11} /> Boost
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Boostes */}
      {boosted.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-yellow-400" />
            <h2 className="font-semibold text-[var(--text-primary)]">Mis en avant</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boosted.map(c => <ConcertCard key={c.id} concert={c} />)}
          </div>
        </section>
      )}

      {/* A venir */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[var(--text-secondary)]" />
          <h2 className="font-semibold text-[var(--text-primary)]">Prochains lives programmés</h2>
          {upcoming.length > 0 && (
            <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full ml-1">
              {upcoming.length}
            </span>
          )}
        </div>

        {upcoming.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)] py-4">Aucun concert programmé pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map(c => (
              <div key={c.id} className="relative group">
                <ConcertCard concert={c} />
                <button
                  onClick={e => { e.stopPropagation(); setBoostTarget(c); }}
                  className="absolute top-14 right-3 opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium transition-all"
                  style={{ background: 'rgba(123,63,242,0.85)', color: '#fff', backdropFilter: 'blur(4px)' }}
                  title="Booster ce concert">
                  <Zap size={11} /> Boost
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Boost modal */}
      {boostTarget && (
        <BoostModal
          concert={boostTarget}
          onClose={() => setBoostTarget(null)}
          onDone={() => { livesApi.refetch(); upcomingApi.refetch(); }}
        />
      )}
    </div>
  );
}
