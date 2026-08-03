import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Info } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner, PageLoader } from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { extractApiErrorMessage } from '../../utils/apiError';

interface WalletBalance {
  gogold_balance: number;
  pending_withdrawal: number;
}

// Taux retrait : 100 GoGold = 0.35 € | Minimum : 500 GoGold = 1.75 €
const goGoldToEur = (c: number) => ((c / 100) * 0.35).toFixed(2);
const MIN_WITHDRAW = 500;

export default function WalletWithdrawPage() {
  const navigate = useNavigate();
  const [balance,     setBalance]     = useState<WalletBalance | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [amount,      setAmount]      = useState('');
  const [iban,        setIban]        = useState('');
  const [name,        setName]        = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    apiClient.get<WalletBalance>(Endpoints.wallet.balance)
      .then(r => setBalance(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleWithdraw() {
    const gogold = Number(amount);
    if (!gogold || gogold < MIN_WITHDRAW) { toast.error(`Minimum ${MIN_WITHDRAW} GoGold.`); return; }
    if (!iban.trim()) { toast.error('IBAN requis.'); return; }
    if (!name.trim()) { toast.error('Nom du titulaire requis.'); return; }
    if (balance && gogold > balance.gogold_balance) { toast.error('Solde insuffisant.'); return; }

    setWithdrawing(true);
    try {
      await apiClient.post(Endpoints.wallet.withdraw, { amount: gogold, iban: iban.trim(), account_name: name.trim() });
      toast.success('Demande de retrait envoyée ! Traitement sous 3-5 jours ouvrés.');
      navigate('/wallet');
    } catch (e: any) {
      toast.error(extractApiErrorMessage(e, 'Retrait échoué.'));
    } finally { setWithdrawing(false); }
  }

  if (loading) return <PageLoader />;

  const euros = goGoldToEur(Number(amount) || 0);

  return (
    <div className="w-full mx-auto px-4 py-6 space-y-5">

      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/wallet')}
          className="p-2.5 rounded-xl transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <ArrowLeft size={17} />
        </button>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Retirer mes gains</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Convertir vos GoGold en euros</p>
        </div>
      </div>

      {/* Balance info */}
      <div className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 8px 24px rgba(123,63,242,0.3)' }}>
        <div>
          <p className="text-xs text-white/70 font-medium">Solde disponible</p>
          <p className="text-3xl font-black text-white">{(balance?.gogold_balance ?? 0).toLocaleString('fr-FR')}</p>
          <p className="text-sm text-white/60">≈ {goGoldToEur(balance?.gogold_balance ?? 0)} EUR</p>
        </div>
        {(balance?.pending_withdrawal ?? 0) > 0 && (
          <div className="text-right">
            <p className="text-xs text-white/70">En attente</p>
            <p className="text-xl font-black text-white/80">{balance!.pending_withdrawal.toLocaleString('fr-FR')}</p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="rounded-xl px-4 py-3 flex items-start gap-2.5"
        style={{ background: 'rgba(123,63,242,0.08)', border: '1px solid rgba(123,63,242,0.2)' }}>
        <Info size={15} style={{ color: '#7B3FF2', flexShrink: 0, marginTop: 2 }} />
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Minimum {MIN_WITHDRAW} GoGold ({goGoldToEur(MIN_WITHDRAW)} €). Taux : 100 GoGold = 0,35 €. Délai : 3-5 jours ouvrés.
        </p>
      </div>

      {/* Form */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-black uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>Montant (GoGold)</label>
          <div className="flex items-center gap-2 px-4 rounded-xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <input
              type="number" min={MIN_WITHDRAW}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={String(MIN_WITHDRAW)}
              className="flex-1 bg-transparent py-3.5 text-2xl font-black outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
            <span className="text-sm font-bold" style={{ color: 'var(--text-tertiary)' }}>
              GoGold{Number(amount) > 0 ? ` = ${euros} €` : ''}
            </span>
          </div>
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>IBAN</label>
          <input
            value={iban}
            onChange={e => setIban(e.target.value.toUpperCase())}
            placeholder="FR76 3000 6000 0112 3456 7890 189"
            className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>Nom du titulaire</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Jean Dupont"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>

        <button
          onClick={handleWithdraw}
          disabled={withdrawing || !amount || Number(amount) < MIN_WITHDRAW}
          className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
          style={{ background: 'linear-gradient(135deg,#3FEDB6,#22C55E)', boxShadow: '0 8px 24px rgba(63,237,182,0.3)' }}>
          {withdrawing ? <Spinner size="sm" /> : <><ArrowUpRight size={16} /> Retirer {euros} €</>}
        </button>
      </div>
    </div>
  );
}
