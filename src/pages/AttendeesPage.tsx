import { PageLoader } from '../../components/ui/Spinner';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { decodeId } from '../utils/slugId';
import { ArrowLeft, Search, X, Download, Users, Check, Clock } from 'lucide-react';
import { apiClient } from '../api';
import { API_BASE_URL } from '../utils/constants';
import { Spinner } from '../components/ui/Spinner';
import toast from 'react-hot-toast';

const TIER_COLORS: Record<string, string> = { simple: '#7B3FF2', vip: '#7B3FF2', vvip: '#7B3FF2', vvvip: '#EF4444' };
const TIER_LABELS: Record<string, string> = { simple: 'STD', vip: 'VIP', vvip: 'VVIP', vvvip: 'VVVIP' };

interface Attendee {
  ticket_id:    string;
  display_name: string | null;
  username:     string | null;
  email:        string | null;
  avatar_url:   string | null;
  ticket_tier:  string;
  price_paid:   number;
  registered_at:string;
  status:       string;
}

function getInitials(name: string | null | undefined) {
  return (name ?? '?').split(' ').map(n => n[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';
}

export default function AttendeesPage() {
  const navigate         = useNavigate();
  const { id: slug }     = useParams<{ id: string }>();
  const id               = decodeId(slug!);
  const [attendees,    setAttendees]    = useState<Attendee[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [query,        setQuery]        = useState('');
  const [tab,          setTab]          = useState<'all' | 'used' | 'unused'>('all');
  const [exporting,    setExporting]    = useState(false);
  const [eventTitle,   setEventTitle]   = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [attRes, evRes] = await Promise.all([
        apiClient.get<Attendee[]>(`/api/v1/events/${id}/attendees`),
        apiClient.get<{ title: string }>(`/api/v1/events/${id}`).catch(() => ({ data: { title: '' } })),
      ]);
      setAttendees(attRes.data ?? []);
      setEventTitle(evRes.data.title ?? '');
    } catch {
      toast.error('Impossible de charger les inscrits');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const filtered = attendees.filter(a => {
    if (tab === 'used' && a.status !== 'used') return false;
    if (tab === 'unused' && a.status === 'used') return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return (
        (a.display_name ?? '').toLowerCase().includes(q) ||
        (a.username ?? '').toLowerCase().includes(q) ||
        (a.email ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExport = async () => {
    if (!id) return;
    setExporting(true);
    try {
      const raw   = localStorage.getItem('gofolyx-auth-tokens');
      const token = raw ? (JSON.parse(raw)?.access ?? JSON.parse(raw)?.access_token ?? null) : null;
      const res   = await fetch(`${API_BASE_URL}/api/v1/events/${id}/attendees/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `inscrits_${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export impossible pour le moment');
    } finally {
      setExporting(false);
    }
  };

  const usedCount   = attendees.filter(a => a.status === 'used').length;
  const unusedCount = attendees.filter(a => a.status !== 'used').length;
  const revenue     = attendees.reduce((s, a) => s + (Number(a.price_paid) || 0), 0);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg,var(--primary),#5B2EC4)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.2)' }}>
          <ArrowLeft size={20} color="#fff" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-black text-lg text-white">Inscrits</p>
          {eventTitle && <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>{eventTitle}</p>}
        </div>
        <button onClick={handleExport} disabled={exporting}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.2)', opacity: exporting ? 0.6 : 1 }}>
          {exporting ? <Spinner size="sm" /> : <Download size={18} color="#fff" />}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        {[
          { value: attendees.length,        label: 'Total',      color: 'var(--text-primary)' },
          { value: usedCount,               label: 'Entrés',     color: '#10B981' },
          { value: unusedCount,             label: 'En attente', color: 'var(--primary)' },
          { value: `${revenue.toFixed(0)} €`, label: 'Revenus', color: 'var(--text-primary)' },
        ].map((s, i) => (
          <div key={i} className="flex flex-col items-center py-4"
            style={{ borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
            <span className="text-xl font-black" style={{ color: s.color }}>{s.value}</span>
            <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Search + tabs */}
      <div className="px-4 py-3 space-y-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <Search size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher un inscrit..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text-primary)' }} />
          {query && (
            <button onClick={() => setQuery('')}>
              <X size={14} style={{ color: 'var(--text-tertiary)' }} />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {(['all', 'unused', 'used'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                background: tab === t ? 'var(--primary)22' : 'transparent',
                border:     `1px solid ${tab === t ? 'var(--primary)' : 'var(--border)'}`,
                color:      tab === t ? 'var(--primary)' : 'var(--text-tertiary)',
              }}>
              {t === 'all' ? 'Tous' : t === 'used' ? 'Entrés' : 'En attente'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16" style={{ color: 'var(--text-tertiary)' }}>
          <Users size={48} />
          <p className="font-semibold">{query ? 'Aucun résultat' : 'Aucun inscrit pour le moment'}</p>
        </div>
      ) : (
        <div>
          {filtered.map((a, i) => {
            const name = a.display_name ?? a.username ?? 'Utilisateur';
            const tc   = TIER_COLORS[a.ticket_tier] ?? TIER_COLORS.simple;
            const tl   = TIER_LABELS[a.ticket_tier] ?? a.ticket_tier.toUpperCase();
            return (
              <div key={a.ticket_id} className="flex items-center gap-3 px-4 py-4"
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                {a.avatar_url
                  ? <img src={a.avatar_url} className="w-11 h-11 rounded-full object-cover flex-shrink-0" alt="" />
                  : <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,var(--primary),#5B2EC4)', color: '#fff' }}>
                      {getInitials(name)}
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                    {a.username ? `@${a.username}` : ''}{a.email ? ` · ${a.email}` : ''}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs font-black px-1.5 py-0.5 rounded"
                      style={{ background: `${tc}18`, border: `1px solid ${tc}40`, color: tc }}>{tl}</span>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {(Number(a.price_paid) || 0) === 0 ? 'Gratuit' : `${Number(a.price_paid).toFixed(2)} €`}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      · {new Date(a.registered_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: a.status === 'used' ? '#10B98118' : 'var(--bg)',
                    border: `1px solid ${a.status === 'used' ? '#10B981' : 'var(--border)'}`,
                  }}>
                  {a.status === 'used' ? (
                    <><Check size={11} color="#10B981" /><span className="text-xs font-bold ml-1" style={{ color: '#10B981' }}>Entré</span></>
                  ) : (
                    <><Clock size={11} style={{ color: 'var(--text-tertiary)' }} /><span className="text-xs font-bold ml-1" style={{ color: 'var(--text-tertiary)' }}>En attente</span></>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
