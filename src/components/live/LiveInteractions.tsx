import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Heart, Smile } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';

// ── Constantes ────────────────────────────────────────────────────────────────

const HEART_COLORS = ['#EF4444','#F97316','#EAB308','#A855F7','#7B3FF2','#7B3FF2'];
const HEART_EMOJIS = ['❤️','🧡','💛','💜','💙','🩷'];
const REACTIONS    = [
  '❤️','😂','😮','😢','😡','🔥','👏','🎉',
  '😍','🤩','😎','🥳','🤣','💯','👍','💪',
  '🙌','✨','💥','🎊','🫶','😱','🤯','💀',
];

// ── Floating Heart ─────────────────────────────────────────────────────────────

interface HeartItem { id: number; color: string; emoji: string; x: number; }

function FloatingHearts({ hearts, isHost }: { hearts: HeartItem[]; isHost?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {hearts.map((h, i) => (
        <div key={h.id}
          className="absolute bottom-12"
          style={{
            left: `calc(50% + ${h.x}px)`,
            color: h.color,
            fontSize: isHost ? 30 : 22,
            filter: isHost ? 'drop-shadow(0 0 6px rgba(251,191,36,0.7))' : undefined,
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

const HOST_HEART_COLOR = '#FBBF24';
const HOST_HEART_EMOJI = '💛';

export interface LiveLikeButtonRef {
  /** Déclenche un like — appelable depuis le bouton ou un tap ailleurs sur l'écran (zone vidéo). */
  trigger: () => void;
  /** Anime un coeur venant d'un autre utilisateur, sans appeler l'API (pas de trigger). */
  triggerRemote: () => void;
  /** Aligne le compteur sur le total envoyé par le serveur (source de vérité, évite toute dérive). */
  setRemoteTotal: (total: number) => void;
}

const LIKE_BATCH_DELAY_MS = 500;

export const LiveLikeButton = forwardRef<LiveLikeButtonRef, {
  liveId: string;
  initialCount?: number;
  isHost?: boolean;
}>(function LiveLikeButton({ liveId, initialCount = 0, isHost = false }, ref) {
  const [count,   setCount]   = useState(initialCount);
  const [hearts,  setHearts]  = useState<HeartItem[]>([]);
  const [bumping, setBumping] = useState(false);
  const heartId       = useRef(0);
  const colorIdx      = useRef(0);
  const pendingLikes  = useRef(0);
  const likeThrottle  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setCount(initialCount); }, [initialCount]);

  function spawnHeart() {
    const id  = ++heartId.current;
    if (isHost) {
      setHearts(prev => [...prev.slice(-12), { id, color: HOST_HEART_COLOR, emoji: HOST_HEART_EMOJI, x: (Math.random() - 0.5) * 60 }]);
    } else {
      const idx = colorIdx.current % HEART_COLORS.length;
      colorIdx.current++;
      setHearts(prev => [...prev.slice(-12), { id, color: HEART_COLORS[idx], emoji: HEART_EMOJIS[idx], x: (Math.random() - 0.5) * 60 }]);
    }
    setTimeout(() => setHearts(prev => prev.filter(h => h.id !== id)), 1300);
  }

  // Comme sur mobile : chaque tap est instantané visuellement (coeur + compteur), mais
  // les appels API sont groupés — un seul POST toutes les 500ms avec le total accumulé,
  // plutôt qu'une requête par tap (permet de tapoter très vite sans spammer le serveur).
  const trigger = useCallback(() => {
    pendingLikes.current += 1;
    setCount(c => c + 1);
    setBumping(true);
    setTimeout(() => setBumping(false), 200);
    spawnHeart();
    if (likeThrottle.current) return;
    likeThrottle.current = setTimeout(async () => {
      const batch = pendingLikes.current;
      pendingLikes.current = 0;
      likeThrottle.current = null;
      try { await apiClient.post(Endpoints.lives.like(liveId), { count: batch }); } catch {}
    }, LIKE_BATCH_DELAY_MS);
  }, [liveId, isHost]);

  // Like reçu d'un autre viewer via WebSocket — anime le bouton sans re-déclencher
  // d'appel API (sinon on rejouerait un like à chaque écho reçu).
  const triggerRemote = useCallback(() => {
    setBumping(true);
    setTimeout(() => setBumping(false), 200);
    spawnHeart();
  }, [isHost]);

  const setRemoteTotal = useCallback((total: number) => {
    setCount(total);
  }, []);

  useImperativeHandle(ref, () => ({ trigger, triggerRemote, setRemoteTotal }), [trigger, triggerRemote, setRemoteTotal]);

  return (
    <div className="relative flex flex-col items-center gap-1">
      <FloatingHearts hearts={hearts} isHost={isHost} />
      <button onClick={trigger}
        className="flex flex-col items-center gap-0.5 transition-all"
        style={{ transform: bumping ? (isHost ? 'scale(1.55)' : 'scale(1.4)') : 'scale(1)', transition: 'transform 0.15s' }}>
        <div className={isHost ? 'w-8 h-8 rounded-full flex items-center justify-center transition-all' : 'w-7 h-7 rounded-full flex items-center justify-center transition-all'}
          style={{
            background: isHost ? 'rgba(251,191,36,0.22)' : 'rgba(239,68,68,0.15)',
            border: `1.5px solid ${isHost ? '#FBBF24' : 'rgba(239,68,68,0.3)'}`,
            boxShadow: isHost ? '0 0 14px rgba(251,191,36,0.5)' : 'none',
          }}>
          <Heart size={isHost ? 15 : 13} style={{ color: isHost ? '#FBBF24' : '#EF4444' }} fill="none" />
        </div>
        <span className="text-white text-[9px] font-bold" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
          {count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count}
        </span>
      </button>
    </div>
  );
});

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
  const [btnRect,    setBtnRect]    = useState<DOMRect | null>(null);
  const btnRef    = useRef<HTMLButtonElement>(null);
  const floatId   = useRef(0);
  const colCursor = useRef(0);

  function spawnFloats(emoji: string) {
    const col = COLS[colCursor.current % COLS.length];
    colCursor.current++;
    const item: EmojiFloat = { id: ++floatId.current, emoji, x: col, size: 30 };
    setLocalFloats(prev => [...prev.slice(-15), item]);
    setTimeout(() => setLocalFloats(prev => prev.filter(x => x.id !== item.id)), 2000);
    onFloats([item]);
  }

  function handleReact(emoji: string) {
    setOpen(false);
    spawnFloats(emoji);
    apiClient.post(Endpoints.lives.react(liveId), { emoji }).catch(() => {});
  }

  function handleToggle() {
    if (!open && btnRef.current) {
      setBtnRect(btnRef.current.getBoundingClientRect());
    }
    setOpen(v => !v);
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* Zone d'ascension */}
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

      {/* Picker panel — fixed, positionné à gauche du bouton */}
      {open && btnRect && (
        <div className="p-2 rounded-2xl"
          style={{
            position:      'fixed',
            top:           btnRect.top,
            right:         window.innerWidth - btnRect.left + 8,
            zIndex:        9999,
            background:    'rgba(0,0,0,0.88)',
            backdropFilter:'blur(16px)',
            border:        '1px solid rgba(255,255,255,0.18)',
            boxShadow:     '0 8px 32px rgba(0,0,0,0.6)',
            animation:     'slideInLeft 0.15s ease-out',
          }}>
          <div className="grid grid-cols-6 gap-1.5">
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

      <button ref={btnRef} onClick={handleToggle}
        className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
        style={{ background: open ? 'rgba(123,63,242,0.3)' : 'rgba(255,255,255,0.12)', border: `1px solid ${open ? 'rgba(123,63,242,0.6)' : 'rgba(255,255,255,0.2)'}`, color: open ? '#7B3FF2' : '#fff' }}>
        <Smile size={18} />
      </button>
    </div>
  );
}

// ── FloatingEmojiOverlay — affiché dans le parent (réactions WS reçues) ────────

export function FloatingEmojiOverlay({ floats }: { floats: EmojiFloat[] }) {
  return (
    <div className="pointer-events-none absolute bottom-28 right-6 z-40"
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

// ── LiveHeartsOverlay — coeurs des likes reçus, même trajectoire que le mobile ──

export interface LiveHeartsOverlayRef {
  spawn: (count?: number) => void;
}

interface RisingHeart { id: number; size: number; duration: number; driftX: number; }

/**
 * Coeurs qui montent depuis le bas-droite de l'écran vers le haut, façon TikTok
 * Live, avec une dérive latérale vers la gauche — reproduit fidèlement l'animation
 * mobile (LiveHeartsOverlay.tsx côté RN) plutôt que le zigzag symétrique utilisé
 * pour les réactions emoji (FloatingEmojiOverlay), pour que le rendu soit identique
 * entre web et mobile quand un like est reçu d'un autre viewer.
 */
export const LiveHeartsOverlay = forwardRef<LiveHeartsOverlayRef>((_props, ref) => {
  const [hearts, setHearts] = useState<RisingHeart[]>([]);
  const nextId = useRef(0);

  const spawnOne = useCallback((delayMs: number) => {
    setTimeout(() => {
      const id = nextId.current++;
      const heart: RisingHeart = {
        id,
        size: 22 + Math.random() * 12,
        duration: 1700 + Math.random() * 400,
        driftX: -(30 + Math.random() * 90),
      };
      setHearts(prev => [...prev.slice(-8), heart]);
      setTimeout(() => setHearts(prev => prev.filter(h => h.id !== id)), heart.duration + 100);
    }, delayMs);
  }, []);

  const spawn = useCallback((count: number = 1) => {
    const n = Math.min(count, 3);
    for (let i = 0; i < n; i++) spawnOne(i * 90);
  }, [spawnOne]);

  useImperativeHandle(ref, () => ({ spawn }), [spawn]);

  return (
    <div className="pointer-events-none absolute z-40" style={{ bottom: 90, right: 24, width: 10, height: 10, overflow: 'visible' }}>
      {hearts.map(h => (
        <span key={h.id}
          style={{
            position: 'absolute', left: -18, top: -18, width: 36, height: 36,
            fontSize: h.size, textAlign: 'center', lineHeight: '36px',
            animation: `liveHeartRise ${h.duration}ms cubic-bezier(0.22,1,0.36,1) forwards`,
            // @ts-expect-error custom property lue par le keyframe via var()
            '--drift-x': `${h.driftX}px`,
          }}>
          💗
        </span>
      ))}
    </div>
  );
});

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
/* Coeurs des likes reçus (LiveHeartsOverlay) — montée depuis le bas-droite avec
   dérive continue vers la gauche, sans zigzag, comme sur mobile. Déplacement en
   pixels absolus (pas de %, qui se base sur la taille de l'élément lui-même —
   36px ici — et rendait la montée quasi invisible : ~25px de trajet total). */
@keyframes liveHeartRise {
  0%   { transform: translate(0, 0) scale(0);   opacity: 1; }
  15%  { transform: translate(calc(var(--drift-x) * 0.2), -70px) scale(1); }
  100% { transform: translate(var(--drift-x), -320px) scale(1); opacity: 0; }
}
/* Trajectoire avec léger zigzag latéral façon TikTok — au lieu d'une ligne
   droite, le cœur/emoji "serpente" légèrement en montant pour un rendu
   plus organique quand plusieurs réactions montent en même temps. */
@keyframes floatEmojiUp {
  0%   { transform: translate(0, 0)        scale(0.6); opacity: 0; }
  8%   { opacity: 1; }
  25%  { transform: translate(-14px, -90px)  scale(1.05); }
  50%  { transform: translate(10px, -180px)  scale(1);   }
  75%  { transform: translate(-8px, -270px)  scale(0.95); opacity: 0.85; }
  100% { transform: translate(6px, -360px)   scale(0.85); opacity: 0; }
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
@keyframes chatMsgIn {
  0%   { opacity: 0; transform: translateY(22px) scale(0.9); }
  60%  { opacity: 1; transform: translateY(-2px) scale(1.02); }
  100% { opacity: 1; transform: translateY(0)    scale(1);   }
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
