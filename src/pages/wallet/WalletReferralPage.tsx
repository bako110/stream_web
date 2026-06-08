import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, UserPlus, ShoppingCart, Copy, Check,
  Share2, Users, Award, UserCheck, Gift, Percent,
} from 'lucide-react';
import { apiClient } from '../../api';
import { Spinner , PageLoader} from '../../components/ui/Spinner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReferralStats {
  referral_code:        string | null;
  total_referred:       number;
  total_coins_earned:   number;
  monthly_coins_earned: number;
  monthly_cap:          number;
}

interface ReferredUser {
  id:              string;
  username:        string;
  display_name:    string | null;
  avatar_url:      string | null;
  joined_at:       string;
  coins_generated: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WalletReferralPage() {
  const navigate = useNavigate();

  const [stats,   setStats]   = useState<ReferralStats | null>(null);
  const [users,   setUsers]   = useState<ReferredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, statsRes, usersRes] = await Promise.all([
        apiClient.get<{ referral_code: string }>('/api/v1/wallet/referral/me'),
        apiClient.get<ReferralStats>('/api/v1/wallet/referral/stats'),
        apiClient.get<ReferredUser[]>('/api/v1/wallet/referral/users').catch(() => ({ data: [] as ReferredUser[] })),
      ]);
      setStats({
        ...statsRes.data,
        referral_code: meRes.data.referral_code ?? statsRes.data.referral_code,
      });
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch {
      // silently ignore — page renders with nulls
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCopy = useCallback(() => {
    if (!stats?.referral_code) return;
    navigator.clipboard.writeText(stats.referral_code).catch(() => {
      // fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = stats.referral_code!;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [stats]);

  const handleShare = useCallback(async () => {
    if (!stats?.referral_code) return;
    const text = `Rejoins-moi sur GoFolyX ! Utilise mon code de parrainage ${stats.referral_code} lors de ton inscription et gagne 20 coins bonus.`;
    if (navigator.share) {
      await navigator.share({ title: 'Invite un ami sur GoFolyX', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [stats]);

  const monthlyPct = stats
    ? Math.min(100, Math.round((stats.monthly_coins_earned / (stats.monthly_cap || 500)) * 100))
    : 0;

  const HOW_STEPS = [
    { Icon: Share2,    text: 'Partagez votre code avec vos amis' },
    { Icon: UserCheck, text: "L'ami entre votre code lors de son inscription" },
    { Icon: Gift,      text: 'Il reçoit 20 coins, vous recevez 30 coins' },
    { Icon: Percent,   text: 'Vous gagnez 5 % sur chacun de ses achats (max 500/mois)' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
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
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Parrainage</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Invitez vos amis, gagnez des coins</p>
        </div>
      </div>

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {loading && <PageLoader />}

      {!loading && (
        <>
          {/* ── Hero card ─────────────────────────────────────────────────── */}
          <div
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(123,63,242,0.14) 0%, rgba(123,63,242,0.10) 100%)',
              border: '1px solid rgba(123,63,242,0.30)',
            }}
          >
            {/* Ambient glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 85% 10%, rgba(255,255,255,0.06), transparent 55%)' }}
            />

            <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
              Invitez vos amis
            </h2>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
              Gagnez des coins pour chaque ami qui rejoint GoFolyX et chaque achat qu'il effectue.
            </p>

            {/* Reward pills */}
            <div className="flex flex-wrap gap-2">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(123,63,242,0.15)', border: '1px solid rgba(123,63,242,0.40)' }}
              >
                <UserPlus size={13} style={{ color: 'var(--primary)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                  +30 coins / inscription
                </span>
              </div>
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.40)' }}
              >
                <ShoppingCart size={13} style={{ color: '#22C55E' }} />
                <span className="text-xs font-semibold" style={{ color: '#22C55E' }}>
                  +5 % sur achats
                </span>
              </div>
            </div>
          </div>

          {/* ── Code card ─────────────────────────────────────────────────── */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              Votre code
            </p>

            {/* Code row */}
            <div className="flex items-center justify-between mb-4">
              <span
                className="text-3xl font-black tracking-widest"
                style={{ color: 'var(--text-primary)', letterSpacing: '0.25em' }}
              >
                {stats?.referral_code ?? '—'}
              </span>

              <button
                onClick={handleCopy}
                disabled={!stats?.referral_code}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all disabled:opacity-40"
                style={{
                  background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(123,63,242,0.12)',
                  color: copied ? '#22C55E' : 'var(--primary)',
                }}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                <span className="text-sm font-bold">{copied ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>

            {/* Share button */}
            <button
              onClick={handleShare}
              disabled={!stats?.referral_code}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black text-white disabled:opacity-40 transition-all"
              style={{
                background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)',
                boxShadow: '0 6px 20px rgba(123,63,242,0.35)',
              }}
            >
              <Share2 size={16} />
              Inviter des amis
            </button>
          </div>

          {/* ── Stats grid ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-2xl p-4 flex flex-col items-center gap-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(123,63,242,0.12)', color: 'var(--primary)' }}
              >
                <Users size={20} />
              </div>
              <p className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
                {(stats?.total_referred ?? 0).toLocaleString('fr-FR')}
              </p>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Filleuls</p>
            </div>

            <div
              className="rounded-2xl p-4 flex flex-col items-center gap-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}
              >
                <Award size={20} />
              </div>
              <p className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
                {(stats?.total_coins_earned ?? 0).toLocaleString('fr-FR')}
              </p>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Coins gagnés</p>
            </div>
          </div>

          {/* ── Monthly progress ──────────────────────────────────────────── */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Ce mois-ci
              </p>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {stats?.monthly_coins_earned ?? 0} / {stats?.monthly_cap ?? 500} coins
              </p>
            </div>

            {/* Track */}
            <div
              className="h-2 rounded-full overflow-hidden mb-2"
              style={{ background: 'var(--border)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${monthlyPct}%`,
                  background: monthlyPct >= 90
                    ? 'linear-gradient(90deg,#7B3FF2,#EF4444)'
                    : 'linear-gradient(135deg,#7B3FF2,#5B2EC4)',
                }}
              />
            </div>

            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Plafond : {stats?.monthly_cap ?? 500} coins/mois de commissions affiliation
            </p>
          </div>

          {/* ── How it works ──────────────────────────────────────────────── */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Comment ca marche ?
            </p>

            <div className="space-y-3">
              {HOW_STEPS.map(({ Icon, text }, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'rgba(123,63,242,0.12)', color: 'var(--primary)' }}
                  >
                    <Icon size={14} />
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Referred users list ───────────────────────────────────────── */}
          {users.length > 0 && (
            <div
              className="rounded-2xl p-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p className="text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                Mes filleuls ({users.length})
              </p>

              <div>
                {users.map((u, i) => {
                  const name    = u.display_name ?? u.username;
                  const initial = name[0]?.toUpperCase() ?? '?';
                  const date    = new Date(u.joined_at).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  });

                  return (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 py-3"
                      style={{ borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none' }}
                    >
                      {/* Avatar initiales */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-base font-black"
                        style={{ background: 'rgba(123,63,242,0.20)', color: 'var(--primary)' }}
                      >
                        {initial}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          Inscrit le {date}
                        </p>
                      </div>

                      {/* Coins générés */}
                      {u.coins_generated > 0 && (
                        <div
                          className="flex items-baseline gap-0.5 px-2.5 py-1 rounded-full shrink-0"
                          style={{ background: 'rgba(255,215,0,0.10)' }}
                        >
                          <span className="text-sm font-black" style={{ color: '#FFD700' }}>
                            +{u.coins_generated.toLocaleString('fr-FR')}
                          </span>
                          <span className="text-xs font-medium" style={{ color: '#FFD700' }}>
                            {' '}coins
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
