import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users, Send, ArrowLeft, Settings, Globe, Lock, Shield,
  Star, User, UserX, BadgeCheck, Check, UserPlus, Trash2,
  Search, X, ChevronRight, Info, MoreVertical, Pencil, Smile, Reply, Forward,
} from 'lucide-react';
import type { Community } from '../../types';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';
import { WS_BASE_URL } from '../../utils/constants';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MsgReaction { emoji: string; count: number; user_ids: string[]; }
interface CommunityMessage {
  id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  media_urls?: string[];
  sender_username?: string | null;
  sender_display_name?: string | null;
  sender_avatar_url?: string | null;
  is_pinned?: boolean;
  reactions?: MsgReaction[];
  created_at: string;
  edited_at?: string | null;
}
interface CommunityMember {
  id: string; user_id: string; role: string;
  username?: string | null; display_name?: string | null; avatar_url?: string | null;
}

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', moderator: 'Modérateur', member: 'Membre' };
const ROLE_COLORS: Record<string, string> = { admin: '#36D9A0', moderator: '#3B82F6', member: '#9390AB' };

const GRADIENTS = [
  ['#7B3FF2','#E0389A'],['#0EA5E9','#6366F1'],['#10B981','#0EA5E9'],
  ['#F59E0B','#EF4444'],['#EC4899','#8B5CF6'],['#14B8A6','#3B82F6'],
];
function gradientFor(name: string): [string, string] {
  return GRADIENTS[(name.charCodeAt(0) || 0) % GRADIENTS.length] as [string, string];
}
function fmtCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

type SettingsTab = 'info' | 'members' | 'security';

// ── SettingsPanel ─────────────────────────────────────────────────────────────

function SettingsPanel({ community, myRole, onClose, onSaved }: {
  community: Community; myRole: string | null; onClose: () => void; onSaved: () => void;
}) {
  const [tab,            setTab]            = useState<SettingsTab>('info');
  const [editName,       setEditName]       = useState(community.name);
  const [editDesc,       setEditDesc]       = useState(community.description ?? '');
  const [editPrivate,    setEditPrivate]    = useState(community.is_private);
  const [saving,         setSaving]         = useState(false);
  const [members,        setMembers]        = useState<CommunityMember[]>([]);
  const [memberSearch,   setMemberSearch]   = useState('');
  const [roleLoading,    setRoleLoading]    = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const isAdmin = myRole === 'admin';
  const isMod   = myRole === 'moderator';
  const { user: me } = useAuthStore();

  useEffect(() => {
    if (tab !== 'members') return;
    setLoadingMembers(true);
    apiClient.get<any>(`/api/v1/communities/${community.id}/members`)
      .then(r => setMembers(Array.isArray(r.data) ? r.data : r.data?.items ?? r.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingMembers(false));
  }, [tab, community.id]);

  async function saveInfo() {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await apiClient.patch(`/api/v1/communities/${community.id}`, { name: editName.trim(), description: editDesc.trim() || null });
      onSaved(); onClose();
    } catch { } finally { setSaving(false); }
  }

  async function saveSecurity() {
    setSaving(true);
    try {
      await apiClient.patch(`/api/v1/communities/${community.id}`, { is_private: editPrivate });
      onSaved(); onClose();
    } catch { } finally { setSaving(false); }
  }

  async function changeRole(userId: string, role: string) {
    setRoleLoading(userId);
    try {
      await apiClient.put(`/api/v1/communities/${community.id}/members/${userId}/role`, { role });
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role } : m));
    } catch { } finally { setRoleLoading(null); }
  }

  async function kick(userId: string) {
    if (!confirm('Exclure ce membre ?')) return;
    try {
      await apiClient.delete(`/api/v1/communities/${community.id}/members/${userId}`);
      setMembers(prev => prev.filter(m => m.user_id !== userId));
    } catch { }
  }

  async function deleteCommunity() {
    if (!confirm('Supprimer définitivement cette communauté ? Action irréversible.')) return;
    try { await apiClient.delete(`/api/v1/communities/${community.id}`); onClose(); onSaved(); } catch { }
  }

  const filtered = memberSearch.trim()
    ? members.filter(m =>
        (m.display_name || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
        (m.username || '').toLowerCase().includes(memberSearch.toLowerCase()))
    : members;

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl overflow-hidden"
        style={{ background: 'var(--surface)', maxHeight: '92vh', boxShadow: '0 -16px 64px rgba(0,0,0,0.3)' }}>
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ color: 'var(--text-primary)' }}><X size={20} /></button>
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Gérer la communauté</p>
          {tab !== 'members' ? (
            <button onClick={tab === 'info' ? saveInfo : saveSecurity} disabled={saving}
              className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
              {saving ? <Spinner size="sm" /> : 'Enregistrer'}
            </button>
          ) : <div className="w-20" />}
        </div>
        <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          {(['info', 'members', 'security'] as SettingsTab[]).map(t => {
            const labels = { info: 'Info', members: 'Membres', security: 'Sécurité' };
            const icons  = { info: <Settings size={14} />, members: <Users size={14} />, security: <Shield size={14} /> };
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
              {loadingMembers ? <div className="flex justify-center py-8"><Spinner /></div> : filtered.map(member => {
                const isSelf    = member.user_id === me?.id;
                const isLoading = roleLoading === member.user_id;
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
                    {isLoading ? <Spinner size="sm" /> : isAdmin && !isSelf ? (
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {member.role !== 'admin' && (
                          <button onClick={() => changeRole(member.user_id, 'admin')}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border"
                            style={{ background: '#36D9A015', borderColor: '#36D9A040', color: '#36D9A0' }}>
                            <Shield size={10} /> Admin
                          </button>
                        )}
                        {member.role !== 'moderator' && (
                          <button onClick={() => changeRole(member.user_id, 'moderator')}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border"
                            style={{ background: '#3B82F615', borderColor: '#3B82F640', color: '#3B82F6' }}>
                            <Star size={10} /> Mod
                          </button>
                        )}
                        {member.role !== 'member' && (
                          <button onClick={() => changeRole(member.user_id, 'member')}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border"
                            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
                            <User size={10} /> Membre
                          </button>
                        )}
                        <button onClick={() => kick(member.user_id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border"
                          style={{ background: '#EF444415', borderColor: '#EF444440', color: '#EF4444' }}>
                          <UserX size={10} /> Exclure
                        </button>
                      </div>
                    ) : isMod && !isSelf && member.role === 'member' ? (
                      <button onClick={() => kick(member.user_id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border"
                        style={{ background: '#EF444415', borderColor: '#EF444440', color: '#EF4444' }}>
                        <UserX size={10} /> Exclure
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
          {tab === 'security' && (
            <div className="p-5 space-y-3">
              <p className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--text-tertiary)' }}>VISIBILITE</p>
              {[
                { val: false, icon: <Globe size={18} />, color: '#3B82F6', label: 'Publique', sub: 'Tout le monde peut rejoindre' },
                { val: true,  icon: <Lock size={18} />,  color: '#E0389A', label: 'Privée',   sub: 'Sur invitation uniquement' },
              ].map(opt => (
                <button key={String(opt.val)} onClick={() => setEditPrivate(opt.val)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left"
                  style={{ background: 'var(--bg-secondary)', border: `1.5px solid ${editPrivate === opt.val ? opt.color : 'var(--border)'}` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: opt.color + '20', color: opt.color }}>{opt.icon}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{opt.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{opt.sub}</p>
                  </div>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ border: `2px solid ${editPrivate === opt.val ? opt.color : 'var(--border)'}` }}>
                    {editPrivate === opt.val && <div className="w-2.5 h-2.5 rounded-full" style={{ background: opt.color }} />}
                  </div>
                </button>
              ))}
              <p className="text-[10px] font-bold tracking-widest pt-3" style={{ color: '#EF4444' }}>ZONE DE DANGER</p>
              <button onClick={deleteCommunity}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl"
                style={{ background: '#EF444410', border: '1px solid #EF444430' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EF444420' }}>
                  <Trash2 size={18} color="#EF4444" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm" style={{ color: '#EF4444' }}>Supprimer la communauté</p>
                  <p className="text-xs mt-0.5" style={{ color: '#EF444499' }}>Action irréversible</p>
                </div>
                <ChevronRight size={16} color="#EF444460" />
              </button>
              <div className="h-4" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Vue non-membre (landing) ──────────────────────────────────────────────────

function CommunityLanding({ community, onJoined }: { community: Community; onJoined: () => void }) {
  const [joining, setJoining] = useState(false);
  const [g1, g2] = gradientFor(community.name);
  const count    = community.members_count ?? community.member_count ?? 0;

  async function handleJoin() {
    setJoining(true);
    try {
      await apiClient.post(Endpoints.communities.join(community.id));
      onJoined();
    } catch { } finally { setJoining(false); }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Bannière */}
      <div className="relative" style={{ height: 160 }}>
        {community.banner_url
          ? <img src={community.banner_url} className="w-full h-full object-cover" alt="" />
          : <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }} />
        }
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />
        {/* Avatar flottant */}
        <div className="absolute" style={{ bottom: -32, left: '50%', transform: 'translateX(-50%)' }}>
          {community.avatar_url
            ? <img src={community.avatar_url} className="w-16 h-16 rounded-2xl object-cover"
                style={{ border: '4px solid var(--bg)' }} alt="" />
            : <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-white text-2xl"
                style={{ background: `linear-gradient(135deg, ${g1}, ${g2})`, border: '4px solid var(--bg)' }}>
                {community.name[0]?.toUpperCase()}
              </div>
          }
        </div>
      </div>

      {/* Infos */}
      <div className="flex flex-col items-center px-6 pt-12 pb-8 text-center">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{community.name}</h1>
          {community.is_verified && <BadgeCheck size={18} color="#1D9BF0" />}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: community.is_private ? '#E0389A20' : '#3B82F620', color: community.is_private ? '#E0389A' : '#3B82F6' }}>
            {community.is_private ? <Lock size={10} /> : <Globe size={10} />}
            {community.is_private ? 'Privée' : 'Publique'}
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
            <Users size={10} /> {fmtCount(count)} membres
          </span>
        </div>

        {community.description && (
          <p className="text-sm leading-relaxed mb-6 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
            {community.description}
          </p>
        )}

        {/* Bloc verrouillé */}
        <div className="w-full max-w-sm p-5 rounded-2xl mb-6 flex flex-col items-center gap-3"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-tertiary)' }}>
            <Lock size={20} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Contenu réservé aux membres</p>
          <p className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
            Rejoignez la communauté pour accéder aux messages et aux membres.
          </p>
        </div>

        <button onClick={handleJoin} disabled={joining}
          className="w-full max-w-sm flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-60 transition-all"
          style={{ background: `linear-gradient(90deg, ${g1}, ${g2})` }}>
          {joining ? <Spinner size="sm" /> : <><UserPlus size={16} /> Rejoindre la communauté</>}
        </button>
      </div>
    </div>
  );
}

// ── Vue membre (chat style WhatsApp) ─────────────────────────────────────────

function CommunityChat({ community, myRole, members, onRefresh }: {
  community: Community; myRole: string | null;
  members: CommunityMember[]; onRefresh: () => void;
}) {
  const navigate                       = useNavigate();
  const { user: me, accessToken }      = useAuthStore();
  const [messages,     setMessages]    = useState<CommunityMessage[]>([]);
  const [input,        setInput]       = useState('');
  const [showSettings, setShowSettings]= useState(false);
  const [showInfo,     setShowInfo]    = useState(false);
  const [menuMsgId,    setMenuMsgId]   = useState<string | null>(null);
  const [editingId,    setEditingId]   = useState<string | null>(null);
  const [editText,     setEditText]    = useState('');
  const [emojiMsgId,   setEmojiMsgId]  = useState<string | null>(null);
  const [replyTo,      setReplyTo]     = useState<CommunityMessage | null>(null);
  const [forwarding,   setForwarding]  = useState<CommunityMessage | null>(null);
  const wsRef     = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const id = community.id;
  const [g1, g2] = gradientFor(community.name);
  const count    = community.members_count ?? community.member_count ?? 0;
  const canManage = myRole === 'admin' || myRole === 'moderator';

  // Charge messages + WebSocket
  useEffect(() => {
    apiClient.get<any>(Endpoints.communities.messages(id))
      .then(r => setMessages(Array.isArray(r.data) ? r.data : r.data?.items ?? r.data?.data ?? []))
      .catch(() => {});

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
        }
      } catch { }
    };
    return () => ws.close();
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim()) return;
    const content = input.trim();
    setInput('');
    const payload: Record<string, unknown> = { content, message_type: 'text' };
    if (replyTo) { payload.reply_to_id = replyTo.id; setReplyTo(null); }
    try { await apiClient.post(Endpoints.communities.messages(id), payload); } catch { }
  }

  async function forwardMessage(msg: CommunityMessage) {
    setForwarding(null);
    if (!msg.content?.trim()) return;
    try {
      await apiClient.post(Endpoints.communities.messages(id), {
        content: msg.content,
        message_type: 'text',
      });
    } catch { }
  }

  async function editMessage(msgId: string, content: string) {
    if (!content.trim()) return;
    try {
      await apiClient.put(Endpoints.communities.messageById(id, msgId), { content: content.trim() });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: content.trim(), edited_at: new Date().toISOString() } : m));
    } catch { }
    setEditingId(null);
  }

  async function deleteMessage(msgId: string) {
    if (!confirm('Supprimer ce message ?')) return;
    try {
      await apiClient.delete(Endpoints.communities.messageById(id, msgId));
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch { }
    setMenuMsgId(null);
  }

  async function reactMessage(msgId: string, emoji: string) {
    setEmojiMsgId(null);
    try {
      await apiClient.post(Endpoints.communities.messageReact(id, msgId), { emoji });
      // Le WS va mettre à jour les réactions en temps réel
      // Optimistic local update en attendant
      setMessages(prev => prev.map(m => {
        if (m.id !== msgId) return m;
        const reactions = [...(m.reactions ?? [])];
        const existing = reactions.find(r => r.emoji === emoji);
        const meId = me?.id ?? '';
        if (existing) {
          const alreadyReacted = existing.user_ids.includes(meId);
          if (alreadyReacted) {
            existing.count = Math.max(0, existing.count - 1);
            existing.user_ids = existing.user_ids.filter(uid => uid !== meId);
          } else {
            existing.count += 1;
            existing.user_ids = [...existing.user_ids, meId];
          }
          return { ...m, reactions: reactions.filter(r => r.count > 0) };
        }
        return { ...m, reactions: [...reactions, { emoji, count: 1, user_ids: [meId] }] };
      }));
    } catch { }
  }

  async function handleLeave() {
    if (!confirm('Quitter cette communauté ?')) return;
    try { await apiClient.post(Endpoints.communities.leave(id)); onRefresh(); } catch { }
  }

  return (
    <>
      {/* Header style WhatsApp */}
      <div className="flex items-center gap-3 px-3 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl shrink-0 transition-all"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <ArrowLeft size={20} />
        </button>

        {/* Avatar + nom cliquable → info panel */}
        <button onClick={() => setShowInfo(v => !v)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
          {community.avatar_url
            ? <img src={community.avatar_url} className="w-9 h-9 rounded-xl object-cover shrink-0" alt="" />
            : <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white shrink-0"
                style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
                {community.name[0]?.toUpperCase()}
              </div>
          }
          <div className="min-w-0">
            <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{community.name}</p>
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{fmtCount(count)} membres</p>
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
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

      {/* Panel info latéral (slide depuis la droite) */}
      {showInfo && (
        <div className="absolute inset-0 z-30 flex" style={{ top: 57 }}>
          <div className="flex-1" onClick={() => setShowInfo(false)} />
          <div className="w-72 h-full overflow-y-auto flex flex-col"
            style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' }}>
            {/* Header info */}
            <div className="relative" style={{ height: 100 }}>
              {community.banner_url
                ? <img src={community.banner_url} className="w-full h-full object-cover" alt="" />
                : <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }} />
              }
            </div>
            <div className="px-4 pt-3 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-black text-base" style={{ color: 'var(--text-primary)' }}>{community.name}</p>
                {community.is_verified && <BadgeCheck size={15} color="#1D9BF0" />}
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
                {fmtCount(count)} membres · {community.is_private ? 'Privée' : 'Publique'}
              </p>
              {community.description && (
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{community.description}</p>
              )}

              {/* Membres */}
              <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: 'var(--text-tertiary)' }}>
                MEMBRES ({members.length})
              </p>
              {members.slice(0, 10).map(m => (
                <button key={m.id}
                  onClick={() => navigate(`/users/${m.user_id}`)}
                  className="w-full flex items-center gap-2.5 py-2 text-left transition-all"
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

              {/* Quitter */}
              <button onClick={handleLeave}
                className="w-full flex items-center justify-center gap-2 mt-4 py-3 rounded-xl text-sm font-bold transition-all"
                style={{ background: '#EF444412', color: '#EF4444', border: '1px solid #EF444430' }}>
                Quitter la communauté
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages — zone scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
        style={{ background: 'var(--bg)' }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16 opacity-50">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-secondary)' }}>
              <Users size={24} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-tertiary)' }}>
              Aucun message — démarrez la discussion !
            </p>
          </div>
        )}
        {messages.map(msg => {
          const isMe         = msg.sender_id === me?.id;
          const canDelete    = isMe || canManage;
          const authorName   = msg.sender_display_name ?? msg.sender_username ?? 'Utilisateur';
          const isEditing    = editingId === msg.id;
          const menuOpen     = menuMsgId === msg.id;
          const emojiOpen    = emojiMsgId === msg.id;
          const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

          return (
            <div key={msg.id} className={`flex gap-2 group ${isMe ? 'flex-row-reverse' : ''}`}
              onClick={() => { setMenuMsgId(null); setEmojiMsgId(null); }}>
              {!isMe && (
                <Avatar src={msg.sender_avatar_url} name={authorName} size="xs"
                  className="mt-1 shrink-0 cursor-pointer"
                  onClick={e => { e.stopPropagation(); navigate(`/users/${msg.sender_id}`); }} />
              )}
              <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && (
                  <span className="text-[11px] font-semibold px-1" style={{ color: 'var(--primary)' }}>{authorName}</span>
                )}

                {/* Bulle + actions inline */}
                <div className={`flex items-end gap-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <div className="relative">

                    {/* Mode édition */}
                    {isEditing ? (
                      <div className="flex gap-1.5 items-center">
                        <input autoFocus value={editText} onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editMessage(msg.id, editText); }
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="input text-sm rounded-2xl px-3.5 py-2" style={{ minWidth: 160 }} />
                        <button onClick={() => editMessage(msg.id, editText)}
                          className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ background: 'var(--primary)', color: '#fff' }}>
                          <Check size={13} />
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className={`rounded-2xl text-sm overflow-hidden ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                        style={isMe
                          ? { background: 'var(--primary)', color: '#fff' }
                          : { background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
                        }>
                        {/* Preview reply */}
                        {(msg as any).reply_to && (
                          <div className="px-3 pt-2 pb-1.5"
                            style={{ borderBottom: `1px solid ${isMe ? 'rgba(255,255,255,0.2)' : 'var(--border)'}` }}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <Reply size={10} style={{ opacity: 0.7 }} />
                              <span className="text-[10px] font-bold opacity-80">
                                {(msg as any).reply_to.sender_display_name ?? (msg as any).reply_to.sender_username ?? 'Utilisateur'}
                              </span>
                            </div>
                            <p className="text-[11px] opacity-70 truncate max-w-[200px]">
                              {(msg as any).reply_to.content}
                            </p>
                          </div>
                        )}
                        {/* Contenu */}
                        <div className="px-3.5 py-2">
                          {msg.content}
                          {msg.edited_at && <span className="text-[9px] ml-1.5 opacity-60">modifié</span>}
                        </div>
                      </div>
                    )}

                    {/* Réactions */}
                    {(msg.reactions ?? []).filter(r => r.count > 0).length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {(msg.reactions ?? []).filter(r => r.count > 0).map(r => {
                          const reacted = r.user_ids.includes(me?.id ?? '');
                          return (
                            <button key={r.emoji} onClick={e => { e.stopPropagation(); reactMessage(msg.id, r.emoji); }}
                              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all"
                              style={{
                                background: reacted ? 'var(--primary)20' : 'var(--bg-secondary)',
                                border: `1px solid ${reacted ? 'var(--primary)50' : 'var(--border)'}`,
                                color: reacted ? 'var(--primary)' : 'var(--text-secondary)',
                              }}>
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
                          <button key={em} onClick={() => reactMessage(msg.id, em)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-lg transition-all hover:scale-125">
                            {em}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Boutons actions au hover */}
                  {!isEditing && (
                    <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <button onClick={e => { e.stopPropagation(); setEmojiMsgId(emojiOpen ? null : msg.id); setMenuMsgId(null); }}
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                        <Smile size={12} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setReplyTo(msg); setMenuMsgId(null); setEmojiMsgId(null); inputRef.current?.focus(); }}
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                        <Reply size={12} />
                      </button>
                      <div className="relative">
                        <button onClick={e => { e.stopPropagation(); setMenuMsgId(menuOpen ? null : msg.id); setEmojiMsgId(null); }}
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                          <MoreVertical size={12} />
                        </button>
                        {menuOpen && (
                          <div className={`absolute z-20 py-1 rounded-xl shadow-xl overflow-hidden ${isMe ? 'right-0' : 'left-0'}`}
                            style={{ bottom: '110%', minWidth: 150, background: 'var(--surface)', border: '1px solid var(--border)' }}
                            onClick={e => e.stopPropagation()}>
                            {/* Transférer */}
                            <button onClick={() => { setForwarding(msg); setMenuMsgId(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                              style={{ color: 'var(--text-primary)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              <Forward size={12} /> Transférer
                            </button>
                            {/* Modifier (seulement ses msgs) */}
                            {isMe && (
                              <button onClick={() => { setEditingId(msg.id); setEditText(msg.content ?? ''); setMenuMsgId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                                style={{ color: 'var(--text-primary)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                <Pencil size={12} /> Modifier
                              </button>
                            )}
                            {/* Supprimer */}
                            {canDelete && (
                              <button onClick={() => deleteMessage(msg.id)}
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
        })}
        <div ref={bottomRef} />
      </div>

      {/* Zone input : preview reply/forward + champ texte */}
      <div className="shrink-0" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>

        {/* Bandeau reply */}
        {replyTo && (
          <div className="flex items-center gap-2 px-3 pt-2 pb-1"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <Reply size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold" style={{ color: 'var(--primary)' }}>
                {replyTo.sender_display_name ?? replyTo.sender_username ?? 'Utilisateur'}
              </p>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>{replyTo.content}</p>
            </div>
            <button onClick={() => setReplyTo(null)} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Bandeau forward */}
        {forwarding && (
          <div className="flex items-center gap-2 px-3 pt-2 pb-1"
            style={{ borderBottom: '1px solid var(--border)', background: '#3B82F608' }}>
            <Forward size={13} style={{ color: '#3B82F6', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold" style={{ color: '#3B82F6' }}>Transférer le message</p>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>{forwarding.content}</p>
            </div>
            <button onClick={() => forwardMessage(forwarding)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
              style={{ background: '#3B82F6', flexShrink: 0 }}>
              <Send size={11} /> Envoyer
            </button>
            <button onClick={() => setForwarding(null)} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 px-3 py-2">
          <input ref={inputRef}
            className="input flex-1 text-sm rounded-full px-4 py-2.5"
            placeholder="Message…"
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
          <button onClick={sendMessage} disabled={!input.trim()}
            className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40 transition-all shrink-0"
            style={{ background: input.trim() ? 'var(--primary)' : 'var(--bg-secondary)' }}>
            <Send size={16} style={{ color: input.trim() ? '#fff' : 'var(--text-tertiary)' }} />
          </button>
        </div>
      </div>

      {showSettings && (
        <SettingsPanel community={community} myRole={myRole}
          onClose={() => setShowSettings(false)}
          onSaved={onRefresh} />
      )}
    </>
  );
}

// ── CommunityDetailPage ───────────────────────────────────────────────────────

export default function CommunityDetailPage() {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const { user: me } = useAuthStore();

  const { data: community, loading, refetch } = useApi<Community>(
    () => apiClient.get<Community>(Endpoints.communities.byId(id!)), [id],
  );

  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [myRole,   setMyRole]   = useState<string | null>(null);
  const [members,  setMembers]  = useState<CommunityMember[]>([]);

  const loadMeta = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiClient.get<any>(`/api/v1/communities/${id}/members`);
      const list: CommunityMember[] = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
      setMembers(list);
      const mine = list.find(m => m.user_id === me?.id);
      setIsMember(!!mine);
      setMyRole(mine?.role ?? null);
    } catch {
      // Si 403 → pas membre
      setIsMember(false);
      setMyRole(null);
    }
  }, [id, me?.id]);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  function handleJoined() {
    refetch();
    loadMeta();
  }

  if (loading || isMember === null) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-3 py-2.5 shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl" style={{ color: 'var(--text-primary)' }}>
            <ArrowLeft size={20} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
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
      {/* Header retour pour non-membres */}
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
        : <CommunityLanding community={community} onJoined={handleJoined} />
      }
    </div>
  );
}
