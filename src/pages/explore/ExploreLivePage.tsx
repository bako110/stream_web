import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { encodeId } from '../../utils/slugId';
import { Radio, Users, MapPin, UserPlus } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { publicClient } from '../../api/client';
import { Endpoints } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { MediaPlaceholder } from '../../components/ui/MediaPlaceholder';
import { ExploreBackButton } from '../../components/ui/ExploreBackButton';
import type { Concert } from '../../types';

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.xp-rise');
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' },
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  });
}

export default function ExploreLivePage() {
  useScrollReveal();
  const { data, loading, refetch } = useApi<Concert[]>(
    () => publicClient.get<Concert[]>(Endpoints.concerts.live),
    []
  );
  const lives = data ?? [];

  useEffect(() => {
    const id = setInterval(() => refetch(), 30000);
    return () => clearInterval(id);
  }, [refetch]);

  return (
    <div className="xp-container">
      <ExploreBackButton />
      <div className="xp-page-head xp-rise">
        <span className="xp-eyebrow flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--xp-accent)' }} /> En ce moment
        </span>
        <h1 className="xp-display xp-page-title">Live</h1>
        <p className="xp-page-sub">Les concerts diffusés en direct sur Gofolyx, à cet instant</p>
      </div>

      {loading ? (
        <div className="xp-grid-wide grid gap-6">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="xp-card"><div className="xp-card-media xp-card-media--wide xp-skeleton" /></div>)}
        </div>
      ) : lives.length === 0 ? (
        <div className="xp-empty flex flex-col items-center gap-3">
          <Radio size={32} />
          <p style={{ color: 'var(--xp-text-2)' }}>Aucun live en ce moment</p>
          <p className="text-sm max-w-sm">Reviens plus tard ou consulte les concerts à venir.</p>
        </div>
      ) : (
        <div className="xp-grid-wide grid gap-6">
          {lives.map((c, i) => (
            <div key={c.id} className="xp-rise" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
              <LiveCard concert={c} />
            </div>
          ))}
        </div>
      )}

      <div className="xp-cta xp-rise">
        <Radio size={26} className="mx-auto mb-4" style={{ color: 'var(--xp-accent)' }} />
        <h2 className="xp-display text-2xl sm:text-3xl mb-3" style={{ color: 'var(--xp-paper)' }}>Ne rate plus jamais un live</h2>
        <p className="mb-8 max-w-md mx-auto" style={{ color: 'rgba(245,244,242,0.65)' }}>Suis tes artistes préférés et reçois une alerte dès qu'ils passent en direct.</p>
        <button onClick={() => window.location.assign('/auth/register')} className="xp-btn xp-btn-accent">Créer mon compte</button>
      </div>
    </div>
  );
}

function LiveCard({ concert }: { concert: Concert }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [imgErr, setImgErr] = useState(false);
  const artistName = concert.artist?.display_name ?? concert.artist?.username ?? null;
  const venue = [concert.venue_name, concert.venue_city].filter(Boolean).join(', ');

  function handleFollow(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate(`/auth/login?redirect=${encodeURIComponent(`/explore/concerts/${encodeId(concert.id)}`)}`);
      return;
    }
    navigate(`/explore/concerts/${encodeId(concert.id)}`);
  }

  return (
    <div onClick={() => navigate(`/explore/concerts/${encodeId(concert.id)}`)} className="xp-card cursor-pointer">
      <div className="xp-card-media xp-card-media--wide">
        {concert.thumbnail_url && !imgErr ? (
          <img src={concert.thumbnail_url} alt={concert.title} onError={() => setImgErr(true)} />
        ) : (
          <div className="xp-card-media-fallback"><MediaPlaceholder title={concert.title} icon={<Radio size={34} color="#fff" />} /></div>
        )}
        <div className="xp-card-scrim" />
        <span className="xp-card-badge"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live</span>
        {(concert.current_viewers ?? 0) > 0 && (
          <div className="xp-card-chip"><Users size={10} /> {(concert.current_viewers ?? 0).toLocaleString()}</div>
        )}
        <div className="xp-card-overlay">
          <p className="xp-card-overlay-title truncate">{concert.title}</p>
          {artistName && <p className="xp-card-overlay-sub truncate">{artistName}</p>}
        </div>
      </div>

      <div className="p-3.5">
        {venue && (
          <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: 'var(--xp-text-3)' }}>
            <MapPin size={11} /><span className="truncate">{venue}</span>
          </div>
        )}
        <button onClick={handleFollow} className="xp-btn xp-btn-accent" style={{ width: '100%', padding: '0.65rem' }}>
          <UserPlus size={14} /> Suivre
        </button>
      </div>
    </div>
  );
}
