import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { encodeId } from '../../utils/slugId';
import { Search, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePaginatedApi } from '../../hooks/useApi';
import { publicClient } from '../../api/client';
import { Endpoints } from '../../api/endpoints';
import { MediaPlaceholder } from '../../components/ui/MediaPlaceholder';
import { ExploreBackButton } from '../../components/ui/ExploreBackButton';
import type { Event, PaginatedResponse } from '../../types';
import { getEventTiming, sortEventsByProximity } from '../../utils/eventTiming';

const TYPE_LABELS: Record<string, string> = {
  concert: 'Concert', birthday: 'Anniversaire', festival: 'Festival',
  conference: 'Conférence', sport: 'Sport', theater: 'Théâtre',
  exhibition: 'Exposition', other: 'Autre',
};

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

export default function ExploreEventsPage() {
  const [search, setSearch] = useState('');
  useScrollReveal();

  const { items, loading, page, pages, sentinelRef } = usePaginatedApi<Event>(
    (p) => publicClient.get<PaginatedResponse<Event> | Event[]>(`${Endpoints.events.list}?page=${p}&limit=20&originals_only=true`),
  );

  const now      = new Date();
  const filtered = items.filter(ev => !search || ev.title.toLowerCase().includes(search.toLowerCase()));
  const sorted   = sortEventsByProximity(filtered, now);
  const near     = sorted.filter(ev => getEventTiming(ev, now).isNear);
  const upcoming = sorted.filter(ev => { const t = getEventTiming(ev, now); return !t.isNear && !t.isPast; });
  const past     = sorted.filter(ev => getEventTiming(ev, now).isPast);

  return (
    <div className="xp-container">
      <ExploreBackButton />
      <div className="xp-page-head xp-rise">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="xp-eyebrow">Agenda</span>
            <h1 className="xp-display xp-page-title">Événements</h1>
            <p className="xp-page-sub">Festivals, conférences, expositions — ne manque rien</p>
          </div>
          <div className="xp-search">
            <Search size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un événement…" />
          </div>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="xp-grid-wide grid gap-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="xp-card"><div className="xp-card-media xp-card-media--wide xp-skeleton" /></div>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="xp-empty">{search ? `Aucun résultat pour "${search}"` : 'Aucun événement disponible'}</div>
      ) : (
        <>
          {near.length > 0 && (
            <section className="mb-10 xp-rise">
              <div className="xp-rule"><span className="xp-eyebrow shrink-0" style={{ color: '#F59E0B' }}>Bientôt · 7 prochains jours</span></div>
              <div className="xp-grid-wide grid gap-6">
                {near.map((ev, i) => <div key={ev.id} className="xp-rise" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}><EventCard event={ev} /></div>)}
              </div>
            </section>
          )}
          {upcoming.length > 0 && (
            <section className="mb-10 xp-rise">
              <div className="xp-rule"><span className="xp-eyebrow shrink-0">À venir</span></div>
              <div className="xp-grid-wide grid gap-6">
                {upcoming.map((ev, i) => <div key={ev.id} className="xp-rise" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}><EventCard event={ev} /></div>)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section className="xp-rise">
              <div className="xp-rule"><span className="xp-eyebrow shrink-0">Passés</span></div>
              <div className="xp-grid-wide grid gap-6">
                {past.map(ev => <EventCard key={ev.id} event={ev} isPast />)}
              </div>
            </section>
          )}
          {page < pages && (
            <div ref={sentinelRef} className="flex justify-center py-8">
              <span className="xp-skeleton" style={{ width: 120, height: 8, borderRadius: 999 }} />
            </div>
          )}
        </>
      )}

      <div className="xp-cta xp-rise">
        <Calendar size={26} className="mx-auto mb-4" style={{ color: 'var(--xp-accent)' }} />
        <h2 className="xp-display text-2xl sm:text-3xl mb-3" style={{ color: 'var(--xp-paper)' }}>Participe aux prochains événements</h2>
        <p className="mb-8 max-w-md mx-auto" style={{ color: 'rgba(245,244,242,0.65)' }}>Achète tes billets et partage tes expériences avec la communauté.</p>
        <Link to="/auth/register" className="xp-btn xp-btn-accent">Rejoindre Gofolyx</Link>
      </div>
    </div>
  );
}

function EventCard({ event, isPast = false }: { event: Event; isPast?: boolean }) {
  const [imgErr, setImgErr] = useState(false);
  const startDate = new Date(event.starts_at);
  const location  = [event.venue_name, event.venue_city].filter(Boolean).join(', ');
  const label     = TYPE_LABELS[event.event_type] ?? event.event_type;
  const timing    = getEventTiming(event);
  isPast = isPast || timing.isPast;

  return (
    <Link to={`/explore/events/${encodeId(event.id)}`} className="xp-card block"
      style={{ ...(isPast ? { filter: 'grayscale(1)', opacity: 0.6 } : {}),
               ...(timing.isNear ? { boxShadow: `0 0 0 2px ${timing.color}` } : {}) }}>
      <div className="xp-card-media xp-card-media--wide">
        {event.thumbnail_url && !imgErr ? (
          <img src={event.thumbnail_url} alt={event.title} onError={() => setImgErr(true)} />
        ) : (
          <div className="xp-card-media-fallback"><MediaPlaceholder title={event.title} icon={<Calendar size={30} color="#fff" />} /></div>
        )}
        <div className="xp-card-scrim" />
        <span className="xp-card-badge" style={{ background: 'var(--xp-ink)' }}>{label}</span>
        {!isPast && (
          <span className="absolute top-3 right-3 text-[11px] font-extrabold px-2.5 py-1 rounded-full text-white shadow-lg"
            style={{ background: timing.color }}>{timing.label}</span>
        )}
        <div className="xp-card-date">
          <span className="xp-card-date-day">{format(startDate, 'd')}</span>
          <span className="xp-card-date-month">{format(startDate, 'MMM', { locale: fr })}</span>
        </div>
        {isPast && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <span className="text-white text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.6)' }}>{timing.label}</span>
          </div>
        )}
        <div className="xp-card-overlay">
          <p className="xp-card-overlay-title truncate">{event.title}</p>
          {location && <p className="xp-card-overlay-sub truncate"><MapPin size={10} /> {location}</p>}
        </div>
      </div>
      <div className="xp-card-footer">
        <span className="inline-flex items-center gap-1"><Calendar size={12} /> {format(startDate, 'd MMM yyyy', { locale: fr })}</span>
        {event.ticket_price != null && (
          <span className="xp-card-price">{event.ticket_price === 0 ? 'Gratuit' : `${event.ticket_price}€`}</span>
        )}
      </div>
    </Link>
  );
}
