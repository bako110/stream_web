import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decodeId } from '../../utils/slugId';
import {
  ArrowLeft, Calendar, MapPin, Globe, Plus, X, Check,
  Clock, Users, Trash2, Edit2,
} from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';
import { format, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CommunityEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  cover_url?: string | null;
  color?: string | null;
  is_online: boolean;
  starts_at: string;
  ends_at?: string | null;
  status: 'upcoming' | 'ongoing' | 'past' | 'cancelled';
  going_count: number;
  maybe_count: number;
  rsvp_status: 'going' | 'maybe' | 'not_going' | null;
  organizer?: { id: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; } | null;
}

type Filter = 'all' | 'upcoming' | 'past';
type RsvpStatus = 'going' | 'maybe' | 'not_going';

const EVENT_COLORS = ['#7B3FF2','#7B3FF2','#7B3FF2','#7B3FF2','#7B3FF2','#7B3FF2','#EF4444','#7B3FF2'];

// ── CreateEventModal ──────────────────────────────────────────────────────────

function CreateEventModal({ communityId, existing, onClose, onSaved }: {
  communityId: string;
  existing?: CommunityEvent | null;
  onClose: () => void;
  onSaved: (ev: CommunityEvent) => void;
}) {
  const [title,       setTitle]       = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [location,    setLocation]    = useState(existing?.location ?? '');
  const [isOnline,    setIsOnline]    = useState(existing?.is_online ?? false);
  const [startsDate,  setStartsDate]  = useState(existing?.starts_at ? existing.starts_at.slice(0,10) : '');
  const [startsTime,  setStartsTime]  = useState(existing?.starts_at ? existing.starts_at.slice(11,16) : '');
  const [endsDate,    setEndsDate]    = useState(existing?.ends_at ? existing.ends_at.slice(0,10) : '');
  const [endsTime,    setEndsTime]    = useState(existing?.ends_at ? existing.ends_at.slice(11,16) : '');
  const [color,       setColor]       = useState(existing?.color ?? EVENT_COLORS[0]);
  const [saving,      setSaving]      = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startsDate || !startsTime) { toast.error('Titre et date requis'); return; }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        location: isOnline ? undefined : location.trim() || undefined,
        is_online: isOnline,
        color,
        starts_at: `${startsDate}T${startsTime}:00`,
        ends_at: endsDate && endsTime ? `${endsDate}T${endsTime}:00` : undefined,
      };
      let ev: CommunityEvent;
      if (existing) {
        const r = await apiClient.patch<CommunityEvent>(`${Endpoints.communities.events(communityId)}/${existing.id}`, payload);
        ev = r.data;
        toast.success('Événement mis à jour');
      } else {
        const r = await apiClient.post<CommunityEvent>(Endpoints.communities.events(communityId), payload);
        ev = r.data;
        toast.success('Événement créé !');
      }
      onSaved(ev); onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Erreur');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            {existing ? 'Modifier l\'événement' : 'Créer un événement'}
          </p>
          <button onClick={onClose}><X size={18} style={{ color: 'var(--text-tertiary)' }} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Titre *</label>
              <input className="input w-full" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Nom de l'événement" />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Description</label>
              <textarea className="input w-full resize-none" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optionnel)" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Date début *</label>
                <input type="date" className="input w-full" value={startsDate} onChange={e => setStartsDate(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Heure début *</label>
                <input type="time" className="input w-full" value={startsTime} onChange={e => setStartsTime(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Date fin</label>
                <input type="date" className="input w-full" value={endsDate} onChange={e => setEndsDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Heure fin</label>
                <input type="time" className="input w-full" value={endsTime} onChange={e => setEndsTime(e.target.value)} />
              </div>
            </div>
            {/* En ligne toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <Globe size={16} style={{ color: 'var(--primary)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Événement en ligne</span>
              </div>
              <button type="button" onClick={() => setIsOnline(v => !v)}
                className="w-11 h-6 rounded-full relative transition-all"
                style={{ background: isOnline ? 'var(--primary)' : 'var(--border)' }}>
                <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                  style={{ left: isOnline ? 24 : 2 }} />
              </button>
            </div>
            {!isOnline && (
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Lieu</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
                  <input className="input w-full pl-9" value={location} onChange={e => setLocation(e.target.value)} placeholder="Adresse ou lieu" />
                </div>
              </div>
            )}
            {/* Couleur */}
            <div>
              <label className="text-xs font-semibold block mb-2" style={{ color: 'var(--text-secondary)' }}>Couleur</label>
              <div className="flex gap-2 flex-wrap">
                {EVENT_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className="w-8 h-8 rounded-xl transition-all flex items-center justify-center"
                    style={{ background: c, border: color === c ? '3px solid var(--text-primary)' : '3px solid transparent', transform: color === c ? 'scale(1.15)' : 'scale(1)' }}>
                    {color === c && <Check size={14} color="#fff" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="px-5 pb-5 pt-2 flex gap-3 shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              Annuler
            </button>
            <button type="submit" disabled={saving || !title.trim() || !startsDate || !startsTime}
              className="flex-1 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: color }}>
              {saving ? <Spinner size="sm" /> : <><Check size={15} /> {existing ? 'Enregistrer' : 'Créer'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── EventCard ─────────────────────────────────────────────────────────────────

function EventCard({ event, communityId, canManage, onRsvp, onEdit, onDelete }: {
  event: CommunityEvent;
  communityId: string;
  canManage: boolean;
  onRsvp: (id: string, status: RsvpStatus) => void;
  onEdit: (ev: CommunityEvent) => void;
  onDelete: (id: string) => void;
}) {
  const accent   = event.color ?? '#7B3FF2';
  const past     = isPast(new Date(event.starts_at)) && event.status !== 'ongoing';
  const cancelled = event.status === 'cancelled';

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderLeft: `3px solid ${cancelled ? '#9CA3AF' : accent}`, opacity: cancelled ? 0.7 : 1 }}>

      {event.cover_url && (
        <div className="relative h-32 overflow-hidden">
          <img src={event.cover_url} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent 50%)' }} />
        </div>
      )}

      <div className="p-4">
        {/* Titre + badges */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{event.title}</p>
            {cancelled && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#9CA3AF20', color: '#9CA3AF' }}>Annulé</span>}
            {event.status === 'ongoing' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#7B3FF220', color: '#7B3FF2' }}>En cours</span>}
          </div>
          {canManage && !cancelled && (
            <div className="flex gap-1 shrink-0">
              <button onClick={() => onEdit(event)}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                <Edit2 size={12} />
              </button>
              <button onClick={() => onDelete(event.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: '#EF444415', color: '#EF4444' }}>
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>

        {event.description && (
          <p className="text-xs mb-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{event.description}</p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {format(new Date(event.starts_at), "d MMM 'à' HH:mm", { locale: fr })}
            {event.ends_at && ` → ${format(new Date(event.ends_at), 'HH:mm', { locale: fr })}`}
          </span>
          {event.is_online
            ? <span className="flex items-center gap-1"><Globe size={11} /> En ligne</span>
            : event.location && <span className="flex items-center gap-1"><MapPin size={11} />{event.location}</span>
          }
          <span className="flex items-center gap-1">
            <Users size={11} /> {event.going_count} participent · {event.maybe_count} peut-être
          </span>
        </div>

        {/* Organisateur */}
        {event.organizer && (
          <div className="flex items-center gap-2 mb-3">
            <Avatar src={event.organizer.avatar_url} name={event.organizer.display_name ?? event.organizer.username ?? '?'} size="xs" />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Organisé par <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{event.organizer.display_name ?? event.organizer.username}</span>
            </span>
          </div>
        )}

        {/* RSVP */}
        {!past && !cancelled && (
          <div className="flex gap-2">
            {(['going', 'maybe', 'not_going'] as RsvpStatus[]).map(status => {
              const active = event.rsvp_status === status;
              const labels = { going: 'Participe', maybe: 'Peut-être', not_going: 'Absent' };
              const colors = { going: '#7B3FF2', maybe: '#7B3FF2', not_going: '#EF4444' };
              return (
                <button key={status} onClick={() => onRsvp(event.id, status)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: active ? colors[status] + '20' : 'var(--bg-secondary)',
                    color: active ? colors[status] : 'var(--text-secondary)',
                    border: `1px solid ${active ? colors[status] + '50' : 'var(--border)'}`,
                  }}>
                  {labels[status]}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CommunityEventsPage() {
  const { id: slug }  = useParams<{ id: string }>();
  const id             = decodeId(slug!);
  const navigate       = useNavigate();
  const { user: me }   = useAuthStore();
  const [events,    setEvents]    = useState<CommunityEvent[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [myRole,    setMyRole]    = useState<string | null>(null);
  const [filter,    setFilter]    = useState<Filter>('upcoming');
  const [showCreate,setShowCreate]= useState(false);
  const [editing,   setEditing]   = useState<CommunityEvent | null>(null);

  const canManage = myRole === 'admin' || myRole === 'moderator';

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [evR, memR] = await Promise.all([
        apiClient.get<any>(Endpoints.communities.events(id)),
        apiClient.get<any>(`/api/v1/communities/${id}/members`).catch(() => ({ data: [] })),
      ]);
      const list = Array.isArray(evR.data) ? evR.data : evR.data?.items ?? [];
      setEvents(list);
      const members = Array.isArray(memR.data) ? memR.data : memR.data?.items ?? [];
      const mine = members.find((m: any) => m.user_id === me?.id);
      setMyRole(mine?.role ?? null);
    } catch { }
    finally { setLoading(false); }
  }, [id, me?.id]);

  useEffect(() => { load(); }, [load]);

  async function handleRsvp(eventId: string, status: RsvpStatus) {
    try {
      const r = await apiClient.post<CommunityEvent>(`${Endpoints.communities.eventRsvp(id!, eventId)}?status=${status}`);
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, ...r.data } : e));
    } catch { toast.error('Erreur RSVP'); }
  }

  async function handleDelete(eventId: string) {
    if (!confirm('Supprimer cet événement ?')) return;
    try {
      await apiClient.delete(`${Endpoints.communities.events(id!)}/${eventId}`);
      setEvents(prev => prev.filter(e => e.id !== eventId));
      toast.success('Événement supprimé');
    } catch { toast.error('Erreur'); }
  }

  function handleSaved(ev: CommunityEvent) {
    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === ev.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = ev; return next; }
      return [ev, ...prev];
    });
  }

  const filtered = events.filter(e => {
    if (filter === 'upcoming') return !isPast(new Date(e.starts_at)) || e.status === 'ongoing';
    if (filter === 'past') return isPast(new Date(e.starts_at)) && e.status !== 'ongoing';
    return true;
  });

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl transition-all"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Événements</h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{filtered.length} événement{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {canManage && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: 'var(--primary)' }}>
            <Plus size={14} /> Créer
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {(['all','upcoming','past'] as Filter[]).map(f => {
          const labels = { all: 'Tous', upcoming: 'À venir', past: 'Passés' };
          return (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
              style={filter === f ? { background: 'var(--primary)', color: '#fff' } : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
              <Calendar size={28} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Aucun événement</p>
            {canManage && (
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: 'var(--primary)' }}>
                <Plus size={15} /> Créer un événement
              </button>
            )}
          </div>
        ) : filtered.map(ev => (
          <EventCard key={ev.id} event={ev} communityId={id!}
            canManage={canManage}
            onRsvp={handleRsvp}
            onEdit={e => setEditing(e)}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {(showCreate || editing) && (
        <CreateEventModal
          communityId={id!}
          existing={editing}
          onClose={() => { setShowCreate(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
