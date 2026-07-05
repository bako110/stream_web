import { PageLoader } from '../../components/ui/Spinner';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, TrendingUp, TrendingDown, DollarSign, ChevronRight } from 'lucide-react';
import { apiClient } from '../../api';
import { encodeId, decodeId } from '../../utils/slugId';
import { Spinner } from '../../components/ui/Spinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WalletInfo {
  gogold_balance: number;
  total_received: number;
  total_withdrawn: number;
  eur_balance?: number;
  eur_received?: number;
}

interface TxItem {
  id: string;
  tx_type: 'cotisation_received' | 'cotisation_refund' | 'withdrawal' | 'manual_credit' | 'manual_debit' | string;
  label: string;
  description?: string | null;
  actor_name?: string | null;
  amount: number;
  balance_after: number;
  created_at: string;
}

const TX_CONFIG: Record<string, { color: string; bg: string; icon: React.FC<any> }> = {
  cotisation_received: { color: '#10B981', bg: '#10B98115', icon: TrendingUp },
  manual_credit:       { color: '#10B981', bg: '#10B98115', icon: TrendingUp },
  cotisation_refund:   { color: '#EF4444', bg: '#EF444415', icon: TrendingDown },
  withdrawal:          { color: '#EF4444', bg: '#EF444415', icon: TrendingDown },
  manual_debit:        { color: '#EF4444', bg: '#EF444415', icon: TrendingDown },
};

function goGoldToEur(gogold: number): string {
  return ((gogold / 100) * 0.35).toFixed(2);
}

export default function CommunityTreasuryPage() {
  const { id: slug }  = useParams<{ id: string }>();
  const id             = decodeId(slug!);
  const navigate       = useNavigate();

  const [name,    setName]    = useState('');
  const [wallet,  setWallet]  = useState<WalletInfo | null>(null);
  const [txs,     setTxs]     = useState<TxItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [commRes, walletRes, txRes] = await Promise.all([
          apiClient.get<any>(`/api/v1/communities/${id}`),
          apiClient.get<any>(`/api/v1/communities/${id}/wallet`),
          apiClient.get<any>(`/api/v1/communities/${id}/wallet/transactions`),
        ]);
        const comm = commRes.data?.data ?? commRes.data;
        setName(comm?.name ?? '');
        setWallet(walletRes.data?.data ?? walletRes.data);
        const list = txRes.data?.data ?? txRes.data?.items ?? txRes.data;
        setTxs(Array.isArray(list) ? list : []);
      } catch {
        // fallback silencieux
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl transition-all"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Trésorerie</p>
          {name && <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{name}</p>}
        </div>
        <button
          onClick={() => navigate(`/communities/${encodeId(id)}/fund`)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
          style={{ background: 'var(--bg-secondary)', color: 'var(--primary)', border: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}>
          <DollarSign size={12} /> Cotisations
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Card solde principal */}
          <div className="m-4 rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #7B3FF2, #E0389A)' }}>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Briefcase size={20} color="white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-white/70">COMPTE COMMUNAUTAIRE</p>
                  <p className="text-xs font-semibold text-white/90">{name}</p>
                </div>
              </div>
              <p className="text-4xl font-black text-white mb-0.5">
                {(wallet?.gogold_balance ?? 0).toLocaleString()} <span className="text-xl font-bold text-white/80">GoGold</span>
              </p>
              <p className="text-sm text-white/60">≈ {goGoldToEur(wallet?.gogold_balance ?? 0)} EUR</p>
              <div className="flex gap-4 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-white/60">TOTAL COLLECTÉ</p>
                  <p className="text-sm font-bold text-white">{(wallet?.total_received ?? 0).toLocaleString()} GoGold</p>
                  <p className="text-[11px] text-white/50">{goGoldToEur(wallet?.total_received ?? 0)} EUR</p>
                </div>
                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 16 }}>
                  <p className="text-[10px] font-bold tracking-widest text-white/60">TOTAL RETIRÉ</p>
                  <p className="text-sm font-bold text-white">{(wallet?.total_withdrawn ?? 0).toLocaleString()} GoGold</p>
                  <p className="text-[11px] text-white/50">{goGoldToEur(wallet?.total_withdrawn ?? 0)} EUR</p>
                </div>
              </div>
            </div>
          </div>

          {/* Liens rapides */}
          <div className="mx-4 mb-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate(`/communities/${encodeId(id)}/fund`)}
              className="flex items-center gap-2.5 p-3.5 rounded-2xl transition-all text-left"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: '#10B98120' }}>
                <DollarSign size={16} color="#10B981" />
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Cotisations</p>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Gérer les fonds</p>
              </div>
              <ChevronRight size={14} className="ml-auto shrink-0" style={{ color: 'var(--text-tertiary)' }} />
            </button>
            <button
              onClick={() => navigate(`/communities/${encodeId(id)}/treasurer`)}
              className="flex items-center gap-2.5 p-3.5 rounded-2xl transition-all text-left"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: '#7B3FF220' }}>
                <Briefcase size={16} color="#7B3FF2" />
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Trésorier</p>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Retraits & élections</p>
              </div>
              <ChevronRight size={14} className="ml-auto shrink-0" style={{ color: 'var(--text-tertiary)' }} />
            </button>
          </div>

          {/* Historique transactions */}
          <div className="mx-4 mb-4">
            <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>
              HISTORIQUE DES TRANSACTIONS
            </p>
            {txs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 rounded-2xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <Briefcase size={28} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-tertiary)' }}>Aucune transaction</p>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {txs.map((tx, i) => {
                  const cfg = TX_CONFIG[tx.tx_type] ?? { color: 'var(--text-secondary)', bg: 'var(--bg-secondary)', icon: TrendingUp };
                  const Icon = cfg.icon;
                  const isCredit = tx.amount > 0;
                  return (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-3"
                      style={{ borderBottom: i < txs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: cfg.bg }}>
                        <Icon size={16} color={cfg.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{tx.label}</p>
                        {(tx.description || tx.actor_name) && (
                          <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                            {tx.actor_name ? `Par ${tx.actor_name}` : tx.description}
                          </p>
                        )}
                        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                          {format(new Date(tx.created_at), 'd MMM yyyy à HH:mm', { locale: fr })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold" style={{ color: isCredit ? '#10B981' : '#EF4444' }}>
                          {isCredit ? '+' : ''}{tx.amount.toLocaleString()} GoGold
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                          Solde : {tx.balance_after.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="h-4" />
        </div>
      )}
    </div>
  );
}
