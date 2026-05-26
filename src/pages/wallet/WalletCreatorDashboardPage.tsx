import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Eye,
  Gift,
  TrendingUp,
  CreditCard,
  Smartphone,
  ArrowUpRight,
  ToggleLeft,
  ToggleRight,
  Video,
  Euro,
  Check,
  Coins,
} from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

// ── Types ────────────────────────────────────────────────────────────────────

interface CreatorProfile {
  is_monetized: boolean;
  monetization_enabled: boolean;
  monthly_subscription_price: number;
  payout_method: 'stripe' | 'mobile_money' | null;
}

interface CreatorStats {
  total_views: number;
  total_gifts_received: number;
  total_coins_earned: number;
  monthly_earnings_coins: number;
  monthly_earnings_eur: number;
  current_balance: number;
  available_balance: number;
}

interface TopReel {
  id: string;
  thumbnail_url?: string;
  caption?: string;
  views_count: number;
  gifts_count: number;
  coins_earned: number;
}

interface GiftReceived {
  id: string;
  sender_name: string;
  sender_avatar?: string;
  gift_emoji: string;
  gift_name: string;
  coins: number;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const coinsToEur = (coins: number | string) =>
  ((parseFloat(String(coins ?? 0)) / 100) * 0.5).toFixed(2);

const fmtNum = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(1)}K`
    : `${n}`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

// ── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}

function StatCard({ icon, label, value, sub, color }: StatCardProps) {
  return (
    <div
      className="flex-1 rounded-2xl p-4 min-w-0"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderTop: `3px solid ${color}`,
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
        style={{ background: `${color}22`, color }}
      >
        {icon}
      </div>
      <p className="text-xl font-black leading-none" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {sub}
        </p>
      )}
      <p className="text-xs font-medium mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </p>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function WalletCreatorDashboardPage() {
  const navigate = useNavigate();

  const [loading, setLoading]         = useState(true);
  const [profile, setProfile]         = useState<CreatorProfile | null>(null);
  const [stats, setStats]             = useState<CreatorStats | null>(null);
  const [topReels, setTopReels]       = useState<TopReel[]>([]);
  const [recentGifts, setRecentGifts] = useState<GiftReceived[]>([]);
  const [toggling, setToggling]       = useState(false);
  const [subPrice, setSubPrice]       = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [savingMethod, setSavingMethod] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const [profRes, statsRes, reelsRes, giftsRes] = await Promise.allSettled([
      apiClient.get<CreatorProfile>(Endpoints.wallet.creatorProfile),
      apiClient.get<CreatorStats>(Endpoints.wallet.creatorStats),
      apiClient.get<TopReel[]>(Endpoints.wallet.creatorReels),
      apiClient.get<GiftReceived[]>(Endpoints.wallet.creatorGifts),
    ]);

    if (profRes.status === 'fulfilled') {
      setProfile(profRes.value.data);
      setSubPrice(String(profRes.value.data.monthly_subscription_price ?? ''));
    }
    if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
    if (reelsRes.status === 'fulfilled') setTopReels(reelsRes.value.data ?? []);
    if (giftsRes.status === 'fulfilled') setRecentGifts(giftsRes.value.data ?? []);
  }, []);

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  // Toggle monetisation
  const toggleMonetization = async () => {
    if (!profile) return;
    const next = !profile.monetization_enabled;
    setToggling(true);
    try {
      await apiClient.patch(Endpoints.wallet.creatorProfile, { monetization_enabled: next });
      setProfile(prev => prev ? { ...prev, monetization_enabled: next } : null);
      toast.success(next ? 'Monétisation activée' : 'Monétisation mise en pause');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Mise à jour échouée');
    } finally {
      setToggling(false);
    }
  };

  // Save subscription price
  const saveSubPrice = async () => {
    const price = parseFloat(subPrice.replace(',', '.'));
    if (isNaN(price) || price < 0) {
      toast.error('Prix invalide');
      return;
    }
    setSavingPrice(true);
    try {
      await apiClient.patch(Endpoints.wallet.creatorProfile, { monthly_subscription_price: price });
      toast.success('Prix d\'abonnement mis à jour');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Mise à jour échouée');
    } finally {
      setSavingPrice(false);
    }
  };

  // Select payout method
  const selectPayoutMethod = async (method: 'stripe' | 'mobile_money') => {
    if (profile?.payout_method === method) return;
    setSavingMethod(method);
    try {
      await apiClient.patch(Endpoints.wallet.creatorProfile, { payout_method: method });
      setProfile(prev => prev ? { ...prev, payout_method: method } : null);
      toast.success('Méthode de paiement mise à jour');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Mise à jour échouée');
    } finally {
      setSavingMethod(null);
    }
  };

  const availableBalance = stats?.available_balance ?? 0;
  const canWithdraw = availableBalance >= 1000;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

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
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
            Monétisation
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Tableau de bord créateur
          </p>
        </div>
      </div>

      {/* ── Toggle monétisation ────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 rounded-2xl p-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#9B65F5,#E85DAD)' }}
        >
          <Euro size={18} color="#FFF" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Monétisation
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {profile?.monetization_enabled
              ? 'Active — vous recevez des revenus'
              : 'En pause — vous ne recevez aucun revenu'}
          </p>
        </div>

        <button
          onClick={toggleMonetization}
          disabled={toggling}
          className="flex-shrink-0 disabled:opacity-60 transition-all"
          style={{ color: profile?.monetization_enabled ? 'var(--primary)' : 'var(--text-tertiary)' }}
          aria-label="Activer ou désactiver la monétisation"
        >
          {toggling ? (
            <Spinner size="sm" />
          ) : profile?.monetization_enabled ? (
            <ToggleRight size={34} />
          ) : (
            <ToggleLeft size={34} />
          )}
        </button>
      </div>

      {/* ── Stats 2×2 ──────────────────────────────────────────────────────── */}
      {stats && (
        <>
          <p
            className="text-xs font-black uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Statistiques
          </p>

          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Eye size={18} />}
              label="Vues totales"
              value={fmtNum(stats.total_views ?? 0)}
              color="#3B82F6"
            />
            <StatCard
              icon={<Gift size={18} />}
              label="Cadeaux reçus"
              value={fmtNum(stats.total_gifts_received ?? 0)}
              color="#E85DAD"
            />
            <StatCard
              icon={<Coins size={18} />}
              label="Coins gagnés"
              value={fmtNum(stats.total_coins_earned ?? 0)}
              sub={`≈ ${coinsToEur(stats.total_coins_earned)} €`}
              color="#FFD700"
            />
            <StatCard
              icon={<TrendingUp size={18} />}
              label="Ce mois"
              value={`${parseFloat(String(stats.monthly_earnings_eur ?? 0)).toFixed(2)} €`}
              color="#3FEDB6"
            />
          </div>
        </>
      )}

      {/* ── Top Reels ──────────────────────────────────────────────────────── */}
      <p
        className="text-xs font-black uppercase tracking-wider pt-1"
        style={{ color: 'var(--text-tertiary)' }}
      >
        Top Reels
      </p>

      {topReels.length === 0 ? (
        <div
          className="rounded-2xl py-14 flex flex-col items-center gap-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Video size={36} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Aucun reel monétisé pour l'instant
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {topReels.map((reel, i) => (
            <div
              key={reel.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{
                borderBottom:
                  i < topReels.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              {/* Thumbnail */}
              {reel.thumbnail_url ? (
                <img
                  src={reel.thumbnail_url}
                  alt=""
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--bg)', color: 'var(--text-tertiary)' }}
                >
                  <Video size={20} />
                </div>
              )}

              {/* Caption + stats */}
              <div className="flex-1 min-w-0 space-y-1">
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {reel.caption ?? `Reel #${i + 1}`}
                </p>
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs flex items-center gap-1"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <Eye size={11} />
                    {fmtNum(reel.views_count)}
                  </span>
                  <span
                    className="text-xs flex items-center gap-1"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <Gift size={11} />
                    {reel.gifts_count}
                  </span>
                </div>
              </div>

              {/* Coins earned */}
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                  {reel.coins_earned.toLocaleString('fr-FR')}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  coins
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Prix d'abonnement ──────────────────────────────────────────────── */}
      <p
        className="text-xs font-black uppercase tracking-wider pt-1"
        style={{ color: 'var(--text-tertiary)' }}
      >
        Prix d'abonnement
      </p>

      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
          Abonnement mensuel (EUR)
        </p>
        <div className="flex items-center gap-3">
          <div
            className="flex-1 flex items-center gap-2 px-3 rounded-xl"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              height: 44,
            }}
          >
            <span
              className="text-base font-semibold flex-shrink-0"
              style={{ color: 'var(--text-secondary)' }}
            >
              €
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={subPrice}
              onChange={e => setSubPrice(e.target.value)}
              placeholder="4.99"
              className="flex-1 bg-transparent text-base font-semibold outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
          <button
            onClick={saveSubPrice}
            disabled={savingPrice}
            className="flex items-center justify-center px-5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all flex-shrink-0"
            style={{
              background: 'var(--primary)',
              height: 44,
              minWidth: 110,
            }}
          >
            {savingPrice ? <Spinner size="sm" /> : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* ── Revenus disponibles ────────────────────────────────────────────── */}
      <p
        className="text-xs font-black uppercase tracking-wider pt-1"
        style={{ color: 'var(--text-tertiary)' }}
      >
        Revenus disponibles
      </p>

      <div
        className="rounded-2xl p-6 flex flex-col items-center gap-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="text-center space-y-1">
          <p className="text-4xl font-black" style={{ color: 'var(--text-primary)' }}>
            {availableBalance.toLocaleString('fr-FR')}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            coins disponibles
          </p>
          <p className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
            ≈ {coinsToEur(availableBalance)} EUR
          </p>
        </div>

        <button
          onClick={() => navigate('/wallet/withdraw')}
          disabled={!canWithdraw}
          className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm disabled:cursor-not-allowed transition-all"
          style={{
            background: canWithdraw
              ? 'linear-gradient(135deg,#9B65F5,#E85DAD)'
              : 'var(--border)',
            color: canWithdraw ? '#FFF' : 'var(--text-tertiary)',
            boxShadow: canWithdraw ? '0 8px 24px rgba(155,101,245,0.35)' : 'none',
          }}
        >
          <ArrowUpRight size={17} />
          Retirer
        </button>

        {!canWithdraw && (
          <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
            Minimum 1 000 coins ({coinsToEur(1000)} €) requis
          </p>
        )}
      </div>

      {/* ── Méthode de paiement ────────────────────────────────────────────── */}
      <p
        className="text-xs font-black uppercase tracking-wider pt-1"
        style={{ color: 'var(--text-tertiary)' }}
      >
        Méthode de paiement
      </p>

      <div className="grid grid-cols-2 gap-3">
        {(
          [
            { key: 'stripe',       label: 'Stripe',       icon: <CreditCard size={22} />, color: '#635BFF' },
            { key: 'mobile_money', label: 'Mobile Money', icon: <Smartphone size={22} />, color: '#FF7A2F' },
          ] as const
        ).map(m => {
          const isSelected = profile?.payout_method === m.key;
          const isSaving   = savingMethod === m.key;
          return (
            <button
              key={m.key}
              onClick={() => selectPayoutMethod(m.key)}
              disabled={!!savingMethod}
              className="relative rounded-2xl p-5 flex flex-col items-center gap-2.5 transition-all disabled:opacity-70"
              style={{
                background: isSelected ? `${m.color}11` : 'var(--surface)',
                border: isSelected
                  ? `2px solid ${m.color}`
                  : '1.5px solid var(--border)',
              }}
            >
              {isSelected && (
                <span
                  className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: m.color }}
                >
                  <Check size={11} color="#FFF" strokeWidth={3} />
                </span>
              )}
              <span style={{ color: isSelected ? m.color : 'var(--text-secondary)' }}>
                {isSaving ? <Spinner size="sm" /> : m.icon}
              </span>
              <span
                className="text-sm font-semibold text-center"
                style={{ color: isSelected ? m.color : 'var(--text-secondary)' }}
              >
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Cadeaux reçus récemment ────────────────────────────────────────── */}
      <p
        className="text-xs font-black uppercase tracking-wider pt-1"
        style={{ color: 'var(--text-tertiary)' }}
      >
        Cadeaux reçus récemment
      </p>

      {recentGifts.length === 0 ? (
        <div
          className="rounded-2xl py-14 flex flex-col items-center gap-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Gift size={36} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Aucun cadeau reçu pour l'instant
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {recentGifts.map((g, i) => (
            <div
              key={g.id}
              className="flex items-center gap-3 px-4 py-3.5"
              style={{
                borderBottom:
                  i < recentGifts.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              {/* gift_emoji comes from API — exempt from no-emoji rule */}
              <span
                className="text-2xl w-9 text-center flex-shrink-0"
                aria-hidden="true"
              >
                {g.gift_emoji}
              </span>

              <div className="flex-1 min-w-0 space-y-0.5">
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {g.sender_name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {g.gift_name} &bull; {formatDate(g.created_at)}
                </p>
              </div>

              <span className="text-sm font-bold flex-shrink-0" style={{ color: '#22C55E' }}>
                +{g.coins.toLocaleString('fr-FR')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom padding */}
      <div className="h-4" />
    </div>
  );
}
