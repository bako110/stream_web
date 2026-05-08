import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Eye, Plus, Zap } from 'lucide-react';
import type { LiveStream } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useApi } from '../hooks/useApi';
import { useWs } from '../context/WebSocketContext';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

function LiveCard({ live }: { live: LiveStream }) {
  const navigate = useNavigate();

  return (
    <div
      className="group cursor-pointer overflow-hidden transition-all duration-200"
      style={{
        borderRadius: '1rem',
        border: '1px solid rgba(240,54,90,0.2)',
        background: 'var(--surface)',
        boxShadow: '0 2px 12px rgba(240,54,90,0.08)',
      }}
      onClick={() => navigate(`/lives/${live.id}`)}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 28px rgba(240,54,90,0.22)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(240,54,90,0.5)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(240,54,90,0.08)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(240,54,90,0.2)';
      }}
    >
      {/* Thumbnail / placeholder */}
      <div className="relative overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
        {live.thumbnail_url ? (
          <img src={live.thumbnail_url} alt={live.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#1a0a0a,#2d0a14)' }}>
            <Radio size={32} className="text-red-500/40" />
          </div>
        )}

        {/* Live badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-white"
            style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)', boxShadow: '0 0 10px rgba(240,54,90,0.5)' }}>
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
          </span>
          <span className="flex items-center gap-1 text-xs text-white px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
            <Eye size={10} /> {live.current_viewers.toLocaleString()}
          </span>
        </div>

        {/* Boost badge */}
        {live.is_featured && (
          <div className="absolute top-3 right-3">
            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full text-yellow-300"
              style={{ background: 'rgba(245,158,11,0.25)', border: '1px solid rgba(245,158,11,0.4)', backdropFilter: 'blur(4px)' }}>
              <Zap size={10} /> Boost
            </span>
          </div>
        )}

        {/* Durée depuis le début */}
        <div className="absolute bottom-3 right-3">
          <span className="text-xs text-white/70 px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
            {formatDistanceToNow(new Date(live.started_at), { locale: fr })}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex gap-3 items-start">
        <Avatar src={live.user?.avatar_url} name={live.user?.display_name ?? live.user?.username} size="sm" className="shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--text-primary)] text-sm line-clamp-1">{live.title}</p>
          <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
            {live.user?.display_name ?? live.user?.username}
          </p>
          {live.description && (
            <p className="text-xs text-[var(--text-tertiary)] mt-1 line-clamp-1">{live.description}</p>
          )}
        </div>
        <span className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white shrink-0 self-center transition-all"
          style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)' }}>
          Rejoindre
        </span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LiveSimpleListPage() {
  const navigate = useNavigate();
  const { data: initialLives, loading, refetch } = useApi<LiveStream[]>(
    () => apiClient.get<LiveStream[]>(Endpoints.lives.list),
  );
  const { lastLiveStarted, lastLiveEnded, lastLiveViewersUpdated } = useWs();

  const [lives, setLives] = useState<LiveStream[]>([]);

  useEffect(() => {
    if (initialLives) setLives(initialLives);
  }, [initialLives]);

  useEffect(() => {
    if (!lastLiveStarted) return;
    setLives(prev => {
      if (prev.some(l => l.id === lastLiveStarted.live.id)) return prev;
      return [lastLiveStarted.live as unknown as LiveStream, ...prev];
    });
  }, [lastLiveStarted]);

  useEffect(() => {
    if (!lastLiveEnded) return;
    setLives(prev => prev.filter(l => l.id !== lastLiveEnded));
  }, [lastLiveEnded]);

  useEffect(() => {
    if (!lastLiveViewersUpdated) return;
    setLives(prev => prev.map(l =>
      l.id === lastLiveViewersUpdated.live_id
        ? { ...l, current_viewers: lastLiveViewersUpdated.current_viewers }
        : l
    ));
  }, [lastLiveViewersUpdated]);

  const active = lives;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Radio className="text-red-500" /> Lives en direct
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {loading ? '...' : `${active.length} live${active.length !== 1 ? 's' : ''} actif${active.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-ghost text-sm border border-[var(--border)]">
            Actualiser
          </button>
          <button onClick={() => navigate('/go-live')}
            className="btn-primary flex items-center gap-2 text-sm"
            style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)' }}>
            <Plus size={16} /> Démarrer un live
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : active.length === 0 ? (
        <EmptyState
          icon={<Radio size={48} />}
          title="Aucun live en cours"
          description="Sois le premier à démarrer un live pour ta communauté."
          action={
            <button onClick={() => navigate('/go-live')}
              className="btn-primary flex items-center gap-2 mx-auto"
              style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)' }}>
              <Radio size={16} /> Démarrer maintenant
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {active.map(live => <LiveCard key={live.id} live={live} />)}
        </div>
      )}
    </div>
  );
}
