import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Zap, MapPin, Search, X, Clock } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import { encodeId } from '../../utils/slugId';
import type { Event } from '../../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_COLORS: Record<string, string> = {
  concert: '#7B3FF2', festival: '#7B3FF2', sport: '#10B981',
  conference: '#06B6D4', theater: '#F59E0B', exhibition: '#EC4899',
  birthday: '#EF4444', other: '#6B7280',
};
const TYPE_LABELS: Record<string, string> = {
  concert: 'Concert', festival: 'Festival', sport: 'Sport',
  conference: 'Conférence', theater: 'Théâtre', exhibition: 'Expo',
  birthday: 'Anniversaire', other: 'Autre',
};

function SectionLabel({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3"
      style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <span>{icon}</span>
      <div>
        <p className="text-xs font-black tracking-wide" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>
      </div>
    </div>
  );
}

function EventRow({ ev, onClick }: { ev: Event; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const isBoosted = ev.is_boosted ?? false;
  const date      = new Date(ev.starts_at);
  const dd        = date.getDate().toString().padStart(2, '0');
  const mo        = format(date, 'MMM', { locale: fr }).toUpperCase();
  const time      = format(date, 'HH:mm');
  const typeColor = TYPE_COLORS[ev.event_type ?? ''] ?? '#6B7280';
  const typeLabel = TYPE_LABELS[ev.event_type ?? ''] ?? 'Autre';
  const location  = [ev.venue_name, ev.venue_city].filter(Boolean).join(', ');
  const isPast    = date < new Date();

  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-all cursor-pointer"
      onClick={onClick}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

      {/* Date block */}
      <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 overflow-hidden"
        style={{ background: isPast ? 'var(--bg-tertiary)' : `linear-gradient(135deg, ${typeColor}22, ${typeColor}11)`, border: `1px solid ${typeColor}33` }}>
        <span className="text-lg font-black leading-none" style={{ color: isPast ? 'var(--text-tertiary)' : typeColor }}>{dd}</span>
        <span className="text-[9px] font-bold tracking-wider" style={{ color: isPast ? 'var(--text-tertiary)' : typeColor }}>{mo}</span>
      </div>

      {/* Thumbnail */}
      {ev.thumbnail_url && !imgErr ? (
        <img src={ev.thumbnail_url} alt={ev.title}
          className="w-14 h-12 rounded-xl object-cover shrink-0"
          onError={() => setImgErr(true)} />
      ) : (
        <div className="w-14 h-12 rounded-xl shrink-0 flex items-center justify-center"
          style={{ background: `${typeColor}18` }}>
          <Calendar size={18} style={{ color: typeColor }} />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-semibold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>{ev.title}</p>
          {isBoosted && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
              <Zap size={9} fill="currentColor" /> Boosté
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: `${typeColor}15`, color: typeColor }}>
            {typeLabel}
          </span>
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <Clock size={10} />{time}
          </span>
          {location && (
            <span className="flex items-center gap-1 text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
              <MapPin size={10} />{location}
            </span>
          )}
        </div>
        {ev.ticket_price != null && (
          <p className="text-xs font-bold mt-0.5" style={{ color: typeColor }}>
            {ev.ticket_price === 0 ? 'Gratuit' : `${ev.ticket_price}€`}
          </p>
        )}
      </div>
    </div>
  );
}

export default function DiscoverEventsPage() {
  const navigate   = useNavigate();
  const [all,      setAll]      = useState<Event[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,  setHasMore]  = useState(true);
  const [page,     setPage]     = useState(1);
  const [query,    setQuery]    = useState('');

  const load = useCallback(async (reset = false) => {
    const nextPage = reset ? 1 : page + 1;
    if (reset) { setLoading(true); setAll([]); setPage(1); }
    else setLoadingMore(true);
    try {
      const res = await apiClient.get<any>(`${Endpoints.events.list}?page=${nextPage}&limit=20`);
      const raw = res.data;
      const items: Event[] = Array.isArray(raw) ? raw : raw?.items ?? raw?.data ?? raw?.results ?? [];
      if (reset) setAll(items); else setAll(prev => [...prev, ...items]);
      setPage(nextPage);
      setHasMore(items.length === 20);
    } catch { if (reset) setAll([]); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [page]);

  useEffect(() => { load(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const now      = new Date();
  const filtered = query.trim()
    ? all.filter(ev => ev.title.toLowerCase().includes(query.toLowerCase())
        || (ev.venue_city ?? '').toLowerCase().includes(query.toLowerCase()))
    : all;

  const boosted  = filtered.filter(ev => ev.is_boosted);
  const upcoming = filtered.filter(ev => !ev.is_boosted && new Date(ev.starts_at) >= now);
  const past     = filtered.filter(ev => !ev.is_boosted && new Date(ev.starts_at) < now);

  function renderSection(list: Event[], icon: React.ReactNode, label: string, sub: string) {
    if (list.length === 0) return null;
    return (
      <>
        <SectionLabel icon={icon} label={label} sub={sub} />
        {list.map(ev => (
          <EventRow key={ev.id} ev={ev} onClick={() => navigate(`/explore/events/${encodeId(ev.id)}`)} />
        ))}
      </>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(123,63,242,0.12)' }}>
            <Calendar size={16} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h1 className="font-black text-base leading-tight" style={{ color: 'var(--text-primary)' }}>Événements</h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Boostés · à venir · passés</p>
          </div>
        </div>
      </div>

      {/* Recherche */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Titre, ville…"
            className="input w-full pl-9 pr-9 text-sm" />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-tertiary)' }}><X size={14} /></button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(123,63,242,0.08)' }}>
            <Calendar size={28} style={{ color: 'var(--primary)' }} />
          </div>
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            {query ? 'Aucun événement trouvé' : 'Aucun événement disponible'}
          </p>
          <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
            {query ? 'Essaie un autre mot-clé.' : 'Reviens plus tard.'}
          </p>
        </div>
      ) : (
        <div>
          {renderSection(boosted,  <Zap size={14} style={{ color: '#F59E0B' }} />, 'Événements boostés', 'Ces événements ont boosté leur visibilité')}
          {renderSection(upcoming, <Calendar size={14} style={{ color: 'var(--primary)' }} />, 'À venir', 'Prochains événements')}
          {renderSection(past,     <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />, 'Passés', 'Événements terminés')}

          {hasMore && !query && (
            <div className="flex justify-center py-6">
              <button onClick={() => load(false)} disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)', border: '1px solid rgba(123,63,242,0.2)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(123,63,242,0.1)'; e.currentTarget.style.color = 'var(--primary)'; }}>
                {loadingMore ? <Spinner size="sm" /> : 'Charger plus'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
