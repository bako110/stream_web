import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { decodeId } from '../../utils/slugId';
import {
  Play, Star, Crown, ChevronDown, ChevronUp, Lock, Film, Clock,
  Coins, Check, AlertTriangle, X, Wallet,
} from 'lucide-react';
import type { Content, Season, Episode, VideoMeta } from '../../types';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { Spinner } from '../../components/ui/Spinner';
import { VideoPlayer } from '../../components/ui/VideoPlayer';
import toast from 'react-hot-toast';

// 1 EUR = 100 coins (taux unifié plateforme)
const COINS_PER_EUR = 100;
const eurToCoins = (eur: number) => Math.ceil(eur * COINS_PER_EUR);

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
  const coinsRequired = eurToCoins(serie.price ?? 0);
  const [balance, setBalance] = useState<number | null>(null);
  const [buying,  setBuying]  = useState(false);

  useEffect(() => {
    apiClient.get<any>(Endpoints.wallet.balance)
      .then(r => setBalance(r.data?.coins_balance ?? r.data?.balance ?? r.data?.coins ?? 0))
      .catch(() => setBalance(0));
  }, []);

  const sufficient = balance !== null && balance >= coinsRequired;

  async function handleBuy() {
    setBuying(true);
    try {
      await apiClient.post(Endpoints.content.seriePurchase(serie.id));
      toast.success('Accès accordé !');
      onPurchased();
      onClose();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      toast.error(detail ?? 'Achat impossible. Réessayez.');
    } finally { setBuying(false); }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 rounded-3xl overflow-hidden max-w-sm mx-auto"
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
              <Coins size={18} style={{ color: 'var(--primary)' }} />
              <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Coins requis</span>
            </div>
            <span className="font-black text-lg" style={{ color: 'var(--primary)' }}>
              {coinsRequired.toLocaleString('fr-FR')}
            </span>
          </div>

          {balance !== null && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Votre solde</span>
              <span className="text-sm font-bold" style={{ color: sufficient ? '#22C55E' : '#EF4444' }}>
                {balance.toLocaleString('fr-FR')} coins
              </span>
            </div>
          )}

          {balance !== null && !sufficient && (
            <div className="flex items-center gap-2 p-3 rounded-xl"
              style={{ background: '#EF444410', border: '1px solid #EF444430' }}>
              <AlertTriangle size={15} style={{ color: '#EF4444', flexShrink: 0 }} />
              <p className="text-xs font-semibold" style={{ color: '#EF4444' }}>
                Solde insuffisant — il vous manque {(coinsRequired - balance).toLocaleString('fr-FR')} coins
              </p>
            </div>
          )}

          {serie.price && (
            <p className="text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Accès à toute la série · {serie.price.toFixed(2)} € · 1 € = {COINS_PER_EUR} coins
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
    </>
  );
}

// ── Player avec tracking progress ────────────────────────────────────────────

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
        autoPlay
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
  const navigate      = useNavigate();
  const location      = useLocation();

  const stateItem = (location.state as { item?: Content } | null)?.item ?? null;

  // Access control
  const [hasAccess,    setHasAccess]    = useState<boolean | null>(null);
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [showPaywall,  setShowPaywall]  = useState(false);

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

  const [expandSynopsis, setExpandSynopsis] = useState(false);

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

  if (serie.loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!serie.data)   return <div className="p-6" style={{ color: 'var(--text-secondary)' }}>Série introuvable.</div>;

  const s            = serie.data;
  const isPremium    = !!s.is_premium;
  const accessOk     = !isPremium || hasAccess === true;
  const loadingAccess = isPremium && hasAccess === null;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">

      {/* ── Player ou bannière ── */}
      {playingVideo && playingEp ? (
        <VideoPlayerWithTracking
          url={playingVideo.hls_url!}
          poster={playingEp.thumbnail_url ?? s.thumbnail_url ?? undefined}
          videoId={playingVideo.id}
          contentId={s.id}
        />
      ) : (
        <div className="relative aspect-video rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-tertiary)' }}>
          {(s.banner_url || s.thumbnail_url) && (
            <img src={s.banner_url ?? s.thumbnail_url ?? ''} className="w-full h-full object-cover" alt={s.title} />
          )}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            {loadingAccess && <Spinner size="lg" />}
          </div>

          {/* Badge accès */}
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
                  <Crown size={11} /> Premium · {s.price ? `${s.price.toFixed(2)} €` : ''}
                </div>
              )}
            </div>
          )}

          <div className="absolute bottom-4 left-4">
            <h1 className="text-white text-2xl font-black" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>{s.title}</h1>
          </div>
        </div>
      )}

      {/* ── Infos ── */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{s.title}</h1>
            {s.original_title && s.original_title !== s.title && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{s.original_title}</p>
            )}
          </div>
          {s.average_rating && (
            <div className="flex items-center gap-1 shrink-0 text-yellow-400">
              <Star size={18} fill="currentColor" />
              <span className="font-black text-lg">{s.average_rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {s.year > 0 && <span className="px-3 py-1 rounded-full" style={{ background: 'var(--bg-secondary)' }}>{s.year}</span>}
          {s.total_seasons > 0 && (
            <span className="px-3 py-1 rounded-full" style={{ background: 'var(--bg-secondary)' }}>
              {s.total_seasons} saison{s.total_seasons > 1 ? 's' : ''}
            </span>
          )}
          {s.language && <span className="px-3 py-1 rounded-full uppercase" style={{ background: 'var(--bg-secondary)' }}>{s.language}</span>}
          {s.country  && <span className="px-3 py-1 rounded-full" style={{ background: 'var(--bg-secondary)' }}>{s.country}</span>}
          {s.view_count > 0 && (
            <span className="px-3 py-1 rounded-full" style={{ background: 'var(--bg-secondary)' }}>
              {s.view_count.toLocaleString()} vues
            </span>
          )}
        </div>

        {s.synopsis && (
          <div>
            <p className={`text-sm leading-relaxed ${!expandSynopsis ? 'line-clamp-3' : ''}`}
              style={{ color: 'var(--text-secondary)' }}>{s.synopsis}</p>
            <button onClick={() => setExpandSynopsis(v => !v)}
              className="text-sm flex items-center gap-1 mt-1" style={{ color: 'var(--primary)' }}>
              {expandSynopsis ? <><ChevronUp size={14} /> Moins</> : <><ChevronDown size={14} /> Lire plus</>}
            </button>
          </div>
        )}

        {/* ── CTA Achat si série premium non achetée ── */}
        {isPremium && !hasAccess && hasAccess !== null && (
          <div className="p-4 rounded-2xl flex items-center justify-between gap-4"
            style={{ background: 'linear-gradient(135deg,rgba(123,63,242,0.08),rgba(123,63,242,0.05))', border: '1px solid rgba(123,63,242,0.3)' }}>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Accès à toute la série</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                {s.price ? `${eurToCoins(s.price).toLocaleString('fr-FR')} coins · ${s.price.toFixed(2)} €` : 'Contenu premium'}
              </p>
            </div>
            <button onClick={() => setShowPaywall(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-white text-sm shrink-0"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
              <Lock size={14} /> Débloquer
            </button>
          </div>
        )}
      </div>

      {/* ── Saisons ── */}
      {!seasonsLoading && seasons.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Saisons</h3>
          <div className="flex flex-wrap gap-2">
            {seasons.map(season => {
              const active = selectedSeason === season.number;
              return (
                <button key={season.id} onClick={() => setSelectedSeason(season.number)}
                  className="px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
                  style={{
                    borderColor: active ? 'var(--primary)' : 'var(--border)',
                    background:  active ? 'rgba(123,63,242,0.1)' : 'transparent',
                    color:       active ? 'var(--primary)' : 'var(--text-secondary)',
                  }}>
                  {season.title ?? `Saison ${season.number}`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Épisodes ── */}
      <div>
        <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          Épisodes{selectedSeason !== null ? ` — Saison ${selectedSeason}` : ''}
        </h3>

        {epLoading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : episodes.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Aucun épisode disponible.</p>
        ) : (
          <div className="space-y-2">
            {episodes.map(ep => {
              const isLocked = isPremium && !accessOk && !ep.is_free;
              const isPlaying = playingEp?.id === ep.id;

              return (
                <button key={ep.id}
                  onClick={() => handlePlayEpisode(ep, isLocked)}
                  className="w-full rounded-2xl border p-3 flex gap-3 text-left transition-all"
                  style={{
                    background:   isPlaying ? 'rgba(123,63,242,0.08)' : 'var(--surface)',
                    borderColor:  isPlaying ? 'var(--primary)'        : 'var(--border)',
                    opacity:      isLocked && !ep.is_free ? 0.85 : 1,
                  }}
                  onMouseEnter={e => { if (!isPlaying) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                  onMouseLeave={e => { if (!isPlaying) e.currentTarget.style.background = 'var(--surface)'; }}>

                  {/* Thumbnail */}
                  <div className="relative shrink-0 rounded-lg overflow-hidden"
                    style={{ width: 120, aspectRatio: '16/9', background: 'var(--bg-tertiary)' }}>
                    {ep.thumbnail_url
                      ? <img src={ep.thumbnail_url} className="w-full h-full object-cover" alt="" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <Film size={20} style={{ color: 'var(--text-tertiary)' }} />
                        </div>
                    }
                    <div className="absolute inset-0 flex items-center justify-center">
                      {isLocked ? (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(123,63,242,0.85)' }}>
                          <Lock size={14} color="white" />
                        </div>
                      ) : epVidLoading && isPlaying ? (
                        <Spinner size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.55)' }}>
                          <Play size={14} className="text-white" fill="white" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                        Épisode {ep.number}
                      </span>
                      {isLocked && <Lock size={11} style={{ color: '#7B3FF2' }} />}
                      {ep.is_free && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded"
                          style={{ background: '#10b98118', color: '#10b981' }}>
                          Gratuit
                        </span>
                      )}
                      {isPlaying && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded"
                          style={{ background: 'rgba(123,63,242,0.15)', color: 'var(--primary)' }}>
                          En lecture
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{ep.title}</p>
                    {ep.synopsis && (
                      <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{ep.synopsis}</p>
                    )}
                    {ep.duration_sec && (
                      <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                        <Clock size={10} /> {fmt(ep.duration_sec)}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Paywall modal ── */}
      {showPaywall && s && (
        <PaywallModal
          serie={s}
          onClose={() => setShowPaywall(false)}
          onPurchased={() => { setHasAccess(true); setShowPaywall(false); }}
        />
      )}
    </div>
  );
}
