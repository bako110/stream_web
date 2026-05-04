import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Users, LogIn, LogOut, Send } from 'lucide-react';
import type { Community } from "../../types";
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';
import { WS_BASE_URL } from '../../utils/constants';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CommunityMessage {
  id: string; user_id: string; body: string; created_at: string;
  author?: { id: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; };
}

export default function CommunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user: me } = useAuthStore();
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [input, setInput]       = useState('');
  const [joined, setJoined]     = useState(false);
  const wsRef     = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: community, loading } = useApi<Community>(() => apiClient.get<Community>(Endpoints.communities.byId(id!)), [id]);

  useEffect(() => {
    if (!id) return;
    // Load recent messages
    apiClient.get<CommunityMessage[]>(Endpoints.communities.messages(id))
      .then(r => setMessages((r.data as any)?.items ?? r.data ?? []))
      .catch(() => {});

    // WS
    const ws = new WebSocket(`${WS_BASE_URL}/api/v1/communities/${id}/ws`);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setMessages(prev => [...prev.slice(-99), data]);
      } catch { /* ignore */ }
    };
    return () => ws.close();
  }, [id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function handleJoin() {
    if (!id) return;
    await apiClient.post(Endpoints.communities.join(id));
    setJoined(true);
  }

  async function handleLeave() {
    if (!id) return;
    await apiClient.delete(Endpoints.communities.leave(id));
    setJoined(false);
  }

  async function sendMessage() {
    if (!input.trim() || !id) return;
    const body = input.trim(); setInput('');
    await apiClient.post(Endpoints.communities.messages(id), { body });
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!community) return <div className="p-6 text-[var(--text-secondary)]">Communauté introuvable.</div>;

  const c = community;

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Banner */}
      <div className="relative h-32 bg-brand-gradient shrink-0">
        {c.banner_url && <img src={c.banner_url} className="w-full h-full object-cover" alt="" />}
        <div className="absolute inset-0 bg-black/40 flex items-end px-6 pb-4">
          <div className="flex items-end gap-4">
            {c.avatar_url ? (
              <img src={c.avatar_url} className="w-14 h-14 rounded-xl border-2 border-white object-cover" alt="" />
            ) : (
              <div className="w-14 h-14 rounded-xl border-2 border-white bg-brand-gradient flex items-center justify-center">
                <Users size={24} className="text-white" />
              </div>
            )}
            <div>
              <h1 className="text-white font-bold text-xl">{c.name}</h1>
              <p className="text-white/80 text-xs">{c.member_count.toLocaleString()} membres</p>
            </div>
          </div>
          <button onClick={joined ? handleLeave : handleJoin}
            className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${joined ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-white text-brand-primary hover:bg-white/90'}`}>
            {joined ? <><LogOut size={15} /> Quitter</> : <><LogIn size={15} /> Rejoindre</>}
          </button>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-[var(--text-secondary)] text-sm py-8">Soyez le premier à envoyer un message !</p>
        )}
        {messages.map(msg => {
          const isMe = msg.user_id === me?.id;
          const authorName = msg.author?.display_name ?? msg.author?.username ?? 'Utilisateur';
          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              <Avatar src={msg.author?.avatar_url} name={authorName} size="xs" className="mt-1 shrink-0" />
              <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {!isMe && <span className="text-xs text-brand-primary font-medium">{authorName}</span>}
                <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-brand-primary text-white rounded-br-sm' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-bl-sm'}`}>
                  {msg.body}
                </div>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {formatDistanceToNow(new Date(msg.created_at), { locale: fr, addSuffix: true })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[var(--border)] flex gap-2 shrink-0">
        <input
          className="input flex-1 text-sm py-2"
          placeholder="Écrire un message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
        />
        <button onClick={sendMessage} disabled={!input.trim()} className="btn-primary p-2 aspect-square"><Send size={16} /></button>
      </div>
    </div>
  );
}
