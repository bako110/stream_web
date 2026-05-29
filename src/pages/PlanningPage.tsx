import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Music2, MapPin, Clock, Ticket, ChevronRight,
  CalendarDays, Trash2, Plus, X, AlignLeft, User,
} from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Spinner } from '../components/ui/Spinner';
import { formatDistanceToNow, format, isPast, isToday, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface PlanningEntry {
  id: string;
  type: 'event' | 'concert' | 'personal' | string;
  title: string;
  date: string;
  end_date?: string | null;
  description?: string | null;
  location?: string | null;
  image_url?: string | null;
  ticket_count?: number;
  status?: string;
  event_id?: string | null;
  concert_id?: string | null;
  color?: string | null;
}

const PALETTE = [
  '#7B3FF2', '#E0389A', '#FF7A2F', '#3B82F6',
  '#36D9A0', '#F59E0B', '#EF4444', '#8B5CF6',
];

function dateLabel(dateStr: string): { label: string; color: string } {
  const d = new Date(dateStr);
  if (isPast(d) && !isToday(d)) return { label: 'Terminé', color: '#9CA3AF' };
  if (isToday(d))               return { label: "Aujourd'hui", color: '#36D9A0' };
  if (isTomorrow(d))            return { label: 'Demain', color: '#F59E0B' };
  return { label: format(d, 'd MMM yyyy', { locale: fr }), color: 'var(--primary)' };
}

// ── EntryCard ─────────────────────────────────────────────────────────────────
function EntryCard({ entry, onDelete }: { entry: PlanningEntry; onDelete: (id: string) => void }) {
  const navigate = useNavigate();
  const { label, color } = dateLabel(entry.date);
  const isEvent   = entry.type === 'event';
  const isPersonal = entry.type === 'personal';
  const Icon      = isEvent ? Calendar : isPersonal ? User : Music2;
  const typeColor = entry.color ?? (isEvent ? '#F59E0B' : isPersonal ? '#7B3FF2' : '#FF7A2F');
  const typeLabel = isEvent ? 'Événement' : isPersonal ? 'Personnel' : 'Concert';

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
      toast.success('Retiré du planning');
    } catch { toast.error('Erreur'); }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden group transition-all duration-200"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${typeColor}`,
        cursor: (entry.event_id || entry.concert_id) ? 'pointer' : 'default',
      }}
      onClick={go}>

      {entry.image_url && (
        <div className="relative h-36 overflow-hidden">
          <img src={entry.image_url} alt={entry.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)' }} />
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white" style={{ background: typeColor }}>
              {typeLabel}
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
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: typeColor + '20', color: typeColor }}>
              <Icon size={16} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-bold text-sm leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{entry.title}</p>
              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: typeColor + '18', color: typeColor }}>{typeLabel}</span>
            </div>
            {entry.description && (
              <p className="text-xs line-clamp-1 mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{entry.description}</p>
            )}
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
              {entry.end_date && !isPast(new Date(entry.date)) && (
                <span className="ml-1" style={{ color: 'var(--text-tertiary)' }}>
                  → {format(new Date(entry.end_date), 'HH:mm', { locale: fr })}
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
                {entry.ticket_count} billet{entry.ticket_count > 1 ? 's' : ''} confirmé{entry.ticket_count > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {(entry.event_id || entry.concert_id) && (
          <div className="flex items-center justify-end mt-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--primary)' }}>
              Voir les détails <ChevronRight size={13} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Create Modal ──────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (entry: PlanningEntry) => void }) {
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [date,        setDate]        = useState('');
  const [time,        setTime]        = useState('');
  const [endTime,     setEndTime]     = useState('');
  const [location,    setLocation]    = useState('');
  const [color,       setColor]       = useState(PALETTE[0]);
  const [saving,      setSaving]      = useState(false);

  // Today as default date
  useEffect(() => {
    const now = new Date();
    setDate(format(now, 'yyyy-MM-dd'));
    setTime(format(now, 'HH:mm'));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date || !time) {
      toast.error('Titre et date/heure requis');
      return;
    }
    setSaving(true);
    try {
      const dateTime = `${date}T${time}:00`;
      const endDateTime = endTime ? `${date}T${endTime}:00` : undefined;
      const res = await apiClient.post<any>(Endpoints.planning.entries, {
        title:       title.trim(),
        description: description.trim() || undefined,
        date:        dateTime,
        end_date:    endDateTime,
        location:    location.trim() || undefined,
        color,
        type:        'personal',
      });
      const created: PlanningEntry = res.data?.data ?? res.data;
      onCreated(created);
      toast.success('Ajouté au planning !');
      onClose();
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `${color}20` }}>
              <CalendarDays size={18} style={{ color }} />
            </div>
            <div>
              <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Ajouter au planning</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Événement personnel</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">

            {/* Titre */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Titre <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div className="relative">
                <AlignLeft size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  className="input w-full pl-9"
                  placeholder="Ex : Réunion d'équipe, Anniversaire…"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Description <span style={{ color: 'var(--text-tertiary)' }}>(optionnel)</span>
              </label>
              <textarea
                className="input w-full resize-none"
                placeholder="Détails de l'événement…"
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={300}
              />
            </div>

            {/* Date + heure */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Date <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="date"
                  className="input w-full"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Heure début <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="time"
                  className="input w-full"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Heure fin + lieu */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Heure fin <span style={{ color: 'var(--text-tertiary)' }}>(optionnel)</span>
                </label>
                <input
                  type="time"
                  className="input w-full"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Lieu <span style={{ color: 'var(--text-tertiary)' }}>(optionnel)</span>
                </label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
                  <input
                    className="input w-full pl-9"
                    placeholder="Adresse, ville…"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    maxLength={150}
                  />
                </div>
              </div>
            </div>

            {/* Couleur */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                Couleur
              </label>
              <div className="flex gap-2 flex-wrap">
                {PALETTE.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className="w-8 h-8 rounded-xl transition-all"
                    style={{
                      background: c,
                      border: color === c ? `3px solid var(--text-primary)` : '3px solid transparent',
                      transform: color === c ? 'scale(1.15)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-5 pb-5 pt-2 shrink-0 flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              Annuler
            </button>
            <button type="submit" disabled={saving || !title.trim() || !date || !time}
              className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: saving ? 'var(--primary)' : color }}>
              {saving ? <><Spinner size="sm" /> Ajout…</> : <><Plus size={15} /> Ajouter au planning</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
type Filter = 'all' | 'upcoming' | 'past' | 'event' | 'concert' | 'personal';

const FILTERS: { val: Filter; label: string }[] = [
  { val: 'all',      label: 'Tout' },
  { val: 'upcoming', label: 'À venir' },
  { val: 'past',     label: 'Passés' },
  { val: 'event',    label: 'Événements' },
  { val: 'concert',  label: 'Concerts' },
  { val: 'personal', label: 'Personnel' },
];

export default function PlanningPage() {
  const [entries,    setEntries]    = useState<PlanningEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState<Filter>('upcoming');
  const [showModal,  setShowModal]  = useState(false);

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

  function handleCreated(entry: PlanningEntry) {
    setEntries(prev => [entry, ...prev]);
  }

  const filtered = entries.filter(e => {
    const past = isPast(new Date(e.date)) && !isToday(new Date(e.date));
    if (filter === 'upcoming') return !past;
    if (filter === 'past')     return past;
    if (filter === 'event')    return e.type === 'event';
    if (filter === 'concert')  return e.type === 'concert';
    if (filter === 'personal') return e.type === 'personal';
    return true;
  });

  const today    = filtered.filter(e => isToday(new Date(e.date)));
  const upcoming = filtered.filter(e => !isPast(new Date(e.date)) && !isToday(new Date(e.date)));
  const past     = filtered.filter(e => isPast(new Date(e.date)) && !isToday(new Date(e.date)));

  const upcomingCount = entries.filter(e => !isPast(new Date(e.date)) || isToday(new Date(e.date))).length;

  return (
    <div className="flex flex-col h-full relative" style={{ background: 'var(--bg)' }}>

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
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {upcomingCount} à venir · {entries.length} au total
            </p>
          </div>
        </div>

        {/* Bouton créer desktop */}
        <button onClick={() => setShowModal(true)}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
          style={{ background: 'var(--primary)', color: '#fff' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          <Plus size={16} /> Ajouter
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 px-4 py-3 shrink-0 overflow-x-auto scrollbar-hide"
        style={{ borderBottom: '1px solid var(--border)' }}>
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
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-24">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--bg-secondary)' }}>
              <CalendarDays size={28} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="font-semibold text-sm text-center" style={{ color: 'var(--text-tertiary)' }}>
              Aucun élément dans votre planning
            </p>
            <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
              Ajoutez des événements et concerts depuis leurs pages de détail, ou créez un élément personnel.
            </p>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--primary)', color: '#fff' }}>
              <Plus size={15} /> Ajouter au planning
            </button>
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
                <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>À VENIR</p>
                <div className="space-y-3">
                  {upcoming.map(e => <EntryCard key={e.id} entry={e} onDelete={handleDelete} />)}
                </div>
              </section>
            )}
            {past.length > 0 && filter !== 'upcoming' && (
              <section>
                <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>PASSÉS</p>
                <div className="space-y-3 opacity-70">
                  {past.map(e => <EntryCard key={e.id} entry={e} onDelete={handleDelete} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* FAB mobile */}
      <button onClick={() => setShowModal(true)}
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl z-40 transition-all active:scale-95"
        style={{ background: 'linear-gradient(135deg,var(--primary),#E0389A)', color: '#fff', boxShadow: '0 8px 24px rgba(123,63,242,0.4)' }}>
        <Plus size={24} />
      </button>

      {/* Modal */}
      {showModal && (
        <CreateModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
