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
    <div className="xp-container xd-page xl-page">
      <ExploreBackButton />
      <div className="xp-page-head xp-rise">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="xl-eyebrow-row"><span className="xp-eyebrow">{eyebrow}</span>{!loading && <span className="xl-count">{filtered.length}</span>}</div>
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
        <>
          {!search && filtered.length > 3 && <FeaturedCard item={filtered[0]} basePath={basePath} />}
          <div className="xp-grid">
            {(!search && filtered.length > 3 ? filtered.slice(1) : filtered).map((item, i) => (
              <div key={item.id} className="xp-rise" style={{ transitionDelay: `${Math.min(i, 12) * 40}ms` }}>
                <PosterCard item={item} basePath={basePath} />
              </div>
            ))}
          </div>
        </>
      )}

      <div className="xp-cta xl-cta xp-rise">
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

function FeaturedCard({ item, basePath }: { item: Content; basePath: string }) {
  const [imgErr, setImgErr] = useState(false);
  const img = item.banner_url ?? item.thumbnail_url;
  return (
    <Link to={`${basePath}/${encodeId(item.id)}`} className="xl-feature xp-rise">
      <div className="xl-feature-media">
        {img && !imgErr ? (
          <img src={img} alt={item.title} onError={() => setImgErr(true)} />
        ) : (
          <MediaPlaceholder title={item.title} icon={<Play size={40} color="#fff" />} />
        )}
      </div>
      <div className="xl-feature-scrim" />
      <div className="xl-feature-body">
        <span className="xl-feature-tag"><Star size={11} fill="currentColor" /> À la une</span>
        <h2 className="xp-display xl-feature-title">{item.title}</h2>
        <div className="xl-feature-meta">
          {item.rating != null && <span className="xl-feature-rating"><Star size={12} fill="currentColor" /> {Number(item.rating).toFixed(1)}</span>}
          {item.year && <span>{item.year}</span>}
        </div>
        {item.synopsis && <p className="xl-feature-syn">{item.synopsis}</p>}
        <span className="xl-feature-cta"><Play size={15} fill="currentColor" /> Découvrir</span>
      </div>
    </Link>
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
          <div className="xp-card-chip"><Star size={9} fill="#fbbf24" color="#fbbf24" /> {Number(item.rating).toFixed(1)}</div>
        )}
        <span className="xp-card-go"><Play size={18} fill="currentColor" /></span>
      </div>
      <div className="xp-card-body">
        <p className="xp-card-title truncate">{item.title}</p>
        {item.year && <p className="xp-card-meta">{item.year}</p>}
      </div>
    </Link>
  );
}
