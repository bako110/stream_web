import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { decodeId, encodeId } from '../../utils/slugId';
import {
  Play, Crown, Lock, Film, Clock, Coins as GoGold, Check, AlertTriangle, X, Wallet,
} from 'lucide-react';
import type { Content, Season, Episode, VideoMeta } from '../../types';
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

// 1 EUR = 100 GoGold (taux unifié plateforme)
const GOGOLD_PER_EUR = 100;
const eurToGoGold = (eur: number) => Math.ceil(eur * GOGOLD_PER_EUR);

function toArray<T>(raw: unknown): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  const obj = raw as Record<string, unknown>;
  for (const key of ['items', 'results', 'data', 'seasons', 'episodes']) {
    if (Array.isArray(obj[key])) return obj[key] as T[];
  }
  return [];
}

function fmt(sec: number | null): string | null {
  if (!sec) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m} min`;
}

// ── Paywall modal (series) ────────────────────────────────────────────────────

function PaywallModal({ serie, onClose, onPurchased }: {
  serie: Content; onClose: () => void; onPurchased: () => void;
}) {
  const navigate      = useNavigate();
  const goGoldRequired = eurToGoGold(serie.price ?? 0);
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
      await apiClient.post(Endpoints.content.seriePurchase(serie.id));
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
          <p className="text-white/60 text-xs mt-1">{serie.title}</p>
        </div>

        <div className="p-5 space-y-4">
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

          {balance !== null && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Votre solde</span>
              <span className="text-sm font-bold" style={{ color: sufficient ? '#22C55E' : '#EF4444' }}>
                {balance.toLocaleString('fr-FR')} GoGold
              </span>
            </div>
          )}

          {balance !== null && !sufficient && (
            <div className="flex items-center gap-2 p-3 rounded-xl"
              style={{ background: '#EF444410', border: '1px solid #EF444430' }}>
              <AlertTriangle size={15} style={{ color: '#EF4444', flexShrink: 0 }} />
              <p className="text-xs font-semibold" style={{ color: '#EF4444' }}>
                Solde insuffisant — il vous manque {(goGoldRequired - balance).toLocaleString('fr-FR')} GoGold
              </p>
            </div>
          )}

          {serie.price && (
            <p className="text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Accès à toute la série · {serie.price.toFixed(2)} € · 1 € = {GOGOLD_PER_EUR} GoGold
            </p>
          )}

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

// ── Player avec tracking progress ────────────────────────────────────────────

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
      ...(contentId ? { content_id: contentId, content_type: 'serie' } : {}),
    });
    apiClient.post(`${Endpoints.streaming.progress(videoId)}?${params}`).catch(() => {});
  }, [videoId, contentId]);

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

export default function SerieDetailPage() {
  const { id: slug } = useParams<{ id: string }>();
  const id            = decodeId(slug!);
  const goBack        = useSmartBack('/series');
  const location      = useLocation();
  const { user }      = useAuthStore();

  const stateItem = (location.state as { item?: Content } | null)?.item ?? null;

  // Access control
  const [hasAccess,    setHasAccess]    = useState<boolean | null>(null);
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [showPaywall,  setShowPaywall]  = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Seasons / episodes
  const [seasons,        setSeasons]        = useState<Season[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [episodes,       setEpisodes]       = useState<Episode[]>([]);
  const [epLoading,      setEpLoading]      = useState(false);

  // Playing episode
  const [playingEp,    setPlayingEp]    = useState<Episode | null>(null);
  const [playingVideo, setPlayingVideo] = useState<VideoMeta | null>(null);
  const [epVidLoading, setEpVidLoading] = useState(false);


  const serie = useApi<Content>(
    () => stateItem
      ? Promise.resolve({ data: stateItem } as any)
      : apiClient.get<Content>(Endpoints.content.serieById(id!)),
    [id]
  );

  // Access check (same logic as mobile)
  useEffect(() => {
    if (!id || !serie.data) return;
    if (!serie.data.is_premium) { setHasAccess(true); return; }

    apiClient.get<any>(Endpoints.subscriptions.me)
      .then(r => {
        const sub = r.data?.data ?? r.data;
        if (sub?.status === 'active') { setHasActiveSub(true); setHasAccess(true); return; }
        return apiClient.get<any>(Endpoints.content.serieAccess(id))
          .then(ar => setHasAccess(ar.data?.has_access === true))
          .catch(() => setHasAccess(false));
      })
      .catch(() => {
        apiClient.get<any>(Endpoints.content.serieAccess(id))
          .then(ar => setHasAccess(ar.data?.has_access === true))
          .catch(() => setHasAccess(false));
      });
  }, [id, serie.data]);

  // Load seasons
  useEffect(() => {
    if (!id) return;
    setSeasonsLoading(true);
    apiClient.get<unknown>(Endpoints.seasons.bySerie(id))
      .then(raw => {
        const s = toArray<Season>(raw);
        setSeasons(s);
        if (s.length > 0) setSelectedSeason(s[0].number);
        setSeasonsLoading(false);
      })
      .catch(() => setSeasonsLoading(false));
  }, [id]);

  // Load episodes on season change
  const loadEpisodes = useCallback((seasonNumber: number) => {
    if (!id) return;
    setEpLoading(true);
    apiClient.get<unknown>(Endpoints.episodes.bySeason(id, seasonNumber))
      .then(raw => { setEpisodes(toArray<Episode>(raw)); setEpLoading(false); })
      .catch(() => { setEpisodes([]); setEpLoading(false); });
  }, [id]);

  useEffect(() => {
    if (selectedSeason !== null) loadEpisodes(selectedSeason);
  }, [selectedSeason, loadEpisodes]);

  // Fetch HLS url for an episode, then play
  function handlePlayEpisode(ep: Episode, isLocked: boolean) {
    if (isLocked) { setShowPaywall(true); return; }
    setEpVidLoading(true);
    setPlayingEp(ep);
    apiClient.get<any>(Endpoints.videos.byEpisode(ep.id))
      .then(r => {
        // r.data peut être un tableau ou un objet enveloppé
        const list: VideoMeta[] = toArray<VideoMeta>(r.data);
        const vid = list.find(v => v.is_default) ?? list[0];

        if (vid?.hls_url) {
          // Vidéo MongoDB avec HLS transcodé
          setPlayingVideo(vid);
        } else if (vid?.hls_480p_url ?? vid?.hls_720p_url ?? vid?.hls_1080p_url) {
          // HLS qualité spécifique disponible
          setPlayingVideo({
            ...vid,
            hls_url: vid.hls_1080p_url ?? vid.hls_720p_url ?? vid.hls_480p_url ?? null,
          });
        } else if ((ep as any).video_url) {
          // Fallback : video_url direct stocké sur l'épisode PostgreSQL
          setPlayingVideo({
            id: ep.id,
            hls_url: (ep as any).video_url,
            is_default: true,
            label: ep.title,
            is_free: ep.is_free,
          } as VideoMeta);
        } else {
          toast.error('Vidéo non encore disponible pour cet épisode.');
        }
      })
      .catch(() => {
        // Même en cas d'erreur API, tenter le fallback video_url
        if ((ep as any).video_url) {
          setPlayingVideo({
            id: ep.id,
            hls_url: (ep as any).video_url,
            is_default: true,
            label: ep.title,
            is_free: ep.is_free,
          } as VideoMeta);
        } else {
          toast.error('Impossible de charger la vidéo.');
        }
      })
      .finally(() => setEpVidLoading(false));
  }

  if (serie.loading) return <PageLoader />;
  if (!serie.data)   return <div className="p-6" style={{ color: 'var(--text-secondary)' }}>Série introuvable.</div>;

  if (!user) {
    return (
      <GuestPreview
        type="serie"
        thumbnail={serie.data.banner_url ?? serie.data.thumbnail_url ?? null}
        title={serie.data.title}
        body={serie.data.short_synopsis ?? serie.data.synopsis ?? null}
      />
    );
  }

  const s            = serie.data;
  const isPremium    = !!s.is_premium;
  const accessOk     = !isPremium || hasAccess === true;
  const loadingAccess = isPremium && hasAccess === null;


  const poster = s.thumbnail_url ?? s.banner_url ?? null;
  const goldLabel = s.price ? `${eurToGoGold(s.price).toLocaleString('fr-FR')} GoGold` : 'Contenu premium';
  const firstEp = episodes[0];
  const firstLocked = !!firstEp && isPremium && !accessOk && !firstEp.is_free;

  return (
    <div className="relative">
      <MediaBackdrop image={s.banner_url ?? s.thumbnail_url} />

      <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 pb-8 pt-2">
        <DetailBackHeader onBack={goBack} />

        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 mt-3">
          {/* ── Colonne principale ── */}
          <div className="space-y-5 min-w-0">
            {/* Player ou bannière */}
            {playingVideo && playingEp ? (
              <VideoPlayerWithTracking
                url={playingVideo.hls_url!}
                poster={playingEp.thumbnail_url ?? s.thumbnail_url ?? undefined}
                videoId={playingVideo.id}
                contentId={s.id}
              />
            ) : (
              <div className={`relative aspect-video overflow-hidden ${firstEp ? 'cursor-pointer group' : ''}`}
                style={{ borderRadius: '1.75rem', background: 'var(--bg-tertiary)', boxShadow: '0 24px 60px -20px rgba(0,0,0,0.45)' }}
                onClick={() => { if (firstEp) handlePlayEpisode(firstEp, firstLocked); }}>
                {(s.banner_url || s.thumbnail_url) && (
                  <img src={s.banner_url ?? s.thumbnail_url ?? ''} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={s.title} />
                )}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.1) 55%)' }} />
                <div className="absolute top-3 left-3">
                  <AccessBadge isPremium={isPremium} hasAccess={hasAccess} hasActiveSub={hasActiveSub} price={s.price} />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {loadingAccess || epVidLoading ? <Spinner size="lg" /> : firstEp && (
                    firstLocked ? (
                      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(123,63,242,0.92)' }}>
                        <Lock size={26} color="white" />
                      </div>
                    ) : (
                      <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                        style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(10px)', border: '2px solid rgba(255,255,255,0.5)' }}>
                        <Play size={32} fill="white" color="white" style={{ marginLeft: 4 }} />
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            <MediaTitleBlock
              title={s.title}
              originalTitle={s.original_title}
              rating={s.average_rating}
              onShare={() => setShowShareModal(true)}
              chips={[s.year > 0 && String(s.year), s.total_seasons > 0 && `${s.total_seasons} saison${s.total_seasons > 1 ? 's' : ''}`, s.country, s.language && s.language.toUpperCase()]}
            />

            {/* Action principale */}
            {firstEp && (
              <button onClick={() => handlePlayEpisode(playingEp ?? firstEp, playingEp ? false : firstLocked)}
                className="w-full py-3.5 rounded-full font-black text-white text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
                style={{ background: firstLocked ? 'linear-gradient(135deg,#7B3FF2,#EC4899)' : 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 12px 28px -8px rgba(123,63,242,0.65)' }}>
                {firstLocked
                  ? <><Lock size={16} /> Débloquer · {goldLabel}</>
                  : <><Play size={17} fill="currentColor" /> {playingEp ? `Épisode ${playingEp.number} en cours` : `Regarder · S${selectedSeason ?? 1} E${firstEp.number}`}</>}
              </button>
            )}

            {isPremium && !hasAccess && hasAccess !== null && (
              <PremiumCta title="Accès à toute la série" subtitle={s.price ? `${goldLabel} · ${s.price.toFixed(2)} €` : 'Contenu premium'} onClick={() => setShowPaywall(true)} />
            )}

            <MediaSynopsis text={s.synopsis} />

            {/* ── Saisons (onglets défilants) ── */}
            {!seasonsLoading && seasons.length > 0 && (
              <section>
                <h2 className="text-[11px] font-black uppercase mb-2.5 px-1" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.12em' }}>Saisons</h2>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'none' }}>
                  {seasons.map(season => {
                    const active = selectedSeason === season.number;
                    return (
                      <button key={season.id} onClick={() => setSelectedSeason(season.number)}
                        className="shrink-0 h-10 px-5 rounded-full text-sm font-bold transition-all"
                        style={active
                          ? { background: 'var(--primary)', color: '#fff', boxShadow: '0 6px 14px rgba(123,63,242,0.35)' }
                          : { background: 'var(--surface)', color: 'var(--text-secondary)', border: '1.5px solid var(--border)' }}>
                        {season.title ?? `Saison ${season.number}`}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Épisodes ── */}
            <section>
              <div className="flex items-baseline justify-between mb-2.5 px-1">
                <h2 className="text-[11px] font-black uppercase" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.12em' }}>
                  Épisodes{selectedSeason !== null ? ` · Saison ${selectedSeason}` : ''}
                </h2>
                {episodes.length > 0 && <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>{episodes.length} épisode{episodes.length > 1 ? 's' : ''}</span>}
              </div>

              {epLoading ? (
                <PageLoader />
              ) : episodes.length === 0 ? (
                <p className="text-sm p-5 rounded-3xl text-center" style={{ color: 'var(--text-secondary)', background: 'var(--surface)', border: '1px dashed var(--border)' }}>
                  Aucun épisode disponible pour le moment.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {episodes.map(ep => {
                    const isLocked = isPremium && !accessOk && !ep.is_free;
                    const isPlaying = playingEp?.id === ep.id;
                    return (
                      <button key={ep.id} onClick={() => handlePlayEpisode(ep, isLocked)}
                        className="w-full rounded-3xl p-2.5 flex gap-3 text-left transition-all active:scale-[0.995]"
                        style={{
                          background: isPlaying ? 'rgba(123,63,242,0.1)' : 'var(--surface)',
                          border: `1.5px solid ${isPlaying ? 'var(--primary)' : 'var(--border)'}`,
                        }}>
                        {/* Vignette */}
                        <div className="relative shrink-0 overflow-hidden w-[116px] sm:w-[148px]"
                          style={{ aspectRatio: '16/10', borderRadius: '1.1rem', background: 'var(--bg-tertiary)' }}>
                          {ep.thumbnail_url
                            ? <img src={ep.thumbnail_url} className="w-full h-full object-cover" alt="" loading="lazy" />
                            : <div className="w-full h-full flex items-center justify-center"><Film size={20} style={{ color: 'var(--text-tertiary)' }} /></div>}
                          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.22)' }}>
                            {isLocked ? (
                              <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(123,63,242,0.9)' }}><Lock size={15} color="white" /></span>
                            ) : epVidLoading && isPlaying ? (
                              <Spinner size="sm" />
                            ) : (
                              <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}><Play size={15} className="text-white" fill="white" style={{ marginLeft: 2 }} /></span>
                            )}
                          </div>
                          <span className="absolute bottom-1.5 left-1.5 min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-black text-white flex items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.65)' }}>{ep.number}</span>
                        </div>

                        {/* Infos */}
                        <div className="flex-1 min-w-0 py-1 pr-1.5 flex flex-col justify-center gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {ep.is_free && isPremium && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: '#10b98120', color: '#10b981' }}>GRATUIT</span>
                            )}
                            {isPlaying && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(123,63,242,0.18)', color: 'var(--primary)' }}>EN LECTURE</span>
                            )}
                          </div>
                          <p className="font-extrabold text-sm leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>{ep.title}</p>
                          {ep.synopsis && <p className="text-xs line-clamp-2 hidden sm:block" style={{ color: 'var(--text-secondary)' }}>{ep.synopsis}</p>}
                          {ep.duration_sec && (
                            <p className="text-[11px] font-semibold flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                              <Clock size={11} /> {fmt(ep.duration_sec)}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* ── Colonne latérale : affiche + fiche technique ── */}
          <aside className="space-y-5 lg:sticky lg:top-4 self-start">
            {poster && (
              <div className="hidden lg:block overflow-hidden" style={{ borderRadius: '1.75rem', aspectRatio: '2 / 3', boxShadow: '0 24px 60px -20px rgba(0,0,0,0.5)' }}>
                <img src={poster} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <MediaFacts country={s.country} language={s.language} year={s.year > 0 ? s.year : null} views={s.view_count} />
          </aside>
        </div>
      </div>

      {/* ── Paywall modal ── */}
      {showPaywall && s && (
        <PaywallModal
          serie={s}
          onClose={() => setShowPaywall(false)}
          onPurchased={() => { setHasAccess(true); setShowPaywall(false); }}
        />
      )}

      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={`${window.location.origin}/series/${encodeId(s.id)}`}
        title={`${s.title} — Gofolyx`}
        image={s.banner_url ?? s.thumbnail_url ?? undefined}
        targetType="content"
        targetId={s.id}
      />
    </div>
  );
}
