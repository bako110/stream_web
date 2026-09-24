import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { encodeId } from '../../utils/slugId';
import { Search, Play, Star, Film as FilmIcon } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { publicClient } from '../../api/client';
import { Endpoints } from '../../api/endpoints';
import { MediaPlaceholder } from '../../components/ui/MediaPlaceholder';
import { ExploreBackButton } from '../../components/ui/ExploreBackButton';
import type { Content, PaginatedResponse } from '../../types';

interface Props { type?: 'film' | 'serie' }

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

export default function ExploreFilmsPage({ type = 'film' }: Props) {
  const [search, setSearch] = useState('');
  useScrollReveal();

  const endpoint = type === 'film' ? Endpoints.content.films : Endpoints.content.series;
  const { data, loading } = useApi<PaginatedResponse<Content>>(
    () => publicClient.get<PaginatedResponse<Content>>(endpoint),
    []
  );

  const items    = data?.items ?? [];
  const filtered = items.filter(item => !search || item.title.toLowerCase().includes(search.toLowerCase()));
  const basePath = type === 'film' ? '/explore/films' : '/explore/series';
  const label    = type === 'film' ? 'Films' : 'Séries';
  const eyebrow  = type === 'film' ? 'Cinéma' : 'Séries';

  return (
    <div className="xp-container">
      <ExploreBackButton />
      <div className="xp-page-head xp-rise">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="xp-eyebrow">{eyebrow}</span>
            <h1 className="xp-display xp-page-title">{label}</h1>
            <p className="xp-page-sub">Catalogue complet en streaming HD — aucune inscription requise</p>
          </div>
          <div className="xp-search">
            <Search size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Rechercher un ${type === 'film' ? 'film' : 'série'}…`} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="xp-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="xp-card"><div className="xp-card-media xp-card-media--poster xp-skeleton" /></div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="xp-empty">{search ? `Aucun résultat pour "${search}"` : `Aucun ${label.toLowerCase()} disponible`}</div>
      ) : (
        <div className="xp-grid">
          {filtered.map((item, i) => (
            <div key={item.id} className="xp-rise" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
              <PosterCard item={item} basePath={basePath} />
            </div>
          ))}
        </div>
      )}

      <div className="xp-cta xp-rise">
        <FilmIcon size={26} className="mx-auto mb-4" style={{ color: 'var(--xp-accent)' }} />
        <h2 className="xp-display text-2xl sm:text-3xl mb-3" style={{ color: 'var(--xp-paper)' }}>Profite de tout le catalogue</h2>
        <p className="mb-8 max-w-md mx-auto" style={{ color: 'rgba(245,244,242,0.65)' }}>
          Crée un compte gratuit pour regarder, sauvegarder et interagir avec la communauté.
        </p>
        <Link to="/auth/register" className="xp-btn xp-btn-accent">Commencer gratuitement</Link>
      </div>
    </div>
  );
}

function PosterCard({ item, basePath }: { item: Content; basePath: string }) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <Link to={`${basePath}/${encodeId(item.id)}`} className="xp-card block">
      <div className="xp-card-media xp-card-media--poster">
        {item.thumbnail_url && !imgErr ? (
          <img src={item.thumbnail_url} alt={item.title} onError={() => setImgErr(true)} />
        ) : (
          <div className="xp-card-media-fallback"><MediaPlaceholder title={item.title} icon={<Play size={30} color="#fff" />} /></div>
        )}
        {item.rating != null && (
          <div className="xp-card-chip"><Star size={9} fill="#fff" /> {Number(item.rating).toFixed(1)}</div>
        )}
      </div>
      <div className="xp-card-body">
        <p className="xp-card-title truncate">{item.title}</p>
        {item.year && <p className="xp-card-meta">{item.year}</p>}
      </div>
    </Link>
  );
}
