import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decodeId } from '../../utils/slugId';
import {
  ArrowLeft, Hash, Megaphone, Plus, Send, Settings, Lock, Globe,
  Trash2, X, Check, Users,
} from 'lucide-react';
import { apiClient } from '../../api';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';
import { WS_BASE_URL } from '../../utils/constants';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Channel {
  id: string;
  name: string;
  type: 'announcement' | 'chat' | string;
  description?: string | null;
  is_private?: boolean;
  members_count?: number;
  last_message?: { content: string; created_at: string } | null;
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
                { val: 'chat', icon: <Hash size={16} />, label: 'Chat', sub: 'Discussion libre entre membres', color: '#3B82F6' },
                { val: 'announcement', icon: <Megaphone size={16} />, label: 'Annonces', sub: 'Seuls les admins peuvent poster', color: '#F59E0B' },
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

function ChannelChat({ communityId, channel, myRole, onBack }: {
  communityId: string; channel: Channel; myRole: string | null; onBack: () => void;
}) {
  const { user: me } = useAuthStore();
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [input,    setInput]    = useState('');
  const wsRef      = useRef<WebSocket | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const isAdmin    = myRole === 'admin' || myRole === 'moderator';
  const canPost    = channel.type !== 'announcement' || isAdmin;

  useEffect(() => {
    apiClient.get<any>(`/api/v1/communities/${communityId}/channels/${channel.id}/messages`)
      .then(r => setMessages(Array.isArray(r.data) ? r.data : r.data?.items ?? r.data?.data ?? []))
      .catch(() => {});

    const token = useAuthStore.getState().accessToken ?? '';
    const ws = new WebSocket(
      `${WS_BASE_URL}/api/v1/communities/${communityId}/channels/${channel.id}/ws?token=${encodeURIComponent(token)}`
    );
    wsRef.current = ws;
    ws.onmessage = e => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'channel_message' || data.type === 'channel_message_sent') {
          setMessages(prev => [...prev.slice(-99), data]);
        } else if (data.type === 'channel_message_deleted') {
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
    if (!confirm('Supprimer ce message ?')) return;
    try {
      await apiClient.delete(`/api/v1/communities/${communityId}/channels/${channel.id}/messages/${msgId}`);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch { }
  }

  const typeColor = channel.type === 'announcement' ? '#F59E0B' : '#3B82F6';
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
          <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{channel.name}</p>
          {channel.type === 'announcement' && (
            <p className="text-[10px]" style={{ color: '#F59E0B' }}>Annonces · Lecture seule pour les membres</p>
          )}
        </div>
      </div>

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
              <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && <span className="text-[11px] font-semibold px-1" style={{ color: 'var(--primary)' }}>{authorName}</span>}
                <div className="flex items-end gap-1.5">
                  <div className={`rounded-2xl px-3.5 py-2 text-sm ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                    style={isMe
                      ? { background: 'var(--primary)', color: '#fff' }
                      : { background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                    {msg.content}
                  </div>
                  {(isMe || isAdmin) && (
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

  const isAdmin = myRole === 'admin' || myRole === 'moderator';

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
        {isAdmin && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: 'rgba(123,63,242,0.12)', color: 'var(--primary)' }}>
            <Plus size={14} /> Nouveau
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : channels.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 opacity-60">
          <Hash size={40} style={{ color: 'var(--text-tertiary)' }} />
          <p className="font-semibold text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Aucun channel pour l'instant
          </p>
          {isAdmin && (
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
                  <ChannelItem key={ch.id} channel={ch} onClick={() => setSelected(ch)} isAdmin={isAdmin} communityId={id!} onDeleted={load} />
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
                  <ChannelItem key={ch.id} channel={ch} onClick={() => setSelected(ch)} isAdmin={isAdmin} communityId={id!} onDeleted={load} />
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

function ChannelItem({ channel, onClick, isAdmin, communityId, onDeleted }: {
  channel: Channel; onClick: () => void; isAdmin: boolean; communityId: string; onDeleted: () => void;
}) {
  const typeColor = channel.type === 'announcement' ? '#F59E0B' : '#3B82F6';
  const TypeIcon  = channel.type === 'announcement' ? Megaphone : Hash;

  async function del(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Supprimer le channel #${channel.name} ?`)) return;
    try {
      await apiClient.delete(`/api/v1/communities/${communityId}/channels/${channel.id}`);
      onDeleted();
    } catch { }
  }

  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all text-left group"
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: typeColor + '15', color: typeColor }}>
        <TypeIcon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>#{channel.name}</p>
        {channel.description && (
          <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{channel.description}</p>
        )}
        {channel.last_message && (
          <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
            {channel.last_message.content}
          </p>
        )}
      </div>
      {channel.members_count !== undefined && (
        <div className="flex items-center gap-1 shrink-0" style={{ color: 'var(--text-tertiary)' }}>
          <Users size={12} />
          <span className="text-xs">{channel.members_count}</span>
        </div>
      )}
      {isAdmin && (
        <button onClick={del}
          className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full flex items-center justify-center transition-opacity shrink-0"
          style={{ background: '#EF444415', color: '#EF4444' }}>
          <Trash2 size={13} />
        </button>
      )}
    </button>
  );
}
