import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decodeId, encodeId } from '../../utils/slugId';
import {
  Play, Star, Crown, ChevronDown, ChevronUp, Lock, Coins as GoGold,
  Check, AlertTriangle, X, Wallet, Share2,
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
import { ShareModal } from '../../components/ui/ShareModal';

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

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 rounded-3xl overflow-hidden max-w-sm mx-auto"
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
    </>
  );
}

// ── Player avec tracking progress (toutes les 15s comme le mobile) ─────────────

function VideoPlayerWithTracking({ url, poster, videoId, contentId }: {
  url: string; poster?: string; videoId?: string; contentId?: string;
}) {
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
        autoPlay
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
  const navigate      = useNavigate();
  const goBack        = useSmartBack('/films');
  const { user }      = useAuthStore();

  const [playingVideo,    setPlayingVideo]    = useState<VideoMeta | null>(null);
  const [expandSynopsis,  setExpandSynopsis]  = useState(false);
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

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    setShowShareModal(true);
  }

  return (
    <div className="w-full mx-auto px-4 sm:px-6 pb-4 sm:pb-6 pt-2 space-y-6">

      <DetailBackHeader onBack={goBack} />

      {/* ── Player ou bannière ── */}
      {playingVideo ? (
        <VideoPlayerWithTracking
          url={playingVideo.hls_url!}
          poster={f.thumbnail_url ?? undefined}
          videoId={playingVideo.id}
          contentId={f.id}
        />
      ) : (
        <div className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer group"
          style={{ background: 'var(--bg-tertiary)' }}
          onClick={() => handlePlay()}>
          {(f.banner_url || f.thumbnail_url) ? (
            <img src={f.banner_url ?? f.thumbnail_url ?? ''} className="w-full h-full object-cover" alt={f.title} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play size={48} style={{ color: 'var(--text-tertiary)' }} />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-all group-hover:bg-black/55">
            {loadingAccess ? (
              <Spinner size="lg" />
            ) : !accessOk ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(123,63,242,0.9)', backdropFilter: 'blur(8px)' }}>
                  <Lock size={28} color="white" />
                </div>
                <p className="text-white text-sm font-bold"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                  {f.price ? `${eurToGoGold(f.price).toLocaleString('fr-FR')} GoGold` : 'Contenu Premium'}
                </p>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '2px solid rgba(255,255,255,0.4)' }}>
                <Play size={32} fill="white" color="white" />
              </div>
            )}
          </div>

          {/* Badge premium ou accès */}
          {isPremium && (
            <div className="absolute top-3 right-3">
              {hasAccess ? (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white"
                  style={{ background: 'rgba(34,197,94,0.85)', backdropFilter: 'blur(4px)' }}>
                  <Check size={11} /> Accès
                </div>
              ) : hasActiveSub ? (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white"
                  style={{ background: 'rgba(123,63,242,0.85)', backdropFilter: 'blur(4px)' }}>
                  <Crown size={11} /> Abonné
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
                  <Crown size={11} /> Premium · {f.price ? `${f.price.toFixed(2)} €` : ''}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Infos ── */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{f.title}</h1>
            {f.original_title && f.original_title !== f.title && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{f.original_title}</p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {f.average_rating && (
              <div className="flex items-center gap-1 text-yellow-400">
                <Star size={18} fill="currentColor" />
                <span className="font-black text-lg">{f.average_rating.toFixed(1)}</span>
              </div>
            )}
            <button onClick={handleShare}
              className="p-2 rounded-full transition-colors"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              aria-label="Partager">
              <Share2 size={17} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {f.year > 0 && <span className="px-3 py-1 rounded-full" style={{ background: 'var(--bg-secondary)' }}>{f.year}</span>}
          {f.language && <span className="px-3 py-1 rounded-full uppercase" style={{ background: 'var(--bg-secondary)' }}>{f.language}</span>}
          {f.country  && <span className="px-3 py-1 rounded-full" style={{ background: 'var(--bg-secondary)' }}>{f.country}</span>}
          {f.rating   && <span className="px-3 py-1 rounded-full" style={{ background: 'var(--bg-secondary)' }}>{f.rating}</span>}
          {f.view_count > 0 && <span className="px-3 py-1 rounded-full" style={{ background: 'var(--bg-secondary)' }}>{f.view_count.toLocaleString()} vues</span>}
        </div>

        {f.director && (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Réalisateur :</span> {f.director}
          </p>
        )}

        {f.synopsis && (
          <div>
            <p className={`text-sm leading-relaxed ${!expandSynopsis ? 'line-clamp-3' : ''}`}
              style={{ color: 'var(--text-secondary)' }}>{f.synopsis}</p>
            <button onClick={() => setExpandSynopsis(v => !v)}
              className="text-sm flex items-center gap-1 mt-1" style={{ color: 'var(--primary)' }}>
              {expandSynopsis ? <><ChevronUp size={14} /> Moins</> : <><ChevronDown size={14} /> Lire plus</>}
            </button>
          </div>
        )}

        {/* ── Qualités disponibles ── */}
        {videos.data && videos.data.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              {accessOk ? 'Choisir la qualité' : 'Qualités disponibles'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {videos.data.map(v => {
                const isPlaying = playingVideo?.id === v.id;
                const canPlay   = accessOk && !!v.hls_url;
                return (
                  <button key={v.id}
                    onClick={() => canPlay ? handlePlay(v) : setShowPaywall(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all"
                    style={{
                      borderColor: isPlaying ? 'var(--primary)' : 'var(--border)',
                      background:  isPlaying ? 'rgba(123,63,242,0.12)' : 'var(--surface)',
                      color:       isPlaying ? 'var(--primary)' : 'var(--text-secondary)',
                      cursor:      canPlay ? 'pointer' : 'not-allowed',
                      opacity:     canPlay ? 1 : 0.6,
                    }}>
                    {!accessOk && <Lock size={11} />}
                    {isPlaying && <Play size={11} fill="currentColor" />}
                    {v.label ?? (v as any).quality_label ?? 'HD'}
                    {v.is_free && <span className="text-[10px] font-bold" style={{ color: '#22C55E' }}>(gratuit)</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CTA Achat si premium non acheté ── */}
        {isPremium && !hasAccess && hasAccess !== null && (
          <div className="p-4 rounded-2xl flex items-center justify-between gap-4"
            style={{ background: 'linear-gradient(135deg,rgba(123,63,242,0.08),rgba(123,63,242,0.05))', border: '1px solid rgba(123,63,242,0.3)' }}>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Accès à vie</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                {f.price ? `${eurToGoGold(f.price).toLocaleString('fr-FR')} GoGold · ${f.price.toFixed(2)} €` : 'Contenu premium'}
              </p>
            </div>
            <button onClick={() => setShowPaywall(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-white text-sm shrink-0"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
              <Lock size={14} /> Débloquer
            </button>
          </div>
        )}

        {/* ── Trailer ── */}
        {f.trailer_url && (
          <div>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Bande-annonce</h3>
            <div className="aspect-video rounded-xl overflow-hidden" style={{ background: '#000' }}>
              <video src={f.trailer_url} controls className="w-full h-full" />
            </div>
          </div>
        )}
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
        title={`${f.title} — GoFolyX`}
        image={f.banner_url ?? f.thumbnail_url ?? undefined}
        targetType="content"
        targetId={f.id}
      />
    </div>
  );
}
