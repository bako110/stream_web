import { apiClient } from './client';
import { Endpoints } from './endpoints';

export interface RevenueSummary {
  total_gogold: number;
  total_eur: number;
  transaction_count: number;
  current_month_gogold: number;
  current_month_eur: number;
  previous_month_eur: number;
  evolution_pct: number | null;
}

export interface RevenueTimeseriesPoint {
  bucket: string;
  label: string;
  gogold: number;
  eur: number;
}

export interface RevenueSourceBreakdown {
  source: string;
  label: string;
  gogold: number;
  eur: number;
  count: number;
  share_pct: number;
}

export interface RevenueContentItem {
  content_type: 'reel';
  content_id: string;
  title: string | null;
  thumbnail_url: string | null;
  gogold: number;
  eur: number;
  transaction_count: number;
}

export interface RevenueTransaction {
  id: string;
  public_id: string;
  transaction_type: string;
  label: string;
  gogold_amount: number;
  eur_amount: number;
  description: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

// Sources de revenu possibles, pour les filtres — même liste que
// REVENUE_TRANSACTION_TYPES / SOURCE_LABELS côté backend (wallet_revenue_service.py).
export const SOURCE_FILTERS: { key: string; label: string }[] = [
  { key: 'gift_received', label: 'Cadeaux' },
  { key: 'subscription_revenue', label: 'Abonnements' },
  { key: 'view_revenue', label: 'Vues' },
  { key: 'ad_revenue', label: 'Publicité' },
  { key: 'referral_bonus', label: 'Parrainage' },
  { key: 'ticket_earned', label: 'Billetterie' },
  { key: 'community_reward', label: 'Communautés' },
  { key: 'tournament_prize', label: 'Tournois' },
  { key: 'battle_forfeit_compensation', label: 'Battles' },
  { key: 'bonus', label: 'Bonus' },
  { key: 'transfer_received', label: 'Transferts' },
];

export const revenueService = {
  async getSummary(): Promise<RevenueSummary> {
    const res = await apiClient.get<RevenueSummary>(Endpoints.wallet.revenueSummary);
    return res.data;
  },

  async getTimeseries(granularity: 'month' | 'year' = 'month', months = 12): Promise<RevenueTimeseriesPoint[]> {
    const q = new URLSearchParams({ granularity, months: String(months) }).toString();
    const res = await apiClient.get<RevenueTimeseriesPoint[]>(`${Endpoints.wallet.revenueTimeseries}?${q}`);
    return res.data;
  },

  async getBreakdown(period: 'all' | 'month' | 'year' = 'all'): Promise<RevenueSourceBreakdown[]> {
    const res = await apiClient.get<RevenueSourceBreakdown[]>(`${Endpoints.wallet.revenueBreakdown}?period=${period}`);
    return res.data;
  },

  async getByContent(page = 1, limit = 20): Promise<PaginatedResult<RevenueContentItem>> {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) }).toString();
    const res = await apiClient.get<PaginatedResult<RevenueContentItem>>(`${Endpoints.wallet.revenueByContent}?${q}`);
    return res.data;
  },

  async getTransactions(source?: string, page = 1, limit = 20): Promise<PaginatedResult<RevenueTransaction>> {
    const q: Record<string, string> = { page: String(page), limit: String(limit) };
    if (source) q.source = source;
    const res = await apiClient.get<PaginatedResult<RevenueTransaction>>(`${Endpoints.wallet.revenueTransactions}?${new URLSearchParams(q).toString()}`);
    return res.data;
  },
};
