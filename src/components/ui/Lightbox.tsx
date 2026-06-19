import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface LightboxProps {
  urls: string[];
  index: number;
  onClose: () => void;
}

export function Lightbox({ urls, index, onClose }: LightboxProps) {
  const [current, setCurrent] = useState(index);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowRight') setCurrent(c => (c + 1) % urls.length);
      if (e.key === 'ArrowLeft')  setCurrent(c => (c - 1 + urls.length) % urls.length);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [urls.length, onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.93)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-4 right-4 p-2.5 rounded-full z-10 transition-all hover:bg-white/20"
        style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
        onClick={onClose}
      >
        <X size={20} />
      </button>

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
