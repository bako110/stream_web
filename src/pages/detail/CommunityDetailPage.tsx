import { PageLoader } from '../../components/ui/Spinner';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { encodeId, decodeId } from '../../utils/slugId';
import {
  Users, Send, ArrowLeft, Settings, Globe, Lock, Shield,
  Star, User, UserX, Check, UserPlus, Trash2,
  Search, X, ChevronRight, Info, MoreVertical, Pencil, Smile, Reply,
  Hash, Trophy, UserCheck, Pin, Image as ImageIcon, BarChart2,
  Calendar, MessageCircle, Megaphone, Film as FilmIcon, Vote,
  PinOff, UserMinus, Ban, Forward, Clock, Briefcase, DollarSign, Link,
} from 'lucide-react';
import type { Community } from '../../types';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { Avatar, VerifiedBadge } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';
import { WS_BASE_URL } from '../../utils/constants';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MsgReaction { emoji: string; count: number; user_ids: string[]; }
interface ReplyTo { id: string; sender_id: string; sender_display_name: string | null; sender_username: string | null; content: string | null; message_type: string; }

interface PollOption { id: string; text: string; votes: number; votes_count?: number; }
interface PollData {
  id?: string; poll_id?: string;           // backend retourne poll_id
  question: string;
  options: PollOption[];
  total_votes: number;
  allow_multiple: boolean;
  is_closed?: boolean; ended?: boolean;
  my_vote?: string[] | null; my_votes?: string[] | null;  // backend retourne my_votes
  ends_at?: string | null;
}

interface CommunityMessage {
  id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  media_urls?: string[];
  metadata?: Record<string, any> | null;
  sender_username?: string | null;
  sender_display_name?: string | null;
  sender_avatar_url?: string | null;
  is_pinned?: boolean;
  reactions?: MsgReaction[];
  reply_to?: ReplyTo | null;
  poll?: PollData | null;
  created_at: string;
  edited_at?: string | null;
}
interface CommunityMember {
  id: string; user_id: string; role: string;
  username?: string | null; display_name?: string | null; avatar_url?: string | null;
}

type ChatTab = 'discussion' | 'announcements' | 'media' | 'polls';
type SettingsTab = 'info' | 'members' | 'security';

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', moderator: 'Modérateur', member: 'Membre' };
const ROLE_COLORS: Record<string, string> = { admin: '#7B3FF2', moderator: '#7B3FF2', member: '#9390AB' };
const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '😍'];
const GRADIENTS = [
  ['#7B3FF2','#5B2EC4'],['#7B3FF2','#5B2EC4'],['#10B981','#7B3FF2'],
  ['#7B3FF2','#EF4444'],['#7B3FF2','#7B3FF2'],['#14B8A6','#7B3FF2'],
];
function gradientFor(name: string): [string, string] {
  return GRADIENTS[(name.charCodeAt(0) || 0) % GRADIENTS.length] as [string, string];
}
function fmtCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ── SettingsPanel ─────────────────────────────────────────────────────────────

function SettingsPanel({ community, myRole, onClose, onSaved }: {
  community: Community; myRole: string | null; onClose: () => void; onSaved: () => void;
}) {
  const [tab,            setTab]            = useState<SettingsTab>(myRole === 'admin' ? 'info' : 'members');
  const [editName,       setEditName]       = useState(community.name);
  const [editDesc,       setEditDesc]       = useState(community.description ?? '');
  const [editPrivate,           setEditPrivate]           = useState(community.is_private);
  const [editApproval,          setEditApproval]          = useState((community as any).requires_approval ?? false);
  const [editMembersOnly,       setEditMembersOnly]       = useState((community as any).members_only_chat ?? false);
  const [editEntryPrice,        setEditEntryPrice]        = useState(String((community as any).entry_price_coins ?? 0));
  const [editHideFromPublic,    setEditHideFromPublic]    = useState((community as any).members_list_hidden_public ?? false);
  const [editHideFromMembers,   setEditHideFromMembers]   = useState((community as any).members_list_hidden_members ?? false);
  const [editInviteOnlyAdmin,   setEditInviteOnlyAdmin]   = useState((community as any).invite_only_admin ?? false);
  const [saving,         setSaving]         = useState(false);
  const [members,        setMembers]        = useState<CommunityMember[]>([]);
  const [blockedMembers, setBlockedMembers] = useState<any[]>([]);
  const [memberSearch,   setMemberSearch]   = useState('');
  const [roleLoading,    setRoleLoading]    = useState<string | null>(null);
  const [blockLoading,   setBlockLoading]   = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const isAdmin = myRole === 'admin';
  const isMod   = myRole === 'moderator';
  const { user: me } = useAuthStore();

  useEffect(() => {
    if (tab !== 'members') return;
    setLoadingMembers(true);
    Promise.all([
      apiClient.get<any>(`/api/v1/communities/${community.id}/members`),
      isAdmin ? apiClient.get<any>(Endpoints.communities.blocked(community.id)).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    ]).then(([r, rb]) => {
      setMembers(Array.isArray(r.data) ? r.data : r.data?.items ?? r.data?.data ?? []);
      setBlockedMembers(Array.isArray(rb.data) ? rb.data : rb.data?.items ?? []);
    }).catch(() => {}).finally(() => setLoadingMembers(false));
  }, [tab, community.id]);

  async function saveInfo() {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await apiClient.patch(`/api/v1/communities/${community.id}`, { name: editName.trim(), description: editDesc.trim() || null });
      toast.success('Communauté mise à jour'); onSaved(); onClose();
    } catch { toast.error('Erreur lors de la sauvegarde'); } finally { setSaving(false); }
  }

  async function saveSecurity() {
    setSaving(true);
    try {
      await apiClient.patch(`/api/v1/communities/${community.id}`, {
        is_private: editPrivate,
        requires_approval: editApproval,
        members_only_chat: editMembersOnly,
        entry_price_coins: Number(editEntryPrice) || 0,
        members_list_hidden_public: editHideFromPublic,
        members_list_hidden_members: editHideFromMembers,
        invite_only_admin: editInviteOnlyAdmin,
      });
      toast.success('Paramètres mis à jour'); onSaved(); onClose();
    } catch { toast.error('Erreur'); } finally { setSaving(false); }
  }

  async function changeRole(userId: string, role: string) {
    setRoleLoading(userId);
    try {
      await apiClient.put(Endpoints.communities.memberRole(community.id, userId), { role });
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role } : m));
      toast.success('Rôle modifié');
    } catch { toast.error('Erreur'); } finally { setRoleLoading(null); }
  }

  async function kick(userId: string, name: string) {
    if (!confirm(`Exclure ${name} ?`)) return;
    try {
      await apiClient.delete(Endpoints.communities.member(community.id, userId));
      setMembers(prev => prev.filter(m => m.user_id !== userId));
      toast.success('Membre exclu');
    } catch { toast.error('Erreur'); }
  }

  async function blockMember(userId: string, name: string) {
    if (!confirm(`Bloquer ${name} de la communauté ?`)) return;
    setBlockLoading(userId);
    try {
      await apiClient.post(Endpoints.communities.block(community.id, userId));
      setMembers(prev => prev.filter(m => m.user_id !== userId));
      toast.success('Membre bloqué');
    } catch { toast.error('Erreur'); } finally { setBlockLoading(null); }
  }

  async function unblockMember(userId: string) {
    try {
      await apiClient.delete(Endpoints.communities.block(community.id, userId));
      setBlockedMembers(prev => prev.filter(m => m.user_id !== userId));
      toast.success('Membre débloqué');
    } catch { toast.error('Erreur'); }
  }

  async function deleteCommunity() {
    if (!confirm('Supprimer définitivement cette communauté ? Action irréversible.')) return;
    try { await apiClient.delete(`/api/v1/communities/${community.id}`); onClose(); onSaved(); } catch { toast.error('Erreur'); }
  }

  const filtered = memberSearch.trim()
    ? members.filter(m =>
        (m.display_name || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
        (m.username || '').toLowerCase().includes(memberSearch.toLowerCase()))
    : members;

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-lg flex flex-col rounded-2xl overflow-hidden pointer-events-auto"
          style={{ background: 'var(--surface)', maxHeight: '90vh', boxShadow: '0 24px 80px rgba(0,0,0,0.35)' }}>
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ color: 'var(--text-primary)' }}><X size={20} /></button>
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Gérer la communauté</p>
          {tab !== 'members' && isAdmin ? (
            <button onClick={tab === 'info' ? saveInfo : saveSecurity} disabled={saving}
              className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
              {saving ? <Spinner size="sm" /> : 'Enregistrer'}
            </button>
          ) : <div className="w-20" />}
        </div>
        <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          {(isAdmin ? ['info', 'members', 'security'] as SettingsTab[] : ['members'] as SettingsTab[]).map(t => {
            const labels: Record<string, string> = { info: 'Info', members: 'Membres', security: 'Sécurité' };
            const icons: Record<string, React.ReactNode> = { info: <Settings size={14} />, members: <Users size={14} />, security: <Shield size={14} /> };
            return (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold relative"
                style={{ color: tab === t ? 'var(--primary)' : 'var(--text-tertiary)' }}>
                {icons[t]} {labels[t]}
                {tab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--primary)' }} />}
              </button>
            );
          })}
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {tab === 'info' && (
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold tracking-widest mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>NOM</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} maxLength={60}
                  className="input w-full" placeholder="Nom de la communauté" />
              </div>
              <div>
                <label className="text-[10px] font-bold tracking-widest mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>DESCRIPTION</label>
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} maxLength={300} rows={4}
                  className="input w-full resize-none" placeholder="Description (optionnel)" />
                <p className="text-[10px] text-right mt-1" style={{ color: 'var(--text-tertiary)' }}>{editDesc.length}/300</p>
              </div>
            </div>
          )}
          {tab === 'members' && (
            <div>
              <div className="relative mx-4 mt-4 mb-2">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
                <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                  placeholder="Rechercher…" className="input w-full pl-9 pr-9 text-sm" />
                {memberSearch && <button onClick={() => setMemberSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }}>
                  <X size={13} /></button>}
              </div>
              <p className="px-4 py-1 text-[10px] font-bold tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                {filtered.length} MEMBRE{filtered.length !== 1 ? 'S' : ''}
              </p>
              {loadingMembers ? <PageLoader /> : filtered.map(member => {
                const isSelf    = member.user_id === me?.id;
                const isLoading = roleLoading === member.user_id || blockLoading === member.user_id;
                const roleColor = ROLE_COLORS[member.role] ?? '#9390AB';
                return (
                  <div key={member.id} className="flex items-start gap-3 px-4 py-3"
                    style={{ borderBottom: '1px solid var(--border)' }}>
                    <Avatar src={member.avatar_url} name={member.display_name ?? member.username ?? '?'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {member.display_name ?? member.username}{isSelf ? ' (toi)' : ''}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: roleColor }} />
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{ROLE_LABELS[member.role] ?? member.role}</p>
                      </div>
                    </div>
                    {isLoading ? <Spinner size="sm" /> : !isSelf && (isAdmin || (isMod && member.role === 'member')) ? (
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {isAdmin && member.role !== 'admin' && (
                          <button onClick={() => changeRole(member.user_id, 'admin')}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border"
                            style={{ background: '#7B3FF215', borderColor: '#7B3FF240', color: '#7B3FF2' }}>
                            <Shield size={10} /> Admin
                          </button>
                        )}
                        {isAdmin && member.role !== 'moderator' && (
                          <button onClick={() => changeRole(member.user_id, 'moderator')}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border"
                            style={{ background: '#7B3FF215', borderColor: '#7B3FF240', color: '#7B3FF2' }}>
                            <Star size={10} /> Mod
                          </button>
                        )}
                        {isAdmin && member.role !== 'member' && (
                          <button onClick={() => changeRole(member.user_id, 'member')}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border"
                            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
                            <User size={10} /> Membre
                          </button>
                        )}
                        <button onClick={() => kick(member.user_id, member.display_name ?? member.username ?? '')}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border"
                          style={{ background: '#EF444415', borderColor: '#EF444440', color: '#EF4444' }}>
                          <UserX size={10} /> Exclure
                        </button>
                        {isAdmin && (
                          <button onClick={() => blockMember(member.user_id, member.display_name ?? member.username ?? '')}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border"
                            style={{ background: '#EF444410', borderColor: '#EF444430', color: '#EF4444' }}>
                            <Ban size={10} /> Bloquer
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {/* Membres bloqués */}
              {isAdmin && blockedMembers.length > 0 && (
                <div className="mt-4">
                  <p className="px-4 py-1 text-[10px] font-bold tracking-widest" style={{ color: '#EF4444' }}>
                    MEMBRES BLOQUÉS ({blockedMembers.length})
                  </p>
                  {blockedMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                      <Avatar src={m.avatar_url} name={m.display_name ?? m.username ?? '?'} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{m.display_name ?? m.username}</p>
                        {m.reason && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{m.reason}</p>}
                      </div>
                      <button onClick={() => unblockMember(m.user_id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border"
                        style={{ background: '#7B3FF215', borderColor: '#7B3FF240', color: '#7B3FF2' }}>
                        Débloquer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === 'security' && (
            <div className="p-5 space-y-5 pb-8">

              {/* Visibilité */}
              <div>
                <p className="text-[10px] font-bold tracking-widest mb-2.5" style={{ color: 'var(--text-tertiary)' }}>VISIBILITÉ</p>
                <div className="flex gap-2">
                  {[
                    { val: false, icon: <Globe size={15} />, label: 'Publique', sub: 'Tout le monde peut rejoindre' },
                    { val: true,  icon: <Lock size={15} />,  label: 'Privée',   sub: 'Sur invitation uniquement' },
                  ].map(opt => (
                    <button key={String(opt.val)} onClick={() => setEditPrivate(opt.val)}
                      className="flex-1 flex flex-col items-center gap-1.5 p-3 rounded-2xl text-center transition-all"
                      style={{
                        background: editPrivate === opt.val ? '#7B3FF210' : 'var(--bg-secondary)',
                        border: `1.5px solid ${editPrivate === opt.val ? '#7B3FF2' : 'var(--border)'}`,
                      }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: editPrivate === opt.val ? '#7B3FF225' : 'var(--border)', color: editPrivate === opt.val ? '#7B3FF2' : 'var(--text-tertiary)' }}>
                        {opt.icon}
                      </div>
                      <p className="font-bold text-xs" style={{ color: editPrivate === opt.val ? '#7B3FF2' : 'var(--text-primary)' }}>{opt.label}</p>
                      <p className="text-[10px] leading-tight" style={{ color: 'var(--text-tertiary)' }}>{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Adhésion */}
              <div>
                <p className="text-[10px] font-bold tracking-widest mb-2.5" style={{ color: 'var(--text-tertiary)' }}>ADHÉSION</p>
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  {[
                    { label: 'Approbation requise', sub: 'Les demandes doivent être validées', val: editApproval, set: setEditApproval },
                    { label: 'Invitation admin uniquement', sub: 'Seul un admin peut inviter', val: editInviteOnlyAdmin, set: setEditInviteOnlyAdmin },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3"
                      style={{ borderBottom: i < 1 ? '1px solid var(--border)' : 'none', background: 'var(--surface)' }}>
                      <div className="flex-1 pr-4">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{row.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{row.sub}</p>
                      </div>
                      <button onClick={() => row.set((v: boolean) => !v)}
                        className="w-11 h-6 rounded-full relative transition-all shrink-0"
                        style={{ background: row.val ? '#7B3FF2' : 'var(--border)' }}>
                        <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm"
                          style={{ left: row.val ? 24 : 2 }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prix d'entrée */}
              <div>
                <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: 'var(--text-tertiary)' }}>PRIX D'ENTRÉE</p>
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: '#7B3FF215' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#7B3FF2' }}>C</span>
                  </div>
                  <input type="number" min="0" value={editEntryPrice} onChange={e => setEditEntryPrice(e.target.value)}
                    className="flex-1 bg-transparent text-sm font-semibold outline-none"
                    style={{ color: 'var(--text-primary)' }}
                    placeholder="0" />
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>coins · 0 = gratuit</span>
                </div>
              </div>

              {/* Chat */}
              <div>
                <p className="text-[10px] font-bold tracking-widest mb-2.5" style={{ color: 'var(--text-tertiary)' }}>CHAT</p>
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--surface)' }}>
                    <div className="flex-1 pr-4">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Chat membres uniquement</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Seuls les membres peuvent écrire</p>
                    </div>
                    <button onClick={() => setEditMembersOnly((v: boolean) => !v)}
                      className="w-11 h-6 rounded-full relative transition-all shrink-0"
                      style={{ background: editMembersOnly ? '#7B3FF2' : 'var(--border)' }}>
                      <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm"
                        style={{ left: editMembersOnly ? 24 : 2 }} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Liste membres */}
              <div>
                <p className="text-[10px] font-bold tracking-widest mb-2.5" style={{ color: 'var(--text-tertiary)' }}>LISTE DES MEMBRES</p>
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  {[
                    { label: 'Masquer aux non-membres', sub: 'Les visiteurs ne voient pas la liste', val: editHideFromPublic, set: setEditHideFromPublic },
                    { label: 'Masquer aux membres', sub: 'Seuls les admins voient tous les membres', val: editHideFromMembers, set: setEditHideFromMembers },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3"
                      style={{ borderBottom: i < 1 ? '1px solid var(--border)' : 'none', background: 'var(--surface)' }}>
                      <div className="flex-1 pr-4">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{row.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{row.sub}</p>
                      </div>
                      <button onClick={() => row.set((v: boolean) => !v)}
                        className="w-11 h-6 rounded-full relative transition-all shrink-0"
                        style={{ background: row.val ? '#7B3FF2' : 'var(--border)' }}>
                        <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm"
                          style={{ left: row.val ? 24 : 2 }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Zone de danger */}
              {isAdmin && (
                <div>
                  <p className="text-[10px] font-bold tracking-widest mb-2.5" style={{ color: '#EF4444' }}>ZONE DE DANGER</p>
                  <button onClick={deleteCommunity}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors"
                    style={{ background: '#EF444408', border: '1px solid #EF444425' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#EF444415'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#EF444408'; }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EF444420' }}>
                      <Trash2 size={15} color="#EF4444" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-sm" style={{ color: '#EF4444' }}>Supprimer la communauté</p>
                      <p className="text-xs mt-0.5" style={{ color: '#EF444480' }}>Action irréversible — tous les messages seront perdus</p>
                    </div>
                    <ChevronRight size={14} color="#EF444450" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  );
}

// ── PinnedDrawer ──────────────────────────────────────────────────────────────

function PinnedDrawer({ communityId, onClose, onJump }: {
  communityId: string; onClose: () => void; onJump: (id: string) => void;
}) {
  const [pins, setPins] = useState<CommunityMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<any>(Endpoints.communities.pinnedMessages(communityId))
      .then(r => setPins(Array.isArray(r.data) ? r.data : r.data?.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [communityId]);

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden flex flex-col"
        style={{ background: 'var(--surface)', maxHeight: '60vh' }}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Pin size={16} style={{ color: 'var(--primary)' }} />
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Messages épinglés</p>
          </div>
          <button onClick={onClose}><X size={18} style={{ color: 'var(--text-tertiary)' }} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? <PageLoader />
            : pins.length === 0
            ? <p className="text-center text-sm py-8" style={{ color: 'var(--text-tertiary)' }}>Aucun message épinglé</p>
            : pins.map(p => (
              <button key={p.id} onClick={() => { onJump(p.id); onClose(); }}
                className="w-full text-left p-3 rounded-xl transition-all"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <p className="text-xs font-bold mb-1" style={{ color: 'var(--primary)' }}>
                  {p.sender_display_name ?? p.sender_username}
                </p>
                <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{p.content}</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  {format(new Date(p.created_at), 'd MMM yyyy à HH:mm', { locale: fr })}
                </p>
              </button>
            ))}
        </div>
      </div>
    </>
  );
}

// ── PollCreateModal ───────────────────────────────────────────────────────────

function PollCreateModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (question: string, options: string[], allowMultiple: boolean) => void;
}) {
  const [question,      setQuestion]      = useState('');
  const [options,       setOptions]       = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [saving,        setSaving]        = useState(false);

  function addOption() {
    if (options.length < 6) setOptions(prev => [...prev, '']);
  }
  function removeOption(i: number) {
    if (options.length <= 2) return;
    setOptions(prev => prev.filter((_, idx) => idx !== i));
  }
  function setOption(i: number, val: string) {
    setOptions(prev => prev.map((o, idx) => idx === i ? val : o));
  }

  async function submit() {
    if (!question.trim()) { toast.error('Question requise'); return; }
    const filled = options.filter(o => o.trim());
    if (filled.length < 2) { toast.error('Au moins 2 options requises'); return; }
    setSaving(true);
    try {
      await onCreate(question.trim(), filled, allowMultiple);
    } finally { setSaving(false); }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-lg flex flex-col rounded-2xl overflow-hidden pointer-events-auto"
          style={{ background: 'var(--surface)', maxHeight: '90vh', boxShadow: '0 24px 80px rgba(0,0,0,0.35)' }}>
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ color: 'var(--text-primary)' }}><X size={20} /></button>
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Nouveau sondage</p>
          <button onClick={submit} disabled={saving} className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
            {saving ? <Spinner size="sm" /> : 'Créer'}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold tracking-widest mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>QUESTION</label>
            <textarea value={question} onChange={e => setQuestion(e.target.value)} maxLength={200} rows={2}
              className="input w-full resize-none" placeholder="Posez votre question…" />
          </div>
          <div>
            <label className="text-[10px] font-bold tracking-widest mb-2 block" style={{ color: 'var(--text-tertiary)' }}>
              OPTIONS ({options.length}/6)
            </label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={opt} onChange={e => setOption(i, e.target.value)} maxLength={80}
                    className="input flex-1 text-sm" placeholder={`Option ${i + 1}`} />
                  {options.length > 2 && (
                    <button onClick={() => removeOption(i)} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: '#EF444415', color: '#EF4444' }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 6 && (
              <button onClick={addOption}
                className="w-full mt-2 py-2 rounded-xl text-xs font-bold border transition-all"
                style={{ borderStyle: 'dashed', borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
                + Ajouter une option
              </button>
            )}
          </div>
          <div className="flex items-center justify-between p-3.5 rounded-2xl"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Choix multiple</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Permettre plusieurs réponses</p>
            </div>
            <button onClick={() => setAllowMultiple(v => !v)}
              className="w-12 h-6 rounded-full relative transition-all"
              style={{ background: allowMultiple ? 'var(--primary)' : 'var(--border)' }}>
              <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                style={{ left: allowMultiple ? 26 : 2 }} />
            </button>
          </div>
          <div className="h-4" />
        </div>
        </div>
      </div>
    </>
  );
}

// ── Vue non-membre (landing) ──────────────────────────────────────────────────

function CommunityLanding({ community, joinStatus, onJoined, onPendingUpdate, onCancelRequest }: {
  community: Community;
  joinStatus: 'none' | 'pending' | 'member';
  onJoined: () => void;
  onPendingUpdate: () => void;
  onCancelRequest: () => void;
}) {
  const [joining, setJoining] = useState(false);
  const [g1, g2] = gradientFor(community.name);
  const count    = community.members_count ?? (community as any).member_count ?? 0;

  async function handleJoin() {
    if (joining || joinStatus === 'pending') return;
    setJoining(true);
    try {
      const r = await apiClient.post<any>(Endpoints.communities.join(community.id));
      if (r.data?.pending || r.data?.approval_required) {
        onPendingUpdate();
        toast.success('Demande envoyée — en attente d\'approbation');
      } else if (r.data?.joined) {
        toast.success('Communauté rejointe !');
        onJoined();
      } else {
        // Certains backends retournent juste 200 sans champ joined
        onJoined();
      }
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? '';
      if (detail.toLowerCase().includes('déjà') || detail.toLowerCase().includes('already')) {
        onJoined();
      } else {
        toast.error(detail || 'Impossible de rejoindre la communauté');
      }
    } finally { setJoining(false); }
  }

  async function handleCancelRequest() {
    try {
      await apiClient.delete(Endpoints.communities.join(community.id));
      onCancelRequest();
      toast.success('Demande annulée');
    } catch { toast.error('Erreur lors de l\'annulation'); }
  }

  const entryPrice = (community as any).entry_price_coins ?? 0;
  const requiresApproval = (community as any).requires_approval ?? community.is_private;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero banner */}
      <div className="relative" style={{ height: 200 }}>
        {community.banner_url
          ? <img src={community.banner_url} className="w-full h-full object-cover" alt="" />
          : <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${g1}dd, ${g2}dd)` }} />
        }
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--bg) 0%, transparent 55%)' }} />
      </div>

      <div className="px-5 pb-8" style={{ marginTop: -56 }}>
        {/* Avatar + nom */}
        <div className="flex items-end gap-4 mb-4">
          {community.avatar_url
            ? <img src={community.avatar_url} className="w-20 h-20 rounded-2xl object-cover shrink-0"
                style={{ border: '4px solid var(--bg)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }} alt="" />
            : <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-white text-3xl shrink-0"
                style={{ background: `linear-gradient(135deg, ${g1}, ${g2})`, border: '4px solid var(--bg)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                {community.name[0]?.toUpperCase()}
              </div>
          }
          <div className="mb-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black leading-tight" style={{ color: 'var(--text-primary)' }}>{community.name}</h1>
              {community.is_verified && <VerifiedBadge size={20} />}
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: '#7B3FF215', color: '#7B3FF2' }}>
                {community.is_private ? <Lock size={9} /> : <Globe size={9} />}
                {community.is_private ? 'Privée' : 'Publique'}
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                <Users size={9} /> {fmtCount(count)} membres
              </span>
              {requiresApproval && (
                <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: '#F59E0B15', color: '#F59E0B' }}>
                  <Clock size={9} /> Approbation requise
                </span>
              )}
            </div>
          </div>
        </div>

        {community.description && (
          <p className="text-sm leading-relaxed mb-5 whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
            {community.description}
          </p>
        )}

        {/* Card accès membres */}
        <div className="rounded-2xl overflow-hidden mb-4"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <Lock size={13} style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-xs font-bold tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              CONTENU RÉSERVÉ AUX MEMBRES
            </p>
          </div>
          <div className="px-4 py-4 flex items-start gap-3">
            <MessageCircle size={18} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Messages & membres privés</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                {requiresApproval
                  ? 'Envoyez une demande — un admin l\'examinera avant de vous donner accès.'
                  : 'Rejoignez pour accéder aux conversations et voir les membres.'}
              </p>
            </div>
          </div>
          {entryPrice > 0 && (
            <div className="px-4 py-3 flex items-center gap-2"
              style={{ borderTop: '1px solid var(--border)', background: 'rgba(123,63,242,0.04)' }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: '#7B3FF220' }}>
                <span style={{ fontSize: 10, color: '#7B3FF2', fontWeight: 700 }}>C</span>
              </div>
              <p className="text-xs font-bold" style={{ color: '#7B3FF2' }}>
                {entryPrice} coins requis pour adhérer
              </p>
            </div>
          )}
        </div>

        {/* Bouton adhésion */}
        {joinStatus === 'pending' ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 p-4 rounded-2xl"
              style={{ background: 'rgba(123,63,242,0.08)', border: '1.5px solid rgba(123,63,242,0.25)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(123,63,242,0.15)' }}>
                <Clock size={16} style={{ color: '#7B3FF2' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm" style={{ color: '#7B3FF2' }}>Demande envoyée</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  En attente d'approbation par un administrateur
                </p>
              </div>
            </div>
            <button onClick={handleCancelRequest}
              className="w-full py-3 rounded-2xl font-semibold text-sm transition-colors"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#EF4444'; (e.currentTarget as HTMLElement).style.color = '#EF4444'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}>
              Annuler la demande
            </button>
          </div>
        ) : (
          <button onClick={handleJoin} disabled={joining}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-60 transition-opacity hover:opacity-90"
            style={{ background: `linear-gradient(90deg, ${g1}, ${g2})`, boxShadow: `0 4px 16px ${g1}55` }}>
            {joining
              ? <Spinner size="sm" />
              : requiresApproval
                ? <><UserPlus size={15} /> Demander à rejoindre</>
                : <><UserPlus size={15} /> Rejoindre la communauté</>
            }
          </button>
        )}
      </div>
    </div>
  );
}

// ── MessageBubble ─────────────────────────────────────────────────────────────

function MessageBubble({ msg, isMe, canManage, canBlock, onReact, onReply, onEdit, onDelete, onPin, onBlockSender, onVotePoll, onClosePoll, navigate }: {
  msg: CommunityMessage; isMe: boolean; canManage: boolean; canBlock: boolean;
  onReact: (id: string, emoji: string) => void;
  onReply: (msg: CommunityMessage) => void;
  onEdit: (msg: CommunityMessage) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pin: boolean) => void;
  onBlockSender: (msg: CommunityMessage) => void;
  onVotePoll: (msgId: string, optionId: string) => void;
  onClosePoll: (msgId: string) => void;
  navigate: (to: string) => void;
}) {
  const { user: me } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [editingText, setEditingText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const canDelete = isMe || canManage;

  function startEdit() { setEditingText(msg.content ?? ''); setIsEditing(true); setMenuOpen(false); }
  function submitEdit() { if (editingText.trim()) { onEdit({ ...msg, content: editingText.trim() }); } setIsEditing(false); }

  return (
    <div className={`flex gap-2 group ${isMe ? 'flex-row-reverse' : ''}`} id={`msg-${msg.id}`}>
      {!isMe && (
        <button className="mt-1 shrink-0" onClick={() => navigate(`/user/${encodeId(msg.sender_id)}`)}>
          <Avatar src={msg.sender_avatar_url} name={msg.sender_display_name ?? msg.sender_username ?? '?'} size="xs" />
        </button>
      )}
      <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && (
          <span className="text-[11px] font-semibold px-1" style={{ color: 'var(--primary)' }}>
            {msg.sender_display_name ?? msg.sender_username}
          </span>
        )}
        <div className={`flex items-end gap-1 ${isMe ? 'flex-row-reverse' : ''}`}>
          <div className="relative">
            {/* Mode édition */}
            {isEditing ? (
              <div className="flex gap-1.5 items-center">
                <input autoFocus value={editingText} onChange={e => setEditingText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); } if (e.key === 'Escape') setIsEditing(false); }}
                  className="input text-sm rounded-2xl px-3.5 py-2" style={{ minWidth: 160 }} />
                <button onClick={submitEdit} className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--primary)', color: '#fff' }}><Check size={13} /></button>
                <button onClick={() => setIsEditing(false)} className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}><X size={13} /></button>
              </div>
            ) : (
              <div className={`rounded-2xl text-sm overflow-hidden ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                style={isMe
                  ? { background: 'var(--primary)', color: '#fff' }
                  : { background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>

                {/* Indicateur épinglé */}
                {msg.is_pinned && (
                  <div className="flex items-center gap-1 px-3 pt-1.5 pb-0.5 opacity-70">
                    <Pin size={9} />
                    <span className="text-[9px] font-bold">Épinglé</span>
                  </div>
                )}

                {/* Preview reply */}
                {msg.reply_to && (
                  <div className="px-3 pt-2 pb-1.5"
                    style={{ borderBottom: `1px solid ${isMe ? 'rgba(255,255,255,0.2)' : 'var(--border)'}` }}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Reply size={10} style={{ opacity: 0.7 }} />
                      <span className="text-[10px] font-bold opacity-80">
                        {msg.reply_to.sender_display_name ?? msg.reply_to.sender_username}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-70 truncate max-w-[200px]">{msg.reply_to.content}</p>
                  </div>
                )}

                {/* Médias */}
                {(msg.media_urls ?? []).length > 0 && (
                  <div className={`grid gap-1 p-1.5 ${(msg.media_urls!).length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {msg.media_urls!.map((url, i) => (
                      <img key={i} src={url} alt="" className="rounded-lg object-cover w-full"
                        style={{ maxHeight: 200 }} />
                    ))}
                  </div>
                )}

                {/* Type annonce */}
                {msg.message_type === 'announcement' && (
                  <div className="flex items-center gap-1.5 px-3 pt-2 pb-0.5">
                    <Megaphone size={12} style={{ opacity: 0.8 }} />
                    <span className="text-[10px] font-bold opacity-80">Annonce</span>
                  </div>
                )}

                {/* Contenu texte */}
                {msg.content && (
                  <div className="px-3.5 py-2 whitespace-pre-line break-words">
                    {msg.content}
                    {msg.edited_at && <span className="text-[9px] ml-1.5 opacity-60">modifié</span>}
                  </div>
                )}

                {/* Sondage */}
                {msg.message_type === 'poll' && msg.poll && (
                  <div className="px-3 pb-3 pt-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <BarChart2 size={12} style={{ opacity: 0.8 }} />
                      <span className="text-[10px] font-bold opacity-80">Sondage</span>
                      {msg.poll.is_closed && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{ background: 'rgba(239,68,68,0.2)', color: '#EF4444' }}>Clôturé</span>
                      )}
                    </div>
                    <p className="text-sm font-bold mb-2.5" style={{ color: isMe ? '#fff' : 'var(--text-primary)' }}>
                      {msg.poll.question}
                    </p>
                    <div className="space-y-1.5">
                      {msg.poll.options.map(opt => {
                        const total = msg.poll!.total_votes || 0;
                        const pct   = total > 0 ? Math.round(((opt.votes ?? opt.votes_count ?? 0) / total) * 100) : 0;
                        const myVotes = msg.poll!.my_votes ?? msg.poll!.my_vote ?? [];
                        const voted = myVotes.includes(opt.id);
                        const isVoting = votingId === opt.id;
                        return (
                          <button key={opt.id}
                            disabled={!!(msg.poll!.is_closed || msg.poll!.ended) || !!(msg.poll!.my_votes ?? msg.poll!.my_vote)?.length || isVoting}
                            onClick={() => { setVotingId(opt.id); onVotePoll(msg.id, opt.id); setTimeout(() => setVotingId(null), 1000); }}
                            className="w-full text-left relative rounded-xl overflow-hidden transition-all"
                            style={{
                              background: isMe ? 'rgba(255,255,255,0.15)' : 'var(--bg-secondary)',
                              border: `1px solid ${voted ? (isMe ? 'rgba(255,255,255,0.5)' : 'var(--primary)') : 'transparent'}`,
                            }}>
                            <div className="absolute inset-0 rounded-xl transition-all"
                              style={{ width: `${pct}%`, background: isMe ? 'rgba(255,255,255,0.12)' : 'rgba(123,63,242,0.12)' }} />
                            <div className="relative flex items-center justify-between px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                {voted && <Check size={10} style={{ color: isMe ? '#fff' : 'var(--primary)', flexShrink: 0 }} />}
                                <span className="text-xs font-semibold" style={{ color: isMe ? '#fff' : 'var(--text-primary)' }}>
                                  {opt.text}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold ml-2 shrink-0" style={{ color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)' }}>
                                {pct}%
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px]" style={{ color: isMe ? 'rgba(255,255,255,0.6)' : 'var(--text-tertiary)' }}>
                        {msg.poll.total_votes} vote{msg.poll.total_votes !== 1 ? 's' : ''}
                        {msg.poll.allow_multiple && ' · choix multiple'}
                      </p>
                      {canManage && !msg.poll.is_closed && (
                        <button onClick={() => onClosePoll(msg.id)}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(123,63,242,0.15)', color: 'var(--primary)' }}>
                          Clôturer
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Réactions */}
            {(msg.reactions ?? []).filter(r => r.count > 0).length > 0 && (
              <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {(msg.reactions ?? []).filter(r => r.count > 0).map(r => {
                  const reacted = r.user_ids.includes(me?.id ?? '');
                  return (
                    <button key={r.emoji} onClick={() => onReact(msg.id, r.emoji)}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all"
                      style={{ background: reacted ? 'rgba(123,63,242,0.15)' : 'var(--bg-secondary)', border: `1px solid ${reacted ? 'rgba(123,63,242,0.4)' : 'var(--border)'}`, color: reacted ? 'var(--primary)' : 'var(--text-secondary)' }}>
                      {r.emoji} <span className="font-semibold">{r.count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Picker emoji */}
            {emojiOpen && (
              <div className={`absolute z-20 flex gap-1 p-1.5 rounded-2xl shadow-xl ${isMe ? 'right-0' : 'left-0'}`}
                style={{ bottom: '110%', background: 'var(--surface)', border: '1px solid var(--border)' }}
                onClick={e => e.stopPropagation()}>
                {QUICK_EMOJIS.map(em => (
                  <button key={em} onClick={() => { onReact(msg.id, em); setEmojiOpen(false); }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-lg transition-all hover:scale-125">
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions hover */}
          {!isEditing && (
            <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
              <button onClick={() => setEmojiOpen(v => !v)}
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                <Smile size={12} />
              </button>
              <button onClick={() => onReply(msg)}
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                <Reply size={12} />
              </button>
              <div className="relative">
                <button onClick={() => setMenuOpen(v => !v)}
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                  <MoreVertical size={12} />
                </button>
                {menuOpen && (
                  <div className={`absolute z-20 py-1 rounded-xl shadow-xl overflow-hidden ${isMe ? 'right-0' : 'left-0'}`}
                    style={{ bottom: '110%', minWidth: 160, background: 'var(--surface)', border: '1px solid var(--border)' }}
                    onClick={e => e.stopPropagation()}>
                    {isMe && (
                      <button onClick={startEdit}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <Pencil size={12} /> Modifier
                      </button>
                    )}
                    {canManage && (
                      <button onClick={() => { onPin(msg.id, !msg.is_pinned); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        {msg.is_pinned ? <PinOff size={12} /> : <Pin size={12} />}
                        {msg.is_pinned ? 'Désépingler' : 'Épingler'}
                      </button>
                    )}
                    {canBlock && !isMe && (
                      <button onClick={() => { onBlockSender(msg); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                        style={{ color: '#7B3FF2' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#7B3FF210')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <UserMinus size={12} /> Bloquer l'auteur
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => { onDelete(msg.id); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                        style={{ color: '#EF4444' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#EF444410')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <Trash2 size={12} /> Supprimer
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <span className="text-[10px] px-1" style={{ color: 'var(--text-tertiary)' }}>
          {formatDistanceToNow(new Date(msg.created_at), { locale: fr, addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

// ── CommunityChat ─────────────────────────────────────────────────────────────

function CommunityChat({ community, myRole, members, onRefresh }: {
  community: Community; myRole: string | null;
  members: CommunityMember[]; onRefresh: () => void;
}) {
  const navigate                       = useNavigate();
  const { user: me }                   = useAuthStore();
  const [messages,      setMessages]     = useState<CommunityMessage[]>([]);
  const [input,         setInput]        = useState('');
  const [showSettings,  setShowSettings] = useState(false);
  const [showInfo,      setShowInfo]     = useState(false);
  const [showPins,      setShowPins]     = useState(false);
  const [replyTo,       setReplyTo]      = useState<CommunityMessage | null>(null);
  const [tab,           setTab]          = useState<ChatTab>('discussion');
  const [uploading,     setUploading]    = useState(false);
  const [pendingCount,  setPendingCount] = useState(0);
  const [showPollModal, setShowPollModal]= useState(false);
  const [activeCotisation, setActiveCotisation] = useState<any>(null);
  const [activeElection,   setActiveElection]   = useState<any>(null);
  const wsRef       = useRef<WebSocket | null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);
  const msgRefs     = useRef<Record<string, HTMLDivElement | null>>({});
  const id = community.id;
  const [g1, g2] = gradientFor(community.name);
  const count    = community.members_count ?? (community as any).member_count ?? 0;
  const isAdmin   = myRole === 'admin';
  const canManage = myRole === 'admin' || myRole === 'moderator';

  const loadMessages = useCallback((msgType?: string) => {
    let url = Endpoints.communities.messages(id);
    if (msgType && msgType !== 'discussion') url += `?message_type=${msgType === 'announcements' ? 'announcement' : msgType === 'media' ? 'image,video' : msgType === 'polls' ? 'poll' : ''}`;
    apiClient.get<any>(url)
      .then(r => setMessages(Array.isArray(r.data) ? r.data : r.data?.items ?? r.data?.data ?? []))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    loadMessages(tab);
  }, [tab, loadMessages]);

  // Pending join requests count
  useEffect(() => {
    if (!canManage) return;
    apiClient.get<any>(Endpoints.communities.joinRequests(id))
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : r.data?.items ?? [];
        setPendingCount(list.length);
      })
      .catch(() => {});
  }, [id, canManage]);

  // WebSocket
  useEffect(() => {
    const token = useAuthStore.getState().accessToken ?? '';
    const ws = new WebSocket(`${WS_BASE_URL}/api/v1/communities/${id}/ws?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;
    ws.onmessage = e => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'community_message' || data.type === 'community_message_sent') {
          setMessages(prev => [...prev.slice(-99), data]);
        } else if (data.type === 'community_message_edited') {
          setMessages(prev => prev.map(m => m.id === data.id ? { ...m, content: data.content, edited_at: data.edited_at } : m));
        } else if (data.type === 'community_message_deleted') {
          setMessages(prev => prev.filter(m => m.id !== data.id));
        } else if (data.type === 'community_message_reaction') {
          setMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, reactions: data.reactions } : m));
        } else if (data.type === 'community_poll_created') {
          setMessages(prev => [...prev.slice(-99), data]);
        } else if (data.type === 'community_poll_updated') {
          setMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, poll: data.poll } : m));
        } else if (data.type === 'community_cotisation_created' || data.type === 'community_cotisation_updated') {
          if (data.status === 'active') setActiveCotisation(data);
        } else if (data.type === 'treasurer_election_launched' || data.type === 'treasurer_vote_cast') {
          setActiveElection(data.election ?? data);
        } else if (data.type === 'treasurer_elected') {
          setActiveElection(null);
        }
      } catch { }
    };
    return () => ws.close();
  }, [id]);

  // Cotisation active + élection active
  useEffect(() => {
    apiClient.get<any>(`/api/v1/communities/${id}/cotisations?status=active`)
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : r.data?.items ?? r.data?.data ?? [];
        setActiveCotisation(list[0] ?? null);
      }).catch(() => {});
    apiClient.get<any>(`/api/v1/communities/${id}/treasurer-elections/active`)
      .then(r => setActiveElection(r.data?.election ?? null))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    const content = input.trim();
    if (!content) return;
    setInput('');
    const payload: Record<string, unknown> = {
      content,
      message_type: tab === 'announcements' ? 'announcement' : 'text',
    };
    if (replyTo) { payload.reply_to_id = replyTo.id; setReplyTo(null); }
    try { await apiClient.post(Endpoints.communities.messages(id), payload); }
    catch (e: any) { toast.error(e?.response?.data?.detail ?? 'Erreur'); setInput(content); }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(async f => {
        const form = new FormData();
        form.append('file', f);
        const folder = f.type.startsWith('video') ? 'communities/videos' : 'communities/images';
        const r = await apiClient.post<{ url: string }>(
          f.type.startsWith('video') ? `/api/v1/upload/video?folder=${folder}` : `/api/v1/upload/images?folder=${folder}`,
          form, { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return r.data.url;
      }));
      await apiClient.post(Endpoints.communities.messages(id), {
        content: input.trim() || null,
        message_type: files[0].type.startsWith('video') ? 'video' : 'image',
        media_urls: urls,
        reply_to_id: replyTo?.id ?? null,
      });
      setInput(''); setReplyTo(null);
    } catch { toast.error('Erreur lors de l\'upload'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function handleEdit(msg: CommunityMessage) {
    try {
      await apiClient.put(Endpoints.communities.messageById(id, msg.id), { content: msg.content });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: msg.content, edited_at: new Date().toISOString() } : m));
    } catch { toast.error('Erreur'); }
  }

  async function handleDelete(msgId: string) {
    if (!confirm('Supprimer ce message ?')) return;
    try {
      await apiClient.delete(Endpoints.communities.messageById(id, msgId));
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch { toast.error('Erreur'); }
  }

  async function handlePin(msgId: string, pin: boolean) {
    try {
      if (pin) await apiClient.post(Endpoints.communities.pinMessage(id, msgId));
      else await apiClient.delete(Endpoints.communities.pinMessage(id, msgId));
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_pinned: pin } : m));
      toast.success(pin ? 'Message épinglé' : 'Message désépinglé');
    } catch { toast.error('Erreur'); }
  }

  async function handleReact(msgId: string, emoji: string) {
    try {
      await apiClient.post(Endpoints.communities.messageReact(id, msgId), { emoji });
      setMessages(prev => prev.map(m => {
        if (m.id !== msgId) return m;
        const reactions = [...(m.reactions ?? [])];
        const existing = reactions.find(r => r.emoji === emoji);
        const meId = me?.id ?? '';
        if (existing) {
          const already = existing.user_ids.includes(meId);
          if (already) { existing.count = Math.max(0, existing.count - 1); existing.user_ids = existing.user_ids.filter(u => u !== meId); }
          else { existing.count += 1; existing.user_ids = [...existing.user_ids, meId]; }
          return { ...m, reactions: reactions.filter(r => r.count > 0) };
        }
        return { ...m, reactions: [...reactions, { emoji, count: 1, user_ids: [meId] }] };
      }));
    } catch { }
  }

  async function handleBlockSender(msg: CommunityMessage) {
    if (!confirm(`Bloquer ${msg.sender_display_name ?? msg.sender_username} ?`)) return;
    try {
      await apiClient.post(Endpoints.communities.block(id, msg.sender_id));
      toast.success('Utilisateur bloqué');
    } catch { toast.error('Erreur'); }
  }

  async function handleVotePoll(msgId: string, optionId: string) {
    try {
      const msg = messages.find(m => m.id === msgId);
      if (!msg?.poll) return;
      const pollId = msg.poll.poll_id ?? msg.poll.id;
      await apiClient.post(`/api/v1/communities/${id}/polls/${pollId}/vote`, { option_ids: [optionId] });
      setMessages(prev => prev.map(m => {
        if (m.id !== msgId || !m.poll) return m;
        const options = m.poll.options.map(o =>
          o.id === optionId ? { ...o, votes: (o.votes ?? o.votes_count ?? 0) + 1 } : o
        );
        return { ...m, poll: { ...m.poll, total_votes: m.poll.total_votes + 1, my_votes: [optionId], options } };
      }));
    } catch (e: any) { toast.error(e?.response?.data?.detail ?? 'Erreur'); }
  }

  async function handleClosePoll(msgId: string) {
    if (!confirm('Clôturer ce sondage ?')) return;
    try {
      const msg = messages.find(m => m.id === msgId);
      if (!msg?.poll) return;
      const pollId = msg.poll.poll_id ?? msg.poll.id;
      await apiClient.post(`/api/v1/communities/${id}/polls/${pollId}/close`);
      setMessages(prev => prev.map(m =>
        m.id === msgId && m.poll ? { ...m, poll: { ...m.poll, is_closed: true } } : m
      ));
      toast.success('Sondage clôturé');
    } catch (e: any) { toast.error(e?.response?.data?.detail ?? 'Erreur'); }
  }

  async function handleCreatePoll(question: string, options: string[], allowMultiple: boolean) {
    try {
      await apiClient.post(`/api/v1/communities/${id}/polls`, {
        question, options, allow_multiple: allowMultiple,
      });
      setShowPollModal(false);
      toast.success('Sondage créé');
    } catch (e: any) { toast.error(e?.response?.data?.detail ?? 'Erreur'); }
  }

  async function handleLeave() {
    if (!confirm('Quitter cette communauté ?')) return;
    try { await apiClient.post(Endpoints.communities.leave(id)); onRefresh(); } catch { }
  }

  function jumpToMsg(msgId: string) {
    const el = msgRefs.current[msgId];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const TABS: { key: ChatTab; icon: React.FC<any>; label: string }[] = [
    { key: 'discussion',   icon: MessageCircle, label: 'Discussion' },
    { key: 'announcements',icon: Megaphone,     label: 'Annonces'  },
    { key: 'media',        icon: ImageIcon,     label: 'Médias'    },
    { key: 'polls',        icon: Vote,          label: 'Sondages'  },
  ];

  const canPost = tab !== 'announcements' || canManage;

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl shrink-0 transition-all"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <ArrowLeft size={20} />
        </button>
        <button onClick={() => setShowInfo(v => !v)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
          {community.avatar_url
            ? <img src={community.avatar_url} className="w-9 h-9 rounded-xl object-cover shrink-0" alt="" />
            : <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white shrink-0"
                style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
                {community.name[0]?.toUpperCase()}
              </div>
          }
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{community.name}</p>
              {community.is_verified && <VerifiedBadge size={13} />}
            </div>
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{fmtCount(count)} membres</p>
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          {canManage && (
            <button onClick={() => setShowPins(true)} className="p-1.5 rounded-xl transition-all" title="Épinglés"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <Pin size={18} />
            </button>
          )}
          <button onClick={() => navigate(`/communities/${encodeId(community.id)}/events`)} className="p-1.5 rounded-xl transition-all" title="Événements"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Calendar size={18} />
          </button>
          <button onClick={() => navigate(`/communities/${encodeId(community.id)}/channels`)} className="p-1.5 rounded-xl transition-all" title="Canaux"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Hash size={18} />
          </button>
          <button onClick={() => navigate(`/communities/${encodeId(community.id)}/leaderboard`)} className="p-1.5 rounded-xl transition-all" title="Classement"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Trophy size={18} />
          </button>
          {canManage && (
            <>
              <button onClick={() => navigate(`/communities/${encodeId(community.id)}/stats`)} className="p-1.5 rounded-xl transition-all" title="Statistiques"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <BarChart2 size={18} />
              </button>
              <button onClick={() => navigate(`/communities/${encodeId(community.id)}/treasury`)} className="p-1.5 rounded-xl transition-all" title="Trésorerie"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <Briefcase size={18} />
              </button>
              <button onClick={() => navigate(`/communities/${encodeId(community.id)}/invite`)} className="p-1.5 rounded-xl transition-all" title="Inviter"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <Link size={18} />
              </button>
              <div className="relative">
                <button onClick={() => navigate(`/communities/${encodeId(community.id)}/join-requests`)} className="p-1.5 rounded-xl transition-all" title="Demandes"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <UserCheck size={18} />
                </button>
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                    style={{ background: '#7B3FF2' }}>{pendingCount}</span>
                )}
              </div>
            </>
          )}
          <button onClick={() => navigate(`/communities/${encodeId(community.id)}/members`)} className="p-1.5 rounded-xl transition-all" title="Membres"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Users size={18} />
          </button>
          <button onClick={() => setShowInfo(v => !v)} className="p-1.5 rounded-xl transition-all"
            style={{ color: showInfo ? 'var(--primary)' : 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Info size={18} />
          </button>
          {canManage && (
            <button onClick={() => setShowSettings(true)} className="p-1.5 rounded-xl transition-all"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <Settings size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs Discussion / Annonces / Médias / Sondages */}
      <div className="flex shrink-0 overflow-x-auto scrollbar-hide"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold whitespace-nowrap relative shrink-0"
              style={{ color: tab === t.key ? 'var(--primary)' : 'var(--text-tertiary)' }}>
              <Icon size={13} /> {t.label}
              {tab === t.key && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--primary)' }} />}
            </button>
          );
        })}
      </div>

      {/* Panel info latéral */}
      {showInfo && (
        <div className="absolute inset-0 z-30 flex" style={{ top: 100 }}>
          <div className="flex-1" onClick={() => setShowInfo(false)} />
          <div className="w-72 h-full overflow-y-auto flex flex-col"
            style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' }}>
            <div className="relative" style={{ height: 100 }}>
              {community.banner_url
                ? <img src={community.banner_url} className="w-full h-full object-cover" alt="" />
                : <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }} />
              }
            </div>
            <div className="px-4 pt-3 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-black text-base" style={{ color: 'var(--text-primary)' }}>{community.name}</p>
                {community.is_verified && <VerifiedBadge size={15} />}
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
                {fmtCount(count)} membres · {community.is_private ? 'Privée' : 'Publique'}
              </p>
              {community.description && (
                <p className="text-sm leading-relaxed mb-4 whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{community.description}</p>
              )}
              <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: 'var(--text-tertiary)' }}>
                MEMBRES ({members.length})
              </p>
              {members.slice(0, 15).map(m => (
                <button key={m.id}
                  onClick={() => navigate(`/communities/${encodeId(community.id)}/members/${encodeId(m.user_id)}`)}
                  className="w-full flex items-center gap-2.5 py-2 px-1 text-left rounded-xl transition-all"
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Avatar src={m.avatar_url} name={m.display_name ?? m.username ?? '?'} size="xs" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {m.display_name ?? m.username}
                    </p>
                  </div>
                  {(m.role === 'admin' || m.role === 'moderator') && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: (ROLE_COLORS[m.role] ?? '#9390AB') + '22', color: ROLE_COLORS[m.role] ?? '#9390AB' }}>
                      {m.role === 'admin' ? 'ADM' : 'MOD'}
                    </span>
                  )}
                </button>
              ))}
              {/* Liens rapides */}
              <div className="mt-4 space-y-2">
                <button onClick={() => { setShowInfo(false); navigate(`/communities/${encodeId(community.id)}/events`); }}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl text-sm transition-all"
                  style={{ background: 'var(--bg-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}>
                  <Calendar size={15} style={{ color: 'var(--primary)' }} />
                  <span style={{ color: 'var(--text-primary)' }}>Événements</span>
                  <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--text-tertiary)' }} />
                </button>
                <button onClick={() => { setShowInfo(false); navigate(`/communities/${encodeId(community.id)}/leaderboard`); }}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl text-sm transition-all"
                  style={{ background: 'var(--bg-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}>
                  <Trophy size={15} style={{ color: '#7B3FF2' }} />
                  <span style={{ color: 'var(--text-primary)' }}>Classement</span>
                  <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--text-tertiary)' }} />
                </button>
                <button onClick={() => { setShowInfo(false); navigate(`/communities/${encodeId(community.id)}/treasury`); }}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl text-sm transition-all"
                  style={{ background: 'var(--bg-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}>
                  <Briefcase size={15} style={{ color: '#E0389A' }} />
                  <span style={{ color: 'var(--text-primary)' }}>Trésorerie</span>
                  <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--text-tertiary)' }} />
                </button>
                <button onClick={() => { setShowInfo(false); navigate(`/communities/${encodeId(community.id)}/fund`); }}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl text-sm transition-all"
                  style={{ background: 'var(--bg-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}>
                  <DollarSign size={15} style={{ color: '#10B981' }} />
                  <span style={{ color: 'var(--text-primary)' }}>Cotisations</span>
                  <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--text-tertiary)' }} />
                </button>
                {canManage && (
                  <button onClick={() => { setShowInfo(false); navigate(`/communities/${encodeId(community.id)}/treasurer`); }}
                    className="w-full flex items-center gap-2 p-2.5 rounded-xl text-sm transition-all"
                    style={{ background: 'var(--bg-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}>
                    <UserCheck size={15} style={{ color: '#7B3FF2' }} />
                    <span style={{ color: 'var(--text-primary)' }}>Trésorier & Retraits</span>
                    <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--text-tertiary)' }} />
                  </button>
                )}
                <button onClick={() => { setShowInfo(false); navigate(`/communities/${encodeId(community.id)}/members`); }}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl text-sm transition-all"
                  style={{ background: 'var(--bg-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}>
                  <Users size={15} style={{ color: '#3B82F6' }} />
                  <span style={{ color: 'var(--text-primary)' }}>Tous les membres</span>
                  <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--text-tertiary)' }} />
                </button>
                {canManage && (
                  <button onClick={() => { setShowInfo(false); navigate(`/communities/${encodeId(community.id)}/invite`); }}
                    className="w-full flex items-center gap-2 p-2.5 rounded-xl text-sm transition-all"
                    style={{ background: 'var(--bg-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}>
                    <Link size={15} style={{ color: '#F59E0B' }} />
                    <span style={{ color: 'var(--text-primary)' }}>Inviter des membres</span>
                    <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--text-tertiary)' }} />
                  </button>
                )}
              </div>
              <button onClick={handleLeave}
                className="w-full flex items-center justify-center gap-2 mt-4 py-3 rounded-xl text-sm font-bold transition-all"
                style={{ background: '#EF444412', color: '#EF4444', border: '1px solid #EF444430' }}>
                Quitter la communauté
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner cotisation active */}
      {activeCotisation && tab === 'discussion' && (
        <button
          onClick={() => navigate(`/communities/${encodeId(community.id)}/fund`)}
          className="mx-3 my-1 shrink-0 flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all"
          style={{ background: 'linear-gradient(90deg, #10B98115, #10B98108)', border: '1px solid #10B98130' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#10B98120' }}>
            <DollarSign size={14} color="#10B981" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: '#10B981' }}>Cotisation en cours</p>
            <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{activeCotisation.title}</p>
          </div>
          <div className="shrink-0">
            <div className="h-1.5 w-16 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, activeCotisation.progress_pct ?? 0)}%`, background: '#10B981' }} />
            </div>
            <p className="text-[10px] text-right mt-0.5" style={{ color: '#10B981' }}>{Math.round(activeCotisation.progress_pct ?? 0)}%</p>
          </div>
          <ChevronRight size={14} style={{ color: '#10B981', flexShrink: 0 }} />
        </button>
      )}

      {/* Banner élection active */}
      {activeElection && tab === 'discussion' && (
        <button
          onClick={() => navigate(`/communities/${encodeId(community.id)}/treasurer`)}
          className="mx-3 mb-1 shrink-0 flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all"
          style={{ background: 'linear-gradient(90deg, #7B3FF215, #7B3FF208)', border: '1px solid #7B3FF230' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#7B3FF220' }}>
            <Vote size={14} color="#7B3FF2" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold" style={{ color: '#7B3FF2' }}>Élection trésorier en cours</p>
            <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              {activeElection.total_votes ?? 0} vote{(activeElection.total_votes ?? 0) !== 1 ? 's' : ''} · {Math.round(activeElection.participation ?? 0)}% participation
            </p>
          </div>
          <ChevronRight size={14} style={{ color: '#7B3FF2', flexShrink: 0 }} />
        </button>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ background: 'var(--bg)' }}>
        {messages.length === 0 && !uploading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16 opacity-50">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
              <Users size={24} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-tertiary)' }}>
              {tab === 'discussion' ? 'Aucun message — démarrez la discussion !'
                : tab === 'announcements' ? 'Aucune annonce'
                : tab === 'media' ? 'Aucun média partagé'
                : 'Aucun sondage'}
            </p>
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === me?.id;
          return (
            <div key={msg.id} ref={el => { msgRefs.current[msg.id] = el; }}>
              <MessageBubble
                msg={msg}
                isMe={isMe}
                canManage={canManage}
                canBlock={isAdmin}
                onReact={handleReact}
                onReply={setReplyTo}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPin={handlePin}
                onBlockSender={handleBlockSender}
                onVotePoll={handleVotePoll}
                onClosePoll={handleClosePoll}
                navigate={navigate}
              />
            </div>
          );
        })}
        {uploading && (
          <div className="flex items-center gap-2 justify-center py-4">
            <Spinner size="sm" />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Envoi en cours…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {canPost && (
        <div className="shrink-0" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          {replyTo && (
            <div className="flex items-center gap-2 px-3 pt-2 pb-1" style={{ borderBottom: '1px solid var(--border)' }}>
              <Reply size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold" style={{ color: 'var(--primary)' }}>
                  {replyTo.sender_display_name ?? replyTo.sender_username}
                </p>
                <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>{replyTo.content}</p>
              </div>
              <button onClick={() => setReplyTo(null)} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
                <X size={14} />
              </button>
            </div>
          )}
          {tab === 'announcements' && canManage && (
            <div className="flex items-center gap-2 px-3 pt-2 pb-0">
              <Megaphone size={13} style={{ color: 'var(--primary)' }} />
              <span className="text-[10px] font-bold" style={{ color: 'var(--primary)' }}>Mode annonce</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-2">
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
              <ImageIcon size={16} />
            </button>
            {canManage && tab === 'discussion' && (
              <button onClick={() => setShowPollModal(true)}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
                title="Créer un sondage">
                <BarChart2 size={16} />
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={handleUpload} />
            <input ref={inputRef}
              className="input flex-1 text-sm rounded-full px-4 py-2.5"
              placeholder={tab === 'announcements' ? 'Écrire une annonce…' : 'Message…'}
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            />
            <button onClick={sendMessage} disabled={!input.trim() || uploading}
              className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40 transition-all shrink-0"
              style={{ background: input.trim() ? 'var(--primary)' : 'var(--bg-secondary)' }}>
              <Send size={16} style={{ color: input.trim() ? '#fff' : 'var(--text-tertiary)' }} />
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsPanel community={community} myRole={myRole}
          onClose={() => setShowSettings(false)} onSaved={onRefresh} />
      )}
      {showPins && (
        <PinnedDrawer communityId={id} onClose={() => setShowPins(false)} onJump={jumpToMsg} />
      )}
      {showPollModal && (
        <PollCreateModal onClose={() => setShowPollModal(false)} onCreate={handleCreatePoll} />
      )}
    </>
  );
}

// ── CommunityDetailPage ───────────────────────────────────────────────────────

export default function CommunityDetailPage() {
  const { id: slug }  = useParams<{ id: string }>();
  const id             = decodeId(slug!);
  const navigate       = useNavigate();
  const { user: me }   = useAuthStore();

  const { data: community, loading, refetch } = useApi<Community>(
    () => apiClient.get<Community>(Endpoints.communities.byId(id)), [id],
  );

  const [isMember,   setIsMember]   = useState<boolean | null>(null);
  const [joinStatus, setJoinStatus] = useState<'none' | 'pending' | 'member'>('none');
  const [myRole,     setMyRole]     = useState<string | null>(null);
  const [members,    setMembers]    = useState<CommunityMember[]>([]);

  const loadMeta = useCallback(async () => {
    if (!id) return;
    try {
      // Priorité 1 : join_status depuis l'endpoint communauté (comme le mobile)
      const commRes = await apiClient.get<any>(Endpoints.communities.byId(id));
      const c = commRes.data?.data ?? commRes.data;
      const js: 'none' | 'pending' | 'member' = c?.join_status ?? 'none';
      setJoinStatus(js);

      if (js === 'member') {
        setIsMember(true);
        // Charger le rôle depuis la liste des membres
        apiClient.get<any>(`/api/v1/communities/${id}/members`)
          .then(res => {
            const list: CommunityMember[] = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
            setMembers(list);
            const mine = list.find(m => m.user_id === me?.id);
            setMyRole(mine?.role ?? null);
          })
          .catch(() => {
            // Si /members est refusé, essayer /my-role
            apiClient.get<any>(Endpoints.communities.role(id))
              .then(r => setMyRole(r.data?.role ?? null))
              .catch(() => setMyRole('member'));
          });
      } else {
        setIsMember(false);
        setMyRole(null);
        setMembers([]);
      }
    } catch {
      // Fallback : tenter /members directement
      try {
        const res = await apiClient.get<any>(`/api/v1/communities/${id}/members`);
        const list: CommunityMember[] = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
        setMembers(list);
        const mine = list.find(m => m.user_id === me?.id);
        const member = !!mine;
        setIsMember(member);
        setJoinStatus(member ? 'member' : 'none');
        setMyRole(mine?.role ?? null);
      } catch {
        setIsMember(false);
        setJoinStatus('none');
        setMyRole(null);
      }
    }
  }, [id, me?.id]);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  function handleJoined() { refetch(); loadMeta(); }

  if (loading || isMember === null) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-3 py-2.5 shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl" style={{ color: 'var(--text-primary)' }}>
            <ArrowLeft size={20} />
          </button>
        </div>
        <PageLoader />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-3 py-2.5 shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl" style={{ color: 'var(--text-primary)' }}>
            <ArrowLeft size={20} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Communauté introuvable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {!isMember && (
        <div className="flex items-center gap-3 px-3 py-2.5 shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl transition-all"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <ArrowLeft size={20} />
          </button>
          <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{community.name}</p>
        </div>
      )}
      {isMember
        ? <CommunityChat community={community} myRole={myRole} members={members} onRefresh={() => { refetch(); loadMeta(); }} />
        : <CommunityLanding
            community={community}
            joinStatus={joinStatus}
            onJoined={handleJoined}
            onPendingUpdate={() => setJoinStatus('pending')}
            onCancelRequest={() => setJoinStatus('none')}
          />
      }
    </div>
  );
}
