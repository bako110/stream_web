import { useState, useEffect, useRef, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';

// ── Constantes ────────────────────────────────────────────────────────────────

const HEART_COLORS = ['#EF4444','#F97316','#EAB308','#A855F7','#7B3FF2','#7B3FF2'];
const HEART_EMOJIS = ['❤️','🧡','💛','💜','💙','🩷'];
const REACTIONS    = ['❤️','😂','😮','😢','😡','🔥','👏','🎉'];

// ── Floating Heart ─────────────────────────────────────────────────────────────

interface HeartItem { id: number; color: string; emoji: string; x: number; }

function FloatingHearts({ hearts }: { hearts: HeartItem[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {hearts.map((h, i) => (
        <div key={h.id}
          className="absolute bottom-12 text-2xl"
          style={{
            left: `calc(50% + ${h.x}px)`,
            color: h.color,
            animation: `floatHeart ${900 + Math.random() * 400}ms ease-out forwards`,
            animationDelay: `${i * 60}ms`,
          }}>
          {h.emoji}
        </div>
      ))}
    </div>
  );
}

// ── LiveLikeButton ────────────────────────────────────────────────────────────

export function LiveLikeButton({
  liveId,
  initialCount = 0,
}: {
  liveId: string;
  initialCount?: number;
}) {
  const [count,   setCount]   = useState(initialCount);
  const [liked,   setLiked]   = useState(false);
  const [hearts,  setHearts]  = useState<HeartItem[]>([]);
  const [bumping, setBumping] = useState(false);
  const heartId  = useRef(0);
  const colorIdx = useRef(0);
  const inFlight = useRef(false);

  useEffect(() => { setCount(initialCount); }, [initialCount]);

  function spawnHeart() {
    const id  = ++heartId.current;
    const idx = colorIdx.current % HEART_COLORS.length;
    colorIdx.current++;
    setHearts(prev => [...prev.slice(-12), { id, color: HEART_COLORS[idx], emoji: HEART_EMOJIS[idx], x: (Math.random() - 0.5) * 60 }]);
    setTimeout(() => setHearts(prev => prev.filter(h => h.id !== id)), 1300);
  }

  async function handleLike() {
    if (inFlight.current) return;
    inFlight.current = true;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount(c => c + (wasLiked ? -1 : 1));
    setBumping(true);
    setTimeout(() => setBumping(false), 300);
    if (!wasLiked) spawnHeart();
    try {
      await apiClient.post(Endpoints.lives.like(liveId));
    } catch {
      // Rollback
      setLiked(wasLiked);
      setCount(c => c + (wasLiked ? 1 : -1));
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <div className="relative flex flex-col items-center gap-1">
      <FloatingHearts hearts={hearts} />
      <button onClick={handleLike}
        className="flex flex-col items-center gap-1 transition-all"
        style={{ transform: bumping ? 'scale(1.4)' : 'scale(1)', transition: 'transform 0.15s' }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
          style={{
            background: liked ? 'rgba(123,63,242,0.25)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${liked ? '#7B3FF2' : 'rgba(239,68,68,0.3)'}`,
            boxShadow: liked ? '0 0 12px rgba(123,63,242,0.4)' : 'none',
          }}>
          <Heart size={18} style={{ color: liked ? '#7B3FF2' : '#EF4444' }} fill={liked ? '#7B3FF2' : 'none'} />
        </div>
        <span className="text-white text-xs font-bold" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
          {count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count}
        </span>
      </button>
    </div>
  );
}

// ── Floating Emoji ────────────────────────────────────────────────────────────

interface EmojiFloat { id: number; emoji: string; x: number; size: number; }

// ── LiveReactionPicker ────────────────────────────────────────────────────────

// 3 colonnes fixes, espacement de 28px entre elles, centrées sur le bouton
const COLS = [-28, 0, 28];

export function LiveReactionPicker({
  liveId,
  onFloats,
}: {
  liveId: string;
  onFloats: (items: EmojiFloat[]) => void;
}) {
  const [open,       setOpen]       = useState(false);
  const [localFloats,setLocalFloats]= useState<EmojiFloat[]>([]);
  const floatId  = useRef(0);
  const colCursor = useRef(0);   // round-robin sur les 3 colonnes

  function spawnFloats(emoji: string) {
    // 1 emoji par colonne (3 au total), chaque appel décale d'une colonne
    const col = COLS[colCursor.current % COLS.length];
    colCursor.current++;
    const item: EmojiFloat = {
      id:    ++floatId.current,
      emoji,
      x:     col,
      size:  30,
    };
    setLocalFloats(prev => [...prev.slice(-15), item]);
    setTimeout(() => setLocalFloats(prev => prev.filter(x => x.id !== item.id)), 2000);
    onFloats([item]);
  }

  function handleReact(emoji: string) {
    setOpen(false);
    spawnFloats(emoji);
    apiClient.post(Endpoints.lives.react(liveId), { emoji }).catch(() => {});
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* Zone d'ascension — 3 colonnes alignées au-dessus du bouton */}
      <div className="pointer-events-none absolute bottom-14 left-1/2"
        style={{ width: 0, height: 0, overflow: 'visible' }}>
        {localFloats.map(f => (
          <div key={f.id}
            style={{
              position:  'absolute',
              bottom:    0,
              left:      f.x,
              fontSize:  f.size,
              transform: 'translateX(-50%)',
              animation: 'floatEmojiUp 1800ms cubic-bezier(0.22,1,0.36,1) forwards',
            }}>
            {f.emoji}
          </div>
        ))}
      </div>

      {/* Picker panel — s'ouvre à gauche du bouton */}
      {open && (
        <div className="absolute bottom-0 p-2 rounded-2xl z-50"
          style={{
            right:         '120%',
            background:    'rgba(0,0,0,0.82)',
            backdropFilter:'blur(16px)',
            border:        '1px solid rgba(255,255,255,0.18)',
            boxShadow:     '0 8px 32px rgba(0,0,0,0.5)',
            animation:     'slideInLeft 0.15s ease-out',
          }}>
          <div className="grid grid-cols-4 gap-1.5">
            {REACTIONS.map(e => (
              <button key={e} onClick={() => handleReact(e)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-all hover:scale-125 active:scale-95"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={() => setOpen(v => !v)}
        className="w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all"
        style={{ background: open ? 'rgba(123,63,242,0.3)' : 'rgba(255,255,255,0.12)', border: `1px solid ${open ? 'rgba(123,63,242,0.6)' : 'rgba(255,255,255,0.2)'}` }}>
        😊
      </button>
    </div>
  );
}

// ── FloatingEmojiOverlay — affiché dans le parent (réactions WS reçues) ────────

export function FloatingEmojiOverlay({ floats }: { floats: EmojiFloat[] }) {
  return (
    <div className="pointer-events-none absolute bottom-28 right-6"
      style={{ width: 0, height: 0, overflow: 'visible' }}>
      {floats.map((f, i) => (
        <div key={f.id}
          style={{
            position:  'absolute',
            bottom:    0,
            left:      COLS[i % COLS.length],
            fontSize:  30,
            transform: 'translateX(-50%)',
            animation: 'floatEmojiUp 1800ms cubic-bezier(0.22,1,0.36,1) forwards',
          }}>
          {f.emoji}
        </div>
      ))}
    </div>
  );
}

// ── CSS globale (à injecter une fois) ────────────────────────────────────────

export const LIVE_ANIMATIONS_CSS = `
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(10px) scale(0.95); }
  to   { opacity: 1; transform: translateX(0)    scale(1);    }
}
@keyframes floatHeart {
  0%   { transform: translateY(0) scale(0.8); opacity: 1; }
  100% { transform: translateY(-200px) scale(1.2); opacity: 0; }
}
@keyframes floatEmojiUp {
  0%   { transform: translateY(0) scale(0.8); opacity: 1; }
  80%  { opacity: 0.8; }
  100% { transform: translateY(-350px) scale(1.1); opacity: 0; }
}
@keyframes floatGiftUp {
  0%   { transform: translateY(0) scale(1); opacity: 1; }
  70%  { opacity: 1; }
  100% { transform: translateY(-300px) scale(1.3); opacity: 0; }
}
@keyframes slideInLeft {
  from { transform: translateX(-20px); opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}
@keyframes slideInRight {
  from { transform: translateX(20px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
@keyframes pulseLive {
  0%,100% { box-shadow: 0 0 0 0 rgba(123,63,242,0.4); }
  50%     { box-shadow: 0 0 0 6px rgba(123,63,242,0); }
}
@keyframes fadeInDown {
  from { transform: translate(-50%, -12px); opacity: 0; }
  to   { transform: translate(-50%, 0);    opacity: 1; }
}
`;

// ── LiveTimer ─────────────────────────────────────────────────────────────────

export function LiveTimer({ startedAt }: { startedAt?: string | null }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const base = startedAt ? Date.now() - new Date(startedAt).getTime() : 0;
    setElapsed(Math.floor(base / 1000));
    const iv = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(iv);
  }, [startedAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const str = h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

  return (
    <span className="text-xs font-mono text-white/70 bg-black/40 px-2 py-0.5 rounded-full">
      {str}
    </span>
  );
}
