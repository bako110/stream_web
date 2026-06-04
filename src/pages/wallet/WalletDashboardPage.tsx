import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Gift, Eye, Heart, Users, DollarSign } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CreatorStats {
  total_gifts_received: number;
  total_coins_earned: number;
  total_views: number;
  total_likes: number;
  total_followers: number;
  earnings_this_month: number;
  earnings_last_month: number;
  top_content: Array<{ id: string; title: string; views: number; likes: number; gifts: number }>;
}

const coinsToEur = (c: number) => ((c / 100) * 0.35).toFixed(2);

export default function WalletDashboardPage() {
  const navigate = useNavigate();
  const [stats,   setStats]   = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<CreatorStats>(Endpoints.wallet.creatorStats)
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="max-w-2xl mx-auto p-6 flex justify-center py-20"><Spinner /></div>
  );

  const month = format(new Date(), 'MMMM yyyy', { locale: fr });

  const KPI = [
    { label: 'Gains ce mois',   value: `${coinsToEur(stats?.earnings_this_month ?? 0)} €`,  sub: `${(stats?.earnings_this_month ?? 0).toLocaleString('fr-FR')} coins`, color: '#22C55E', icon: <DollarSign size={18}/> },
    { label: 'Cadeaux reçus',   value: (stats?.total_gifts_received ?? 0).toLocaleString('fr-FR'), color: '#E85DAD', icon: <Gift size={18}/> },
    { label: 'Vues totales',    value: (stats?.total_views ?? 0).toLocaleString('fr-FR'),  color: '#3B82F6', icon: <Eye size={18}/> },
    { label: 'Likes totaux',    value: (stats?.total_likes ?? 0).toLocaleString('fr-FR'),  color: '#F0365A', icon: <Heart size={18}/> },
    { label: 'Abonnés',         value: (stats?.total_followers ?? 0).toLocaleString('fr-FR'), color: '#7B3FF2', icon: <Users size={18}/> },
    { label: 'Total gagné',     value: `${coinsToEur(stats?.total_coins_earned ?? 0)} €`,  sub: `${(stats?.total_coins_earned ?? 0).toLocaleString('fr-FR')} coins`, color: '#F59E0B', icon: <TrendingUp size={18}/> },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/wallet')}
          className="p-2.5 rounded-xl transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <ArrowLeft size={17} />
        </button>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Dashboard Créateur</h1>
          <p className="text-xs capitalize" style={{ color: 'var(--text-tertiary)' }}>{month}</p>
        </div>
      </div>

      {/* Month comparison */}
      {stats && (
        <div className="rounded-2xl p-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)', boxShadow: '0 10px 32px rgba(123,63,242,0.3)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 80% 10%, rgba(255,255,255,0.12), transparent 55%)' }} />
          <p className="text-xs text-white/70 font-medium uppercase tracking-wider mb-3">Gains</p>
          <div className="flex items-end gap-6">
            <div>
              <p className="text-3xl font-black text-white">{coinsToEur(stats.earnings_this_month)} €</p>
              <p className="text-xs text-white/60">Ce mois</p>
            </div>
            <div className="pb-1">
              <p className="text-xl font-black text-white/60">{coinsToEur(stats.earnings_last_month)} €</p>
              <p className="text-xs text-white/40">Mois dernier</p>
            </div>
          </div>
          {stats.earnings_last_month > 0 && (
            <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black text-white"
              style={{ background: stats.earnings_this_month >= stats.earnings_last_month ? 'rgba(34,197,94,0.25)' : 'rgba(240,54,90,0.25)' }}>
              <TrendingUp size={11} />
              {stats.earnings_this_month >= stats.earnings_last_month ? '+' : ''}
              {(((stats.earnings_this_month - stats.earnings_last_month) / stats.earnings_last_month) * 100).toFixed(0)}%
            </div>
          )}
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        {KPI.map(k => (
          <div key={k.label} className="rounded-2xl p-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: `${k.color}18`, color: k.color }}>
                {k.icon}
              </div>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{k.label}</p>
            </div>
            <p className="text-xl font-black" style={{ color: k.color }}>{k.value}</p>
            {k.sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* Top content */}
      {stats?.top_content && stats.top_content.length > 0 && (
        <div>
          <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Meilleur contenu</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {stats.top_content.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: i < stats.top_content.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span className="text-lg font-black w-6 text-center" style={{ color: i === 0 ? '#F59E0B' : 'var(--text-tertiary)' }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                      <Eye size={11}/>{item.views.toLocaleString('fr-FR')}
                    </span>
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                      <Heart size={11}/>{item.likes.toLocaleString('fr-FR')}
                    </span>
                    <span className="text-xs flex items-center gap-1" style={{ color: '#E85DAD' }}>
                      <Gift size={11}/>{item.gifts.toLocaleString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!stats && (
        <div className="rounded-2xl py-16 flex flex-col items-center gap-3 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <TrendingUp size={40} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
          <p className="font-black text-base" style={{ color: 'var(--text-primary)' }}>Aucune donnée disponible</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Créez du contenu pour voir vos statistiques.</p>
        </div>
      )}
    </div>
  );
}
