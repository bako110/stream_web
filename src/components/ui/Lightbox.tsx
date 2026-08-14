import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface LightboxProps {
  urls: string[];
  index: number;
  onClose: () => void;
}

// Nom de fichier propose au telechargement — extrait de l'URL si possible,
// sinon un nom generique avec l'extension detectee dans le content-type.
function filenameFromUrl(url: string): string {
  try {
    const path = new URL(url, window.location.origin).pathname;
    const last = path.split('/').pop();
    if (last && last.includes('.')) return last;
  } catch { /* URL relative ou invalide */ }
  return `image-${Date.now()}.jpg`;
}

async function downloadImage(url: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filenameFromUrl(url);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    toast.error('Téléchargement impossible.');
  }
}

async function copyImage(url: string): Promise<boolean> {
  try {
    if (!navigator.clipboard || !window.ClipboardItem) throw new Error('unsupported');
    const res = await fetch(url);
    const blob = await res.blob();
    // Clipboard API n'accepte que quelques types image (png/jpeg/webp selon
    // navigateur) — reconvertir en PNG via canvas si le blob source est dans
    // un format non supporte (ex: certains CDN servent du webp).
    const pngBlob = blob.type === 'image/png' ? blob : await toPng(blob);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
    return true;
  } catch {
    toast.error('Copie impossible sur ce navigateur.');
    return false;
  }
}

function toPng(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas unsupported')); return; }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(b => { URL.revokeObjectURL(objectUrl); b ? resolve(b) : reject(new Error('toBlob failed')); }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('image load failed')); };
    img.src = objectUrl;
  });
}

export function Lightbox({ urls, index, onClose }: LightboxProps) {
  const [current, setCurrent] = useState(index);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowRight') setCurrent(c => (c + 1) % urls.length);
      if (e.key === 'ArrowLeft')  setCurrent(c => (c - 1 + urls.length) % urls.length);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [urls.length, onClose]);

  async function handleCopy() {
    const ok = await copyImage(urls[current]);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1500); }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.93)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      {/* Actions (telecharger / copier / fermer) */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          className="p-2.5 rounded-full transition-all hover:bg-white/20"
          style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
          onClick={e => { e.stopPropagation(); handleCopy(); }}
          title="Copier l'image"
        >
          {copied ? <Check size={20} /> : <Copy size={20} />}
        </button>
        <button
          className="p-2.5 rounded-full transition-all hover:bg-white/20"
          style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
          onClick={e => { e.stopPropagation(); downloadImage(urls[current]); }}
          title="Télécharger l'image"
        >
          <Download size={20} />
        </button>
        <button
          className="p-2.5 rounded-full transition-all hover:bg-white/20"
          style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
          onClick={onClose}
          title="Fermer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Counter */}
      {urls.length > 1 && (
        <span
          className="absolute top-4 left-1/2 -translate-x-1/2 text-sm font-semibold px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
        >
          {current + 1} / {urls.length}
        </span>
      )}

      {/* Prev */}
      {urls.length > 1 && (
        <button
          className="absolute left-3 p-2.5 rounded-full z-10 transition-all hover:bg-white/20"
          style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
          onClick={e => { e.stopPropagation(); setCurrent(c => (c - 1 + urls.length) % urls.length); }}
        >
          <ChevronLeft size={26} />
        </button>
      )}

      {/* Image */}
      <img
        src={urls[current]}
        alt=""
        className="max-w-[92vw] max-h-[88vh] rounded-2xl object-contain shadow-2xl select-none"
        onClick={e => e.stopPropagation()}
        draggable={false}
      />

      {/* Next */}
      {urls.length > 1 && (
        <button
          className="absolute right-3 p-2.5 rounded-full z-10 transition-all hover:bg-white/20"
          style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
          onClick={e => { e.stopPropagation(); setCurrent(c => (c + 1) % urls.length); }}
        >
          <ChevronRight size={26} />
        </button>
      )}

      {/* Thumbnails strip */}
      {urls.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-3 py-2 rounded-2xl max-w-[90vw] overflow-x-auto"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={e => e.stopPropagation()}
        >
          {urls.map((u, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="shrink-0 w-12 h-12 rounded-xl overflow-hidden transition-all"
              style={{
                border: `2px solid ${i === current ? '#fff' : 'transparent'}`,
                opacity: i === current ? 1 : 0.45,
              }}
            >
              <img src={u} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
