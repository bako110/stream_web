import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useApi } from '../../hooks/useApi';
import { apiClient } from '../../api/client';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import type { Event, PaginatedResponse } from '../../types';

export default function ExploreEventsPage() {
  const [search, setSearch] = useState('');

  const { data, loading } = useApi<PaginatedResponse<Event>>(
    () => apiClient.get<PaginatedResponse<Event>>(Endpoints.events.list),
    []
  );

  const items = data?.items ?? [];
  const filtered = items.filter(event =>
    !search || event.title.toLowerCase().includes(search.toLowerCase())
  );

  const now      = new Date();
  const upcoming = filtered.filter(e => new Date(e.starts_at) >= now);
  const past     = filtered.filter(e => new Date(e.starts_at) < now);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Calendar size={28} className="text-[var(--primary)]" />
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Événements</h1>
        </div>
        <p className="text-[var(--text-secondary)]">
          Festivals, conférences, expositions — ne manquez rien
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
            placeholder="Rechercher un événement..."
            className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-tertiary)]">
          {search ? `Aucun résultat pour "${search}"` : 'Aucun événement disponible'}
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">À venir</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcoming.map(event => <EventCard key={event.id} event={event} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-[var(--text-tertiary)] mb-4">Événements passés</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
                {past.map(event => <EventCard key={event.id} event={event} isPast />)}
              </div>
            </section>
          )}
        </>
      )}

      {/* CTA */}
      <div className="mt-16 rounded-2xl bg-gradient-to-r from-orange-500/20 to-red-500/10 border border-orange-500/20 p-8 text-center">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Participez aux prochains événements
        </h2>
        <p className="text-[var(--text-secondary)] mb-4">
          Achetez vos billets et partagez vos expériences avec la communauté
        </p>
        <Link to="/auth/register" className="btn-primary inline-block">Rejoindre FoliX</Link>
      </div>
    </div>
  );
}

function EventCard({ event, isPast = false }: { event: Event; isPast?: boolean }) {
  const startDate = new Date(event.starts_at);
  const location  = [event.venue_name, event.venue_city].filter(Boolean).join(', ');

  return (
    <Link
      to={`/explore/events/${event.id}`}
      className="group card overflow-hidden hover:border-[var(--primary)]/50 transition-all hover:shadow-lg hover:shadow-[var(--primary)]/10"
    >
      <div className="relative h-40 bg-[var(--bg-secondary)] overflow-hidden">
        {event.thumbnail_url ? (
          <img
            src={event.thumbnail_url}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-900/40 to-red-900/40">
            <Calendar size={36} className="text-[var(--text-tertiary)]" />
          </div>
        )}
        {event.event_type && (
          <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full capitalize">
            {event.event_type}
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
          {event.title}
        </h3>
        {event.description && (
          <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{event.description}</p>
        )}

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <Calendar size={12} />
            <span>{format(startDate, 'd MMM yyyy', { locale: fr })}</span>
          </div>
          {location && (
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              <MapPin size={12} />
              <span className="truncate">{location}</span>
            </div>
          )}
        </div>

        {event.ticket_price != null && (
          <div className="mt-3">
            <span className="text-sm font-bold text-[var(--primary)]">
              {event.ticket_price === 0 ? 'Gratuit' : `${event.ticket_price} €`}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
