import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Play, Star, Crown, ChevronDown, ChevronUp, Lock, Clock, Film } from 'lucide-react';
import type { Content, Season, Episode } from '../../types';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';

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

export default function SerieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const stateItem = (location.state as { item?: Content } | null)?.item ?? null;

  const [serie, setSerie] = useState<Content | null>(stateItem);
  const [serieLoading, setSerieLoading] = useState(!stateItem);
  const [serieError, setSerieError] = useState<string | null>(null);

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(true);

  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [epLoading, setEpLoading] = useState(false);

  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [expandSynopsis, setExpandSynopsis] = useState(false);

  // Only fetch serie metadata if not passed via router state
  useEffect(() => {
    if (stateItem || !id) return;
    setSerieLoading(true);
    // Try search endpoint as fallback — avoids the broken /content/series/:id endpoint
    apiClient.get<unknown>(`/api/v1/content/search?q=${id}&type=serie`)
      .then((raw) => {
        const items = toArray<Content>(raw);
        const match = items.find(c => c.id === id);
        if (match) { setSerie(match); }
        else { setSerieError('Série introuvable.'); }
        setSerieLoading(false);
      })
      .catch(() => { setSerieError('Impossible de charger la série.'); setSerieLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Load seasons
  useEffect(() => {
    if (!id) return;
    setSeasonsLoading(true);
    apiClient.get<unknown>(Endpoints.seasons.bySerie(id))
      .then((raw) => {
        const s = toArray<Season>(raw);
        setSeasons(s);
        if (s.length > 0) setSelectedSeason(s[0].number);
        setSeasonsLoading(false);
      })
      .catch(() => { setSeasonsLoading(false); });
  }, [id]);

  // Load episodes when season changes
  const loadEpisodes = useCallback((seasonNumber: number) => {
    if (!id) return;
    setEpLoading(true);
    apiClient.get<unknown>(Endpoints.episodes.bySeason(id, seasonNumber))
      .then((raw) => { setEpisodes(toArray<Episode>(raw)); setEpLoading(false); })
      .catch(() => { setEpisodes([]); setEpLoading(false); });
  }, [id]);

  useEffect(() => {
    if (selectedSeason !== null) loadEpisodes(selectedSeason);
  }, [selectedSeason, loadEpisodes]);

  if (serieLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (serieError || !serie) return <div className="p-6" style={{ color: 'var(--text-secondary)' }}>{serieError ?? 'Série introuvable.'}</div>;

  const s = serie;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Player or Banner */}
      {playingUrl ? (
        <div className="w-full aspect-video rounded-2xl overflow-hidden" style={{ background: '#000' }}>
          <video className="w-full h-full" src={playingUrl} controls autoPlay poster={s.thumbnail_url ?? undefined} />
        </div>
      ) : (
        <div className="relative aspect-video rounded-2xl overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
          {(s.banner_url || s.thumbnail_url) && (
            <img src={s.banner_url ?? s.thumbnail_url ?? ''} className="w-full h-full object-cover" alt={s.title} />
          )}
          {s.is_premium && (
            <div className="absolute top-4 right-4 flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full text-white"
              style={{ background: 'linear-gradient(135deg,#FF7A2F,#E0389A)' }}>
              <Crown size={11} /> Premium
            </div>
          )}
          <div className="absolute bottom-4 left-4">
            <h1 className="text-white text-2xl font-bold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>{s.title}</h1>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.title}</h1>
          {s.average_rating && (
            <div className="flex items-center gap-1 text-yellow-400 shrink-0">
              <Star size={18} fill="currentColor" />
              <span className="font-bold">{s.average_rating.toFixed(1)}</span>
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
        </div>

        {s.synopsis && (
          <div>
            <p className={`text-sm leading-relaxed ${!expandSynopsis ? 'line-clamp-3' : ''}`}
              style={{ color: 'var(--text-secondary)' }}>{s.synopsis}</p>
            <button onClick={() => setExpandSynopsis(!expandSynopsis)}
              className="text-sm flex items-center gap-1 mt-1" style={{ color: 'var(--primary)' }}>
              {expandSynopsis ? <><ChevronUp size={14} /> Moins</> : <><ChevronDown size={14} /> Lire plus</>}
            </button>
          </div>
        )}
      </div>

      {/* Season tabs */}
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
                    background: active ? 'rgba(123,63,242,0.1)' : 'transparent',
                    color: active ? 'var(--primary)' : 'var(--text-secondary)',
                  }}>
                  {season.title ?? `Saison ${season.number}`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Episodes */}
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
              const canPlay = !!ep.video_url && (ep.is_free || !s.is_premium);
              return (
                <div key={ep.id}
                  className="rounded-2xl border p-3 flex gap-3 transition-colors"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    cursor: canPlay ? 'pointer' : 'default',
                  }}
                  onClick={() => { if (canPlay) setPlayingUrl(ep.video_url!); }}>
                  {/* Thumbnail */}
                  <div className="relative shrink-0 rounded-lg overflow-hidden" style={{ width: 120, aspectRatio: '16/9', background: 'var(--bg-tertiary)' }}>
                    {ep.thumbnail_url
                      ? <img src={ep.thumbnail_url} className="w-full h-full object-cover" alt="" />
                      : <div className="w-full h-full flex items-center justify-center"><Film size={20} style={{ color: 'var(--text-tertiary)' }} /></div>
                    }
                    {ep.video_url && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.55)' }}>
                          <Play size={14} className="text-white" fill="white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                        Épisode {ep.number}
                      </span>
                      {!ep.is_free && s.is_premium && <Lock size={12} style={{ color: '#FF7A2F' }} />}
                      {ep.is_free && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: '#10b98118', color: '#10b981' }}>
                          Gratuit
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
