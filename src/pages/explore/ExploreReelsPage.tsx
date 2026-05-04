import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Play, Heart, MessageCircle, Eye, Volume2, VolumeX } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { apiClient } from '../../api/client';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import type { Reel, PaginatedResponse } from '../../types';

export default function ExploreReelsPage() {
  const { data, loading } = useApi<PaginatedResponse<Reel>>(
    () => apiClient.get<PaginatedResponse<Reel>>(Endpoints.reels.feed),
    []
  );

  const reels = data?.items ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Play size={28} className="text-[var(--primary)]" />
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Reels</h1>
        </div>
        <p className="text-[var(--text-secondary)]">
          Courtes vidéos tendance — découvrez les créateurs de la plateforme
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : reels.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-tertiary)]">Aucun reel disponible</div>
      ) : (
        <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
          {reels.map(reel => (
            <ReelCard key={reel.id} reel={reel} />
          ))}
        </div>
      )}

      <div className="mt-16 rounded-2xl bg-gradient-to-r from-pink-500/20 to-purple-500/10 border border-pink-500/20 p-8 text-center">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Créez et partagez vos propres Reels
        </h2>
        <p className="text-[var(--text-secondary)] mb-4">
          Rejoignez la communauté et exprimez-vous en vidéo
        </p>
        <Link to="/auth/register" className="btn-primary inline-block">Commencer à créer</Link>
      </div>
    </div>
  );
}

function ReelCard({ reel }: { reel: Reel }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted]     = useState(true);
  const [playing, setPlaying] = useState(false);

  function togglePlay() {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else         { videoRef.current.play();  setPlaying(true);  }
  }

  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation();
    if (videoRef.current) { videoRef.current.muted = !muted; setMuted(v => !v); }
  }

  return (
    <div
      className="break-inside-avoid mb-3 group relative rounded-xl overflow-hidden bg-[var(--bg-secondary)] cursor-pointer"
      onClick={togglePlay}
    >
      {reel.video_url ? (
        <video
          ref={videoRef}
          src={reel.video_url}
          poster={reel.thumbnail_url ?? undefined}
          loop
          muted={muted}
          playsInline
          className="w-full object-cover"
        />
      ) : reel.thumbnail_url ? (
        <img src={reel.thumbnail_url} alt={reel.caption ?? 'Reel'} className="w-full object-cover" />
      ) : (
        <div className="aspect-[9/16] flex items-center justify-center">
          <Play size={32} className="text-[var(--text-tertiary)]" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play size={20} className="text-white" fill="white" />
          </div>
        </div>
      )}

      {reel.video_url && (
        <button
          onClick={toggleMute}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-3 text-white text-xs">
          <span className="flex items-center gap-1">
            <Heart size={12} />
            {reel.like_count}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle size={12} />
            {reel.comment_count}
          </span>
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {reel.view_count}
          </span>
        </div>
        {reel.caption && (
          <p className="text-white text-xs mt-1 line-clamp-2">{reel.caption}</p>
        )}
      </div>
    </div>
  );
}
