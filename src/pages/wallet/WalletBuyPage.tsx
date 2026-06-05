import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Star, Crown, Sparkles, PenLine } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

const COINS_PER_EUR = 100; // 1 EUR = 100 coins

interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  bonus?: number;
  bonus_coins?: number;
  price_eur: number | string;
  is_popular?: boolean;
  popular?: boolean;
}

// Fallback si le backend est indisponible — aligné avec seed_default_data (1€ = 100 coins)
const MOCK_PACKAGES: CoinPackage[] = [
  { id: '1', name: 'Starter', coins: 100,  bonus_coins: 0,   price_eur: 0.99,  is_popular: false },
  { id: '2', name: 'Popular', coins: 500,  bonus_coins: 75,  price_eur: 3.99,  is_popular: true  },
  { id: '3', name: 'Pro',     coins: 1000, bonus_coins: 200, price_eur: 7.99,  is_popular: false },
  { id: '4', name: 'Elite',   coins: 2500, bonus_coins: 750, price_eur: 17.99, is_popular: false },
];

const PACK_ICONS = [Zap, Star, Sparkles, Crown, Crown, Crown];

function bonusOf(pkg: CoinPackage): number {
  return pkg.bonus_coins ?? pkg.bonus ?? 0;
}
function priceOf(pkg: CoinPackage): number {
  return Number(pkg.price_eur);
}
function isPopular(pkg: CoinPackage): boolean {
  return !!(pkg.is_popular ?? pkg.popular);
}

export default function WalletBuyPage() {
  const navigate = useNavigate();
  const [packages,    setPackages]   = useState<CoinPackage[]>(MOCK_PACKAGES);
  const [buying,      setBuying]     = useState<string | null>(null);
  const [selected,    setSelected]   = useState<string | null>(null);
  const [customEur,   setCustomEur]  = useState('');
  const [customMode,  setCustomMode] = useState(false);

  const customAmount = parseFloat(customEur.replace(',', '.')) || 0;
  const customCoins  = Math.floor(customAmount * COINS_PER_EUR);
  const customValid  = customAmount >= 1 && customAmount <= 500;

  useEffect(() => {
    apiClient.get<CoinPackage[]>(Endpoints.wallet.packages)
      .then(r => { if (Array.isArray(r.data) && r.data.length > 0) setPackages(r.data); })
      .catch(() => {});
  }, []);

  async function handleBuy(pkg: CoinPackage) {
    setBuying(pkg.id);
    try {
      await apiClient.post(Endpoints.wallet.purchase, {
        package_id: pkg.id,
        stripe_payment_intent_id: `pi_mock_${Date.now()}`,
      });
      toast.success(`+${(pkg.coins + bonusOf(pkg)).toLocaleString('fr-FR')} coins ajoutés !`);
      navigate('/wallet');
    } catch {
      toast.error('Paiement échoué. Réessayez.');
    } finally { setBuying(null); }
  }

  async function handleBuyCustom() {
    if (!customValid) return;
    setBuying('custom');
    try {
      await apiClient.post(Endpoints.wallet.purchaseCustom, {
        amount_eur: customAmount,
        stripe_payment_intent_id: `pi_mock_${Date.now()}`,
      });
      toast.success(`+${customCoins.toLocaleString('fr-FR')} coins ajoutés !`);
      navigate('/wallet');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Paiement échoué. Réessayez.');
    } finally { setBuying(null); }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/wallet')}
          className="p-2.5 rounded-xl transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <ArrowLeft size={17} />
        </button>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Acheter des coins</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Choisissez un pack ou saisissez un montant</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg,rgba(123,63,242,0.12),rgba(123,63,242,0.08))', border: '1px solid rgba(123,63,242,0.2)' }}>
        <Sparkles size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Les coins permettent d'offrir des cadeaux, de booster votre contenu et d'accéder à des fonctionnalités exclusives.
        </p>
      </div>

      {/* Toggle packs / montant libre */}
      <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'var(--bg-secondary)' }}>
        <button onClick={() => setCustomMode(false)}
          className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
          style={{
            background: !customMode ? 'var(--surface)' : 'transparent',
            color: !customMode ? 'var(--primary)' : 'var(--text-tertiary)',
            boxShadow: !customMode ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>
          Packs prédéfinis
        </button>
        <button onClick={() => { setCustomMode(true); setSelected(null); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all"
          style={{
            background: customMode ? 'var(--surface)' : 'transparent',
            color: customMode ? 'var(--primary)' : 'var(--text-tertiary)',
            boxShadow: customMode ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>
          <PenLine size={12} /> Montant libre
        </button>
      </div>

      {!customMode ? (
        <>
          {/* Package grid */}
          <div className="grid grid-cols-2 gap-3">
            {packages.map((pkg, i) => {
              const Icon       = PACK_ICONS[i] ?? Star;
              const isSelected = selected === pkg.id;
              const bonus      = bonusOf(pkg);
              const price      = priceOf(pkg);
              const popular    = isPopular(pkg);
              return (
                <button key={pkg.id}
                  onClick={() => setSelected(isSelected ? null : pkg.id)}
                  className="relative rounded-2xl p-4 text-left transition-all"
                  style={{
                    background: isSelected
                      ? 'linear-gradient(135deg,rgba(123,63,242,0.15),rgba(123,63,242,0.1))'
                      : 'var(--surface)',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                  }}>
                  {popular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-black px-2.5 py-0.5 rounded-full text-white"
                      style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
                      POPULAIRE
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg,rgba(123,63,242,0.15),rgba(123,63,242,0.1))', color: 'var(--primary)' }}>
                      <Icon size={18} />
                    </div>
                    <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{pkg.name}</span>
                  </div>
                  <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
                    {pkg.coins.toLocaleString('fr-FR')}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>coins</p>
                  {bonus > 0 && (
                    <p className="text-xs font-bold mt-0.5" style={{ color: '#22C55E' }}>
                      +{bonus.toLocaleString('fr-FR')} bonus
                    </p>
                  )}
                  <p className="text-base font-black mt-2" style={{ color: 'var(--primary)' }}>
                    {price.toFixed(2)} €
                  </p>
                </button>
              );
            })}
          </div>

          {/* Buy button pack */}
          {selected && (() => {
            const pkg   = packages.find(p => p.id === selected)!;
            const total = pkg.coins + bonusOf(pkg);
            const price = priceOf(pkg);
            return (
              <button onClick={() => handleBuy(pkg)} disabled={!!buying}
                className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 8px 24px rgba(123,63,242,0.35)' }}>
                {buying === selected
                  ? <Spinner size="sm" />
                  : `Acheter ${total.toLocaleString('fr-FR')} coins — ${price.toFixed(2)} €`}
              </button>
            );
          })()}
        </>
      ) : (
        /* Montant libre */
        <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Saisissez votre montant</p>

          <div className="relative">
            <input
              type="number"
              min="1"
              max="500"
              step="0.01"
              placeholder="Ex : 15"
              value={customEur}
              onChange={e => setCustomEur(e.target.value)}
              className="input w-full text-xl font-black pr-10"
              style={{ color: 'var(--text-primary)' }}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-lg font-black"
              style={{ color: 'var(--text-tertiary)' }}>€</span>
          </div>

          {customAmount > 0 && (
            <div className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg,rgba(123,63,242,0.1),rgba(123,63,242,0.07))', border: '1px solid rgba(123,63,242,0.15)' }}>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Vous recevrez</p>
              <p className="text-lg font-black" style={{ color: 'var(--primary)' }}>
                {customCoins.toLocaleString('fr-FR')} <span className="text-sm font-semibold">coins</span>
              </p>
            </div>
          )}

          {customEur !== '' && !customValid && (
            <p className="text-xs" style={{ color: '#EF4444' }}>
              {customAmount < 1 ? 'Minimum 1 €' : 'Maximum 500 €'}
            </p>
          )}

          <button onClick={handleBuyCustom} disabled={!customValid || buying === 'custom'}
            className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
            style={{
              background: customValid ? 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' : 'var(--bg-secondary)',
              boxShadow: customValid ? '0 8px 24px rgba(123,63,242,0.35)' : 'none',
            }}>
            {buying === 'custom'
              ? <Spinner size="sm" />
              : customValid
                ? `Acheter ${customCoins.toLocaleString('fr-FR')} coins — ${customAmount.toFixed(2)} €`
                : 'Saisissez un montant valide'}
          </button>
        </div>
      )}
    </div>
  );
}
