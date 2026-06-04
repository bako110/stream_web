import { useState } from 'react';
import { Link } from 'react-router-dom';
import { encodeId } from '../../utils/slugId';
import { Search, Music2, MapPin, Calendar, Radio, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useApi } from '../../hooks/useApi';
import { publicClient } from '../../api/client';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import type { Concert, PaginatedResponse } from '../../types';
import { MediaPlaceholder } from '../../components/ui/MediaPlaceholder';

const FILTERS = ['Tous', 'À venir', 'En direct'];

export default function ExploreConcertsPage() {
  const [filter, setFilter] = useState('Tous');
  const [search, setSearch] = useState('');

  const { data, loading, error } = useApi<PaginatedResponse<Concert> | Concert[]>(
    () => publicClient.get<PaginatedResponse<Concert> | Concert[]>(Endpoints.concerts.list),
    []
  );

  const items: Concert[] = Array.isArray(data) ? data : (data?.items ?? []);

  const now = new Date();
  const filtered = items.filter(concert => {
    const artistName = concert.artist?.display_name ?? concert.artist?.username ?? '';
    const matchSearch = !search ||
      concert.title.toLowerCase().includes(search.toLowerCase()) ||
      artistName.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    const date = new Date(concert.scheduled_at);
    if (filter === 'À venir')   return date > now && concert.status !== 'live';
    if (filter === 'En direct') return concert.status === 'live';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Music2 size={28} className="text-[var(--primary)]" />
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Concerts</h1>
        </div>
        <p className="text-[var(--text-secondary)]">
          Concerts en direct et à venir — vivez la musique en temps réel
        </p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Artiste ou concert..."
            className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                filter === f
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)]'
              }`}>
              {f === 'En direct' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
              {f}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Music2 size={40} className="text-[var(--text-tertiary)]" />
          <p className="text-[var(--text-secondary)]">{error}</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <>
          {filtered.some(c => c.status === 'live') && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Radio size={18} className="text-red-500" />
                En ce moment
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.filter(c => c.status === 'live').map(concert => (
                  <ConcertCard key={concert.id} concert={concert} isLive />
                ))}
              </div>
            </div>
          )}

          {filtered.filter(c => c.status !== 'live').length === 0 && !filtered.some(c => c.status === 'live') ? (
            <div className="text-center py-20 text-[var(--text-tertiary)]">
              {search ? `Aucun résultat pour "${search}"` : 'Aucun concert disponible pour le moment'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.filter(c => c.status !== 'live').map(concert => (
                <ConcertCard key={concert.id} concert={concert} />
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-16 rounded-2xl p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Ne manquez plus aucun concert
        </h2>
        <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
          Inscrivez-vous pour recevoir des alertes et acheter vos billets
        </p>
        <Link to="/auth/register"
          className="inline-block px-6 py-2.5 rounded-xl font-bold text-white transition-all"
          style={{ background: 'var(--primary)' }}>
          Créer mon compte
        </Link>
      </div>
    </div>
  );
}

function ConcertCard({ concert, isLive = false }: { concert: Concert; isLive?: boolean }) {
  const [imgErr, setImgErr] = useState(false);
  const date       = new Date(concert.scheduled_at);
  const artistName = concert.artist?.display_name ?? concert.artist?.username ?? null;
  const venue      = [concert.venue_name, concert.venue_city].filter(Boolean).join(', ');

  return (
    <Link to={`/explore/concerts/${encodeId(concert.id)}`}
      className="group block rounded-2xl overflow-hidden transition-all hover:scale-[1.01]"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="relative overflow-hidden" style={{ height: 176 }}>
        {concert.thumbnail_url && !imgErr ? (
          <img src={concert.thumbnail_url} alt={concert.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgErr(true)} />
        ) : (
          <div className="absolute inset-0">
            <MediaPlaceholder title={concert.title} icon={<Music2 size={40} color="#fff" />} />
          </div>
        )}
        {isLive && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 text-xs font-black text-white px-2.5 py-1 rounded-full"
            style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
          </div>
        )}
        {(concert.current_viewers ?? 0) > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-semibold text-white px-2 py-1 rounded-full"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
            <Users size={10} /> {(concert.current_viewers ?? 0).toLocaleString()}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold truncate group-hover:text-[var(--primary)] transition-colors"
          style={{ color: 'var(--text-primary)' }}>
          {concert.title}
        </h3>
        {artistName && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{artistName}</p>
        )}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <Calendar size={12} />
            <span>{format(date, 'd MMM yyyy à HH:mm', { locale: fr })}</span>
          </div>
          {venue && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <MapPin size={12} />
              <span className="truncate">{venue}</span>
            </div>
          )}
        </div>
        {concert.ticket_price != null && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
              {concert.ticket_price === 0 ? 'Gratuit' : `${concert.ticket_price} €`}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
              Voir les détails
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
