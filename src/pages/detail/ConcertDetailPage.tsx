import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Radio, MapPin, Clock, Users, Ticket, Play, Zap, StopCircle } from 'lucide-react';
import type { Concert, StreamToken } from '../../types';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="card p-6 max-w-sm w-full space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Zap size={18} className="text-yellow-400" /> Booster le concert
          </h2>
          <button onClick={onClose} className="btn-ghost p-1 text-[var(--text-tertiary)]">✕</button>
        </div>

        <p className="text-sm text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">{concert.title}</span> sera mis en avant dans les recommandations et la liste des lives.
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
          style={{ background: 'linear-gradient(135deg,#F59E0B,#F0365A)' }}>
          {loading ? <Spinner size="sm" /> : <Zap size={15} />}
          {loading ? 'Traitement...' : 'Confirmer le boost'}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConcertDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: concert, loading, refetch } = useApi<Concert>(
    () => apiClient.get<Concert>(Endpoints.concerts.byId(id!)), [id],
  );

  const [starting,     setStarting]     = useState(false);
  const [stopping,     setStopping]     = useState(false);
  const [buying,       setBuying]       = useState(false);
  const [showBoost,    setShowBoost]    = useState(false);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!concert) return <div className="p-6 text-[var(--text-secondary)]">Concert introuvable.</div>;

  const c        = concert;
  const isLive   = c.status === 'live';
  const isEnded  = c.status === 'ended';
  const isArtist = user && c.artist_id === user.id;

  async function handleStart() {
    if (!id) return;
    setStarting(true);
    try {
      await apiClient.post<StreamToken>(Endpoints.streaming.start(id));
      await refetch();
      navigate(`/live/${id}`);
    } catch { /* error */ }
    finally { setStarting(false); }
  }

  async function handleStop() {
    if (!id) return;
    setStopping(true);
    try {
      await apiClient.post(Endpoints.streaming.stop(id));
      await refetch();
    } catch { /* error */ }
    finally { setStopping(false); }
  }

  async function handleBuyTicket() {
    setBuying(true);
    try {
      await apiClient.post(Endpoints.concerts.buyTicket(c.id));
      navigate(`/live/${c.id}`);
    } catch { /* error */ }
    finally { setBuying(false); }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">

      {/* Banner */}
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-[var(--bg-tertiary)]">
        {c.banner_url || c.thumbnail_url ? (
          <img src={c.banner_url ?? c.thumbnail_url ?? ''} className="w-full h-full object-cover" alt={c.title} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,var(--bg-secondary),var(--bg-tertiary))' }}>
            <Radio size={48} className="text-[var(--text-tertiary)]" />
          </div>
        )}

        {/* Gradient */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 50%)' }} />

        {/* Live badges */}
        {isLive && (
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-white"
              style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)', boxShadow: '0 0 10px rgba(240,54,90,0.5)' }}>
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
            </span>
            <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
              <Users size={12} /> {c.current_viewers.toLocaleString()} spectateurs
            </span>
          </div>
        )}

        {/* Boosted badge */}
        {c.is_featured && (
          <div className="absolute top-4 right-4">
            <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-yellow-300"
              style={{ background: 'rgba(245,158,11,0.25)', border: '1px solid rgba(245,158,11,0.4)', backdropFilter: 'blur(4px)' }}>
              <Zap size={11} /> Boosté
            </span>
          </div>
        )}
      </div>

      {/* Main info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — infos */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-start gap-4">
            <Avatar src={c.artist?.avatar_url} name={c.artist?.display_name ?? c.artist?.username} size="lg" />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] leading-tight">{c.title}</h1>
              <p className="text-[var(--text-secondary)] mt-0.5">{c.artist?.display_name ?? c.artist?.username}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {c.genre && (
                  <span className="text-xs bg-brand-primary/15 text-brand-primary px-2.5 py-0.5 rounded-full">{c.genre}</span>
                )}
                <span className={`text-xs px-2.5 py-0.5 rounded-full ${
                  c.access_type === 'free'
                    ? 'bg-green-400/15 text-green-400'
                    : c.access_type === 'ticket'
                    ? 'bg-orange-400/15 text-orange-400'
                    : 'bg-brand-primary/15 text-brand-primary'
                }`}>
                  {c.access_type === 'free' ? 'Gratuit' : c.access_type === 'ticket' ? 'Ticket' : 'Abonnement'}
                </span>
              </div>
            </div>
          </div>

          {c.description && (
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{c.description}</p>
          )}

          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            {c.scheduled_at && (
              <div className="flex items-center gap-2">
                <Clock size={15} className="shrink-0" />
                {format(new Date(c.scheduled_at), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
              </div>
            )}
            {c.venue_city && (
              <div className="flex items-center gap-2">
                <MapPin size={15} className="shrink-0" />
                {c.venue_name ? `${c.venue_name}, ` : ''}{c.venue_city}{c.venue_country ? `, ${c.venue_country}` : ''}
              </div>
            )}
            {c.duration_min && (
              <div className="flex items-center gap-2">
                <Clock size={15} className="shrink-0" />
                {c.duration_min} minutes
              </div>
            )}
            {c.view_count > 0 && (
              <div className="flex items-center gap-2">
                <Users size={15} className="shrink-0" />
                {c.view_count.toLocaleString()} vues
              </div>
            )}
          </div>
        </div>

        {/* Right — CTA card */}
        <div className="card p-5 space-y-4 self-start">

          {/* Prix */}
          <div>
            <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wide">Accès</p>
            <p className="font-bold text-2xl text-[var(--text-primary)] mt-1">
              {c.access_type === 'free'         ? 'Gratuit'
               : c.access_type === 'ticket'     ? `${c.ticket_price != null ? c.ticket_price.toLocaleString() + ' FCFA' : '?'}`
               : c.access_type === 'subscription' ? 'Abonnement'
               : 'PPV'}
            </p>
          </div>

          {/* CTA principal */}
          {isLive ? (
            <button onClick={() => navigate(`/live/${c.id}`)}
              className="btn-primary w-full flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)' }}>
              <Radio size={16} /> Regarder en direct
            </button>
          ) : isEnded && c.video_url ? (
            <button onClick={() => navigate(`/live/${c.id}`)}
              className="btn-primary w-full flex items-center justify-center gap-2">
              <Play size={16} fill="white" /> Voir le replay
            </button>
          ) : isEnded ? (
            <div className="text-center text-sm text-[var(--text-tertiary)] py-2">Ce concert est terminé.</div>
          ) : c.access_type === 'ticket' ? (
            <button onClick={handleBuyTicket} disabled={buying}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {buying ? <Spinner size="sm" /> : <Ticket size={16} />}
              {buying ? 'Traitement...' : 'Acheter un ticket'}
            </button>
          ) : (
            <div className="text-center text-sm text-[var(--text-secondary)] py-2">
              Le concert n'a pas encore commencé.
            </div>
          )}

          {/* Actions artiste */}
          {isArtist && (
            <div className="pt-3 border-t border-[var(--border)] space-y-2">
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Ton concert</p>

              {!isLive && !isEnded && (
                <button onClick={handleStart} disabled={starting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)', color: '#fff' }}>
                  {starting ? <Spinner size="sm" /> : <Radio size={15} />}
                  {starting ? 'Démarrage...' : 'Démarrer le live'}
                </button>
              )}

              {isLive && (
                <button onClick={handleStop} disabled={stopping}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border border-red-400/40 text-red-400 hover:bg-red-400/10 transition-all">
                  {stopping ? <Spinner size="sm" /> : <StopCircle size={15} />}
                  {stopping ? 'Arrêt...' : 'Arrêter le live'}
                </button>
              )}

              <button onClick={() => setShowBoost(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10 transition-all">
                <Zap size={15} /> Booster ce concert
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Boost modal */}
      {showBoost && (
        <BoostModal
          concert={c}
          onClose={() => setShowBoost(false)}
          onDone={refetch}
        />
      )}
    </div>
  );
}
