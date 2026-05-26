import { useState } from 'react';
import {
  Zap, Clock, TrendingUp, ChevronDown, ChevronUp,
  Play, Users, Eye, FileText, CalendarDays, Music2, Radio,
  CheckCircle2, XCircle, PauseCircle, BarChart2, StopCircle, AlertTriangle,
} from 'lucide-react';
import { apiClient } from '../../../api';
import { Spinner } from '../../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { BOOST_CATEGORIES, daysLeft, fmtNum, type BoostCategory } from './BoostCatalog';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BoostRecord {
  id: string;
  target: string;
  tier_label: string;
  quantity_label: string;
  duration_days: number;
  coins_spent: number;
  status: 'active' | 'completed' | 'cancelled' | 'paused';
  progress: number;
  delivered_quantity?: number;
  target_quantity?: number;
  impression_count?: number;
  feed_multiplier?: number;
  activated_at: string;
  expires_at: string;
  target_content_id?: string | null;
  target_content_type?: string | null;
  target_content_title?: string | null;
}

// ── Icon per category ─────────────────────────────────────────────────────────

const ICONS: Record<string, React.ReactNode> = {
  followers:         <Users size={16} />,
  profile_views:     <Eye size={16} />,
  content_reach:     <TrendingUp size={16} />,
  reel_views:        <Play size={16} />,
  community_members: <Users size={16} />,
  post_reach:        <FileText size={16} />,
  event_reach:       <CalendarDays size={16} />,
  concert_reach:     <Music2 size={16} />,
  live_viewers:      <Radio size={16} />,
};

// ── Unit label per target ─────────────────────────────────────────────────────

const UNIT_LABELS: Record<string, string> = {
  followers:         'abonnés gagnés',
  profile_views:     'vues de profil',
  content_reach:     'impressions',
  reel_views:        'vues de reel',
  post_reach:        'impressions',
  event_reach:       'personnes touchées',
  concert_reach:     'personnes touchées',
  live_viewers:      'viewers',
  community_members: 'membres gagnés',
};

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BoostRecord['status'] }) {
  const cfg = {
    active:    { label: 'Actif',     bg: '#22C55E20', color: '#22C55E', Icon: Zap },
    completed: { label: 'Terminé',   bg: '#3B82F620', color: '#3B82F6', Icon: CheckCircle2 },
    cancelled: { label: 'Annulé',    bg: '#EF444420', color: '#EF4444', Icon: XCircle },
    paused:    { label: 'En pause',  bg: '#F59E0B20', color: '#F59E0B', Icon: PauseCircle },
  }[status];
  const { label, bg, color, Icon } = cfg;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
      style={{ background: bg, color }}>
      <Icon size={9} />
      {label}
    </span>
  );
}

// ── Progress ring ─────────────────────────────────────────────────────────────

function ProgressRing({ pct, g1, g2, size = 52 }: { pct: number; g1: string; g2: string; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(1, Math.max(0, pct));
  const id = `grad-${g1.replace('#', '')}-${g2.replace('#', '')}`;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={g1} />
          <stop offset="100%" stopColor={g2} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-secondary)" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={`url(#${id})`} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round" />
    </svg>
  );
}

// ── Stop confirmation modal ───────────────────────────────────────────────────

function StopModal({
  boost, g1, g2,
  onConfirm, onClose, loading,
}: {
  boost: BoostRecord; g1: string; g2: string;
  onConfirm: () => void; onClose: () => void; loading: boolean;
}) {
  const totalSec   = Math.max(1, (new Date(boost.expires_at).getTime() - new Date(boost.activated_at).getTime()) / 1000);
  const elapsedSec = (Date.now() - new Date(boost.activated_at).getTime()) / 1000;
  const elapsedPct = elapsedSec / totalSec;
  const refund     = elapsedPct < 0.5 ? Math.round(Number(boost.coins_spent ?? 0) * 0.5) : 0;

  return (
    <>
      <div className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
        onClick={() => !loading && onClose()} />
      <div className="fixed z-50 rounded-3xl p-6 space-y-5"
        style={{
          background: 'var(--surface)',
          inset: 'auto 1rem',
          top: '50%', transform: 'translateY(-50%)',
          maxWidth: 380, margin: '0 auto',
        }}>
        {/* Warning icon */}
        <div className="flex flex-col items-center gap-3 pb-2">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: '#EF444415', border: '1.5px solid #EF444430' }}>
            <AlertTriangle size={28} color="#EF4444" />
          </div>
          <p className="text-base font-black text-center" style={{ color: 'var(--text-primary)' }}>
            Arrêter ce boost ?
          </p>
          <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Le boost sera immédiatement interrompu et le multiplicateur de visibilité supprimé.
          </p>
        </div>

        {/* Boost summary */}
        <div className="rounded-2xl p-4 space-y-2"
          style={{ background: 'var(--bg-secondary)' }}>
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Boost</span>
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{boost.tier_label}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Progression</span>
            <span className="text-xs font-bold" style={{ color: g1 }}>
              {Math.round(Math.min(1, Number(boost.progress)) * 100)}%
            </span>
          </div>
          <div className="flex justify-between" style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Remboursement
            </span>
            <span className="text-xs font-black" style={{ color: refund > 0 ? '#22C55E' : '#EF4444' }}>
              {refund > 0 ? `+${refund.toLocaleString('fr-FR')} coins` : 'Aucun'}
            </span>
          </div>
          {refund === 0 && (
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              Plus de 50% de la durée est écoulée — pas de remboursement.
            </p>
          )}
          {refund > 0 && (
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              Moins de 50% de la durée est écoulée — remboursement de 50%.
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-3.5 rounded-2xl text-sm font-bold"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            Garder le boost
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2"
            style={{ background: '#EF4444' }}>
            {loading ? <Spinner size="sm" /> : <><StopCircle size={14} /> Arrêter</>}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  boost: BoostRecord;
  onCancelled?: (boostId: string, refund: number, newBalance: number) => void;
}

export function ActiveBoostCard({ boost: initialBoost, onCancelled }: Props) {
  const [boost,     setBoost]     = useState<BoostRecord>(initialBoost);
  const [expanded,  setExpanded]  = useState(false);
  const [showStop,  setShowStop]  = useState(false);
  const [stopping,  setStopping]  = useState(false);

  const cat: BoostCategory | undefined = BOOST_CATEGORIES.find(c => c.id === boost.target);
  const [g1, g2] = cat?.gradient ?? ['#7B3FF2', '#E0389A'];
  const icon = ICONS[boost.target] ?? <Zap size={16} />;

  const pct        = Math.min(1, Math.max(0, Number(boost.progress ?? 0)));
  const days       = daysLeft(boost.expires_at);
  const isActive   = boost.status === 'active';
  const impressions = Number(boost.impression_count ?? 0);
  const delivered  = impressions > 0 ? impressions : Number(boost.delivered_quantity ?? 0);
  const total      = Number(boost.target_quantity ?? 0);
  const mult       = Number(boost.feed_multiplier ?? 1.0);
  const coinsSpent = Number(boost.coins_spent ?? 0);
  const hasContent = !!boost.target_content_title;
  const unitLabel  = UNIT_LABELS[boost.target] ?? 'unités livrées';

  async function handleStop() {
    setStopping(true);
    try {
      const res = await apiClient.delete<{
        message: string;
        refund_coins: number;
        new_balance: number;
        boost: BoostRecord;
      }>(`/api/v1/wallet/boosts/${boost.id}`);
      setBoost(res.data.boost);
      setShowStop(false);
      toast.success(res.data.message);
      onCancelled?.(boost.id, res.data.refund_coins, res.data.new_balance);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Erreur lors de l\'annulation.');
    } finally {
      setStopping(false);
    }
  }

  return (
    <>
      <div className="rounded-2xl overflow-hidden transition-all"
        style={{ background: 'var(--surface)', border: `1px solid ${g1}30` }}>

        {/* Top gradient strip */}
        <div className="h-1" style={{ background: `linear-gradient(90deg,${g1},${g2})` }} />

        {/* Main row */}
        <div className="p-4">
          <div className="flex items-start gap-3">

            {/* Icon + ring */}
            <div className="relative shrink-0">
              <ProgressRing pct={pct} g1={g1} g2={g2} />
              <div className="absolute inset-0 flex items-center justify-center" style={{ color: g1 }}>
                {icon}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-black truncate" style={{ color: 'var(--text-primary)' }}>
                  {boost.tier_label}
                </p>
                <StatusBadge status={boost.status} />
              </div>

              <p className="text-xs truncate mb-2" style={{ color: 'var(--text-secondary)' }}>
                {boost.quantity_label}
                {hasContent && (
                  <span className="ml-1.5 font-semibold" style={{ color: g1 }}>
                    · {boost.target_content_title}
                  </span>
                )}
              </p>

              {/* Real delivery stats */}
              {total > 0 && (
                <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 rounded-xl"
                  style={{ background: `${g1}10`, border: `1px solid ${g1}20` }}>
                  <TrendingUp size={11} style={{ color: g1, flexShrink: 0 }} />
                  <span className="text-[11px] font-black" style={{ color: g1 }}>
                    {fmtNum(delivered)}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                    / {fmtNum(total)} {impressions > 0 ? 'impressions reelles' : unitLabel}
                  </span>
                </div>
              )}

              {/* Progress bar */}
              <div className="h-1.5 rounded-full overflow-hidden mb-1"
                style={{ background: 'var(--bg-secondary)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${pct * 100}%`, background: `linear-gradient(90deg,${g1},${g2})` }} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold" style={{ color: 'var(--text-tertiary)' }}>
                  {Math.round(pct * 100)}% livré
                </span>
                {isActive && (
                  <span className="text-[10px] font-bold"
                    style={{ color: days <= 1 ? '#EF4444' : days <= 3 ? '#F59E0B' : '#22C55E' }}>
                    {days > 0 ? `${days}j restant${days > 1 ? 's' : ''}` : "Expire aujourd'hui"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={() => setExpanded(v => !v)}
              className="flex-1 flex items-center justify-center gap-1 text-[11px] font-bold"
              style={{ color: 'var(--text-tertiary)' }}>
              {expanded ? <><ChevronUp size={12} /> Moins</> : <><ChevronDown size={12} /> Détails</>}
            </button>
            {isActive && (
              <button onClick={() => setShowStop(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all"
                style={{ background: '#EF444415', color: '#EF4444', border: '1px solid #EF444430' }}>
                <StopCircle size={12} />
                Arrêter
              </button>
            )}
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2 pt-3">
              {[
                {
                  label: 'Livré',
                  value: total > 0 ? `${fmtNum(delivered)} / ${fmtNum(total)}` : '—',
                  icon: <TrendingUp size={11} />,
                  color: g1,
                },
                {
                  label: 'Multiplicateur feed',
                  value: mult > 1 ? `×${mult.toFixed(1)}` : '×1.0',
                  icon: <BarChart2 size={11} />,
                  color: mult > 1 ? '#F59E0B' : 'var(--text-secondary)',
                },
                {
                  label: 'Durée totale',
                  value: `${boost.duration_days}j`,
                  icon: <Clock size={11} />,
                  color: 'var(--text-secondary)',
                },
                {
                  label: 'Coins dépensés',
                  value: coinsSpent.toLocaleString('fr-FR'),
                  icon: <Zap size={11} />,
                  color: g1,
                },
              ].map(({ label, value, icon: ic, color }) => (
                <div key={label} className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center gap-1 mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    {ic}
                    <span className="text-[10px] font-semibold">{label}</span>
                  </div>
                  <p className="text-xs font-black" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Content preview */}
            {hasContent && (
              <div className="rounded-xl p-3 flex items-center gap-3"
                style={{ background: `${g1}10`, border: `1px solid ${g1}25` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${g1}20`, color: g1 }}>
                  {icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                    style={{ color: 'var(--text-tertiary)' }}>
                    Contenu ciblé
                  </p>
                  <p className="text-xs font-black truncate" style={{ color: 'var(--text-primary)' }}>
                    {boost.target_content_title}
                  </p>
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="flex gap-3">
              {[
                {
                  label: 'Activé le',
                  value: new Date(boost.activated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                },
                {
                  label: boost.status === 'cancelled' ? 'Annulé le' : 'Expire le',
                  value: new Date(boost.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex-1 rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                  <p className="text-[10px] font-semibold mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
                  <p className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stop modal */}
      {showStop && (
        <StopModal
          boost={boost}
          g1={g1} g2={g2}
          onConfirm={handleStop}
          onClose={() => setShowStop(false)}
          loading={stopping}
        />
      )}
    </>
  );
}
