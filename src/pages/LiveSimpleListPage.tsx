import { PageLoader } from '../components/ui/Spinner';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { encodeId } from '../utils/slugId';
import { Radio, Eye, Plus, Zap, Lock } from 'lucide-react';
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
        border: '1px solid rgba(123,63,242,0.2)',
        background: 'var(--surface)',
        boxShadow: '0 2px 12px rgba(123,63,242,0.08)',
      }}
      onClick={() => navigate(`/lives/${encodeId(live.id)}`)}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 28px rgba(123,63,242,0.22)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(123,63,242,0.5)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(123,63,242,0.08)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(123,63,242,0.2)';
      }}
    >
      {/* Thumbnail / avatar streamer / placeholder */}
      <div className="relative overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
        {live.thumbnail_url ? (
          <img src={live.thumbnail_url} alt={live.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80" />
        ) : live.user?.avatar_url ? (
          <div className="relative w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#1a0a0a,#2d0a14)' }}>
            {/* Photo de profil du streamer en fond flou, remplit la carte sans thumbnail dédiée */}
            <img src={live.user.avatar_url} alt="" aria-hidden
              className="absolute inset-0 w-full h-full object-cover opacity-30"
              style={{ filter: 'blur(16px)' }} />
            <Avatar src={live.user.avatar_url} name={live.user?.display_name ?? live.user?.username} size="xl"
              className="relative w-20 h-20" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#1a0a0a,#2d0a14)' }}>
            <Radio size={32} className="text-red-500/40" />
          </div>
        )}

        {/* Live badge + viewers */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-white"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 0 10px rgba(123,63,242,0.5)' }}>
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
          </span>
          <span className="flex items-center gap-1 text-xs text-white px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
            <Eye size={10} /> {live.current_viewers.toLocaleString()}
          </span>
        </div>

        {/* Badge privé */}
        {live.is_private && (
          <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-white"
            style={{ background: 'rgba(123,63,242,0.85)', backdropFilter: 'blur(4px)', border: '1px solid rgba(123,63,242,0.5)' }}>
            <Lock size={10} /> Abonnés
          </div>
        )}

        {/* Boost badge */}
        {live.is_featured && (
          <div className="absolute top-3 right-3">
            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full text-yellow-300"
              style={{ background: 'rgba(123,63,242,0.25)', border: '1px solid rgba(123,63,242,0.4)', backdropFilter: 'blur(4px)' }}>
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
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
          Rejoindre
        </span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LiveSimpleListPage() {
  const navigate = useNavigate();
  const { data: initialLivesPage, loading, refetch } = useApi<{ items: LiveStream[]; total: number; has_more: boolean }>(
    () => apiClient.get<{ items: LiveStream[]; total: number; has_more: boolean }>(Endpoints.lives.list),
  );
  const { lastLiveStarted, lastLiveEnded, lastLiveViewersUpdated } = useWs();

  const [lives, setLives] = useState<LiveStream[]>([]);

  useEffect(() => {
    if (initialLivesPage) setLives(initialLivesPage.items);
  }, [initialLivesPage]);

  useEffect(() => {
    if (!lastLiveStarted) return;
    // Refetch depuis l'API — le backend applique les filtres is_private + follow
    // Ne pas injecter directement le live WS qui ignore ces règles
    refetch();
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
    <div className="max-w-5xl mx-auto p-3 sm:p-6 space-y-5 sm:space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Radio className="text-red-500 shrink-0" size={22} /> <span className="truncate">Lives en direct</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            {loading ? '...' : `${active.length} live${active.length !== 1 ? 's' : ''} actif${active.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-ghost flex-1 sm:flex-none text-xs sm:text-sm border border-[var(--border)] whitespace-nowrap">
            Actualiser
          </button>
          <button onClick={() => navigate('/go-live')}
            className="btn-primary flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
            <Plus size={16} className="shrink-0" /> <span className="truncate">Démarrer un live</span>
          </button>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : active.length === 0 ? (
        <EmptyState
          icon={<Radio size={48} />}
          title="Aucun live en cours"
          description="Sois le premier à démarrer un live pour ta communauté."
          action={
            <button onClick={() => navigate('/go-live')}
              className="btn-primary flex items-center gap-2 mx-auto"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
              <Radio size={16} /> Démarrer maintenant
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {active.map(live => <LiveCard key={live.id} live={live} />)}
        </div>
      )}
    </div>
  );
}
