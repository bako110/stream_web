import { useState, useEffect, useCallback } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../../components/ui/Dialog';
import {
  Plus, Zap, PauseCircle, PlayCircle, Trash2, BarChart2,
  ArrowLeft, RefreshCw, Info, Eye, MousePointer,
  CheckCircle, XCircle, Edit3, Megaphone, Percent, Pause,
} from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { PageLoader } from '../../components/ui/Spinner';

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
  gogold_debited?:   number;
  gogold_spent?:     number;
  gogold_remaining?: number;
}

const EUR_TO_GOGOLD = 100;

const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  feed: 'Feed principal', reels: 'Reels', stories: 'Stories', search: 'Recherche',
};
const STATUS_CONFIG: Record<AdStatus, { label: string; color: string }> = {
  draft:    { label: 'Brouillon', color: '#9CA3AF' },
  active:   { label: 'En ligne',  color: '#22C55E' },
  paused:   { label: 'En pause',  color: '#F59E0B' },
  ended:    { label: 'Terminée',  color: '#6B7280' },
  rejected: { label: 'Refusée',   color: '#EF4444' },
};

const CPM_TIERS = [
  { label: 'Économique', cpm: 1,  gogold: 100,  reach: '~1 000' },
  { label: 'Standard',   cpm: 2,  gogold: 200,  reach: '~500'   },
  { label: 'Premium',    cpm: 5,  gogold: 500,  reach: '~200'   },
  { label: 'Top',        cpm: 10, gogold: 1000, reach: '~100'   },
];
const HOW_IT_WORKS: { icon: ReactNode; text: string }[] = [
  { icon: <Zap size={12}/>,       text: 'Tu paies en GoGold — 100 GoGold = 1 €' },
  { icon: <Eye size={12}/>,       text: "Ta pub apparaît dans le feed de milliers d'utilisateurs" },
  { icon: <BarChart2 size={12}/>, text: 'Tu suis impressions, clics et CTR en temps réel' },
  { icon: <Pause size={12}/>,     text: 'Tu peux mettre en pause ou arrêter à tout moment' },
];

const fmt = (n: number) => n.toLocaleString('fr-FR');
const eur = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;

// Carte campagne — même structure que AdsScreen (mobile) : titre + statut,
// bloc budget GoGold restants, barre de consommation, stats. Toute la carte ouvre l'édition.
function AdCard({ ad, onPause, onResume, onDelete, onEdit }: {
  ad: Ad;
  onPause:  (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit:   (ad: Ad)     => void;
}) {
  const cfg          = STATUS_CONFIG[ad.status];
  const budgetGoGold = ad.gogold_debited   ?? Math.round(ad.budget_eur * EUR_TO_GOGOLD);
  const spentGoGold  = ad.gogold_spent     ?? Math.round(ad.spent_eur  * EUR_TO_GOGOLD);
  const remaining    = ad.gogold_remaining ?? Math.max(0, budgetGoGold - spentGoGold);
  const pct          = ad.budget_eur > 0 ? Math.min(ad.spent_eur / ad.budget_eur, 1) : 0;
  const cpmGoGold    = Math.round((ad.cpm_eur ?? 2) * EUR_TO_GOGOLD);
  const barColor     = pct > 0.9 ? '#EF4444' : pct > 0.7 ? '#F59E0B' : 'var(--primary)';
  const stop = (fn: () => void) => (e: MouseEvent) => { e.stopPropagation(); fn(); };

  return (
    <div onClick={() => onEdit(ad)}
      className="rounded-3xl p-4 flex flex-col gap-3 cursor-pointer transition-all hover:-translate-y-0.5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 2px 10px rgba(11,11,16,0.05)' }}>

      {/* Titre + statut + actions */}
      <div className="flex items-start gap-3">
        {ad.thumbnail_url || ad.creative_url ? (
          <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0">
            <img src={ad.thumbnail_url ?? ad.creative_url!} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center"
            style={{ background: 'rgba(123,63,242,0.12)' }}>
            <Megaphone size={18} style={{ color: 'var(--primary)' }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{ad.title}</p>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] flex-wrap">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
            <span className="font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
            <span style={{ color: 'var(--text-tertiary)' }}>· {PLACEMENT_LABELS[ad.placement] ?? ad.placement}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {ad.status === 'active' && (
            <button onClick={stop(() => onPause(ad.id))} title="Mettre en pause"
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ color: '#7B3FF2', background: 'rgba(123,63,242,0.1)' }}>
              <PauseCircle size={15} />
            </button>
          )}
          {ad.status === 'paused' && (
            <button onClick={stop(() => onResume(ad.id))} title="Reprendre"
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ color: '#22C55E', background: 'rgba(34,197,94,0.1)' }}>
              <PlayCircle size={15} />
            </button>
          )}
          {(ad.status === 'draft' || ad.status === 'ended' || ad.status === 'rejected') && (
            <button onClick={stop(() => onDelete(ad.id))} title="Supprimer"
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)' }}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Budget GoGold */}
      <div className="rounded-2xl p-3 flex items-center justify-between gap-3"
        style={{ background: 'rgba(123,63,242,0.07)', border: '1px solid rgba(123,63,242,0.15)' }}>
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-wider" style={{ color: 'var(--primary)' }}>BUDGET</p>
          <p className="text-lg font-black leading-tight" style={{ color: 'var(--primary)' }}>
            {fmt(remaining)} <span className="text-xs font-bold">GoGold restants</span>
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            {fmt(spentGoGold)} dépensés · {fmt(budgetGoGold)} total
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            = {eur(ad.spent_eur)} / {eur(ad.budget_eur)}
          </p>
        </div>
        <div className="shrink-0 rounded-xl px-2.5 py-1.5 text-center" style={{ background: 'rgba(123,63,242,0.13)' }}>
          <p className="text-[9px] font-bold tracking-wider" style={{ color: 'var(--primary)' }}>CPM</p>
          <p className="text-[11px] font-extrabold whitespace-nowrap" style={{ color: 'var(--primary)' }}>1 000 imp = {cpmGoGold} GoGold</p>
          <p className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>= {eur(ad.cpm_eur ?? 2)}</p>
        </div>
      </div>

      {/* Progression */}
      <div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, background: barColor }} />
        </div>
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>{Math.round(pct * 100)}% du budget consommé</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        {[
          { icon: <Eye size={13}/>,          label: 'Impressions',  value: fmt(ad.impressions) },
          { icon: <MousePointer size={13}/>, label: 'Clics',        value: fmt(ad.clicks) },
          { icon: <Percent size={13}/>,      label: 'CTR',          value: `${ad.ctr_pct}%` },
          { icon: <Zap size={13}/>,          label: 'GoGold rest.', value: fmt(remaining) },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center gap-0.5 min-w-0">
            <span style={{ color: 'var(--primary)' }}>{s.icon}</span>
            <span className="text-xs font-bold truncate max-w-full" style={{ color: 'var(--text-primary)' }}>{s.value}</span>
            <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WalletAdsPage() {
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirm();
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
    try { await apiClient.patch(Endpoints.ads.update(id), { status: 'paused' }); await fetchAds(); } catch {}
    setActing(null);
  }
  async function handleResume(id: string) {
    setActing(id);
    try { await apiClient.patch(Endpoints.ads.update(id), { status: 'active' }); await fetchAds(); } catch {}
    setActing(null);
  }
  async function handleDelete(id: string) {
    const ok = await confirm({ title: 'Supprimer cette campagne ?', message: 'Cette action est irréversible.', danger: true, confirmLabel: 'Supprimer' });
    if (!ok) return;
    setActing(id);
    try { await apiClient.delete(Endpoints.ads.delete(id)); await fetchAds(); } catch {}
    setActing(null);
  }

  const byStatus = (s: AdStatus) => ads.filter(a => a.status === s);

  // Stats globales — CTR global pondéré (clics / impressions), comme le mobile
  const totalBudgetGoGold = ads.reduce((s, a) => s + (a.gogold_debited ?? Math.round(a.budget_eur * EUR_TO_GOGOLD)), 0);
  const totalBudgetEur    = ads.reduce((s, a) => s + a.budget_eur, 0);
  const totalSpentEur     = ads.reduce((s, a) => s + a.spent_eur, 0);
  const totalImpressions  = ads.reduce((s, a) => s + a.impressions, 0);
  const totalClicks       = ads.reduce((s, a) => s + a.clicks, 0);
  const globalCtr         = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const activeCount       = byStatus('active').length;
  const remainingImpressions = ads
    .filter(a => a.status === 'active' || a.status === 'paused')
    .reduce((s, a) => s + Math.round(((a.budget_eur - a.spent_eur) / (a.cpm_eur > 0 ? a.cpm_eur : 2)) * 1000), 0);

  const groups = [
    { label: 'En ligne',   icon: <Zap size={14}/>,         color: '#10B981', items: byStatus('active')   },
    { label: 'En pause',   icon: <PauseCircle size={14}/>,  color: '#F59E0B', items: byStatus('paused')   },
    { label: 'Brouillons', icon: <Edit3 size={14}/>,        color: '#6B7280', items: byStatus('draft')    },
    { label: 'Terminées',  icon: <CheckCircle size={14}/>,  color: '#6B7280', items: byStatus('ended')    },
    { label: 'Refusées',   icon: <XCircle size={14}/>,      color: '#EF4444', items: byStatus('rejected') },
  ].filter(g => g.items.length > 0);

  if (loading) return <PageLoader />;

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 pb-8">

      {/* Header — pilule flottante (même design que AdsScreen mobile) */}
      <div className="sticky top-2 z-10 mt-2 mb-5 flex items-center gap-3 pl-2 pr-3 py-2 rounded-full"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)',
          boxShadow: '0 1px 2px rgba(11,11,16,0.05), 0 8px 20px rgba(11,11,16,0.08)' }}>
        <button onClick={() => navigate('/wallet')} title="Retour"
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-black truncate" style={{ color: 'var(--text-primary)' }}>Mes publicités</h1>
          <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>100 GoGold = 1 € de budget pub</p>
        </div>
        <button onClick={() => { setLoading(true); fetchAds().finally(() => setLoading(false)); }} title="Actualiser"
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
          <RefreshCw size={15} />
        </button>
        <button onClick={() => navigate('/wallet/ads/create')}
          className="flex items-center gap-1.5 px-4 h-9 rounded-full text-sm font-bold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 4px 14px rgba(123,63,242,0.3)' }}>
          <Plus size={15} /> Créer
        </button>
      </div>

      <div className="space-y-5">
        {/* Comment ça marche */}
        <div className="space-y-3">
          <div className="rounded-3xl p-5" style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
            <div className="flex items-center gap-2 mb-3 text-white">
              <Megaphone size={18} />
              <p className="font-black text-base">Comment ça marche ?</p>
            </div>
            <div className="space-y-2">
              {HOW_IT_WORKS.map((r, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white"
                    style={{ background: 'rgba(255,255,255,0.2)' }}>{r.icon}</span>
                  <p className="text-[13px] leading-snug" style={{ color: 'rgba(255,255,255,0.92)' }}>{r.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-4 py-3 flex items-center gap-1.5" style={{ background: 'rgba(123,63,242,0.07)' }}>
              <Info size={13} style={{ color: 'var(--primary)' }} />
              <p className="text-xs font-extrabold" style={{ color: 'var(--primary)' }}>Tarifs — Coût pour 1 000 impressions (CPM)</p>
            </div>
            {CPM_TIERS.map((t, i) => (
              <div key={t.label} className="flex items-center gap-2.5 px-4 py-2.5"
                style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--primary)' }} />
                <span className="text-[13px] font-bold w-24 shrink-0" style={{ color: 'var(--text-primary)' }}>{t.label}</span>
                <span className="flex-1 text-xs min-w-0" style={{ color: 'var(--text-secondary)' }}>
                  {eur(t.cpm)} · <b style={{ color: 'var(--primary)' }}>{t.gogold} GoGold</b> / 1 000 imp.
                </span>
                <span className="text-[11px] shrink-0" style={{ color: 'var(--text-tertiary)' }}>{t.reach} imp/€</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vue d'ensemble */}
        {ads.length > 0 && (
          <div className="rounded-3xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
              Vue d'ensemble · <span style={{ color: 'var(--primary)' }}>{activeCount} active{activeCount !== 1 ? 's' : ''}</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Budget total', value: `${fmt(totalBudgetGoGold)} c`,                              sub: eur(totalBudgetEur) },
                { label: 'Dépensé',      value: `${fmt(Math.round(totalSpentEur * EUR_TO_GOGOLD))} c`,      sub: eur(totalSpentEur) },
                { label: 'Impressions',  value: fmt(totalImpressions),                                      sub: 'vues réelles' },
                { label: 'CTR moyen',    value: `${globalCtr.toFixed(2)}%`,                                 sub: 'taux clic' },
              ].map(g => (
                <div key={g.label} className="rounded-2xl p-3" style={{ background: 'rgba(123,63,242,0.07)' }}>
                  <p className="text-base font-black" style={{ color: 'var(--primary)' }}>{g.value}</p>
                  <p className="text-[10px] font-semibold" style={{ color: 'rgba(123,63,242,0.7)' }}>{g.sub}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{g.label}</p>
                </div>
              ))}
            </div>
            {remainingImpressions > 0 && (
              <div className="rounded-2xl p-3" style={{ background: 'rgba(123,63,242,0.07)' }}>
                <p className="text-[13px] font-black flex items-center gap-1.5" style={{ color: 'var(--primary)' }}>
                  <Eye size={13} /> ~{fmt(remainingImpressions)} imp. restantes estimées
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  Sur budget restant des campagnes actives / en pause
                </p>
              </div>
            )}
          </div>
        )}

        {/* Vide */}
        {ads.length === 0 && (
          <div className="rounded-3xl py-14 px-6 flex flex-col items-center gap-4 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(123,63,242,0.1)' }}>
              <Megaphone size={36} style={{ color: '#7B3FF2' }} />
            </div>
            <div>
              <p className="font-black text-base mb-1" style={{ color: 'var(--text-primary)' }}>Lance ta première campagne</p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Touche des milliers d'utilisateurs dès 100 GoGold (1 €). Tu contrôles ton budget, tu pauses quand tu veux.
              </p>
            </div>
            <button onClick={() => navigate('/wallet/ads/create')}
              className="flex items-center gap-2 px-5 h-10 rounded-full font-bold text-sm text-white"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
              <Plus size={15} /> Créer ma première pub
            </button>
          </div>
        )}

        {/* Groupes */}
        {groups.map(g => (
          <section key={g.label} className="space-y-3">
            <div className="flex items-center gap-2 pl-3" style={{ borderLeft: `3px solid ${g.color}` }}>
              <span style={{ color: g.color }}>{g.icon}</span>
              <h2 className="font-black text-sm" style={{ color: g.color }}>{g.label}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: `${g.color}22`, color: g.color }}>
                {g.items.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {g.items.map(ad => (
                <div key={ad.id} style={{ opacity: acting === ad.id ? 0.6 : 1, pointerEvents: acting === ad.id ? 'none' : undefined }}>
                  <AdCard ad={ad} onPause={handlePause} onResume={handleResume} onDelete={handleDelete}
                    onEdit={(a) => navigate('/wallet/ads/create', { state: { ad: a } })} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      {ConfirmDialog}
    </div>
  );
}
