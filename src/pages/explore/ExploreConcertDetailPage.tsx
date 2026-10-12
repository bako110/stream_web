import { useParams, Link } from 'react-router-dom';
import { MapPin, Calendar, Ticket, ArrowLeft, Radio, Play } from 'lucide-react';
import { decodeId } from '../../utils/slugId';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useApi } from '../../hooks/useApi';
import { publicClient } from '../../api/client';
import { Endpoints } from '../../api/endpoints';
import { PageLoader } from '../../components/ui/Spinner';
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
      <div className="w-full mx-auto px-4 py-16 text-center">
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

  const facts = [
    { icon: Calendar, label: 'Date', value: format(date, 'EEEE d MMMM yyyy', { locale: fr }), sub: `à ${format(date, 'HH:mm')}` },
    venue ? { icon: MapPin, label: 'Lieu', value: venue } : null,
    concert.ticket_price != null
      ? { icon: Ticket, label: 'Entrée', value: concert.ticket_price === 0 ? 'Gratuit' : `${concert.ticket_price} €` }
      : null,
  ].filter(Boolean) as { icon: typeof Calendar; label: string; value: string; sub?: string }[];

  const cta = isLive
    ? { icon: Radio, text: 'Regarder le live' }
    : isPast
      ? { icon: Play, text: 'Voir le replay' }
      : { icon: Ticket, text: 'Réserver ma place' };
  const CtaIcon = cta.icon;

  return (
    <div className="xp-container pt-2 md:pt-4 pb-16">
      <Link to="/explore/concerts" className="xp-back">
        <ArrowLeft size={15} />
        Concerts
      </Link>

      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-6 lg:gap-10 items-start mt-2">
        {/* Visuel */}
        <div className="relative rounded-3xl overflow-hidden aspect-[4/3] sm:aspect-video lg:aspect-[4/3]"
          style={{ background: 'linear-gradient(135deg,#1a1033,#2d1b69)' }}>
          {(concert.banner_url || concert.thumbnail_url) && (
            <img src={concert.banner_url ?? concert.thumbnail_url!} alt={concert.title}
              className="absolute inset-0 w-full h-full object-cover" />
          )}
          {isLive && (
            <span className="absolute top-4 left-4 flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold tracking-wider text-white"
              style={{ background: '#EF4444', boxShadow: '0 4px 14px rgba(239,68,68,0.5)' }}>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> EN DIRECT
            </span>
          )}
          {isPast && (
            <span className="absolute top-4 left-4 px-3.5 py-1.5 rounded-full text-xs font-bold text-white"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
              Terminé
            </span>
          )}
        </div>

        {/* Infos */}
        <div className="lg:sticky lg:top-24">
          <span className="xp-eyebrow">Concert</span>
          <h1 className="xp-display text-3xl sm:text-4xl leading-tight mt-2" style={{ color: 'var(--xp-text)' }}>
            {concert.title}
          </h1>
          {artistName && (
            <p className="text-lg mt-1.5" style={{ color: 'var(--xp-text-2)' }}>{artistName}</p>
          )}

          <ul className="mt-6 divide-y" style={{ borderTop: '1px solid var(--xp-line)', borderBottom: '1px solid var(--xp-line)' }}>
            {facts.map(({ icon: Icon, label, value, sub }) => (
              <li key={label} className="flex items-center gap-4 py-3.5" style={{ borderColor: 'var(--xp-line)' }}>
                <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--xp-accent)' }}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs" style={{ color: 'var(--xp-text-3)' }}>{label}</p>
                  <p className="font-semibold" style={{ color: 'var(--xp-text)' }}>
                    {value}{sub && <span className="font-normal" style={{ color: 'var(--xp-text-2)' }}> · {sub}</span>}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-3">
            <Link to="/auth/register" className="xp-btn xp-btn-accent w-full justify-center">
              <CtaIcon size={17} /> {cta.text}
            </Link>
            <p className="text-center text-sm" style={{ color: 'var(--xp-text-2)' }}>
              Déjà inscrit ? <Link to="/auth/login" className="font-semibold underline" style={{ color: 'var(--xp-text)' }}>Se connecter</Link>
            </p>
          </div>
        </div>
      </div>

      {concert.description && (
        <section className="mt-10 max-w-3xl">
          <h2 className="xp-display text-xl mb-3" style={{ color: 'var(--xp-text)' }}>À propos</h2>
          <p className="leading-relaxed whitespace-pre-line" style={{ color: 'var(--xp-text-2)' }}>{concert.description}</p>
        </section>
      )}
    </div>
  );
}
