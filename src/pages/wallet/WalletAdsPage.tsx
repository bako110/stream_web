import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Zap, PauseCircle, PlayCircle, Trash2, BarChart2,
  ArrowLeft, RefreshCw, Info, TrendingUp, Eye, MousePointer,
  CheckCircle, XCircle, Edit3, Megaphone,
} from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';

export type AdStatus    = 'draft' | 'active' | 'paused' | 'ended' | 'rejected';
export type AdPlacement = 'feed' | 'reels' | 'stories' | 'search';
export type AdFormat    = 'image' | 'video' | 'native';

export interface Ad {
  id: string;
  advertiser_id: string;
  title: string;
  description: string | null;
  cta_text: string | null;
  cta_url: string | null;
  creative_url: string | null;
  thumbnail_url: string | null;
  format: AdFormat;
  placement: AdPlacement;
  status: AdStatus;
  budget_eur: number;
  spent_eur: number;
  cpm_eur: number;
  daily_budget_eur: number | null;
  impressions: number;
  clicks: number;
  ctr_pct: number;
  target_countries: string[] | null;
  target_interests: string[] | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  coins_debited?: number;
}

const EUR_TO_COINS = 100;
const coinsToEur = (c: number) => ((c / EUR_TO_COINS) * 1).toFixed(2);

const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  feed: 'Feed principal', reels: 'Reels', stories: 'Stories', search: 'Recherche',
};
const STATUS_CONFIG: Record<AdStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft:    { label: 'Brouillon',  color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', icon: <Edit3 size={12}/>     },
  active:   { label: 'En ligne',   color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   icon: <Zap size={12}/>        },
  paused:   { label: 'En pause',   color: '#7B3FF2', bg: 'rgba(123,63,242,0.12)',  icon: <PauseCircle size={12}/> },
  ended:    { label: 'Terminée',   color: '#6B7280', bg: 'rgba(107,114,128,0.12)', icon: <CheckCircle size={12}/> },
  rejected: { label: 'Refusée',    color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   icon: <XCircle size={12}/>     },
};

const CPM_TIERS = [
  { label: 'Économique', cpm: 1,  coins: 100,  est: '~1000 imp/€' },
  { label: 'Standard',   cpm: 2,  coins: 200,  est: '~500 imp/€'  },
  { label: 'Premium',    cpm: 5,  coins: 500,  est: '~200 imp/€'  },
  { label: 'Top',        cpm: 10, coins: 1000, est: '~100 imp/€'  },
];

function AdCard({ ad, onPause, onResume, onDelete, onEdit }: {
  ad: Ad;
  onPause:  (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit:   (ad: Ad)     => void;
}) {
  const cfg         = STATUS_CONFIG[ad.status];
  const budgetCoins = Math.round(ad.budget_eur * EUR_TO_COINS);
  const spentCoins  = Math.round(ad.spent_eur  * EUR_TO_COINS);
  const remaining   = budgetCoins - spentCoins;
  const progress    = budgetCoins > 0 ? Math.min((spentCoins / budgetCoins) * 100, 100) : 0;
  const cpmCoins    = Math.round(ad.cpm_eur * EUR_TO_COINS);

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ color: cfg.color, background: cfg.bg }}>
              {cfg.icon} {cfg.label}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
              {PLACEMENT_LABELS[ad.placement]}
            </span>
          </div>
          <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{ad.title}</p>
          {ad.description && (
            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{ad.description}</p>
          )}
        </div>
        {/* Thumbnail */}
        {ad.thumbnail_url || ad.creative_url ? (
          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
            <img src={ad.thumbnail_url ?? ad.creative_url!} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,rgba(123,63,242,0.2),rgba(123,63,242,0.1))' }}>
            <Megaphone size={20} style={{ color: 'var(--primary)' }} />
          </div>
        )}
      </div>

      {/* Budget progress */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span style={{ color: 'var(--text-tertiary)' }}>Budget utilisé</span>
          <span style={{ color: 'var(--text-secondary)' }}>
            {spentCoins.toLocaleString('fr-FR')} / {budgetCoins.toLocaleString('fr-FR')} coins
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: progress > 85 ? '#EF4444' : progress > 60 ? '#7B3FF2' : '#22C55E' }} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-px" style={{ borderTop: '1px solid var(--border)' }}>
        {[
          { icon: <Eye size={12}/>,           label: 'Impressions', value: ad.impressions.toLocaleString('fr-FR') },
          { icon: <MousePointer size={12}/>,  label: 'Clics',       value: ad.clicks.toLocaleString('fr-FR')      },
          { icon: <TrendingUp size={12}/>,    label: 'CTR',         value: `${ad.ctr_pct.toFixed(1)}%`            },
          { icon: <Zap size={12}/>,           label: 'Restant',     value: `${remaining.toLocaleString('fr-FR')} c` },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center py-2.5 gap-0.5"
            style={{ background: 'var(--bg-secondary)' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>{s.icon}</span>
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</span>
            <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* CPM */}
      <div className="px-4 py-2.5 flex items-center justify-between"
        style={{ borderTop: '1px solid var(--border)' }}>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          CPM : <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>{cpmCoins} coins ({ad.cpm_eur}€)</span>
        </span>
        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => onEdit(ad)}
            className="p-1.5 rounded-lg transition-all text-xs"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}
            title="Modifier">
            <Edit3 size={13} />
          </button>
          {ad.status === 'active' && (
            <button onClick={() => onPause(ad.id)}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: '#7B3FF2', background: 'rgba(123,63,242,0.1)' }}
              title="Mettre en pause">
              <PauseCircle size={13} />
            </button>
          )}
          {ad.status === 'paused' && (
            <button onClick={() => onResume(ad.id)}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: '#22C55E', background: 'rgba(34,197,94,0.1)' }}
              title="Reprendre">
              <PlayCircle size={13} />
            </button>
          )}
          {(ad.status === 'draft' || ad.status === 'ended' || ad.status === 'rejected') && (
            <button onClick={() => onDelete(ad.id)}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)' }}
              title="Supprimer">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WalletAdsPage() {
  const navigate = useNavigate();
  const [ads,     setAds]     = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState<string | null>(null);

  const fetchAds = useCallback(async () => {
    try {
      const r = await apiClient.get<Ad[]>(Endpoints.ads.mine);
      setAds(Array.isArray(r.data) ? r.data : []);
    } catch { setAds([]); }
  }, []);

  useEffect(() => { fetchAds().finally(() => setLoading(false)); }, [fetchAds]);

  async function handlePause(id: string) {
    setActing(id);
    try { await apiClient.post(Endpoints.ads.pause(id)); await fetchAds(); } catch {}
    setActing(null);
  }
  async function handleResume(id: string) {
    setActing(id);
    try { await apiClient.post(Endpoints.ads.resume(id)); await fetchAds(); } catch {}
    setActing(null);
  }
  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette campagne ?')) return;
    setActing(id);
    try { await apiClient.delete(Endpoints.ads.delete(id)); await fetchAds(); } catch {}
    setActing(null);
  }

  // Grouper par statut
  const byStatus = (s: AdStatus) => ads.filter(a => a.status === s);
  const active   = byStatus('active');
  const paused   = byStatus('paused');
  const drafts   = byStatus('draft');
  const ended    = byStatus('ended');
  const rejected = byStatus('rejected');

  // Stats globales
  const totalBudget     = ads.reduce((s, a) => s + a.budget_eur * EUR_TO_COINS, 0);
  const totalSpent      = ads.reduce((s, a) => s + a.spent_eur  * EUR_TO_COINS, 0);
  const totalImpressions = ads.reduce((s, a) => s + a.impressions, 0);
  const avgCtr          = ads.length ? ads.reduce((s, a) => s + a.ctr_pct, 0) / ads.length : 0;

  const groups = [
    { label: 'En ligne',   icon: <Zap size={14}/>,         color: '#22C55E', items: active   },
    { label: 'En pause',   icon: <PauseCircle size={14}/>,  color: '#7B3FF2', items: paused   },
    { label: 'Brouillons', icon: <Edit3 size={14}/>,        color: '#9CA3AF', items: drafts   },
    { label: 'Terminées',  icon: <CheckCircle size={14}/>,  color: '#6B7280', items: ended    },
    { label: 'Refusées',   icon: <XCircle size={14}/>,      color: '#EF4444', items: rejected },
  ].filter(g => g.items.length > 0);

  if (loading) return (
    <div className="max-w-4xl mx-auto p-6 flex justify-center py-20"><Spinner size="lg" /></div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/wallet')}
            className="p-2 rounded-xl transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Megaphone size={20} style={{ color: '#7B3FF2' }} /> Mes Publicités
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Gérez vos campagnes publicitaires</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setLoading(true); fetchAds().finally(() => setLoading(false)); }}
            className="p-2 rounded-xl transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <RefreshCw size={15} />
          </button>
          <button onClick={() => navigate('/wallet/ads/create')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 4px 16px rgba(123,63,242,0.3)' }}>
            <Plus size={15} /> Créer
          </button>
        </div>
      </div>

      {/* Comment ça marche */}
      <div className="rounded-2xl p-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,rgba(123,63,242,0.12),rgba(123,63,242,0.06))', border: '1px solid rgba(123,63,242,0.2)' }}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(123,63,242,0.15)' }}>
            <Info size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Comment ça marche</p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              Vos pubs sont diffusées nativement dans le feed, les reels, les stories et la recherche.
              Vous payez au CPM (coût pour 1000 impressions) en coins.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CPM_TIERS.map(t => (
                <div key={t.label} className="rounded-xl p-2.5 text-center"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>{t.label}</p>
                  <p className="text-base font-black mt-0.5" style={{ color: 'var(--primary)' }}>{t.coins} coins</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t.est}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats globales — seulement si ads */}
      {ads.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Budget total',    value: `${totalBudget.toLocaleString('fr-FR')} coins`,     color: '#7B3FF2', icon: <Zap size={16}/> },
            { label: 'Dépensé',         value: `${totalSpent.toLocaleString('fr-FR')} coins`,      color: '#EF4444', icon: <BarChart2 size={16}/> },
            { label: 'Impressions',     value: totalImpressions.toLocaleString('fr-FR'),           color: '#7B3FF2', icon: <Eye size={16}/> },
            { label: 'CTR moyen',       value: `${avgCtr.toFixed(1)}%`,                            color: '#22C55E', icon: <TrendingUp size={16}/> },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${s.color}18`, color: s.color }}>
                  {s.icon}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{s.label}</p>
              </div>
              <p className="text-base font-black" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Campagnes vides */}
      {ads.length === 0 && (
        <div className="rounded-2xl py-16 flex flex-col items-center gap-4 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(123,63,242,0.1)' }}>
            <Megaphone size={32} style={{ color: '#7B3FF2' }} />
          </div>
          <div>
            <p className="font-black text-base mb-1" style={{ color: 'var(--text-primary)' }}>Aucune campagne</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Créez votre première pub pour toucher plus d'utilisateurs</p>
          </div>
          <button onClick={() => navigate('/wallet/ads/create')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
            <Plus size={15} /> Créer ma première pub
          </button>
        </div>
      )}

      {/* Groupes de campagnes */}
      {groups.map(g => (
        <section key={g.label} className="space-y-3">
          <div className="flex items-center gap-2">
            <span style={{ color: g.color }}>{g.icon}</span>
            <h2 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{g.label}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background: `${g.color}18`, color: g.color }}>
              {g.items.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {g.items.map(ad => (
              <div key={ad.id} style={{ opacity: acting === ad.id ? 0.6 : 1, pointerEvents: acting === ad.id ? 'none' : undefined }}>
                <AdCard ad={ad} onPause={handlePause} onResume={handleResume} onDelete={handleDelete} onEdit={(a) => navigate('/wallet/ads/create', { state: { ad: a } })} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
