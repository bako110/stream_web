import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decodeId, encodeId } from '../../utils/slugId';
import {
  Play, Crown, Lock, Coins as GoGold, Check, AlertTriangle, X, Wallet,
} from 'lucide-react';
import type { Content, VideoMeta } from '../../types';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { Spinner, PageLoader } from '../../components/ui/Spinner';
import { VideoPlayer } from '../../components/ui/VideoPlayer';
import { GuestPreview } from '../../components/ui/GuestPreview';
import { DetailBackHeader } from '../../components/ui/DetailBackHeader';
import { useSmartBack } from '../../hooks/useSmartBack';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { extractApiErrorMessage } from '../../utils/apiError';
import { usePlaybackPrefs } from '../../hooks/usePlaybackPrefs';
import { ShareModal } from '../../components/ui/ShareModal';
import { createPortal } from 'react-dom';
import { MediaBackdrop, AccessBadge, MediaTitleBlock, MediaSynopsis, MediaFacts, PremiumCta } from '../../components/detail/MediaDetailParts';

// ── Conversion GoGold : 1 EUR = 100 GoGold ─────────────────────────────────────
const GOGOLD_PER_EUR = 100;
const eurToGoGold = (eur: number) => Math.ceil(eur * GOGOLD_PER_EUR);

// ── Paywall modal ─────────────────────────────────────────────────────────────

function PaywallModal({ film, onClose, onPurchased }: {
  film: Content; onClose: () => void; onPurchased: () => void;
}) {
  const navigate          = useNavigate();
  const goGoldRequired     = eurToGoGold(film.price ?? 0);
  const [balance, setBalance] = useState<number | null>(null);
  const [buying,  setBuying]  = useState(false);

  useEffect(() => {
    apiClient.get<any>(Endpoints.wallet.balance)
      .then(r => setBalance(r.data?.gogold_balance ?? r.data?.balance ?? r.data?.gogold ?? 0))
      .catch(() => setBalance(0));
  }, []);

  const sufficient = balance !== null && balance >= goGoldRequired;

  async function handleBuy() {
    setBuying(true);
    try {
      await apiClient.post(Endpoints.content.filmPurchase(film.id));
      toast.success('Accès accordé !');
      onPurchased();
      onClose();
    } catch (e: any) {
      toast.error(extractApiErrorMessage(e, 'Achat impossible. Réessayez.'));
    } finally { setBuying(false); }
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-[300]" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[310] rounded-3xl overflow-hidden max-w-sm mx-auto"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>

        {/* Header gradient */}
        <div className="relative p-6 text-center"
          style={{ background: 'linear-gradient(135deg,#1a0533,#2d0f5e)' }}>
          <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
            <X size={14} />
          </button>
          <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
            <Lock size={28} color="white" />
          </div>
          <p className="text-white font-black text-lg">Contenu Premium</p>
          <p className="text-white/60 text-xs mt-1">{film.title}</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Prix */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <GoGold size={18} style={{ color: 'var(--primary)' }} />
              <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>GoGold requis</span>
            </div>
            <span className="font-black text-lg" style={{ color: 'var(--primary)' }}>
              {goGoldRequired.toLocaleString('fr-FR')}
            </span>
          </div>

          {/* Balance */}
          {balance !== null && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Votre solde</span>
              <span className="text-sm font-bold" style={{ color: sufficient ? '#22C55E' : '#EF4444' }}>
                {balance.toLocaleString('fr-FR')} GoGold
              </span>
            </div>
          )}

          {/* Alerte solde insuffisant */}
          {balance !== null && !sufficient && (
            <div className="flex items-center gap-2 p-3 rounded-xl"
              style={{ background: '#EF444410', border: '1px solid #EF444430' }}>
              <AlertTriangle size={15} style={{ color: '#EF4444', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold" style={{ color: '#EF4444' }}>
                  Solde insuffisant — il vous manque {(goGoldRequired - balance).toLocaleString('fr-FR')} GoGold
                </p>
              </div>
            </div>
          )}

          {/* Prix EUR info */}
          {film.price && (
            <p className="text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Accès à vie · {film.price.toFixed(2)} € · 1 € = {GOGOLD_PER_EUR} GoGold
            </p>
          )}

          {/* Boutons */}
          <button onClick={handleBuy}
            disabled={buying || !sufficient}
            className="w-full py-3.5 rounded-xl font-black text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 6px 20px rgba(123,63,242,0.4)' }}>
            {buying ? <Spinner size="sm" /> : <><Check size={16} /> Acheter l'accès</>}
          </button>

          {!sufficient && (
            <button onClick={() => navigate('/wallet/buy')}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)', border: '1px solid rgba(123,63,242,0.3)' }}>
              <Wallet size={15} /> Recharger le wallet
            </button>
          )}

          <button onClick={() => navigate('/wallet/subscription/plans')}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            <Crown size={15} /> Voir les abonnements Premium
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}

// ── Player avec tracking progress (toutes les 15s comme le mobile) ─────────────

function VideoPlayerWithTracking({ url, poster, videoId, contentId }: {
  url: string; poster?: string; videoId?: string; contentId?: string;
}) {
  const { autoplay } = usePlaybackPrefs();
  const lastSent  = useRef<number>(0);
  const lastTime  = useRef<number>(0);
  const lastTotal = useRef<number>(0);

  const sendProgress = useCallback((currentTime: number, total: number) => {
    if (!videoId) return;
    const current = Math.floor(currentTime);
    if (current === lastSent.current || current < 1) return;
    lastSent.current = current;
    const params = new URLSearchParams({
      progress_sec: String(current),
      total_seconds: String(Math.floor(total)),
      ...(contentId ? { content_id: contentId, content_type: 'film' } : {}),
    });
    apiClient.post(`${Endpoints.streaming.progress(videoId)}?${params}`).catch(() => {});
  }, [videoId, contentId]);

  // Tick toutes les 15s
  useEffect(() => {
    const tick = setInterval(() => {
      sendProgress(lastTime.current, lastTotal.current);
    }, 15_000);
    return () => {
      clearInterval(tick);
      sendProgress(lastTime.current, lastTotal.current);
    };
  }, [sendProgress]);

  const handleTimeUpdate = useCallback((ct: number, dur: number) => {
    lastTime.current  = ct;
    lastTotal.current = dur;
  }, []);

  const handlePause = useCallback(() => {
    sendProgress(lastTime.current, lastTotal.current);
  }, [sendProgress]);

  return (
    <div className="w-full aspect-video rounded-2xl overflow-hidden" style={{ background: '#000' }}>
      <VideoPlayer
        url={url}
        poster={poster}
        autoPlay={autoplay}
        className="w-full h-full"
        onTimeUpdate={handleTimeUpdate}
        onPause={handlePause}
      />
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function FilmDetailPage() {
  const { id: slug } = useParams<{ id: string }>();
  const id            = decodeId(slug!);
  const goBack        = useSmartBack('/films');
  const { user }      = useAuthStore();

  const [playingVideo,    setPlayingVideo]    = useState<VideoMeta | null>(null);
  const [hasAccess,       setHasAccess]       = useState<boolean | null>(null);
  const [hasActiveSub,    setHasActiveSub]    = useState(false);
  const [showPaywall,     setShowPaywall]      = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const film   = useApi<Content>(() => apiClient.get<Content>(Endpoints.content.filmById(id!)), [id]);
  const videos = useApi<VideoMeta[]>(() => apiClient.get<VideoMeta[]>(Endpoints.videos.byContent(id!)), [id]);

  // Vérifie l'accès exactement comme le mobile : /content/films/{id}/access
  useEffect(() => {
    if (!id || !film.data) return;
    if (!film.data.is_premium) { setHasAccess(true); return; }

    // Vérifier abonnement actif
    apiClient.get<any>(Endpoints.subscriptions.me)
      .then(r => {
        const sub = r.data?.data ?? r.data;
        if (sub?.status === 'active') { setHasActiveSub(true); setHasAccess(true); return; }
        // Sinon vérifier accès individuel
        return apiClient.get<any>(Endpoints.content.filmAccess(id))
          .then(ar => setHasAccess(ar.data?.has_access === true))
          .catch(() => setHasAccess(false));
      })
      .catch(() => {
        // Pas d'abo, vérifie accès direct
        apiClient.get<any>(Endpoints.content.filmAccess(id))
          .then(ar => setHasAccess(ar.data?.has_access === true))
          .catch(() => setHasAccess(false));
      });
  }, [id, film.data]);

  if (film.loading) return <PageLoader />;
  if (!film.data)   return <div className="p-6" style={{ color: 'var(--text-secondary)' }}>Contenu introuvable.</div>;

  if (!user) {
    return (
      <GuestPreview
        type="film"
        thumbnail={film.data.banner_url ?? film.data.thumbnail_url ?? null}
        title={film.data.title}
        body={film.data.short_synopsis ?? film.data.synopsis ?? null}
      />
    );
  }

  const f            = film.data;
  const isPremium    = !!f.is_premium;
  const accessOk     = !isPremium || hasAccess === true;
  const loadingAccess = isPremium && hasAccess === null;

  // Vidéo par défaut — cherche d'abord HLS, sinon toute URL disponible
  const rawVideos = videos.data ?? [];
  const defaultVideo = rawVideos.find(v => v.is_default && v.hls_url)
    ?? rawVideos.find(v => v.hls_url)
    ?? rawVideos[0];

  // Résout l'URL de lecture : HLS > hls qualité > video_url direct > trailer
  function resolveUrl(v?: VideoMeta): string | null {
    if (!v) {
      // Pas de video MongoDB → fallback sur les champs directs du content
      return (f as any).video_url ?? (f as any).trailer_url ?? null;
    }
    return v.hls_url
      ?? v.hls_1080p_url ?? v.hls_720p_url ?? v.hls_480p_url
      ?? null;
  }

  function handlePlay(v?: VideoMeta) {
    if (!accessOk) { setShowPaywall(true); return; }
    const target = v ?? defaultVideo;
    const url = resolveUrl(target);
    if (!url) { toast.error('Vidéo non encore disponible.'); return; }
    setPlayingVideo(target
      ? { ...target, hls_url: url }
      : { id: f.id, hls_url: url, is_default: true, label: f.title, is_free: !f.is_premium } as VideoMeta,
    );
  }


  const poster = f.thumbnail_url ?? f.banner_url ?? null;
  const goldLabel = f.price ? `${eurToGoGold(f.price).toLocaleString('fr-FR')} GoGold` : 'Contenu premium';

  return (
    <div className="relative">
      <MediaBackdrop image={f.banner_url ?? f.thumbnail_url} />

      <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 pb-8 pt-2">
        <DetailBackHeader onBack={goBack} />

        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 mt-3">
          {/* ── Colonne principale ── */}
          <div className="space-y-5 min-w-0">
            {/* Player ou bannière */}
            {playingVideo ? (
              <VideoPlayerWithTracking
                url={playingVideo.hls_url!}
                poster={f.thumbnail_url ?? undefined}
                videoId={playingVideo.id}
                contentId={f.id}
              />
            ) : (
              <div className="relative aspect-video overflow-hidden cursor-pointer group"
                style={{ borderRadius: '1.75rem', background: 'var(--bg-tertiary)', boxShadow: '0 24px 60px -20px rgba(0,0,0,0.45)' }}
                onClick={() => handlePlay()}>
                {(f.banner_url || f.thumbnail_url) ? (
                  <img src={f.banner_url ?? f.thumbnail_url ?? ''} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={f.title} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Play size={48} style={{ color: 'var(--text-tertiary)' }} /></div>
                )}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.1) 55%)' }} />
                <div className="absolute top-3 left-3">
                  <AccessBadge isPremium={isPremium} hasAccess={hasAccess} hasActiveSub={hasActiveSub} price={f.price} />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {loadingAccess ? <Spinner size="lg" /> : !accessOk ? (
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(123,63,242,0.92)' }}>
                        <Lock size={26} color="white" />
                      </div>
                      <p className="text-white text-sm font-bold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{goldLabel}</p>
                    </div>
                  ) : (
                    <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                      style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(10px)', border: '2px solid rgba(255,255,255,0.5)' }}>
                      <Play size={32} fill="white" color="white" style={{ marginLeft: 4 }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            <MediaTitleBlock
              title={f.title}
              originalTitle={f.original_title}
              rating={f.average_rating}
              onShare={() => setShowShareModal(true)}
              chips={[f.year > 0 && String(f.year), f.rating, f.country, f.language && f.language.toUpperCase()]}
            />

            {/* Actions */}
            <div className="flex flex-wrap gap-2.5">
              <button onClick={() => handlePlay()}
                className="flex-1 min-w-[180px] py-3.5 rounded-full font-black text-white text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
                style={{ background: accessOk ? 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' : 'linear-gradient(135deg,#7B3FF2,#EC4899)', boxShadow: '0 12px 28px -8px rgba(123,63,242,0.65)' }}>
                {accessOk
                  ? <><Play size={17} fill="currentColor" /> {playingVideo ? 'Reprendre la lecture' : 'Regarder le film'}</>
                  : <><Lock size={16} /> Débloquer · {goldLabel}</>}
              </button>
              {f.trailer_url && (
                <button onClick={() => document.getElementById('film-trailer')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  className="h-[52px] px-5 rounded-full font-bold text-sm flex items-center gap-2"
                  style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }}>
                  <Play size={15} /> Bande-annonce
                </button>
              )}
            </div>

            {isPremium && !hasAccess && hasAccess !== null && (
              <PremiumCta title="Accès à vie" subtitle={f.price ? `${goldLabel} · ${f.price.toFixed(2)} €` : 'Contenu premium'} onClick={() => setShowPaywall(true)} />
            )}

            <MediaSynopsis text={f.synopsis} />

            {/* Qualités */}
            {videos.data && videos.data.length > 1 && (
              <section>
                <h2 className="text-[11px] font-black uppercase mb-2.5 px-1" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.12em' }}>
                  {accessOk ? 'Qualité de lecture' : 'Qualités disponibles'}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {videos.data.map(v => {
                    const isPlaying = playingVideo?.id === v.id;
                    const canPlay   = accessOk && !!v.hls_url;
                    return (
                      <button key={v.id} onClick={() => canPlay ? handlePlay(v) : setShowPaywall(true)}
                        className="flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-bold transition-all"
                        style={{
                          border: `1.5px solid ${isPlaying ? 'var(--primary)' : 'var(--border)'}`,
                          background: isPlaying ? 'rgba(123,63,242,0.12)' : 'var(--surface)',
                          color: isPlaying ? 'var(--primary)' : 'var(--text-secondary)',
                          opacity: canPlay ? 1 : 0.6,
                        }}>
                        {!accessOk && <Lock size={11} />}
                        {isPlaying && <Play size={11} fill="currentColor" />}
                        {v.label ?? (v as any).quality_label ?? 'HD'}
                        {v.is_free && <span className="text-[10px] font-bold" style={{ color: '#22C55E' }}>gratuit</span>}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Trailer */}
            {f.trailer_url && (
              <section id="film-trailer">
                <h2 className="text-[11px] font-black uppercase mb-2.5 px-1" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.12em' }}>Bande-annonce</h2>
                <div className="aspect-video overflow-hidden" style={{ background: '#000', borderRadius: '1.5rem' }}>
                  <video src={f.trailer_url} controls playsInline className="w-full h-full" />
                </div>
              </section>
            )}
          </div>

          {/* ── Colonne latérale : affiche + fiche technique ── */}
          <aside className="space-y-5 lg:sticky lg:top-4 self-start">
            {poster && (
              <div className="hidden lg:block overflow-hidden" style={{ borderRadius: '1.75rem', aspectRatio: '2 / 3', boxShadow: '0 24px 60px -20px rgba(0,0,0,0.5)' }}>
                <img src={poster} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <MediaFacts director={f.director} country={f.country} language={f.language} classification={f.rating} year={f.year > 0 ? f.year : null} views={f.view_count} />
          </aside>
        </div>
      </div>

      {/* ── Paywall modal ── */}
      {showPaywall && f && (
        <PaywallModal
          film={f}
          onClose={() => setShowPaywall(false)}
          onPurchased={() => setHasAccess(true)}
        />
      )}

      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={`${window.location.origin}/films/${encodeId(f.id)}`}
        title={`${f.title} — Gofolyx`}
        image={f.banner_url ?? f.thumbnail_url ?? undefined}
        targetType="content"
        targetId={f.id}
      />
    </div>
  );
}
