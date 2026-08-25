import { PageLoader } from '../../components/ui/Spinner';
import { useState, useEffect, useRef } from 'react';
import { useConfirm } from '../../components/ui/Dialog';
import { useParams, useNavigate } from 'react-router-dom';
import { decodeId } from '../../utils/slugId';
import {
  ArrowLeft, Hash, Megaphone, Plus, Send, Settings, Lock, Globe,
  Trash2, X, Check, Users, Pencil, Mic, Zap, Music, BookOpen, Star,
  Award, Film, Target, Wrench, Rss, Camera, Heart, MessageCircle, Key,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../api';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';
import { WS_BASE_URL } from '../../utils/constants';
import { openAuthenticatedWs } from '../../utils/authenticatedWs';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { extractApiErrorMessage } from '../../utils/apiError';

interface Channel {
  id: string;
  name: string;
  type: 'announcement' | 'chat' | 'voice' | string;
  description?: string | null;
  emoji?: string | null;
  avatar_url?: string | null;
  is_private?: boolean;
  has_password?: boolean;
  members_count?: number;
  last_message?: { content: string | null; created_at: string; sender_display_name?: string | null } | null;
}

interface ChannelMessage {
  id: string;
  sender_id: string;
  content: string | null;
  sender_username?: string | null;
  sender_display_name?: string | null;
  sender_avatar_url?: string | null;
  created_at: string;
}

interface CommunityMeta {
  id: string;
  name: string;
  avatar_url?: string | null;
}

function CreateChannelModal({ communityId, onClose, onCreated }: {
  communityId: string; onClose: () => void; onCreated: () => void;
}) {
  const [name,    setName]    = useState('');
  const [type,    setType]    = useState<'chat' | 'announcement'>('chat');
  const [saving,  setSaving]  = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await apiClient.post(`/api/v1/communities/${communityId}/channels`, {
        name: name.trim(), type,
      });
      onCreated();
      onClose();
    } catch { } finally { setSaving(false); }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 rounded-3xl overflow-hidden max-w-sm mx-auto"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Nouveau channel</p>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)' }}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold tracking-widest block mb-1.5" style={{ color: 'var(--text-tertiary)' }}>NOM</label>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={40}
              placeholder="general, annonces, musique…"
              className="input w-full" autoFocus />
          </div>
          <div>
            <label className="text-[10px] font-bold tracking-widest block mb-2" style={{ color: 'var(--text-tertiary)' }}>TYPE</label>
            <div className="space-y-2">
              {[
                { val: 'chat', icon: <Hash size={16} />, label: 'Chat', sub: 'Discussion libre entre membres', color: '#7B3FF2' },
                { val: 'announcement', icon: <Megaphone size={16} />, label: 'Annonces', sub: 'Seuls les admins peuvent poster', color: '#7B3FF2' },
              ].map(opt => (
                <button key={opt.val} onClick={() => setType(opt.val as any)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
                  style={{ background: 'var(--bg-secondary)', border: `1.5px solid ${type === opt.val ? opt.color : 'var(--border)'}` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: opt.color + '20', color: opt.color }}>{opt.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{opt.label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{opt.sub}</p>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={{ borderColor: type === opt.val ? opt.color : 'var(--border)' }}>
                    {type === opt.val && <div className="w-2.5 h-2.5 rounded-full" style={{ background: opt.color }} />}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <button onClick={submit} disabled={!name.trim() || saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
            style={{ background: 'var(--primary)' }}>
            {saving ? <Spinner size="sm" /> : <><Check size={16} /> Créer le channel</>}
          </button>
        </div>
      </div>
    </>
  );
}

function ChannelChat({ communityId, channel, myRole, onBack, onChannelUpdated }: {
  communityId: string; channel: Channel; myRole: string | null;
  onBack: () => void; onChannelUpdated: () => void;
}) {
  const { user: me } = useAuthStore();
  const [messages,     setMessages]     = useState<ChannelMessage[]>([]);
  const [input,        setInput]        = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const { confirm: confirmDialog, ConfirmDialog } = useConfirm();
  const wsRef      = useRef<WebSocket | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const canManage  = myRole === 'admin' || myRole === 'moderator';
  const canPost    = channel.type !== 'announcement' || canManage;

  useEffect(() => {
    apiClient.get<any>(`/api/v1/communities/${communityId}/channels/${channel.id}/messages`)
      .then(r => setMessages(Array.isArray(r.data) ? r.data : r.data?.items ?? r.data?.data ?? []))
      .catch(() => {});

    // Pas de WS dédié par canal côté backend — les messages de canal sont
    // diffusés sur le WS de communauté (communities.py::send_channel_message,
    // community_manager.broadcast) avec channel_id dans le payload, même
    // pattern que CommunityDetailPage.tsx (chat général). Filtrer ici plutôt
    // que de se connecter à .../channels/{id}/ws, qui n'a jamais existé côté
    // serveur (403 systématique, signalé en prod).
    const token = useAuthStore.getState().accessToken ?? '';
    const ws = openAuthenticatedWs(
      `${WS_BASE_URL}/api/v1/communities/${communityId}/ws`, token
    );
    wsRef.current = ws;
    ws.onmessage = e => {
      try {
        const data = JSON.parse(e.data);
        if (data.channel_id !== channel.id) return;
        if (data.type === 'community_message' || data.type === 'community_message_sent') {
          setMessages(prev => [...prev.slice(-99), data]);
        } else if (data.type === 'community_message_deleted') {
          setMessages(prev => prev.filter(m => m.id !== data.id));
        }
      } catch { }
    };
    return () => ws.close();
  }, [communityId, channel.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || !canPost) return;
    const content = input.trim();
    setInput('');
    try {
      await apiClient.post(`/api/v1/communities/${communityId}/channels/${channel.id}/messages`, {
        content, message_type: 'text',
      });
    } catch { }
  }

  async function deleteMessage(msgId: string) {
    const ok = await confirmDialog({ title: 'Supprimer ce message ?', danger: true, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try {
      await apiClient.delete(`/api/v1/communities/${communityId}/channels/${channel.id}/messages/${msgId}`);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch { }
  }

  const typeColor = channel.type === 'announcement' ? '#7B3FF2' : '#7B3FF2';
  const TypeIcon  = channel.type === 'announcement' ? Megaphone : Hash;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={onBack} className="p-1.5 rounded-xl" style={{ color: 'var(--text-primary)' }}>
          <ArrowLeft size={20} />
        </button>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: typeColor + '20', color: typeColor }}>
          <TypeIcon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>#{channel.name}</p>
          {channel.type === 'announcement' && (
            <p className="text-[10px]" style={{ color: '#7B3FF2' }}>Annonces · Lecture seule pour les membres</p>
          )}
        </div>
        {canManage && (
          <button onClick={() => setShowSettings(true)} className="p-1.5 rounded-xl transition-all shrink-0"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Settings size={18} />
          </button>
        )}
      </div>
      {showSettings && (
        <ChannelSettingsModal
          channel={channel} communityId={communityId}
          onClose={() => setShowSettings(false)}
          onSaved={() => { setShowSettings(false); onChannelUpdated(); }}
          onDeleted={() => { setShowSettings(false); onChannelUpdated(); onBack(); }}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ background: 'var(--bg)' }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16 opacity-50">
            <TypeIcon size={32} style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-tertiary)' }}>
              Aucun message dans #{channel.name}
            </p>
          </div>
        )}
        {messages.map(msg => {
          const isMe      = msg.sender_id === me?.id;
          const authorName = msg.sender_display_name ?? msg.sender_username ?? 'Utilisateur';
          return (
            <div key={msg.id} className={`flex gap-2 group ${isMe ? 'flex-row-reverse' : ''}`}>
              {!isMe && <Avatar src={msg.sender_avatar_url} name={authorName} size="xs" className="mt-1 shrink-0" />}
              <div className={`max-w-[72%] sm:max-w-[420px] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && <span className="text-[11px] font-semibold px-1" style={{ color: 'var(--primary)' }}>{authorName}</span>}
                <div className="flex items-end gap-1.5">
                  <div className={`rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line break-words ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                    style={isMe
                      ? { background: 'var(--primary)', color: '#fff' }
                      : { background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                    {msg.content}
                  </div>
                  {(isMe || canManage) && (
                    <button onClick={() => deleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full flex items-center justify-center transition-opacity shrink-0"
                      style={{ background: '#EF444420', color: '#EF4444' }}>
                      <Trash2 size={11} />
                    </button>
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

      {/* Input */}
      <div className="shrink-0 px-3 py-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        {!canPost ? (
          <div className="flex items-center justify-center gap-2 py-3 text-sm"
            style={{ color: 'var(--text-tertiary)' }}>
            <Lock size={14} /> Seuls les admins peuvent poster ici
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input className="input flex-1 text-sm rounded-full px-4 py-2.5"
              placeholder={`Message dans #${channel.name}…`}
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
            <button onClick={sendMessage} disabled={!input.trim()}
              className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40 shrink-0"
              style={{ background: input.trim() ? 'var(--primary)' : 'var(--bg-secondary)' }}>
              <Send size={16} style={{ color: input.trim() ? '#fff' : 'var(--text-tertiary)' }} />
            </button>
          </div>
        )}
      </div>
      {ConfirmDialog}
    </div>
  );
}

export default function CommunityChannelsPage() {
  const { id: slug }  = useParams<{ id: string }>();
  const id             = decodeId(slug!);
  const navigate       = useNavigate();
  const { user: me }   = useAuthStore();

  const [community,      setCommunity]      = useState<CommunityMeta | null>(null);
  const [channels,       setChannels]       = useState<Channel[]>([]);
  const [myRole,         setMyRole]         = useState<string | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [selected,       setSelected]       = useState<Channel | null>(null);
  const [showCreate,     setShowCreate]     = useState(false);

  const isAdmin    = myRole === 'admin';
  const canManage  = myRole === 'admin' || myRole === 'moderator';

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const [commRes, chRes, membRes] = await Promise.all([
        apiClient.get<any>(`/api/v1/communities/${id}`),
        apiClient.get<any>(`/api/v1/communities/${id}/channels`),
        apiClient.get<any>(`/api/v1/communities/${id}/members`),
      ]);
      setCommunity(commRes.data?.data ?? commRes.data);
      setChannels(Array.isArray(chRes.data) ? chRes.data : chRes.data?.items ?? chRes.data?.data ?? []);
      const list = Array.isArray(membRes.data) ? membRes.data : membRes.data?.items ?? [];
      const mine = list.find((m: any) => m.user_id === me?.id);
      setMyRole(mine?.role ?? null);
    } catch { } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]);

  if (selected) {
    return (
      <ChannelChat
        communityId={id!}
        channel={selected}
        myRole={myRole}
        onBack={() => setSelected(null)}
        onChannelUpdated={load}
      />
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl transition-all"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            {community?.name ?? 'Channels'}
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            {channels.length} channel{channels.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: 'rgba(123,63,242,0.12)', color: 'var(--primary)' }}>
            <Plus size={14} /> Nouveau
          </button>
        )}
      </div>

      {loading ? (
        <PageLoader />
      ) : channels.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 opacity-60">
          <Hash size={40} style={{ color: 'var(--text-tertiary)' }} />
          <p className="font-semibold text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Aucun channel pour l'instant
          </p>
          {canManage && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: 'var(--primary)' }}>
              <Plus size={16} /> Creer le premier channel
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Annonces */}
          {channels.filter(c => c.type === 'announcement').length > 0 && (
            <div className="px-4 pt-4 pb-1">
              <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: 'var(--text-tertiary)' }}>ANNONCES</p>
              <div className="space-y-1">
                {channels.filter(c => c.type === 'announcement').map(ch => (
                  <ChannelItem key={ch.id} channel={ch} onClick={() => setSelected(ch)} isAdmin={canManage} communityId={id!} onDeleted={load} onUpdated={load} />
                ))}
              </div>
            </div>
          )}
          {/* Chats */}
          {channels.filter(c => c.type !== 'announcement').length > 0 && (
            <div className="px-4 pt-4 pb-4">
              <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: 'var(--text-tertiary)' }}>DISCUSSIONS</p>
              <div className="space-y-1">
                {channels.filter(c => c.type !== 'announcement').map(ch => (
                  <ChannelItem key={ch.id} channel={ch} onClick={() => setSelected(ch)} isAdmin={canManage} communityId={id!} onDeleted={load} onUpdated={load} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showCreate && <CreateChannelModal communityId={id!} onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}

// ── Modal settings canal ──────────────────────────────────────────────────────
function ChannelSettingsModal({ channel, communityId, onClose, onSaved, onDeleted }: {
  channel: Channel; communityId: string;
  onClose: () => void; onSaved: () => void; onDeleted: () => void;
}) {
  const [name,    setName]    = useState(channel.name);
  const [desc,    setDesc]    = useState(channel.description ?? '');
  const [type,    setType]    = useState<'chat' | 'announcement'>(channel.type === 'announcement' ? 'announcement' : 'chat');
  const [priv,    setPriv]    = useState(channel.is_private ?? false);
  const [saving,  setSaving]  = useState(false);
  const { confirm: confirmModal, ConfirmDialog: ConfirmModalDialog } = useConfirm();

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await apiClient.patch(`/api/v1/communities/${communityId}/channels/${channel.id}`, {
        name: name.trim(), description: desc.trim() || null, type, is_private: priv,
      });
      toast.success('Canal mis à jour');
      onSaved();
      onClose();
    } catch (e: any) { toast.error(extractApiErrorMessage(e, 'Erreur')); }
    finally { setSaving(false); }
  }

  async function del() {
    const ok = await confirmModal({ title: `Supprimer #${channel.name} ?`, message: 'Cette action est irréversible.', danger: true, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try {
      await apiClient.delete(`/api/v1/communities/${communityId}/channels/${channel.id}`);
      toast.success('Canal supprimé');
      onDeleted();
      onClose();
    } catch (e: any) { toast.error(extractApiErrorMessage(e, 'Erreur')); }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-lg flex flex-col rounded-2xl overflow-hidden pointer-events-auto"
          style={{ background: 'var(--surface)', maxHeight: '90vh', boxShadow: '0 24px 80px rgba(0,0,0,0.35)' }}>
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ color: 'var(--text-primary)' }}><X size={20} /></button>
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Paramètres du canal</p>
          <button onClick={save} disabled={saving} className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
            {saving ? <Spinner size="sm" /> : 'Enregistrer'}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold tracking-widest mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>NOM</label>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={40}
              className="input w-full" placeholder="nom-du-canal" />
          </div>
          <div>
            <label className="text-[10px] font-bold tracking-widest mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>DESCRIPTION</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} maxLength={200} rows={2}
              className="input w-full resize-none" placeholder="Description du canal…" />
          </div>
          <div>
            <label className="text-[10px] font-bold tracking-widest mb-2 block" style={{ color: 'var(--text-tertiary)' }}>TYPE</label>
            {[
              { val: 'chat' as const,         icon: <Hash size={15} />,       label: 'Chat',     sub: 'Discussion libre' },
              { val: 'announcement' as const, icon: <Megaphone size={15} />, label: 'Annonces', sub: 'Seuls admins peuvent poster' },
            ].map(opt => (
              <button key={opt.val} onClick={() => setType(opt.val)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left mb-2"
                style={{ background: 'var(--bg-secondary)', border: `1.5px solid ${type === opt.val ? 'var(--primary)' : 'var(--border)'}` }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: '#7B3FF220', color: '#7B3FF2' }}>{opt.icon}</div>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{opt.label}</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{opt.sub}</p>
                </div>
                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: type === opt.val ? 'var(--primary)' : 'var(--border)' }}>
                  {type === opt.val && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} />}
                </div>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between p-3.5 rounded-2xl"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Canal privé</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Seuls les membres invités peuvent accéder</p>
            </div>
            <button onClick={() => setPriv(v => !v)}
              className="w-12 h-6 rounded-full relative transition-all"
              style={{ background: priv ? 'var(--primary)' : 'var(--border)' }}>
              <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                style={{ left: priv ? 26 : 2 }} />
            </button>
          </div>

          <p className="text-[10px] font-bold tracking-widest pt-2" style={{ color: '#EF4444' }}>ZONE DE DANGER</p>
          <button onClick={del}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl"
            style={{ background: '#EF444410', border: '1px solid #EF444430' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EF444420' }}>
              <Trash2 size={16} color="#EF4444" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm" style={{ color: '#EF4444' }}>Supprimer le canal</p>
              <p className="text-xs mt-0.5" style={{ color: '#EF444499' }}>Action irréversible</p>
            </div>
          </button>
          <div className="h-4" />
        </div>
        </div>
      </div>
      {ConfirmModalDialog}
    </>
  );
}

// Icônes Feather proposées par le picker (identique au mobile,
// CommunityChannelsScreen.tsx::CHANNEL_ICONS) — mapping nom -> composant
// Lucide, nécessaire ici car lucide-react n'a pas de résolution dynamique
// par string contrairement à react-native-vector-icons.
const CHANNEL_ICON_MAP: Record<string, typeof Hash> = {
  'message-circle': MessageCircle, bell: Megaphone, zap: Zap, music: Music,
  'book-open': BookOpen, star: Star, award: Award, globe: Globe, film: Film,
  target: Target, tool: Wrench, mic: Mic, rss: Rss, camera: Camera, heart: Heart,
};

// Un emoji (ancien format) contient toujours un caractère hors de la plage
// ASCII imprimable des noms d'icônes Feather — même détection que mobile
// (CommunityChannelsScreen.tsx::isLegacyEmoji).
const isLegacyEmoji = (value: string) => !/^[a-z0-9-]+$/i.test(value);

const TYPE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  announcement: { label: 'Annonces', bg: '#F59E0B20', color: '#D97706' },
  voice:        { label: 'Vocal',    bg: '#10B98120', color: '#059669' },
};

function fmtChannelTime(iso: string): string {
  const d = new Date(iso), now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1)  return 'maintenant';
  if (diffMin < 60) return `${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `${diffH}h`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function ChannelItem({ channel, onClick, isAdmin, communityId, onDeleted, onUpdated }: {
  channel: Channel; onClick: () => void; isAdmin: boolean; communityId: string;
  onDeleted: () => void; onUpdated: () => void;
}) {
  const [showSettings, setShowSettings] = useState(false);
  const badge = TYPE_BADGE[channel.type];
  const iconColor = channel.type === 'announcement' ? '#D97706' : channel.type === 'voice' ? '#059669' : '#7B3FF2';
  const hasEmoji = !!channel.emoji && isLegacyEmoji(channel.emoji);
  const IconComp = !hasEmoji
    ? (channel.emoji && CHANNEL_ICON_MAP[channel.emoji])
      || (channel.type === 'announcement' ? Megaphone : channel.type === 'voice' ? Mic : Hash)
    : null;

  return (
    <>
      <button onClick={onClick}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all text-left group"
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        {channel.avatar_url ? (
          <img src={channel.avatar_url} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0"
            style={{ border: '1px solid var(--border)' }} />
        ) : (
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: iconColor + '15', color: iconColor }}>
            {hasEmoji
              ? <span style={{ fontSize: 20, lineHeight: 1 }}>{channel.emoji}</span>
              : IconComp && <IconComp size={19} />}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>#{channel.name}</p>
            {channel.is_private && <Lock size={11} style={{ color: 'var(--text-tertiary)' }} />}
            {channel.has_password && <Key size={11} color="#F59E0B" />}
            {badge && (
              <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: badge.bg, color: badge.color }}>
                {badge.label}
              </span>
            )}
          </div>
          {channel.last_message ? (
            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {channel.last_message.sender_display_name && (
                <span className="font-medium">{channel.last_message.sender_display_name} : </span>
              )}
              {channel.last_message.content ?? 'Média'}
            </p>
          ) : channel.description ? (
            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{channel.description}</p>
          ) : (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}>Aucun message</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {channel.last_message?.created_at && (
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {fmtChannelTime(channel.last_message.created_at)}
            </span>
          )}
          {!!channel.members_count && (
            <div className="flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
              <Users size={11} />
              <span className="text-[10px]">{channel.members_count}</span>
            </div>
          )}
        </div>

        {isAdmin && (
          <button onClick={e => { e.stopPropagation(); setShowSettings(true); }}
            className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full flex items-center justify-center transition-opacity shrink-0"
            style={{ background: '#7B3FF215', color: '#7B3FF2' }}>
            <Settings size={13} />
          </button>
        )}
      </button>
      {showSettings && (
        <ChannelSettingsModal
          channel={channel} communityId={communityId}
          onClose={() => setShowSettings(false)}
          onSaved={onUpdated}
          onDeleted={onDeleted}
        />
      )}
    </>
  );
}
