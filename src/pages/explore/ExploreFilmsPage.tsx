import { PageLoader } from '../../components/ui/Spinner';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { encodeId } from '../../utils/slugId';
import { Search, Film, Star } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { publicClient } from '../../api/client';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../../components/ui/Spinner';
import { MediaPlaceholder } from '../../components/ui/MediaPlaceholder';
import type { Content, PaginatedResponse } from '../../types';

interface Props { type?: 'film' | 'serie' }

export default function ExploreFilmsPage({ type = 'film' }: Props) {
  const [search, setSearch] = useState('');

  const endpoint = type === 'film' ? Endpoints.content.films : Endpoints.content.series;
  const { data, loading } = useApi<PaginatedResponse<Content>>(
    () => publicClient.get<PaginatedResponse<Content>>(endpoint),
    []
  );

  const items    = data?.items ?? [];
  const filtered = items.filter(item =>
    !search || item.title.toLowerCase().includes(search.toLowerCase())
  );

  const basePath = type === 'film' ? '/explore/films' : '/explore/series';
  const title    = type === 'film' ? 'Films' : 'Séries';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Film size={28} className="text-[var(--primary)]" />
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">{title}</h1>
        </div>
        <p className="text-[var(--text-secondary)]">
          Découvrez notre catalogue de {title.toLowerCase()} — aucune inscription requise
        </p>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Rechercher un ${type === 'film' ? 'film' : 'série'}...`}
            className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--text-tertiary)' }}>
          {search ? `Aucun résultat pour "${search}"` : `Aucun ${type} disponible`}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map(item => <FilmCard key={item.id} item={item} basePath={basePath} />)}
        </div>
      )}

      <div className="mt-16 rounded-2xl p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Profitez de tout le catalogue sans limites
        </h2>
        <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
          Créez un compte gratuit pour regarder, sauvegarder et interagir avec la communauté
        </p>
        <Link to="/auth/register"
          className="inline-block px-6 py-2.5 rounded-xl font-bold text-white"
          style={{ background: 'var(--primary)' }}>
          Commencer gratuitement
        </Link>
      </div>
    </div>
  );
}

function FilmCard({ item, basePath }: { item: Content; basePath: string }) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <Link to={`${basePath}/${encodeId(item.id)}`} className="group block">
      <div className="relative rounded-xl overflow-hidden mb-2" style={{ aspectRatio: '2/3', background: 'var(--bg-secondary)' }}>
        {item.thumbnail_url && !imgErr ? (
          <img src={item.thumbnail_url} alt={item.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgErr(true)} />
        ) : (
          <div className="absolute inset-0">
            <MediaPlaceholder title={item.title} icon={<Film size={32} color="#fff" />} />
          </div>
        )}

        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }} />

        {item.year && (
          <div className="absolute top-2 left-2 text-white text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.6)' }}>
            {item.year}
          </div>
        )}

        {item.rating && (
          <div className="absolute top-2 right-2 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.6)', color: '#7B3FF2' }}>
            <Star size={10} fill="#7B3FF2" />
            {Number(item.rating).toFixed(1)}
          </div>
        )}
      </div>

      <p className="text-sm font-medium truncate group-hover:text-[var(--primary)] transition-colors"
        style={{ color: 'var(--text-primary)' }}>
        {item.title}
      </p>
      {item.year && (
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{item.year}</p>
      )}
    </Link>
  );
}
