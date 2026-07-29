import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { encodeId } from '../../utils/slugId';
import { Search, Play, Star, Film as FilmIcon } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { publicClient } from '../../api/client';
import { Endpoints } from '../../api/endpoints';
import { MediaPlaceholder } from '../../components/ui/MediaPlaceholder';
import type { Content, PaginatedResponse } from '../../types';

interface Props { type?: 'film' | 'serie' }

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
    <div className="w-full mx-auto px-5 py-16">
      {/* ── Header ── */}
      <div className="mb-10 ex-rise">
        <div className="ex-rule mb-4"><span className="ex-eyebrow shrink-0" style={{ color: 'var(--ex-violet)' }}>{eyebrow}</span></div>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="ex-display text-5xl md:text-6xl" style={{ color: 'var(--ex-text)' }}>{label}</h1>
            <p className="mt-2 text-base" style={{ color: 'var(--ex-text-2)' }}>
              Catalogue complet en streaming HD — aucune inscription requise
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ex-text-3)' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Rechercher un ${type === 'film' ? 'film' : 'série'}…`}
              className="w-full pl-10 pr-4 py-3 rounded-full text-sm focus:outline-none transition-colors"
              style={{ background: 'var(--ex-surface)', border: '1px solid var(--ex-line)', color: 'var(--ex-text)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--ex-violet)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--ex-line)')}
            />
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ aspectRatio: '2/3', background: 'var(--ex-surface)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24" style={{ color: 'var(--ex-text-3)' }}>
          {search ? `Aucun résultat pour "${search}"` : `Aucun ${label.toLowerCase()} disponible`}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {filtered.map((item, i) => (
            <div key={item.id} className="ex-rise" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
              <PosterCard item={item} basePath={basePath} />
            </div>
          ))}
        </div>
      )}

      {/* ── CTA ── */}
      <div className="mt-20 rounded-3xl px-8 py-14 text-center relative overflow-hidden ex-rise" style={{ background: 'var(--ex-ink)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(circle at 15% 20%, rgba(166,124,247,0.18), transparent 55%), radial-gradient(circle at 85% 80%, rgba(123,63,242,0.26), transparent 55%)',
        }} />
        <div className="relative z-10">
          <FilmIcon size={28} className="mx-auto mb-4" style={{ color: 'var(--ex-amber)' }} />
          <h2 className="ex-display text-3xl md:text-4xl text-white mb-3">Profite de tout le catalogue</h2>
          <p className="mb-8 max-w-md mx-auto" style={{ color: 'rgba(245,243,250,0.7)' }}>
            Crée un compte gratuit pour regarder, sauvegarder et interagir avec la communauté.
          </p>
          <Link to="/auth/register"
            className="inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-full text-base transition-transform hover:scale-105"
            style={{ background: 'var(--ex-amber)', color: 'var(--ex-ink)' }}>
            Commencer gratuitement
          </Link>
        </div>
      </div>
    </div>
  );
}

function PosterCard({ item, basePath }: { item: Content; basePath: string }) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <Link to={`${basePath}/${encodeId(item.id)}`} className="ex-tile group block">
      <div className="relative rounded-2xl overflow-hidden mb-2.5" style={{ aspectRatio: '2/3', background: 'var(--ex-surface)', boxShadow: '0 10px 26px rgba(0,0,0,0.14)' }}>
        {item.thumbnail_url && !imgErr ? (
          <img src={item.thumbnail_url} alt={item.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={() => setImgErr(true)} />
        ) : (
          <div className="absolute inset-0"><MediaPlaceholder title={item.title} icon={<Play size={30} color="#fff" />} /></div>
        )}

        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
          style={{ background: 'rgba(10,8,18,0.4)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--ex-amber)' }}>
            <Play size={14} className="text-white" fill="white" style={{ marginLeft: 1 }} />
          </div>
        </div>

        {item.year && (
          <div className="absolute top-2 left-2 text-white text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(10,8,18,0.6)' }}>
            {item.year}
          </div>
        )}
        {item.rating != null && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: 'rgba(10,8,18,0.6)' }}>
            <Star size={9} fill="var(--ex-amber)" style={{ color: 'var(--ex-amber)' }} />
            {Number(item.rating).toFixed(1)}
          </div>
        )}
      </div>

      <p className="text-sm font-semibold truncate transition-colors" style={{ color: 'var(--ex-text)' }}>{item.title}</p>
      {item.year && <p className="text-xs mt-0.5" style={{ color: 'var(--ex-text-3)' }}>{item.year}</p>}
    </Link>
  );
}
