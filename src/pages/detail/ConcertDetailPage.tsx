import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { encodeId, decodeId } from '../../utils/slugId';
import { Radio, MapPin, Clock, Users, Ticket, Play, Zap, StopCircle, Bell, BellOff, ArrowLeft } from 'lucide-react';
import type { Concert, StreamToken } from '../../types';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner, PageLoader } from '../../components/ui/Spinner';
import { RichText } from '../../components/ui/RichText';
import { TicketPaymentModal, type TicketTier } from '../../components/ui/TicketPaymentModal';
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
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
          {loading ? <Spinner size="sm" /> : <Zap size={15} />}
          {loading ? 'Traitement...' : 'Confirmer le boost'}
        </button>
      </div>
    </div>
  );
}

// ── Mini concert card (colonne droite) ────────────────────────────────────────
function MiniConcertCard({ c }: { c: Concert }) {
  const navigate = useNavigate();
  const thumb = c.thumbnail_url ?? c.banner_url;
  return (
    <button
      onClick={() => navigate(`/concerts/${encodeId(c.id)}`)}
      className="flex gap-3 p-3 rounded-2xl w-full text-left transition-all"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
      {thumb ? (
        <div className="shrink-0 rounded-xl overflow-hidden" style={{ width: 64, height: 64 }}>
          <img src={thumb} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="shrink-0 rounded-xl flex items-center justify-center" style={{ width: 64, height: 64, background: 'rgba(123,63,242,0.1)' }}>
          <Radio size={20} style={{ color: 'var(--primary)' }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>{c.title}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {format(new Date(c.scheduled_at), 'd MMM yyyy', { locale: fr })}
        </p>
        {c.status === 'live' && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block text-white"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>LIVE</span>
        )}
      </div>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConcertDetailPage() {
  const { id: slug } = useParams<{ id: string }>();
  const id            = decodeId(slug!);
  const navigate      = useNavigate();
  const { user } = useAuthStore();

  const { data: concert, loading, refetch } = useApi<Concert>(
    () => apiClient.get<Concert>(Endpoints.concerts.byId(id!)), [id],
  );

  const [starting,     setStarting]     = useState(false);
  const [stopping,     setStopping]     = useState(false);
  const [showBoost,    setShowBoost]    = useState(false);
  const [paySheet,     setPaySheet]     = useState(false);
  const [selectedTier, setSelectedTier] = useState<TicketTier['key']>('simple');
  const [reminder,     setReminder]     = useState(false);
  const [remindLoading,setRemindLoading]= useState(false);
  const [otherConcerts,setOtherConcerts]= useState<Concert[]>([]);

  // Charge l'état rappel (seulement si non-artiste)
  useEffect(() => {
    if (!id || !concert || !user) return;
    if (concert.artist_id === user.id) return;
    apiClient.get<any>(Endpoints.concerts.remind(id))
      .then(r => setReminder(r.data?.active === true))
      .catch(() => {});
  }, [id, concert, user]);

  // Charger autres concerts de l'artiste
  useEffect(() => {
    if (!concert?.artist_id) return;
    apiClient.get<any>(Endpoints.concerts.byUser(concert.artist_id))
      .then(res => {
        const raw = res.data;
        const all = Array.isArray(raw) ? raw : raw?.items ?? raw?.data ?? [];
        setOtherConcerts(all.filter((cc: Concert) => cc.id !== id).slice(0, 5));
      })
      .catch(() => {});
  }, [concert?.artist_id, id]);

  const toggleReminder = useCallback(async () => {
    if (!id || remindLoading) return;
    setRemindLoading(true);
    try {
      const r = await apiClient.post<any>(Endpoints.concerts.remind(id));
      setReminder(r.data?.active === true);
      import('react-hot-toast').then(({ default: toast }) => {
        toast.success(r.data?.active ? 'Rappel activé !' : 'Rappel désactivé');
      });
    } catch { }
    finally { setRemindLoading(false); }
  }, [id, remindLoading]);

  if (loading) return <PageLoader />;
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
      navigate(`/live/${encodeId(id)}`);
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

  const allTiers = ([
    { key: 'simple' as const, label: 'Simple', color: '#7B3FF2', price: c.ticket_price ?? 0,       sub: 'Accès standard' },
    { key: 'vip'    as const, label: 'VIP',    color: '#7B3FF2', price: c.ticket_price_vip ?? 0,   sub: 'Accès prioritaire' },
    { key: 'vvip'   as const, label: 'VVIP',   color: '#7B3FF2', price: c.ticket_price_vvip ?? 0,  sub: 'Expérience premium' },
    { key: 'vvvip'  as const, label: 'VVVIP',  color: '#EF4444', price: c.ticket_price_vvvip ?? 0, sub: 'All-inclusive' },
  ] as TicketTier[]).filter(t => t.price > 0);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Back */}
        <button onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 mb-6 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ color: 'var(--text-secondary)', background: 'var(--surface)', border: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <ArrowLeft size={15} /> Retour
        </button>

        {/* Banner pleine largeur */}
        <div className="relative rounded-2xl overflow-hidden mb-6" style={{ aspectRatio: '21/8', background: 'var(--bg-tertiary)', minHeight: 160 }}>
          {c.banner_url || c.thumbnail_url ? (
            <img src={c.banner_url ?? c.thumbnail_url ?? ''} className="w-full h-full object-cover" alt={c.title} />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,var(--bg-secondary),var(--bg-tertiary))' }}>
              <Radio size={48} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
            </div>
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 55%)' }} />

          {isLive && (
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-white"
                style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 0 10px rgba(123,63,242,0.5)' }}>
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
              </span>
              <span className="text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                <Users size={12} /> {c.current_viewers.toLocaleString()} spectateurs
              </span>
            </div>
          )}
          {c.is_featured && (
            <div className="absolute top-4 right-4">
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-yellow-300"
                style={{ background: 'rgba(123,63,242,0.25)', border: '1px solid rgba(123,63,242,0.4)', backdropFilter: 'blur(4px)' }}>
                <Zap size={11} /> Boosté
              </span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h1 className="text-2xl font-black text-white leading-tight" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
              {c.title}
            </h1>
            {c.artist && (
              <p className="text-white/70 text-sm mt-1">{c.artist.display_name ?? c.artist.username}</p>
            )}
          </div>
        </div>

        {/* Layout 2 colonnes */}
        <div className="grid gap-6" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)' }}>

          {/* ── Colonne gauche : infos détaillées ── */}
          <div className="flex flex-col gap-5">

            {/* Header artiste + badges */}
            <div className="rounded-2xl p-5 flex items-start gap-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <button onClick={() => c.artist?.id && navigate(`/user/${encodeId(c.artist.id)}`)}>
                <Avatar src={c.artist?.avatar_url} name={c.artist?.display_name ?? c.artist?.username} size="lg" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-black text-lg leading-tight" style={{ color: 'var(--text-primary)' }}>{c.title}</p>
                <button onClick={() => c.artist?.id && navigate(`/user/${encodeId(c.artist.id)}`)}
                  className="text-sm font-semibold mt-0.5 text-left" style={{ color: 'var(--text-secondary)' }}>
                  {c.artist?.display_name ?? c.artist?.username}
                </button>
                <div className="flex flex-wrap gap-2 mt-2">
                  {c.genre && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                      style={{ background: 'rgba(123,63,242,0.12)', color: 'var(--primary)' }}>{c.genre}</span>
                  )}
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                    style={{
                      background: c.access_type === 'free' ? 'rgba(34,197,94,0.12)' : c.access_type === 'ticket' ? 'rgba(251,146,60,0.12)' : 'rgba(123,63,242,0.12)',
                      color: c.access_type === 'free' ? '#22c55e' : c.access_type === 'ticket' ? '#f97316' : 'var(--primary)',
                    }}>
                    {c.access_type === 'free' ? 'Gratuit' : c.access_type === 'ticket' ? 'Ticket' : 'Abonnement'}
                  </span>
                </div>
              </div>
            </div>

            {/* Infos pratiques */}
            <div className="rounded-2xl p-5 space-y-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>Informations</h3>
              {c.scheduled_at && (
                <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(123,63,242,0.1)' }}>
                    <Clock size={15} style={{ color: 'var(--primary)' }} />
                  </div>
                  <span>{format(new Date(c.scheduled_at), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}</span>
                </div>
              )}
              {c.venue_city && (
                <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.1)' }}>
                    <MapPin size={15} style={{ color: '#ef4444' }} />
                  </div>
                  <span>{c.venue_name ? `${c.venue_name}, ` : ''}{c.venue_city}{c.venue_country ? `, ${c.venue_country}` : ''}</span>
                </div>
              )}
              {c.duration_min != null && (
                <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(123,63,242,0.1)' }}>
                    <Clock size={15} style={{ color: 'var(--primary)' }} />
                  </div>
                  <span>{c.duration_min} minutes</span>
                </div>
              )}
              {c.view_count > 0 && (
                <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(123,63,242,0.1)' }}>
                    <Users size={15} style={{ color: 'var(--primary)' }} />
                  </div>
                  <span>{c.view_count.toLocaleString()} vues</span>
                </div>
              )}
            </div>

            {/* Description */}
            {c.description && (
              <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <h3 className="font-black text-sm mb-3" style={{ color: 'var(--text-primary)' }}>À propos</h3>
                <RichText text={c.description} limit={400} style={{ color: 'var(--text-secondary)', fontSize: 14 }} />
              </div>
            )}
          </div>

          {/* ── Colonne droite : artiste + CTA + autres concerts ── */}
          <div className="flex flex-col gap-4">

            {/* Artiste card */}
            {c.artist && (
              <div className="rounded-2xl p-5 flex flex-col items-center gap-3 text-center"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <button onClick={() => c.artist?.id && navigate(`/user/${encodeId(c.artist.id)}`)}>
                  <Avatar src={c.artist.avatar_url} name={c.artist.display_name ?? c.artist.username ?? '?'} size="xl" verified={c.artist.is_verified} />
                </button>
                <div>
                  <p className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
                    {c.artist.display_name ?? c.artist.username}
                  </p>
                </div>
                <button onClick={() => c.artist?.id && navigate(`/user/${encodeId(c.artist.id)}`)}
                  className="btn-primary w-full text-sm" style={{ paddingTop: '0.6rem', paddingBottom: '0.6rem' }}>
                  Voir le profil
                </button>
              </div>
            )}

            {/* CTA card */}
            <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Accès</p>
                <p className="font-black text-2xl mt-1" style={{ color: 'var(--text-primary)' }}>
                  {c.access_type === 'free' ? 'Gratuit'
                   : c.access_type === 'ticket' ? `À partir de ${c.ticket_price != null ? c.ticket_price + ' €' : '?'}`
                   : c.access_type === 'subscription' ? 'Abonnement'
                   : 'PPV'}
                </p>
              </div>

              {(c.access_type === 'ticket' || c.access_type === 'ppv') && allTiers.length > 1 && !isLive && !isEnded && (
                <div className="flex flex-wrap gap-2">
                  {allTiers.map(tier => (
                    <button key={tier.key} onClick={() => setSelectedTier(tier.key)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: selectedTier === tier.key ? tier.color + '18' : 'var(--bg-secondary)',
                        border: `1.5px solid ${selectedTier === tier.key ? tier.color : 'var(--border)'}`,
                        color: selectedTier === tier.key ? tier.color : 'var(--text-secondary)',
                      }}>
                      {tier.label} — {tier.price}€
                    </button>
                  ))}
                </div>
              )}

              {isLive ? (
                <button onClick={() => navigate(`/live/${encodeId(c.id)}`)}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
                  <Radio size={16} /> Regarder en direct
                </button>
              ) : isEnded && c.video_url ? (
                <button onClick={() => navigate(`/live/${encodeId(c.id)}`)}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  <Play size={16} fill="white" /> Voir le replay
                </button>
              ) : isEnded ? (
                <div className="text-center text-sm py-2" style={{ color: 'var(--text-tertiary)' }}>Ce concert est terminé.</div>
              ) : (c.access_type === 'ticket' || c.access_type === 'ppv') ? (
                <button onClick={() => setPaySheet(true)}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg,${allTiers.find(t => t.key === selectedTier)?.color ?? '#7B3FF2'},${allTiers.find(t => t.key === selectedTier)?.color ?? '#7B3FF2'}BB)` }}>
                  <Ticket size={16} /> Acheter un billet
                </button>
              ) : c.access_type === 'free' ? (
                <button onClick={() => setPaySheet(true)}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>
                  <Ticket size={16} /> Je réserve ma place !
                </button>
              ) : (
                <div className="text-center text-sm py-2" style={{ color: 'var(--text-secondary)' }}>
                  Le concert n'a pas encore commencé.
                </div>
              )}

              {!isArtist && !isEnded && (
                <button onClick={toggleReminder} disabled={remindLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: reminder ? 'rgba(123,63,242,0.12)' : 'var(--bg-secondary)',
                    color: reminder ? '#7B3FF2' : 'var(--text-secondary)',
                    border: `1px solid ${reminder ? '#7B3FF240' : 'var(--border)'}`,
                  }}>
                  {remindLoading ? <Spinner size="sm" /> : reminder ? <BellOff size={15} /> : <Bell size={15} />}
                  {reminder ? 'Rappel actif — désactiver' : 'Me rappeler'}
                </button>
              )}

              {isArtist && (
                <div className="pt-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Ton concert</p>
                  {!isLive && !isEnded && (
                    <button onClick={handleStart} disabled={starting}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', color: '#fff' }}>
                      {starting ? <Spinner size="sm" /> : <Radio size={15} />}
                      {starting ? 'Démarrage...' : 'Démarrer le live'}
                    </button>
                  )}
                  {isLive && (
                    <button onClick={handleStop} disabled={stopping}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {stopping ? <Spinner size="sm" /> : <StopCircle size={15} />}
                      {stopping ? 'Arrêt...' : 'Arrêter le live'}
                    </button>
                  )}
                  <button onClick={() => setShowBoost(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{ color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(251,191,36,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <Zap size={15} /> Booster ce concert
                  </button>
                </div>
              )}
            </div>

            {/* Autres concerts de l'artiste */}
            {otherConcerts.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
                  <h3 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
                    Autres concerts
                  </h3>
                </div>
                <div className="p-3 flex flex-col gap-2">
                  {otherConcerts.map(cc => <MiniConcertCard key={cc.id} c={cc} />)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showBoost && (
        <BoostModal concert={c} onClose={() => setShowBoost(false)} onDone={refetch} />
      )}

      <TicketPaymentModal
        open={paySheet}
        onClose={() => setPaySheet(false)}
        onSuccess={() => {
          setPaySheet(false);
          if (c.access_type === 'free') return;
          navigate(`/live/${encodeId(c.id)}`);
        }}
        itemId={c.id}
        title={c.title}
        thumbnail={c.thumbnail_url}
        kind="concert"
        accessType={c.access_type as any}
        tiers={allTiers.length > 0 ? allTiers : [{ key: 'simple', label: 'Simple', color: '#7B3FF2', price: c.ticket_price ?? 0, sub: 'Accès standard' }]}
        selectedTierKey={selectedTier}
        onBuy={(tierKey) => apiClient.post(Endpoints.concerts.buyTicket(c.id), tierKey ? { tier: tierKey } : undefined).then(r => r.data)}
      />
    </div>
  );
}
