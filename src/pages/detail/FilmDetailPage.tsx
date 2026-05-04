import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Star, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import type { Content, VideoMeta } from "../../types";
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { Spinner } from '../../components/ui/Spinner';

function VideoPlayer({ url, poster }: { url: string; poster?: string }) {
  return (
    <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden">
      <video className="w-full h-full" src={url} controls autoPlay poster={poster} />
    </div>
  );
}

export default function FilmDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [expandSynopsis, setExpandSynopsis] = useState(false);

  const film = useApi<Content>(() => apiClient.get<Content>(Endpoints.content.filmById(id!)), [id]);
  const videos = useApi<VideoMeta[]>(() => apiClient.get<VideoMeta[]>(Endpoints.videos.byContent(id!)), [id]);

  if (film.loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!film.data) return <div className="p-6 text-[var(--text-secondary)]">Contenu introuvable.</div>;

  const f = film.data;
  const freeVideo = videos.data?.find(v => v.is_free || !f.is_premium);
  const defaultVideo = videos.data?.find(v => v.is_default) ?? videos.data?.[0];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Player */}
      {playingUrl ? (
        <VideoPlayer url={playingUrl} poster={f.thumbnail_url ?? undefined} />
      ) : (
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black cursor-pointer group"
          onClick={() => { const url = freeVideo?.hls_url ?? defaultVideo?.hls_url; if (url) setPlayingUrl(url); }}>
          {f.banner_url || f.thumbnail_url ? (
            <img src={f.banner_url ?? f.thumbnail_url ?? ''} className="w-full h-full object-cover" alt={f.title} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--bg-tertiary)]"><Play size={48} /></div>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-white/20 backdrop-blur rounded-full p-5 group-hover:bg-white/30 transition-colors">
              <Play size={32} className="text-white" fill="white" />
            </div>
          </div>
          {f.is_premium && (
            <div className="absolute top-4 right-4 badge-premium flex items-center gap-1"><Crown size={12} /> Premium</div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{f.title}</h1>
            {f.original_title && f.original_title !== f.title && (
              <p className="text-[var(--text-secondary)]">{f.original_title}</p>
            )}
          </div>
          {f.average_rating && (
            <div className="flex items-center gap-1 text-yellow-400 shrink-0">
              <Star size={18} fill="currentColor" />
              <span className="font-bold">{f.average_rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-[var(--text-secondary)]">
          <span className="bg-[var(--bg-secondary)] px-3 py-1 rounded-full">{f.year}</span>
          <span className="bg-[var(--bg-secondary)] px-3 py-1 rounded-full uppercase">{f.language}</span>
          {f.country && <span className="bg-[var(--bg-secondary)] px-3 py-1 rounded-full">{f.country}</span>}
          {f.rating && <span className="bg-[var(--bg-secondary)] px-3 py-1 rounded-full">{f.rating}</span>}
          {f.view_count > 0 && <span className="bg-[var(--bg-secondary)] px-3 py-1 rounded-full">{f.view_count.toLocaleString()} vues</span>}
        </div>

        {f.director && <p className="text-sm text-[var(--text-secondary)]"><span className="font-medium text-[var(--text-primary)]">Réalisateur :</span> {f.director}</p>}

        {f.synopsis && (
          <div>
            <p className={`text-sm text-[var(--text-secondary)] leading-relaxed ${!expandSynopsis ? 'line-clamp-3' : ''}`}>{f.synopsis}</p>
            <button onClick={() => setExpandSynopsis(!expandSynopsis)} className="text-brand-primary text-sm flex items-center gap-1 mt-1">
              {expandSynopsis ? <><ChevronUp size={14} /> Moins</> : <><ChevronDown size={14} /> Lire plus</>}
            </button>
          </div>
        )}

        {/* Video quality selector */}
        {videos.data && videos.data.length > 1 && (
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">Qualité disponible</h3>
            <div className="flex flex-wrap gap-2">
              {videos.data.map(v => (
                <button key={v.id} onClick={() => v.hls_url && setPlayingUrl(v.hls_url)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${playingUrl === v.hls_url ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-brand-primary'}`}>
                  {v.label}
                  {v.is_free && <span className="ml-1 text-xs text-brand-green">(gratuit)</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trailer */}
        {f.trailer_url && (
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">Bande-annonce</h3>
            <div className="aspect-video rounded-xl overflow-hidden bg-black">
              <video src={f.trailer_url} controls className="w-full h-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
