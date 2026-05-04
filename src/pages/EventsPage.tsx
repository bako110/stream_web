import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Globe, Ticket, Clock, Heart, Share2 } from 'lucide-react';
import type { Event, PaginatedResponse } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { usePaginatedApi } from '../hooks/useApi';
import { Spinner } from '../components/ui/Spinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

function EventCard({ event }: { event: Event }) {
  const navigate  = useNavigate();
  const [liked,     setLiked]     = useState(false);
  const [shareOk,   setShareOk]   = useState(false);

  const color = TYPE_COLORS[event.event_type] ?? '#7B3FF2';
  const label = TYPE_LABELS[event.event_type] ?? event.event_type;

  const toggleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(v => !v);
    try {
      await apiClient.post(Endpoints.social.toggleReaction, {
        event_id: event.id, reaction_type: 'like',
      });
    } catch { setLiked(v => !v); }
  }, [event.id]);

  const share = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/events/${event.id}`;
    try {
      if (navigator.share) await navigator.share({ title: event.title, url });
      else await navigator.clipboard.writeText(url);
      setShareOk(true);
      setTimeout(() => setShareOk(false), 2000);
    } catch { /* ignore */ }
  }, [event.id, event.title]);

  return (
    <div className="group overflow-hidden transition-all duration-300 cursor-pointer"
      style={{ borderRadius: '1.25rem', border: '1px solid var(--border)', background: 'var(--surface)' }}
      onClick={() => navigate(`/events/${event.id}`)}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = color;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 16px 48px ${color}20`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}>

      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '16/9', background: 'var(--bg-tertiary)' }}>
        {event.thumbnail_url ? (
          <img src={event.thumbnail_url} alt={event.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${color}22, ${color}08)` }}>
            <Calendar size={40} style={{ color, opacity: 0.5 }} />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 55%)' }} />

        {/* Type badge */}
        <span className="absolute top-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-full text-white"
          style={{ background: color }}>
          {label}
        </span>

        {/* Free badge */}
        {event.access_type === 'free' && (
          <span className="absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(34,197,94,0.22)', color: '#22c55e', border: '1px solid #22c55e55' }}>
            Gratuit
          </span>
        )}

        {/* Date overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <span className="text-xs text-white/80 font-medium flex items-center gap-1">
            <Clock size={11} />
            {event.starts_at && format(new Date(event.starts_at), 'd MMM yyyy', { locale: fr })}
          </span>
          {event.access_type === 'ticket' && event.ticket_price != null && (
            <span className="text-xs font-black text-white flex items-center gap-1">
              <Ticket size={11} style={{ color: '#FF7A2F' }} />
              <span style={{ color: '#FF7A2F' }}>{event.ticket_price}€</span>
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <p className="font-bold text-sm leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>
          {event.title}
        </p>

        <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <div className="flex items-center gap-1.5">
            <Calendar size={11} />
            {event.starts_at && format(new Date(event.starts_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
          </div>
          {event.is_online ? (
            <div className="flex items-center gap-1.5"><Globe size={11} /> En ligne</div>
          ) : event.venue_city && (
            <div className="flex items-center gap-1.5">
              <MapPin size={11} />
              {event.venue_city}{event.venue_country ? `, ${event.venue_country}` : ''}
            </div>
          )}
          {event.max_attendees != null && (
            <div className="flex items-center gap-2">
              <Users size={11} />
              <span>{event.current_attendees ?? 0}/{event.max_attendees}</span>
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, ((event.current_attendees ?? 0) / event.max_attendees) * 100)}%`,
                    background: color,
                  }} />
              </div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={toggleLike}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: liked ? 'rgba(240,62,62,0.1)' : 'var(--bg-secondary)',
              color: liked ? '#f03e3e' : 'var(--text-tertiary)',
            }}>
            <Heart size={13} fill={liked ? 'currentColor' : 'none'} />
            J'aime
          </button>
          <button onClick={share}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: shareOk ? 'rgba(34,197,94,0.1)' : 'var(--bg-secondary)',
              color: shareOk ? '#22c55e' : 'var(--text-tertiary)',
            }}>
            <Share2 size={13} />
            {shareOk ? 'Copié !' : 'Partager'}
          </button>
          <button onClick={e => { e.stopPropagation(); navigate(`/events/${event.id}`); }}
            className="ml-auto text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: `${color}18`, color }}>
            Voir →
          </button>
        </div>
      </div>
    </div>
  );
}

const FILTERS = [
  { key: '',           label: 'Tous'        },
  { key: 'concert',   label: 'Concerts'    },
  { key: 'festival',  label: 'Festivals'   },
  { key: 'sport',     label: 'Sport'       },
  { key: 'conference',label: 'Conférences' },
  { key: 'theater',   label: 'Théâtre'     },
];

export default function EventsPage() {
  const [filter, setFilter] = useState('');

  const { items, loading, loadMore, page, pages } = usePaginatedApi<Event>(
    (p) => apiClient.get<PaginatedResponse<Event>>(
      `${Endpoints.events.list}?page=${p}&limit=20&status=published${filter ? `&event_type=${filter}` : ''}`
    ),
    [filter],
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Événements</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Concerts, festivals, conférences et plus</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: filter === f.key ? 'var(--primary)' : 'var(--bg-secondary)',
              color: filter === f.key ? '#fff' : 'var(--text-secondary)',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <Spinner />
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Chargement…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--bg-secondary)' }}>
            <Calendar size={28} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Aucun événement</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Revenez bientôt.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(ev => <EventCard key={ev.id} event={ev} />)}
          </div>
          {page < pages && (
            <div className="flex justify-center pt-2">
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
