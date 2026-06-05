import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, UserCheck, UserPlus, UserX, Briefcase, X, Check, Clock,
  BarChart2, Star, AlertCircle, Plus, RefreshCw, ChevronDown,
} from 'lucide-react';
import { apiClient } from '../../api';
import { decodeId } from '../../utils/slugId';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

// ── Types (champs API exacts du backend) ──────────────────────────────────────

interface Treasurer {
  id?: string; user_id: string;
  display_name?: string | null; username?: string | null; avatar_url?: string | null;
  appointer_name?: string | null; appointed_at?: string | null;
}

interface ElectionResult {
  user_id: string; display_name?: string | null; username?: string | null;
  avatar_url?: string | null; votes: number;
  pct: number; // champ exact API : `pct` (pas `percentage`)
}

interface Election {
  id: string; status: string; created_at?: string;
  total_votes: number; total_members: number; participation: number;
  my_vote?: string | null; results: ElectionResult[];
}

interface WithdrawalRequest {
  id: string;
  coins_amount: number;  // champ exact API : `coins_amount`
  eur_amount?: number;
  description?: string | null;
  status: 'pending' | 'approved_admin' | 'approved_treasurer' | 'approved' | 'rejected' | 'cancelled';
  admin_approved: boolean; treasurer_approved: boolean;
  admin_approved_at?: string | null; treasurer_approved_at?: string | null;
  rejected_at?: string | null; rejection_note?: string | null;
  executed_at?: string | null;
  requested_by_name?: string | null; requested_by_id?: string | null;
  created_at: string;
}

interface Member {
  id: string; user_id: string;
  display_name?: string | null; username?: string | null; avatar_url?: string | null;
  role: string;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; Icon: React.FC<any> }> = {
  pending:            { label: 'En attente',         color: '#F59E0B', bg: '#F59E0B15', Icon: Clock },
  approved_admin:     { label: 'Attente trésorier',  color: '#3B82F6', bg: '#3B82F615', Icon: Check },
  approved_treasurer: { label: 'Attente admin',      color: '#3B82F6', bg: '#3B82F615', Icon: Check },
  approved:           { label: 'Approuvé',           color: '#10B981', bg: '#10B98115', Icon: Check },
  rejected:           { label: 'Rejeté',             color: '#EF4444', bg: '#EF444415', Icon: X    },
  cancelled:          { label: 'Annulé',             color: '#9390AB', bg: '#9390AB15', Icon: X    },
};

function coinsToEur(c: number) { return (c / 100).toFixed(2); }

// ── Modal: demande de retrait (admin seulement) ───────────────────────────────
function WithdrawModal({ communityId, balance, hasTreasurer, onClose, onCreated }: {
  communityId: string; balance: number; hasTreasurer: boolean;
  onClose: () => void; onCreated: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [desc,   setDesc]   = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    const n = Number(amount);
    if (!amount || n <= 0) { toast.error('Montant requis'); return; }
    if (n > balance)       { toast.error(`Solde insuffisant — max ${balance.toLocaleString()} coins`); return; }
    setSaving(true);
    try {
      await apiClient.post(`/api/v1/communities/${communityId}/withdrawal-requests`, {
        coins_amount: n,
        description: desc.trim() || null,
      });
      toast.success('Demande soumise');
      onCreated(); onClose();
    } catch (e: any) { toast.error(e?.response?.data?.detail ?? 'Erreur'); }
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
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Demande de retrait</p>
            <button onClick={submit} disabled={saving} className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
              {saving ? <Spinner size="sm" /> : 'Soumettre'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl" style={{ background: '#7B3FF215', border: '1px solid #7B3FF230' }}>
              <Briefcase size={18} color="#7B3FF2" />
              <div>
                <p className="text-xs font-bold" style={{ color: '#7B3FF2' }}>Solde disponible</p>
                <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                  {balance.toLocaleString()} coins ≈ {coinsToEur(balance)} EUR
                </p>
              </div>
            </div>
            {hasTreasurer && (
              <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: '#F59E0B10', border: '1px solid #F59E0B30' }}>
                <AlertCircle size={14} color="#F59E0B" className="shrink-0 mt-0.5" />
                <p className="text-[11px]" style={{ color: '#F59E0B' }}>
                  Double approbation requise : admin ET trésorier doivent valider.
                </p>
              </div>
            )}
            <div>
              <label className="text-[10px] font-bold tracking-widest mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>MONTANT (COINS)</label>
              <div className="relative">
                <input type="number" min="1" max={balance} value={amount} onChange={e => setAmount(e.target.value)}
                  className="input w-full pr-24" placeholder={`Max ${balance.toLocaleString()}`} />
                {amount && Number(amount) > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                    ≈ {coinsToEur(Number(amount))} EUR
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold tracking-widest mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>MOTIF (optionnel)</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} maxLength={300} rows={3}
                className="input w-full resize-none" placeholder="Ex: Frais d'organisation de l'événement…" />
            </div>
            <div className="h-4" />
          </div>
        </div>
      </div>
    </>
  );
}

// ── Modal: rejeter une demande ────────────────────────────────────────────────
function RejectModal({ onClose, onConfirm }: {
  onClose: () => void; onConfirm: (note: string) => void;
}) {
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try { await onConfirm(note.trim()); }
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
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Rejeter la demande</p>
            <button onClick={submit} disabled={saving} className="text-sm font-bold" style={{ color: '#EF4444' }}>
              {saving ? <Spinner size="sm" /> : 'Rejeter'}
            </button>
          </div>
          <div className="p-5">
            <label className="text-[10px] font-bold tracking-widest mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>MOTIF (optionnel)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={200} rows={3} autoFocus
              className="input w-full resize-none" placeholder="Expliquer la raison du rejet…" />
            <div className="h-4" />
          </div>
        </div>
      </div>
    </>
  );
}

// ── Modal: nommer trésorier ───────────────────────────────────────────────────
function AppointModal({ members, onClose, onAppointed }: {
  members: Member[]; onClose: () => void; onAppointed: (userId: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState('');
  const [saving,   setSaving]   = useState(false);
  const candidates = useMemo(() => members.filter(m => m.role !== 'admin'), [members]);

  async function submit() {
    if (!selected) { toast.error('Sélectionnez un membre'); return; }
    setSaving(true);
    try { await onAppointed(selected); }
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
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Nommer un trésorier</p>
            <button onClick={submit} disabled={saving || !selected} className="text-sm font-bold"
              style={{ color: 'var(--primary)', opacity: selected ? 1 : 0.4 }}>
              {saving ? <Spinner size="sm" /> : 'Nommer'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {candidates.length === 0 ? (
              <p className="text-sm text-center py-10" style={{ color: 'var(--text-tertiary)' }}>Aucun candidat disponible</p>
            ) : candidates.map(m => (
              <button key={m.user_id} onClick={() => setSelected(m.user_id)}
                className="w-full flex items-center gap-3 px-4 py-3 transition-all"
                style={{ borderBottom: '1px solid var(--border)', background: selected === m.user_id ? 'var(--bg-secondary)' : 'transparent' }}>
                <Avatar src={m.avatar_url ?? null} name={m.display_name ?? m.username ?? '?'} size="sm" />
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{m.display_name ?? m.username}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{m.role}</p>
                </div>
                {selected === m.user_id && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--primary)' }}>
                    <Check size={11} color="white" />
                  </div>
                )}
              </button>
            ))}
            <div className="h-4" />
          </div>
        </div>
      </div>
    </>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function CommunityTreasurerPage() {
  const { id: slug } = useParams<{ id: string }>();
  const id           = decodeId(slug!);
  const navigate     = useNavigate();
  const { user: me } = useAuthStore();
  const mountedRef   = useRef(true);

  const [name,       setName]       = useState('');
  const [treasurer,  setTreasurer]  = useState<Treasurer | null>(null);
  const [election,   setElection]   = useState<Election | null>(null);
  const [requests,   setRequests]   = useState<WithdrawalRequest[]>([]);
  const [members,    setMembers]    = useState<Member[]>([]);
  const [myRole,     setMyRole]     = useState<string | null>(null);
  const [balance,    setBalance]    = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showWithdraw,  setShowWithdraw]  = useState(false);
  const [showAppoint,   setShowAppoint]   = useState(false);
  const [rejectTarget,  setRejectTarget]  = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [voteLoading,   setVoteLoading]   = useState<string | null>(null);
  const [launching,     setLaunching]     = useState(false);
  const [closing,       setClosing]       = useState(false);

  // Dérivés mémorisés
  const meId        = me?.id ?? '';
  const isAdmin     = myRole === 'admin';
  const isTreasurer = treasurer?.user_id === meId;

  // Double approbation : chaque acteur voit son propre bouton
  const canApprove = useCallback((req: WithdrawalRequest) => {
    if (req.status === 'approved' || req.status === 'rejected' || req.status === 'cancelled') return false;
    if (isAdmin && !req.admin_approved) return true;
    if (isTreasurer && !req.treasurer_approved) return true;
    return false;
  }, [isAdmin, isTreasurer]);

  const canReject = useCallback((req: WithdrawalRequest) => {
    return (isAdmin || isTreasurer) &&
      (req.status === 'pending' || req.status === 'approved_admin' || req.status === 'approved_treasurer');
  }, [isAdmin, isTreasurer]);

  const approveLabel = useCallback((req: WithdrawalRequest) => {
    if (isAdmin && !req.admin_approved) return 'Approuver (admin)';
    if (isTreasurer && !req.treasurer_approved) return 'Approuver (trésorier)';
    return 'Approuver';
  }, [isAdmin, isTreasurer]);

  // Stats retraits mémorisées
  const reqStats = useMemo(() => ({
    pending:  requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    total:    requests.reduce((s, r) => s + (r.status === 'approved' ? r.coins_amount : 0), 0),
  }), [requests]);

  // Membres candidats pour l'élection (non-admin)
  const electionCandidates = useMemo(() =>
    members.filter(m => m.role !== 'admin').slice(0, 10),
    [members]
  );

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const [commRes, roleRes, reqRes] = await Promise.all([
        apiClient.get<any>(`/api/v1/communities/${id}`),
        apiClient.get<any>(`/api/v1/communities/${id}/role`),
        apiClient.get<any>(`/api/v1/communities/${id}/withdrawal-requests`).catch(() => ({ data: [] })),
      ]);
      if (!mountedRef.current) return;
      setName((commRes.data?.data ?? commRes.data)?.name ?? '');
      setMyRole(roleRes.data?.role ?? null);
      const reqList = reqRes.data?.data ?? reqRes.data?.items ?? reqRes.data;
      setRequests(Array.isArray(reqList) ? reqList : []);

      // Appels secondaires non bloquants
      const [tRes, eRes, wRes, mRes] = await Promise.allSettled([
        apiClient.get<any>(`/api/v1/communities/${id}/treasurer`),
        apiClient.get<any>(`/api/v1/communities/${id}/treasurer-elections/active`),
        apiClient.get<any>(`/api/v1/communities/${id}/wallet`),
        apiClient.get<any>(`/api/v1/communities/${id}/members`),
      ]);
      if (!mountedRef.current) return;

      if (tRes.status === 'fulfilled') {
        const td = tRes.value.data;
        setTreasurer(td?.treasurer ?? td?.data ?? td ?? null);
      } else { setTreasurer(null); }

      if (eRes.status === 'fulfilled') {
        setElection(eRes.value.data?.election ?? null);
      } else { setElection(null); }

      if (wRes.status === 'fulfilled') {
        const wd = wRes.value.data?.data ?? wRes.value.data;
        setBalance(wd?.coins_balance ?? 0);
      }

      if (mRes.status === 'fulfilled') {
        const md = mRes.value.data;
        const list = Array.isArray(md) ? md : md?.items ?? md?.data ?? [];
        setMembers(list);
      }
    } catch { /* erreur silencieuse — données partielles restent affichées */ }
    finally { if (mountedRef.current) { setLoading(false); setRefreshing(false); } }
  }, [id]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function launchElection() {
    if (!confirm('Lancer un vote pour élire le trésorier ?')) return;
    setLaunching(true);
    try {
      await apiClient.post(`/api/v1/communities/${id}/treasurer-elections`);
      toast.success('Vote lancé'); load(true);
    } catch (e: any) { toast.error(e?.response?.data?.detail ?? 'Erreur'); }
    finally { setLaunching(false); }
  }

  async function closeElection() {
    if (!election) return;
    if (election.total_votes === 0) { toast.error('Aucun vote enregistré'); return; }
    const leader = election.results[0];
    if (!confirm(`Élire ${leader?.display_name ?? leader?.username} comme trésorier ?\n${leader?.votes} vote${leader?.votes !== 1 ? 's' : ''} (${leader?.pct}%)`)) return;
    setClosing(true);
    try {
      await apiClient.post(`/api/v1/communities/${id}/treasurer-elections/${election.id}/close`);
      toast.success('Trésorier élu'); load(true);
    } catch (e: any) { toast.error(e?.response?.data?.detail ?? 'Erreur'); }
    finally { setClosing(false); }
  }

  async function vote(candidateId: string) {
    if (!election) return;
    const isChange = !!election.my_vote;
    if (isChange && !confirm('Changer votre vote ?')) return;
    setVoteLoading(candidateId);
    try {
      await apiClient.post(`/api/v1/communities/${id}/treasurer-elections/${election.id}/vote`, { candidate_id: candidateId });
      toast.success(isChange ? 'Vote modifié' : 'Vote enregistré'); load(true);
    } catch (e: any) { toast.error(e?.response?.data?.detail ?? 'Erreur'); }
    finally { setVoteLoading(null); }
  }

  async function removeTreasurer() {
    if (!confirm('Retirer le trésorier actuel ?')) return;
    try {
      await apiClient.delete(`/api/v1/communities/${id}/treasurer`);
      toast.success('Trésorier retiré'); setTreasurer(null);
    } catch (e: any) { toast.error(e?.response?.data?.detail ?? 'Erreur'); }
  }

  async function appointTreasurer(userId: string) {
    await apiClient.post(`/api/v1/communities/${id}/treasurer`, { user_id: userId });
    toast.success('Trésorier nommé'); setShowAppoint(false); load(true);
  }

  async function approveRequest(reqId: string) {
    setActionLoading(reqId);
    try {
      await apiClient.post(`/api/v1/communities/${id}/withdrawal-requests/${reqId}/approve`);
      toast.success('Approuvé'); load(true);
    } catch (e: any) { toast.error(e?.response?.data?.detail ?? 'Erreur'); }
    finally { setActionLoading(null); }
  }

  async function rejectRequest(reqId: string, note: string) {
    setActionLoading(reqId + '_r');
    try {
      await apiClient.post(`/api/v1/communities/${id}/withdrawal-requests/${reqId}/reject`, { rejection_note: note || null });
      toast.success('Rejeté'); setRejectTarget(null); load(true);
    } catch (e: any) { toast.error(e?.response?.data?.detail ?? 'Erreur'); }
    finally { setActionLoading(null); }
  }

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
        <div className="text-center">
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Trésorier & Retraits</p>
          {name && <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{name}</p>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => load(true)} disabled={refreshing}
            className="p-1.5 rounded-xl transition-all" style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          {isAdmin && (
            <button onClick={() => setShowWithdraw(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: 'var(--bg-secondary)', color: 'var(--primary)', border: '1px solid var(--border)' }}>
              <Plus size={13} /> Retrait
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-6">

          {/* Solde */}
          <div className="m-4 rounded-3xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #7B3FF2, #E0389A)' }}>
            <div className="p-5">
              <p className="text-[11px] font-bold tracking-widest text-white/70 mb-1">SOLDE COMMUNAUTAIRE</p>
              <p className="text-3xl font-black text-white">{balance.toLocaleString()}</p>
              <p className="text-sm text-white/70">coins ≈ {coinsToEur(balance)} EUR</p>
              <div className="flex gap-4 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                <div>
                  <p className="text-[10px] text-white/60">En attente</p>
                  <p className="text-sm font-black text-white">{reqStats.pending}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/60">Exécutés</p>
                  <p className="text-sm font-black text-white">{reqStats.approved}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/60">Total retiré</p>
                  <p className="text-sm font-black text-white">{reqStats.total.toLocaleString()} coins</p>
                </div>
              </div>
            </div>
          </div>

          {/* Trésorier actuel */}
          <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--text-tertiary)' }}>TRÉSORIER</p>
            </div>
            {treasurer ? (
              <div className="flex items-center gap-3 px-4 py-3">
                <Avatar src={treasurer.avatar_url ?? null} name={treasurer.display_name ?? treasurer.username ?? '?'} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {treasurer.display_name ?? treasurer.username}
                  </p>
                  {treasurer.appointer_name && (
                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      Nommé par {treasurer.appointer_name}
                      {treasurer.appointed_at && ` · ${format(new Date(treasurer.appointed_at), 'd MMM yyyy', { locale: fr })}`}
                    </p>
                  )}
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: '#7B3FF220', color: '#7B3FF2' }}>
                    <UserCheck size={9} /> TRÉSORIER
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex flex-col gap-1.5">
                    <button onClick={() => setShowAppoint(true)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border"
                      style={{ background: '#7B3FF215', borderColor: '#7B3FF240', color: '#7B3FF2' }}>
                      <UserPlus size={10} /> Changer
                    </button>
                    <button onClick={removeTreasurer}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border"
                      style={{ background: '#EF444415', borderColor: '#EF444440', color: '#EF4444' }}>
                      <UserX size={10} /> Retirer
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
                  <UserX size={18} style={{ color: 'var(--text-tertiary)' }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Aucun trésorier</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Nommez un membre ou lancez un vote</p>
                </div>
                {isAdmin && (
                  <button onClick={() => setShowAppoint(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border"
                    style={{ background: '#7B3FF215', borderColor: '#7B3FF240', color: '#7B3FF2' }}>
                    <UserPlus size={11} /> Nommer
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Élection */}
          <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                {election ? 'VOTE EN COURS' : 'ÉLECTION'}
              </p>
              {isAdmin && (
                election ? (
                  <button onClick={closeElection} disabled={closing}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold text-white"
                    style={{ background: 'linear-gradient(90deg, #7B3FF2, #E0389A)' }}>
                    {closing ? <Spinner size="sm" /> : <><Check size={10} /> Clôturer & Élire</>}
                  </button>
                ) : (
                  <button onClick={launchElection} disabled={launching}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold border"
                    style={{ background: '#7B3FF215', borderColor: '#7B3FF240', color: '#7B3FF2' }}>
                    {launching ? <Spinner size="sm" /> : <><BarChart2 size={10} /> Lancer un vote</>}
                  </button>
                )
              )}
            </div>

            {election ? (
              <div className="p-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: 'Votes',         value: election.total_votes },
                    { label: 'Participation', value: `${Math.round(election.participation)}%` },
                    { label: 'Membres',       value: election.total_members },
                  ].map(s => (
                    <div key={s.label} className="text-center p-2.5 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                      <p className="text-base font-black" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Candidats avec votes */}
                {election.results.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {election.results.map((r, i) => {
                      const isLeader   = i === 0 && r.votes > 0;
                      const myVoteHere = election.my_vote === r.user_id;
                      const isVoting   = voteLoading === r.user_id;
                      return (
                        <div key={r.user_id} className="p-3 rounded-xl"
                          style={{ background: 'var(--bg-secondary)', border: `1px solid ${myVoteHere ? 'var(--primary)' : 'transparent'}` }}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="relative">
                              <Avatar src={r.avatar_url ?? null} name={r.display_name ?? r.username ?? '?'} size="xs" />
                              {isLeader && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#F59E0B' }}>
                                  <Star size={8} color="white" fill="white" />
                                </div>
                              )}
                            </div>
                            <p className="flex-1 text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                              {r.display_name ?? r.username}
                            </p>
                            <p className="text-xs font-black" style={{ color: 'var(--primary)' }}>{r.votes} vote{r.votes !== 1 ? 's' : ''}</p>
                            {myVoteHere && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--primary)', color: 'white' }}>MON VOTE</span>
                            )}
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'var(--border)' }}>
                            <div className="h-full rounded-full transition-all duration-700" style={{
                              width: `${r.pct}%`,
                              background: isLeader ? 'linear-gradient(90deg, #7B3FF2, #E0389A)' : 'var(--primary)',
                              opacity: isLeader ? 1 : 0.6,
                            }} />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{r.pct}%</span>
                            {!election.my_vote ? (
                              <button onClick={() => vote(r.user_id)} disabled={!!voteLoading}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                                style={{ background: '#7B3FF215', color: '#7B3FF2' }}>
                                {isVoting ? <Spinner size="sm" /> : 'Voter'}
                              </button>
                            ) : myVoteHere ? (
                              <button onClick={() => vote(r.user_id)} disabled={!!voteLoading}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                                style={{ background: '#10B98115', color: '#10B981' }}>
                                <Check size={9} /> Mon vote · Changer
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Candidats sans votes encore */}
                {election.results.length === 0 && electionCandidates.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold tracking-widest mb-1" style={{ color: 'var(--text-tertiary)' }}>CANDIDATS</p>
                    {electionCandidates.map(m => {
                      const isVoting = voteLoading === m.user_id;
                      return (
                        <div key={m.user_id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                          <Avatar src={m.avatar_url ?? null} name={m.display_name ?? m.username ?? '?'} size="xs" />
                          <p className="flex-1 text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                            {m.display_name ?? m.username}
                          </p>
                          {!election.my_vote ? (
                            <button onClick={() => vote(m.user_id)} disabled={!!voteLoading}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                              style={{ background: '#7B3FF215', color: '#7B3FF2' }}>
                              {isVoting ? <Spinner size="sm" /> : 'Voter'}
                            </button>
                          ) : election.my_vote === m.user_id ? (
                            <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={{ background: '#10B98115', color: '#10B981' }}>
                              <Check size={9} className="inline mr-0.5" /> Voté
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 px-4 text-center">
                <BarChart2 size={28} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Aucune élection en cours</p>
                {isAdmin && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    Lancez un vote pour élire un trésorier démocratiquement.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Demandes de retrait */}
          <div className="mx-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                DEMANDES DE RETRAIT ({requests.length})
              </p>
              {isAdmin && (
                <button onClick={() => setShowWithdraw(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold border"
                  style={{ background: '#7B3FF215', borderColor: '#7B3FF240', color: '#7B3FF2' }}>
                  <Plus size={11} /> Nouvelle demande
                </button>
              )}
            </div>
            {requests.length === 0 ? (
              <div className="flex flex-col items-center py-10 rounded-2xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <Briefcase size={28} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-tertiary)' }}>Aucune demande de retrait</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map(req => {
                  const st         = STATUS_CFG[req.status] ?? STATUS_CFG.pending;
                  const StIcon     = st.Icon;
                  const isLoading  = actionLoading === req.id;
                  const isRejLoad  = actionLoading === req.id + '_r';
                  const approvable = canApprove(req);
                  const rejectable = canReject(req);
                  return (
                    <div key={req.id} className="rounded-2xl overflow-hidden"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
                              {req.coins_amount.toLocaleString()} <span className="text-sm font-bold">coins</span>
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                              ≈ {req.eur_amount?.toFixed(2) ?? coinsToEur(req.coins_amount)} EUR
                            </p>
                          </div>
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0"
                            style={{ background: st.bg, color: st.color }}>
                            <StIcon size={9} /> {st.label}
                          </span>
                        </div>

                        {req.description && (
                          <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{req.description}</p>
                        )}

                        {/* Double approbation */}
                        <div className="flex items-center gap-3 mb-3">
                          {[
                            { label: 'Admin',      ok: req.admin_approved,     date: req.admin_approved_at },
                            { label: 'Trésorier',  ok: req.treasurer_approved, date: req.treasurer_approved_at },
                          ].map(box => (
                            <div key={box.label} className="flex-1 flex items-center gap-2 p-2 rounded-xl"
                              style={{ background: box.ok ? '#10B98115' : 'var(--bg-secondary)', border: `1px solid ${box.ok ? '#10B98130' : 'var(--border)'}` }}>
                              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                style={{ background: box.ok ? '#10B981' : 'var(--border)' }}>
                                <Check size={10} color="white" />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold" style={{ color: box.ok ? '#10B981' : 'var(--text-tertiary)' }}>{box.label}</p>
                                {box.date && <p className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{format(new Date(box.date), 'd MMM', { locale: fr })}</p>}
                              </div>
                            </div>
                          ))}
                        </div>

                        {req.rejection_note && (
                          <div className="flex items-start gap-2 mb-3 p-2.5 rounded-xl"
                            style={{ background: '#EF444410', border: '1px solid #EF444430' }}>
                            <AlertCircle size={12} color="#EF4444" className="shrink-0 mt-0.5" />
                            <p className="text-[11px]" style={{ color: '#EF4444' }}>{req.rejection_note}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                              {formatDistanceToNow(new Date(req.created_at), { locale: fr, addSuffix: true })}
                            </p>
                            {req.requested_by_name && (
                              <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Par {req.requested_by_name}</p>
                            )}
                          </div>
                          {(approvable || rejectable) && (
                            <div className="flex items-center gap-2">
                              {rejectable && (
                                <button onClick={() => setRejectTarget(req.id)} disabled={!!actionLoading}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border"
                                  style={{ background: '#EF444415', borderColor: '#EF444440', color: '#EF4444' }}>
                                  {isRejLoad ? <Spinner size="sm" /> : <><X size={11} /> Rejeter</>}
                                </button>
                              )}
                              {approvable && (
                                <button onClick={() => approveRequest(req.id)} disabled={!!actionLoading}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                                  style={{ background: 'linear-gradient(90deg, #7B3FF2, #E0389A)' }}>
                                  {isLoading ? <Spinner size="sm" /> : <><Check size={11} /> {approveLabel(req)}</>}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Modals */}
      {showWithdraw && (
        <WithdrawModal communityId={String(id)} balance={balance} hasTreasurer={!!treasurer}
          onClose={() => setShowWithdraw(false)} onCreated={() => load(true)} />
      )}
      {showAppoint && (
        <AppointModal members={members} onClose={() => setShowAppoint(false)} onAppointed={appointTreasurer} />
      )}
      {rejectTarget && (
        <RejectModal onClose={() => setRejectTarget(null)} onConfirm={note => rejectRequest(rejectTarget, note)} />
      )}
    </div>
  );
}
