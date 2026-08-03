import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  X, ChevronLeft, Send, Type, ImageIcon, Video, Music,
  Pencil, Smile, Square, Undo2, Trash2, Bold, AlignCenter,
  AlignLeft, AlignRight, Users, Lock, UserX, Check, ZoomIn,
} from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { uploadVideoHls } from '../api/uploadVideo';
import { SoundPickerSheet, SoundBar } from '../components/ui/SoundPickerSheet';
import type { Sound } from '../types';
import { Spinner } from '../components/ui/Spinner';
import { extractApiErrorMessage } from '../utils/apiError';

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'pick' | 'text' | 'image' | 'video';
type Tool = 'select' | 'text' | 'sticker' | 'draw' | 'mask';
type AudienceType = 'everyone' | 'selected' | 'except';
type Align = 'left' | 'center' | 'right';

interface TextLayer {
  id: string;
  text: string;
  color: string;
  bg: boolean;
  bgColor: string;
  fontSize: number;
  x: number; // 0-1 ratio
  y: number; // 0-1 ratio
  bold: boolean;
  align: Align;
  rotation: number;
  scale: number;
}

interface StickerLayer {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface DrawPath {
  id: string;
  d: string;
  color: string;
  width: number;
}

interface MaskLayer {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  opacity: number;
}

interface CropRect {
  x: number; // px on canvas
  y: number;
  w: number;
  h: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CANVAS_W = 390;
const CANVAS_H = 692; // 9:16 ratio approx

const PALETTE = [
  '#FFFFFF','#000000','#FF3B30','#FF9500','#FFCC00',
  '#34C759','#00C7BE','#32ADE6','#007AFF','#5856D6',
  '#AF52DE','#FF2D55','#A2845E','#636366',
];

const DRAW_COLORS = ['#FFFFFF','#000000','#FF3B30','#FF9500','#FFCC00','#34C759','#007AFF','#AF52DE','#FF2D55'];
const DRAW_WIDTHS = [3, 6, 10, 16];

const STICKERS = [
  '😂','😍','🔥','💯','👏','🎉','😎','💪','🙌','❤️',
  '💀','😭','🤣','✨','🥰','😤','🤩','😱','💥','🎊',
  '🫶','🧠','💫','👀','🤯','😜','🥳','💜','🖤','🤍',
];

const BG_COLORS = [
  'linear-gradient(135deg,#7B3FF2,#5B2EC4)',
  'linear-gradient(135deg,#FF3B30,#FF9500)',
  'linear-gradient(135deg,#34C759,#00C7BE)',
  'linear-gradient(135deg,#007AFF,#32ADE6)',
  'linear-gradient(135deg,#FF2D55,#AF52DE)',
  'linear-gradient(135deg,#1C1C1E,#3A3A3C)',
  'linear-gradient(135deg,#FFCC00,#FF9500)',
  '#1C1C1E','#FFFFFF','#007AFF',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function catmullRomToBezier(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ToolbarBtn({
  active, onClick, children, title,
}: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="w-10 h-10 flex items-center justify-center rounded-xl transition-all"
      style={{
        background: active ? 'rgba(123,63,242,0.9)' : 'rgba(255,255,255,0.15)',
        color: '#fff',
        backdropFilter: 'blur(6px)',
        border: active ? '1px solid rgba(123,63,242,1)' : '1px solid rgba(255,255,255,0.2)',
      }}
    >
      {children}
    </button>
  );
}

// ── Crop Tool ─────────────────────────────────────────────────────────────────

interface CropToolProps {
  imgSrc: string;
  onDone: (cropped: string) => void;
  onCancel: () => void;
}

function CropTool({ imgSrc, onDone, onCancel }: CropToolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // crop rect in display pixels
  const [crop, setCrop] = useState<CropRect>({ x: 40, y: 80, w: CANVAS_W - 80, h: CANVAS_H - 160 });
  const dragState = useRef<{ corner: string; startX: number; startY: number; startCrop: CropRect } | null>(null);

  // draw image + overlay
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      drawCrop(ctx, img, crop, canvas.width, canvas.height);
    };
    img.src = imgSrc;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawCrop(ctx, imgRef.current, crop, canvas.width, canvas.height);
  }, [crop]);

  function drawCrop(ctx: CanvasRenderingContext2D, img: HTMLImageElement, c: CropRect, w: number, h: number) {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    // dark overlay outside crop
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, w, c.y);
    ctx.fillRect(0, c.y + c.h, w, h - c.y - c.h);
    ctx.fillRect(0, c.y, c.x, c.h);
    ctx.fillRect(c.x + c.w, c.y, w - c.x - c.w, c.h);
    // border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    // handles
    const hs = 12;
    const corners = [
      [c.x, c.y], [c.x + c.w, c.y],
      [c.x, c.y + c.h], [c.x + c.w, c.y + c.h],
    ];
    ctx.fillStyle = '#fff';
    for (const [hx, hy] of corners) {
      ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
    }
    // edge midpoints
    const mids = [
      [c.x + c.w / 2, c.y], [c.x + c.w / 2, c.y + c.h],
      [c.x, c.y + c.h / 2], [c.x + c.w, c.y + c.h / 2],
    ];
    for (const [hx, hy] of mids) {
      ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
    }
  }

  function getCorner(x: number, y: number, c: CropRect): string | null {
    const HIT = 20;
    const check = (cx: number, cy: number, name: string) =>
      Math.abs(x - cx) < HIT && Math.abs(y - cy) < HIT ? name : null;
    return (
      check(c.x, c.y, 'tl') ||
      check(c.x + c.w, c.y, 'tr') ||
      check(c.x, c.y + c.h, 'bl') ||
      check(c.x + c.w, c.y + c.h, 'br') ||
      check(c.x + c.w / 2, c.y, 'tm') ||
      check(c.x + c.w / 2, c.y + c.h, 'bm') ||
      check(c.x, c.y + c.h / 2, 'ml') ||
      check(c.x + c.w, c.y + c.h / 2, 'mr') ||
      null
    );
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const corner = getCorner(x, y, crop);
    if (corner) {
      dragState.current = { corner, startX: x, startY: y, startCrop: { ...crop } };
      canvas.setPointerCapture(e.pointerId);
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragState.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const dx = x - dragState.current.startX;
    const dy = y - dragState.current.startY;
    const sc = dragState.current.startCrop;
    const MIN = 60;
    let { x: cx, y: cy, w: cw, h: ch } = sc;
    const corner = dragState.current.corner;
    if (corner === 'tl') { cx = sc.x + dx; cy = sc.y + dy; cw = sc.w - dx; ch = sc.h - dy; }
    else if (corner === 'tr') { cw = sc.w + dx; cy = sc.y + dy; ch = sc.h - dy; }
    else if (corner === 'bl') { cx = sc.x + dx; cw = sc.w - dx; ch = sc.h + dy; }
    else if (corner === 'br') { cw = sc.w + dx; ch = sc.h + dy; }
    else if (corner === 'tm') { cy = sc.y + dy; ch = sc.h - dy; }
    else if (corner === 'bm') { ch = sc.h + dy; }
    else if (corner === 'ml') { cx = sc.x + dx; cw = sc.w - dx; }
    else if (corner === 'mr') { cw = sc.w + dx; }
    if (cw < MIN) { cw = MIN; }
    if (ch < MIN) { ch = MIN; }
    cx = Math.max(0, Math.min(cx, canvas.width - cw));
    cy = Math.max(0, Math.min(cy, canvas.height - ch));
    setCrop({ x: cx, y: cy, w: cw, h: ch });
  }

  function onPointerUp() { dragState.current = null; }

  function applyCrop() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const scaleX = img.naturalWidth / canvas.width;
    const scaleY = img.naturalHeight / canvas.height;
    const out = document.createElement('canvas');
    out.width = Math.round(crop.w * scaleX);
    out.height = Math.round(crop.h * scaleY);
    const ctx = out.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, crop.x * scaleX, crop.y * scaleY, crop.w * scaleX, crop.h * scaleY, 0, 0, out.width, out.height);
    onDone(out.toDataURL('image/jpeg', 0.92));
  }

  return (
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-between bg-black">
      <div className="flex items-center w-full px-4 py-3 gap-3">
        <button onClick={onCancel} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}>
          <ChevronLeft size={18} />
        </button>
        <p className="flex-1 text-white font-bold text-sm text-center">Recadrer</p>
        <button onClick={applyCrop}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm text-white"
          style={{ background: '#7B3FF2' }}>
          <Check size={14} /> OK
        </button>
      </div>
      <div ref={containerRef} className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ maxWidth: '100%', maxHeight: '100%', touchAction: 'none', cursor: 'crosshair' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      </div>
      <div className="h-8" />
    </div>
  );
}

// ── Main Editor ───────────────────────────────────────────────────────────────

export default function StoryEditorPage() {
  const navigate = useNavigate();

  // ── Stage ──
  const [mode, setMode] = useState<Mode>('pick');
  const [tool, setTool] = useState<Tool>('select');

  // ── Media ──
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaSrc, setMediaSrc] = useState<string | null>(null); // after crop
  const [rawSrc, setRawSrc] = useState<string | null>(null);     // before crop
  const [showCrop, setShowCrop] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Text mode bg ──
  const [bgGrad, setBgGrad] = useState(BG_COLORS[0]);

  // ── Layers ──
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [stickers, setStickers] = useState<StickerLayer[]>([]);
  const [drawPaths, setDrawPaths] = useState<DrawPath[]>([]);
  const [masks, setMasks] = useState<MaskLayer[]>([]);

  // ── Undo stack ──
  const undoStack = useRef<{ textLayers: TextLayer[]; stickers: StickerLayer[]; drawPaths: DrawPath[]; masks: MaskLayer[] }[]>([]);
  function pushUndo() {
    undoStack.current.push({ textLayers: [...textLayers], stickers: [...stickers], drawPaths: [...drawPaths], masks: [...masks] });
    if (undoStack.current.length > 30) undoStack.current.shift();
  }
  function undo() {
    const last = undoStack.current.pop();
    if (!last) return;
    setTextLayers(last.textLayers);
    setStickers(last.stickers);
    setDrawPaths(last.drawPaths);
    setMasks(last.masks);
  }

  // ── Selected layer ──
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Text editor panel ──
  const [editingText, setEditingText] = useState<TextLayer | null>(null);

  // ── Draw tool state ──
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0]);
  const [drawWidth, setDrawWidth] = useState(DRAW_WIDTHS[1]);
  const drawingRef = useRef(false);
  const currentPts = useRef<[number, number][]>([]);
  const currentPathId = useRef<string>('');

  // ── Mask tool state ──
  const maskStartRef = useRef<{ x: number; y: number } | null>(null);
  const [maskColor, setMaskColor] = useState('#000000');

  // ── Sticker picker ──
  const [showStickerPicker, setShowStickerPicker] = useState(false);

  // ── Sound ──
  const [sound, setSound] = useState<Sound | null>(null);
  const [soundOpen, setSoundOpen] = useState(false);

  // ── Audience ──
  const [audience, setAudience] = useState<AudienceType>('everyone');
  const [showAudience, setShowAudience] = useState(false);

  // ── Caption ──
  const [caption, setCaption] = useState('');

  // ── Publishing ──
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  // ── Canvas ref for overlay rendering ──
  const overlayRef = useRef<SVGSVGElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);

  // ── Drag state for layers ──
  const dragLayerRef = useRef<{ id: string; type: 'text' | 'sticker' | 'mask'; startX: number; startY: number; startLX: number; startLY: number } | null>(null);

  // ── Text color / style state ──
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textBg, setTextBg] = useState(false);
  const [textBold, setTextBold] = useState(false);
  const [textAlign, setTextAlign] = useState<Align>('center');
  const [textFontSize, setTextFontSize] = useState(28);

  // ── Pick media file ──────────────────────────────────────────────────────

  function pickFile(type: 'image' | 'video') {
    if (fileRef.current) {
      fileRef.current.accept = type === 'image' ? 'image/*' : 'video/*';
      fileRef.current.click();
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setMediaFile(f);
    const url = URL.createObjectURL(f);
    if (f.type.startsWith('image/')) {
      setRawSrc(url);
      setShowCrop(true);
      setMode('image');
    } else {
      setMediaSrc(url);
      setMode('video');
    }
    e.target.value = '';
  }

  // ── Crop done ────────────────────────────────────────────────────────────

  function onCropDone(dataUrl: string) {
    setMediaSrc(dataUrl);
    setShowCrop(false);
  }

  // ── Canvas event helpers ─────────────────────────────────────────────────

  function getCanvasXY(e: React.PointerEvent | React.MouseEvent): [number, number] {
    const el = canvasAreaRef.current;
    if (!el) return [0, 0];
    const rect = el.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width),
      ((e.clientY - rect.top) / rect.height),
    ];
  }

  function getCanvasXYRaw(e: React.PointerEvent): [number, number] {
    const el = canvasAreaRef.current;
    if (!el) return [0, 0];
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width * CANVAS_W;
    const py = (e.clientY - rect.top) / rect.height * CANVAS_H;
    return [px, py];
  }

  // ── Pointer events on canvas ─────────────────────────────────────────────

  function onCanvasPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (tool === 'draw') {
      drawingRef.current = true;
      const [px, py] = getCanvasXYRaw(e);
      currentPts.current = [[px, py]];
      currentPathId.current = uid();
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      return;
    }
    if (tool === 'mask') {
      const [rx, ry] = getCanvasXY(e);
      maskStartRef.current = { x: rx, y: ry };
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      return;
    }
    setSelectedId(null);
  }

  function onCanvasPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (tool === 'draw' && drawingRef.current) {
      const [px, py] = getCanvasXYRaw(e);
      currentPts.current.push([px, py]);
      // update live path
      const d = catmullRomToBezier(currentPts.current);
      setDrawPaths(prev => {
        const exists = prev.find(p => p.id === currentPathId.current);
        if (exists) return prev.map(p => p.id === currentPathId.current ? { ...p, d } : p);
        return [...prev, { id: currentPathId.current, d, color: drawColor, width: drawWidth }];
      });
      return;
    }
    if (tool === 'mask' && maskStartRef.current) {
      // preview handled via state below
    }
  }

  function onCanvasPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (tool === 'draw' && drawingRef.current) {
      drawingRef.current = false;
      if (currentPts.current.length > 1) {
        pushUndo();
      } else {
        // single dot — remove
        setDrawPaths(prev => prev.filter(p => p.id !== currentPathId.current));
      }
      currentPts.current = [];
      return;
    }
    if (tool === 'mask' && maskStartRef.current) {
      const [rx, ry] = getCanvasXY(e);
      const sx = maskStartRef.current.x;
      const sy = maskStartRef.current.y;
      const mx = Math.min(sx, rx);
      const my = Math.min(sy, ry);
      const mw = Math.abs(rx - sx);
      const mh = Math.abs(ry - sy);
      if (mw > 0.02 && mh > 0.02) {
        pushUndo();
        setMasks(prev => [...prev, { id: uid(), x: mx, y: my, w: mw, h: mh, color: maskColor, opacity: 0.85 }]);
      }
      maskStartRef.current = null;
      return;
    }
  }

  // ── Layer drag ───────────────────────────────────────────────────────────

  function onLayerPointerDown(
    e: React.PointerEvent<HTMLDivElement>,
    id: string,
    type: 'text' | 'sticker' | 'mask',
    lx: number,
    ly: number,
  ) {
    if (tool !== 'select') return;
    e.stopPropagation();
    setSelectedId(id);
    dragLayerRef.current = { id, type, startX: e.clientX, startY: e.clientY, startLX: lx, startLY: ly };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }

  function onLayerPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const ds = dragLayerRef.current;
    if (!ds) return;
    const el = canvasAreaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - ds.startX) / rect.width;
    const dy = (e.clientY - ds.startY) / rect.height;
    const nx = Math.max(0, Math.min(1, ds.startLX + dx));
    const ny = Math.max(0, Math.min(1, ds.startLY + dy));
    if (ds.type === 'text') {
      setTextLayers(prev => prev.map(l => l.id === ds.id ? { ...l, x: nx, y: ny } : l));
    } else if (ds.type === 'sticker') {
      setStickers(prev => prev.map(s => s.id === ds.id ? { ...s, x: nx, y: ny } : s));
    } else if (ds.type === 'mask') {
      setMasks(prev => prev.map(m => m.id === ds.id ? { ...m, x: nx, y: ny } : m));
    }
  }

  function onLayerPointerUp() {
    dragLayerRef.current = null;
  }

  // ── Add text layer ───────────────────────────────────────────────────────

  function addTextLayer(text: string) {
    if (!text.trim()) return;
    pushUndo();
    const layer: TextLayer = {
      id: uid(),
      text: text.trim(),
      color: textColor,
      bg: textBg,
      bgColor: 'rgba(0,0,0,0.5)',
      fontSize: textFontSize,
      x: 0.5,
      y: 0.4,
      bold: textBold,
      align: textAlign,
      rotation: 0,
      scale: 1,
    };
    setTextLayers(prev => [...prev, layer]);
    setEditingText(null);
    setTool('select');
    setSelectedId(layer.id);
  }

  // ── Add sticker ──────────────────────────────────────────────────────────

  function addSticker(emoji: string) {
    pushUndo();
    setStickers(prev => [...prev, { id: uid(), emoji, x: 0.5, y: 0.5, scale: 1, rotation: 0 }]);
    setShowStickerPicker(false);
    setTool('select');
  }

  // ── Delete selected ──────────────────────────────────────────────────────

  function deleteSelected() {
    if (!selectedId) return;
    pushUndo();
    setTextLayers(prev => prev.filter(l => l.id !== selectedId));
    setStickers(prev => prev.filter(s => s.id !== selectedId));
    setMasks(prev => prev.filter(m => m.id !== selectedId));
    setDrawPaths(prev => prev.filter(d => d.id !== selectedId));
    setSelectedId(null);
  }

  // ── Build overlays_json ──────────────────────────────────────────────────

  function buildOverlaysJson(): string | undefined {
    if (!textLayers.length && !drawPaths.length && !masks.length && !stickers.length) return undefined;
    return JSON.stringify({ textLayers, drawPaths, masks, stickers });
  }

  // ── Publish ──────────────────────────────────────────────────────────────

  async function publish() {
    setUploading(true);
    try {
      let media_url: string | undefined;
      let thumbnail_url: string | undefined;
      let duration_sec = 5;
      const overlays_json = buildOverlaysJson();

      if (mode === 'text') {
        // render canvas
        const canvas = document.createElement('canvas');
        canvas.width = 1080; canvas.height = 1920;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // draw gradient bg
          const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
          // simple fallback solid
          ctx.fillStyle = '#7B3FF2';
          ctx.fillRect(0, 0, 1080, 1920);
        }
        // upload as image
        const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.9));
        if (blob) {
          const fd = new FormData();
          fd.append('file', blob, 'story_text.jpg');
          const res = await apiClient.upload<any>(Endpoints.upload.images('stories'), fd);
          const uploaded = res.data?.uploaded?.[0] ?? res.data;
          media_url = uploaded?.url ?? uploaded;
          thumbnail_url = media_url;
        }
        await apiClient.post(Endpoints.stories.create, {
          media_url,
          media_type: 'text',
          thumbnail_url,
          caption: caption.trim() || undefined,
          duration_sec: 5,
          background_color: typeof bgGrad === 'string' && bgGrad.startsWith('#') ? bgGrad : '#7B3FF2',
          audio_url: sound?.file_url,
          audio_name: sound ? `${sound.title}${sound.artist_name ? ` — ${sound.artist_name}` : ''}` : undefined,
          overlays_json,
          audience_type: audience,
        });
      } else if (mode === 'image' && mediaSrc) {
        // mediaSrc may be a dataURL (after crop) or object URL
        const isDataUrl = mediaSrc.startsWith('data:');
        if (isDataUrl) {
          const res = await fetch(mediaSrc);
          const blob = await res.blob();
          const fd = new FormData();
          fd.append('file', blob, 'story.jpg');
          const up = await apiClient.upload<any>(Endpoints.upload.images('stories'), fd);
          const uploaded = up.data?.uploaded?.[0] ?? up.data;
          media_url = uploaded?.url ?? uploaded;
          thumbnail_url = media_url;
        } else if (mediaFile) {
          const fd = new FormData();
          fd.append('file', mediaFile);
          const up = await apiClient.upload<any>(Endpoints.upload.images('stories'), fd);
          const uploaded = up.data?.uploaded?.[0] ?? up.data;
          media_url = uploaded?.url ?? uploaded;
          thumbnail_url = media_url;
        }
        await apiClient.post(Endpoints.stories.create, {
          media_url,
          media_type: 'image',
          thumbnail_url,
          caption: caption.trim() || undefined,
          duration_sec: 5,
          audio_url: sound?.file_url,
          audio_name: sound ? `${sound.title}${sound.artist_name ? ` — ${sound.artist_name}` : ''}` : undefined,
          overlays_json,
          audience_type: audience,
        });
      } else if (mode === 'video' && mediaFile) {
        const uploaded = await uploadVideoHls(mediaFile, 'stories');
        media_url = uploaded.hls_url ?? uploaded.url;
        thumbnail_url = uploaded.thumbnail_url;
        duration_sec = uploaded.duration ? Math.min(Math.ceil(uploaded.duration), 90) : 10;
        await apiClient.post(Endpoints.stories.create, {
          media_url,
          media_type: 'video',
          thumbnail_url,
          caption: caption.trim() || undefined,
          duration_sec,
          audio_url: sound?.file_url,
          audio_name: sound ? `${sound.title}${sound.artist_name ? ` — ${sound.artist_name}` : ''}` : undefined,
          overlays_json,
          audience_type: audience,
        });
      }

      if (sound) apiClient.post(Endpoints.sounds.use(sound.id)).catch(() => {});
      setSuccess(true);
      setTimeout(() => navigate(-1), 2000);
    } catch (err: any) {
      toast.error(extractApiErrorMessage(err, 'Erreur lors de la publication'));
    } finally {
      setUploading(false);
    }
  }

  const canPublish = mode === 'text' ? caption.trim().length > 0 : !!mediaSrc;

  // ── Keyboard: delete selected ────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        deleteSelected();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        undo();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ── Close sticker picker on outside click ────────────────────────────────
  useEffect(() => {
    if (!showStickerPicker) return;
    const close = () => setShowStickerPicker(false);
    setTimeout(() => document.addEventListener('click', close), 100);
    return () => document.removeEventListener('click', close);
  }, [showStickerPicker]);

  // ── Audience modal ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!showAudience) return;
    const close = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-audience-modal]')) return;
      setShowAudience(false);
    };
    setTimeout(() => document.addEventListener('click', close), 100);
    return () => document.removeEventListener('click', close);
  }, [showAudience]);

  // ── RENDER ────────────────────────────────────────────────────────────────

  if (showCrop && rawSrc) {
    return <CropTool imgSrc={rawSrc} onDone={onCropDone} onCancel={() => { setShowCrop(false); setMode('pick'); }} />;
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center gap-4 bg-black">
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
          <Check size={28} className="text-white" />
        </div>
        <p className="font-black text-xl text-white">Story publiee !</p>
        <p className="text-sm text-white/50">Visible 24h</p>
      </div>
    );
  }

  // ── MODE PICK ──────────────────────────────────────────────────────────────
  if (mode === 'pick') {
    return (
      <div className="fixed inset-0 z-[110] flex flex-col"
        style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
        <input ref={fileRef} type="file" className="hidden" onChange={onFileChange} />
        <div className="flex items-center gap-3 px-4 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            <X size={16} />
          </button>
          <p className="font-black text-base flex-1">Nouvelle story</p>
        </div>
        <div className="flex flex-col gap-3 px-4 py-6 max-w-sm mx-auto w-full">
          {[
            { key: 'text' as const, icon: <Type size={22} />, label: 'Texte', sub: 'Message sur fond colore', grad: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', action: () => setMode('text') },
            { key: 'image' as const, icon: <ImageIcon size={22} />, label: 'Photo', sub: 'Depuis votre galerie', grad: 'linear-gradient(135deg,#1565C0,#2196F3)', action: () => pickFile('image') },
            { key: 'video' as const, icon: <Video size={22} />, label: 'Video', sub: 'Clip jusqu\'a 90 secondes', grad: 'linear-gradient(135deg,#AD1457,#E91E63)', action: () => pickFile('video') },
          ].map(m => (
            <button key={m.key} onClick={m.action}
              className="flex items-center gap-4 p-4 rounded-2xl transition-all text-left"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#7B3FF2')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ background: m.grad }}>{m.icon}</div>
              <div>
                <p className="font-bold text-sm">{m.label}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{m.sub}</p>
              </div>
            </button>
          ))}
          <p className="text-xs text-center pt-2" style={{ color: 'var(--text-tertiary)' }}>Les stories disparaissent automatiquement apres 24h</p>
        </div>
      </div>
    );
  }

  // ── CANVAS EDITOR (text / image / video) ───────────────────────────────────

  const isTextMode = mode === 'text';

  // text editing panel
  if (editingText !== null) {
    return (
      <TextEditPanel
        initial={editingText}
        color={textColor}
        bg={textBg}
        bold={textBold}
        align={textAlign}
        fontSize={textFontSize}
        onColorChange={setTextColor}
        onBgChange={setTextBg}
        onBoldChange={setTextBold}
        onAlignChange={setTextAlign}
        onFontSizeChange={setTextFontSize}
        onCancel={() => setEditingText(null)}
        onDone={addTextLayer}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-black select-none">
      <input ref={fileRef} type="file" className="hidden" onChange={onFileChange} />
      <SoundPickerSheet open={soundOpen} onClose={() => setSoundOpen(false)} onSelect={setSound} selected={sound} />

      {/* ── TOP BAR ── */}
      <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ zIndex: 10 }}>
        <button onClick={() => { setMode('pick'); setMediaSrc(null); setMediaFile(null); }}
          className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}>
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1" />
        {/* undo */}
        <ToolbarBtn onClick={undo} title="Annuler"><Undo2 size={16} /></ToolbarBtn>
        {/* delete selected */}
        {selectedId && (
          <ToolbarBtn onClick={deleteSelected} title="Supprimer"><Trash2 size={16} /></ToolbarBtn>
        )}
        {/* crop again (image only) */}
        {mode === 'image' && rawSrc && (
          <ToolbarBtn onClick={() => setShowCrop(true)} title="Recadrer"><ZoomIn size={16} /></ToolbarBtn>
        )}
      </div>

      {/* ── CANVAS AREA ── */}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-2">
        <div
          ref={canvasAreaRef}
          className="relative rounded-2xl overflow-hidden"
          style={{
            width: '100%',
            maxWidth: 420,
            aspectRatio: '9/16',
            cursor: tool === 'draw' ? 'crosshair' : tool === 'mask' ? 'crosshair' : 'default',
            touchAction: 'none',
          }}
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
        >
          {/* Background */}
          {isTextMode ? (
            <div className="absolute inset-0" style={{ background: bgGrad }} />
          ) : mode === 'image' && mediaSrc ? (
            <img src={mediaSrc} className="absolute inset-0 w-full h-full object-cover" alt="" />
          ) : mode === 'video' && mediaSrc ? (
            <video src={mediaSrc} className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline />
          ) : null}

          {/* Draw SVG */}
          <svg ref={overlayRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} preserveAspectRatio="none">
            {drawPaths.map(p => (
              <path key={p.id} d={p.d} fill="none" stroke={p.color} strokeWidth={p.width}
                strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </svg>

          {/* Masks */}
          {masks.map(m => (
            <div
              key={m.id}
              className="absolute"
              style={{
                left: `${m.x * 100}%`,
                top: `${m.y * 100}%`,
                width: `${m.w * 100}%`,
                height: `${m.h * 100}%`,
                background: m.color,
                opacity: m.opacity,
                outline: selectedId === m.id ? '2px solid #fff' : 'none',
                cursor: tool === 'select' ? 'move' : 'default',
                pointerEvents: tool === 'select' ? 'auto' : 'none',
              }}
              onPointerDown={e => onLayerPointerDown(e, m.id, 'mask', m.x, m.y)}
              onPointerMove={onLayerPointerMove}
              onPointerUp={onLayerPointerUp}
            />
          ))}

          {/* Text layers */}
          {textLayers.map(l => (
            <div
              key={l.id}
              className="absolute"
              style={{
                left: `${l.x * 100}%`,
                top: `${l.y * 100}%`,
                transform: `translate(-50%,-50%) rotate(${l.rotation}deg) scale(${l.scale})`,
                fontSize: l.fontSize,
                fontWeight: l.bold ? 700 : 400,
                color: l.color,
                background: l.bg ? l.bgColor : 'transparent',
                borderRadius: l.bg ? 6 : 0,
                padding: l.bg ? '2px 8px' : 0,
                textAlign: l.align,
                whiteSpace: 'pre-wrap',
                maxWidth: '80%',
                outline: selectedId === l.id ? '2px solid rgba(123,63,242,0.8)' : 'none',
                cursor: tool === 'select' ? 'move' : 'default',
                pointerEvents: tool === 'select' ? 'auto' : 'none',
                userSelect: 'none',
                textShadow: '0 1px 4px rgba(0,0,0,0.7)',
              }}
              onPointerDown={e => onLayerPointerDown(e, l.id, 'text', l.x, l.y)}
              onPointerMove={onLayerPointerMove}
              onPointerUp={onLayerPointerUp}
              onDoubleClick={() => {
                setEditingText(l);
                setTextColor(l.color);
                setTextBg(l.bg);
                setTextBold(l.bold);
                setTextAlign(l.align);
                setTextFontSize(l.fontSize);
                setTextLayers(prev => prev.filter(x => x.id !== l.id));
              }}
            >
              {l.text}
            </div>
          ))}

          {/* Stickers */}
          {stickers.map(s => (
            <div
              key={s.id}
              className="absolute"
              style={{
                left: `${s.x * 100}%`,
                top: `${s.y * 100}%`,
                transform: `translate(-50%,-50%) rotate(${s.rotation}deg) scale(${s.scale})`,
                fontSize: 40,
                lineHeight: 1,
                outline: selectedId === s.id ? '2px solid rgba(123,63,242,0.8)' : 'none',
                borderRadius: 6,
                cursor: tool === 'select' ? 'move' : 'default',
                pointerEvents: tool === 'select' ? 'auto' : 'none',
                userSelect: 'none',
              }}
              onPointerDown={e => onLayerPointerDown(e, s.id, 'sticker', s.x, s.y)}
              onPointerMove={onLayerPointerMove}
              onPointerUp={onLayerPointerUp}
            >
              {s.emoji}
            </div>
          ))}
        </div>
      </div>

      {/* ── TOOL PANELS ── */}

      {/* Draw options */}
      {tool === 'draw' && (
        <div className="flex flex-col items-center gap-2 px-4 py-2 shrink-0">
          <div className="flex gap-1.5 flex-wrap justify-center">
            {DRAW_COLORS.map(c => (
              <button key={c} onClick={() => setDrawColor(c)}
                className="rounded-full transition-transform"
                style={{
                  width: 24, height: 24,
                  background: c,
                  border: drawColor === c ? '3px solid #fff' : '2px solid rgba(255,255,255,0.3)',
                  transform: drawColor === c ? 'scale(1.2)' : 'scale(1)',
                }} />
            ))}
          </div>
          <div className="flex gap-2">
            {DRAW_WIDTHS.map(w => (
              <button key={w} onClick={() => setDrawWidth(w)}
                className="rounded-full flex items-center justify-center"
                style={{
                  width: 32, height: 32,
                  background: drawWidth === w ? 'rgba(255,255,255,0.2)' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}>
                <div style={{ width: w, height: w, borderRadius: '50%', background: drawColor }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mask options */}
      {tool === 'mask' && (
        <div className="flex gap-1.5 justify-center px-4 py-2 shrink-0 flex-wrap">
          {['#000000','#FFFFFF','#FF3B30','#7B3FF2','#007AFF','#34C759','#FFCC00'].map(c => (
            <button key={c} onClick={() => setMaskColor(c)}
              className="rounded-xl transition-transform"
              style={{
                width: 30, height: 30,
                background: c,
                border: maskColor === c ? '3px solid rgba(255,255,255,0.9)' : '2px solid rgba(255,255,255,0.3)',
                transform: maskColor === c ? 'scale(1.15)' : 'scale(1)',
              }} />
          ))}
        </div>
      )}

      {/* Text mode — bg color picker */}
      {isTextMode && (
        <div className="flex gap-1.5 px-4 py-2 overflow-x-auto shrink-0" style={{ scrollbarWidth: 'none' }}>
          {BG_COLORS.map((c, i) => (
            <button key={i} onClick={() => setBgGrad(c)}
              className="rounded-xl shrink-0 transition-transform"
              style={{
                width: 32, height: 32,
                background: c,
                border: bgGrad === c ? '3px solid #fff' : '2px solid rgba(255,255,255,0.3)',
                transform: bgGrad === c ? 'scale(1.15)' : 'scale(1)',
              }} />
          ))}
        </div>
      )}

      {/* Sticker picker */}
      {showStickerPicker && (
        <div className="absolute bottom-48 left-0 right-0 mx-4 rounded-2xl p-3 z-20"
          style={{ background: 'rgba(20,20,28,0.97)', border: '1px solid rgba(255,255,255,0.1)' }}
          onClick={e => e.stopPropagation()}>
          <div className="grid grid-cols-10 gap-2">
            {STICKERS.map(em => (
              <button key={em} onClick={() => addSticker(em)}
                className="text-2xl flex items-center justify-center h-9 rounded-lg transition-all"
                style={{ background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {em}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── BOTTOM TOOLBAR ── */}
      <div className="flex flex-col gap-2 px-3 pb-4 shrink-0">
        {/* Tool selector */}
        <div className="flex items-center justify-center gap-2">
          <ToolbarBtn active={tool === 'select'} onClick={() => setTool('select')} title="Selectionner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 0L20 8.5L13.5 11L17 20L13.5 21.5L10 12.5L4 15V0Z"/></svg>
          </ToolbarBtn>
          <ToolbarBtn active={tool === 'text'} onClick={() => { setTool('text'); setEditingText({ id: '', text: '', color: textColor, bg: textBg, bgColor: 'rgba(0,0,0,0.5)', fontSize: textFontSize, x: 0.5, y: 0.4, bold: textBold, align: textAlign, rotation: 0, scale: 1 }); }} title="Texte">
            <Type size={16} />
          </ToolbarBtn>
          <ToolbarBtn active={tool === 'sticker'} onClick={() => { setTool('sticker'); setShowStickerPicker(s => !s); }} title="Stickers">
            <Smile size={16} />
          </ToolbarBtn>
          <ToolbarBtn active={tool === 'draw'} onClick={() => setTool(t => t === 'draw' ? 'select' : 'draw')} title="Dessiner">
            <Pencil size={16} />
          </ToolbarBtn>
          <ToolbarBtn active={tool === 'mask'} onClick={() => setTool(t => t === 'mask' ? 'select' : 'mask')} title="Masque">
            <Square size={16} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => setSoundOpen(true)} title="Son">
            <Music size={16} />
          </ToolbarBtn>
        </div>

        {/* Sound bar */}
        {sound && (
          <div className="px-1">
            <SoundBar sound={sound} onOpen={() => setSoundOpen(true)} onRemove={() => setSound(null)} />
          </div>
        )}

        {/* Caption + audience + publish row */}
        <div className="flex items-center gap-2">
          <input
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder={isTextMode ? 'Votre message...' : 'Ajouter une legende...'}
            maxLength={300}
            className="flex-1 rounded-xl text-sm outline-none px-3 py-2.5 text-white"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}
          />
          {/* Audience */}
          <div className="relative">
            <button onClick={() => setShowAudience(s => !s)}
              className="w-10 h-10 flex items-center justify-center rounded-xl"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff' }}>
              {audience === 'everyone' ? <Users size={16} /> : audience === 'selected' ? <Lock size={16} /> : <UserX size={16} />}
            </button>
            {showAudience && (
              <div data-audience-modal
                className="absolute bottom-12 right-0 rounded-2xl overflow-hidden z-20"
                style={{ background: 'rgba(20,20,28,0.97)', border: '1px solid rgba(255,255,255,0.1)', minWidth: 160 }}>
                {([
                  { key: 'everyone', icon: <Users size={14} />, label: 'Tout le monde' },
                  { key: 'selected', icon: <Lock size={14} />, label: 'Amis choisis' },
                  { key: 'except', icon: <UserX size={14} />, label: 'Sauf...' },
                ] as const).map(opt => (
                  <button key={opt.key} onClick={() => { setAudience(opt.key); setShowAudience(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white transition-colors"
                    style={{ background: audience === opt.key ? 'rgba(123,63,242,0.25)' : 'transparent' }}
                    onMouseEnter={e => { if (audience !== opt.key) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                    onMouseLeave={e => { if (audience !== opt.key) e.currentTarget.style.background = 'transparent'; }}>
                    {opt.icon} {opt.label}
                    {audience === opt.key && <Check size={12} className="ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Publish */}
          <button onClick={publish} disabled={uploading || !canPublish}
            className="w-10 h-10 flex items-center justify-center rounded-xl disabled:opacity-40 transition-opacity"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', color: '#fff' }}>
            {uploading ? <Spinner size="sm" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Text Edit Panel ────────────────────────────────────────────────────────────

interface TextEditPanelProps {
  initial: TextLayer;
  color: string;
  bg: boolean;
  bold: boolean;
  align: Align;
  fontSize: number;
  onColorChange: (c: string) => void;
  onBgChange: (b: boolean) => void;
  onBoldChange: (b: boolean) => void;
  onAlignChange: (a: Align) => void;
  onFontSizeChange: (n: number) => void;
  onCancel: () => void;
  onDone: (text: string) => void;
}

function TextEditPanel({ initial, color, bg, bold, align, fontSize, onColorChange, onBgChange, onBoldChange, onAlignChange, onFontSizeChange, onCancel, onDone }: TextEditPanelProps) {
  const [text, setText] = useState(initial.text || '');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 shrink-0">
        <button onClick={onCancel} className="p-2 rounded-full text-white/60">
          <X size={18} />
        </button>
        <div className="flex-1" />
        <button onClick={() => onDone(text)}
          disabled={!text.trim()}
          className="px-5 py-2 rounded-xl font-bold text-sm text-white disabled:opacity-40"
          style={{ background: '#7B3FF2' }}>
          OK
        </button>
      </div>

      {/* Preview */}
      <div className="flex-1 flex items-center justify-center px-8">
        <p style={{
          fontSize,
          fontWeight: bold ? 700 : 400,
          color,
          background: bg ? 'rgba(0,0,0,0.5)' : 'transparent',
          borderRadius: bg ? 8 : 0,
          padding: bg ? '4px 12px' : 0,
          textAlign: align,
          whiteSpace: 'pre-wrap',
          maxWidth: '100%',
          textShadow: '0 1px 6px rgba(0,0,0,0.8)',
          wordBreak: 'break-word',
        }}>
          {text || <span style={{ opacity: 0.4 }}>Votre texte...</span>}
        </p>
      </div>

      {/* Textarea */}
      <div className="px-4 pb-2 shrink-0">
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Tapez votre texte..."
          maxLength={300}
          rows={3}
          className="w-full rounded-xl text-sm resize-none outline-none px-4 py-3 text-white"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
          onFocus={e => (e.target.style.borderColor = '#7B3FF2')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.2)')}
        />
      </div>

      {/* Style controls */}
      <div className="flex items-center gap-3 px-4 pb-2 shrink-0">
        <button onClick={() => onBoldChange(!bold)}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-white font-black"
          style={{ background: bold ? 'rgba(123,63,242,0.8)' : 'rgba(255,255,255,0.12)' }}>
          <Bold size={15} />
        </button>
        <button onClick={() => onBgChange(!bg)}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-white text-xs font-bold"
          style={{ background: bg ? 'rgba(123,63,242,0.8)' : 'rgba(255,255,255,0.12)' }}>
          A
        </button>
        {/* align */}
        {([
          { key: 'left' as Align, icon: <AlignLeft size={15} /> },
          { key: 'center' as Align, icon: <AlignCenter size={15} /> },
          { key: 'right' as Align, icon: <AlignRight size={15} /> },
        ]).map(a => (
          <button key={a.key} onClick={() => onAlignChange(a.key)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-white"
            style={{ background: align === a.key ? 'rgba(123,63,242,0.8)' : 'rgba(255,255,255,0.12)' }}>
            {a.icon}
          </button>
        ))}
        {/* font size */}
        <button onClick={() => onFontSizeChange(Math.max(14, fontSize - 4))}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-white text-sm font-black"
          style={{ background: 'rgba(255,255,255,0.12)' }}>A-</button>
        <button onClick={() => onFontSizeChange(Math.min(72, fontSize + 4))}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-white font-black"
          style={{ background: 'rgba(255,255,255,0.12)', fontSize: 16 }}>A+</button>
      </div>

      {/* Color palette */}
      <div className="flex gap-2 px-4 pb-5 overflow-x-auto shrink-0" style={{ scrollbarWidth: 'none' }}>
        {PALETTE.map(c => (
          <button key={c} onClick={() => onColorChange(c)}
            className="rounded-full shrink-0 transition-transform"
            style={{
              width: 28, height: 28,
              background: c,
              border: color === c ? '3px solid rgba(255,255,255,0.9)' : '2px solid rgba(255,255,255,0.25)',
              transform: color === c ? 'scale(1.2)' : 'scale(1)',
            }} />
        ))}
      </div>
    </div>
  );
}
