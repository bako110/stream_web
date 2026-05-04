import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Film } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { apiClient } from '../../api/client';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import type { Content, PaginatedResponse } from '../../types';

interface Props { type?: 'film' | 'serie' }

export default function ExploreFilmsPage({ type = 'film' }: Props) {
  const [search, setSearch] = useState('');

  const endpoint = type === 'film' ? Endpoints.content.films : Endpoints.content.series;
  const { data, loading } = useApi<PaginatedResponse<Content>>(
    () => apiClient.get<PaginatedResponse<Content>>(endpoint),
    []
  );

  const items = data?.items ?? [];
  const filtered = items.filter(item =>
    !search || item.title.toLowerCase().includes(search.toLowerCase())
  );

  const basePath = type === 'film' ? '/explore/films' : '/explore/series';
  const title    = type === 'film' ? 'Films' : 'Séries';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Film size={28} className="text-[var(--primary)]" />
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">{title}</h1>
        </div>
        <p className="text-[var(--text-secondary)]">
          Découvrez notre catalogue de {title.toLowerCase()} — aucune inscription requise
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Rechercher un ${type === 'film' ? 'film' : 'série'}...`}
            className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-tertiary)]">
          {search ? `Aucun résultat pour "${search}"` : `Aucun ${type} disponible`}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map(item => (
            <Link
              key={item.id}
              to={`${basePath}/${item.id}`}
              className="group block"
            >
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[var(--bg-secondary)] mb-2">
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film size={32} className="text-[var(--text-tertiary)]" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                {item.year && (
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                    {item.year}
                  </div>
                )}

                {item.rating && (
                  <div className="absolute top-2 right-2 bg-black/60 text-yellow-400 text-xs px-2 py-0.5 rounded-full">
                    ★ {Number(item.rating).toFixed(1)}
                  </div>
                )}
              </div>

              <p className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--primary)] transition-colors">
                {item.title}
              </p>
              {item.year && (
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{item.year}</p>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* CTA banner */}
      <div className="mt-16 rounded-2xl bg-gradient-to-r from-[var(--primary)]/20 to-purple-500/10 border border-[var(--primary)]/20 p-8 text-center">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Profitez de tout le catalogue sans limites
        </h2>
        <p className="text-[var(--text-secondary)] mb-4">
          Créez un compte gratuit pour regarder, sauvegarder et interagir avec la communauté
        </p>
        <Link to="/auth/register" className="btn-primary inline-block">
          Commencer gratuitement
        </Link>
      </div>
    </div>
  );
}
