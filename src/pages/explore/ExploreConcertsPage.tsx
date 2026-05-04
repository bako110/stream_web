import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Music2, MapPin, Calendar, Radio } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useApi } from '../../hooks/useApi';
import { apiClient } from '../../api/client';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import type { Concert, PaginatedResponse } from '../../types';

const FILTERS = ['Tous', 'À venir', 'En direct', 'Passés'];

export default function ExploreConcertsPage() {
  const [filter, setFilter] = useState('Tous');
  const [search, setSearch] = useState('');

  const { data, loading } = useApi<PaginatedResponse<Concert>>(
    () => apiClient.get<PaginatedResponse<Concert>>(Endpoints.concerts.list),
    []
  );

  const now = new Date();
  const items = data?.items ?? [];
  const filtered = items.filter(concert => {
    const artistName = concert.artist?.display_name ?? concert.artist?.username ?? '';
    const matchSearch = !search ||
      concert.title.toLowerCase().includes(search.toLowerCase()) ||
      artistName.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    const date = new Date(concert.scheduled_at);
    if (filter === 'À venir')   return date > now && concert.status !== 'live';
    if (filter === 'En direct') return concert.status === 'live';
    if (filter === 'Passés')    return date < now && concert.status !== 'live';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Music2 size={28} className="text-[var(--primary)]" />
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Concerts</h1>
        </div>
        <p className="text-[var(--text-secondary)]">
          Concerts en direct et à venir — vivez la musique en temps réel
        </p>
      </div>

      {/* Search + filters */}
      <div className="mb-6 space-y-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Artiste ou concert..."
            className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
          />
        </div>

        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                filter === f
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)]'
              }`}
            >
              {f === 'En direct' && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Live concerts first */}
      {filtered.some(c => c.status === 'live') && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Radio size={18} className="text-red-500" />
            En ce moment
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.filter(c => c.status === 'live').map(concert => (
              <ConcertCard key={concert.id} concert={concert} isLive />
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filtered.filter(c => c.status !== 'live').length === 0 && !filtered.some(c => c.status === 'live') ? (
        <div className="text-center py-20 text-[var(--text-tertiary)]">
          {search ? `Aucun résultat pour "${search}"` : 'Aucun concert disponible'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.filter(c => c.status !== 'live').map(concert => (
            <ConcertCard key={concert.id} concert={concert} />
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="mt-16 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/10 border border-purple-500/20 p-8 text-center">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Ne manquez plus aucun concert
        </h2>
        <p className="text-[var(--text-secondary)] mb-4">
          Inscrivez-vous pour recevoir des alertes et acheter vos billets
        </p>
        <Link to="/auth/register" className="btn-primary inline-block">
          Créer mon compte
        </Link>
      </div>
    </div>
  );
}

function ConcertCard({ concert, isLive = false }: { concert: Concert; isLive?: boolean }) {
  const date  = new Date(concert.scheduled_at);
  const isPast = date < new Date() && !isLive;
  const artistName = concert.artist?.display_name ?? concert.artist?.username ?? null;
  const venue = [concert.venue_name, concert.venue_city].filter(Boolean).join(', ');

  return (
    <Link
      to={`/explore/concerts/${concert.id}`}
      className="group card overflow-hidden hover:border-[var(--primary)]/50 transition-all hover:shadow-lg hover:shadow-[var(--primary)]/10"
    >
      <div className="relative h-44 bg-[var(--bg-secondary)] overflow-hidden">
        {concert.thumbnail_url ? (
          <img
            src={concert.thumbnail_url}
            alt={concert.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50">
            <Music2 size={40} className="text-[var(--text-tertiary)]" />
          </div>
        )}
        {isLive && (
          <div className="absolute top-3 left-3 badge-live flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
        )}
        {isPast && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">Terminé</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--primary)] transition-colors">
          {concert.title}
        </h3>
        {artistName && (
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{artistName}</p>
        )}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <Calendar size={12} />
            <span>{format(date, 'd MMM yyyy à HH:mm', { locale: fr })}</span>
          </div>
          {venue && (
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              <MapPin size={12} />
              <span className="truncate">{venue}</span>
            </div>
          )}
        </div>
        {concert.ticket_price != null && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm font-bold text-[var(--primary)]">
              {concert.ticket_price === 0 ? 'Gratuit' : `${concert.ticket_price} €`}
            </span>
            <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">
              Voir détails →
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
