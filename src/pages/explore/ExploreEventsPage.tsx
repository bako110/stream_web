import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { encodeId } from '../../utils/slugId';
import { Search, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useApi } from '../../hooks/useApi';
import { publicClient } from '../../api/client';
import { Endpoints } from '../../api/endpoints';
import { MediaPlaceholder } from '../../components/ui/MediaPlaceholder';
import type { Event, PaginatedResponse } from '../../types';

const TYPE_LABELS: Record<string, string> = {
  concert: 'Concert', birthday: 'Anniversaire', festival: 'Festival',
  conference: 'Conférence', sport: 'Sport', theater: 'Théâtre',
  exhibition: 'Exposition', other: 'Autre',
};

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

export default function ExploreEventsPage() {
  const [search, setSearch] = useState('');
  useScrollReveal();

  const { data, loading } = useApi<PaginatedResponse<Event> | Event[]>(
    () => publicClient.get<PaginatedResponse<Event> | Event[]>(Endpoints.events.list),
    []
  );

  const items: Event[] = Array.isArray(data) ? data : (data?.items ?? []);
  const now      = new Date();
  const filtered = items.filter(ev => !search || ev.title.toLowerCase().includes(search.toLowerCase()));
  const upcoming = filtered.filter(ev => new Date(ev.starts_at) >= now);
  const past     = filtered.filter(ev => new Date(ev.starts_at) < now);

  return (
    <div className="w-full mx-auto px-5 py-16">
      <div className="mb-10 ex-rise">
        <div className="ex-rule mb-4"><span className="ex-eyebrow shrink-0" style={{ color: 'var(--ex-violet)' }}>Agenda</span></div>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="ex-display text-5xl md:text-6xl" style={{ color: 'var(--ex-text)' }}>Événements</h1>
            <p className="mt-2 text-base" style={{ color: 'var(--ex-text-2)' }}>
              Festivals, conférences, expositions — ne manque rien
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ex-text-3)' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un événement…"
              className="w-full pl-10 pr-4 py-3 rounded-full text-sm focus:outline-none transition-colors"
              style={{ background: 'var(--ex-surface)', border: '1px solid var(--ex-line)', color: 'var(--ex-text)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--ex-violet)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--ex-line)')}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ height: 240, background: 'var(--ex-surface)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24" style={{ color: 'var(--ex-text-3)' }}>
          {search ? `Aucun résultat pour "${search}"` : 'Aucun événement disponible'}
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="mb-12 ex-rise">
              <div className="ex-rule mb-5"><span className="ex-eyebrow shrink-0" style={{ color: 'var(--ex-text-3)' }}>À venir</span></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcoming.map((ev, i) => <div key={ev.id} className="ex-rise" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}><EventCard event={ev} /></div>)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section className="ex-rise">
              <div className="ex-rule mb-5"><span className="ex-eyebrow shrink-0" style={{ color: 'var(--ex-text-3)' }}>Passés</span></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-55">
                {past.map(ev => <EventCard key={ev.id} event={ev} isPast />)}
              </div>
            </section>
          )}
        </>
      )}

      <div className="mt-20 rounded-3xl px-8 py-14 text-center relative overflow-hidden ex-rise" style={{ background: 'var(--ex-ink)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(circle at 15% 20%, rgba(166,124,247,0.18), transparent 55%), radial-gradient(circle at 85% 80%, rgba(123,63,242,0.26), transparent 55%)',
        }} />
        <div className="relative z-10">
          <Calendar size={28} className="mx-auto mb-4" style={{ color: 'var(--ex-amber)' }} />
          <h2 className="ex-display text-3xl md:text-4xl text-white mb-3">Participe aux prochains événements</h2>
          <p className="mb-8 max-w-md mx-auto" style={{ color: 'rgba(245,243,250,0.7)' }}>
            Achète tes billets et partage tes expériences avec la communauté.
          </p>
          <Link to="/auth/register"
            className="inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-full text-base transition-transform hover:scale-105"
            style={{ background: 'var(--ex-amber)', color: 'var(--ex-ink)' }}>
            Rejoindre GoFolyX
          </Link>
        </div>
      </div>
    </div>
  );
}

function EventCard({ event, isPast = false }: { event: Event; isPast?: boolean }) {
  const [imgErr, setImgErr] = useState(false);
  const startDate = new Date(event.starts_at);
  const location  = [event.venue_name, event.venue_city].filter(Boolean).join(', ');
  const label     = TYPE_LABELS[event.event_type] ?? event.event_type;

  return (
    <Link to={`/explore/events/${encodeId(event.id)}`}
      className="ex-tile group block rounded-2xl overflow-hidden"
      style={{ background: 'var(--ex-surface)', boxShadow: '0 10px 26px rgba(0,0,0,0.14)' }}>
      <div className="relative overflow-hidden" style={{ height: 160 }}>
        {event.thumbnail_url && !imgErr ? (
          <img src={event.thumbnail_url} alt={event.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={() => setImgErr(true)} />
        ) : (
          <div className="absolute inset-0"><MediaPlaceholder title={event.title} icon={<Calendar size={34} color="#fff" />} /></div>
        )}
        <div className="absolute top-3 left-3 text-xs font-bold text-white px-2.5 py-1 rounded-full" style={{ background: 'rgba(123,63,242,0.85)' }}>
          {label}
        </div>
        {event.starts_at && (
          <div className="absolute top-3 right-3 flex flex-col items-center justify-center w-11 h-11 rounded-xl" style={{ background: 'rgba(10,8,18,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <span className="ex-display text-sm leading-none text-white">{format(startDate, 'd')}</span>
            <span className="text-[9px] uppercase" style={{ color: 'var(--ex-amber)' }}>{format(startDate, 'MMM', { locale: fr })}</span>
          </div>
        )}
        {isPast && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(10,8,18,0.5)' }}>
            <span className="text-white text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(10,8,18,0.6)' }}>Terminé</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold truncate transition-colors" style={{ color: 'var(--ex-text)' }}>{event.title}</h3>
        {event.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--ex-text-2)' }}>{event.description}</p>}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ex-text-3)' }}>
            <Calendar size={12} /><span>{format(startDate, 'd MMM yyyy', { locale: fr })}</span>
          </div>
          {location && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ex-text-3)' }}>
              <MapPin size={12} /><span className="truncate">{location}</span>
            </div>
          )}
        </div>
        {event.ticket_price != null && (
          <div className="mt-3" style={{ borderTop: '1px dashed var(--ex-line)', paddingTop: 10 }}>
            <span className="text-sm font-bold" style={{ color: 'var(--ex-violet)' }}>
              {event.ticket_price === 0 ? 'Gratuit' : `${event.ticket_price} €`}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
