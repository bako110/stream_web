import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { encodeId } from '../../utils/slugId';
import { Search, Music2, MapPin, Calendar, Radio, Users, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useApi } from '../../hooks/useApi';
import { publicClient } from '../../api/client';
import { Endpoints } from '../../api/endpoints';
import type { Concert, PaginatedResponse } from '../../types';
import { MediaPlaceholder } from '../../components/ui/MediaPlaceholder';

const FILTERS = ['Tous', 'À venir', 'En direct'];

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.ex-rise');
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' },
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  });
}

export default function ExploreConcertsPage() {
  const [filter, setFilter] = useState('Tous');
  const [search, setSearch] = useState('');
  useScrollReveal();

  const { data, loading, error } = useApi<PaginatedResponse<Concert> | Concert[]>(
    () => publicClient.get<PaginatedResponse<Concert> | Concert[]>(Endpoints.concerts.list),
    []
  );

  const items: Concert[] = Array.isArray(data) ? data : (data?.items ?? []);
  const now = new Date();
  const filtered = items.filter(concert => {
    const artistName = concert.artist?.display_name ?? concert.artist?.username ?? '';
    const matchSearch = !search || concert.title.toLowerCase().includes(search.toLowerCase()) || artistName.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    const date = new Date(concert.scheduled_at);
    if (filter === 'À venir')   return date > now && concert.status !== 'live';
    if (filter === 'En direct') return concert.status === 'live';
    return true;
  });
  const live    = filtered.filter(c => c.status === 'live');
  const upNext  = filtered.filter(c => c.status !== 'live');

  return (
    <div className="w-full mx-auto px-5 py-16">
      <div className="mb-10 ex-rise">
        <div className="ex-rule mb-4"><span className="ex-eyebrow shrink-0" style={{ color: 'var(--ex-violet)' }}>Live</span></div>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="ex-display text-5xl md:text-6xl" style={{ color: 'var(--ex-text)' }}>Concerts</h1>
            <p className="mt-2 text-base" style={{ color: 'var(--ex-text-2)' }}>
              La musique en temps réel — vis la scène depuis n'importe où
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ex-text-3)' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Artiste ou concert…"
              className="w-full pl-10 pr-4 py-3 rounded-full text-sm focus:outline-none transition-colors"
              style={{ background: 'var(--ex-surface)', border: '1px solid var(--ex-line)', color: 'var(--ex-text)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--ex-violet)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--ex-line)')}
            />
          </div>
        </div>
      </div>

      <div className="mb-10 flex gap-2 flex-wrap ex-rise">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5"
            style={{
              background: filter === f ? 'var(--ex-violet)' : 'var(--ex-surface)',
              color:      filter === f ? '#fff' : 'var(--ex-text-2)',
              border:     `1px solid ${filter === f ? 'var(--ex-violet)' : 'var(--ex-line)'}`,
            }}>
            {f === 'En direct' && <span className="w-1.5 h-1.5 rounded-full" style={{ background: filter === f ? '#fff' : 'var(--ex-amber)' }} />}
            {f}
          </button>
        ))}
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <Music2 size={36} style={{ color: 'var(--ex-text-3)' }} />
          <p style={{ color: 'var(--ex-text-2)' }}>{error}</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ height: 260, background: 'var(--ex-surface)' }} />
          ))}
        </div>
      ) : (
        <>
          {live.length > 0 && (
            <div className="mb-12 ex-rise">
              <div className="flex items-center gap-2 mb-5">
                <Radio size={17} style={{ color: 'var(--ex-amber)' }} />
                <h2 className="ex-display text-xl" style={{ color: 'var(--ex-text)' }}>En ce moment</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {live.map((c, i) => <div key={c.id} className="ex-rise" style={{ animationDelay: `${i * 60}ms` }}><ConcertCard concert={c} isLive /></div>)}
              </div>
            </div>
          )}

          {upNext.length === 0 && live.length === 0 ? (
            <div className="text-center py-24" style={{ color: 'var(--ex-text-3)' }}>
              {search ? `Aucun résultat pour "${search}"` : 'Aucun concert disponible pour le moment'}
            </div>
          ) : upNext.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {upNext.map((c, i) => <div key={c.id} className="ex-rise" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}><ConcertCard concert={c} /></div>)}
            </div>
          )}
        </>
      )}

      <div className="mt-20 rounded-3xl px-8 py-14 text-center relative overflow-hidden ex-rise" style={{ background: 'var(--ex-ink)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(circle at 15% 20%, rgba(166,124,247,0.18), transparent 55%), radial-gradient(circle at 85% 80%, rgba(123,63,242,0.26), transparent 55%)',
        }} />
        <div className="relative z-10">
          <Music2 size={28} className="mx-auto mb-4" style={{ color: 'var(--ex-amber)' }} />
          <h2 className="ex-display text-3xl md:text-4xl text-white mb-3">Ne manque plus aucun concert</h2>
          <p className="mb-8 max-w-md mx-auto" style={{ color: 'rgba(245,243,250,0.7)' }}>
            Inscris-toi pour recevoir des alertes et acheter tes billets.
          </p>
          <Link to="/auth/register"
            className="inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-full text-base transition-transform hover:scale-105"
            style={{ background: 'var(--ex-amber)', color: 'var(--ex-ink)' }}>
            Créer mon compte
          </Link>
        </div>
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
      className="ex-stub ex-tile group block overflow-hidden"
      style={{ background: 'var(--ex-surface)', boxShadow: '0 10px 26px rgba(0,0,0,0.14)' }}>
      <div className="relative overflow-hidden" style={{ height: 176 }}>
        {concert.thumbnail_url && !imgErr ? (
          <img src={concert.thumbnail_url} alt={concert.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={() => setImgErr(true)} />
        ) : (
          <div className="absolute inset-0"><MediaPlaceholder title={concert.title} icon={<Music2 size={38} color="#fff" />} /></div>
        )}
        {isLive && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 text-xs font-black text-white px-2.5 py-1 rounded-full uppercase tracking-wider" style={{ background: 'var(--ex-amber)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
          </div>
        )}
        {(concert.current_viewers ?? 0) > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-semibold text-white px-2 py-1 rounded-full" style={{ background: 'rgba(10,8,18,0.55)' }}>
            <Users size={10} /> {(concert.current_viewers ?? 0).toLocaleString()}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold truncate transition-colors" style={{ color: 'var(--ex-text)' }}>{concert.title}</h3>
        {artistName && <p className="text-sm mt-0.5" style={{ color: 'var(--ex-text-2)' }}>{artistName}</p>}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ex-text-3)' }}>
            <Calendar size={12} /><span>{format(date, 'd MMM yyyy à HH:mm', { locale: fr })}</span>
          </div>
          {venue && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ex-text-3)' }}>
              <MapPin size={12} /><span className="truncate">{venue}</span>
            </div>
          )}
        </div>
        {concert.ticket_price != null && (
          <div className="mt-3 flex items-center justify-between" style={{ borderTop: '1px dashed var(--ex-line)', paddingTop: 10 }}>
            <span className="flex items-center gap-1 text-sm font-bold" style={{ color: 'var(--ex-violet)' }}>
              <Ticket size={13} /> {concert.ticket_price === 0 ? 'Gratuit' : `${concert.ticket_price} €`}
            </span>
            <span className="text-xs" style={{ color: 'var(--ex-text-3)' }}>Voir les détails →</span>
          </div>
        )}
      </div>
    </Link>
  );
}
