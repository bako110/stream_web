import { useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

interface Props {
  musicUrl: string;
  musicDuration: number;
  startSec: number;
  endSec: number;
  onChange: (startSec: number, endSec: number) => void;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Trim audio — même logique de poignées que TrimBar mais en secondes
 * directes (pas ratio) et SANS MAX_TRIM (le mobile n'en impose pas côté
 * musique), portage de ReelEditorScreen.tsx:1419-1441.
 */
export function MusicTrimBar({ musicUrl, musicDuration, startSec, endSec, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'left' | 'right' | null>(null);
  const [playing, setPlaying] = useState(false);
  const grantRef = useRef({ startSec: 0, endSec: 0, trackW: 0, startX: 0 });
  // HTMLAudioElement — objet impératif par nature (currentTime/play/pause),
  // volontairement géré via une ref plutôt qu'un state React (même pattern
  // que SoundPickerSheet.tsx dans ce projet). Le cleanup au démontage se fait
  // dans un handler dédié plutôt qu'un effet lisant la ref, pour rester
  // simple ; la pause au changement d'onglet/fermeture est gérée par l'appelant.
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function getAudio(): HTMLAudioElement {
    if (!audioRef.current) audioRef.current = new Audio(musicUrl);
    return audioRef.current;
  }

  function togglePreview() {
    const audio = getAudio();
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    audio.currentTime = startSec;
    audio.play().catch(() => {});
    setPlaying(true);
    const onTime = () => {
      if (audio.currentTime >= endSec) {
        audio.pause();
        setPlaying(false);
        audio.removeEventListener('timeupdate', onTime);
      }
    };
    audio.addEventListener('timeupdate', onTime);
  }

  function handlePointerDown(handle: 'left' | 'right', e: React.PointerEvent) {
    if (!trackRef.current || musicDuration <= 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    grantRef.current = {
      startSec, endSec,
      trackW: trackRef.current.getBoundingClientRect().width,
      startX: e.clientX,
    };
    setDragging(handle);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging || musicDuration <= 0) return;
    const { trackW, startX } = grantRef.current;
    if (trackW <= 0) return;
    const dxRatio = (e.clientX - startX) / trackW;
    const dxSec = dxRatio * musicDuration;

    if (dragging === 'left') {
      const newStart = clamp(grantRef.current.startSec + dxSec, 0, musicDuration);
      if (newStart < endSec - 1) onChange(newStart, endSec);
    } else {
      const newEnd = clamp(grantRef.current.endSec + dxSec, 0, musicDuration);
      if (newEnd > startSec + 1) onChange(startSec, newEnd);
    }
  }

  function handlePointerUp() {
    setDragging(null);
  }

  if (musicDuration <= 0) return null;

  const leftPct = (startSec / musicDuration) * 100;
  const rightPct = (1 - endSec / musicDuration) * 100;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
          {fmt(endSec - startSec)} sélectionnées
        </span>
        <button onClick={togglePreview} className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--primary)' }}>
          {playing ? <Pause size={13} /> : <Play size={13} />}
          {playing ? 'Pause' : 'Écouter'}
        </button>
      </div>
      <div
        ref={trackRef}
        className="relative h-10 rounded-lg overflow-hidden select-none"
        style={{ background: 'var(--bg-secondary)', touchAction: 'none' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="absolute top-0 bottom-0"
          style={{ left: `${leftPct}%`, right: `${rightPct}%`, background: 'rgba(123,63,242,0.3)', border: '2px solid var(--primary)' }}
        />
        <div
          className="absolute top-0 bottom-0 w-4 flex items-center justify-center cursor-ew-resize"
          style={{ left: `calc(${leftPct}% - 8px)`, background: 'var(--primary)', borderRadius: '6px 0 0 6px' }}
          onPointerDown={e => handlePointerDown('left', e)}
        >
          <div className="w-0.5 h-4 bg-white rounded-full" />
        </div>
        <div
          className="absolute top-0 bottom-0 w-4 flex items-center justify-center cursor-ew-resize"
          style={{ right: `calc(${rightPct}% - 8px)`, background: 'var(--primary)', borderRadius: '0 6px 6px 0' }}
          onPointerDown={e => handlePointerDown('right', e)}
        >
          <div className="w-0.5 h-4 bg-white rounded-full" />
        </div>
      </div>
    </div>
  );
}
