import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';

interface Friend {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface Props {
  entityId: string;
  kind: 'post' | 'concert' | 'event' | 'reel';
  totalLikes: number;
}

const AVATAR_SIZE = 20;
const OVERLAP = 12;

// Cache global — survit aux re-renders, évite les doublons entre instances
const _cache = new Map<string, Friend[]>();
// File d'attente pour limiter la concurrence (max 3 requêtes simultanées)
let _inFlight = 0;
const MAX_CONCURRENT = 3;
const _queue: Array<() => void> = [];

function runQueue() {
  while (_inFlight < MAX_CONCURRENT && _queue.length > 0) {
    const next = _queue.shift()!;
    next();
  }
}

export function FriendsWhoLiked({ entityId, kind, totalLikes }: Props) {
  const [friends, setFriends] = useState<Friend[] | null>(
    _cache.has(entityId) ? _cache.get(entityId)! : null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const fetchedRef   = useRef(false);

  useEffect(() => {
    // Déjà en cache — pas de requête
    if (_cache.has(entityId)) {
      setFriends(_cache.get(entityId)!);
      return;
    }
    if (fetchedRef.current) return;

    // IntersectionObserver — ne fetch que quand la carte entre dans le viewport
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        const doFetch = () => {
          _inFlight++;
          const endpoint = Endpoints.social_ext.friendsWhoLiked(kind, entityId);
          apiClient.get<Friend[]>(endpoint)
            .then(r => {
              const data = Array.isArray(r.data) ? r.data : [];
              _cache.set(entityId, data);
              setFriends(data);
            })
            .catch(() => {
              _cache.set(entityId, []);
              setFriends([]);
            })
            .finally(() => {
              _inFlight--;
              runQueue();
            });
        };

        if (_inFlight < MAX_CONCURRENT) {
          doFetch();
        } else {
          _queue.push(doFetch);
        }
      },
      { rootMargin: '100px' }, // prefetch légèrement avant que la carte soit visible
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [entityId, kind]);

  // Placeholder invisible pour l'IntersectionObserver même quand pas de données
  if (!friends || friends.length === 0) {
    return <div ref={containerRef} />;
  }

  const visible = friends.slice(0, 3);
  const avatarsWidth = (visible.length - 1) * OVERLAP + AVATAR_SIZE;
  const others = Math.max(0, totalLikes - friends.length);

  let label = '';
  if (friends.length === 1) {
    label = others > 0
      ? `${friends[0].display_name} et ${others} autre${others > 1 ? 's' : ''} aiment ceci`
      : `${friends[0].display_name} aime ceci`;
  } else if (friends.length >= 2) {
    label = others > 0
      ? `${friends[0].display_name} et ${friends.length - 1 + others} autres aiment ceci`
      : `${friends[0].display_name} et ${friends.length - 1} autre${friends.length > 2 ? 's' : ''} aiment ceci`;
  }

  return (
    <div ref={containerRef} className="flex items-center gap-1.5 px-3 pb-1" style={{ minWidth: 0 }}>
      {/* Avatars empilés */}
      <div className="shrink-0 relative" style={{ width: avatarsWidth, height: AVATAR_SIZE }}>
        {visible.map((f, i) => (
          <div
            key={f.id}
            className="absolute rounded-full overflow-hidden"
            style={{
              left: i * OVERLAP,
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              border: '1.5px solid var(--surface)',
              zIndex: visible.length - i,
            }}
          >
            {f.avatar_url ? (
              <img src={f.avatar_url} alt={f.display_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-[8px] font-bold"
                style={{ background: 'var(--primary)' }}>
                {f.display_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Texte */}
      <p className="text-xs truncate flex-1 min-w-0" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>
    </div>
  );
}
