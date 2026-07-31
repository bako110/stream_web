import { useState, useCallback } from 'react';
import {
  SlidersHorizontal, Sun, Type, Smile, PenLine, Music, Scissors, Gauge, X,
} from 'lucide-react';
import { ReelEditorCanvas } from './ReelEditorCanvas';
import { DraggableLayer } from './DraggableLayer';
import { FilterPicker } from './FilterPicker';
import { AdjustPanel } from './AdjustPanel';
import { TextPanel } from './TextPanel';
import { StickerPanel } from './StickerPanel';
import { DrawPanel } from './DrawPanel';
import { TrimBar } from './TrimBar';
import { SpeedPicker } from './SpeedPicker';
import { MusicTrimBar } from './MusicTrimBar';
import { SoundPickerSheet, SoundBar } from '../ui/SoundPickerSheet';
import { createDefaultEditState, MAX_TRIM } from './types';
import type { ReelEditState, TextLayer, StickerLayer } from './types';
import type { Sound } from '../../types';

type ToolKey = 'filter' | 'adjust' | 'text' | 'sticker' | 'draw' | 'music' | 'trim' | 'speed';

const TOOLS: { key: ToolKey; label: string; icon: typeof SlidersHorizontal }[] = [
  { key: 'trim', label: 'Découper', icon: Scissors },
  { key: 'filter', label: 'Filtre', icon: SlidersHorizontal },
  { key: 'adjust', label: 'Réglages', icon: Sun },
  { key: 'text', label: 'Texte', icon: Type },
  { key: 'sticker', label: 'Sticker', icon: Smile },
  { key: 'draw', label: 'Dessin', icon: PenLine },
  { key: 'music', label: 'Musique', icon: Music },
  { key: 'speed', label: 'Vitesse', icon: Gauge },
];

interface Props {
  mediaUrl: string;
  isPhoto: boolean;
  onChange: (edit: ReelEditState) => void;
}

const TEXT_LAYER_APPROX_W = 180;
const TEXT_LAYER_APPROX_H = 44;
const STICKER_APPROX_SIZE = 48;
// Durée fixe d'un reel-photo, alignée sur le mobile (uploadImageAsReel duration=5).
const PHOTO_REEL_DURATION_SEC = 5;

export function ReelEditor({ mediaUrl, isPhoto, onChange }: Props) {
  const [edit, setEdit] = useState<ReelEditState>(createDefaultEditState());
  const [durationSec, setDurationSec] = useState(isPhoto ? PHOTO_REEL_DURATION_SEC : 0);
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [drawColor, setDrawColor] = useState('#FFFFFF');
  const [drawWidth, setDrawWidth] = useState(6);
  const [sound, setSound] = useState<Sound | null>(null);
  const [soundOpen, setSoundOpen] = useState(false);

  const update = useCallback((patch: Partial<ReelEditState>) => {
    setEdit(prev => {
      const next = { ...prev, ...patch };
      onChange(next);
      return next;
    });
  }, [onChange]);

  function handleDurationLoaded(dur: number) {
    setDurationSec(dur);
    update({ endRatio: dur > MAX_TRIM ? MAX_TRIM / dur : 1 });
  }

  function handleDrawCommit(points: { x: number; y: number }[]) {
    const path = { id: `draw_${Date.now()}`, color: drawColor, width: drawWidth, points };
    update({ drawings: [...edit.drawings, path] });
  }

  function handleTextConfirm(layerData: Omit<TextLayer, 'id' | 'x' | 'y'>) {
    if (editingTextId) {
      update({ layers: edit.layers.map(l => l.id === editingTextId ? { ...l, ...layerData } : l) });
    } else {
      const newLayer: TextLayer = {
        ...layerData,
        id: `txt_${Date.now()}`,
        x: TEXT_LAYER_APPROX_W * -0.1,
        y: 160,
      };
      update({ layers: [...edit.layers, newLayer] });
    }
    setEditingTextId(null);
    setActiveTool(null);
  }

  function handleStickerPick(emoji: string) {
    const newSticker: StickerLayer = {
      id: `stk_${Date.now()}`,
      emoji, x: 140, y: 200, scale: 1,
    };
    update({ stickers: [...edit.stickers, newSticker] });
  }

  function handleSoundSelect(s: Sound | null) {
    setSound(s);
    if (!s) {
      update({ musicUrl: undefined, musicName: undefined, musicDuration: 0, musicStartSec: 0, musicEndSec: 0 });
      return;
    }
    const fileDur = s.duration_seconds ?? 30;
    const videoDur = durationSec > 0 ? (edit.endRatio - edit.startRatio) * durationSec : fileDur;
    const clip = Math.min(videoDur > 0 ? videoDur : fileDur, fileDur);
    update({
      musicUrl: s.file_url,
      musicName: `${s.title}${s.artist_name ? ` — ${s.artist_name}` : ''}`,
      musicDuration: fileDur,
      musicStartSec: 0,
      musicEndSec: clip,
    });
  }

  const editingLayer = editingTextId ? edit.layers.find(l => l.id === editingTextId) ?? null : null;
  // Découpage/Vitesse n'ont pas de sens sur une image fixe — même filtrage que
  // le mobile (ReelEditorScreen.tsx:1160 : TOOLS.filter(t => !isPhoto || ...)).
  const visibleTools = isPhoto ? TOOLS.filter(t => t.key !== 'trim' && t.key !== 'speed') : TOOLS;

  return (
    <div className="w-full">
      {/* Zone de preview */}
      <div className="relative mx-auto" style={{ aspectRatio: '9/16', maxHeight: 480, background: '#000' }}>
        <ReelEditorCanvas
          mediaUrl={mediaUrl}
          isPhoto={isPhoto}
          edit={edit}
          durationSec={durationSec}
          drawActive={activeTool === 'draw'}
          drawColor={drawColor}
          drawWidth={drawWidth}
          onDrawCommit={handleDrawCommit}
          onDurationLoaded={handleDurationLoaded}
        >
          {/* Couches interactives de drag/pinch, superposées au rendu reelFilters.tsx */}
          {edit.layers.map(l => (
            <div key={l.id} onDoubleClick={() => { setEditingTextId(l.id); setActiveTool('text'); }}>
              <DraggableLayer
                x={l.x} y={l.y}
                width={TEXT_LAYER_APPROX_W} height={TEXT_LAYER_APPROX_H}
                scale={l.fontSize / 28}
                selected={selectedLayerId === l.id}
                onSelect={() => setSelectedLayerId(l.id)}
                onCommit={(x, y, scale) => {
                  update({
                    layers: edit.layers.map(item => item.id === l.id
                      ? { ...item, x, y, fontSize: Math.round(28 * scale) }
                      : item),
                  });
                }}
              />
            </div>
          ))}
          {edit.stickers.map(st => (
            <DraggableLayer
              key={st.id}
              x={st.x} y={st.y}
              width={STICKER_APPROX_SIZE} height={STICKER_APPROX_SIZE}
              scale={st.scale}
              selected={selectedLayerId === st.id}
              onSelect={() => setSelectedLayerId(st.id)}
              onCommit={(x, y, scale) => {
                update({
                  stickers: edit.stickers.map(item => item.id === st.id ? { ...item, x, y, scale } : item),
                });
              }}
            />
          ))}
        </ReelEditorCanvas>
      </div>

      {/* Barre d'outils */}
      <div className="flex items-center gap-1 px-2 py-3 overflow-x-auto border-b" style={{ borderColor: 'var(--border)' }}>
        {visibleTools.map(t => {
          const active = activeTool === t.key;
          const hasMark =
            (t.key === 'filter' && edit.filter !== 'original') ||
            (t.key === 'text' && edit.layers.length > 0) ||
            (t.key === 'sticker' && edit.stickers.length > 0) ||
            (t.key === 'draw' && edit.drawings.length > 0) ||
            (t.key === 'music' && !!edit.musicUrl) ||
            (t.key === 'speed' && edit.speed !== 1) ||
            (t.key === 'adjust' && Object.values(edit.adjust).some(v => v !== 0));
          return (
            <button
              key={t.key}
              onClick={() => setActiveTool(active ? null : t.key)}
              className="shrink-0 flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl relative"
              style={{ background: active ? 'rgba(123,63,242,0.15)' : 'transparent' }}
            >
              <t.icon size={18} style={{ color: active ? 'var(--primary)' : 'var(--text-secondary)' }} />
              <span className="text-[10px] font-bold" style={{ color: active ? 'var(--primary)' : 'var(--text-secondary)' }}>
                {t.label}
              </span>
              {hasMark && !active && (
                <div className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--primary)' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Panneau actif */}
      {activeTool && (
        <div className="relative border-b" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => { setActiveTool(null); setEditingTextId(null); }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center z-10"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
          >
            <X size={14} />
          </button>

          {activeTool === 'trim' && (
            <TrimBar
              durationSec={durationSec}
              startRatio={edit.startRatio}
              endRatio={edit.endRatio}
              onChange={(startRatio, endRatio) => update({ startRatio, endRatio })}
            />
          )}
          {activeTool === 'filter' && (
            <FilterPicker filter={edit.filter} onChange={filter => update({ filter })} />
          )}
          {activeTool === 'adjust' && (
            <AdjustPanel adjust={edit.adjust} onChange={adjust => update({ adjust })} />
          )}
          {activeTool === 'text' && (
            <TextPanel
              key={editingTextId ?? 'new'}
              editing={editingLayer}
              onConfirm={handleTextConfirm}
              onCancel={() => { setEditingTextId(null); setActiveTool(null); }}
            />
          )}
          {activeTool === 'sticker' && <StickerPanel onPick={handleStickerPick} />}
          {activeTool === 'draw' && (
            <DrawPanel
              color={drawColor}
              width={drawWidth}
              hasDrawings={edit.drawings.length > 0}
              onColorChange={setDrawColor}
              onWidthChange={setDrawWidth}
              onUndo={() => update({ drawings: edit.drawings.slice(0, -1) })}
              onClear={() => update({ drawings: [] })}
            />
          )}
          {activeTool === 'music' && (
            <div className="px-4 py-3 space-y-3">
              <SoundBar sound={sound} onOpen={() => setSoundOpen(true)} onRemove={() => handleSoundSelect(null)} />
              {sound && edit.musicDuration > 0 && (
                <MusicTrimBar
                  musicUrl={sound.file_url}
                  musicDuration={edit.musicDuration}
                  startSec={edit.musicStartSec}
                  endSec={edit.musicEndSec}
                  onChange={(musicStartSec, musicEndSec) => update({ musicStartSec, musicEndSec })}
                />
              )}
            </div>
          )}
          {activeTool === 'speed' && (
            <SpeedPicker speed={edit.speed} onChange={speed => update({ speed })} />
          )}
        </div>
      )}

      <SoundPickerSheet
        open={soundOpen}
        onClose={() => setSoundOpen(false)}
        onSelect={handleSoundSelect}
        selected={sound}
      />
    </div>
  );
}
