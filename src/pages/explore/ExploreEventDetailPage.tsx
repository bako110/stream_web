import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Ticket, ArrowLeft, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useApi } from '../../hooks/useApi';
import { apiClient } from '../../api/client';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import type { Event } from '../../types';

export default function ExploreEventDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: event, loading } = useApi<Event>(
    () => apiClient.get<Event>(Endpoints.events.byId(id!)),
    [id]
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-[var(--text-tertiary)]">Événement introuvable</p>
        <Link to="/explore/events" className="btn-primary mt-4 inline-block">Retour</Link>
      </div>
    );
  }

  const startDate = new Date(event.starts_at);
  const endDate   = event.ends_at ? new Date(event.ends_at) : null;
  const isPast    = startDate < new Date();
  const location  = [event.venue_name, event.venue_address, event.venue_city, event.venue_country].filter(Boolean).join(', ');

  return (
    <div>
      {/* Hero */}
      <div className="relative h-64 md:h-96 overflow-hidden">
        {event.thumbnail_url || event.banner_url ? (
          <img
            src={event.banner_url ?? event.thumbnail_url!}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-900/80 to-red-900/80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/40 to-transparent" />

        <Link
          to="/explore/events"
          className="absolute top-4 left-4 flex items-center gap-2 text-white bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm hover:bg-black/60 transition-colors"
        >
          <ArrowLeft size={14} />
          Événements
        </Link>

        {event.event_type && (
          <div className="absolute top-4 right-4 bg-black/50 text-white text-sm px-3 py-1 rounded-full capitalize">
            {event.event_type}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10 pb-16">
        <div className="card p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-4">{event.title}</h1>

          {/* Meta grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-[var(--bg-secondary)] rounded-xl p-4">
              <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-xs mb-1">
                <Calendar size={12} />
                <span>Début</span>
              </div>
              <p className="text-[var(--text-primary)] font-medium">
                {format(startDate, 'EEEE d MMMM yyyy', { locale: fr })}
              </p>
              <p className="text-[var(--text-secondary)] text-sm">à {format(startDate, 'HH:mm')}</p>
            </div>

            {endDate && (
              <div className="bg-[var(--bg-secondary)] rounded-xl p-4">
                <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-xs mb-1">
                  <Calendar size={12} />
                  <span>Fin</span>
                </div>
                <p className="text-[var(--text-primary)] font-medium">
                  {format(endDate, 'd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            )}

            {location && (
              <div className="bg-[var(--bg-secondary)] rounded-xl p-4">
                <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-xs mb-1">
                  <MapPin size={12} />
                  <span>Lieu</span>
                </div>
                <p className="text-[var(--text-primary)] font-medium truncate">{location}</p>
              </div>
            )}

            {event.max_attendees != null && (
              <div className="bg-[var(--bg-secondary)] rounded-xl p-4">
                <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-xs mb-1">
                  <Users size={12} />
                  <span>Capacité</span>
                </div>
                <p className="text-[var(--text-primary)] font-medium">{event.max_attendees} places</p>
              </div>
            )}

            {event.ticket_price != null && (
              <div className="bg-[var(--bg-secondary)] rounded-xl p-4">
                <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-xs mb-1">
                  <Ticket size={12} />
                  <span>Prix</span>
                </div>
                <p className="text-2xl font-bold text-[var(--primary)]">
                  {event.ticket_price === 0 ? 'Gratuit' : `${event.ticket_price} €`}
                </p>
              </div>
            )}
          </div>

          {event.description && (
            <div className="mb-6">
              <h2 className="text-sm uppercase tracking-wider text-[var(--text-tertiary)] mb-2">À propos</h2>
              <p className="text-[var(--text-secondary)] leading-relaxed">{event.description}</p>
            </div>
          )}

          {isPast && (
            <div className="mb-6 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-tertiary)] text-sm">
              Cet événement est terminé.
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {!isPast && (
              <Link to="/auth/register" className="btn-primary flex items-center gap-2">
                <Ticket size={16} />
                {event.ticket_price === 0 ? "S'inscrire gratuitement" : 'Acheter mon billet'}
              </Link>
            )}
            <Link to="/auth/login" className="btn-secondary">J'ai déjà un compte</Link>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-gradient-to-r from-orange-500/20 to-red-500/10 border border-orange-500/20 p-8 text-center">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            Rejoignez la communauté FoliX
          </h2>
          <p className="text-[var(--text-secondary)] mb-4">
            Partagez vos expériences et découvrez de nouveaux événements
          </p>
          <Link to="/auth/register" className="btn-primary inline-block">Créer mon compte</Link>
        </div>
      </div>
    </div>
  );
}
