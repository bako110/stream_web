// Structures de données portées de l'éditeur mobile (stream_mobile/src/screens/Create/ReelEditorScreen.tsx).
// Les noms de champs correspondent à ce que reelFilters.tsx attend déjà en lecture
// (ReelTextLayers/ReelStickerLayers/ReelDrawLayers/ReelVideoAdjust), pour garantir
// que l'aperçu d'édition et le rendu du feed produisent exactement le même résultat.

export type FilterKey =
  | 'original'
  | 'vivid' | 'drama' | 'noir' | 'fade'
  | 'warm' | 'cold' | 'golden' | 'rose'
  | 'neon' | 'cyber' | 'acid'
  | 'retro' | 'sepia' | 'vhs' | 'lomo';

export interface VideoAdjust {
  brightness: number;   // -1..1, défaut 0
  contrast: number;     // -1..1, défaut 0
  saturation: number;   // -1..1, défaut 0
  temperature: number;  // -1..1, défaut 0
}

export const DEFAULT_ADJUST: VideoAdjust = { brightness: 0, contrast: 0, saturation: 0, temperature: 0 };

export type TextFontKey = 'default' | 'bold' | 'thin' | 'mono' | 'serif';

export interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  bg: boolean;
  bgColor: string;
  align: 'left' | 'center' | 'right';
  font: TextFontKey;
  outline: boolean;
}

export interface StickerLayer {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
}

export interface DrawPoint { x: number; y: number; }

export interface DrawPath {
  id: string;
  color: string;
  width: number;
  points: DrawPoint[];
}

export interface ReelEditState {
  filter: FilterKey;
  adjust: VideoAdjust;
  layers: TextLayer[];
  stickers: StickerLayer[];
  drawings: DrawPath[];
  // Trim vidéo — ratios [0,1] relatifs à la durée totale. Comportement de preview
  // uniquement (le fichier n'est pas ré-encodé côté web, cf. plan) : pas envoyé
  // au backend en v1, seulement utilisé pour la boucle de lecture pendant l'édition.
  startRatio: number;
  endRatio: number;
  speed: number;
  musicUrl?: string;
  musicName?: string;
  musicDuration: number;
  musicStartSec: number;
  musicEndSec: number;
}

export const MAX_TRIM = 600; // 10 minutes, secondes — aligné sur le mobile

export const SPEEDS: { v: number; label: string }[] = [
  { v: 0.3, label: '0.3×' }, { v: 0.5, label: '0.5×' }, { v: 1.0, label: '1×' },
  { v: 1.5, label: '1.5×' }, { v: 2.0, label: '2×' },   { v: 3.0, label: '3×' },
];

export const STICKER_SETS: string[][] = [
  ['❤️', '🔥', '😂', '😍', '🙌', '💯', '👏', '🎉'],
  ['✨', '💫', '⭐', '🌟', '💥', '🎯', '🏆', '👑'],
  ['🎵', '🎶', '🎸', '🥁', '🎤', '🎧', '🎬', '🎞️'],
  ['🌈', '☀️', '🌙', '⚡', '❄️', '🌊', '🍀', '🦋'],
  ['😎', '🤩', '😈', '🤑', '🥺', '😤', '🤯', '🥳'],
];

export const DRAW_COLORS = [
  '#FFFFFF', '#FF3B30', '#FF9F0A', '#FFD60A', '#30D158',
  '#0A84FF', '#BF5AF2', '#FF375F', '#00F5FF', '#FF00FF',
];

export const DRAW_WIDTHS = [3, 6, 12, 20];

export function createDefaultEditState(): ReelEditState {
  return {
    filter: 'original',
    adjust: { ...DEFAULT_ADJUST },
    layers: [],
    stickers: [],
    drawings: [],
    startRatio: 0,
    endRatio: 1,
    speed: 1,
    musicDuration: 0,
    musicStartSec: 0,
    musicEndSec: 0,
  };
}
