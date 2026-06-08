import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, MapPin, Users, Globe, Ticket, Clock,
  Plus, Trash2, Search, X,
} from 'lucide-react';
import type { Event } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Spinner , PageLoader} from '../components/ui/Spinner';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

const TYPE_LABELS: Record<string, string> = {
  concert: 'Concert', birthday: 'Anniversaire', festival: 'Festival',
  conference: 'Conférence', sport: 'Sport', theater: 'Théâtre',
  exhibition: 'Exposition', other: 'Autre',
};
const TYPE_COLORS: Record<string, string> = {
  concert: '#7B3FF2', festival: '#7B3FF2', sport: '#7B3FF2',
  conference: '#7B3FF2', theater: '#7B3FF2', exhibition: '#06B6D4',
  birthday: '#7B3FF2', other: '#6B7280',
};

// ── EventCard ─────────────────────────────────────────────────────────────────
function EventCard({ event, onDelete }: { event: Event; onDelete: (id: string) => void }) {
  const navigate     = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const color = TYPE_COLORS[event.event_type] ?? '#7B3FF2';
  const label = TYPE_LABELS[event.event_type] ?? event.event_type;

  const goEdit = () => navigate(`/create/event?edit=${event.id}`);

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Supprimer cet événement définitivement ?')) return;
    setDeleting(true);
    try {
      await apiClient.delete(Endpoints.events.byId(event.id));
      onDelete(event.id);
      toast.success('Événement supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
      setDeleting(false);
    }
  }, [event.id, onDelete]);

  return (
    <div className="group overflow-hidden transition-all duration-300 cursor-pointer"
      style={{ borderRadius: '1.25rem', border: '1px solid var(--border)', background: 'var(--surface)', borderLeft: `3px solid ${color}` }}
      onClick={goEdit}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 32px ${color}18`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}>

      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '16/9', background: 'var(--bg-tertiary)' }}>
        {event.thumbnail_url ? (
          <img src={event.thumbnail_url} alt={event.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${color}30, ${color}10)` }}>
            <Calendar size={40} style={{ color, opacity: 0.5 }} />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)' }} />

        {/* Badges */}
        <span className="absolute top-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-full text-white"
          style={{ background: color }}>{label}</span>
        {event.access_type === 'free' && (
          <span className="absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(34,197,94,0.22)', color: '#22c55e', border: '1px solid #22c55e55' }}>Gratuit</span>
        )}

        {/* Date + prix */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <span className="text-xs text-white/80 font-medium flex items-center gap-1">
            <Clock size={11} />
            {event.starts_at && format(new Date(event.starts_at), 'd MMM yyyy', { locale: fr })}
          </span>
          {event.access_type === 'ticket' && event.ticket_price != null && (
            <span className="text-xs font-black text-white flex items-center gap-1">
              <Ticket size={11} style={{ color: '#7B3FF2' }} />
              <span style={{ color: '#7B3FF2' }}>{event.ticket_price}€</span>
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
              <span>{event.current_attendees ?? 0} / {event.max_attendees} participants</span>
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, ((event.current_attendees ?? 0) / event.max_attendees) * 100)}%`, background: color }} />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}>
            {deleting ? <Spinner size="sm" /> : <Trash2 size={13} />}
            Supprimer
          </button>
          <button onClick={e => { e.stopPropagation(); goEdit(); }}
            className="ml-auto flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: `${color}18`, color }}>
            Modifier →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MyEventsPage() {
  const navigate     = useNavigate();
  const { user }     = useAuthStore();
  const [items, setItems] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    apiClient.get<Event[]>(Endpoints.events.byUser(user.id))
      .then(r => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleDelete = (id: string) => setItems(prev => prev.filter(e => e.id !== id));

  const filtered = search.trim()
    ? items.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.venue_city ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (e.venue_country ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const toggleSearch = () => {
    if (searchOpen) { setSearch(''); setSearchOpen(false); }
    else { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 60); }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(123,63,242,0.12)' }}>
            <Calendar size={20} style={{ color: '#7B3FF2' }} />
          </div>
          <div>
            <h1 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Mes Événements</h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {items.length} événement{items.length !== 1 ? 's' : ''} créé{items.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleSearch}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: searchOpen ? 'var(--primary)' : 'var(--bg-secondary)', color: searchOpen ? '#fff' : 'var(--text-tertiary)' }}>
            {searchOpen ? <X size={15} /> : <Search size={15} />}
          </button>
          <button onClick={() => navigate('/create/event')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: 'var(--primary)', color: '#fff' }}>
            <Plus size={14} /> Publier
          </button>
        </div>
      </div>

      {/* Barre de recherche */}
      {searchOpen && (
        <div className="flex items-center gap-2 px-4 py-2 shrink-0"
          style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
          <Search size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <input
            ref={searchRef}
            className="flex-1 bg-transparent text-sm outline-none"
            placeholder="Rechercher un événement…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ color: 'var(--text-primary)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ color: 'var(--text-tertiary)' }}>
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Section label */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
          MES ÉVÉNEMENTS
        </span>
        <button onClick={() => navigate('/create/event')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
          style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(123,63,242,0.18)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(123,63,242,0.1)')}>
          <Plus size={12} /> Créer
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? <PageLoader /> : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(123,63,242,0.1)' }}>
              <Calendar size={28} style={{ color: '#7B3FF2' }} />
            </div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {items.length === 0 ? 'Aucun événement créé' : `Aucun résultat pour « ${search} »`}
            </p>
            <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
              {items.length === 0 ? 'Publiez votre premier événement et invitez votre communauté.' : ''}
            </p>
            {items.length === 0 && (
              <button onClick={() => navigate('/create/event')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: 'var(--primary)', color: '#fff' }}>
                <Plus size={15} /> Publier un événement
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(ev => <EventCard key={ev.id} event={ev} onDelete={handleDelete} />)}
          </div>
        )}
      </div>
    </div>
  );
}
