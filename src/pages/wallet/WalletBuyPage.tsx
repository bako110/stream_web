import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Zap, Star, Crown, Sparkles, PenLine,
  ExternalLink, CheckCircle, XCircle, Clock, RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

const COINS_PER_EUR = 100;
const POLL_INTERVAL = 3000;
const MAX_POLL_TIME = 15 * 60 * 1000; // 15 min

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

interface CinetPayInitResponse {
  merchant_transaction_id: string;
  payment_url: string | null;
  transaction_id: string | null;
  must_be_redirected: boolean;
  status: string;
  message: string;
  coins_to_add: number;
  amount: number;
  currency: string;
}

interface CinetPayStatusResponse {
  merchant_transaction_id: string;
  status: 'INITIATED' | 'SUCCESS' | 'FAILED' | 'PENDING' | string;
  message: string;
  coins_added?: number;
  new_balance?: number;
}

const MOCK_PACKAGES: CoinPackage[] = [
  { id: '1', name: 'Starter', coins: 100,  bonus_coins: 0,   price_eur: 0.99,  is_popular: false },
  { id: '2', name: 'Popular', coins: 500,  bonus_coins: 75,  price_eur: 3.99,  is_popular: true  },
  { id: '3', name: 'Pro',     coins: 1000, bonus_coins: 200, price_eur: 7.99,  is_popular: false },
  { id: '4', name: 'Elite',   coins: 2500, bonus_coins: 750, price_eur: 17.99, is_popular: false },
];

const PACK_ICONS = [Zap, Star, Sparkles, Crown, Crown, Crown];

function bonusOf(pkg: CoinPackage): number { return pkg.bonus_coins ?? pkg.bonus ?? 0; }
function priceOf(pkg: CoinPackage): number  { return Number(pkg.price_eur); }
function isPopular(pkg: CoinPackage): boolean { return !!(pkg.is_popular ?? pkg.popular); }

type PayStep = 'select' | 'waiting' | 'success' | 'failed';

export default function WalletBuyPage() {
  const navigate = useNavigate();

  // Packages
  const [packages, setPackages]   = useState<CoinPackage[]>(MOCK_PACKAGES);
  const [selected, setSelected]   = useState<string | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customEur, setCustomEur]   = useState('');

  // CinetPay flow
  const [step, setStep]                 = useState<PayStep>('select');
  const [initiating, setInitiating]     = useState(false);
  const [merchantTxId, setMerchantTxId] = useState<string | null>(null);
  const [coinsToAdd, setCoinsToAdd]     = useState(0);
  const [statusMsg, setStatusMsg]       = useState('');
  const [finalBalance, setFinalBalance] = useState<number | null>(null);

  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStart  = useRef<number>(0);

  const customAmount = parseFloat(customEur.replace(',', '.')) || 0;
  const customCoins  = Math.floor(customAmount * COINS_PER_EUR);
  const customValid  = customAmount >= 1 && customAmount <= 500;

  useEffect(() => {
    apiClient.get<CoinPackage[]>(Endpoints.wallet.packages)
      .then(r => { if (Array.isArray(r.data) && r.data.length > 0) setPackages(r.data); })
      .catch(() => {});
  }, []);

  // Cleanup polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const pollStatus = useCallback(async (txId: string, expectedCoins: number) => {
    // Timeout global de 15 min
    if (Date.now() - pollStart.current > MAX_POLL_TIME) {
      stopPolling();
      setStep('failed');
      setStatusMsg('Délai dépassé. Si vous avez payé, contactez le support.');
      return;
    }

    try {
      const res = await apiClient.get<CinetPayStatusResponse>(
        Endpoints.wallet.cinetpayStatus(txId)
      );
      const { status, message, coins_added, new_balance } = res.data;
      setStatusMsg(message ?? '');

      if (status === 'SUCCESS') {
        stopPolling();
        setFinalBalance(new_balance ?? null);
        setCoinsToAdd(coins_added ?? expectedCoins);
        setStep('success');
      } else if (status === 'FAILED') {
        stopPolling();
        setStep('failed');
        setStatusMsg(message ?? 'Paiement refusé.');
      }
      // INITIATED / PENDING → on continue de poller
    } catch {
      // Silencieux, on continue
    }
  }, [stopPolling]);

  const startPolling = useCallback((txId: string, expectedCoins: number) => {
    pollStart.current = Date.now();
    pollRef.current = setInterval(() => pollStatus(txId, expectedCoins), POLL_INTERVAL);
  }, [pollStatus]);

  async function initPayment(packageId: string | null, amountEur: number | null, expectedCoins: number) {
    setInitiating(true);
    try {
      const body = packageId
        ? { package_id: packageId, direct_pay: false }
        : { custom_amount_eur: amountEur, direct_pay: false };

      const res = await apiClient.post<CinetPayInitResponse>(
        Endpoints.wallet.cinetpayInit, body
      );
      const data = res.data;

      setMerchantTxId(data.merchant_transaction_id);
      setCoinsToAdd(data.coins_to_add);
      setStatusMsg(data.message ?? 'En attente de votre paiement…');

      if (data.status === 'SUCCESS') {
        // Paiement direct confirmé immédiatement
        setStep('success');
        return;
      }

      // Ouvre la page CinetPay dans un nouvel onglet
      if (data.payment_url) {
        window.open(data.payment_url, '_blank', 'noopener,noreferrer');
      }

      setStep('waiting');
      startPolling(data.merchant_transaction_id, data.coins_to_add);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Impossible d\'initier le paiement.');
    } finally {
      setInitiating(false);
    }
  }

  function handleBuyPackage(pkg: CoinPackage) {
    initPayment(pkg.id, null, pkg.coins + bonusOf(pkg));
  }

  function handleBuyCustom() {
    if (!customValid) return;
    initPayment(null, customAmount, customCoins);
  }

  function handleRetry() {
    stopPolling();
    setStep('select');
    setMerchantTxId(null);
    setStatusMsg('');
    setFinalBalance(null);
  }

  // ── Écran succès ──────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="max-w-md mx-auto px-4 py-12 flex flex-col items-center gap-6 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.15),rgba(34,197,94,0.08))' }}>
          <CheckCircle size={44} style={{ color: '#22C55E' }} />
        </div>
        <div>
          <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Paiement confirmé</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            +{coinsToAdd.toLocaleString('fr-FR')} coins ont été ajoutés à votre portefeuille
          </p>
          {finalBalance != null && (
            <p className="text-xs mt-2 font-semibold" style={{ color: 'var(--text-tertiary)' }}>
              Nouveau solde : {finalBalance.toLocaleString('fr-FR')} coins
            </p>
          )}
        </div>
        <button
          onClick={() => navigate('/wallet')}
          className="w-full py-4 rounded-2xl font-black text-white text-sm"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 8px 24px rgba(123,63,242,0.35)' }}>
          Voir mon portefeuille
        </button>
      </div>
    );
  }

  // ── Écran échec ───────────────────────────────────────────────
  if (step === 'failed') {
    return (
      <div className="max-w-md mx-auto px-4 py-12 flex flex-col items-center gap-6 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.08))' }}>
          <XCircle size={44} style={{ color: '#EF4444' }} />
        </div>
        <div>
          <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Paiement échoué</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{statusMsg}</p>
        </div>
        <button onClick={handleRetry}
          className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 8px 24px rgba(123,63,242,0.35)' }}>
          <RefreshCw size={16} /> Réessayer
        </button>
        <button onClick={() => navigate('/wallet')}
          className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Retour au portefeuille
        </button>
      </div>
    );
  }

  // ── Écran attente de paiement ─────────────────────────────────
  if (step === 'waiting') {
    return (
      <div className="max-w-md mx-auto px-4 py-12 flex flex-col items-center gap-6 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,rgba(123,63,242,0.15),rgba(123,63,242,0.08))' }}>
          <Clock size={44} style={{ color: 'var(--primary)' }} />
        </div>
        <div>
          <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Paiement en cours</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            La page de paiement CinetPay s'est ouverte dans un nouvel onglet.
            Finalisez votre paiement puis revenez ici.
          </p>
          <p className="text-xs mt-3 font-medium" style={{ color: 'var(--text-tertiary)' }}>
            {statusMsg || 'En attente de confirmation…'}
          </p>
        </div>

        <div className="w-full rounded-2xl p-4 flex items-center justify-between"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="text-left">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Montant attendu</p>
            <p className="text-lg font-black" style={{ color: 'var(--primary)' }}>
              +{coinsToAdd.toLocaleString('fr-FR')} <span className="text-sm font-semibold">coins</span>
            </p>
          </div>
          <Spinner size="sm" />
        </div>

        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Votre solde sera mis à jour automatiquement dès confirmation.
        </p>

        {merchantTxId && (
          <button
            onClick={() => pollStatus(merchantTxId, coinsToAdd)}
            className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl transition-all"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            <RefreshCw size={13} /> Vérifier maintenant
          </button>
        )}

        <button onClick={handleRetry}
          className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Annuler et recommencer
        </button>
      </div>
    );
  }

  // ── Écran de sélection ────────────────────────────────────────
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
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Paiement sécurisé via CinetPay</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg,rgba(123,63,242,0.12),rgba(123,63,242,0.08))', border: '1px solid rgba(123,63,242,0.2)' }}>
        <ExternalLink size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Vous serez redirigé vers CinetPay pour finaliser le paiement (Orange Money, Wave, MTN, Moov, CB…).
          Votre solde est mis à jour automatiquement.
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

          {/* Buy button */}
          {selected && (() => {
            const pkg   = packages.find(p => p.id === selected)!;
            const total = pkg.coins + bonusOf(pkg);
            const price = priceOf(pkg);
            return (
              <button onClick={() => handleBuyPackage(pkg)} disabled={initiating}
                className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 8px 24px rgba(123,63,242,0.35)' }}>
                {initiating
                  ? <Spinner size="sm" />
                  : <><ExternalLink size={15} /> Payer {total.toLocaleString('fr-FR')} coins — {price.toFixed(2)} €</>}
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

          <button onClick={handleBuyCustom} disabled={!customValid || initiating}
            className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
            style={{
              background: customValid ? 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' : 'var(--bg-secondary)',
              boxShadow: customValid ? '0 8px 24px rgba(123,63,242,0.35)' : 'none',
            }}>
            {initiating
              ? <Spinner size="sm" />
              : customValid
                ? <><ExternalLink size={15} /> Payer {customCoins.toLocaleString('fr-FR')} coins — {customAmount.toFixed(2)} €</>
                : 'Saisissez un montant valide'}
          </button>
        </div>
      )}

      {/* Méthodes de paiement */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-bold mb-3" style={{ color: 'var(--text-tertiary)' }}>MODES DE PAIEMENT ACCEPTÉS</p>
        <div className="flex flex-wrap gap-2">
          {['Orange Money', 'Wave', 'MTN Mobile Money', 'Moov Money', 'Carte bancaire'].map(m => (
            <span key={m} className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
