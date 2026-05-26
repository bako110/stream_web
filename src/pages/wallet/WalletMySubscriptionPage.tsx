import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Monitor, Tv, Users, Download, RefreshCw, Trash2, Calendar, Clock,
} from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActiveSubscription {
  id: string;
  plan_id: string;
  plan_name?: string;
  status: 'active' | 'cancelled' | 'expired' | string;
  started_at: string;
  ends_at: string;
  auto_renew?: boolean;
}

interface HistoryEntry {
  id: string;
  plan_id: string;
  plan_name?: string;
  status: string;
  started_at: string;
  ends_at: string;
}

// ---------------------------------------------------------------------------
// Static plan metadata
// ---------------------------------------------------------------------------

const PLAN_META: Record<string, { label: string; gradient: string; color: string; screens: number; quality: string; profiles: number; downloads: number }> = {
  free: {
    label: 'Gratuit',
    gradient: 'linear-gradient(135deg,#6B7280,#9CA3AF)',
    color: '#6B7280',
    screens: 1, quality: 'SD', profiles: 1, downloads: 0,
  },
  basic: {
    label: 'Basic',
    gradient: 'linear-gradient(135deg,#3B82F6,#60A5FA)',
    color: '#3B82F6',
    screens: 2, quality: 'HD', profiles: 2, downloads: 5,
  },
  premium: {
    label: 'Premium',
    gradient: 'linear-gradient(135deg,#7B3FF2,#A855F7)',
    color: '#7B3FF2',
    screens: 4, quality: '4K', profiles: 4, downloads: 25,
  },
  family: {
    label: 'Famille',
    gradient: 'linear-gradient(135deg,#10B981,#34D399)',
    color: '#10B981',
    screens: 6, quality: '4K', profiles: 6, downloads: 50,
  },
};

const DEFAULT_META = {
  label: 'Inconnu',
  gradient: 'linear-gradient(135deg,#6B7280,#9CA3AF)',
  color: '#6B7280',
  screens: 0, quality: '-', profiles: 0, downloads: 0,
};

function getPlanMeta(planId: string) {
  return PLAN_META[planId] ?? DEFAULT_META;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(d: string) {
  try { return format(new Date(d), 'd MMM yyyy', { locale: fr }); }
  catch { return d; }
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    active:    { label: 'Actif',     bg: 'rgba(34,197,94,0.15)',   color: '#22C55E' },
    cancelled: { label: 'Annule',    bg: 'rgba(239,68,68,0.12)',   color: '#EF4444' },
    expired:   { label: 'Expire',    bg: 'rgba(107,114,128,0.12)', color: '#9CA3AF' },
  };
  const s = map[status] ?? { label: status, bg: 'rgba(107,114,128,0.12)', color: '#9CA3AF' };
  return (
    <span
      className="text-xs font-black px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function WalletMySubscriptionPage() {
  const navigate = useNavigate();

  const [sub,        setSub]        = useState<ActiveSubscription | null>(null);
  const [history,    setHistory]    = useState<HistoryEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [loadingH,   setLoadingH]   = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const fetchSub = useCallback(() => {
    setLoading(true);
    apiClient.get<ActiveSubscription>(Endpoints.subscriptions.me)
      .then(r => setSub(r.data))
      .catch(() => setSub(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSub();

    apiClient.get<HistoryEntry[]>('/api/v1/subscriptions/history')
      .then(r => setHistory(Array.isArray(r.data) ? r.data : []))
      .catch(() => setHistory([]))
      .finally(() => setLoadingH(false));
  }, [fetchSub]);

  async function handleCancel() {
    const confirmed = window.confirm(
      'Etes-vous sur de vouloir annuler votre abonnement ? Vous conservez l\'acces jusqu\'a la fin de la periode en cours.'
    );
    if (!confirmed) return;

    setCancelling(true);
    try {
      await apiClient.delete(Endpoints.subscriptions.cancel);
      toast.success('Abonnement annule avec succes.');
      fetchSub();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(detail ?? 'Impossible d\'annuler l\'abonnement.');
    } finally {
      setCancelling(false);
    }
  }

  const meta = sub ? getPlanMeta(sub.plan_id) : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/wallet')}
          className="p-2.5 rounded-xl transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <ArrowLeft size={17} />
        </button>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Mon abonnement</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Gerez votre plan actif</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : sub ? (
        <>
          {/* Active plan card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: `2px solid ${meta!.color}`, boxShadow: `0 4px 24px ${meta!.color}25` }}
          >
            {/* Gradient header */}
            <div className="relative p-6" style={{ background: meta!.gradient }}>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 75% 0%,rgba(255,255,255,0.2),transparent 55%)' }}
              />
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-2xl font-black text-white">{meta!.label}</p>
                  <StatusPill status={sub.status} />
                </div>
                <p className="text-xs text-white/70">Plan {meta!.label}</p>

                {/* Dates */}
                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex items-center gap-1.5 text-xs text-white/80">
                    <Calendar size={12} />
                    <span>Debut : <span className="font-bold text-white">{fmtDate(sub.started_at)}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-white/80">
                    <Clock size={12} />
                    <span>Fin : <span className="font-bold text-white">{fmtDate(sub.ends_at)}</span></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Specs */}
            <div className="p-5" style={{ background: 'var(--surface)' }}>
              <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                Details du plan
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: <Monitor size={15} />, label: 'Ecrans simultanes', value: `${meta!.screens} ecran${meta!.screens > 1 ? 's' : ''}` },
                  { icon: <Tv size={15} />,      label: 'Qualite',           value: meta!.quality },
                  { icon: <Users size={15} />,   label: 'Profils',           value: `${meta!.profiles} profil${meta!.profiles > 1 ? 's' : ''}` },
                  { icon: <Download size={15} />,label: 'Telechargements',   value: meta!.downloads === 0 ? 'Aucun' : `${meta!.downloads} / mois` },
                ].map(item => (
                  <div
                    key={item.label}
                    className="rounded-xl p-3"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-center gap-2 mb-1.5" style={{ color: meta!.color }}>
                      {item.icon}
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.label}</p>
                    <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/wallet/subscription/plans')}
              className="flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <RefreshCw size={15} />
              Changer de plan
            </button>

            {sub.status === 'active' && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}
              >
                {cancelling ? <Spinner size="sm" /> : <><Trash2 size={15} />Annuler</>}
              </button>
            )}
          </div>
        </>
      ) : (
        /* Empty state */
        <div
          className="rounded-2xl py-16 flex flex-col items-center gap-4 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <Monitor size={28} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
          </div>
          <div>
            <p className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Aucun abonnement actif</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Choisissez un plan pour acceder au contenu premium.
            </p>
          </div>
          <button
            onClick={() => navigate('/wallet/subscription/plans')}
            className="px-6 py-3 rounded-xl font-black text-sm text-white transition-all"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)', boxShadow: '0 6px 20px rgba(123,63,242,0.35)' }}
          >
            Voir les plans
          </button>
        </div>
      )}

      {/* Subscription history */}
      <div>
        <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
          Historique des abonnements
        </p>

        {loadingH ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : history.length === 0 ? (
          <div
            className="rounded-2xl py-8 flex items-center justify-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Aucun historique disponible</p>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            {history.map((entry, i) => {
              const m = getPlanMeta(entry.plan_id);
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 px-4 py-3.5"
                  style={{ borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: m.gradient }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {entry.plan_name ?? m.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {fmtDate(entry.started_at)} &mdash; {fmtDate(entry.ends_at)}
                    </p>
                  </div>
                  <StatusPill status={entry.status} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
