import { useParams, useNavigate } from 'react-router-dom';
import { Radio, MapPin, Clock, Users, Ticket, Play } from 'lucide-react';
import type { Concert } from "../../types";
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ConcertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: concert, loading } = useApi<Concert>(() => apiClient.get<Concert>(Endpoints.concerts.byId(id!)), [id]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!concert) return <div className="p-6 text-[var(--text-secondary)]">Concert introuvable.</div>;

  const c = concert;
  const isLive = c.status === 'live';

  async function buyTicket() {
    await apiClient.post(Endpoints.concerts.buyTicket(c.id));
    alert('Ticket acheté !');
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Banner */}
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-[var(--bg-tertiary)]">
        {c.banner_url || c.thumbnail_url ? (
          <img src={c.banner_url ?? c.thumbnail_url ?? ''} className="w-full h-full object-cover" alt={c.title} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Radio size={48} className="text-[var(--text-tertiary)]" /></div>
        )}

        {isLive && (
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="badge-live flex items-center gap-1"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE</span>
            <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <Users size={12} /> {c.current_viewers.toLocaleString()} spectateurs
            </span>
          </div>
        )}
      </div>

      {/* Main info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-start gap-4">
            <Avatar src={c.artist?.avatar_url} name={c.artist?.display_name ?? c.artist?.username} size="lg" />
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{c.title}</h1>
              <p className="text-[var(--text-secondary)]">{c.artist?.display_name ?? c.artist?.username}</p>
              {c.genre && <span className="text-xs bg-brand-primary/20 text-brand-primary px-2 py-0.5 rounded-full mt-1 inline-block">{c.genre}</span>}
            </div>
          </div>

          {c.description && <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{c.description}</p>}

          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            {!isLive && (
              <div className="flex items-center gap-2"><Clock size={15} />{format(new Date(c.scheduled_at), 'd MMMM yyyy à HH:mm', { locale: fr })}</div>
            )}
            {c.venue_city && (
              <div className="flex items-center gap-2"><MapPin size={15} />{c.venue_name ? `${c.venue_name}, ` : ''}{c.venue_city}, {c.venue_country}</div>
            )}
            {c.duration_min && <div className="flex items-center gap-2"><Clock size={15} />{c.duration_min} minutes</div>}
          </div>
        </div>

        {/* CTA card */}
        <div className="card p-5 space-y-4">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Accès</p>
            <p className="font-bold text-xl text-[var(--text-primary)]">
              {c.access_type === 'free' ? 'Gratuit' :
               c.access_type === 'ticket' ? `${c.ticket_price ?? '?'}€` :
               c.access_type === 'subscription' ? 'Abonnement' : 'PPV'}
            </p>
          </div>

          {isLive ? (
            <button onClick={() => navigate(`/live/${c.id}`)} className="btn-primary w-full flex items-center justify-center gap-2">
              <Radio size={16} /> Regarder en direct
            </button>
          ) : c.status === 'ended' && c.video_url ? (
            <button onClick={() => navigate(`/live/${c.id}`)} className="btn-primary w-full flex items-center justify-center gap-2">
              <Play size={16} fill="white" /> Voir le replay
            </button>
          ) : (
            <>
              {c.access_type === 'ticket' && (
                <button onClick={buyTicket} className="btn-primary w-full flex items-center justify-center gap-2">
                  <Ticket size={16} /> Acheter un ticket
                </button>
              )}
              {c.access_type === 'free' && c.status === 'published' && (
                <p className="text-sm text-center text-[var(--text-secondary)]">Le concert n'a pas encore commencé.</p>
              )}
            </>
          )}

          {c.view_count > 0 && (
            <p className="text-xs text-center text-[var(--text-tertiary)]">{c.view_count.toLocaleString()} vues</p>
          )}
        </div>
      </div>
    </div>
  );
}
