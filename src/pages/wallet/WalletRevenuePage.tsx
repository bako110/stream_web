import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, Wallet, Video,
  ChevronRight, List,
} from 'lucide-react';
import { Spinner } from '../../components/ui/Spinner';
import { revenueService } from '../../api/revenueService';
import type {
  RevenueSummary, RevenueTimeseriesPoint, RevenueSourceBreakdown, RevenueContentItem,
} from '../../api/revenueService';
import { RevenueBarChart } from '../../components/analytics/RevenueBarChart';
import { RevenueSourceList } from '../../components/analytics/RevenueSourceList';

type Granularity = 'month' | 'year';
type ContentPeriod = 'all' | 'month' | 'year';

function fmtEur(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: n >= 100 ? 0 : 2 });
}

const PERIODS: { key: ContentPeriod; label: string }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'year', label: 'Cette année' },
  { key: 'month', label: 'Ce mois' },
];

const CONTENT_PAGE_SIZE = 8;

export default function WalletRevenuePage() {
  const navigate = useNavigate();

  const [granularity, setGranularity] = useState<Granularity>('month');
  // Filtre temporel partagé — s'applique à la répartition par source ET au détail par contenu,
  // pour répondre à "voir ce qui est généré par contenu aussi par année/par mois".
  const [period, setPeriod] = useState<ContentPeriod>('all');

  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [timeseries, setTimeseries] = useState<RevenueTimeseriesPoint[]>([]);
  const [sources, setSources] = useState<RevenueSourceBreakdown[]>([]);
  const [contentItems, setContentItems] = useState<RevenueContentItem[]>([]);
  const [contentTotal, setContentTotal] = useState(0);
  const [contentLoading, setContentLoading] = useState(true);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const loadSeq = useRef(0);
  const contentSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setLoadError(false);
    try {
      const [sum, ts] = await Promise.all([
        revenueService.getSummary(),
        revenueService.getTimeseries(granularity, granularity === 'year' ? 5 : 12),
      ]);
      if (seq !== loadSeq.current) return;
      setSummary(sum);
      setTimeseries(ts);
    } catch {
      if (seq === loadSeq.current) setLoadError(true);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [granularity]);

  useEffect(() => { load(); }, [load]);

  // Répartition par source ET revenus par contenu suivent le même filtre période.
  useEffect(() => {
    revenueService.getBreakdown(period).then(setSources).catch(() => setSources([]));

    const seq = ++contentSeq.current;
    setContentLoading(true);
    revenueService.getByContent(1, CONTENT_PAGE_SIZE, period)
      .then(res => {
        if (seq !== contentSeq.current) return;
        setContentItems(res.items);
        setContentTotal(res.total);
      })
      .catch(() => {
        if (seq !== contentSeq.current) return;
        setContentItems([]);
        setContentTotal(0);
      })
      .finally(() => { if (seq === contentSeq.current) setContentLoading(false); });
  }, [period]);

  const evolutionColor = summary?.evolution_pct == null
    ? 'var(--text-tertiary)'
    : summary.evolution_pct >= 0 ? '#22C55E' : '#EF4444';
  const EvolutionIcon = summary?.evolution_pct == null ? Minus : summary.evolution_pct >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="w-full mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/wallet/creator')}
          className="p-2.5 rounded-xl transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <ArrowLeft size={17} />
        </button>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Revenus</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Historique complet de tes gains sur Gofolyx</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-24"><Spinner /></div>
      ) : loadError || !summary ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <Wallet size={32} style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm font-semibold text-center px-8" style={{ color: 'var(--text-secondary)' }}>
            Impossible de charger tes revenus pour le moment
          </p>
        </div>
      ) : (
        <>
          {/* ── Filtre période global ──────────────────────────────────────────── */}
          <div className="flex gap-1.5">
            {PERIODS.map(p => {
              const active = period === p.key;
              return (
                <button key={p.key} onClick={() => setPeriod(p.key)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={{
                    background: active ? 'var(--primary)' : 'var(--surface)',
                    border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                    color: active ? '#fff' : 'var(--text-secondary)',
                  }}>
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* ── KPI row — pleine largeur ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              className="sm:col-span-1 rounded-2xl p-5 flex flex-col items-center justify-center gap-1 text-center"
              style={{
                background: 'linear-gradient(135deg, var(--primary)18, var(--primary)06)',
                border: '1px solid var(--primary)30',
              }}
            >
              <p className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>{fmtEur(summary.total_eur)}</p>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Revenus totaux · {summary.total_gogold.toLocaleString('fr-FR')} GoGold
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                {summary.transaction_count} opération{summary.transaction_count > 1 ? 's' : ''} au total
              </p>
            </div>

            <div className="rounded-2xl p-4 flex flex-col justify-center gap-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-[11px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Ce mois-ci</p>
              <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{fmtEur(summary.current_month_eur)}</p>
            </div>

            <div className="rounded-2xl p-4 flex flex-col justify-center gap-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-[11px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Vs mois précédent</p>
              <div className="flex items-center gap-1.5">
                <EvolutionIcon size={16} color={evolutionColor} />
                <p className="text-2xl font-black" style={{ color: evolutionColor }}>
                  {summary.evolution_pct == null ? '—' : `${summary.evolution_pct >= 0 ? '+' : ''}${summary.evolution_pct}%`}
                </p>
              </div>
            </div>
          </div>

          {/* ── Grille principale 2 colonnes sur desktop ─────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

            {/* Colonne gauche (large) : graphique + répartition par source */}
            <div className="lg:col-span-3 flex flex-col gap-5">
              <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Évolution des revenus</p>
                  <div className="flex gap-1.5">
                    {(['month', 'year'] as Granularity[]).map(g => {
                      const active = granularity === g;
                      return (
                        <button key={g} onClick={() => setGranularity(g)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
                          style={{
                            background: active ? 'var(--primary)' : 'var(--bg-secondary)',
                            color: active ? '#fff' : 'var(--text-secondary)',
                          }}>
                          {g === 'month' ? 'Par mois' : 'Par année'}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <RevenueBarChart data={timeseries} color="var(--primary)" width={720} />
              </div>

              <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-base font-black mb-4" style={{ color: 'var(--text-primary)' }}>Répartition par source</p>
                <RevenueSourceList sources={sources} accent="var(--primary)" />
              </div>
            </div>

            {/* Colonne droite : revenus par contenu, suit le même filtre période */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Revenus par reel</p>
                {contentTotal > contentItems.length && (
                  <button onClick={() => navigate(`/wallet/revenue/content?period=${period}`)}
                    className="text-xs font-bold flex items-center gap-0.5" style={{ color: 'var(--primary)' }}>
                    Voir tout ({contentTotal}) <ChevronRight size={13} />
                  </button>
                )}
              </div>

              {contentLoading ? (
                <div className="rounded-2xl p-8 flex items-center justify-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <Spinner size="sm" />
                </div>
              ) : contentItems.length === 0 ? (
                <div className="rounded-2xl p-6 flex flex-col items-center gap-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <Video size={26} style={{ color: 'var(--text-tertiary)' }} />
                  <p className="text-[13px] text-center" style={{ color: 'var(--text-tertiary)' }}>
                    Aucun revenu rattaché à un reel {period === 'all' ? "pour l'instant" : 'sur cette période'}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl px-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {contentItems.map((item, i) => (
                    <div key={item.content_id} className="flex items-center gap-2.5 py-2.5"
                      style={{ borderBottom: i < contentItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      {item.thumbnail_url ? (
                        <img src={item.thumbnail_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--bg)' }}>
                          <Video size={16} style={{ color: 'var(--text-tertiary)' }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                          {item.title ?? 'Reel'}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          {item.transaction_count} opération{item.transaction_count > 1 ? 's' : ''}
                        </p>
                      </div>
                      <p className="text-[13px] font-black flex-shrink-0" style={{ color: 'var(--text-primary)' }}>{fmtEur(item.eur)}</p>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => navigate('/wallet/revenue/transactions')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--primary)' }}
              >
                <List size={15} /> Historique détaillé des transactions
              </button>
            </div>
          </div>
        </>
      )}

      <div className="h-4" />
    </div>
  );
}
