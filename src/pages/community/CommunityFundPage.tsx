import { PageLoader } from '../../components/ui/Spinner';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, X, RefreshCw, CheckCircle, Shield,
  Clock, Users, Target, TrendingUp,
} from 'lucide-react';
import { apiClient } from '../../api';
import { decodeId, encodeId } from '../../utils/slugId';
import { Spinner } from '../../components/ui/Spinner';
import { formatDistanceToNow, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { extractApiErrorMessage } from '../../utils/apiError';

// ── Types (champs API exacts) ─────────────────────────────────────────────────

interface Cotisation {
  id: string; title: string; description?: string | null;
  amount_per_member: number;
  target_amount_gogold: number;
  collected_gogold: number;
  member_count_paid: number;
  member_count_total: number;
  progress_pct: number;
  status: 'active' | 'closed' | 'cancelled';
  deadline?: string | null;
  created_at: string;
  my_contribution?: {
    status: 'paid' | 'pending' | 'exempt';
    gogold_paid: number;
    paid_at?: string | null;
  } | null;
}

function goGoldToEur(c: number) { return ((c / 100) * 0.35).toFixed(2); }

function deadlineLabel(d: string) {
  const date = new Date(d);
  if (isPast(date)) return `Expiré ${formatDistanceToNow(date, { locale: fr, addSuffix: true })}`;
  return `Expire ${formatDistanceToNow(date, { locale: fr, addSuffix: true })}`;
}

// ── CotisationCard ─────────────────────────────────────────────────────────────
function CotisationCard({ cot, paying, onPay, onPress }: {
  cot: Cotisation; paying: boolean;
  onPay: (id: string) => void; onPress: (id: string) => void;
}) {
  const myStatus = cot.my_contribution?.status;
  const hasPaid  = myStatus === 'paid';
  const isExempt = myStatus === 'exempt';
  const isActive = cot.status === 'active';
  const pct      = Math.min(cot.progress_pct ?? 0, 100);

  return (
    <div className="rounded-2xl overflow-hidden cursor-pointer"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      onClick={() => onPress(cot.id)}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(123,63,242,0.5)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>

      {isActive && <div className="h-1" style={{ background: 'linear-gradient(90deg, #7B3FF2, #5B2EC4)' }} />}

      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{cot.title}</p>
              {!isActive && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                  style={{
                    background: cot.status === 'closed' ? '#10B98115' : '#EF444415',
                    color: cot.status === 'closed' ? '#10B981' : '#EF4444',
                  }}>
                  {cot.status === 'closed' ? 'Clôturée' : 'Annulée'}
                </span>
              )}
            </div>
            <p className="text-xl font-black" style={{ color: 'var(--primary)' }}>
              {cot.amount_per_member.toLocaleString()} <span className="text-xs font-bold">GoGold</span>
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              par membre · ≈ {goGoldToEur(cot.amount_per_member)} EUR
            </p>
          </div>
          <div className="shrink-0">
            {hasPaid ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold"
                style={{ background: '#10B98115', color: '#10B981' }}>
                <CheckCircle size={11} /> Payé
              </div>
            ) : isExempt ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold"
                style={{ background: '#3B82F615', color: '#3B82F6' }}>
                <Shield size={11} /> Exempté
              </div>
            ) : isActive ? (
              <button onClick={e => { e.stopPropagation(); onPay(cot.id); }} disabled={paying}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                style={{ background: 'linear-gradient(90deg, #7B3FF2, #5B2EC4)' }}>
                {paying ? <Spinner size="sm" /> : 'Payer'}
              </button>
            ) : null}
          </div>
        </div>

        {cot.description && (
          <p className="text-xs mb-3 line-clamp-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {cot.description}
          </p>
        )}

        {/* Barre progression */}
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold" style={{ color: 'var(--text-tertiary)' }}>
              {cot.collected_gogold.toLocaleString()} / {cot.target_amount_gogold.toLocaleString()} GoGold
            </span>
            <span className="text-[10px] font-black" style={{ color: 'var(--primary)' }}>{Math.round(pct)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #7B3FF2, #5B2EC4)' }} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            <Users size={10} /> {cot.member_count_paid}/{cot.member_count_total} payés
          </span>
          {cot.deadline && (
            <span className="flex items-center gap-1 text-[10px]"
              style={{ color: isPast(new Date(cot.deadline)) ? '#EF4444' : 'var(--text-tertiary)' }}>
              <Clock size={10} /> {deadlineLabel(cot.deadline)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal: créer une cotisation ───────────────────────────────────────────────
function CreateModal({ communityId, onClose, onCreated }: {
  communityId: string; onClose: () => void; onCreated: () => void;
}) {
  const [title,    setTitle]    = useState('');
  const [desc,     setDesc]     = useState('');
  const [amount,   setAmount]   = useState('');
  const [deadline, setDeadline] = useState('');
  const [saving,   setSaving]   = useState(false);

  async function submit() {
    if (!title.trim())                { toast.error('Titre requis'); return; }
    if (!amount || Number(amount) < 1) { toast.error('Montant min : 1 GoGold'); return; }
    setSaving(true);
    try {
      await apiClient.post(`/api/v1/communities/${communityId}/cotisations`, {
        title:             title.trim(),
        description:       desc.trim() || undefined,
        amount_per_member: Number(amount),
        deadline:          deadline || undefined,
      });
      toast.success('Cotisation créée');
      onCreated(); onClose();
    } catch (e: any) { toast.error(extractApiErrorMessage(e, 'Impossible de créer la cotisation')); }
    finally { setSaving(false); }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-lg flex flex-col rounded-2xl overflow-hidden pointer-events-auto"
          style={{ background: 'var(--surface)', maxHeight: '90vh', boxShadow: '0 24px 80px rgba(0,0,0,0.35)' }}>
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ color: 'var(--text-primary)' }}><X size={20} /></button>
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Nouvelle cotisation</p>
          <button onClick={submit} disabled={saving} className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
            {saving ? <Spinner size="sm" /> : 'Créer'}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold tracking-widest mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>TITRE *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80}
              className="input w-full" placeholder="Ex: Voyage d'été 2025" autoFocus />
          </div>
          <div>
            <label className="text-[10px] font-bold tracking-widest mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>DESCRIPTION</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} maxLength={300} rows={3}
              className="input w-full resize-none" placeholder="Détails optionnels…" />
          </div>
          <div>
            <label className="text-[10px] font-bold tracking-widest mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>MONTANT PAR MEMBRE (GOGOLD) *</label>
            <div className="relative">
              <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)}
                className="input w-full pr-24" placeholder="Ex: 500" />
              {amount && Number(amount) > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                  ≈ {goGoldToEur(Number(amount))} EUR
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold tracking-widest mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>DATE LIMITE (optionnel)</label>
            <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)}
              className="input w-full" min={new Date().toISOString().slice(0, 16)} />
          </div>
          <div className="h-4" />
        </div>
        </div>
      </div>
    </>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function CommunityFundPage() {
  const { id: slug } = useParams<{ id: string }>();
  const id           = decodeId(slug!);
  const navigate     = useNavigate();
  const mountedRef   = useRef(true);

  const [name,       setName]      = useState('');
  const [cots,       setCots]      = useState<Cotisation[]>([]);
  const [myRole,     setMyRole]    = useState<string | null>(null);
  const [loading,    setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paying,     setPaying]    = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const canManage = myRole === 'admin' || myRole === 'moderator';

  const stats = useMemo(() => ({
    totalGoGold:  cots.reduce((s, c) => s + (c.collected_gogold ?? 0), 0),
    activeCount: cots.filter(c => c.status === 'active').length,
    total:       cots.length,
  }), [cots]);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const [commRes, cotsRes, roleRes] = await Promise.all([
        apiClient.get<any>(`/api/v1/communities/${id}`),
        apiClient.get<any>(`/api/v1/communities/${id}/cotisations`),
        apiClient.get<any>(`/api/v1/communities/${id}/role`).catch(() => ({ data: null })),
      ]);
      if (!mountedRef.current) return;
      setName((commRes.data?.data ?? commRes.data)?.name ?? '');
      const list = Array.isArray(cotsRes.data) ? cotsRes.data : cotsRes.data?.items ?? cotsRes.data?.data ?? [];
      setCots(list);
      setMyRole(roleRes.data?.role ?? null);
    } catch { /* silencieux */ }
    finally { if (mountedRef.current) { setLoading(false); setRefreshing(false); } }
  }, [id]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  async function pay(cotId: string) {
    setPaying(cotId);
    try {
      await apiClient.post(`/api/v1/communities/${id}/cotisations/${cotId}/pay`);
      toast.success('Paiement effectué');
      load(true);
    } catch (e: any) {
      const status = e?.status;
      const detail = extractApiErrorMessage(e, '');
      if (status === 402 || detail.toLowerCase().includes('solde') || detail.toLowerCase().includes('insuffi')) {
        toast.error('Solde insuffisant — rechargez vos GoGold');
      } else {
        toast.error(detail || 'Impossible de payer. Réessayez.');
      }
    } finally { if (mountedRef.current) setPaying(null); }
  }

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
        <div className="text-center">
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Cotisations</p>
          {name && <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{name}</p>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => load(true)} disabled={refreshing}
            className="p-1.5 rounded-xl transition-all" style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          {canManage && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: 'rgba(123,63,242,0.12)', color: 'var(--primary)' }}>
              <Plus size={14} /> Créer
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <div className="flex-1 overflow-y-auto">

          {/* Stats */}
          {cots.length > 0 && (
            <div className="m-4 rounded-3xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #7B3FF2, #5B2EC4)' }}>
              <div className="p-5">
                <p className="text-[11px] font-bold tracking-widest text-white/70 mb-3">RÉSUMÉ</p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Collecté', value: stats.totalGoGold.toLocaleString(), sub: 'GoGold' },
                    { label: 'Actives',  value: String(stats.activeCount),          sub: '' },
                    { label: 'Total',    value: String(stats.total),                sub: '' },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <p className="text-xl font-black text-white">{s.value}</p>
                      <p className="text-[10px] text-white/60">{s.sub || s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Liste */}
          {cots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4"
                style={{ background: 'linear-gradient(135deg, #7B3FF2, #5B2EC4)' }}>
                <Target size={32} color="white" />
              </div>
              <p className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>Aucune cotisation</p>
              <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
                {canManage ? 'Créez la première cotisation.' : 'Aucune cotisation active pour le moment.'}
              </p>
              {canManage && (
                <button onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(90deg, #7B3FF2, #5B2EC4)' }}>
                  <Plus size={16} /> Créer une cotisation
                </button>
              )}
            </div>
          ) : (
            <div className="px-4 pb-6 space-y-3">
              {cots.map(cot => (
                <CotisationCard
                  key={cot.id}
                  cot={cot}
                  paying={paying === cot.id}
                  onPay={pay}
                  onPress={cotId => navigate(`/communities/${encodeId(id)}/fund/${encodeId(cotId)}`)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <CreateModal communityId={String(id)} onClose={() => setShowCreate(false)} onCreated={() => load(true)} />
      )}
    </div>
  );
}
