import { PageLoader } from '../../components/ui/Spinner';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Monitor, Tv, Users, Download, Check, Settings,
} from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActiveSubscription {
  plan_id: string;
  status: string;
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

// ---------------------------------------------------------------------------
// Static plan data
// ---------------------------------------------------------------------------

const PLANS: PlanConfig[] = [
  {
    id: 'free',
    label: 'Gratuit',
    price: 0,
    screens: 1,
    quality: 'SD',
    profiles: 1,
    downloads: 0,
    gradient: 'linear-gradient(135deg,#6B7280,#9CA3AF)',
    color: '#6B7280',
    features: [
      'Contenu standard uniquement',
      '1 écran simultané',
      'Qualité SD',
      '1 profil utilisateur',
    ],
  },
  {
    id: 'basic',
    label: 'Basic',
    price: 4.99,
    screens: 2,
    quality: 'HD',
    profiles: 2,
    downloads: 5,
    gradient: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)',
    color: '#7B3FF2',
    features: [
      'Tout le contenu Basic',
      '2 écrans simultanés',
      'Qualité HD',
      '2 profils utilisateurs',
      '5 téléchargements / mois',
    ],
  },
  {
    id: 'premium',
    label: 'Premium',
    price: 9.99,
    screens: 4,
    quality: '4K',
    profiles: 4,
    downloads: 25,
    gradient: 'linear-gradient(135deg,#7B3FF2,#A855F7)',
    color: '#7B3FF2',
    features: [
      'Tout le contenu Premium',
      '4 écrans simultanés',
      'Qualité 4K Ultra HD',
      '4 profils utilisateurs',
      '25 téléchargements / mois',
      'Audio Dolby Atmos',
    ],
  },
  {
    id: 'family',
    label: 'Famille',
    price: 14.99,
    screens: 6,
    quality: '4K',
    profiles: 6,
    downloads: 50,
    gradient: 'linear-gradient(135deg,#10B981,#34D399)',
    color: '#10B981',
    features: [
      'Tout le contenu Premium',
      '6 écrans simultanés',
      'Qualité 4K Ultra HD',
      '6 profils utilisateurs',
      '50 téléchargements / mois',
      'Audio Dolby Atmos',
      'Contrôle parental avancé',
    ],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WalletSubscriptionPlansPage() {
  const navigate = useNavigate();
  const [activeSub,  setActiveSub]  = useState<ActiveSubscription | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [checking,   setChecking]   = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<ActiveSubscription>(Endpoints.subscriptions.me)
      .then(r => setActiveSub(r.data))
      .catch(() => setActiveSub(null))
      .finally(() => setLoadingSub(false));
  }, []);

  async function handleChoose(plan: PlanConfig) {
    setChecking(plan.id);
    try {
      const r = await apiClient.get<any>(Endpoints.subscriptions.walletCheck(plan.id));
      const data = r.data?.data ?? r.data;
      if (data?.sufficient === false) {
        toast(`Solde insuffisant — il vous manque ${data.missing ?? ''} coins.`);
      }
      navigate(`/wallet/subscription/payment?plan=${plan.id}`);
    } catch {
      navigate(`/wallet/subscription/payment?plan=${plan.id}`);
    } finally {
      setChecking(null);
    }
  }

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
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Plans d'abonnement</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Choisissez le plan adapte a vos besoins</p>
        </div>
      </div>

      {loadingSub ? (
        <PageLoader />
      ) : (
        <div className="space-y-4">
          {PLANS.map(plan => {
            const isActive  = activeSub?.plan_id === plan.id;
            const isBusy    = checking === plan.id;

            return (
              <div
                key={plan.id}
                className="rounded-2xl overflow-hidden"
                style={{ border: isActive ? `2px solid ${plan.color}` : '1px solid var(--border)', background: 'var(--surface)' }}
              >
                {/* Plan header with gradient */}
                <div
                  className="relative p-5"
                  style={{ background: plan.gradient }}
                >
                  {/* Shine overlay */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(circle at 80% 0%,rgba(255,255,255,0.18),transparent 55%)' }}
                  />

                  <div className="relative flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-black text-white">{plan.label}</span>
                        {isActive && (
                          <span
                            className="text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                            style={{ background: 'rgba(255,255,255,0.25)' }}
                          >
                            Plan actuel
                          </span>
                        )}
                      </div>
                      <p className="text-3xl font-black text-white leading-none">
                        {plan.price === 0 ? 'Gratuit' : `${plan.price.toFixed(2)} €`}
                        {plan.price > 0 && (
                          <span className="text-sm font-semibold text-white/70 ml-1">/ mois</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Specs row */}
                  <div className="relative flex flex-wrap gap-3 mt-4">
                    <span className="flex items-center gap-1 text-xs text-white/80 font-medium">
                      <Monitor size={12} /> {plan.screens} ecran{plan.screens > 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-white/80 font-medium">
                      <Tv size={12} /> {plan.quality}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-white/80 font-medium">
                      <Users size={12} /> {plan.profiles} profil{plan.profiles > 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-white/80 font-medium">
                      <Download size={12} /> {plan.downloads} dl
                    </span>
                  </div>
                </div>

                {/* Features list */}
                <div className="p-5 space-y-2">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-center gap-2.5">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: `${plan.color}20`, color: plan.color }}
                      >
                        <Check size={10} strokeWidth={3} />
                      </div>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="px-5 pb-5">
                  {isActive ? (
                    <button
                      onClick={() => navigate('/wallet/subscription/my')}
                      className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                      style={{ background: `${plan.color}18`, color: plan.color, border: `1px solid ${plan.color}40` }}
                    >
                      <Settings size={15} />
                      Gerer
                    </button>
                  ) : (
                    <button
                      onClick={() => handleChoose(plan)}
                      disabled={!!checking}
                      className="w-full py-3 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                      style={{ background: plan.gradient, boxShadow: `0 6px 20px ${plan.color}40` }}
                    >
                      {isBusy ? <Spinner size="sm" /> : 'Choisir ce plan'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
