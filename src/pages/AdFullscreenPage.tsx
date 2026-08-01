import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Zap, ExternalLink, Phone, MessageCircle, Copy } from 'lucide-react';
import Hls from 'hls.js';
import toast from 'react-hot-toast';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { toProxiedUrl } from '../utils/constants';

// Même détection que côté mobile (utils/phoneMenu.ts) : un cta_url est traité
// comme un numéro de téléphone (pas un lien web) s'il ne commence pas par
// http(s):// et ne contient que des chiffres/+()-. courants dans un numéro.
function isPhoneNumber(raw: string): boolean {
  return !/^https?:\/\//i.test(raw) && /^[+()\d\s.-]{6,}$/.test(raw.replace(/^tel:/i, ''));
}

interface Ad {
  id: string; title: string; description?: string | null;
  cta_text?: string | null; cta_url?: string | null;
  creative_url?: string | null; thumbnail_url?: string | null;
  advertiser_name?: string | null; format?: string | null;
}

export default function AdFullscreenPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // La pub est transmise via l'état de navigation depuis SearchAdCard (déjà en
  // mémoire dans les résultats de recherche) — GET /ads/{id} est réservé au
  // propriétaire de la campagne (403 pour tout autre visiteur), donc pas
  // question de refetch ici. Un accès direct à l'URL (refresh, lien partagé)
  // sans état arrive sur l'écran "non disponible" ci-dessous.
  const ad = (location.state as { ad?: Ad } | null)?.ad ?? null;
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef   = useRef<Hls | null>(null);
  const [phoneMenuOpen, setPhoneMenuOpen] = useState(false);

  const isVideo = !!ad && (ad.format === 'video' || !!(ad.creative_url && (
    ad.creative_url.includes('.m3u8') ||
    ad.creative_url.includes('/hls/') ||
    ad.creative_url.toLowerCase().includes('.mp4')
  )));

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isVideo || !ad?.creative_url) return;
    const src = toProxiedUrl(ad.creative_url);
    if (Hls.isSupported()) {
      const hls = new Hls({ autoStartLoad: true, maxBufferLength: 30 });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { v.play().catch(() => {}); });
      hls.on(Hls.Events.ERROR, (_e, data) => { if (data.fatal) hls.destroy(); });
    } else {
      v.src = src;
      v.play().catch(() => {});
    }
    return () => { hlsRef.current?.destroy(); hlsRef.current = null; };
  }, [ad?.creative_url, isVideo]);

  useEffect(() => {
    if (!ad) return;
    apiClient.post(Endpoints.ads.impression(ad.id)).catch(() => {});
  }, [ad?.id]); // eslint-disable-line

  const isPhone = !!ad?.cta_url && isPhoneNumber(ad.cta_url);
  const phoneDigits = isPhone ? ad!.cta_url!.replace(/^tel:/i, '').replace(/[^\d+]/g, '') : null;

  function handleCta() {
    if (!ad?.cta_url) return;
    apiClient.post(Endpoints.ads.click(ad.id)).catch(() => {});
    if (isPhone) { setPhoneMenuOpen(true); return; }
    window.open(ad.cta_url, '_blank', 'noopener,noreferrer');
  }

  function openWhatsApp() {
    if (!phoneDigits) return;
    window.open(`https://wa.me/${phoneDigits.replace(/^\+/, '')}`, '_blank', 'noopener,noreferrer');
    setPhoneMenuOpen(false);
  }
  function callPhone() {
    if (!phoneDigits) return;
    window.location.href = `tel:${phoneDigits}`;
    setPhoneMenuOpen(false);
  }
  function copyPhone() {
    if (!phoneDigits) return;
    navigator.clipboard?.writeText(phoneDigits).then(() => toast.success('Numéro copié')).catch(() => {});
    setPhoneMenuOpen(false);
  }

  if (!ad) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-black">
        <p className="text-white/70 text-sm">Cette publicité n'est plus disponible.</p>
        <button onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-full text-sm font-bold" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}>
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black">
      <button onClick={() => navigate(-1)}
        className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center z-30"
        style={{ background: 'rgba(255,255,255,0.12)' }}>
        <X size={20} color="#fff" />
      </button>

      <div className="relative w-full h-full overflow-hidden" style={{ maxWidth: 480, background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>

        {/* Fond flou — comble les bandes vides sans jamais rogner le visuel, comme les reels. */}
        {(ad.creative_url || ad.thumbnail_url) && (
          <img src={ad.thumbnail_url ?? ad.creative_url!} aria-hidden
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'blur(40px) brightness(0.5)', transform: 'scale(1.15)' }} />
        )}

        {/* Visuel : VIDEO (HLS/MP4) ou IMAGE fallback, jamais rogné */}
        {isVideo ? (
          <video ref={videoRef}
            className="absolute inset-0 w-full h-full object-contain"
            playsInline muted={false} loop
            poster={ad.thumbnail_url ?? undefined} />
        ) : (ad.creative_url || ad.thumbnail_url) ? (
          <img src={ad.creative_url ?? ad.thumbnail_url!} alt={ad.title}
            className="absolute inset-0 w-full h-full object-contain" />
        ) : null}

        {/* Gradient sombre bas */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 35%, transparent 70%)'
        }} />

        {/* Badge sponsorisé */}
        <div className="absolute top-12 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[11px] font-bold"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <Zap size={10} style={{ color: '#7B3FF2' }} /> Sponsorisé
        </div>

        {/* CTA style TikTok : pastille compacte flottante, fixe en bas, pulsation douce */}
        <div className="absolute bottom-12 left-4 right-4 z-20 flex items-center gap-2.5 px-3 py-2 rounded-full"
          style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            animation: 'ad-cta-pulse 2.2s ease-in-out infinite',
          }}>
          <p className="text-white font-bold text-sm leading-tight truncate flex-1 min-w-0">{ad.advertiser_name ?? ad.title}</p>
          {ad.cta_url && (
            <button onClick={handleCta}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full font-black text-xs"
              style={{ background: 'white', color: '#7B3FF2' }}>
              {isPhone ? <Phone size={12} /> : <ExternalLink size={12} />}
              {ad.cta_text ?? (isPhone ? 'Contactez-nous' : 'En savoir plus')}
            </button>
          )}
        </div>
      </div>

      {/* Menu de contact — même choix que côté mobile (WhatsApp / Appeler / Copier) */}
      {phoneMenuOpen && (
        <>
          <div className="fixed inset-0 z-[209]" style={{ background: 'rgba(0,0,0,0.55)' }}
            onClick={() => setPhoneMenuOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[210] rounded-t-3xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
            </div>
            <p className="px-5 pt-2 pb-3 text-sm font-bold text-center" style={{ color: 'var(--text-primary)' }}>
              {phoneDigits}
            </p>
            <button onClick={openWhatsApp}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-semibold"
              style={{ color: 'var(--text-primary)', borderTop: '1px solid var(--border)' }}>
              <MessageCircle size={18} style={{ color: '#25D366' }} /> WhatsApp
            </button>
            <button onClick={callPhone}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-semibold"
              style={{ color: 'var(--text-primary)', borderTop: '1px solid var(--border)' }}>
              <Phone size={18} style={{ color: 'var(--primary)' }} /> Appeler
            </button>
            <button onClick={copyPhone}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-semibold"
              style={{ color: 'var(--text-primary)', borderTop: '1px solid var(--border)' }}>
              <Copy size={18} style={{ color: 'var(--text-tertiary)' }} /> Copier
            </button>
            <button onClick={() => setPhoneMenuOpen(false)}
              className="w-full py-3.5 text-sm font-bold"
              style={{ color: 'var(--text-tertiary)', borderTop: '1px solid var(--border)' }}>
              Annuler
            </button>
          </div>
        </>
      )}
    </div>
  );
}
