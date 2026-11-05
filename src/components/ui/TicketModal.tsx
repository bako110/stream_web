import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar, MapPin, Download, Share2, ShieldCheck, XCircle, X, Tag, Star, Award, Zap,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '../../api';
import { Spinner } from './Spinner';
import { PriceWithLocal } from './PriceWithLocal';

// Fenêtre « billet » (QR code, PDF, partage) partagée par Mes billets et les
// pages Événement / Concert quand l'utilisateur a déjà son billet.
// Design aligné sur le mobile (MyTicketScreen) et sur le PDF du backend.

export interface EventTicket {
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

export interface ConcertTicket {
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

// ── Thème par catégorie (mêmes couleurs que le mobile) ───────────────────────

export const TIER_CONFIG: Record<string, {
  label: string; color: string; qrColor: string; icon: React.ReactNode;
  gradient: [string, string, string]; deco: string; corner: string;
}> = {
  simple: { label: 'STANDARD', color: '#7B3FF2', qrColor: '#4F46E5', icon: <Tag size={12} />,   gradient: ['#4F46E5', '#7B3FF2', '#9B59B6'], deco: '✦ ❋ ✦ ❋ ✦', corner: '❊' },
  vip:    { label: 'VIP',      color: '#F59E0B', qrColor: '#92400E', icon: <Star size={12} />,  gradient: ['#92400E', '#D97706', '#F59E0B'], deco: '★ ✿ ★ ✿ ★', corner: '★' },
  vvip:   { label: 'VVIP',     color: '#A78BFA', qrColor: '#4C1D95', icon: <Award size={12} />, gradient: ['#1E1B4B', '#4C1D95', '#7C3AED'], deco: '✾ ❀ ✾ ❀ ✾', corner: '❁' },
  vvvip:  { label: 'VVVIP',    color: '#EF4444', qrColor: '#7F1D1D', icon: <Zap size={12} />,   gradient: ['#7F1D1D', '#991B1B', '#EF4444'], deco: '♛ ✦ ♛ ✦ ♛', corner: '♛' },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// ── Ticket Modal ──────────────────────────────────────────────────────────────

interface TicketModalProps {
  ticket: EventTicket | ConcertTicket | null;
  kind: 'event' | 'concert';
  onClose: () => void;
}

export function TicketModal({ ticket, kind, onClose }: TicketModalProps) {
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

  const th = TIER_CONFIG[ticket.ticket_tier] ?? TIER_CONFIG.simple;
  const isUsed = ticket.status === 'used' || ticket.is_used === true;
  // Même contenu que le mobile et le PDF : la clé « e » sert aussi aux concerts
  // (le scanner lit parsed.e).
  const qrValue = ticket.access_code ? JSON.stringify({ ac: ticket.access_code, e: itemId }) : null;
  const shortRef = (ticket.access_code ?? ticket.id ?? '').slice(0, 8).toUpperCase();
  const price = Number(ticket.price_paid) || 0;

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      const url = isEvent
        ? `/api/v1/events/${itemId}/tickets/me/pdf?ticket_id=${ticket!.id}`
        : `/api/v1/concerts/${itemId}/tickets/me/pdf?ticket_id=${ticket!.id}`;
      const res = await apiClient.get<Blob>(url, { responseType: 'blob' } as any);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(res.data as unknown as Blob);
      link.download = `billet-${shortRef}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      // ignore
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    const title = ev?.title ?? 'Mon billet';
    const text = `Mon billet ${th.label} pour "${title}" — Réf: ${shortRef}\nVia Gofolyx`;
    try {
      if (navigator.share) await navigator.share({ title, text });
      else await navigator.clipboard.writeText(text);
      setShareOk(true);
      setTimeout(() => setShareOk(false), 2000);
    } catch {
      // ignore
    }
  }

  const label: React.CSSProperties = { fontSize: 8, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-tertiary)', textTransform: 'uppercase' };
  const value: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' };
  const circleBtn: React.CSSProperties = {
    width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
    background: 'rgba(255,255,255,0.2)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 380, maxHeight: '94dvh', overflowY: 'auto',
          borderRadius: 18, background: 'var(--surface)',
          boxShadow: `0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px ${th.gradient[1]}40`,
          animation: 'ticketModalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Bandeau haut */}
        <div style={{ padding: '10px 14px 12px', background: `linear-gradient(135deg, ${th.gradient[0]}, ${th.gradient[1]} 60%, ${th.gradient[2]})` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>Mon billet</p>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: 1 }}>{isEvent ? 'ÉVÉNEMENT' : 'CONCERT'}</p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleDownload} style={circleBtn} aria-label="Télécharger le PDF" title="Télécharger le PDF">
                {downloading ? <Spinner size="sm" /> : <Download size={16} />}
              </button>
              <button onClick={handleShare} style={{ ...circleBtn, background: shareOk ? 'rgba(34,197,94,0.45)' : circleBtn.background }} aria-label="Partager" title="Partager">
                <Share2 size={16} />
              </button>
              <button onClick={onClose} style={circleBtn} aria-label="Fermer"><X size={16} /></button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>{th.corner}</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 99,
              background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 13, fontWeight: 900, letterSpacing: 1.5,
            }}>
              {th.icon}{th.label}
            </span>
            <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>{th.corner}</span>
          </div>
          <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 6, marginTop: 4 }}>{th.deco}</p>
        </div>

        {/* Corps */}
        <div style={{ padding: '14px 16px 0' }}>
          <p style={{ fontSize: 17, fontWeight: 900, lineHeight: 1.3, color: 'var(--text-primary)' }}>
            {ev?.title ?? (isEvent ? 'Événement' : 'Concert')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {ev?.starts_at && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={12} style={{ color: th.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(ev.starts_at)} · {fmtTime(ev.starts_at)}</span>
              </div>
            )}
            {(ev?.venue_name || ev?.venue_city) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={12} style={{ color: th.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{[ev.venue_name, ev.venue_city].filter(Boolean).join(' · ')}</span>
              </div>
            )}
          </div>

          {/* QR code */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0' }}>
            <div style={{ padding: 2, borderRadius: 14, border: `2px solid ${th.color}80` }}>
              <div style={{ padding: 8, borderRadius: 11, background: '#fff' }}>
                {qrValue ? (
                  <QRCodeSVG value={qrValue} size={168} level="M" fgColor={th.qrColor} bgColor="#ffffff" />
                ) : (
                  <div style={{ width: 168, height: 168, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Spinner size="md" />
                  </div>
                )}
              </div>
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', marginTop: 6 }}>
              {isUsed ? '⚠ Billet déjà utilisé' : "Présente ce QR à l'entrée"}
            </p>
          </div>

          {isUsed && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: 8, borderRadius: 8,
              background: 'rgba(239,68,68,0.08)', border: '1px solid #EF4444',
            }}>
              <XCircle size={14} color="#EF4444" />
              <span style={{ color: '#EF4444', fontSize: 12, fontWeight: 700 }}>Ce billet a déjà été scanné</span>
            </div>
          )}

          {/* Séparateur */}
          <div style={{ borderTop: '1.5px dashed var(--border)' }} />

          {/* Pied : 4 colonnes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '10px 0' }}>
            {[
              { l: 'N° billet', v: <span style={value}>#{shortRef}</span> },
              { l: 'Catégorie', v: <span style={{ ...value, color: th.color, fontWeight: 900 }}>{th.label}</span> },
              { l: 'Prix',      v: price === 0 ? <span style={value}>Gratuit</span> : <span style={value}><PriceWithLocal amountEur={price} /></span> },
              { l: 'Date',      v: <span style={value}>{new Date(ticket.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span> },
            ].map((col, i) => (
              <div key={col.l} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 3, borderLeft: i ? '1px solid var(--border)' : 'none', minWidth: 0 }}>
                <span style={label}>{col.l}</span>
                {col.v}
              </div>
            ))}
          </div>

          {/* Bas décoratif */}
          <div style={{ margin: '0 -16px', padding: '6px 0', background: `${th.gradient[0]}18` }}>
            <p style={{ textAlign: 'center', fontSize: 9, color: th.color, opacity: 0.7, letterSpacing: 8 }}>{th.deco}</p>
          </div>
        </div>

        {/* Statut global */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: 12, padding: 10, borderRadius: 10,
          background: isUsed ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
          border: `1px solid ${isUsed ? '#EF4444' : '#10B981'}`,
        }}>
          {isUsed ? <XCircle size={14} color="#EF4444" /> : <ShieldCheck size={14} color="#10B981" />}
          <span style={{ fontSize: 12, fontWeight: 700, color: isUsed ? '#EF4444' : '#10B981' }}>
            {isUsed ? 'Billet déjà utilisé' : "Billet valide — prêt pour l'entrée"}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes ticketModalIn {
          from { opacity: 0; transform: scale(0.9) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>,
    document.body,
  );
}
