import { PageLoader } from '../../components/ui/Spinner';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, X, Shield, Star, User, Crown, Medal,
  UserX, Ban, Check, RefreshCw, ChevronDown,
} from 'lucide-react';
import { apiClient } from '../../api';
import { decodeId, encodeId } from '../../utils/slugId';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';
import { useConfirm } from '../../components/ui/Dialog';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { extractApiErrorMessage } from '../../utils/apiError';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Member {
  id: string; user_id: string;
  display_name?: string | null; username?: string | null; avatar_url?: string | null;
  role: 'admin' | 'moderator' | 'member';
  joined_at?: string | null;
  gogold?: number;
}

type RoleFilter = 'all' | 'admin' | 'moderator' | 'member';

const ROLE_CFG: Record<string, { label: string; color: string; bg: string; Icon: React.FC<any> }> = {
  admin:     { label: 'Admin',      color: '#7B3FF2', bg: '#7B3FF220', Icon: Shield },
  moderator: { label: 'Modérateur', color: '#3B82F6', bg: '#3B82F620', Icon: Star   },
  member:    { label: 'Membre',     color: '#9390AB', bg: '#9390AB20', Icon: User   },
};

// ── Podium ────────────────────────────────────────────────────────────────────
function PodiumBar({ member, rank, maxGoGold }: { member: Member; rank: number; maxGoGold: number }) {
  const pct      = maxGoGold > 0 ? (member.gogold ?? 0) / maxGoGold : 0;
  const heights  = [64, 48, 32];
  const h        = heights[rank - 1] ?? 32;
  const colors   = ['linear-gradient(180deg, #7B3FF2, #5B2EC4)', 'rgba(148,163,184,0.5)', 'rgba(205,124,58,0.5)'];
  const sizes    = ['md' as const, 'sm' as const, 'sm' as const];
  const isFirst  = rank === 1;

  function abbrev(n: number) {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  }

  return (
    <div className={`flex flex-col items-center gap-1.5 ${isFirst ? 'flex-[1.2]' : 'flex-1'}`}>
      <div className="relative">
        <Avatar src={member.avatar_url ?? null} name={member.display_name ?? member.username ?? '?'} size={sizes[rank - 1]} />
        <div className="absolute -top-2 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black"
          style={{ background: rank === 1 ? '#F59E0B20' : 'var(--surface)', border: `1px solid ${rank === 1 ? '#F59E0B40' : 'var(--border)'}` }}>
          {rank === 1 ? <Crown size={10} color="#F59E0B" fill="#F59E0B" /> :
           rank === 2 ? <Medal size={10} color="#94A3B8" fill="#94A3B8" /> :
                        <Medal size={10} color="#CD7C3A" fill="#CD7C3A" />}
        </div>
      </div>
      <p className={`font-bold truncate text-center ${isFirst ? 'text-xs max-w-[70px]' : 'text-[10px] max-w-[56px]'}`}
        style={{ color: 'var(--text-primary)' }}>
        {member.display_name ?? member.username}
      </p>
      {(member.gogold ?? 0) > 0 && (
        <p className="text-[9px] font-bold" style={{ color: 'var(--text-tertiary)' }}>
          {abbrev(member.gogold ?? 0)} GoGold
        </p>
      )}
      <div className="w-full rounded-t-xl flex items-end justify-center"
        style={{ height: h, background: colors[rank - 1] }}>
        <span className={`font-black text-white/90 pb-1 ${isFirst ? 'text-sm' : 'text-xs'}`}>{rank}</span>
      </div>
    </div>
  );
}

// ── Menu actions sur un membre ─────────────────────────────────────────────────
function MemberActionsMenu({ member, isAdmin, isMod, communityId, onDone, onClose }: {
  member: Member; isAdmin: boolean; isMod: boolean;
  communityId: string; onDone: () => void; onClose: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  async function changeRole(role: string) {
    setLoading('role_' + role);
    try {
      await apiClient.put(`/api/v1/communities/${communityId}/members/${member.user_id}/role`, { role });
      toast.success('Rôle modifié'); onDone();
    } catch (e: any) { toast.error(extractApiErrorMessage(e, 'Erreur')); }
    finally { setLoading(null); }
  }

  async function kick() {
    const ok = await confirm({ title: `Exclure ${member.display_name ?? member.username} ?`, confirmLabel: 'Exclure', danger: true });
    if (!ok) return;
    setLoading('kick');
    try {
      await apiClient.delete(`/api/v1/communities/${communityId}/members/${member.user_id}`);
      toast.success('Membre exclu'); onDone();
    } catch (e: any) { toast.error(extractApiErrorMessage(e, 'Erreur')); }
    finally { setLoading(null); }
  }

  async function block() {
    const ok = await confirm({ title: `Bloquer ${member.display_name ?? member.username} définitivement ?`, confirmLabel: 'Bloquer', danger: true });
    if (!ok) return;
    setLoading('block');
    try {
      await apiClient.post(`/api/v1/communities/${communityId}/members/${member.user_id}/block`);
      toast.success('Membre bloqué'); onDone();
    } catch (e: any) { toast.error(extractApiErrorMessage(e, 'Erreur')); }
    finally { setLoading(null); }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
        style={{ background: 'var(--surface)', boxShadow: '0 -16px 64px rgba(0,0,0,0.3)' }}>
        <div className="flex justify-center pt-3"><div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} /></div>
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <Avatar src={member.avatar_url ?? null} name={member.display_name ?? member.username ?? '?'} size="sm" />
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{member.display_name ?? member.username}</p>
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>@{member.username}</p>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {isAdmin && member.role !== 'admin' && (
            <button onClick={() => changeRole('admin')} disabled={!!loading}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl"
              style={{ background: '#7B3FF215', border: '1px solid #7B3FF230' }}>
              {loading === 'role_admin' ? <Spinner size="sm" /> : <Shield size={16} color="#7B3FF2" />}
              <span className="font-semibold text-sm" style={{ color: '#7B3FF2' }}>Promouvoir Admin</span>
            </button>
          )}
          {isAdmin && member.role !== 'moderator' && (
            <button onClick={() => changeRole('moderator')} disabled={!!loading}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl"
              style={{ background: '#3B82F615', border: '1px solid #3B82F630' }}>
              {loading === 'role_moderator' ? <Spinner size="sm" /> : <Star size={16} color="#3B82F6" />}
              <span className="font-semibold text-sm" style={{ color: '#3B82F6' }}>Promouvoir Modérateur</span>
            </button>
          )}
          {isAdmin && member.role !== 'member' && (
            <button onClick={() => changeRole('member')} disabled={!!loading}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              {loading === 'role_member' ? <Spinner size="sm" /> : <User size={16} style={{ color: 'var(--text-secondary)' }} />}
              <span className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>Rétrograder Membre</span>
            </button>
          )}
          <button onClick={kick} disabled={!!loading}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl"
            style={{ background: '#EF444415', border: '1px solid #EF444430' }}>
            {loading === 'kick' ? <Spinner size="sm" /> : <UserX size={16} color="#EF4444" />}
            <span className="font-semibold text-sm" style={{ color: '#EF4444' }}>Exclure de la communauté</span>
          </button>
          {isAdmin && (
            <button onClick={block} disabled={!!loading}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl"
              style={{ background: '#EF444410', border: '1px solid #EF444420' }}>
              {loading === 'block' ? <Spinner size="sm" /> : <Ban size={16} color="#EF4444" />}
              <span className="font-semibold text-sm" style={{ color: '#EF4444' }}>Bloquer définitivement</span>
            </button>
          )}
        </div>
        <div className="h-4" />
      </div>
      {ConfirmDialog}
    </>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function CommunityMembersPage() {
  const { id: slug } = useParams<{ id: string }>();
  const id           = decodeId(slug!);
  const navigate     = useNavigate();
  const { user: me } = useAuthStore();
  const mountedRef   = useRef(true);

  const [name,         setName]         = useState('');
  const [members,      setMembers]      = useState<Member[]>([]);
  const [myRole,       setMyRole]       = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [query,        setQuery]        = useState('');
  const [filter,       setFilter]       = useState<RoleFilter>('all');
  const [actionTarget, setActionTarget] = useState<Member | null>(null);

  const isAdmin   = myRole === 'admin';
  const isMod     = myRole === 'moderator';

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const [commRes, membRes] = await Promise.all([
        apiClient.get<any>(`/api/v1/communities/${id}`),
        apiClient.get<any>(`/api/v1/communities/${id}/members`),
      ]);
      if (!mountedRef.current) return;
      setName((commRes.data?.data ?? commRes.data)?.name ?? '');
      const list: Member[] = Array.isArray(membRes.data) ? membRes.data : membRes.data?.items ?? membRes.data?.data ?? [];
      setMembers(list);
      const mine = list.find(m => m.user_id === me?.id);
      setMyRole(mine?.role ?? null);
    } catch { /* silencieux */ }
    finally { if (mountedRef.current) { setLoading(false); setRefreshing(false); } }
  }, [id, me?.id]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  // Filtrage mémorisé
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter(m => {
      const matchRole  = filter === 'all' || m.role === filter;
      const matchQuery = !q ||
        (m.display_name ?? '').toLowerCase().includes(q) ||
        (m.username ?? '').toLowerCase().includes(q);
      return matchRole && matchQuery;
    });
  }, [members, filter, query]);

  // Compteurs par rôle mémorisés
  const counts = useMemo(() => ({
    all:       members.length,
    admin:     members.filter(m => m.role === 'admin').length,
    moderator: members.filter(m => m.role === 'moderator').length,
    member:    members.filter(m => m.role === 'member').length,
  }), [members]);

  // Podium : top 3 triés par GoGold décroissant
  const showPodium  = filter === 'all' && !query.trim();
  const sortedGoGold = useMemo(() =>
    [...members].sort((a, b) => (b.gogold ?? 0) - (a.gogold ?? 0)),
    [members]
  );
  const maxGoGold = sortedGoGold[0]?.gogold ?? 0;
  const top3     = showPodium && maxGoGold > 0 ? sortedGoGold.slice(0, 3) : [];
  const rest     = showPodium && top3.length === 3 ? visible.slice(3) : visible;

  function canActOn(m: Member) {
    if (m.user_id === me?.id) return false;
    if (isAdmin && m.role !== 'admin') return true;
    if (isMod   && m.role === 'member') return true;
    return false;
  }

  const FILTERS: { key: RoleFilter; label: string }[] = [
    { key: 'all',       label: `Tous (${counts.all})`             },
    { key: 'admin',     label: `Admins (${counts.admin})`         },
    { key: 'moderator', label: `Mods (${counts.moderator})`       },
    { key: 'member',    label: `Membres (${counts.member})`       },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl transition-all"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            Membres · {members.length}
          </p>
          {name && <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{name}</p>}
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="p-1.5 rounded-xl transition-all" style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Recherche + filtres */}
      <div className="px-4 py-3 shrink-0" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="relative mb-2">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher un membre…" className="input w-full pl-9 pr-9 text-sm" />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-tertiary)' }}>
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
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

      {loading ? (
        <PageLoader />
      ) : (
        <div className="flex-1 overflow-y-auto">

          {/* Podium top 3 (par GoGold) */}
          {top3.length === 3 && (
            <div className="px-4 pt-4 pb-2">
              <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>TOP MEMBRES</p>
              <div className="flex items-end justify-center gap-2">
                <PodiumBar member={top3[1]} rank={2} maxGoGold={maxGoGold} />
                <PodiumBar member={top3[0]} rank={1} maxGoGold={maxGoGold} />
                <PodiumBar member={top3[2]} rank={3} maxGoGold={maxGoGold} />
              </div>
            </div>
          )}

          {/* Liste */}
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-tertiary)' }}>Aucun membre trouvé</p>
            </div>
          ) : (
            <div className="mx-4 mt-3 mb-6 rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {rest.map((m, i) => {
                const cfg    = ROLE_CFG[m.role] ?? ROLE_CFG.member;
                const RIcon  = cfg.Icon;
                const isSelf = m.user_id === me?.id;
                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: i < rest.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <button
                      onClick={() => navigate(`/communities/${encodeId(id)}/members/${encodeId(m.user_id)}`)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left">
                      <Avatar src={m.avatar_url ?? null} name={m.display_name ?? m.username ?? '?'} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          {m.display_name ?? m.username}
                          {isSelf && <span className="ml-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>(toi)</span>}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>@{m.username}</p>
                      </div>
                    </button>
                    {(m.gogold ?? 0) > 0 && (
                      <p className="text-[10px] font-bold shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                        {(m.gogold ?? 0) >= 1000 ? `${((m.gogold ?? 0) / 1000).toFixed(1)}k` : m.gogold} GoGold
                      </p>
                    )}
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      <RIcon size={9} /> {cfg.label}
                    </span>
                    {canActOn(m) && (
                      <button onClick={() => setActionTarget(m)}
                        className="p-1.5 rounded-xl transition-all shrink-0"
                        style={{ color: 'var(--text-tertiary)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <ChevronDown size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {actionTarget && (
        <MemberActionsMenu
          member={actionTarget}
          isAdmin={isAdmin}
          isMod={isMod}
          communityId={String(id)}
          onDone={() => { setActionTarget(null); load(true); }}
          onClose={() => setActionTarget(null)}
        />
      )}
    </div>
  );
}
