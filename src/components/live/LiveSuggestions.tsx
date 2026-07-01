import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Zap, Radio } from 'lucide-react';
import type { LiveStream } from '../../types';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { encodeId } from '../../utils/slugId';
import { Avatar } from '../ui/Avatar';

// Charge tous les lives actifs (déjà triés boost-first par le backend), en excluant
// le live actuellement regardé — partagé par la bande du bas et le menu latéral.
export function useLiveSuggestions(excludeId: string) {
  const [lives, setLives] = useState<LiveStream[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiClient.get<LiveStream[]>(Endpoints.lives.list)
      .then(r => { if (!cancelled) setLives((r.data ?? []).filter(l => l.id !== excludeId)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [excludeId]);

  return lives;
}

// ── Bande horizontale sous le player — "d'autres lives en cours" ──────────────
export function LiveSuggestionsBar({ lives }: { lives: LiveStream[] }) {
  const navigate = useNavigate();
  if (lives.length === 0) return null;

  return (
    <div className="shrink-0 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.85)' }}>
      <p className="px-4 pt-2.5 text-xs font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Autres lives en cours</p>
      <div className="flex gap-2.5 px-4 py-2.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {lives.map(live => (
          <button
            key={live.id}
            onClick={() => navigate(`/lives/${encodeId(live.id)}`)}
            className="relative shrink-0 w-28 rounded-xl overflow-hidden text-left transition-transform hover:scale-[1.03]"
            style={{ aspectRatio: '9/16', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            {live.thumbnail_url ? (
              <img src={live.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1a0a0a,#2d0a14)' }}>
                <Radio size={22} className="text-red-500/40" />
              </div>
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 55%)' }} />
            <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
              <span className="w-1 h-1 rounded-full bg-white animate-pulse" /> LIVE
            </div>
            {live.is_featured && (
              <div className="absolute top-1.5 right-1.5 text-yellow-300" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
                <Zap size={12} fill="currentColor" />
              </div>
            )}
            <div className="absolute bottom-1.5 left-1.5 right-1.5">
              <div className="flex items-center gap-1 mb-1">
                <Avatar src={live.user?.avatar_url} name={live.user?.display_name ?? live.user?.username} size="xs" />
                <p className="text-[10px] font-semibold text-white truncate">{live.user?.display_name ?? live.user?.username}</p>
              </div>
              <p className="flex items-center gap-0.5 text-[9px] text-white/70">
                <Eye size={9} /> {live.current_viewers.toLocaleString()}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Menu vertical à droite — lives les plus boostés ────────────────────────────
export function LiveBoostedRail({ lives }: { lives: LiveStream[] }) {
  const navigate = useNavigate();
  const boosted = lives.filter(l => l.is_featured);
  if (boosted.length === 0) return null;

  return (
    <div className="hidden xl:flex w-20 flex-col items-center gap-3 py-3 border-l overflow-y-auto shrink-0"
      style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.9)', scrollbarWidth: 'none' }}>
      <span className="flex items-center gap-0.5 text-[9px] font-bold text-yellow-300 uppercase tracking-wide">
        <Zap size={10} fill="currentColor" /> Boost
      </span>
      {boosted.map(live => (
        <button
          key={live.id}
          onClick={() => navigate(`/lives/${encodeId(live.id)}`)}
          className="relative w-14 h-14 rounded-full overflow-hidden shrink-0 transition-transform hover:scale-105"
          style={{ border: '2px solid #fbbf24', boxShadow: '0 0 10px rgba(251,191,36,0.4)' }}
          title={live.title}
        >
          <Avatar src={live.user?.avatar_url} name={live.user?.display_name ?? live.user?.username} size="xl" className="w-full h-full" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 text-[8px] font-bold text-white py-0.5"
            style={{ background: 'rgba(0,0,0,0.6)' }}>
            <Eye size={8} /> {live.current_viewers}
          </div>
        </button>
      ))}
    </div>
  );
}
