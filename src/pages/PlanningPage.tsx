import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Music2, MapPin, Clock, Ticket, ChevronRight,
  CalendarDays, Trash2,
} from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Spinner } from '../components/ui/Spinner';
import { formatDistanceToNow, format, isPast, isToday, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface PlanningEntry {
  id: string;
  type: 'event' | 'concert' | string;
  title: string;
  date: string;
  location?: string | null;
  image_url?: string | null;
  ticket_count?: number;
  status?: string;
  event_id?: string | null;
  concert_id?: string | null;
}

function dateLabel(dateStr: string): { label: string; color: string } {
  const d = new Date(dateStr);
  if (isPast(d) && !isToday(d)) return { label: 'Termine', color: '#9CA3AF' };
  if (isToday(d))               return { label: "Aujourd'hui", color: '#36D9A0' };
  if (isTomorrow(d))            return { label: 'Demain', color: '#F59E0B' };
  return { label: format(d, 'd MMM yyyy', { locale: fr }), color: 'var(--primary)' };
}

function EntryCard({ entry, onDelete }: { entry: PlanningEntry; onDelete: (id: string) => void }) {
  const navigate = useNavigate();
  const { label, color } = dateLabel(entry.date);
  const isEvent   = entry.type === 'event';
  const Icon      = isEvent ? Calendar : Music2;
  const typeColor = isEvent ? '#F59E0B' : '#7B3FF2';

  function go() {
    if (entry.event_id)   navigate(`/events/${entry.event_id}`);
    if (entry.concert_id) navigate(`/concerts/${entry.concert_id}`);
  }

  async function del(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Retirer du planning ?')) return;
    try {
      await apiClient.delete(Endpoints.planning.entry(entry.id));
      onDelete(entry.id);
      toast.success('Retire du planning');
    } catch { toast.error('Erreur'); }
  }

  return (
    <div className="rounded-2xl overflow-hidden group cursor-pointer"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      onClick={go}>
      {entry.image_url && (
        <div className="relative h-36 overflow-hidden">
          <img src={entry.image_url} alt={entry.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)' }} />
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
              style={{ background: typeColor }}>
              {isEvent ? 'Evenement' : 'Concert'}
            </span>
          </div>
          <div className="absolute top-3 right-3">
            <button onClick={del}
              className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
              <Trash2 size={13} color="white" />
            </button>
          </div>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          {!entry.image_url && (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: typeColor + '20', color: typeColor }}>
              <Icon size={18} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>{entry.title}</p>
          </div>
          {!entry.image_url && (
            <button onClick={del}
              className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              style={{ background: '#EF444415', color: '#EF4444' }}>
              <Trash2 size={13} />
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Clock size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            <span className="text-xs font-semibold" style={{ color }}>
              {label}
              {!isPast(new Date(entry.date)) && (
                <span className="ml-1.5 font-normal" style={{ color: 'var(--text-tertiary)' }}>
                  · {format(new Date(entry.date), 'HH:mm', { locale: fr })}
                </span>
              )}
            </span>
          </div>
          {entry.location && (
            <div className="flex items-center gap-2">
              <MapPin size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <span className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{entry.location}</span>
            </div>
          )}
          {entry.ticket_count && entry.ticket_count > 0 && (
            <div className="flex items-center gap-2">
              <Ticket size={12} style={{ color: '#36D9A0', flexShrink: 0 }} />
              <span className="text-xs font-semibold" style={{ color: '#36D9A0' }}>
                {entry.ticket_count} billet{entry.ticket_count > 1 ? 's' : ''} confirme{entry.ticket_count > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end mt-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--primary)' }}>
            Voir les details <ChevronRight size={13} />
          </div>
        </div>
      </div>
    </div>
  );
}

type Filter = 'all' | 'upcoming' | 'past' | 'event' | 'concert';

const FILTERS: { val: Filter; label: string }[] = [
  { val: 'all',      label: 'Tout' },
  { val: 'upcoming', label: 'A venir' },
  { val: 'past',     label: 'Passes' },
  { val: 'event',    label: 'Evenements' },
  { val: 'concert',  label: 'Concerts' },
];

export default function PlanningPage() {
  const [entries,   setEntries]   = useState<PlanningEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<Filter>('upcoming');

  useEffect(() => {
    setLoading(true);
    apiClient.get<any>(Endpoints.planning.feed)
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : r.data?.items ?? r.data?.data ?? [];
        setEntries(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleDelete(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  const filtered = entries.filter(e => {
    const past = isPast(new Date(e.date)) && !isToday(new Date(e.date));
    if (filter === 'upcoming') return !past;
    if (filter === 'past')     return past;
    if (filter === 'event')    return e.type === 'event';
    if (filter === 'concert')  return e.type === 'concert';
    return true;
  });

  const today    = filtered.filter(e => isToday(new Date(e.date)));
  const upcoming = filtered.filter(e => !isPast(new Date(e.date)) && !isToday(new Date(e.date)));
  const past     = filtered.filter(e => isPast(new Date(e.date)) && !isToday(new Date(e.date)));

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(123,63,242,0.12)' }}>
            <CalendarDays size={20} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h1 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Mon Planning</h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{entries.length} element{entries.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 px-4 py-3 shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)' }}>
        {FILTERS.map(f => (
          <button key={f.val} onClick={() => setFilter(f.val)}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all"
            style={filter === f.val
              ? { background: 'var(--primary)', color: '#fff' }
              : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-60">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--bg-secondary)' }}>
              <CalendarDays size={28} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="font-semibold text-sm text-center" style={{ color: 'var(--text-tertiary)' }}>
              Aucun element dans votre planning
            </p>
            <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
              Ajoutez des evenements et concerts depuis leurs pages de detail.
            </p>
          </div>
        ) : (
          <>
            {today.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#36D9A0' }} />
                  <p className="text-[10px] font-bold tracking-widest" style={{ color: '#36D9A0' }}>AUJOURD'HUI</p>
                </div>
                <div className="space-y-3">
                  {today.map(e => <EntryCard key={e.id} entry={e} onDelete={handleDelete} />)}
                </div>
              </section>
            )}
            {upcoming.length > 0 && (
              <section>
                <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>A VENIR</p>
                <div className="space-y-3">
                  {upcoming.map(e => <EntryCard key={e.id} entry={e} onDelete={handleDelete} />)}
                </div>
              </section>
            )}
            {past.length > 0 && filter !== 'upcoming' && (
              <section>
                <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>PASSES</p>
                <div className="space-y-3 opacity-70">
                  {past.map(e => <EntryCard key={e.id} entry={e} onDelete={handleDelete} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
