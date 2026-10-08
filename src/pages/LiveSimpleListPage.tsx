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
import { Avatar } from '../components/ui/Avatar';
import { LiveBadge, GlassChip, LiveHeader, LivePage, PillButton, EmptyCard, LIVE_GRADIENT, CARD_SHADOW, CARD_SHADOW_HOVER } from '../components/live/liveKit';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

function LiveCard({ live }: { live: LiveStream }) {
  const navigate = useNavigate();
  const streamer = live.user?.display_name ?? live.user?.username;

  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-[28px] transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: CARD_SHADOW }}
      onClick={() => navigate(`/lives/${encodeId(live.id)}`)}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = CARD_SHADOW_HOVER; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = CARD_SHADOW; }}
    >
      {/* Visuel */}
      <div className="relative overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
        {live.thumbnail_url ? (
          <img src={live.thumbnail_url} alt={live.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : live.user?.avatar_url ? (
          <div className="relative w-full h-full flex items-center justify-center" style={{ background: '#140a26' }}>
            <img src={live.user.avatar_url} alt="" aria-hidden
              className="absolute inset-0 w-full h-full object-cover opacity-40" style={{ filter: 'blur(18px)' }} />
            <Avatar src={live.user.avatar_url} name={streamer} size="xl" className="relative w-20 h-20" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1a0a33,#2d1366)' }}>
            <Radio size={32} style={{ color: 'rgba(255,255,255,0.35)' }} />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 pointer-events-none" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.6),transparent)' }} />

        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <LiveBadge />
          <GlassChip><Eye size={11} /> {live.current_viewers.toLocaleString('fr-FR')}</GlassChip>
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {live.is_featured && <GlassChip tone="gold"><Zap size={11} /> Boost</GlassChip>}
          {live.is_private && <GlassChip tone="violet"><Lock size={11} /> Abonnés</GlassChip>}
        </div>
        <div className="absolute bottom-3 right-3">
          <GlassChip>{formatDistanceToNow(new Date(live.started_at), { locale: fr })}</GlassChip>
        </div>
      </div>

      {/* Infos */}
      <div className="p-4 flex gap-3 items-center">
        <Avatar src={live.user?.avatar_url} name={streamer} size="md" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-black text-sm line-clamp-1" style={{ color: 'var(--text-primary)' }}>{live.title}</p>
          <p className="text-xs truncate mt-0.5 font-semibold" style={{ color: 'var(--text-secondary)' }}>{streamer}</p>
          {live.description && (
            <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-tertiary)' }}>{live.description}</p>
          )}
        </div>
        <span className="shrink-0 h-9 px-4 rounded-full inline-flex items-center text-[13px] font-bold text-white"
          style={{ background: LIVE_GRADIENT, boxShadow: '0 4px 14px rgba(123,63,242,0.3)' }}>
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
    <LivePage>
      <LiveHeader
        icon={<Radio size={16} />}
        title="Lives en direct"
        subtitle={loading ? '…' : `${active.length} live${active.length !== 1 ? 's' : ''} actif${active.length !== 1 ? 's' : ''}`}
        actions={
          <>
            <PillButton variant="ghost" onClick={() => refetch()}>Actualiser</PillButton>
            <PillButton icon={<Plus size={15} />} onClick={() => navigate('/go-live')}>Démarrer un live</PillButton>
          </>
        }
      />

      {loading ? (
        <PageLoader />
      ) : active.length === 0 ? (
        <EmptyCard
          icon={<Radio size={30} />}
          title="Aucun live en cours"
          description="Sois le premier à démarrer un live pour ta communauté."
          action={<PillButton icon={<Radio size={15} />} onClick={() => navigate('/go-live')}>Démarrer maintenant</PillButton>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {active.map(live => <LiveCard key={live.id} live={live} />)}
        </div>
      )}
    </LivePage>
  );
}
