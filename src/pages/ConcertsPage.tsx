import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { encodeId } from '../utils/slugId';
import { Clock, MapPin, Ticket, Music, Users, Plus, Trash2 } from 'lucide-react';
import type { Concert, PaginatedResponse } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useApi, usePaginatedApi } from '../hooks/useApi';
import { Spinner, PageLoader } from '../components/ui/Spinner';
import { Avatar } from '../components/ui/Avatar';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

// ── Badges ────────────────────────────────────────────────────────────────────
function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full text-white"
      style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 0 12px rgba(123,63,242,0.4)' }}>
      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      LIVE
    </span>
  );
}

// ── ConcertCard ───────────────────────────────────────────────────────────────
function ConcertCard({
  concert, featured = false, mine, onDelete,
}: {
  concert: Concert;
  featured?: boolean;
  mine?: boolean;
  onDelete?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const isLive   = concert.status === 'live';
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Supprimer ce concert ?')) return;
    setDeleting(true);
    try {
      await apiClient.delete(Endpoints.concerts.byId(concert.id));
      onDelete?.(concert.id);
      toast.success('Concert supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
      setDeleting(false);
    }
  };

  return (
    <div
      className="cursor-pointer group overflow-hidden transition-all duration-300 relative"
      style={{
        borderRadius: '1rem',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        boxShadow: featured ? '0 8px 40px rgba(123,63,242,0.15)' : 'none',
      }}
      onClick={() => navigate(`/concerts/${encodeId(concert.id)}`)}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 40px rgba(123,63,242,0.2)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = featured ? '0 8px 40px rgba(123,63,242,0.15)' : 'none';
      }}>

      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '16/9', background: 'var(--bg-tertiary)' }}>
        {concert.thumbnail_url ? (
          <img src={concert.thumbnail_url} alt={concert.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,var(--bg-secondary),var(--bg-tertiary))' }}>
            <Music size={36} style={{ color: 'var(--text-tertiary)' }} />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {isLive && <LiveBadge />}
          {isLive && (
            <span className="flex items-center gap-1 text-xs text-white px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
              <Users size={10} /> {(concert.current_viewers ?? 0).toLocaleString()}
            </span>
          )}
        </div>

        {/* Access badge */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{
              background: concert.access_type === 'free'
                ? 'rgba(34,197,94,0.2)'
                : concert.access_type === 'ticket'
                ? 'rgba(123,63,242,0.2)'
                : 'rgba(123,63,242,0.2)',
              color: concert.access_type === 'free'
                ? '#22c55e' : concert.access_type === 'ticket'
                ? '#7B3FF2' : 'var(--primary)',
              border: '1px solid currentColor',
            }}>
            {concert.access_type === 'free' ? 'Gratuit' : concert.access_type === 'ticket' ? `${concert.ticket_price ?? ''}€` : 'Abonnement'}
          </span>
        </div>

        {/* Delete button for mine */}
        {mine && (
          <button onClick={handleDelete} disabled={deleting}
            className="absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            {deleting ? <Spinner size="sm" /> : <Trash2 size={14} color="white" />}
          </button>
        )}
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
              style={{ background: 'var(--bg-secondary)', color: 'var(--primary)' }}>
              {concert.genre}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── All concerts tab ──────────────────────────────────────────────────────────
function AllConcertsTab() {
  const live = useApi<Concert[]>(() => apiClient.get<Concert[]>(Endpoints.concerts.live));
  const { items, loading, loadMore, page, pages } = usePaginatedApi<Concert>(
    (p) => apiClient.get<PaginatedResponse<Concert>>(`${Endpoints.concerts.list}?page=${p}&limit=20&status=published`),
  );

  return (
    <div className="space-y-10">
      {/* Live now */}
      {!live.loading && live.data && live.data.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <LiveBadge />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>En direct maintenant</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {live.data.map(c => <ConcertCard key={c.id} concert={c} featured />)}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Ticket size={18} style={{ color: 'var(--primary)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Tous les concerts</h2>
        </div>
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20"><Spinner />
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Chargement…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--bg-secondary)' }}>
              <Music size={28} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Aucun concert disponible</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Revenez bientôt.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map(c => <ConcertCard key={c.id} concert={c} />)}
            </div>
            {page < pages && (
              <div className="flex justify-center mt-8">
                <button onClick={loadMore} disabled={loading} className="btn-secondary px-10">
                  {loading ? <Spinner size="sm" className="mx-auto" /> : 'Voir plus'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

// ── My concerts tab ───────────────────────────────────────────────────────────
function MyConcertsTab() {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const [items, setItems] = useState<Concert[]>([]);

  const { data, loading } = useApi<Concert[]>(
    () => user ? apiClient.get<Concert[]>(Endpoints.concerts.byUser(user.id)) : Promise.resolve({ data: [] } as any),
    [user?.id],
  );

  if (!loading && data && items.length === 0 && data.length > 0) setItems(data);

  const handleDelete = (id: string) => setItems(prev => prev.filter(c => c.id !== id));

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--text-tertiary)' }}>MES CONCERTS</p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {items.length} concert{items.length !== 1 ? 's' : ''} créé{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => navigate('/create/concert')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
          style={{ background: '#7B3FF2', color: '#fff' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          <Plus size={16} /> Créer un concert
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={{ border: '2px dashed var(--border)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(123,63,242,0.1)' }}>
            <Music size={28} style={{ color: '#7B3FF2' }} />
          </div>
          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Aucun concert créé</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Publiez votre premier concert et rejoignez votre audience.
          </p>
          <button onClick={() => navigate('/create/concert')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: '#7B3FF2', color: '#fff' }}>
            <Plus size={15} /> Créer un concert
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map(c => <ConcertCard key={c.id} concert={c} mine onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
type Tab = 'all' | 'mine';

export default function ConcertsPage() {
  const [tab, setTab] = useState<Tab>('all');

  const tabs: { val: Tab; label: string }[] = [
    { val: 'all',  label: 'Tous les concerts' },
    { val: 'mine', label: 'Mes concerts'       },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Concerts</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Vivez la musique en direct ou à la demande</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{ background: 'var(--bg-secondary)' }}>
        {tabs.map(t => (
          <button key={t.val} onClick={() => setTab(t.val)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={tab === t.val
              ? { background: 'var(--surface)', color: '#7B3FF2', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
              : { color: 'var(--text-secondary)' }}>
            <Music size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'all'  && <AllConcertsTab />}
      {tab === 'mine' && <MyConcertsTab />}
    </div>
  );
}
