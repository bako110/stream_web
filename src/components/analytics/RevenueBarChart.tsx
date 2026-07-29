import type { RevenueTimeseriesPoint } from '../../api/revenueService';
import { AreaLineChart } from './AreaLineChart';

interface Props {
  data: RevenueTimeseriesPoint[];
  color: string;
  width?: number;
  /** 'eur' (défaut) ou 'gogold' — quelle valeur piloter la hauteur de la courbe */
  metric?: 'eur' | 'gogold';
}

function fmtEur(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: n >= 100 ? 0 : 2 });
}

export function RevenueBarChart({ data, color, width = 560, metric = 'eur' }: Props) {
  const points = data.map(d => ({
    value: metric === 'eur' ? d.eur : d.gogold,
    label: d.label,
    tooltipValue: `${fmtEur(d.eur)} · ${d.gogold.toLocaleString('fr-FR')} GoGold`,
  }));

  return <AreaLineChart data={points} color={color} width={width} labelEvery={data.length <= 6 ? 1 : undefined} />;
}
