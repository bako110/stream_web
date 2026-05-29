import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, MapPin, Ticket, Music, Plus, Trash2, Search, X, Users,
} from 'lucide-react';
import type { Concert } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Spinner } from '../components/ui/Spinner';
import { Avatar } from '../components/ui/Avatar';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

// ── LiveBadge ─────────────────────────────────────────────────────────────────
function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
      style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)' }}>
      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      LIVE
    </span>
  );
}

// ── ConcertCard ───────────────────────────────────────────────────────────────
function ConcertCard({ concert, onDelete }: { concert: Concert; onDelete: (id: string) => void }) {
  const navigate   = useNavigate();
  const isLive     = concert.status === 'live';
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Supprimer ce concert définitivement ?')) return;
    setDeleting(true);
    try {
      await apiClient.delete(Endpoints.concerts.byId(concert.id));
      onDelete(concert.id);
      toast.success('Concert supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
      setDeleting(false);
    }
  }, [concert.id, onDelete]);

  return (
    <div
      className="cursor-pointer group overflow-hidden transition-all duration-300"
      style={{ borderRadius: '1rem', border: '1px solid var(--border)', background: 'var(--surface)', borderLeft: '3px solid #FF7A2F' }}
      onClick={() => navigate(`/concerts/${concert.id}`)}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(255,122,47,0.15)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}>

      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '16/9', background: 'var(--bg-tertiary)' }}>
        {concert.thumbnail_url ? (
          <img src={concert.thumbnail_url} alt={concert.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,rgba(255,122,47,0.2),rgba(255,122,47,0.06))' }}>
            <Music size={40} style={{ color: '#FF7A2F', opacity: 0.5 }} />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%)' }} />

        {/* Badges haut */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {isLive && <LiveBadge />}
          {isLive && (
            <span className="flex items-center gap-1 text-xs text-white px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
              <Users size={10} /> {(concert.current_viewers ?? 0).toLocaleString()}
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{
              background: concert.access_type === 'free' ? 'rgba(34,197,94,0.2)' : concert.access_type === 'ticket' ? 'rgba(255,122,47,0.2)' : 'rgba(123,63,242,0.2)',
              color: concert.access_type === 'free' ? '#22c55e' : concert.access_type === 'ticket' ? '#FF7A2F' : 'var(--primary)',
              border: '1px solid currentColor',
            }}>
            {concert.access_type === 'free' ? 'Gratuit' : concert.access_type === 'ticket' ? `${concert.ticket_price ?? ''}€` : 'Abonnement'}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar src={concert.artist?.avatar_url} name={concert.artist?.display_name ?? concert.artist?.username ?? ''} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{concert.title}</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {concert.artist?.display_name ?? concert.artist?.username}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {!isLive && concert.scheduled_at && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {format(new Date(concert.scheduled_at), 'd MMM yyyy · HH:mm', { locale: fr })}
            </span>
          )}
          {concert.venue_city && (
            <span className="flex items-center gap-1"><MapPin size={11} />{concert.venue_city}</span>
          )}
          {concert.genre && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium"
              style={{ background: 'rgba(255,122,47,0.1)', color: '#FF7A2F' }}>
              {concert.genre}
            </span>
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
          <button onClick={e => { e.stopPropagation(); navigate(`/concerts/${concert.id}`); }}
            className="ml-auto text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: 'rgba(255,122,47,0.12)', color: '#FF7A2F' }}>
            Voir →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MyConcertsPage() {
  const navigate   = useNavigate();
  const { user }   = useAuthStore();
  const [items, setItems]       = useState<Concert[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    apiClient.get<Concert[]>(Endpoints.concerts.byUser(user.id))
      .then(r => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleDelete = (id: string) => setItems(prev => prev.filter(c => c.id !== id));

  const filtered = search.trim()
    ? items.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        (c.venue_city ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.genre ?? '').toLowerCase().includes(search.toLowerCase())
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
            style={{ background: 'rgba(255,122,47,0.12)' }}>
            <Music size={20} style={{ color: '#FF7A2F' }} />
          </div>
          <div>
            <h1 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Mes Concerts</h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {items.length} concert{items.length !== 1 ? 's' : ''} créé{items.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleSearch}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: searchOpen ? '#FF7A2F' : 'var(--bg-secondary)', color: searchOpen ? '#fff' : 'var(--text-tertiary)' }}>
            {searchOpen ? <X size={15} /> : <Search size={15} />}
          </button>
          <button onClick={() => navigate('/create/concert')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: '#FF7A2F', color: '#fff' }}>
            <Plus size={14} /> Publier
          </button>
        </div>
      </div>

      {/* Barre recherche */}
      {searchOpen && (
        <div className="flex items-center gap-2 px-4 py-2 shrink-0"
          style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
          <Search size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <input
            ref={searchRef}
            className="flex-1 bg-transparent text-sm outline-none"
            placeholder="Rechercher un concert, genre, ville…"
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
          MES CONCERTS
        </span>
        <button onClick={() => navigate('/create/concert')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
          style={{ background: 'rgba(255,122,47,0.1)', color: '#FF7A2F' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,122,47,0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,122,47,0.1)')}>
          <Plus size={12} /> Créer
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-20"><Spinner />
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Chargement…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,122,47,0.1)' }}>
              <Music size={28} style={{ color: '#FF7A2F' }} />
            </div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {items.length === 0 ? 'Aucun concert créé' : `Aucun résultat pour « ${search} »`}
            </p>
            <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
              {items.length === 0 ? 'Publiez votre premier concert et rejoignez votre audience.' : ''}
            </p>
            {items.length === 0 && (
              <button onClick={() => navigate('/create/concert')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: '#FF7A2F', color: '#fff' }}>
                <Plus size={15} /> Publier un concert
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(c => <ConcertCard key={c.id} concert={c} onDelete={handleDelete} />)}
          </div>
        )}
      </div>
    </div>
  );
}
