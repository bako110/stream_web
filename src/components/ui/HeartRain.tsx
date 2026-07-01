import { useState, useEffect, useRef } from 'react';
import { Heart } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';

// ── Pluie de cœurs — se déclenche une fois à l'arrivée sur un contenu très aimé ──
export const HEART_RAIN_THRESHOLD = 1;
const HEART_RAIN_COUNT  = 54;
const HEART_RAIN_COLORS = ['#7B3FF2', '#E0389A', '#F0365A', '#A855F7'];

// Évite de rejouer l'effet si l'utilisateur revient sur le même contenu dans la session
const _heartRainPlayed = new Set<string>();

export function HeartRain({ active, likeCount, contentId }: { active: boolean; likeCount: number; contentId: string }) {
  const [playing, setPlaying] = useState(false);
  const [drops, setDrops] = useState<{ id: number; left: number; delay: number; duration: number; size: number; color: string }[]>([]);

  useEffect(() => {
    if (!active || likeCount < HEART_RAIN_THRESHOLD || _heartRainPlayed.has(contentId)) return;
    _heartRainPlayed.add(contentId);
    setDrops(Array.from({ length: HEART_RAIN_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2.2 + Math.random() * 1.2,
      size: 18 + Math.random() * 20,
      color: HEART_RAIN_COLORS[i % HEART_RAIN_COLORS.length],
    })));
    setPlaying(true);
    const t = setTimeout(() => setPlaying(false), 3800);
    return () => clearTimeout(t);
  }, [active, likeCount, contentId]);

  if (!playing) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {drops.map(d => (
        <Heart key={d.id} fill={d.color} stroke="none"
          size={d.size}
          style={{
            position: 'absolute',
            left: `${d.left}%`,
            top: '-10%',
            opacity: 0,
            filter: `drop-shadow(0 0 8px ${d.color}aa)`,
            animation: `heart-rain-fall ${d.duration}s ease-in ${d.delay}s forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes heart-rain-fall {
          0%   { transform: translateY(0) rotate(0deg);    opacity: 0; }
          8%   { opacity: 0.9; }
          85%  { opacity: 0.7; }
          100% { transform: translateY(115vh) rotate(35deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── Avatars des derniers utilisateurs à avoir liké — coin bas-gauche, style TikTok ──
interface RecentLiker { id: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; }
const _recentLikersCache = new Map<string, RecentLiker[]>();

export function RecentLikersAvatars({ active, likeCount, contentId, kind }: {
  active: boolean; likeCount: number; contentId: string; kind: 'reel' | 'story';
}) {
  const [likers, setLikers] = useState<RecentLiker[]>(() => _recentLikersCache.get(contentId) ?? []);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!active || likeCount < HEART_RAIN_THRESHOLD || fetchedRef.current) return;
    fetchedRef.current = true;
    // Les likes de reels passent par le système de réactions générique, ceux des
    // stories par leur propre table (StoryLike) — endpoints distincts côté backend.
    const url = kind === 'reel'
      ? `${Endpoints.social.reactionUsers}?reel_id=${contentId}&limit=3`
      : `${Endpoints.stories.likers(contentId)}?limit=3`;
    apiClient.get<RecentLiker[]>(url)
      .then(r => {
        const data = Array.isArray(r.data) ? r.data.slice(0, 3) : [];
        _recentLikersCache.set(contentId, data);
        setLikers(data);
      })
      .catch(() => {});
  }, [active, likeCount, contentId, kind]);

  if (likers.length === 0) return null;

  return (
    <div className="absolute bottom-20 left-3 z-20 flex pointer-events-none">
      {likers.map((u, i) => (
        <div key={u.id} className="rounded-full overflow-hidden shrink-0"
          style={{
            width: 26, height: 26, marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i,
            border: '1.5px solid rgba(255,255,255,0.85)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}>
          {u.avatar_url
            ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold"
                style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
                {(u.display_name ?? u.username ?? '?')[0]?.toUpperCase()}
              </div>
          }
        </div>
      ))}
    </div>
  );
}

// ── Défilement des noms qui aiment — bas-gauche, monte et s'efface (style TikTok) ──
const _likeNamesCache = new Map<string, RecentLiker[]>();
const NAME_FEED_INTERVAL = 1400; // ms entre deux apparitions
const NAME_FEED_LIFETIME = 2600; // ms de vie d'une bulle (montée + fondu)

export function LikeNamesFeed({ active, likeCount, contentId, kind }: {
  active: boolean; likeCount: number; contentId: string; kind: 'reel' | 'story';
}) {
  const [names, setNames] = useState<RecentLiker[]>(() => _likeNamesCache.get(contentId) ?? []);
  const [queue, setQueue] = useState<{ key: number; liker: RecentLiker }[]>([]);
  const fetchedRef = useRef(false);
  const cursorRef = useRef(0);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!active || likeCount < HEART_RAIN_THRESHOLD || fetchedRef.current) return;
    fetchedRef.current = true;
    const url = kind === 'reel'
      ? `${Endpoints.social.reactionUsers}?reel_id=${contentId}&limit=10`
      : `${Endpoints.stories.likers(contentId)}?limit=10`;
    apiClient.get<RecentLiker[]>(url)
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : [];
        _likeNamesCache.set(contentId, data);
        setNames(data);
      })
      .catch(() => {});
  }, [active, likeCount, contentId, kind]);

  // Fait apparaître un nom à intervalle régulier, en boucle sur la liste récupérée
  useEffect(() => {
    if (!active || names.length === 0) return;
    const timer = setInterval(() => {
      const liker = names[cursorRef.current % names.length];
      cursorRef.current += 1;
      const key = seqRef.current++;
      setQueue(q => [...q, { key, liker }]);
      setTimeout(() => setQueue(q => q.filter(item => item.key !== key)), NAME_FEED_LIFETIME);
    }, NAME_FEED_INTERVAL);
    return () => clearInterval(timer);
  }, [active, names]);

  if (queue.length === 0) return null;

  return (
    <div className="absolute bottom-32 left-3 z-20 pointer-events-none" style={{ height: 140, width: 200 }}>
      {queue.map(({ key, liker }) => (
        <div key={key} className="absolute left-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            animation: `like-name-rise ${NAME_FEED_LIFETIME}ms ease-out forwards`,
            whiteSpace: 'nowrap',
          }}>
          <Heart size={11} fill="#E0389A" stroke="none" />
          <span className="text-white text-xs font-semibold truncate" style={{ maxWidth: 160 }}>
            {liker.display_name ?? liker.username ?? 'Quelqu\'un'}
          </span>
        </div>
      ))}
      <style>{`
        @keyframes like-name-rise {
          0%   { transform: translateY(0);     opacity: 0; }
          12%  { opacity: 1; }
          75%  { opacity: 1; }
          100% { transform: translateY(-130px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
