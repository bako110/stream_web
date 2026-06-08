import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Coins, CreditCard, Check, AlertTriangle, Monitor, Tv, Users, Download } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WalletBalance {
  balance: number;
  coins?: number;
}

interface PlanConfig {
  id: string;
  label: string;
  price: number;
  screens: number;
  quality: string;
  profiles: number;
  downloads: number;
  gradient: string;
  color: string;
  features: string[];
}

type PaymentMethod = 'coins' | 'stripe';

// ---------------------------------------------------------------------------
// Static plan data (mirrors Plans page)
// ---------------------------------------------------------------------------

const PLANS: Record<string, PlanConfig> = {
  free: {
    id: 'free',
    label: 'Gratuit',
    price: 0,
    screens: 1,
    quality: 'SD',
    profiles: 1,
    downloads: 0,
    gradient: 'linear-gradient(135deg,#6B7280,#9CA3AF)',
    color: '#6B7280',
    features: ['Contenu standard uniquement', '1 ecran simultane', 'Qualite SD', '1 profil utilisateur'] },
  basic: {
    id: 'basic',
    label: 'Basic',
    price: 4.99,
    screens: 2,
    quality: 'HD',
    profiles: 2,
    downloads: 5,
    gradient: 'linear-gradient(135deg,#7B3FF2,#9B65F5)',
    color: '#7B3FF2',
    features: ['Tout le contenu Basic', '2 ecrans simultanes', 'Qualite HD', '2 profils', '5 telechargements / mois'] },
  premium: {
    id: 'premium',
    label: 'Premium',
    price: 9.99,
    screens: 4,
    quality: '4K',
    profiles: 4,
    downloads: 25,
    gradient: 'linear-gradient(135deg,#7B3FF2,#A855F7)',
    color: '#7B3FF2',
    features: ['Tout le contenu Premium', '4 ecrans simultanes', 'Qualite 4K Ultra HD', '4 profils', '25 telechargements / mois', 'Audio Dolby Atmos'] },
  family: {
    id: 'family',
    label: 'Famille',
    price: 14.99,
    screens: 6,
    quality: '4K',
    profiles: 6,
    downloads: 50,
    gradient: 'linear-gradient(135deg,#10B981,#34D399)',
    color: '#10B981',
    features: ['Tout le contenu Premium', '6 ecrans simultanes', 'Qualite 4K Ultra HD', '6 profils', '50 telechargements / mois', 'Controle parental avance'] } };

// 1 EUR = 100 coins (taux unifié plateforme)
const eurToCoins = (eur: number) => Math.ceil(eur * 100);

// ---------------------------------------------------------------------------
// Success Overlay
// ---------------------------------------------------------------------------

function SuccessOverlay({ plan, onDone }: { plan: PlanConfig; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center"
        style={{ background: plan.gradient, boxShadow: `0 0 60px ${plan.color}80` }}
      >
        <Check size={44} strokeWidth={3} className="text-white" />
      </div>
      <div className="text-center">
        <p className="text-2xl font-black text-white mb-1">Abonnement active !</p>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Plan <span className="font-bold text-white">{plan.label}</span> — bienvenue
        </p>
      </div>
      <Spinner size="sm" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function WalletSubscriptionPaymentPage() {
  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();
  const planId         = searchParams.get('plan') ?? 'basic';
  const plan           = PLANS[planId] ?? PLANS.basic;

  const coinsRequired  = eurToCoins(plan.price);

  const [balance,  setBalance]  = useState<number>(0);
  const [loadingW, setLoadingW] = useState(true);
  const [method,   setMethod]   = useState<PaymentMethod>('coins');
  const [paying,   setPaying]   = useState(false);
  const [success,  setSuccess]  = useState(false);

  const hasEnoughCoins = balance >= coinsRequired;

  useEffect(() => {
    apiClient.get<WalletBalance>(Endpoints.wallet.balance)
      .then(r => setBalance(r.data.coins ?? r.data.balance ?? 0))
      .catch(() => {})
      .finally(() => setLoadingW(false));
  }, []);

  async function handleConfirm() {
    if (paying) return;
    setPaying(true);
    try {
      if (method === 'coins') {
        await apiClient.post(Endpoints.subscriptions.subscribeWallet(plan.id));
      } else {
        await apiClient.post(Endpoints.subscriptions.subscribe, { plan: plan.id });
      }
      setSuccess(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(detail ?? 'Paiement echoue. Reessayez.');
    } finally {
      setPaying(false);
    }
  }

  function handleSuccessDone() {
    navigate('/wallet/subscription/my');
  }

  return (
    <>
      {success && <SuccessOverlay plan={plan} onDone={handleSuccessDone} />}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/wallet/subscription/plans')}
            className="p-2.5 rounded-xl transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Paiement</h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Confirmez votre abonnement</p>
          </div>
        </div>

        {/* Plan summary card */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div className="p-5 relative" style={{ background: plan.gradient }}>
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 80% 0%,rgba(255,255,255,0.18),transparent 55%)' }}
            />
            <div className="relative">
              <p className="text-xs text-white/70 font-medium uppercase tracking-wider mb-1">Plan selectionne</p>
              <p className="text-2xl font-black text-white">{plan.label}</p>
              <p className="text-xl font-black text-white/90 mt-1">
                {plan.price === 0 ? 'Gratuit' : `${plan.price.toFixed(2)} €`}
                {plan.price > 0 && <span className="text-sm font-semibold text-white/60 ml-1">/ mois</span>}
              </p>
              <div className="flex flex-wrap gap-3 mt-3">
                <span className="flex items-center gap-1 text-xs text-white/80">
                  <Monitor size={11} /> {plan.screens} ecran{plan.screens > 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1 text-xs text-white/80">
                  <Tv size={11} /> {plan.quality}
                </span>
                <span className="flex items-center gap-1 text-xs text-white/80">
                  <Users size={11} /> {plan.profiles} profil{plan.profiles > 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1 text-xs text-white/80">
                  <Download size={11} /> {plan.downloads} dl
                </span>
              </div>
            </div>
          </div>

          <div className="p-5" style={{ background: 'var(--surface)' }}>
            <p className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Inclus
            </p>
            <ul className="space-y-1.5">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Check size={13} style={{ color: plan.color, flexShrink: 0 }} strokeWidth={3} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Payment method */}
        {plan.price > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Mode de paiement
            </p>

            {/* Coins option */}
            <button
              onClick={() => setMethod('coins')}
              className="w-full rounded-2xl p-4 text-left transition-all"
              style={{
                background: method === 'coins' ? 'linear-gradient(135deg,rgba(123,63,242,0.12),rgba(123,63,242,0.08))' : 'var(--surface)',
                border: method === 'coins' ? '2px solid var(--primary)' : '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(123,63,242,0.15)', color: 'var(--primary)' }}
                  >
                    <Coins size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Payer avec des Coins</p>
                    {loadingW ? (
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Chargement...</p>
                    ) : (
                      <p className="text-xs" style={{ color: hasEnoughCoins ? '#22C55E' : '#EF4444' }}>
                        {balance.toLocaleString('fr-FR')} coins disponibles
                        {' '}&bull;{' '}
                        {coinsRequired.toLocaleString('fr-FR')} requis
                      </p>
                    )}
                  </div>
                </div>
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: method === 'coins' ? 'var(--primary)' : 'var(--border)',
                    background: method === 'coins' ? 'var(--primary)' : 'transparent' }}
                >
                  {method === 'coins' && <Check size={10} strokeWidth={3} className="text-white" />}
                </div>
              </div>

              {/* Insufficient balance warning */}
              {method === 'coins' && !loadingW && !hasEnoughCoins && (
                <div
                  className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <AlertTriangle size={14} style={{ color: '#EF4444', flexShrink: 0 }} />
                  <p className="text-xs" style={{ color: '#EF4444' }}>
                    Solde insuffisant.{' '}
                    <button
                      onClick={e => { e.stopPropagation(); navigate('/wallet/buy'); }}
                      className="underline font-bold"
                    >
                      Recharger le wallet
                    </button>
                  </p>
                </div>
              )}
            </button>

            {/* Stripe option */}
            <button
              onClick={() => setMethod('stripe')}
              className="w-full rounded-2xl p-4 text-left transition-all"
              style={{
                background: method === 'stripe' ? 'linear-gradient(135deg,rgba(123,63,242,0.1),rgba(96,165,250,0.07))' : 'var(--surface)',
                border: method === 'stripe' ? '2px solid #7B3FF2' : '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(123,63,242,0.15)', color: '#7B3FF2' }}
                  >
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Payer par carte</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Visa, Mastercard, CB — via Stripe</p>
                  </div>
                </div>
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: method === 'stripe' ? '#7B3FF2' : 'var(--border)',
                    background: method === 'stripe' ? '#7B3FF2' : 'transparent' }}
                >
                  {method === 'stripe' && <Check size={10} strokeWidth={3} className="text-white" />}
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Order summary */}
        <div className="rounded-2xl p-4 space-y-2.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Recapitulatif</p>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Plan</span>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{plan.label}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Frequence</span>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Mensuel</span>
          </div>
          {plan.price > 0 && method === 'coins' && (
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Deduction wallet</span>
              <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                -{coinsRequired.toLocaleString('fr-FR')} coins
              </span>
            </div>
          )}
          <div
            className="flex items-center justify-between pt-2.5"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Total</span>
            <span className="text-base font-black" style={{ color: plan.color }}>
              {plan.price === 0 ? 'Gratuit' : `${plan.price.toFixed(2)} €`}
            </span>
          </div>
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={paying || (plan.price > 0 && method === 'coins' && !hasEnoughCoins)}
          className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          style={{ background: plan.gradient, boxShadow: `0 8px 24px ${plan.color}40` }}
        >
          {paying ? <Spinner size="sm" /> : `Confirmer l'abonnement`}
        </button>

        <p className="text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Vous pouvez annuler a tout moment depuis votre espace abonnement.
        </p>
      </div>
    </>
  );
}
