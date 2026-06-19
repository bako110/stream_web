import { PageLoader } from '../../components/ui/Spinner';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useConfirm } from '../../components/ui/Dialog';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, Clock, Shield, Users, X, AlertCircle,
  RefreshCw, CheckCircle, Target,
} from 'lucide-react';
import { apiClient } from '../../api';
import { decodeId } from '../../utils/slugId';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

// ── Types (champs API exacts) ─────────────────────────────────────────────────

interface Cotisation {
  id: string; title: string; description?: string | null;
  amount_per_member: number;
  target_amount_coins: number;
  collected_coins: number;
  member_count_paid: number;
  member_count_total: number;
  progress_pct: number;
  status: 'active' | 'closed' | 'cancelled';
  deadline?: string | null;
  created_at: string;
}

interface Contribution {
  id: string; user_id: string;
  username?: string | null; display_name?: string | null; avatar_url?: string | null;
  coins_paid: number;
  status: 'pending' | 'paid' | 'exempt';
  note?: string | null;
  paid_at?: string | null;
  created_at: string;
}

type FilterTab = 'all' | 'paid' | 'pending' | 'exempt';

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; Icon: React.FC<any> }> = {
  paid:    { label: 'Payé',       color: '#10B981', bg: '#10B98115', Icon: CheckCircle },
  pending: { label: 'En attente', color: '#F59E0B', bg: '#F59E0B15', Icon: Clock      },
  exempt:  { label: 'Exempté',    color: '#3B82F6', bg: '#3B82F615', Icon: Shield     },
};

function coinsToEur(c: number) { return ((c / 100) * 0.35).toFixed(2); }

// ── Page principale ───────────────────────────────────────────────────────────
export default function CommunityFundDetailPage() {
  const { id: slug, cotId: cotSlug } = useParams<{ id: string; cotId: string }>();
  const communityId = decodeId(slug!);
  const cotId       = decodeId(cotSlug!);
  const navigate    = useNavigate();
  const mountedRef  = useRef(true);

  const [cot,           setCot]           = useState<Cotisation | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [myRole,        setMyRole]        = useState<string | null>(null);
  const [myUserId,      setMyUserId]      = useState<string | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [filter,        setFilter]        = useState<FilterTab>('all');
  const [exempting,     setExempting]     = useState<string | null>(null);
  const [paying,        setPaying]        = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const canManage = myRole === 'admin' || myRole === 'moderator';
  const isActive  = cot?.status === 'active';

  // Contribution de l'utilisateur courant
  const myContrib = useMemo(() =>
    contributions.find(c => c.user_id === myUserId) ?? null,
    [contributions, myUserId]
  );
  const hasPaid  = myContrib?.status === 'paid';
  const isExempt = myContrib?.status === 'exempt';

  // Filtrage mémorisé
  const filtered = useMemo(() =>
    filter === 'all' ? contributions : contributions.filter(c => c.status === filter),
    [contributions, filter]
  );

  // Compteurs mémorisés
  const counts = useMemo(() => ({
    all:     contributions.length,
    paid:    contributions.filter(c => c.status === 'paid').length,
    pending: contributions.filter(c => c.status === 'pending').length,
    exempt:  contributions.filter(c => c.status === 'exempt').length,
  }), [contributions]);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const [cotRes, contribRes, roleRes] = await Promise.all([
        apiClient.get<any>(`/api/v1/communities/${communityId}/cotisations/${cotId}`),
        apiClient.get<any>(`/api/v1/communities/${communityId}/cotisations/${cotId}/contributions`),
        apiClient.get<any>(`/api/v1/communities/${communityId}/role`).catch(() => ({ data: null })),
      ]);
      if (!mountedRef.current) return;
      setCot(cotRes.data?.data ?? cotRes.data ?? null);
      const list = Array.isArray(contribRes.data) ? contribRes.data : contribRes.data?.items ?? contribRes.data?.data ?? [];
      setContributions(list);
      setMyRole(roleRes.data?.role ?? null);
      setMyUserId(roleRes.data?.user_id ?? null);
    } catch { /* silencieux — error state affiché via !cot */ }
    finally { if (mountedRef.current) { setLoading(false); setRefreshing(false); } }
  }, [communityId, cotId]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function pay() {
    setPaying(true);
    try {
      await apiClient.post(`/api/v1/communities/${communityId}/cotisations/${cotId}/pay`);
      toast.success('Paiement effectué');
      load(true);
    } catch (e: any) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail ?? '';
      if (status === 402 || detail.toLowerCase().includes('solde') || detail.toLowerCase().includes('insuffi')) {
        toast.error('Solde insuffisant — rechargez vos coins');
      } else {
        toast.error(detail || 'Impossible de payer');
      }
    } finally { if (mountedRef.current) setPaying(false); }
  }

  async function closeCot() {
    const ok = await confirm({ title: 'Clôturer cette cotisation ?', message: 'Les membres ne pourront plus cotiser.', danger: true, confirmLabel: 'Clôturer' });
    if (!ok) return;
    setActionLoading('close');
    try {
      await apiClient.post(`/api/v1/communities/${communityId}/cotisations/${cotId}/close`);
      toast.success('Cotisation clôturée'); load(true);
    } catch (e: any) { toast.error(e?.response?.data?.detail ?? 'Erreur'); }
    finally { setActionLoading(null); }
  }

  async function cancelCot() {
    const ok = await confirm({ title: 'Annuler la cotisation ?', message: 'Les membres ayant déjà payé seront remboursés.', danger: true, confirmLabel: 'Annuler et rembourser' });
    if (!ok) return;
    setActionLoading('cancel');
    try {
      const res = await apiClient.post<any>(`/api/v1/communities/${communityId}/cotisations/${cotId}/cancel`);
      const refunded = (res.data as any)?.refunded_count ?? (res.data as any)?.data?.refunded_count;
      toast.success(refunded != null ? `${refunded} membre${refunded !== 1 ? 's' : ''} remboursé${refunded !== 1 ? 's' : ''}` : 'Cotisation annulée');
      load(true);
    } catch (e: any) { toast.error(e?.response?.data?.detail ?? 'Erreur'); }
    finally { setActionLoading(null); }
  }

  async function exemptMember(userId: string) {
    setExempting(userId);
    try {
      await apiClient.patch(`/api/v1/communities/${communityId}/cotisations/${cotId}/contributions/${userId}/exempt`);
      toast.success('Membre exempté');
      setContributions(prev => prev.map(c => c.user_id === userId ? { ...c, status: 'exempt' } : c));
    } catch (e: any) { toast.error(e?.response?.data?.detail ?? 'Erreur'); }
    finally { setExempting(null); }
  }

  // ── Filtres ───────────────────────────────────────────────────────────────────

  const FILTERS: { key: FilterTab; label: string }[] = [
    { key: 'all',     label: `Tous (${counts.all})`           },
    { key: 'paid',    label: `Payés (${counts.paid})`         },
    { key: 'pending', label: `En attente (${counts.pending})` },
    { key: 'exempt',  label: `Exemptés (${counts.exempt})`    },
  ];

  // ── Rendu ─────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl transition-all"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <ArrowLeft size={20} />
        </button>
        <div className="text-center min-w-0 flex-1 px-2">
          <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
            {cot?.title ?? 'Cotisation'}
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="p-1.5 rounded-xl transition-all" style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : !cot ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <AlertCircle size={32} style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-tertiary)' }}>Cotisation introuvable</p>
          <button onClick={() => navigate(-1)} className="text-sm font-bold" style={{ color: 'var(--primary)' }}>Retour</button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">

          {/* Bande colorée statut */}
          {isActive && <div className="h-1" style={{ background: 'linear-gradient(90deg, #7B3FF2, #E0389A)' }} />}

          {/* Carte principale */}
          <div className="m-4 rounded-3xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #7B3FF2, #E0389A)' }}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold tracking-widest text-white/70 mb-1">
                    {isActive ? 'EN COURS' : cot.status === 'closed' ? 'CLÔTURÉE' : 'ANNULÉE'}
                  </p>
                  <p className="text-2xl font-black text-white truncate">{cot.title}</p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-xl font-black text-white">{cot.amount_per_member.toLocaleString()}</p>
                  <p className="text-[11px] text-white/60">coins/membre</p>
                </div>
              </div>

              {cot.description && (
                <p className="text-sm text-white/80 mb-3 leading-relaxed">{cot.description}</p>
              )}

              {/* Barre progression */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] font-bold text-white/80">
                    {cot.collected_coins.toLocaleString()} / {cot.target_amount_coins.toLocaleString()} coins
                  </span>
                  <span className="text-sm font-black text-white">{Math.round(cot.progress_pct ?? 0)}%</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.25)' }}>
                  <div className="h-full rounded-full bg-white transition-all duration-700"
                    style={{ width: `${Math.min(cot.progress_pct ?? 0, 100)}%` }} />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Par membre', value: `${cot.amount_per_member.toLocaleString()}` },
                  { label: 'Payés',      value: `${cot.member_count_paid}` },
                  { label: 'En attente', value: `${cot.member_count_total - cot.member_count_paid}` },
                  { label: 'Total',      value: `${cot.member_count_total}` },
                ].map(s => (
                  <div key={s.label} className="text-center p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <p className="text-sm font-black text-white">{s.value}</p>
                    <p className="text-[9px] text-white/60">{s.label}</p>
                  </div>
                ))}
              </div>

              {cot.deadline && (
                <p className="text-[11px] text-white/60 mt-3 flex items-center gap-1">
                  <Clock size={10} />
                  {isPast(new Date(cot.deadline))
                    ? `Expiré ${formatDistanceToNow(new Date(cot.deadline), { locale: fr, addSuffix: true })}`
                    : `Expire ${formatDistanceToNow(new Date(cot.deadline), { locale: fr, addSuffix: true })}`}
                </p>
              )}
            </div>
          </div>

          {/* Actions utilisateur courant */}
          {isActive && (
            <div className="mx-4 mb-4">
              {hasPaid ? (
                <div className="flex items-center gap-3 p-3.5 rounded-2xl"
                  style={{ background: '#10B98115', border: '1px solid #10B98130' }}>
                  <CheckCircle size={20} color="#10B981" />
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#10B981' }}>Vous avez payé</p>
                    {myContrib?.paid_at && (
                      <p className="text-[11px]" style={{ color: '#10B98180' }}>
                        {format(new Date(myContrib.paid_at), 'd MMM yyyy à HH:mm', { locale: fr })}
                      </p>
                    )}
                  </div>
                </div>
              ) : isExempt ? (
                <div className="flex items-center gap-3 p-3.5 rounded-2xl"
                  style={{ background: '#3B82F615', border: '1px solid #3B82F630' }}>
                  <Shield size={20} color="#3B82F6" />
                  <p className="text-sm font-bold" style={{ color: '#3B82F6' }}>Vous êtes exempté</p>
                </div>
              ) : (
                <button onClick={pay} disabled={paying}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white transition-all"
                  style={{ background: 'linear-gradient(90deg, #7B3FF2, #E0389A)' }}>
                  {paying ? <Spinner size="sm" /> : <><Target size={16} /> Payer {cot.amount_per_member.toLocaleString()} coins</>}
                </button>
              )}
            </div>
          )}

          {/* Actions admin/mod */}
          {canManage && isActive && (
            <div className="mx-4 mb-4 flex gap-2">
              <button onClick={closeCot} disabled={!!actionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border transition-all"
                style={{ background: '#10B98115', borderColor: '#10B98130', color: '#10B981' }}>
                {actionLoading === 'close' ? <Spinner size="sm" /> : <><Check size={14} /> Clôturer</>}
              </button>
              <button onClick={cancelCot} disabled={!!actionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border transition-all"
                style={{ background: '#EF444415', borderColor: '#EF444430', color: '#EF4444' }}>
                {actionLoading === 'cancel' ? <Spinner size="sm" /> : <><X size={14} /> Annuler</>}
              </button>
            </div>
          )}

          {/* Filtres contributions */}
          <div className="mx-4 mb-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={{
                    background: filter === f.key ? 'var(--primary)' : 'var(--bg-secondary)',
                    color: filter === f.key ? '#fff' : 'var(--text-tertiary)',
                  }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Liste contributions */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-10">
              <Users size={24} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Aucun résultat</p>
            </div>
          ) : (
            <div className="mx-4 mb-6 rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {filtered.map((c, i) => {
                const st     = STATUS_CFG[c.status] ?? STATUS_CFG.pending;
                const StIcon = st.Icon;
                const isMe   = c.user_id === myUserId;
                return (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <Avatar src={c.avatar_url ?? null} name={c.display_name ?? c.username ?? '?'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {c.display_name ?? c.username}
                        {isMe && <span className="ml-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>(toi)</span>}
                      </p>
                      {c.paid_at && (
                        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                          {format(new Date(c.paid_at), 'd MMM yyyy', { locale: fr })}
                        </p>
                      )}
                    </div>
                    {c.coins_paid > 0 && (
                      <p className="text-xs font-bold shrink-0" style={{ color: 'var(--text-secondary)' }}>
                        {c.coins_paid.toLocaleString()} coins
                      </p>
                    )}
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                      style={{ background: st.bg, color: st.color }}>
                      <StIcon size={9} /> {st.label}
                    </span>
                    {canManage && c.status === 'pending' && isActive && (
                      <button onClick={() => exemptMember(c.user_id)} disabled={!!exempting}
                        className="p-1.5 rounded-xl transition-all shrink-0"
                        style={{ color: '#3B82F6' }}
                        title="Exempter"
                        onMouseEnter={e => (e.currentTarget.style.background = '#3B82F615')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        {exempting === c.user_id ? <Spinner size="sm" /> : <Shield size={14} />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {ConfirmDialog}
    </div>
  );
}
