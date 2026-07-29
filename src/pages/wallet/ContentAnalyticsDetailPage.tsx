import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Spinner } from '../../components/ui/Spinner';
import { analyticsService } from '../../api/analyticsService';
import type { ContentDetailStats, AnalyticsContentType } from '../../api/analyticsService';
import { TimeSeriesChart } from '../../components/analytics/TimeSeriesChart';
import { GeoRankingList } from '../../components/analytics/GeoRankingList';
import { ReachCard } from '../../components/analytics/ReachCard';

const TYPE_LABEL: Record<AnalyticsContentType, string> = {
  reel: 'Reel', post: 'Post', event: 'Événement', concert: 'Concert', live: 'Live',
};

export default function ContentAnalyticsDetailPage() {
  const navigate = useNavigate();
  const { type, id } = useParams<{ type: AnalyticsContentType; id: string }>();

  const [detail, setDetail] = useState<ContentDetailStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!type || !id) return;
    setLoading(true);
    try {
      const data = await analyticsService.getContentDetail(type, id, 'month');
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [type, id]);

  useEffect(() => { load(); }, [load]);

  if (!type || !id) return null;

  const evolutionColor = detail?.evolution_pct == null
    ? 'var(--text-tertiary)'
    : detail.evolution_pct >= 0 ? '#22C55E' : '#EF4444';

  return (
    <div className="w-full mx-auto px-4 py-6 space-y-5">

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-xl transition-all flex-shrink-0"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <ArrowLeft size={17} />
        </button>
        <h1 className="text-lg font-black truncate" style={{ color: 'var(--text-primary)' }}>
          {detail?.title ?? TYPE_LABEL[type]}
        </h1>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-20"><Spinner /></div>
      ) : !detail ? (
        <div className="flex flex-col items-center gap-3 py-16 px-8 text-center">
          <AlertTriangle size={28} style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            Impossible de charger les statistiques de ce contenu.
          </p>
        </div>
      ) : (
        <>
          {detail.thumbnail_url && (
            <img src={detail.thumbnail_url} alt="" className="w-full h-45 rounded-2xl object-cover" style={{ height: 180 }} />
          )}

          <div className="rounded-2xl p-5 flex flex-col items-center gap-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-[28px] font-black" style={{ color: 'var(--text-primary)' }}>{detail.current_views.toLocaleString('fr-FR')}</p>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Vues (30 derniers jours)</p>
            {detail.evolution_pct != null && (
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1 mt-2" style={{ background: `${evolutionColor}18` }}>
                {detail.evolution_pct >= 0
                  ? <TrendingUp size={12} color={evolutionColor} />
                  : <TrendingDown size={12} color={evolutionColor} />}
                <span className="text-xs font-black" style={{ color: evolutionColor }}>
                  {detail.evolution_pct >= 0 ? '+' : ''}{detail.evolution_pct}% vs mois précédent
                </span>
              </div>
            )}
          </div>

          <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-[15px] font-black mb-2.5" style={{ color: 'var(--text-primary)' }}>Évolution des vues</p>
            <TimeSeriesChart data={detail.timeseries} granularity="day" color="var(--primary)" width={560} />
          </div>

          <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-[15px] font-black mb-2.5" style={{ color: 'var(--text-primary)' }}>Portée parmi vos abonnés</p>
            <ReachCard reach={detail.reach} accent="var(--primary)" />
          </div>

          {detail.top_countries.length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-[15px] font-black mb-2.5" style={{ color: 'var(--text-primary)' }}>Répartition géographique</p>
              <GeoRankingList countries={detail.top_countries} accent="var(--primary)" />
            </div>
          )}
        </>
      )}

      <div className="h-4" />
    </div>
  );
}
