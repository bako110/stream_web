import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { encodeId, decodeId } from '../../utils/slugId';
import { Radio, MapPin, Clock, Users, Ticket, Play, Zap, StopCircle, Bell, BellOff, ArrowLeft, Bookmark, Edit3, Repeat2, Heart, MessageCircle, Share2 } from 'lucide-react';
import type { Concert, StreamToken } from '../../types';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { GuestPreview } from '../../components/ui/GuestPreview';
import { DetailBackHeader } from '../../components/ui/DetailBackHeader';
import { useSmartBack } from '../../hooks/useSmartBack';
import { useApi } from '../../hooks/useApi';
import { Avatar, VerifiedBadge } from '../../components/ui/Avatar';
import { Spinner, PageLoader } from '../../components/ui/Spinner';
import { RichText } from '../../components/ui/RichText';
import { TicketPaymentModal, type TicketTier } from '../../components/ui/TicketPaymentModal';
import { useRepost } from '../../components/ui/RepostModal';
import { Lightbox } from '../../components/ui/Lightbox';
import { ShareModal } from '../../components/ui/ShareModal';
import { CommentsModal } from './EventDetailPage';
import { AiAnalysisStatusModal } from '../../components/ui/AiAnalysisStatusModal';
import { PriceWithLocal } from '../../components/ui/PriceWithLocal';
import { useConfirm } from '../../components/ui/Dialog';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { extractApiErrorMessage } from '../../utils/apiError';
import { CUSTOM_REACH_CONFIG, computeCustomGoGold } from '../wallet/boost/BoostCatalog';

/* ── Shared tokens (évite la répétition) ───────────────────────────────────── */
const CARD: React.CSSProperties  = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 };
const ICON_BOX = (bg: string): React.CSSProperties => ({
  width: 32, height: 32, borderRadius: 10, background: bg,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
});

/* ── Boost modal ───────────────────────────────────────────────────────────── */
function BoostModal({ concert, onClose, onDone }: { concert: Concert; onClose: () => void; onDone: () => void }) {
  const [days,    setDays]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  // Reach personnalisé fixé au preset le plus bas du catalogue concert_reach —
  // cette modale ne propose qu'un choix de durée, pas de portée (contrairement
  // à WalletBoostPage où l'utilisateur ajuste les deux) ; le prix suit quand
  // même la vraie grille tarifaire (computeCustomGoGold), plus le format
  // custom_reach/custom_duration attendu par le backend pour boost_option_id
  // 'concert_reach' avec tier_id 'custom'.
  const REACH = CUSTOM_REACH_CONFIG.concert_reach.presets[0];
  const gogold = computeCustomGoGold('concert_reach', REACH, days);

  async function handleBoost() {
    setLoading(true); setError(null);
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
      onDone(); onClose();
    } catch (e: any) { setError(extractApiErrorMessage(e, 'Erreur lors du boost')); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div style={{ ...CARD, padding: 24, maxWidth: 360, width: '100%' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <p className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Zap size={16} style={{ color: '#fbbf24' }} /> Booster le concert
          </p>
          <button onClick={onClose} className="p-1 rounded-lg text-sm" style={{ color: 'var(--text-tertiary)' }}>✕</button>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{concert.title}</span>{' '}
          sera mis en avant dans les recommandations.
        </p>
        {/* Duration picker */}
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>Durée du boost</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
          {[1, 3, 7].map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{
                padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: `1.5px solid ${days === d ? '#7B3FF2' : 'var(--border)'}`,
                background: days === d ? 'rgba(123,63,242,0.1)' : 'transparent',
                color: days === d ? '#7B3FF2' : 'var(--text-secondary)',
              }}>
              {d}j
            </button>
          ))}
        </div>
        {/* Total */}
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl mb-4"
          style={{ background: 'var(--bg-secondary)' }}>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total</span>
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            {gogold.toLocaleString()} GoGold
          </span>
        </div>
        {error && <p className="text-xs mb-3" style={{ color: '#ef4444' }}>{error}</p>}
        <button onClick={handleBoost} disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
          {loading ? <Spinner size="sm" /> : <Zap size={14} />}
          {loading ? 'Traitement...' : 'Confirmer le boost'}
        </button>
      </div>
    </div>
  );
}

/* ── Mini concert card ─────────────────────────────────────────────────────── */
function MiniConcertCard({ c }: { c: Concert }) {
  const navigate = useNavigate();
  const thumb = c.thumbnail_url ?? c.banner_url;
  return (
    <button onClick={() => navigate(`/concerts/${encodeId(c.id)}`)}
      className="flex gap-3 p-3 rounded-xl w-full text-left transition-colors hover:bg-[var(--bg-secondary)]">
      <div className="shrink-0 rounded-xl overflow-hidden" style={{ width: 56, height: 56, background: 'var(--bg-secondary)' }}>
        {thumb
          ? <img src={thumb} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center">
              <Radio size={18} style={{ color: 'var(--primary)' }} />
            </div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug line-clamp-2"
          style={{ color: 'var(--text-primary)' }}>{c.title}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {format(new Date(c.scheduled_at), 'd MMM yyyy', { locale: fr })}
        </p>
        {c.status === 'live' && (
          <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
            style={{ background: '#EF4444' }}>LIVE</span>
        )}
      </div>
    </button>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────────── */
export default function ConcertDetailPage() {
  const { id: slug } = useParams<{ id: string }>();
  const id            = decodeId(slug!);
  const navigate      = useNavigate();
  const goBack        = useSmartBack('/concerts');
  const { user } = useAuthStore();
  const { confirm, ConfirmDialog } = useConfirm();

  const { data: concert, loading, refetch } = useApi<Concert>(
    () => apiClient.get<Concert>(Endpoints.concerts.byId(id!)), [id],
  );

  const repost = useRepost();
  const [starting,      setStarting]     = useState(false);
  const [stopping,      setStopping]     = useState(false);
  const [showBoost,     setShowBoost]    = useState(false);
  const [paySheet,      setPaySheet]     = useState(false);
  const [selectedTier,  setSelectedTier] = useState<TicketTier['key']>('simple');
  const [reminder,      setReminder]     = useState(false);
  const [remindLoading, setRemindLoading]= useState(false);
  const [otherConcerts, setOtherConcerts]= useState<Concert[]>([]);
  const [lightbox,      setLightbox]     = useState(false);
  const [showAiModal,   setShowAiModal]  = useState(false);
  const [favId,         setFavId]        = useState<string | null>(null);
  const [savingFav,     setSavingFav]    = useState(false);
  const [liked,         setLiked]        = useState(false);
  const [likeCount,     setLikeCount]    = useState(0);
  const [shareCount,    setShareCount]   = useState(0);
  const [showComments,  setShowComments] = useState(false);
  const [showShare,     setShowShare]    = useState(false);

  // Reactions et partages (connecte uniquement) — meme pattern que la page evenement
  useEffect(() => {
    if (!id || !user) return;
    setLiked(false); setLikeCount(0); setShareCount(0);
    apiClient.get<any>(`${Endpoints.social.reactionCounts}?concert_id=${id}`)
      .then(r => setLikeCount(r.data?.likes ?? r.data?.like ?? 0)).catch(() => {});
    apiClient.get<any>(`${Endpoints.social.myReaction}?concert_id=${id}`)
      .then(r => setLiked(r.data?.reaction_type === 'like')).catch(() => {});
    apiClient.get<any>(`${Endpoints.social.shareCounts}?concert_id=${id}`)
      .then(r => setShareCount(r.data?.shares ?? 0)).catch(() => {});
  }, [id, user]);

  const toggleLike = useCallback(async () => {
    let prevLiked = false;
    setLiked(v => { prevLiked = v; return !v; });
    setLikeCount(v => prevLiked ? Math.max(0, v - 1) : v + 1);
    try {
      await apiClient.post(Endpoints.social.toggleReaction, { concert_id: id, reaction_type: 'like' });
    } catch {
      setLiked(prevLiked);
      setLikeCount(v => prevLiked ? v + 1 : Math.max(0, v - 1));
    }
  }, [id]);

  useEffect(() => {
    if (!id || !concert || !user || concert.artist_id === user.id) return;
    apiClient.get<any>(Endpoints.concerts.remind(id))
      .then(r => setReminder(r.data?.active === true))
      .catch(() => {});
  }, [id, concert, user]);

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

  async function handleSaveFav() {
    if (savingFav || !concert) return;
    setSavingFav(true);
    try {
      if (favId) {
        await apiClient.delete(Endpoints.favorites.remove('concert', concert.id));
        setFavId(null);
      } else {
        const res = await apiClient.post<{ id: string }>(Endpoints.favorites.add, {
          target_type: 'concert',
          target_id: concert.id,
          target_title: concert.title,
          target_subtitle: concert.venue_city || concert.description || undefined,
          target_thumbnail: concert.thumbnail_url ?? concert.banner_url ?? undefined,
        });
        setFavId((res.data as any)?.id ?? (res.data as any)?.favorite?.id ?? null);
      }
    } catch {}
    finally { setSavingFav(false); }
  }

  const toggleReminder = useCallback(async () => {
    if (!id || remindLoading) return;
    setRemindLoading(true);
    try {
      const r = await apiClient.post<any>(Endpoints.concerts.remind(id));
      setReminder(r.data?.active === true);
      import('react-hot-toast').then(({ default: toast }) =>
        toast.success(r.data?.active ? 'Rappel activé !' : 'Rappel désactivé'));
    } catch {}
    finally { setRemindLoading(false); }
  }, [id, remindLoading]);

  const handleBuyTicket = useCallback(async () => {
    if (!concert) return;
    // Repost — celui qui a republié n'est pas l'artiste original et ne peut
    // pas vendre de billets dessus (demande explicite : renvoyer vers le
    // vrai artiste). Même pattern côté mobile, ConcertDetailScreen.
    if (concert.remix_type === 'repost' && concert.source_concert?.artist) {
      const original = concert.source_concert.artist;
      const name = original.display_name ?? original.username ?? 'l\'artiste original';
      const ok = await confirm({
        title: 'Billets non disponibles ici',
        message: `Ceci est une republication. Pour acheter un billet, rends-toi sur le profil de ${name}, l'artiste original de ce concert.`,
        confirmLabel: 'Voir le profil',
        cancelLabel: 'Fermer',
      });
      if (ok) navigate(`/user/${encodeId(original.id)}`);
      return;
    }
    setPaySheet(true);
  }, [concert, confirm, navigate]);

  if (loading) return <PageLoader />;
  if (!concert) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Concert introuvable.</p>
    </div>
  );

  if (!user) {
    return (
      <GuestPreview
        type="concert"
        thumbnail={concert.thumbnail_url ?? concert.banner_url ?? null}
        title={concert.title}
        body={(concert as any).description}
        author={(concert as any).artist ?? (concert as any).author}
        date={concert.scheduled_at}
        location={[concert.venue_name, concert.venue_city, concert.venue_country].filter(Boolean).join(', ') || undefined}
        attendees={(concert as any).attendees_count}
        ticketPrice={concert.ticket_price}
        isLive={concert.status === 'live'}
      />
    );
  }

  const c        = concert;
  const isLive   = c.status === 'live';
  const isEnded  = c.status === 'ended';
  const isArtist = !!(user && c.artist_id === user.id);

  async function handleStart() {
    if (!id) return; setStarting(true);
    try { await apiClient.post<StreamToken>(Endpoints.streaming.start(id)); await refetch(); navigate(`/live/${encodeId(id)}`); }
    catch {} finally { setStarting(false); }
  }
  async function handleStop() {
    if (!id) return; setStopping(true);
    try { await apiClient.post(Endpoints.streaming.stop(id)); await refetch(); }
    catch {} finally { setStopping(false); }
  }

  const allTiers = ([
    { key: 'simple' as const, label: 'Simple', color: '#7B3FF2', price: c.ticket_price ?? 0,       sub: 'Accès standard' },
    { key: 'vip'    as const, label: 'VIP',    color: '#7B3FF2', price: c.ticket_price_vip ?? 0,   sub: 'Accès prioritaire' },
    { key: 'vvip'   as const, label: 'VVIP',   color: '#7B3FF2', price: c.ticket_price_vvip ?? 0,  sub: 'Expérience premium' },
    { key: 'vvvip'  as const, label: 'VVVIP',  color: '#EF4444', price: c.ticket_price_vvvip ?? 0, sub: 'All-inclusive' },
  ] as TicketTier[]).filter(t => t.price > 0);

  const activeTierColor = allTiers.find(t => t.key === selectedTier)?.color ?? '#7B3FF2';
  const safeTiers = allTiers.length > 0
    ? allTiers
    : [{ key: 'simple' as const, label: 'Simple', color: '#7B3FF2', price: c.ticket_price ?? 0, sub: 'Accès standard' }];

  return (
    <div className="dt-v2 min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="w-full mx-auto px-4 py-8">

        <DetailBackHeader onBack={goBack} />

        {/* ── Banner ── */}
        <div className="dt-hero relative rounded-2xl overflow-hidden mb-6"
          style={{ aspectRatio: '21/8', minHeight: 160, background: 'var(--bg-secondary)' }}>
          {c.banner_url || c.thumbnail_url
            ? <>
                <img src={c.banner_url ?? c.thumbnail_url ?? ''} alt="" aria-hidden="true" className="dt-hero-bg" />
                <img src={c.banner_url ?? c.thumbnail_url ?? ''} className="dt-hero-img w-full h-full object-contain cursor-zoom-in" alt={c.title}
                  onClick={() => setLightbox(true)} />
              </>
            : <div className="w-full h-full flex items-center justify-center">
                <Radio size={48} style={{ color: 'var(--text-tertiary)', opacity: 0.3 }} />
              </div>}
          <div className="dt-hero-scrim absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 55%)' }} />
          {/* Live badge */}
          {isLive && (
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full text-white"
                style={{ background: '#EF4444' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
              <span className="flex items-center gap-1 text-xs text-white px-2 py-1 rounded-full"
                style={{ background: 'rgba(0,0,0,0.55)' }}>
                <Users size={11} /> {c.current_viewers.toLocaleString()}
              </span>
            </div>
          )}
          {/* Boosted badge */}
          {c.is_featured && !isLive && (
            <span className="absolute top-4 right-4 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(0,0,0,0.5)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)' }}>
              <Zap size={11} /> Boosté
            </span>
          )}
          {/* Title */}
          <div className="dt-hero-title absolute bottom-0 left-0 right-0 px-5 pb-5 pointer-events-none">
            <h1 className="text-2xl font-black text-white leading-tight"
              style={{ textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>
              {c.title}
            </h1>
            {c.artist && (
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {c.artist.display_name ?? c.artist.username}
              </p>
            )}
          </div>
        </div>

        {/* ── Grid 2 colonnes ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6 items-start">

          {/* ═══ Colonne gauche ═══ */}
          <div className="flex flex-col gap-4">

            {/* Barre d'actions — meme pilule en verre que les posts, juste sous le visuel */}
            <div className="flex items-center gap-0.5 px-4 py-2.5 rounded-full"
              style={{
                background: 'var(--glass-strong-bg)', backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid var(--glass-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              }}>
              {(() => {
                const ib = 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-[var(--bg-secondary)]';
                const commentCount = Number((c as any).comment_count ?? 0);
                return (<>
                  <button onClick={toggleLike} title="J'aime" className={ib}
                    style={{ color: liked ? '#f03e3e' : 'var(--text-secondary)', background: liked ? 'rgba(240,62,62,0.08)' : undefined }}>
                    <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
                    {likeCount > 0 && <span>{likeCount}</span>}
                  </button>
                  <button onClick={() => setShowComments(true)} title="Commenter" className={ib} style={{ color: 'var(--text-secondary)' }}>
                    <MessageCircle size={16} />
                    {commentCount > 0 && <span>{commentCount}</span>}
                  </button>
                  <button onClick={() => setShowShare(true)} title="Partager" className={ib} style={{ color: 'var(--text-secondary)' }}>
                    <Share2 size={16} />
                    {shareCount > 0 && <span>{shareCount}</span>}
                  </button>
                  {!isArtist && (
                    <button onClick={() => repost.open('concert', {
                        endpoint: Endpoints.concerts.repost(c.id), author: c.artist,
                        title: c.title, thumb: c.thumbnail_url ?? c.banner_url,
                      })}
                      title="Republier" className={ib} style={{ color: 'var(--text-secondary)' }}>
                      <Repeat2 size={16} />
                    </button>
                  )}
                  {!isArtist && !isEnded && (
                    <button onClick={toggleReminder} disabled={remindLoading} title={reminder ? 'Rappel actif' : 'Me rappeler'} className={ib}
                      style={{ color: reminder ? 'var(--primary)' : 'var(--text-secondary)' }}>
                      {remindLoading ? <Spinner size="sm" /> : reminder ? <BellOff size={16} /> : <Bell size={16} />}
                    </button>
                  )}
                  <button onClick={handleSaveFav} disabled={savingFav} title={favId ? 'Sauvegardé' : 'Sauvegarder'} className={`${ib} ml-auto`}
                    style={{ color: favId ? 'var(--primary)' : 'var(--text-secondary)', opacity: savingFav ? 0.6 : 1 }}>
                    <Bookmark size={16} fill={favId ? 'var(--primary)' : 'none'} />
                  </button>
                </>);
              })()}
            </div>

            {/* Card artiste + badges */}
            <div style={{ ...CARD, padding: 20, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <button onClick={() => c.artist?.id && navigate(`/user/${encodeId(c.artist.id)}`)}>
                <Avatar src={c.artist?.avatar_url}
                  name={c.artist?.display_name ?? c.artist?.username}
                  size="lg" verified={c.artist?.is_verified} />
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {c.title}
                </p>
                <button onClick={() => c.artist?.id && navigate(`/user/${encodeId(c.artist.id)}`)}
                  className="flex items-center gap-1.5 text-sm mt-0.5 hover:underline text-left"
                  style={{ color: 'var(--text-secondary)' }}>
                  {c.artist?.display_name ?? c.artist?.username}
                  {c.artist?.is_verified && <VerifiedBadge size={13} />}
                </button>
                {isArtist && c.ai_analysis_status === 'pending' && (
                  <button onClick={() => setShowAiModal(true)} className="flex items-center gap-1.5 mt-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-full border-2 animate-spin"
                      style={{ borderColor: 'var(--text-tertiary)', borderTopColor: 'transparent' }} />
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Vérification en cours…</span>
                  </button>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {c.genre && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                      style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)' }}>
                      {c.genre}
                    </span>
                  )}
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                    style={{
                      background: c.access_type === 'free'
                        ? 'rgba(34,197,94,0.1)'
                        : c.access_type === 'ticket'
                        ? 'rgba(249,115,22,0.1)'
                        : 'rgba(123,63,242,0.1)',
                      color: c.access_type === 'free' ? '#22c55e'
                        : c.access_type === 'ticket' ? '#f97316'
                        : 'var(--primary)',
                    }}>
                    {c.access_type === 'free' ? 'Gratuit'
                      : c.access_type === 'ticket' ? 'Ticket'
                      : 'Abonnement'}
                  </span>
                </div>
              </div>
            </div>

            {/* Informations pratiques */}
            <div style={{ ...CARD, padding: 20 }}>
              <p className="font-bold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
                Informations
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {c.scheduled_at && (
                  <div className="flex items-center gap-3">
                    <div style={ICON_BOX('rgba(123,63,242,0.1)')}>
                      <Clock size={14} style={{ color: 'var(--primary)' }} />
                    </div>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {format(new Date(c.scheduled_at), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                    </span>
                  </div>
                )}
                {c.venue_city && (
                  <div className="flex items-center gap-3">
                    <div style={ICON_BOX('rgba(239,68,68,0.1)')}>
                      <MapPin size={14} style={{ color: '#ef4444' }} />
                    </div>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {[c.venue_name, c.venue_city, c.venue_country].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                {c.duration_min != null && (
                  <div className="flex items-center gap-3">
                    <div style={ICON_BOX('rgba(123,63,242,0.1)')}>
                      <Clock size={14} style={{ color: 'var(--primary)' }} />
                    </div>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {c.duration_min} minutes
                    </span>
                  </div>
                )}
                {c.view_count > 0 && (
                  <div className="flex items-center gap-3">
                    <div style={ICON_BOX('rgba(123,63,242,0.1)')}>
                      <Users size={14} style={{ color: 'var(--primary)' }} />
                    </div>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {c.view_count.toLocaleString()} vues
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {c.description && (
              <div style={{ ...CARD, padding: 20 }}>
                <p className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>À propos</p>
                <RichText text={c.description} limit={400}
                  style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }} />
              </div>
            )}
          </div>

          {/* ═══ Colonne droite ═══ */}
          <div className="flex flex-col gap-4">

            {/* Card artiste */}
            {c.artist && (
              <div style={{ ...CARD, padding: 20, textAlign: 'center' }}>
                <button onClick={() => c.artist?.id && navigate(`/user/${encodeId(c.artist.id)}`)}
                  className="flex flex-col items-center gap-3 w-full">
                  <Avatar src={c.artist.avatar_url}
                    name={c.artist.display_name ?? c.artist.username ?? '?'}
                    size="xl" verified={c.artist.is_verified} />
                  <div>
                    <div className="flex items-center justify-center gap-1.5">
                      <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {c.artist.display_name ?? c.artist.username}
                      </p>
                      {c.artist.is_verified && <VerifiedBadge size={14} />}
                    </div>
                  </div>
                </button>
                <button onClick={() => c.artist?.id && navigate(`/user/${encodeId(c.artist.id)}`)}
                  className="w-full mt-4 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'var(--primary)' }}>
                  Voir le profil
                </button>
              </div>
            )}

            {/* CTA card */}
            <div style={{ ...CARD, padding: 20 }}>
              {/* Prix */}
              <div className="mb-4">
                <p className="text-xs font-medium uppercase tracking-wide mb-1"
                  style={{ color: 'var(--text-tertiary)' }}>Accès</p>
                <p className="font-black text-xl" style={{ color: 'var(--text-primary)' }}>
                  {c.access_type === 'free'         ? 'Gratuit'
                   : c.access_type === 'ticket'     ? (c.ticket_price != null ? <>À partir de <PriceWithLocal amountEur={c.ticket_price} /></> : 'À partir de ?')
                   : c.access_type === 'subscription'? 'Abonnement'
                   : 'PPV'}
                </p>
              </div>

              {/* Sélecteur tiers */}
              {(c.access_type === 'ticket' || c.access_type === 'ppv') && allTiers.length > 1 && !isLive && !isEnded && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {allTiers.map(tier => (
                    <button key={tier.key} onClick={() => setSelectedTier(tier.key)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      style={{
                        background: selectedTier === tier.key ? `${tier.color}18` : 'var(--bg-secondary)',
                        border: `1.5px solid ${selectedTier === tier.key ? tier.color : 'var(--border)'}`,
                        color: selectedTier === tier.key ? tier.color : 'var(--text-secondary)',
                      }}>
                      {tier.label} · <PriceWithLocal amountEur={tier.price} />
                    </button>
                  ))}
                </div>
              )}

              {/* CTA principal */}
              {isLive ? (
                <button onClick={() => navigate(`/live/${encodeId(c.id)}`)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white mb-3 transition-transform active:scale-[0.98]"
                  style={{ background: '#EF4444', boxShadow: '0 6px 18px rgba(239,68,68,0.35)' }}>
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Regarder en direct
                </button>
              ) : isEnded && (c.video_url || c.replay_url) ? (
                <button onClick={() => navigate(`/live/${encodeId(c.id)}`)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white mb-3"
                  style={{ background: 'var(--primary)' }}>
                  <Play size={15} fill="white" /> Voir le replay
                </button>
              ) : isEnded ? (
                <p className="text-center text-sm py-3 mb-3" style={{ color: 'var(--text-tertiary)' }}>
                  {/* Enregistrement en cours de traitement — le replay
                      apparaîtra automatiquement une fois prêt (webhook
                      EgressEnded, quelques minutes après la fin du live). */}
                  Ce concert est terminé. Le replay sera bientôt disponible.
                </p>
              ) : c.access_type === 'ticket' || c.access_type === 'ppv' ? (
                <button onClick={handleBuyTicket}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white mb-3"
                  style={{ background: activeTierColor }}>
                  <Ticket size={15} /> Acheter un billet
                </button>
              ) : c.access_type === 'free' ? (
                <button onClick={handleBuyTicket}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white mb-3"
                  style={{ background: '#10B981' }}>
                  <Ticket size={15} /> Réserver ma place
                </button>
              ) : c.access_type === 'subscription' ? (
                <button onClick={() => navigate('/wallet/subscription/plans')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white mb-3"
                  style={{ background: activeTierColor }}>
                  <Ticket size={15} /> Voir les abonnements
                </button>
              ) : (
                <p className="text-center text-sm py-3 mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Le concert n'a pas encore commencé.
                </p>
              )}

              {/* Actions artiste */}
              {isArtist && (
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text-tertiary)' }}>Ton concert</p>
                  {!isEnded && (
                    <button onClick={() => navigate(`/create/concert?edit=${id}`)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                      <Edit3 size={14} /> Modifier
                    </button>
                  )}
                  {!isLive && !isEnded && (
                    <button onClick={handleStart} disabled={starting}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                      style={{ background: '#7B3FF2' }}>
                      {starting ? <Spinner size="sm" /> : <Radio size={14} />}
                      {starting ? 'Démarrage...' : 'Démarrer le live'}
                    </button>
                  )}
                  {isLive && (
                    <button onClick={handleStop} disabled={stopping}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                      style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.35)', background: 'transparent' }}>
                      {stopping ? <Spinner size="sm" /> : <StopCircle size={14} />}
                      {stopping ? 'Arrêt...' : 'Arrêter le live'}
                    </button>
                  )}
                  <button onClick={() => setShowBoost(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)', background: 'transparent' }}>
                    <Zap size={14} /> Booster ce concert
                  </button>
                </div>
              )}
            </div>

            {/* Autres concerts */}
            {otherConcerts.length > 0 && (
              <div style={{ ...CARD, overflow: 'hidden' }}>
                <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
                  <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                    Autres concerts
                  </p>
                </div>
                <div className="p-2">
                  {otherConcerts.map(cc => <MiniConcertCard key={cc.id} c={cc} />)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showBoost && <BoostModal concert={c} onClose={() => setShowBoost(false)} onDone={refetch} />}

      {lightbox && (c.banner_url || c.thumbnail_url) && (
        <Lightbox
          urls={[c.banner_url ?? c.thumbnail_url!]}
          index={0}
          onClose={() => setLightbox(false)}
        />
      )}

      <TicketPaymentModal
        open={paySheet}
        onClose={() => setPaySheet(false)}
        onSuccess={() => { setPaySheet(false); if (c.access_type !== 'free') navigate(`/live/${encodeId(c.id)}`); }}
        itemId={c.id} title={c.title} thumbnail={c.thumbnail_url}
        kind="concert" accessType={c.access_type as any}
        tiers={safeTiers} selectedTierKey={selectedTier}
        onBuy={tierKey => apiClient.post(Endpoints.concerts.buyTicket(c.id), tierKey ? { tier: tierKey } : undefined).then(r => r.data)}
      />

      <AiAnalysisStatusModal
        open={showAiModal}
        onClose={() => setShowAiModal(false)}
        contentType="concert"
        contentId={c.id}
        initialStatus={c.ai_analysis_status}
      />

      {repost.modal}
      {ConfirmDialog}
      {showComments && <CommentsModal targetId={id!} targetKey="concert_id" onClose={() => setShowComments(false)} />}
      <ShareModal
        open={showShare}
        onClose={() => setShowShare(false)}
        url={`${window.location.origin}/concerts/${encodeId(id!)}`}
        title={c.title ?? 'Concert Gofolyx'}
        desc={c.venue_city ?? undefined}
        image={c.banner_url ?? c.thumbnail_url ?? undefined}
        targetType="concert"
        targetId={id!}
        onShared={() => setShareCount(n => n + 1)}
      />
    </div>
  );
}
