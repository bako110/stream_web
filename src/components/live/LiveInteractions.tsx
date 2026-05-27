import { useState, useEffect, useRef, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';

// ── Constantes ────────────────────────────────────────────────────────────────

const HEART_COLORS = ['#EF4444','#F97316','#EAB308','#A855F7','#3B82F6','#EC4899'];
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
  const [hearts,  setHearts]  = useState<HeartItem[]>([]);
  const [bumping, setBumping] = useState(false);
  const heartId   = useRef(0);
  const batchRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batchCnt  = useRef(0);
  const colorIdx  = useRef(0);

  // Réception depuis WS
  const triggerRemote = useCallback(() => {
    setCount(c => c + 1);
    spawnHeart();
  }, []);

  // Expose sur ref si besoin — on retourne juste triggerRemote
  useEffect(() => {
    // Reset count si initialCount change
    setCount(initialCount);
  }, [initialCount]);

  function spawnHeart() {
    const id    = ++heartId.current;
    const idx   = colorIdx.current % HEART_COLORS.length;
    colorIdx.current++;
    const item: HeartItem = {
      id,
      color: HEART_COLORS[idx],
      emoji: HEART_EMOJIS[idx],
      x: (Math.random() - 0.5) * 60,
    };
    setHearts(prev => [...prev.slice(-12), item]);
    setTimeout(() => setHearts(prev => prev.filter(h => h.id !== id)), 1300);
  }

  function handleLike() {
    setCount(c => c + 1);
    setBumping(true);
    setTimeout(() => setBumping(false), 300);
    spawnHeart();

    // Batch les appels API — envoie toutes les 500ms
    batchCnt.current++;
    if (batchRef.current) clearTimeout(batchRef.current);
    batchRef.current = setTimeout(() => {
      apiClient.post(Endpoints.lives.like(liveId)).catch(() => {});
      batchCnt.current = 0;
    }, 500);
  }

  return (
    <div className="relative flex flex-col items-center gap-1">
      <FloatingHearts hearts={hearts} />
      <button onClick={handleLike}
        className="flex flex-col items-center gap-1 transition-all"
        style={{ transform: bumping ? 'scale(1.4)' : 'scale(1)', transition: 'transform 0.15s' }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <Heart size={18} style={{ color: '#EF4444' }} fill="#EF4444" />
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

export function LiveReactionPicker({
  liveId,
  onFloats,
}: {
  liveId: string;
  onFloats: (items: EmojiFloat[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const floatId = useRef(0);

  function spawnFloats(emoji: string) {
    const items: EmojiFloat[] = Array.from({ length: 8 }, () => ({
      id:    ++floatId.current,
      emoji,
      x:     Math.random() * 80 + 10,
      size:  Math.random() * 20 + 24,
    }));
    onFloats(items);
  }

  function handleReact(emoji: string) {
    setOpen(false);
    spawnFloats(emoji);
    apiClient.post(Endpoints.lives.react(liveId), { emoji }).catch(() => {});
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* Picker panel */}
      {open && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 p-2 rounded-2xl z-10"
          style={{
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}>
          <div className="grid grid-cols-4 gap-1.5">
            {REACTIONS.map(e => (
              <button key={e} onClick={() => handleReact(e)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-all hover:scale-125"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={() => setOpen(v => !v)}
        className="w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all"
        style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
        😊
      </button>
    </div>
  );
}

// ── FloatingEmojiOverlay — affiché dans le parent ────────────────────────────

export function FloatingEmojiOverlay({ floats }: { floats: EmojiFloat[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {floats.map(f => (
        <div key={f.id}
          className="absolute bottom-20"
          style={{
            left: `${f.x}%`,
            fontSize: f.size,
            animation: `floatEmojiUp ${1200 + Math.random() * 600}ms ease-out forwards`,
          }}>
          {f.emoji}
        </div>
      ))}
    </div>
  );
}

// ── CSS globale (à injecter une fois) ────────────────────────────────────────

export const LIVE_ANIMATIONS_CSS = `
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
  0%,100% { box-shadow: 0 0 0 0 rgba(240,54,90,0.4); }
  50%     { box-shadow: 0 0 0 6px rgba(240,54,90,0); }
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
