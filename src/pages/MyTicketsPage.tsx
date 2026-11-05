import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket, Calendar, MapPin,
  CheckCircle, XCircle, Music, WifiOff, RefreshCw,
} from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { PageLoader } from '../components/ui/Spinner';
import { TicketModal, TIER_CONFIG, type EventTicket, type ConcertTicket } from '../components/ui/TicketModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Interfaces ────────────────────────────────────────────────────────────────

type Tab = 'events' | 'concerts';

// ── Ticket Card ───────────────────────────────────────────────────────────────

interface TicketCardProps {
  tier: 'simple' | 'vip' | 'vvip' | 'vvvip';
  title: string;
  date: string;
  venue?: string;
  city?: string;
  isUsed: boolean;
  kind: 'event' | 'concert';
  onClick: () => void;
}

function TicketCard({ tier, title, date, venue, city, isUsed, kind, onClick }: TicketCardProps) {
  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG.simple;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: '1.25rem',
        border: `1px solid ${hovered ? cfg.color : 'var(--border)'}`,
        background: 'var(--surface)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? `0 12px 32px ${cfg.color}25` : 'none',
        overflow: 'hidden',
      }}
    >
      {/* Gradient band */}
      <div style={{ height: 6, background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}88)` }} />

      <div style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Kind + tier badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 700,
                padding: '2px 8px', borderRadius: 99,
                background: `${cfg.color}18`, color: cfg.color,
                border: `1px solid ${cfg.color}40`,
              }}>
                {cfg.icon}
                {cfg.label}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 600,
                padding: '2px 8px', borderRadius: 99,
                background: 'var(--bg-secondary)',
                color: 'var(--text-tertiary)',
              }}>
                {kind === 'concert' ? <Music size={9} /> : <Calendar size={9} />}
                {kind === 'concert' ? 'Concert' : 'Evenement'}
              </span>
            </div>

            {/* Title */}
            <p style={{
              fontSize: 14, fontWeight: 700, lineHeight: 1.35,
              color: 'var(--text-primary)',
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              marginBottom: 8,
            }}>
              {title}
            </p>

            {/* Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <Calendar size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {format(new Date(date), "d MMM yyyy 'a' HH:mm", { locale: fr })}
              </span>
            </div>

            {/* Venue */}
            {(venue || city) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <MapPin size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {[venue, city].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Status badge */}
          <div style={{ flexShrink: 0 }}>
            {isUsed ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 700,
                padding: '4px 10px', borderRadius: 99,
                background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                border: '1px solid rgba(239,68,68,0.3)',
              }}>
                <XCircle size={11} />
                Utilise
              </span>
            ) : (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 700,
                padding: '4px 10px', borderRadius: 99,
                background: 'rgba(34,197,94,0.1)', color: '#22C55E',
                border: '1px solid rgba(34,197,94,0.3)',
              }}>
                <CheckCircle size={11} />
                Valide
              </span>
            )}
          </div>
        </div>

        {/* Bottom hint */}
        <div style={{
          marginTop: 12, paddingTop: 10,
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            Cliquer pour afficher le QR code
          </span>
          <Ticket size={14} style={{ color: cfg.color }} />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MyTicketsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('events');
  const [eventTickets, setEventTickets] = useState<EventTicket[]>([]);
  const [concertTickets, setConcertTickets] = useState<ConcertTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<EventTicket | ConcertTicket | null>(null);
  const [selectedKind, setSelectedKind] = useState<'event' | 'concert'>('event');

  const fetchTickets = useCallback(async () => {
    setError(null);
    try {
      const [evRes, coRes] = await Promise.all([
        apiClient.get<EventTicket[]>(Endpoints.events.myTickets),
        apiClient.get<ConcertTicket[]>(Endpoints.concerts.myTickets),
      ]);
      setEventTickets(Array.isArray(evRes.data) ? evRes.data : []);
      setConcertTickets(Array.isArray(coRes.data) ? coRes.data : []);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur de chargement');
    }
  }, []);

  useEffect(() => {
    fetchTickets().finally(() => setLoading(false));
  }, [fetchTickets]);

  function openTicket(ticket: EventTicket | ConcertTicket, kind: 'event' | 'concert') {
    setSelectedTicket(ticket);
    setSelectedKind(kind);
  }

  const tickets = tab === 'events' ? eventTickets : concertTickets;

  // ── Loading ──
  if (loading) {
    return (
      <PageLoader />
    );
  }

  // ── Error ──
  if (error && eventTickets.length === 0 && concertTickets.length === 0) {
    return (
      <div style={{ width: '100%', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 80 }}>
        <WifiOff size={48} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
        <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{error}</p>
        <button
          onClick={() => { setLoading(true); fetchTickets().finally(() => setLoading(false)); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', borderRadius: 10,
            background: 'var(--primary)', color: '#fff',
            border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
          }}
        >
          <RefreshCw size={14} />
          Reessayer
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', margin: '0 auto', padding: '1.5rem 1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
            Mes billets
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
            Vos tickets pour evenements et concerts
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchTickets().finally(() => setLoading(false)); }}
          style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'var(--surface)', border: '1px solid var(--border)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          title="Actualiser"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {([
          { key: 'events',   label: 'Evenements', count: eventTickets.length,  icon: <Calendar size={14} /> },
          { key: 'concerts', label: 'Concerts',    count: concertTickets.length, icon: <Music size={14} /> },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 12, border: 'none',
              cursor: 'pointer', fontSize: 14, fontWeight: 700,
              background: tab === t.key ? 'var(--primary)' : 'var(--bg-secondary)',
              color: tab === t.key ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            {t.icon}
            {t.label}
            <span style={{
              fontSize: 11, fontWeight: 800,
              padding: '1px 7px', borderRadius: 99,
              background: tab === t.key ? 'rgba(255,255,255,0.25)' : 'var(--bg-tertiary)',
              color: tab === t.key ? '#fff' : 'var(--text-tertiary)',
            }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tickets list */}
      {tickets.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 12, padding: '60px 24px',
          background: 'var(--surface)', borderRadius: '1.25rem',
          border: '1px solid var(--border)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'var(--bg-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Ticket size={28} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
          </div>
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 16, margin: 0 }}>
            Aucun billet
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0, textAlign: 'center' }}>
            Vous n'avez pas encore de billets pour {tab === 'events' ? 'des evenements' : 'des concerts'}.
          </p>
          <button
            onClick={() => navigate(tab === 'events' ? '/events' : '/concerts')}
            style={{
              marginTop: 4, padding: '10px 24px', borderRadius: 10, border: 'none',
              background: 'var(--primary)', color: '#fff',
              cursor: 'pointer', fontWeight: 700, fontSize: 13,
            }}
          >
            Decouvrir {tab === 'events' ? 'les evenements' : 'les concerts'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {tab === 'events'
            ? (eventTickets as EventTicket[]).map(t => (
                <TicketCard
                  key={t.id}
                  tier={t.ticket_tier}
                  title={t.event?.title ?? 'Evenement'}
                  date={t.event?.starts_at ?? t.created_at}
                  venue={t.event?.venue_name}
                  city={t.event?.venue_city}
                  isUsed={t.is_used}
                  kind="event"
                  onClick={() => openTicket(t, 'event')}
                />
              ))
            : (concertTickets as ConcertTicket[]).map(t => (
                <TicketCard
                  key={t.id}
                  tier={t.ticket_tier}
                  title={t.concert?.title ?? 'Concert'}
                  date={t.concert?.starts_at ?? t.created_at}
                  venue={t.concert?.venue_name}
                  city={t.concert?.venue_city}
                  isUsed={t.is_used}
                  kind="concert"
                  onClick={() => openTicket(t, 'concert')}
                />
              ))
          }
        </div>
      )}

      {/* Modal */}
      <TicketModal
        ticket={selectedTicket}
        kind={selectedKind}
        onClose={() => setSelectedTicket(null)}
      />
    </div>
  );
}
