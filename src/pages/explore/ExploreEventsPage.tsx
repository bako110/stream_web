import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useApi } from '../../hooks/useApi';
import { publicClient } from '../../api/client';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import { MediaPlaceholder } from '../../components/ui/MediaPlaceholder';
import type { Event, PaginatedResponse } from '../../types';

const TYPE_LABELS: Record<string, string> = {
  concert: 'Concert', birthday: 'Anniversaire', festival: 'Festival',
  conference: 'Conférence', sport: 'Sport', theater: 'Théâtre',
  exhibition: 'Exposition', other: 'Autre',
};
const TYPE_COLORS: Record<string, string> = {
  concert: '#7B3FF2', festival: '#E0389A', sport: '#FF7A2F',
  conference: '#3B82F6', theater: '#8B5CF6', exhibition: '#06B6D4',
  birthday: '#F59E0B', other: '#6B7280',
};

export default function ExploreEventsPage() {
  const [search, setSearch] = useState('');

  const { data, loading } = useApi<PaginatedResponse<Event>>(
    () => publicClient.get<PaginatedResponse<Event>>(Endpoints.events.list),
    []
  );

  const items    = data?.items ?? [];
  const now      = new Date();
  const filtered = items.filter(ev =>
    !search || ev.title.toLowerCase().includes(search.toLowerCase())
  );
  const upcoming = filtered.filter(ev => new Date(ev.starts_at) >= now);
  const past     = filtered.filter(ev => new Date(ev.starts_at) < now);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Calendar size={28} className="text-[var(--primary)]" />
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Événements</h1>
        </div>
        <p className="text-[var(--text-secondary)]">
          Festivals, conférences, expositions — ne manquez rien
        </p>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un événement..."
            className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--text-tertiary)' }}>
          {search ? `Aucun résultat pour "${search}"` : 'Aucun événement disponible'}
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>À venir</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcoming.map(ev => <EventCard key={ev.id} event={ev} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-tertiary)' }}>Événements passés</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
                {past.map(ev => <EventCard key={ev.id} event={ev} isPast />)}
              </div>
            </section>
          )}
        </>
      )}

      <div className="mt-16 rounded-2xl p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Participez aux prochains événements
        </h2>
        <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
          Achetez vos billets et partagez vos expériences avec la communauté
        </p>
        <Link to="/auth/register"
          className="inline-block px-6 py-2.5 rounded-xl font-bold text-white"
          style={{ background: 'var(--primary)' }}>
          Rejoindre FoliX
        </Link>
      </div>
    </div>
  );
}

function EventCard({ event, isPast = false }: { event: Event; isPast?: boolean }) {
  const [imgErr, setImgErr] = useState(false);
  const startDate = new Date(event.starts_at);
  const location  = [event.venue_name, event.venue_city].filter(Boolean).join(', ');
  const color     = TYPE_COLORS[event.event_type] ?? '#6B7280';
  const label     = TYPE_LABELS[event.event_type] ?? event.event_type;

  return (
    <Link to={`/explore/events/${event.id}`}
      className="group block rounded-2xl overflow-hidden transition-all hover:scale-[1.01]"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="relative overflow-hidden" style={{ height: 160 }}>
        {event.thumbnail_url && !imgErr ? (
          <img src={event.thumbnail_url} alt={event.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgErr(true)} />
        ) : (
          <div className="absolute inset-0">
            <MediaPlaceholder title={event.title} icon={<Calendar size={36} color="#fff" />} />
          </div>
        )}
        <div className="absolute top-3 left-3 text-xs font-bold text-white px-2.5 py-1 rounded-full"
          style={{ background: `${color}CC`, backdropFilter: 'blur(4px)' }}>
          {label}
        </div>
        {event.starts_at && (
          <div className="absolute top-3 right-3 flex flex-col items-center justify-center w-10 h-10 rounded-xl text-white font-black"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <span className="text-sm leading-none">{format(startDate, 'd')}</span>
            <span className="text-[9px] uppercase opacity-70">{format(startDate, 'MMM', { locale: fr })}</span>
          </div>
        )}
        {isPast && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.6)' }}>
              Terminé
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold truncate group-hover:text-[var(--primary)] transition-colors"
          style={{ color: 'var(--text-primary)' }}>
          {event.title}
        </h3>
        {event.description && (
          <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{event.description}</p>
        )}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <Calendar size={12} />
            <span>{format(startDate, 'd MMM yyyy', { locale: fr })}</span>
          </div>
          {location && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <MapPin size={12} />
              <span className="truncate">{location}</span>
            </div>
          )}
        </div>
        {event.ticket_price != null && (
          <div className="mt-3">
            <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
              {event.ticket_price === 0 ? 'Gratuit' : `${event.ticket_price} €`}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
