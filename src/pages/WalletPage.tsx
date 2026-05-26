import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Send, BarChart2, ArrowUpRight, RefreshCw,
  WifiOff, Gift, Star, RotateCcw, Circle, Zap,
  Users, Heart, Clock, TrendingUp, Ticket, UserCheck,
} from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Spinner } from '../components/ui/Spinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WalletBalance {
  coins_balance: number;
  coins_earned: number;
  coins_spent: number;
  total_earned: number;
  total_spent: number;
  pending_withdrawal: number;
}

interface Transaction {
  public_id: string;
  transaction_type: string;
  coins_amount: number;
  description: string | null;
  created_at: string;
  status: 'completed' | 'pending' | 'failed';
}

const coinsToEur = (c: number) => ((c / 100) * 0.5).toFixed(2);

const TX_CONFIG: Record<string, { icon: React.ReactNode; color: string; credit: boolean }> = {
  credit_purchase:      { icon: <ShoppingCart size={18} />, color: '#3B82F6',  credit: true  },
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
        apiClient.get<Transaction[]>(`${Endpoints.wallet.transactions}?limit=10`),
      ]);
      setBalance(balRes.data);
      setTxs(Array.isArray(txRes.data) ? txRes.data : []);
      animateCount(balRes.data?.coins_balance ?? 0);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur de chargement');
    }
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [fetchData]);

  const ACTIONS = [
    { icon: <ShoppingCart size={20} />, label: 'Acheter',        color: '#3B82F6', path: '/wallet/buy' },
    { icon: <Send size={20} />,         label: 'Transférer',     color: '#7B3FF2', path: '/wallet/transfer' },
    { icon: <Zap size={20} />,          label: 'Booster',        color: '#F59E0B', path: '/wallet/boost' },
    { icon: <BarChart2 size={20} />,    label: 'Créateur',       color: '#E85DAD', path: '/wallet/creator' },
    { icon: <ArrowUpRight size={20} />, label: 'Retirer',        color: '#3FEDB6', path: '/wallet/withdraw' },
    { icon: <UserCheck size={20} />,    label: 'Monétisation',   color: '#10B981', path: '/wallet/monetisation' },
    { icon: <Users size={20} />,        label: 'Parrainage',     color: '#6366F1', path: '/wallet/referral' },
    { icon: <Ticket size={20} />,       label: 'Mes billets',    color: '#F59E0B', path: '/my-tickets' },
    { icon: <TrendingUp size={20} />,   label: 'Tendances',      color: '#8B5CF6', path: '/trending' },
    { icon: <Heart size={20} />,        label: 'Favoris',        color: '#EF4444', path: '/favorites' },
    { icon: <Clock size={20} />,        label: 'Historique',     color: '#06B6D4', path: '/watch-history' },
  ];

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error && !balance) {
    return (
      <div className="max-w-2xl mx-auto p-6 flex flex-col items-center gap-4 py-20">
        <WifiOff size={48} style={{ color: 'var(--text-tertiary)' }} />
        <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{error}</p>
        <button onClick={() => { setLoading(true); fetchData().finally(() => setLoading(false)); }}
          className="btn-primary">Réessayer</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Mon Portefeuille</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Coins & transactions</p>
        </div>
        <button onClick={() => { setLoading(true); fetchData().finally(() => setLoading(false)); }}
          className="p-2.5 rounded-xl transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Balance card */}
      <div className="rounded-3xl p-8 flex flex-col items-center gap-1 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)', boxShadow: '0 12px 40px rgba(123,63,242,0.4)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1), transparent 60%)' }} />
        <p className="text-xs font-bold uppercase tracking-widest text-white/70">Solde total</p>
        <p className="text-6xl font-black text-white leading-none mt-1">{display.toLocaleString('fr-FR')}</p>
        <p className="text-base text-white/60 font-medium">coins</p>
        <div className="flex items-center gap-1 mt-3 px-4 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <span className="text-white/75 text-sm font-semibold">≈ {coinsToEur(balance?.coins_balance ?? 0)} EUR</span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-3">
        {ACTIONS.map(a => (
          <button key={a.label} onClick={() => navigate(a.path)}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = a.color)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: `${a.color}22`, color: a.color }}>
              {a.icon}
            </div>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Gagné',   value: balance?.coins_earned ?? 0,         color: '#22C55E' },
          { label: 'Dépensé', value: balance?.coins_spent ?? 0,          color: '#F0365A' },
          { label: 'Attente', value: balance?.pending_withdrawal ?? 0,   color: '#F59E0B' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xl font-black" style={{ color: s.color }}>{s.value.toLocaleString('fr-FR')}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <div>
        <h2 className="font-black text-base mb-3" style={{ color: 'var(--text-primary)' }}>Transactions récentes</h2>
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
              const isCredit = tx.coins_amount >= 0;
              return (
                <div key={tx.public_id} className="flex items-center gap-3 px-4 py-3.5"
                  style={{ borderBottom: i < txs.length - 1 ? '1px solid var(--border)' : 'none' }}>
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
                    <p className="text-sm font-black" style={{ color: isCredit ? '#22C55E' : '#F0365A' }}>
                      {isCredit ? '+' : ''}{tx.coins_amount.toLocaleString('fr-FR')} <span className="font-normal text-xs">coins</span>
                    </p>
                    {tx.status === 'pending' && <p className="text-[10px] font-medium" style={{ color: '#F59E0B' }}>En attente</p>}
                    {tx.status === 'failed'  && <p className="text-[10px] font-medium" style={{ color: '#F0365A' }}>Échoué</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
