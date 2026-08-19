import { PageLoader } from '../components/ui/Spinner';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useConfirm } from '../components/ui/Dialog';
import { useNavigate } from 'react-router-dom';
import { encodeId } from '../utils/slugId';
import {
  Calendar, Music2, MapPin, Clock, Ticket, ChevronRight,
  CalendarDays, Trash2, Plus, X, AlignLeft, User,
  UserPlus, Check, Search, Edit2,
} from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Spinner } from '../components/ui/Spinner';
import { Avatar } from '../components/ui/Avatar';
import { format, isPast, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserSuggestion {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean;
}

interface PlanningEntry {
  id: string;
  type: 'event' | 'concert' | 'personal' | 'invited' | 'my_concert' | 'my_event' | string;
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
  ref_id?: string | null;
  color?: string | null;
  invite_status?: 'pending' | 'accepted' | 'declined' | null;
  invite_message?: string | null;
  invites?: { id: string; status: string; invitee?: UserSuggestion | null }[];
  artist?: UserSuggestion | null;
  organizer?: UserSuggestion | null;
  venue?: string | null;
}

type TimeStatus = 'ongoing' | 'upcoming' | 'past';
type SectionKey = 'ongoing' | 'today' | 'tomorrow' | 'this_week' | 'later' | 'past';
type FilterTab  = 'all' | 'upcoming' | 'ongoing' | 'past';

const PALETTE = ['#7B3FF2', '#7B3FF2', '#7B3FF2', '#7B3FF2', '#7B3FF2', '#FF4757', '#7B3FF2', '#9B65F5'];

const TYPE_CONFIG: Record<string, { icon: React.FC<any>; label: string; color: string }> = {
  concert:    { icon: Music2,    label: 'Concert',       color: '#7B3FF2' },
  event:      { icon: Calendar,  label: 'Événement',     color: '#7B3FF2' },
  my_concert: { icon: Music2,    label: 'Mon Concert',   color: '#7B3FF2' },
  my_event:   { icon: Calendar,  label: 'Mon Événement', color: '#7B3FF2' },
  personal:   { icon: User,      label: 'Perso',         color: '#7B3FF2' },
  invited:    { icon: UserPlus,  label: 'Invitation',    color: '#7B3FF2' },
};

const SECTION_LABELS: Record<SectionKey, string> = {
  ongoing:   'En cours',
  today:     "Aujourd'hui",
  tomorrow:  'Demain',
  this_week: 'Cette semaine',
  later:     'Plus tard',
  past:      'Passés',
};

const SECTION_ORDER: SectionKey[] = ['ongoing', 'today', 'tomorrow', 'this_week', 'later', 'past'];

const TIME_STATUS_CONFIG: Record<TimeStatus, { label: string; color: string; bg: string }> = {
  ongoing:  { label: 'En cours', color: '#7B3FF2', bg: 'rgba(123,63,242,0.12)' },
  upcoming: { label: 'À venir',  color: '#7B3FF2', bg: 'rgba(123,63,242,0.12)' },
  past:     { label: 'Passé',    color: '#888',    bg: 'rgba(136,136,136,0.1)' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTimeStatus(entry: PlanningEntry): TimeStatus {
  const now   = Date.now();
  const start = entry.date     ? new Date(entry.date).getTime()     : null;
  const end   = entry.end_date ? new Date(entry.end_date).getTime() : null;
  if (!start) return 'upcoming';
  if (end) {
    if (now >= start && now <= end) return 'ongoing';
    if (now > end)                  return 'past';
    return 'upcoming';
  }
  if (now >= start && now <= start + 2 * 3600_000) return 'ongoing';
  if (now > start + 2 * 3600_000)                  return 'past';
  return 'upcoming';
}

function getSectionKey(entry: PlanningEntry): SectionKey {
  const ts = getTimeStatus(entry);
  if (ts === 'ongoing') return 'ongoing';
  if (ts === 'past')    return 'past';
  if (!entry.date) return 'later';
  const d   = new Date(entry.date);
  const now = new Date();
  const startOfToday    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday.getTime() + 86400_000);
  const startOfNextWeek = new Date(startOfToday.getTime() + 7 * 86400_000);
  if (d < startOfTomorrow)  return 'today';
  if (d < new Date(startOfTomorrow.getTime() + 86400_000)) return 'tomorrow';
  if (d < startOfNextWeek)  return 'this_week';
  return 'later';
}

function groupBySections(items: PlanningEntry[]) {
  const map = new Map<SectionKey, PlanningEntry[]>();
  for (const item of items) {
    const k = getSectionKey(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return SECTION_ORDER
    .filter(k => map.has(k))
    .map(k => ({ key: k, label: SECTION_LABELS[k], items: map.get(k)! }));
}

// ── ContactPicker ─────────────────────────────────────────────────────────────

function ContactPicker({
  selected, onToggle, onClose,
}: {
  selected: UserSuggestion[];
  onToggle: (u: UserSuggestion) => void;
  onClose: () => void;
}) {
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<UserSuggestion[]>([]);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [loading, setLoading]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiClient.get<UserSuggestion[]>(Endpoints.users.suggestions)
      .then(r => setSuggestions(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await apiClient.get<UserSuggestion[]>(`${Endpoints.search.query}?q=${encodeURIComponent(query.trim())}&type=users`);
        setResults(Array.isArray(r.data) ? r.data : (r.data as any)?.users ?? []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const displayList = query.trim().length >= 2 ? results : suggestions;
  const isSelected  = (u: UserSuggestion) => selected.some(s => s.id === u.id);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{ background: 'var(--surface)', maxHeight: '75vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Inviter des contacts</p>
          <button onClick={onClose}
            className="font-bold text-sm px-3 py-1 rounded-lg"
            style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)' }}>
            {selected.length > 0 ? `Confirmer (${selected.length})` : 'Fermer'}
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 mx-4 mt-3 mb-2 px-3 py-2 rounded-xl shrink-0"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <Search size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <input ref={inputRef} className="flex-1 bg-transparent text-sm outline-none"
            placeholder="Rechercher un utilisateur…"
            value={query} onChange={e => setQuery(e.target.value)}
            style={{ color: 'var(--text-primary)' }} />
          {loading && <Spinner size="sm" />}
          {query && !loading && <button onClick={() => setQuery('')}><X size={13} style={{ color: 'var(--text-tertiary)' }} /></button>}
        </div>

        {/* Selected chips */}
        {selected.length > 0 && (
          <div className="flex gap-2 px-4 pb-2 overflow-x-auto shrink-0">
            {selected.map(u => (
              <div key={u.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0"
                style={{ background: 'rgba(123,63,242,0.12)', border: '1px solid rgba(123,63,242,0.25)' }}>
                <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                  {u.display_name ?? u.username}
                </span>
                <button onClick={() => onToggle(u)}>
                  <X size={11} style={{ color: 'var(--primary)' }} />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="px-4 pb-1 text-[10px] font-bold tracking-widest shrink-0" style={{ color: 'var(--text-tertiary)' }}>
          {query.trim().length >= 2 ? 'RÉSULTATS' : 'SUGGESTIONS'}
        </p>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {displayList.length === 0 && !loading ? (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {query.length >= 2 ? 'Aucun résultat' : 'Aucune suggestion'}
            </p>
          ) : displayList.map(u => {
            const sel = isSelected(u);
            return (
              <button key={u.id} onClick={() => onToggle(u)}
                className="w-full flex items-center gap-3 px-4 py-3 transition-all text-left"
                style={{ borderBottom: '1px solid var(--border)', background: sel ? 'rgba(123,63,242,0.06)' : 'transparent' }}
                onMouseEnter={e => !sel && (e.currentTarget.style.background = 'var(--bg-secondary)')}
                onMouseLeave={e => !sel && (e.currentTarget.style.background = 'transparent')}>
                <Avatar src={u.avatar_url} name={u.display_name ?? u.username ?? '?'} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {u.display_name ?? u.username}
                  </p>
                  {u.username && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>@{u.username}</p>}
                </div>
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all"
                  style={{ background: sel ? 'var(--primary)' : 'transparent', border: `2px solid ${sel ? 'var(--primary)' : 'var(--border)'}` }}>
                  {sel && <Check size={12} color="#fff" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Create/Edit Modal ─────────────────────────────────────────────────────────

interface ModalState {
  editId?: string;
  title: string;
  description: string;
  date: string;
  time: string;
  endTime: string;
  location: string;
  color: string;
  inviteMsg: string;
  contacts: UserSuggestion[];
}

const DEFAULT_MODAL: ModalState = {
  title: '', description: '', date: '', time: '',
  endTime: '', location: '', color: PALETTE[0], inviteMsg: '', contacts: [],
};

function PlanningModal({
  state, onChange, onClose, onSaved,
}: {
  state: ModalState;
  onChange: (patch: Partial<ModalState>) => void;
  onClose: () => void;
  onSaved: (entry: PlanningEntry, isEdit: boolean) => void;
}) {
  const [saving, setSaving]           = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const isEdit = !!state.editId;

  const toggleContact = (u: UserSuggestion) => {
    const exists = state.contacts.some(c => c.id === u.id);
    onChange({ contacts: exists ? state.contacts.filter(c => c.id !== u.id) : [...state.contacts, u] });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!state.title.trim() || !state.date || !state.time) {
      toast.error('Titre et date/heure requis');
      return;
    }
    setSaving(true);
    try {
      const dateTime    = `${state.date}T${state.time}:00`;
      const endDateTime = state.endTime ? `${state.date}T${state.endTime}:00` : undefined;
      const payload: Record<string, unknown> = {
        title:          state.title.trim(),
        description:    state.description.trim() || undefined,
        date:           dateTime,
        end_date:       endDateTime,
        location:       state.location.trim() || undefined,
        color:          state.color,
        type:           'personal',
        invitee_ids:    state.contacts.map(c => c.id),
        invite_message: state.inviteMsg.trim() || undefined,
      };

      let entry: PlanningEntry;
      if (isEdit && state.editId) {
        const r = await apiClient.patch<any>(Endpoints.planning.entry(state.editId), payload);
        entry = r.data?.data ?? r.data;
        toast.success('Rendez-vous mis à jour !');
      } else {
        const r = await apiClient.post<any>(Endpoints.planning.entries, payload);
        entry = r.data?.data ?? r.data;
        if (state.contacts.length > 0) {
          toast.success(`Créé et ${state.contacts.length} invitation(s) envoyée(s) !`);
        } else {
          toast.success('Ajouté au planning !');
        }
      }
      onSaved(entry, isEdit);
      onClose();
    } catch {
      toast.error(isEdit ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92vh]"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${state.color}20` }}>
                {isEdit ? <Edit2 size={16} style={{ color: state.color }} /> : <CalendarDays size={16} style={{ color: state.color }} />}
              </div>
              <div>
                <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  {isEdit ? 'Modifier le rendez-vous' : 'Ajouter au planning'}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Événement personnel</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
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
                  <input className="input w-full pl-9" placeholder="Ex : Réunion d'équipe, Anniversaire…"
                    value={state.title} onChange={e => onChange({ title: e.target.value })} required maxLength={100} />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Description <span style={{ color: 'var(--text-tertiary)' }}>(optionnel)</span>
                </label>
                <textarea className="input w-full resize-none" rows={2}
                  placeholder="Détails…" value={state.description}
                  onChange={e => onChange({ description: e.target.value })} maxLength={300} />
              </div>

              {/* Date + heure */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Date <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input type="date" className="input w-full" value={state.date}
                    onChange={e => onChange({ date: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Heure début <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input type="time" className="input w-full" value={state.time}
                    onChange={e => onChange({ time: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Heure fin <span style={{ color: 'var(--text-tertiary)' }}>(optionnel)</span>
                  </label>
                  <input type="time" className="input w-full" value={state.endTime}
                    onChange={e => onChange({ endTime: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Lieu <span style={{ color: 'var(--text-tertiary)' }}>(optionnel)</span>
                  </label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
                    <input className="input w-full pl-9" placeholder="Adresse, ville…"
                      value={state.location} onChange={e => onChange({ location: e.target.value })} maxLength={150} />
                  </div>
                </div>
              </div>

              {/* Inviter contacts */}
              {!isEdit && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Inviter des contacts <span style={{ color: 'var(--text-tertiary)' }}>(optionnel)</span>
                  </label>
                  <button type="button" onClick={() => setShowContacts(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all"
                    style={{
                      background: state.contacts.length > 0 ? 'rgba(123,63,242,0.08)' : 'var(--bg-secondary)',
                      border: `1px solid ${state.contacts.length > 0 ? 'rgba(123,63,242,0.3)' : 'var(--border)'}`,
                      color: state.contacts.length > 0 ? 'var(--primary)' : 'var(--text-tertiary)',
                    }}>
                    <UserPlus size={15} />
                    <span className="flex-1 text-left">
                      {state.contacts.length > 0
                        ? `${state.contacts.length} contact${state.contacts.length > 1 ? 's' : ''} sélectionné${state.contacts.length > 1 ? 's' : ''}`
                        : 'Sélectionner des contacts…'}
                    </span>
                    <ChevronRight size={14} />
                  </button>
                  {state.contacts.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {state.contacts.map(u => (
                        <div key={u.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(123,63,242,0.1)', border: '1px solid rgba(123,63,242,0.2)' }}>
                          <Avatar src={u.avatar_url} name={u.display_name ?? u.username ?? '?'} size="xs" />
                          <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                            {u.display_name ?? u.username}
                          </span>
                          <button type="button" onClick={() => toggleContact(u)}>
                            <X size={11} style={{ color: 'var(--primary)' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {state.contacts.length > 0 && (
                    <div className="mt-2">
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        Message d'invitation <span style={{ color: 'var(--text-tertiary)' }}>(optionnel)</span>
                      </label>
                      <textarea className="input w-full resize-none" rows={2}
                        placeholder="Ex : N'oublie pas d'apporter ta guitare !"
                        value={state.inviteMsg} onChange={e => onChange({ inviteMsg: e.target.value })} maxLength={300} />
                    </div>
                  )}
                </div>
              )}

              {/* Couleur */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Couleur</label>
                <div className="flex gap-2 flex-wrap">
                  {PALETTE.map(c => (
                    <button key={c} type="button" onClick={() => onChange({ color: c })}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                      style={{
                        background: c,
                        border: state.color === c ? `3px solid var(--text-primary)` : '3px solid transparent',
                        transform: state.color === c ? 'scale(1.15)' : 'scale(1)',
                      }}>
                      {state.color === c && <Check size={14} color="#fff" />}
                    </button>
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
              <button type="submit" disabled={saving || !state.title.trim() || !state.date || !state.time}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: saving ? 'var(--primary)' : state.color }}>
                {saving
                  ? <><Spinner size="sm" /> {isEdit ? 'Mise à jour…' : 'Ajout…'}</>
                  : isEdit
                    ? <><Check size={15} /> Enregistrer</>
                    : <><Plus size={15} /> {state.contacts.length > 0 ? `Créer & inviter (${state.contacts.length})` : 'Ajouter au planning'}</>
                }
              </button>
            </div>
          </form>
        </div>
      </div>

      {showContacts && (
        <ContactPicker
          selected={state.contacts}
          onToggle={toggleContact}
          onClose={() => setShowContacts(false)}
        />
      )}
    </>
  );
}

// ── EntryCard ─────────────────────────────────────────────────────────────────

function EntryCard({
  entry, onDelete, onEdit, onAccept, onDecline,
}: {
  entry: PlanningEntry;
  onDelete: (id: string) => void;
  onEdit: (entry: PlanningEntry) => void;
  onAccept?: () => void;
  onDecline?: () => void;
}) {
  const navigate    = useNavigate();
  const { confirm, ConfirmDialog } = useConfirm();
  const isPersonal  = entry.type === 'personal';
  const isInvited   = entry.type === 'invited';
  const cfg         = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.event;
  const TypeIcon    = cfg.icon;
  const accent      = isPersonal ? (entry.color ?? cfg.color) : cfg.color;
  const timeStatus  = getTimeStatus(entry);
  const timeSt      = TIME_STATUS_CONFIG[timeStatus];
  const isPast      = timeStatus === 'past';

  function go(e: React.MouseEvent) {
    if (isPersonal || isInvited) return;
    e.stopPropagation();
    const rid = entry.ref_id ?? entry.event_id ?? entry.concert_id;
    if (!rid) return;
    if (entry.type === 'concert' || entry.type === 'my_concert') navigate(`/concerts/${encodeId(rid)}`);
    else navigate(`/events/${encodeId(rid)}`);
  }

  async function del(e: React.MouseEvent) {
    e.stopPropagation();
    const ok = await confirm({ title: 'Retirer du planning ?', danger: true, confirmLabel: 'Retirer' });
    if (!ok) return;
    try {
      await apiClient.delete(Endpoints.planning.entry(entry.id));
      onDelete(entry.id);
      toast.success('Retiré du planning');
    } catch { toast.error('Erreur'); }
  }

  return (
    <div className="rounded-2xl overflow-hidden group transition-all duration-200 cursor-pointer"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${isPast ? 'var(--border)' : accent}`,
        opacity: isPast ? 0.65 : 1,
      }}
      onClick={isPersonal ? () => onEdit(entry) : go}>

      <div className="p-4">
        {/* Titre + badges */}
        <div className="flex items-start gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: (isPast ? 'var(--bg-secondary)' : accent) + '20' }}>
            <TypeIcon size={15} style={{ color: isPast ? 'var(--text-tertiary)' : accent }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <p className="font-bold text-sm truncate" style={{ color: isPast ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                {entry.title}
              </p>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: timeSt.bg, color: timeSt.color }}>
                {timeSt.label}
              </span>
              {entry.status === 'live' && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded text-white"
                  style={{ background: '#EF4444' }}>LIVE</span>
              )}
              {entry.invite_status && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{
                    background: entry.invite_status === 'accepted' ? 'rgba(123,63,242,0.15)'
                      : entry.invite_status === 'declined' ? 'rgba(239,68,68,0.12)' : 'rgba(123,63,242,0.15)',
                    color: entry.invite_status === 'accepted' ? '#7B3FF2'
                      : entry.invite_status === 'declined' ? '#EF4444' : '#7B3FF2',
                  }}>
                  {entry.invite_status === 'accepted' ? 'Accepté' : entry.invite_status === 'declined' ? 'Refusé' : 'En attente'}
                </span>
              )}
            </div>
            {entry.description && (
              <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{entry.description}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {isPersonal && (
              <button onClick={e => { e.stopPropagation(); onEdit(entry); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `${accent}18`, color: accent }}>
                <Edit2 size={12} />
              </button>
            )}
            {isPersonal && (
              <button onClick={del}
                className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {format(new Date(entry.date), 'HH:mm', { locale: fr })}
            {entry.end_date && ` → ${format(new Date(entry.end_date), 'HH:mm', { locale: fr })}`}
          </span>
          {entry.location && (
            <span className="flex items-center gap-1">
              <MapPin size={11} />{entry.location}
            </span>
          )}
          {entry.venue && !isPersonal && (
            <span className="flex items-center gap-1">
              <MapPin size={11} />{entry.venue}
            </span>
          )}
          {entry.ticket_count != null && entry.ticket_count > 0 && (
            <span className="flex items-center gap-1" style={{ color: '#7B3FF2' }}>
              <Ticket size={11} />
              {entry.ticket_count} billet{entry.ticket_count > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Invite message */}
        {isInvited && entry.invite_message && (
          <p className="text-xs italic mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
            "{entry.invite_message}"
          </p>
        )}

        {/* Invitees avatars */}
        {isPersonal && entry.invites && entry.invites.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1.5">
              {entry.invites.slice(0, 5).map(inv => {
                const name = inv.invitee?.display_name ?? inv.invitee?.username ?? 'Invité';
                const statusLabel = inv.status === 'accepted' ? 'a accepté' : inv.status === 'declined' ? 'a refusé' : "n'a pas encore répondu";
                return (
                  <div key={inv.id} className="w-5 h-5 rounded-full overflow-hidden" title={`${name} ${statusLabel}`}
                    style={{
                      border: `2px solid ${inv.status === 'accepted' ? '#7B3FF2' : inv.status === 'declined' ? '#EF4444' : 'var(--border)'}`,
                    }}>
                    <Avatar src={inv.invitee?.avatar_url} name={name} size="xs" />
                  </div>
                );
              })}
              {entry.invites.length > 5 && (
                <span className="text-[10px] font-bold" style={{ color: 'var(--text-tertiary)' }}>+{entry.invites.length - 5}</span>
              )}
            </div>
            <span className="text-[11px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>
              {entry.invites.filter(i => i.status === 'accepted').length}/{entry.invites.length} ont accepté
            </span>
          </div>
        )}

        {/* Accept/Decline buttons */}
        {isInvited && entry.invite_status === 'pending' && onAccept && onDecline && (
          <div className="flex gap-2 mt-3">
            <button onClick={e => { e.stopPropagation(); onAccept(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
              style={{ background: '#7B3FF2' }}>
              <Check size={12} /> Accepter
            </button>
            <button onClick={e => { e.stopPropagation(); onDecline(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              Refuser
            </button>
          </div>
        )}

        {/* Lien detail pour events/concerts */}
        {!isPersonal && !isInvited && (entry.ref_id || entry.event_id || entry.concert_id) && (
          <div className="flex items-center justify-end mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--primary)' }}>
              Voir les détails <ChevronRight size={13} />
            </span>
          </div>
        )}
      </div>
      {ConfirmDialog}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',      label: 'Tout' },
  { key: 'ongoing',  label: 'En cours' },
  { key: 'upcoming', label: 'À venir' },
  { key: 'past',     label: 'Passés' },
];

export default function PlanningPage() {
  const [entries, setEntries]       = useState<PlanningEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<FilterTab>('upcoming');
  const [modal, setModal]           = useState<ModalState | null>(null);

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

  const openCreate = () => {
    const now = new Date();
    setModal({
      ...DEFAULT_MODAL,
      date: format(now, 'yyyy-MM-dd'),
      time: format(now, 'HH:mm'),
    });
  };

  const openEdit = useCallback((entry: PlanningEntry) => {
    const d = entry.date ? new Date(entry.date) : new Date();
    const ed = entry.end_date ? new Date(entry.end_date) : null;
    setModal({
      editId: entry.id,
      title: entry.title ?? '',
      description: entry.description ?? '',
      date: format(d, 'yyyy-MM-dd'),
      time: format(d, 'HH:mm'),
      endTime: ed ? format(ed, 'HH:mm') : '',
      location: entry.location ?? '',
      color: entry.color ?? PALETTE[0],
      inviteMsg: '',
      contacts: [],
    });
  }, []);

  const handleSaved = (entry: PlanningEntry, isEdit: boolean) => {
    if (isEdit) {
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, ...entry } : e));
    } else {
      setEntries(prev => [...prev, entry].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')));
    }
  };

  const handleDelete = (id: string) => setEntries(prev => prev.filter(e => e.id !== id));

  const handleRespondInvite = async (entry: PlanningEntry, status: 'accepted' | 'declined') => {
    try {
      await apiClient.patch<any>(Endpoints.planning.invite(entry.id), { status });
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, invite_status: status } : e));
      toast.success(status === 'accepted' ? 'Invitation acceptée !' : 'Invitation refusée');
    } catch { toast.error('Erreur'); }
  };

  const filtered = entries.filter(e => {
    if (filter === 'all') return true;
    const ts = getTimeStatus(e);
    return ts === filter;
  });

  const sections = groupBySections(filtered);

  const counts = {
    ongoing:  entries.filter(e => getTimeStatus(e) === 'ongoing').length,
    upcoming: entries.filter(e => getTimeStatus(e) === 'upcoming').length,
    past:     entries.filter(e => getTimeStatus(e) === 'past').length,
  };

  const pendingInvites = entries.filter(e => e.type === 'invited' && e.invite_status === 'pending').length;

  return (
    <div className="flex flex-col h-full relative" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center relative"
            style={{ background: 'rgba(123,63,242,0.12)' }}>
            <CalendarDays size={20} style={{ color: 'var(--primary)' }} />
            {pendingInvites > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                style={{ background: '#7B3FF2' }}>
                {pendingInvites}
              </span>
            )}
          </div>
          <div>
            <h1 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Mon Planning</h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {counts.upcoming} à venir · {entries.length} au total
            </p>
          </div>
        </div>
        <button onClick={openCreate}
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
        {FILTER_TABS.map(f => {
          const count = f.key === 'all' ? entries.length : counts[f.key as keyof typeof counts] ?? 0;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0"
              style={filter === f.key
                ? { background: 'var(--primary)', color: '#fff' }
                : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              {f.label}
              {count > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: filter === f.key ? 'rgba(255,255,255,0.25)' : 'var(--border)', color: filter === f.key ? '#fff' : 'var(--text-tertiary)' }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-6">
        {loading ? (
          <PageLoader />
        ) : sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--bg-secondary)' }}>
              <CalendarDays size={28} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="font-semibold text-sm text-center" style={{ color: 'var(--text-tertiary)' }}>
              {filter === 'all' ? 'Rien au planning' : `Aucun élément ${FILTER_TABS.find(t => t.key === filter)?.label.toLowerCase()}`}
            </p>
            <button onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--primary)', color: '#fff' }}>
              <Plus size={15} /> Ajouter au planning
            </button>
          </div>
        ) : sections.map(section => (
          <section key={section.key}>
            <div className="flex items-center gap-2 mb-3">
              {section.key === 'ongoing' && (
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#7B3FF2' }} />
              )}
              <p className="text-[10px] font-bold tracking-widest"
                style={{ color: section.key === 'past' ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}>
                {section.label.toUpperCase()}
              </p>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                {section.items.length}
              </span>
            </div>
            <div className="space-y-3">
              {section.items.map(entry => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onDelete={handleDelete}
                  onEdit={openEdit}
                  onAccept={entry.type === 'invited' && entry.invite_status === 'pending'
                    ? () => handleRespondInvite(entry, 'accepted') : undefined}
                  onDecline={entry.type === 'invited' && entry.invite_status === 'pending'
                    ? () => handleRespondInvite(entry, 'declined') : undefined}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* FAB mobile */}
      <button onClick={openCreate}
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl z-40 transition-all active:scale-95"
        style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', color: '#fff', boxShadow: '0 8px 24px rgba(123,63,242,0.4)' }}>
        <Plus size={24} />
      </button>

      {/* Modal */}
      {modal && (
        <PlanningModal
          state={modal}
          onChange={patch => setModal(prev => prev ? { ...prev, ...patch } : prev)}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
