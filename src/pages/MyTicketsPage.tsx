import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket, Calendar, MapPin, Download, Share2,
  CheckCircle, XCircle, Music, WifiOff, RefreshCw,
  X, Tag, Star, Award, Zap,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Spinner , PageLoader} from '../components/ui/Spinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Interfaces ────────────────────────────────────────────────────────────────

interface EventTicket {
  id: string;
  event_id: string;
  ticket_tier: 'simple' | 'vip' | 'vvip' | 'vvvip';
  access_code: string;
  status: string;
  is_used: boolean;
  price_paid: number;
  created_at: string;
  event?: {
    title: string;
    starts_at: string;
    venue_name?: string;
    venue_city?: string;
  };
}

interface ConcertTicket {
  id: string;
  concert_id: string;
  ticket_tier: 'simple' | 'vip' | 'vvip' | 'vvvip';
  access_code: string;
  status: string;
  is_used: boolean;
  price_paid: number;
  created_at: string;
  concert?: {
    title: string;
    starts_at: string;
    venue_name?: string;
    venue_city?: string;
  };
}

type Tab = 'events' | 'concerts';

// ── Tier config ───────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<string, { label: string; color: string; qrColor: string; icon: React.ReactNode }> = {
  simple: { label: 'STANDARD', color: '#4F46E5', qrColor: '#4F46E5', icon: <Tag size={12} /> },
  vip:    { label: 'VIP',      color: '#7B3FF2', qrColor: '#92400E', icon: <Star size={12} /> },
  vvip:   { label: 'VVIP',     color: '#7C3AED', qrColor: '#5B21B6', icon: <Award size={12} /> },
  vvvip:  { label: 'VVVIP',    color: '#EF4444', qrColor: '#991B1B', icon: <Zap size={12} /> },
};

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

// ── Ticket Modal ──────────────────────────────────────────────────────────────

interface TicketModalProps {
  ticket: EventTicket | ConcertTicket | null;
  kind: 'event' | 'concert';
  onClose: () => void;
}

function TicketModal({ ticket, kind, onClose }: TicketModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [shareOk, setShareOk] = useState(false);

  useEffect(() => {
    if (!ticket) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ticket, onClose]);

  if (!ticket) return null;

  const isEvent = kind === 'event';
  const ev = isEvent ? (ticket as EventTicket).event : (ticket as ConcertTicket).concert;
  const itemId = isEvent ? (ticket as EventTicket).event_id : (ticket as ConcertTicket).concert_id;

  const cfg = TIER_CONFIG[ticket.ticket_tier] ?? TIER_CONFIG.simple;
  const qrValue = ticket.access_code
    ? JSON.stringify(isEvent
        ? { ac: ticket.access_code, e: itemId }
        : { ac: ticket.access_code, c: itemId })
    : null;

  const ticketDate = ev?.starts_at
    ? format(new Date(ev.starts_at), "d MMM yyyy 'a' HH:mm", { locale: fr })
    : '--';

  const shortId = ticket.id.slice(-8).toUpperCase();

  async function handleDownload() {
    setDownloading(true);
    try {
      const url = isEvent
        ? `/api/v1/events/${itemId}/tickets/me/pdf`
        : `/api/v1/concerts/${itemId}/tickets/me/pdf`;
      const res = await apiClient.get<Blob>(url, { responseType: 'blob' } as any);
      const blob = res.data as unknown as Blob;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `billet-${shortId}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      // silently fail
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    const title = ev?.title ?? (isEvent ? 'Mon billet evenement' : 'Mon billet concert');
    const text = `Mon billet ${cfg.label} pour ${title}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setShareOk(true);
      setTimeout(() => setShareOk(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}
        onClick={onClose}
      >
        {/* Modal container */}
        <div
          style={{
            position: 'relative', width: '100%', maxWidth: 400,
            maxHeight: '92dvh', overflowY: 'auto',
            borderRadius: '1.5rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: `0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px ${cfg.color}30`,
            animation: 'ticketModalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          }}
          onClick={e => e.stopPropagation()}
        >

          {/* ── Modal header gradient ── */}
          <div style={{
            padding: '1.25rem 1.25rem 1rem',
            background: `linear-gradient(135deg, ${cfg.color}EE, ${cfg.color}99)`,
            borderRadius: '1.5rem 1.5rem 0 0',
          }}>
            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: 12, right: 12,
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff',
              }}
            >
              <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {isEvent ? <Calendar size={16} color="rgba(255,255,255,0.8)" /> : <Music size={16} color="rgba(255,255,255,0.8)" />}
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {isEvent ? 'Billet evenement' : 'Billet concert'}
              </span>
            </div>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.3, paddingRight: 40 }}>
              {ev?.title ?? '--'}
            </p>

            {/* Tier badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 800,
                padding: '3px 10px', borderRadius: 99,
                background: 'rgba(255,255,255,0.25)',
                color: '#fff', letterSpacing: '0.06em',
              }}>
                {cfg.icon}
                {cfg.label}
              </span>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                onClick={handleDownload}
                disabled={downloading}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '8px 12px', borderRadius: 10, border: 'none', cursor: downloading ? 'not-allowed' : 'pointer',
                  background: 'rgba(255,255,255,0.2)', color: '#fff',
                  fontSize: 12, fontWeight: 700, opacity: downloading ? 0.6 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {downloading ? <Spinner size="sm" /> : <Download size={13} />}
                PDF
              </button>
              <button
                onClick={handleShare}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: shareOk ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.2)',
                  color: '#fff', fontSize: 12, fontWeight: 700,
                  transition: 'background 0.2s',
                }}
              >
                <Share2 size={13} />
                {shareOk ? 'Copie !' : 'Partager'}
              </button>
            </div>
          </div>

          {/* ── Tier banner with decorative dashes ── */}
          <div style={{
            padding: '8px 16px',
            background: `${cfg.color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            overflow: 'hidden',
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: cfg.color, letterSpacing: '0.12em' }}>
              {cfg.label}
            </span>
            <span style={{ fontSize: 11, color: `${cfg.color}60`, letterSpacing: '0.05em', fontFamily: 'monospace' }}>
              {'--- --- --- --- --- --- ---'}
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, color: cfg.color, letterSpacing: '0.12em' }}>
              {cfg.label}
            </span>
          </div>

          {/* ── Ticket body ── */}
          <div style={{ padding: '1.25rem' }}>

            {/* Notch simulation — dashed divider with circles */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              {/* Left notch */}
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                marginLeft: -32, flexShrink: 0,
              }} />
              {/* Dashed line */}
              <div style={{
                flex: 1, height: 1,
                borderTop: `2px dashed var(--border)`,
              }} />
              {/* Right notch */}
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                marginRight: -32, flexShrink: 0,
              }} />
            </div>

            {/* QR Code section */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
              {qrValue ? (
                <div style={{
                  padding: 12,
                  background: '#fff',
                  borderRadius: 12,
                  border: `2px solid ${cfg.color}30`,
                  boxShadow: `0 4px 20px ${cfg.color}20`,
                }}>
                  <QRCodeSVG
                    value={qrValue}
                    size={180}
                    level="M"
                    fgColor={cfg.qrColor}
                    bgColor="#ffffff"
                  />
                </div>
              ) : (
                <div style={{
                  width: 180, height: 180,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 12,
                  background: 'var(--bg-secondary)',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                }}>
                  <Spinner size="md" />
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Chargement du QR code...</p>
                </div>
              )}

              {ticket.access_code && (
                <p style={{
                  marginTop: 10, fontSize: 12, fontWeight: 700,
                  color: 'var(--text-secondary)',
                  fontFamily: 'monospace', letterSpacing: '0.15em',
                }}>
                  {ticket.access_code}
                </p>
              )}
            </div>

            {/* Footer 4 columns */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8, marginBottom: 16,
              padding: '12px 8px',
              background: 'var(--bg-secondary)',
              borderRadius: 12,
              border: '1px solid var(--border)',
            }}>
              {[
                { label: 'N° BILLET', value: shortId },
                { label: 'CATEGORIE', value: cfg.label },
                {
                  label: 'PRIX',
                  value: ticket.price_paid > 0
                    ? `${(ticket.price_paid / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0 })}€`
                    : 'Gratuit',
                },
                {
                  label: 'DATE',
                  value: ev?.starts_at
                    ? format(new Date(ev.starts_at), 'd MMM', { locale: fr })
                    : '--',
                },
              ].map(col => (
                <div key={col.label} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 8, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                    {col.label}
                  </p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                    {col.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Date and venue detail */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{ticketDate}</span>
              </div>
              {(ev?.venue_name || ev?.venue_city) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {[ev.venue_name, ev.venue_city].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Global status */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 12,
              background: ticket.is_used ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
              border: `1px solid ${ticket.is_used ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
            }}>
              {ticket.is_used ? (
                <>
                  <XCircle size={16} color="#EF4444" />
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#EF4444' }}>Billet deja utilise</span>
                </>
              ) : (
                <>
                  <CheckCircle size={16} color="#22C55E" />
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#22C55E' }}>Billet valide</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ticketModalIn {
          from { opacity: 0; transform: scale(0.88) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
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
