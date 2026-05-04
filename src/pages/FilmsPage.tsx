import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Star, Crown, Search, SlidersHorizontal } from 'lucide-react';
import type { Content, PaginatedResponse } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { usePaginatedApi } from '../hooks/useApi';
import { Spinner } from '../components/ui/Spinner';

function ContentCard({ item }: { item: Content }) {
  const navigate = useNavigate();
  return (
    <div className="cursor-pointer group"
      onClick={() => navigate(`/${item.type === 'film' ? 'films' : 'series'}/${item.id}`, { state: { item } })}>
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-tertiary)' }}>
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
            <Play size={28} />
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center transition-all duration-300"
          style={{ background: 'rgba(0,0,0,0)', backdropFilter: 'blur(0px)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.45)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0)';
          }}>
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100"
            style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              borderRadius: '50%',
              padding: '0.75rem',
              border: '2px solid rgba(255,255,255,0.4)',
            }}>
            <Play size={20} className="text-white" fill="white" />
          </div>
        </div>

        {/* Badges */}
        {item.is_premium && (
          <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
            style={{ background: 'linear-gradient(135deg,#FF7A2F,#E0389A)' }}>
            <Crown size={9} /> Premium
          </div>
        )}
        {item.average_rating && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-white"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
            <Star size={10} className="text-yellow-400" fill="currentColor" />
            {item.average_rating.toFixed(1)}
          </div>
        )}
      </div>

      <div className="mt-2.5 space-y-0.5 px-0.5">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <span>{item.year}</span>
          {item.language && (
            <>
              <span>·</span>
              <span className="uppercase">{item.language}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props { type?: 'film' | 'serie'; }

export default function FilmsPage({ type = 'film' }: Props) {
  const [search, setSearch] = useState('');
  const endpoint = type === 'film' ? Endpoints.content.films : Endpoints.content.series;
  const { items, loading, loadMore, page, pages } = usePaginatedApi<Content>(
    (p) => apiClient.get<PaginatedResponse<Content>>(`${endpoint}?page=${p}&limit=24&status=published`),
    [type],
  );

  const label = type === 'film' ? 'Films' : 'Séries';
  const filtered = search.trim()
    ? items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{label}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {items.length} titre{items.length > 1 ? 's' : ''} disponible{items.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-tertiary)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Rechercher un ${type === 'film' ? 'film' : 'série'}…`}
              className="pl-8 pr-4 py-2 text-sm rounded-xl focus:outline-none"
              style={{
                background:  'var(--bg-secondary)',
                border:      '1px solid var(--border)',
                color:       'var(--text-primary)',
                width:       '220px',
              }}
              onFocus={e  => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(123,63,242,0.12)'; }}
              onBlur={e   => { e.target.style.borderColor = 'var(--border)';  e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <button className="p-2 rounded-xl transition-all"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading && items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <Spinner />
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Chargement…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--bg-secondary)' }}>
            <Play size={28} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Aucun résultat</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Essayez un autre terme de recherche.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-5">
            {filtered.map(item => <ContentCard key={item.id} item={item} />)}
          </div>
          {page < pages && (
            <div className="flex justify-center pt-4">
              <button onClick={loadMore} disabled={loading} className="btn-secondary px-10">
                {loading ? <Spinner size="sm" className="mx-auto" /> : 'Voir plus'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
