import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { encodeId } from '../../utils/slugId';
import { Radio, Users, MapPin, UserPlus } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { publicClient } from '../../api/client';
import { Endpoints } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { MediaPlaceholder } from '../../components/ui/MediaPlaceholder';
import type { Concert } from '../../types';

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.ex-rise');
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
    <div className="max-w-6xl mx-auto px-5 py-16">
      <div className="mb-10 ex-rise">
        <div className="ex-rule mb-4">
          <span className="ex-eyebrow shrink-0 flex items-center gap-2" style={{ color: 'var(--ex-violet)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#EF4444' }} /> En ce moment
          </span>
        </div>
        <h1 className="ex-display text-5xl md:text-6xl mb-2" style={{ color: 'var(--ex-text)' }}>Live</h1>
        <p className="text-base" style={{ color: 'var(--ex-text-2)' }}>Les concerts diffusés en direct sur GoFolyX, à cet instant</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ height: 260, background: 'var(--ex-surface)' }} />
          ))}
        </div>
      ) : lives.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <Radio size={36} style={{ color: 'var(--ex-text-3)' }} />
          <p style={{ color: 'var(--ex-text-2)' }}>Aucun live en ce moment</p>
          <p className="text-sm max-w-sm" style={{ color: 'var(--ex-text-3)' }}>Reviens plus tard ou consulte les concerts à venir.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {lives.map((c, i) => (
            <div key={c.id} className="ex-rise" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
              <LiveCard concert={c} />
            </div>
          ))}
        </div>
      )}

      <div className="mt-20 rounded-3xl px-8 py-14 text-center relative overflow-hidden ex-rise" style={{ background: 'var(--ex-ink)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(circle at 15% 20%, rgba(166,124,247,0.18), transparent 55%), radial-gradient(circle at 85% 80%, rgba(123,63,242,0.26), transparent 55%)',
        }} />
        <div className="relative z-10">
          <Radio size={28} className="mx-auto mb-4" style={{ color: 'var(--ex-amber)' }} />
          <h2 className="ex-display text-3xl md:text-4xl text-white mb-3">Ne rate plus jamais un live</h2>
          <p className="mb-8 max-w-md mx-auto" style={{ color: 'rgba(245,243,250,0.7)' }}>
            Suis tes artistes préférés et reçois une alerte dès qu'ils passent en direct.
          </p>
          <button onClick={() => window.location.assign('/auth/register')}
            className="inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-full text-base transition-transform hover:scale-105"
            style={{ background: 'var(--ex-amber)', color: '#fff' }}>
            Créer mon compte
          </button>
        </div>
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
    <div onClick={() => navigate(`/explore/concerts/${encodeId(concert.id)}`)}
      className="ex-tile group cursor-pointer overflow-hidden rounded-2xl"
      style={{ background: 'var(--ex-surface)', boxShadow: '0 10px 26px rgba(0,0,0,0.14)' }}>
      <div className="relative overflow-hidden" style={{ height: 176 }}>
        {concert.thumbnail_url && !imgErr ? (
          <img src={concert.thumbnail_url} alt={concert.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={() => setImgErr(true)} />
        ) : (
          <div className="absolute inset-0"><MediaPlaceholder title={concert.title} icon={<Radio size={38} color="#fff" />} /></div>
        )}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 text-xs font-black text-white px-2.5 py-1 rounded-full uppercase tracking-wider" style={{ background: '#EF4444' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
        </div>
        {(concert.current_viewers ?? 0) > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-semibold text-white px-2 py-1 rounded-full" style={{ background: 'rgba(10,8,18,0.55)' }}>
            <Users size={10} /> {(concert.current_viewers ?? 0).toLocaleString()}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold truncate" style={{ color: 'var(--ex-text)' }}>{concert.title}</h3>
        {artistName && <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--ex-text-2)' }}>{artistName}</p>}
        {venue && (
          <div className="flex items-center gap-2 text-xs mt-2" style={{ color: 'var(--ex-text-3)' }}>
            <MapPin size={12} /><span className="truncate">{venue}</span>
          </div>
        )}
        <button onClick={handleFollow}
          className="mt-3 w-full flex items-center justify-center gap-1.5 text-sm font-bold py-2.5 rounded-full transition-transform hover:scale-[1.02]"
          style={{ background: 'var(--ex-violet)', color: '#fff' }}>
          <UserPlus size={14} /> Suivre
        </button>
      </div>
    </div>
  );
}
