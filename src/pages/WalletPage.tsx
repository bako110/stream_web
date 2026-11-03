import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Send, BarChart2, ArrowUpRight, RefreshCw,
  WifiOff, Gift, Star, RotateCcw, Circle, Zap,
  Ticket, UserCheck, CreditCard, Megaphone,
} from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Spinner , PageLoader} from '../components/ui/Spinner';
import { TransactionReceiptModal, txTypeLabel, type Receipt } from '../components/ui/TransactionReceiptModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WalletBalance {
  gogold_balance: number;
  gogold_earned: number;
  gogold_spent: number;
  total_earned: number;
  total_spent: number;
  pending_withdrawal: number;
}

interface Transaction {
  public_id: string;
  transaction_type: string;
  gogold_amount: number;
  description: string | null;
  created_at: string;
  status: 'completed' | 'pending' | 'failed';
  eur_amount?: number | string | null;
  balance_after?: number | null;
  reference_type?: string | null;
}

const TX_PAGE = 20;

const goGoldToEur = (c: number) => ((c / 100) * 0.35).toFixed(2);

const TX_CONFIG: Record<string, { icon: React.ReactNode; color: string; credit: boolean }> = {
  credit_purchase:      { icon: <ShoppingCart size={18} />, color: '#7B3FF2',  credit: true  },
  gift_sent:            { icon: <Gift size={18} />,         color: '#E85DAD',  credit: false },
  gift_received:        { icon: <Gift size={18} />,         color: '#3FEDB6',  credit: true  },
  transfer_sent:        { icon: <ArrowUpRight size={18} />, color: '#7B3FF2',  credit: false },
  transfer_received:    { icon: <ArrowUpRight size={18} />, color: '#3FEDB6',  credit: true  },
  withdrawal:           { icon: <ArrowUpRight size={18} />, color: '#FF8C4A',  credit: false },
  subscription_revenue: { icon: <Star size={18} />,         color: '#A855F7',  credit: true  },
  view_revenue:         { icon: <Star size={18} />,         color: '#14B8A6',  credit: true  },
  bonus:                { icon: <Star size={18} />,         color: '#FFD700',  credit: true  },
  refund:               { icon: <RotateCcw size={18} />,    color: '#9B65F5',  credit: true  },
  boost_purchase:       { icon: <ArrowUpRight size={18} />, color: '#06B6D4',  credit: false },
  referral_bonus:       { icon: <Star size={18} />,         color: '#84CC16',  credit: true  },
  default:              { icon: <Circle size={18} />,       color: '#6B698A',  credit: false },
};

export default function WalletPage() {
  const navigate   = useNavigate();
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [balance,  setBalance]  = useState<WalletBalance | null>(null);
  const [txs,      setTxs]      = useState<Transaction[]>([]);
  const [receipt,  setReceipt]  = useState<Receipt | null>(null);
  const [hasMoreTx, setHasMoreTx] = useState(false);
  const [loadingTx, setLoadingTx] = useState(false);
  const [display,  setDisplay]  = useState(0);
  const animRef = useRef<number | null>(null);

  function animateCount(target: number) {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const start  = performance.now();
    const duration = 1200;
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setDisplay(Math.floor(t * target));
      if (t < 1) animRef.current = requestAnimationFrame(step);
      else setDisplay(target);
    };
    animRef.current = requestAnimationFrame(step);
  }

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [balRes, txRes] = await Promise.all([
        apiClient.get<WalletBalance>(Endpoints.wallet.balance),
        apiClient.get<Transaction[]>(`${Endpoints.wallet.transactions}?limit=${TX_PAGE}`),
      ]);
      setBalance(balRes.data);
      const first = Array.isArray(txRes.data) ? txRes.data : [];
      setTxs(first);
      setHasMoreTx(first.length >= TX_PAGE);
      animateCount(balRes.data?.gogold_balance ?? 0);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur de chargement');
    }
  }, []);

  async function loadMoreTx() {
    if (loadingTx) return;
    setLoadingTx(true);
    try {
      const res = await apiClient.get<Transaction[]>(`${Endpoints.wallet.transactions}?limit=${TX_PAGE}&offset=${txs.length}`);
      const more = Array.isArray(res.data) ? res.data : [];
      setTxs(prev => [...prev, ...more]);
      setHasMoreTx(more.length >= TX_PAGE);
    } catch { setHasMoreTx(false); }
    finally { setLoadingTx(false); }
  }

  function openReceipt(tx: Transaction) {
    setReceipt({
      id: tx.public_id, type: tx.transaction_type, typeLabel: txTypeLabel(tx.transaction_type),
      status: tx.status, gogold: tx.gogold_amount,
      eur: tx.eur_amount != null ? Number(tx.eur_amount) : null,
      description: tx.description, balanceAfter: tx.balance_after ?? null,
      date: tx.created_at, referenceType: tx.reference_type ?? null,
    });
  }

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [fetchData]);

  const ACTIONS = [
    { icon: <ShoppingCart size={20} />, label: 'Acheter',      color: '#7B3FF2', path: '/wallet/buy' },
    { icon: <Send size={20} />,         label: 'Transférer',   color: '#7B3FF2', path: '/wallet/transfer' },
    { icon: <ArrowUpRight size={20} />, label: 'Retirer',      color: '#3FEDB6', path: '/wallet/withdraw' },
    { icon: <Zap size={20} />,          label: 'Booster',      color: '#7B3FF2', path: '/wallet/boost' },
    { icon: <Megaphone size={20} />,    label: 'Publicités',   color: '#7B3FF2', path: '/wallet/ads' },
    { icon: <BarChart2 size={20} />,    label: 'Créateur',     color: '#E85DAD', path: '/wallet/creator' },
    { icon: <UserCheck size={20} />,    label: 'Monétisation', color: '#10B981', path: '/wallet/monetisation' },
    { icon: <CreditCard size={20} />,   label: 'Abonnement',   color: '#A855F7', path: '/wallet/subscription/my' },
    { icon: <Ticket size={20} />,       label: 'Mes billets',  color: '#7B3FF2', path: '/my-tickets' },
  ];

  if (loading) return <PageLoader />;

  if (error && !balance) {
    return (
      <div className="w-full mx-auto p-6 flex flex-col items-center gap-4 py-20">
        <WifiOff size={48} style={{ color: 'var(--text-tertiary)' }} />
        <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{error}</p>
        <button onClick={() => { setLoading(true); fetchData().finally(() => setLoading(false)); }}
          className="btn-primary">Réessayer</button>
      </div>
    );
  }

  return (
    <div className="st-v2 w-full mx-auto px-4 py-5 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Mon Portefeuille</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>GoGold & transactions</p>
        </div>
        <button onClick={() => { setLoading(true); fetchData().finally(() => setLoading(false)); }}
          className="p-2.5 rounded-xl transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Balance card + Stats sur la même ligne */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Balance */}
        <div className="lg:col-span-2 rounded-2xl p-6 flex flex-col items-center gap-1 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 8px 32px rgba(123,63,242,0.35)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1), transparent 60%)' }} />
          <p className="text-xs font-bold uppercase tracking-widest text-white/70">Solde total</p>
          <p className="text-5xl font-black text-white leading-none mt-1">{display.toLocaleString('fr-FR')}</p>
          <p className="text-sm text-white/60 font-medium">GoGold</p>
          <div className="flex items-center gap-1 mt-2 px-4 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <span className="text-white/75 text-sm font-semibold">≈ {goGoldToEur(balance?.gogold_balance ?? 0)} EUR</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3">
          {[
            { label: 'Gagné',   value: balance?.gogold_earned ?? 0,       color: '#22C55E' },
            { label: 'Dépensé', value: balance?.gogold_spent ?? 0,        color: '#7B3FF2' },
            { label: 'Attente', value: balance?.pending_withdrawal ?? 0, color: '#7B3FF2' },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
              <p className="text-base font-black" style={{ color: s.color }}>{s.value.toLocaleString('fr-FR')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {ACTIONS.map(a => (
          <button key={a.label}
            onClick={() => navigate(a.path)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = a.color)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: `${a.color}22`, color: a.color }}>
              {a.icon}
            </div>
            <span className="text-[11px] font-semibold text-center leading-tight px-1" style={{ color: 'var(--text-primary)' }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Transactions */}
      <div>
        <h2 className="font-black text-sm mb-2" style={{ color: 'var(--text-primary)' }}>Transactions récentes</h2>
        {txs.length === 0 ? (
          <div className="rounded-2xl py-12 flex flex-col items-center gap-2"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <ShoppingCart size={36} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Aucune transaction</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Vos transactions apparaîtront ici</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {txs.map((tx, i) => {
              const cfg = TX_CONFIG[tx.transaction_type] ?? TX_CONFIG.default;
              const isCredit = tx.gogold_amount >= 0;
              return (
                <div key={tx.public_id} role="button" tabIndex={0} onClick={() => openReceipt(tx)}
                  onKeyDown={e => e.key === 'Enter' && openReceipt(tx)}
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors"
                  style={{ borderBottom: i < txs.length - 1 ? '1px solid var(--border)' : 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `${cfg.color}22`, color: cfg.color }}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {tx.description ?? tx.transaction_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                      {tx.public_id} · {format(new Date(tx.created_at), 'd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black" style={{ color: isCredit ? '#22C55E' : '#7B3FF2' }}>
                      {isCredit ? '+' : ''}{tx.gogold_amount.toLocaleString('fr-FR')} <span className="font-normal text-xs">GoGold</span>
                    </p>
                    {tx.status === 'pending' && <p className="text-[10px] font-medium" style={{ color: '#7B3FF2' }}>En attente</p>}
                    {tx.status === 'failed'  && <p className="text-[10px] font-medium" style={{ color: '#7B3FF2' }}>Échoué</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {hasMoreTx && (
          <button onClick={loadMoreTx} disabled={loadingTx}
            className="w-full mt-3 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-60"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--primary)' }}>
            {loadingTx ? 'Chargement…' : 'Voir plus de transactions'}
          </button>
        )}
      </div>
      <TransactionReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
