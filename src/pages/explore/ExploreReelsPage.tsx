import { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { Link } from 'react-router-dom';
import { Play, Heart, MessageCircle, Eye, Volume2, VolumeX } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { publicClient } from '../../api/client';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import { MediaPlaceholder } from '../../components/ui/MediaPlaceholder';
import { toProxiedUrl } from '../../utils/constants';
import type { Reel, PaginatedResponse } from '../../types';

export default function ExploreReelsPage() {
  const { data, loading } = useApi<PaginatedResponse<Reel>>(
    () => publicClient.get<PaginatedResponse<Reel>>(Endpoints.reels.feed),
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
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : reels.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--text-tertiary)' }}>
          Aucun reel disponible
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
          {reels.map(reel => <ReelCard key={reel.id} reel={reel} />)}
        </div>
      )}

      <div className="mt-16 rounded-2xl p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Créez et partagez vos propres Reels
        </h2>
        <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
          Rejoignez la communauté et exprimez-vous en vidéo
        </p>
        <Link to="/auth/register"
          className="inline-block px-6 py-2.5 rounded-xl font-bold text-white"
          style={{ background: 'var(--primary)' }}>
          Commencer à créer
        </Link>
      </div>
    </div>
  );
}

function ReelCard({ reel }: { reel: Reel }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted,   setMuted]   = useState(true);
  const [playing, setPlaying] = useState(false);
  const [thumbErr, setThumbErr] = useState(false);

  function togglePlay() {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else         { videoRef.current.play();  setPlaying(true);  }
  }

  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation();
    if (videoRef.current) { videoRef.current.muted = !muted; setMuted(v => !v); }
  }

  const hasPoster = reel.thumbnail_url && !thumbErr;
  const videoSrc  = toProxiedUrl(reel.hls_url ?? '');

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoSrc) return;
    if (Hls.isSupported()) {
      const hls = new Hls({ autoStartLoad: true });
      hls.loadSource(videoSrc);
      hls.attachMedia(v);
      return () => hls.destroy();
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = videoSrc;
    }
  }, [videoSrc]);

  return (
    <div className="break-inside-avoid mb-3 group relative rounded-xl overflow-hidden cursor-pointer"
      style={{ background: 'var(--bg-secondary)' }}
      onClick={togglePlay}>
      {videoSrc ? (
        <video ref={videoRef}
          poster={hasPoster ? reel.thumbnail_url! : undefined}
          loop muted={muted} playsInline className="w-full object-cover"
          onError={() => setThumbErr(true)} />
      ) : hasPoster ? (
        <img src={reel.thumbnail_url!} alt={reel.caption ?? 'Reel'}
          className="w-full object-cover" onError={() => setThumbErr(true)} />
      ) : (
        <div style={{ aspectRatio: '9/16' }}>
          <MediaPlaceholder title={reel.caption} icon={<Play size={32} color="#fff" />} />
        </div>
      )}

      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }} />

      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}>
            <Play size={20} color="#fff" fill="#fff" />
          </div>
        </div>
      )}

      {videoSrc && (
        <button onClick={toggleMute}
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-3 text-white text-xs">
          <span className="flex items-center gap-1"><Heart size={12} />{reel.like_count}</span>
          <span className="flex items-center gap-1"><MessageCircle size={12} />{reel.comment_count}</span>
          <span className="flex items-center gap-1"><Eye size={12} />{reel.view_count}</span>
        </div>
        {reel.caption && (
          <p className="text-white text-xs mt-1 line-clamp-2">{reel.caption}</p>
        )}
      </div>
    </div>
  );
}
