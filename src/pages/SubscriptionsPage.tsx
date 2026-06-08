import { useState, useEffect, useCallback } from 'react';
import { Award, Check, RefreshCw } from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Spinner, PageLoader } from '../components/ui/Spinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface Subscription {
  id: string;
  plan: string;
  status: string;
  start_date?: string;
  end_date?: string;
  current_period_end?: string;
}

const PLAN_LABELS: Record<string, string> = { free:'Gratuit', basic:'Essentiel', standard:'Standard', premium:'Premium' };
const PLAN_COLORS: Record<string, [string, string]> = {
  free:     ['#9390AB', '#6B698A'],
  basic:    ['#7B3FF2', '#7B3FF2'],
  standard: ['#7B3FF2', '#A855F7'],
  premium:  ['#7B3FF2', '#F43F5E'],
};
const PLAN_FEATURES: Record<string, string[]> = {
  free:     ['Accès limité', '1 écran', 'Qualité SD'],
  basic:    ['HD 720p', '1 écran', 'Téléchargements limités'],
  standard: ['Full HD 1080p', '2 écrans simultanés', 'Téléchargements illimités'],
  premium:  ['4K Ultra HD', '4 écrans simultanés', 'Téléchargements illimités', 'Accès anticipé'],
};

export default function SubscriptionsPage() {
  const [current,    setCurrent]    = useState<Subscription | null>(null);
  const [history,    setHistory]    = useState<Subscription[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [confirm,    setConfirm]    = useState(false);

  const load = useCallback(async () => {
    try {
      const [cur, hist] = await Promise.allSettled([
        apiClient.get<Subscription>(Endpoints.subscriptions.me),
        apiClient.get<Subscription[]>(`${Endpoints.subscriptions.me}/history`).catch(() => ({ data: [] })),
      ]);
      if (cur.status === 'fulfilled')  setCurrent(cur.value.data ?? null);
      if (hist.status === 'fulfilled') setHistory(Array.isArray(hist.value.data) ? hist.value.data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCancel() {
    setCancelling(true);
    try {
      await apiClient.delete(Endpoints.subscriptions.cancel);
      toast.success('Abonnement résilié. Accès conservé jusqu\'à la fin de la période.');
      setConfirm(false);
      await load();
    } catch {
      toast.error('Impossible de résilier l\'abonnement.');
    } finally { setCancelling(false); }
  }

  async function handleSubscribe(plan: string) {
    setSubscribing(plan);
    try {
      await apiClient.post(Endpoints.subscriptions.subscribe, { plan });
      toast.success('Abonnement activé !');
      await load();
    } catch {
      toast.error('Impossible de souscrire à ce plan.');
    } finally { setSubscribing(null); }
  }

  if (loading) return <PageLoader />;

  const plan   = (current?.plan ?? 'free') as string;
  const colors = PLAN_COLORS[plan] ?? PLAN_COLORS.basic;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Abonnements</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Gérez votre plan</p>
      </div>

      {current ? (
        /* ── Plan actif ── */
        <div className="rounded-3xl p-6 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg,${colors[0]},${colors[1]})`, boxShadow: `0 10px 32px ${colors[0]}55` }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 80% 10%, rgba(255,255,255,0.12), transparent 55%)' }} />
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-white/70 font-medium uppercase tracking-wider">Plan actuel</p>
              <p className="text-3xl font-black text-white mt-1">{PLAN_LABELS[plan] ?? plan}</p>
            </div>
            <span className="text-xs font-black px-3 py-1.5 rounded-full text-white"
              style={{ background: 'rgba(255,255,255,0.22)' }}>Actif</span>
          </div>

          <div className="space-y-2 mb-5">
            {(PLAN_FEATURES[plan] ?? []).map(f => (
              <div key={f} className="flex items-center gap-2">
                <Check size={13} color="#fff" />
                <span className="text-sm text-white/90">{f}</span>
              </div>
            ))}
          </div>

          {(current.end_date || current.current_period_end) && (
            <p className="text-xs text-white/60 mb-4">
              Renouvellement : {format(new Date(current.end_date ?? current.current_period_end!), 'd MMMM yyyy', { locale: fr })}
            </p>
          )}

          {!confirm ? (
            <button onClick={() => setConfirm(true)}
              className="w-full py-3 rounded-2xl text-sm font-black text-white"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              Résilier l'abonnement
            </button>
          ) : (
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <p className="text-sm text-white font-semibold text-center">
                Vous garderez l'accès jusqu'à la fin de la période payée.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/70"
                  style={{ background: 'rgba(255,255,255,0.1)' }}>
                  Annuler
                </button>
                <button onClick={handleCancel} disabled={cancelling}
                  className="flex-1 py-2.5 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: 'rgba(123,63,242,0.7)' }}>
                  {cancelling ? <Spinner size="sm" /> : 'Confirmer'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Aucun abonnement ── */
        <div className="rounded-2xl p-8 flex flex-col items-center gap-4 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Award size={40} style={{ color: 'var(--text-tertiary)' }} />
          <div>
            <p className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>Aucun abonnement actif</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Choisissez un plan pour accéder à tout le contenu exclusif.</p>
          </div>
          <div className="w-full space-y-2 mt-2">
            {(['basic', 'standard', 'premium'] as const).map(p => {
              const c = PLAN_COLORS[p][0];
              return (
                <button key={p} onClick={() => handleSubscribe(p)} disabled={subscribing === p}
                  className="w-full py-3 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: `${c}18`, color: c, border: `1.5px solid ${c}` }}
                  onMouseEnter={e => { e.currentTarget.style.background = c; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${c}18`; e.currentTarget.style.color = c; }}>
                  {subscribing === p ? <Spinner size="sm" /> : PLAN_LABELS[p]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Historique */}
      {history.length > 0 && (
        <div>
          <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Historique</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {history.map((item, i) => (
              <div key={item.id ?? i} className="flex items-center justify-between px-4 py-3.5"
                style={{ borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{PLAN_LABELS[item.plan ?? 'basic'] ?? item.plan}</p>
                  {item.start_date && (
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {format(new Date(item.start_date), 'd MMM yyyy', { locale: fr })}
                    </p>
                  )}
                </div>
                <span className="text-xs font-black px-2.5 py-1 rounded-full"
                  style={{
                    background: item.status === 'active' ? 'rgba(34,197,94,0.12)' : 'var(--bg-secondary)',
                    color:      item.status === 'active' ? '#22C55E' : 'var(--text-tertiary)',
                  }}>
                  {item.status === 'active' ? 'Actif' : 'Terminé'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
