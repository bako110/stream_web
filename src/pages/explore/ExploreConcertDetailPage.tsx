import { useParams, Link } from 'react-router-dom';
import { Music2, MapPin, Calendar, Ticket, ArrowLeft, Radio } from 'lucide-react';
import { decodeId } from '../../utils/slugId';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useApi } from '../../hooks/useApi';
import { publicClient } from '../../api/client';
import { Endpoints } from '../../api/endpoints';
import { Spinner , PageLoader} from '../../components/ui/Spinner';
import type { Concert } from '../../types';

export default function ExploreConcertDetailPage() {
  const { id: slug } = useParams<{ id: string }>();
  const id            = decodeId(slug!);

  const { data: concert, loading } = useApi<Concert>(
    () => publicClient.get<Concert>(Endpoints.concerts.publicById(id)),
    [id]
  );

  if (loading) return <PageLoader />;

  if (!concert) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-[var(--text-tertiary)]">Concert introuvable</p>
        <Link to="/explore/concerts" className="btn-primary mt-4 inline-block">Retour</Link>
      </div>
    );
  }

  const date       = new Date(concert.scheduled_at);
  const isLive     = concert.status === 'live';
  const isPast     = date < new Date() && !isLive;
  const artistName = concert.artist?.display_name ?? concert.artist?.username ?? null;
  const venue      = [concert.venue_name, concert.venue_city, concert.venue_country].filter(Boolean).join(', ');

  return (
    <div>
      {/* Hero */}
      <div className="relative h-72 md:h-[420px] overflow-hidden">
        {concert.thumbnail_url || concert.banner_url ? (
          <img
            src={concert.banner_url ?? concert.thumbnail_url!}
            alt={concert.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/80 to-pink-900/80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/40 to-transparent" />

        <Link
          to="/explore/concerts"
          className="absolute top-4 left-4 flex items-center gap-2 text-white bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm hover:bg-black/60 transition-colors"
        >
          <ArrowLeft size={14} />
          Concerts
        </Link>

        {isLive && (
          <div className="absolute top-4 right-4 badge-live flex items-center gap-1.5 text-base px-4 py-1.5">
            <Radio size={14} />
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            EN DIRECT
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10 pb-16">
        <div className="card p-6 md:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center shrink-0">
              <Music2 size={24} className="text-[var(--primary)]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">{concert.title}</h1>
              {artistName && (
                <p className="text-lg text-[var(--text-secondary)] mt-1">{artistName}</p>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-[var(--bg-secondary)] rounded-xl p-4">
              <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-xs mb-1">
                <Calendar size={12} />
                <span>Date</span>
              </div>
              <p className="text-[var(--text-primary)] font-medium">
                {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
              </p>
              <p className="text-[var(--text-secondary)] text-sm">à {format(date, 'HH:mm')}</p>
            </div>

            {venue && (
              <div className="bg-[var(--bg-secondary)] rounded-xl p-4">
                <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-xs mb-1">
                  <MapPin size={12} />
                  <span>Lieu</span>
                </div>
                <p className="text-[var(--text-primary)] font-medium">{venue}</p>
              </div>
            )}

            {concert.ticket_price != null && (
              <div className="bg-[var(--bg-secondary)] rounded-xl p-4">
                <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-xs mb-1">
                  <Ticket size={12} />
                  <span>Tarif</span>
                </div>
                <p className="text-2xl font-bold text-[var(--primary)]">
                  {concert.ticket_price === 0 ? 'Gratuit' : `${concert.ticket_price} €`}
                </p>
              </div>
            )}
          </div>

          {concert.description && (
            <div className="mb-6">
              <h2 className="text-sm uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Description</h2>
              <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">{concert.description}</p>
            </div>
          )}

          {isLive && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
              <Radio size={20} className="text-red-400 shrink-0" />
              <div>
                <p className="text-red-400 font-semibold">Concert en direct maintenant !</p>
                <p className="text-[var(--text-secondary)] text-sm">Connectez-vous pour regarder le stream en temps réel</p>
              </div>
            </div>
          )}

          {isPast && (
            <div className="mb-6 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-tertiary)] text-sm">
              Ce concert est terminé. Rejoignez GoFolyX pour accéder aux replays.
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {isLive ? (
              <Link to="/auth/register" className="btn-primary flex items-center gap-2">
                <Radio size={16} />
                Regarder le live
              </Link>
            ) : !isPast ? (
              <Link to="/auth/register" className="btn-primary flex items-center gap-2">
                <Ticket size={16} />
                Acheter mon billet
              </Link>
            ) : (
              <Link to="/auth/register" className="btn-primary">Voir le replay</Link>
            )}
            <Link to="/auth/login" className="btn-secondary">J'ai déjà un compte</Link>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/10 border border-purple-500/20 p-8 text-center">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            Rejoignez GoFolyX pour ne rien manquer
          </h2>
          <p className="text-[var(--text-secondary)] mb-4">Lives, concerts, communauté — tout est là</p>
          <Link to="/auth/register" className="btn-primary inline-block">Inscription gratuite</Link>
        </div>
      </div>
    </div>
  );
}
