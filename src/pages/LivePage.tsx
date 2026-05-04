import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Radio, Users, MessageCircle, Send, X } from 'lucide-react';
import type { Concert, StreamToken, StreamStatus } from "../types";
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useApi } from '../hooks/useApi';
import { Spinner } from '../components/ui/Spinner';
import { Avatar } from '../components/ui/Avatar';
import { WS_BASE_URL } from '../utils/constants';

interface ChatMsg { id: string; user: string; avatar?: string | null; text: string; }

function LiveChat({ concertId }: { concertId: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput]       = useState('');
  const wsRef   = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE_URL}/api/v1/social/comments/ws/concert/${concertId}`);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setMessages(prev => [...prev.slice(-99), {
          id: data.id ?? Date.now().toString(),
          user: data.author?.display_name ?? data.author?.username ?? 'Anonyme',
          avatar: data.author?.avatar_url,
          text: data.body,
        }]);
      } catch { /* ignore malformed */ }
    };
    return () => ws.close();
  }, [concertId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function send() {
    if (!input.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ body: input.trim(), concert_id: concertId }));
    setInput('');
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map(m => (
          <div key={m.id} className="flex gap-2 items-start">
            <Avatar src={m.avatar} name={m.user} size="xs" className="mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-brand-primary">{m.user} </span>
              <span className="text-xs text-[var(--text-primary)]">{m.text}</span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-[var(--border)] flex gap-2">
        <input
          className="input text-sm py-1.5 flex-1"
          placeholder="Commenter..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
        />
        <button onClick={send} className="btn-primary p-2 aspect-square"><Send size={14} /></button>
      </div>
    </div>
  );
}

export default function LivePage() {
  const { id } = useParams<{ id: string }>();
  const [showChat, setShowChat] = useState(true);
  const [streamToken, setStreamToken] = useState<StreamToken | null>(null);

  const concert = useApi<Concert>(() => apiClient.get<Concert>(Endpoints.concerts.byId(id!)), [id]);
  const status  = useApi<StreamStatus>(() => apiClient.get<StreamStatus>(Endpoints.streaming.status(id!)), [id]);

  useEffect(() => {
    if (!id) return;
    apiClient.post<StreamToken>(Endpoints.streaming.token(id))
      .then(r => setStreamToken(r.data))
      .catch(() => { /* viewer may not have access yet */ });
  }, [id]);

  if (concert.loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!concert.data) return <div className="p-6 text-[var(--text-secondary)]">Concert introuvable.</div>;

  const c = concert.data;
  const isLive = c.status === 'live';

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden">
      {/* Video player */}
      <div className="flex-1 bg-black flex flex-col">
        <div className="flex-1 relative">
          {c.video_url || streamToken ? (
            <video
              className="w-full h-full object-contain"
              src={c.video_url ?? undefined}
              controls
              autoPlay
              poster={c.thumbnail_url ?? undefined}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white gap-4">
              {c.thumbnail_url && <img src={c.thumbnail_url} className="absolute inset-0 w-full h-full object-cover opacity-30" alt="" />}
              <div className="relative z-10 text-center">
                <Radio size={48} className="mx-auto mb-3 opacity-60" />
                <p className="text-lg font-semibold">{isLive ? 'Chargement du direct...' : 'Concert pas encore en direct'}</p>
              </div>
            </div>
          )}

          {isLive && (
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="badge-live flex items-center gap-1"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE</span>
              {status.data && (
                <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Users size={12} /> {status.data.current_viewers.toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Info bar */}
        <div className="bg-[var(--bg)] border-t border-[var(--border)] p-4 flex items-center gap-4">
          <Avatar src={c.artist?.avatar_url} name={c.artist?.display_name ?? c.artist?.username} size="md" />
          <div className="min-w-0">
            <p className="font-bold text-[var(--text-primary)]">{c.title}</p>
            <p className="text-sm text-[var(--text-secondary)]">{c.artist?.display_name ?? c.artist?.username}</p>
          </div>
          <button onClick={() => setShowChat(!showChat)} className="btn-ghost ml-auto flex items-center gap-2">
            <MessageCircle size={18} /> Chat
          </button>
        </div>
      </div>

      {/* Chat panel */}
      {showChat && (
        <div className="w-80 border-l border-[var(--border)] bg-[var(--surface)] flex flex-col hidden lg:flex">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <h3 className="font-semibold text-[var(--text-primary)]">Chat en direct</h3>
            <button onClick={() => setShowChat(false)} className="btn-ghost p-1"><X size={16} /></button>
          </div>
          <LiveChat concertId={id!} />
        </div>
      )}
    </div>
  );
}
