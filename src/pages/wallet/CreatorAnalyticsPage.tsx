import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Grid, Video, FileText, Calendar, Music, Radio,
  Users, Globe, TrendingUp, TrendingDown, Minus, BarChart2,
} from 'lucide-react';
import { Spinner } from '../../components/ui/Spinner';
import { analyticsService } from '../../api/analyticsService';
import type {
  AnalyticsOverview, AnalyticsPeriod, AnalyticsContentType, ContentStatItem,
} from '../../api/analyticsService';
import { TimeSeriesChart } from '../../components/analytics/TimeSeriesChart';
import { GeoRankingList } from '../../components/analytics/GeoRankingList';
import { ContentStatsList } from '../../components/analytics/ContentStatsList';

const PERIODS: { key: AnalyticsPeriod; label: string }[] = [
  { key: 'day',   label: 'Jour' },
  { key: 'week',  label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year',  label: 'Année' },
];

const CONTENT_FILTERS: { key: AnalyticsContentType | 'all'; label: string; icon: typeof Grid }[] = [
  { key: 'all',     label: 'Tout',      icon: Grid },
  { key: 'reel',    label: 'Reels',     icon: Video },
  { key: 'post',    label: 'Posts',     icon: FileText },
  { key: 'event',   label: 'Events',    icon: Calendar },
  { key: 'concert', label: 'Concerts',  icon: Music },
  { key: 'live',    label: 'Lives',     icon: Radio },
];

const PREVIEW_LIMIT = 10;

function fmtNum(n: number): string {
  return n.toLocaleString('fr-FR');
}

export default function CreatorAnalyticsPage() {
  const navigate = useNavigate();

  const [period, setPeriod] = useState<AnalyticsPeriod>('week');
  const [contentType, setContentType] = useState<AnalyticsContentType | 'all'>('all');
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [contentItems, setContentItems] = useState<ContentStatItem[]>([]);
  const [contentTotal, setContentTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const ct = contentType === 'all' ? undefined : contentType;
      const [ov, content] = await Promise.all([
        analyticsService.getOverview({ period, contentType: ct }),
        analyticsService.listContent({ contentType: ct, period, sort: 'views', page: 1, limit: PREVIEW_LIMIT }),
      ]);
      if (seq !== loadSeq.current) return;
      setOverview(ov);
      setContentItems(content.items);
      setContentTotal(content.total);
    } catch {
      if (seq !== loadSeq.current) return;
      setOverview(null);
      setContentItems([]);
      setContentTotal(0);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [period, contentType]);

  useEffect(() => { load(); }, [load]);

  const goToDetail = (item: ContentStatItem) => {
    navigate(`/wallet/analytics/content/${item.content_type}/${item.content_id}`);
  };

  const goToFullList = () => {
    const params = new URLSearchParams({ period });
    if (contentType !== 'all') params.set('type', contentType);
    navigate(`/wallet/analytics/content?${params.toString()}`);
  };

  const evolutionColor = overview?.evolution_pct == null
    ? 'var(--text-tertiary)'
    : overview.evolution_pct >= 0 ? '#22C55E' : '#EF4444';
  const EvolutionIcon = overview?.evolution_pct == null ? Minus : overview.evolution_pct >= 0 ? TrendingUp : TrendingDown;
  const evolutionLabel = overview?.evolution_pct == null
    ? 'Pas de données précédentes'
    : `${overview.evolution_pct >= 0 ? '+' : ''}${overview.evolution_pct}% vs période précédente`;

  return (
    <div className="w-full mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/wallet')}
          className="p-2.5 rounded-xl transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <ArrowLeft size={17} />
        </button>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Statistiques</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Vues, portée et performance de tes contenus</p>
        </div>
      </div>

      {/* ── Filtres : période + type de contenu, côte à côte sur desktop ────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="grid grid-cols-4 sm:flex gap-2">
          {PERIODS.map(p => {
            const active = p.key === period;
            return (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className="py-2.5 sm:px-4 rounded-xl text-[13px] font-bold transition-all"
                style={{
                  background: active ? 'var(--primary)' : 'var(--surface)',
                  border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                  color: active ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="hidden sm:block w-px h-6" style={{ background: 'var(--border)' }} />

        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0" style={{ scrollbarWidth: 'none' }}>
          {CONTENT_FILTERS.map(f => {
            const active = f.key === contentType;
            const FilterIcon = f.icon;
            return (
              <button
                key={f.key}
                onClick={() => setContentType(f.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition-all"
                style={{
                  background: active ? 'var(--primary)18' : 'var(--surface)',
                  border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                  color: active ? 'var(--primary)' : 'var(--text-secondary)',
                }}
              >
                <FilterIcon size={13} />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-24"><Spinner /></div>
      ) : !overview ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <BarChart2 size={32} style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Impossible de charger les statistiques pour le moment
          </p>
        </div>
      ) : (
        <>
          {/* ── KPI row — pleine largeur ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              className="sm:col-span-1 rounded-2xl p-5 flex flex-col items-center justify-center gap-1 text-center"
              style={{
                background: 'linear-gradient(135deg, var(--primary)18, var(--primary)06)',
                border: '1px solid var(--primary)30',
              }}
            >
              <p className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>{fmtNum(overview.current_views)}</p>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Vues sur la période</p>
              <div
                className="flex items-center gap-1.5 rounded-full px-3 py-1 mt-2"
                style={{ background: `${evolutionColor}18` }}
              >
                <EvolutionIcon size={12} color={evolutionColor} />
                <span className="text-xs font-black" style={{ color: evolutionColor }}>{evolutionLabel}</span>
              </div>
            </div>

            <div className="rounded-2xl p-4 flex flex-col justify-center items-center gap-1.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Users size={18} color="#3B82F6" />
              <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{fmtNum(overview.unique_viewers)}</p>
              <p className="text-[11px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Spectateurs uniques</p>
            </div>

            <div className="rounded-2xl p-4 flex flex-col justify-center items-center gap-1.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Globe size={18} color="#10B981" />
              <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{overview.top_countries.length}</p>
              <p className="text-[11px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Pays touchés</p>
            </div>
          </div>

          {/* ── Grille principale 2 colonnes sur desktop ─────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

            {/* Colonne gauche (large) : évolution + géographie */}
            <div className="lg:col-span-3 flex flex-col gap-5">
              <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-base font-black mb-4" style={{ color: 'var(--text-primary)' }}>Évolution des vues</p>
                <TimeSeriesChart data={overview.timeseries} granularity={overview.granularity} color="var(--primary)" width={720} />
              </div>

              {overview.top_countries.length > 0 && (
                <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-base font-black mb-4" style={{ color: 'var(--text-primary)' }}>Répartition géographique</p>
                  <GeoRankingList countries={overview.top_countries} accent="var(--primary)" />
                </div>
              )}
            </div>

            {/* Colonne droite : liste des contenus */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Tous les contenus</p>
                {contentTotal > PREVIEW_LIMIT && (
                  <button onClick={goToFullList} className="text-xs font-bold" style={{ color: 'var(--primary)' }}>
                    Voir tout ({contentTotal})
                  </button>
                )}
              </div>

              {contentItems.length === 0 ? (
                <div className="rounded-2xl p-6 flex items-center justify-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-[13px] text-center" style={{ color: 'var(--text-tertiary)' }}>
                    Aucun contenu publié pour l'instant.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl px-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <ContentStatsList items={contentItems} onItemClick={goToDetail} />
                </div>
              )}

              {contentTotal > PREVIEW_LIMIT && (
                <button
                  onClick={goToFullList}
                  className="w-full py-3 rounded-2xl text-sm font-bold transition-all"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--primary)' }}
                >
                  Voir tous les contenus
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <div className="h-4" />
    </div>
  );
}
