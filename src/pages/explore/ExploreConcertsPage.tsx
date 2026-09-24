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
import { ExploreBackButton } from '../../components/ui/ExploreBackButton';

const FILTERS = ['Tous', 'À venir', 'En direct'];

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.xp-rise');
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
    <div className="xp-container">
      <ExploreBackButton />
      <div className="xp-page-head xp-rise">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="xp-eyebrow">Live</span>
            <h1 className="xp-display xp-page-title">Concerts</h1>
            <p className="xp-page-sub">La musique en temps réel — vis la scène depuis n'importe où</p>
          </div>
          <div className="xp-search">
            <Search size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Artiste ou concert…" />
          </div>
        </div>
      </div>

      <div className="mb-8 flex gap-2 flex-wrap xp-rise">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`xp-tab${filter === f ? ' is-active' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            {f === 'En direct' && <span className="w-1.5 h-1.5 rounded-full" style={{ background: filter === f ? '#fff' : 'var(--xp-accent)' }} />}
            {f}
          </button>
        ))}
      </div>

      {error ? (
        <div className="xp-empty flex flex-col items-center gap-4">
          <Music2 size={32} />
          <p>{error}</p>
        </div>
      ) : loading ? (
        <div className="xp-grid-wide grid gap-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="xp-card"><div className="xp-card-media xp-card-media--wide xp-skeleton" /></div>)}
        </div>
      ) : (
        <>
          {live.length > 0 && (
            <div className="mb-10 xp-rise">
              <div className="flex items-center gap-2 mb-4">
                <Radio size={16} style={{ color: 'var(--xp-accent)' }} />
                <h2 className="xp-display text-lg">En ce moment</h2>
              </div>
              <div className="xp-grid-wide grid gap-6">
                {live.map((c, i) => <div key={c.id} className="xp-rise" style={{ animationDelay: `${i * 60}ms` }}><ConcertCard concert={c} isLive /></div>)}
              </div>
            </div>
          )}

          {upNext.length === 0 && live.length === 0 ? (
            <div className="xp-empty">{search ? `Aucun résultat pour "${search}"` : 'Aucun concert disponible pour le moment'}</div>
          ) : upNext.length > 0 && (
            <div className="xp-grid-wide grid gap-6">
              {upNext.map((c, i) => <div key={c.id} className="xp-rise" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}><ConcertCard concert={c} /></div>)}
            </div>
          )}
        </>
      )}

      <div className="xp-cta xp-rise">
        <Music2 size={26} className="mx-auto mb-4" style={{ color: 'var(--xp-accent)' }} />
        <h2 className="xp-display text-2xl sm:text-3xl mb-3" style={{ color: 'var(--xp-paper)' }}>Ne manque plus aucun concert</h2>
        <p className="mb-8 max-w-md mx-auto" style={{ color: 'rgba(245,244,242,0.65)' }}>Inscris-toi pour recevoir des alertes et acheter tes billets.</p>
        <Link to="/auth/register" className="xp-btn xp-btn-accent">Créer mon compte</Link>
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
    <Link to={`/explore/concerts/${encodeId(concert.id)}`} className="xp-card block">
      <div className="xp-card-media xp-card-media--wide">
        {concert.thumbnail_url && !imgErr ? (
          <img src={concert.thumbnail_url} alt={concert.title} onError={() => setImgErr(true)} />
        ) : (
          <div className="xp-card-media-fallback"><MediaPlaceholder title={concert.title} icon={<Music2 size={34} color="#fff" />} /></div>
        )}
        <div className="xp-card-scrim" />
        {isLive && <span className="xp-card-badge"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live</span>}
        {(concert.current_viewers ?? 0) > 0 && (
          <div className="xp-card-chip"><Users size={10} /> {(concert.current_viewers ?? 0).toLocaleString()}</div>
        )}
        <div className="xp-card-overlay">
          <p className="xp-card-overlay-title truncate">{concert.title}</p>
          {artistName && <p className="xp-card-overlay-sub truncate">{artistName}</p>}
        </div>
      </div>
      <div className="xp-card-footer">
        <span className="inline-flex items-center gap-1"><Calendar size={12} /> {format(date, 'd MMM à HH:mm', { locale: fr })}</span>
        {concert.ticket_price != null && (
          <span className="xp-card-price"><Ticket size={12} /> {concert.ticket_price === 0 ? 'Gratuit' : `${concert.ticket_price}€`}</span>
        )}
      </div>
      {venue && (
        <div className="px-3.5 pb-3 -mt-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--xp-text-3)' }}>
          <MapPin size={11} /><span className="truncate">{venue}</span>
        </div>
      )}
    </Link>
  );
}
