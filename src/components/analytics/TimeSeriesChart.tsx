import type { TimeseriesPoint, AnalyticsGranularity } from '../../api/analyticsService';
import { AreaLineChart } from './AreaLineChart';

interface Props {
  data: TimeseriesPoint[];
  granularity: AnalyticsGranularity;
  color: string;
  width?: number;
}

function formatLabel(bucket: string, granularity: AnalyticsGranularity): string {
  const d = new Date(bucket);
  if (isNaN(d.getTime())) return '';
  switch (granularity) {
    case 'hour':  return d.toLocaleTimeString('fr-FR', { hour: '2-digit' });
    case 'day':   return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    case 'week':  return `S${Math.ceil(d.getDate() / 7)}`;
    case 'month': return d.toLocaleDateString('fr-FR', { month: 'short' });
    default:      return '';
  }
}

export function TimeSeriesChart({ data, granularity, color, width = 300 }: Props) {
  const points = data.map(d => ({
    value: d.views,
    label: formatLabel(d.bucket, granularity),
    tooltipValue: `${d.views.toLocaleString('fr-FR')} vues`,
  }));

  return <AreaLineChart data={points} color={color} width={width} />;
}
