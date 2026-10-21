/**
 * Boutons d'appel à l'action des pubs — port web de AdCTA / adContactButtons
 * du mobile (stream_mobile/src/components/ads/{AdCTA,types}.tsx) : reflète
 * EXACTEMENT ce que l'annonceur a configuré, jamais un menu caché derrière un
 * clic unique :
 *   - Appel ET WhatsApp cochés → 2 boutons côte à côte
 *   - un seul coché            → 1 bouton qui nomme ce canal
 *   - aucun contact direct     → 1 bouton générique (cta_text / lien / store / numéro)
 * WhatsApp = vert #25D366 (texte blanc), les autres = bouton sombre. Le premier
 * bouton a une accroche discrète (reflet + pulsation) toutes les ~5,3 s.
 */
import { Phone, ExternalLink, Download } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';

export interface AdContactFields {
  id: string;
  cta_text?: string | null;
  cta_url?: string | null;
  contact_phone?: string | null;
  contact_call?: boolean | null;
  contact_whatsapp?: boolean | null;
}

type Action = 'call' | 'whatsapp' | 'link';
export interface AdButton { text: string; action: Action; icon: 'phone' | 'whatsapp' | 'download' | 'link' }

function isPhoneRaw(raw?: string | null): boolean {
  const r = (raw ?? '').trim();
  return !!r && !/^https?:\/\//i.test(r) && /^[+()\d\s.-]{6,}$/.test(r.replace(/^tel:/i, ''));
}
function isStoreUrl(raw?: string | null): boolean {
  const r = (raw ?? '').trim().toLowerCase();
  return r.includes('play.google.com/store/apps') || r.includes('apps.apple.com') || r.includes('itunes.apple.com');
}
export function adHasContact(a: AdContactFields): boolean {
  return !!(a.contact_phone ?? '').trim() && !!(a.contact_call || a.contact_whatsapp);
}

export function adContactButtons(a: AdContactFields): AdButton[] {
  if (adHasContact(a)) {
    const buttons: AdButton[] = [];
    if (a.contact_call)     buttons.push({ text: 'Appeler', action: 'call', icon: 'phone' });
    if (a.contact_whatsapp) buttons.push({ text: 'Contacter sur WhatsApp', action: 'whatsapp', icon: 'whatsapp' });
    if (buttons.length === 1 && a.cta_text) buttons[0].text = a.cta_text;
    return buttons;
  }
  if (isPhoneRaw(a.cta_url)) return [{ text: a.cta_text || 'Appeler', action: 'call', icon: 'phone' }];
  if (!(a.cta_url ?? '').trim()) return [];
  if (a.cta_text) return [{ text: a.cta_text, action: 'link', icon: isStoreUrl(a.cta_url) ? 'download' : 'link' }];
  if (isStoreUrl(a.cta_url)) return [{ text: 'Installer', action: 'link', icon: 'download' }];
  return [{ text: 'En savoir plus', action: 'link', icon: 'link' }];
}

function digitsOf(raw: string): string { return raw.replace(/^tel:/i, '').replace(/[^\d+]/g, ''); }

export function runAdButton(btn: AdButton, a: AdContactFields): void {
  apiClient.post(Endpoints.ads.click(a.id)).catch(() => {});
  if (btn.action === 'call') {
    const num = digitsOf((a.contact_phone ?? a.cta_url ?? '').trim());
    if (num) window.location.href = `tel:${num}`;
    return;
  }
  if (btn.action === 'whatsapp') {
    const num = digitsOf((a.contact_phone ?? '').trim()).replace(/^\+/, '');
    if (num) window.open(`https://wa.me/${num}`, '_blank', 'noopener,noreferrer');
    return;
  }
  const url = (a.cta_url ?? '').trim();
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

function WhatsappIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.04 2a9.9 9.9 0 0 0-8.45 15.06L2 22l5.07-1.55A9.9 9.9 0 1 0 12.04 2Zm0 18.1c-1.5 0-2.97-.4-4.25-1.16l-.3-.18-3.01.92.95-2.93-.2-.31a8.1 8.1 0 1 1 6.81 3.66Zm4.44-6.06c-.24-.12-1.44-.71-1.66-.79-.22-.08-.39-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.81-.2-.47-.4-.41-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.5.58.18 1.1.16 1.51.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}

export function AdContactButtons({ ad, compact = false }: {
  ad: AdContactFields;
  /** Version réduite (pastille plein écran). */
  compact?: boolean;
}) {
  const buttons = adContactButtons(ad);
  if (buttons.length === 0) return null;
  return (
    <>
      <style>{`
        @keyframes ad-cta-shine { 0%{transform:translateX(-140%) skewX(-18deg);opacity:0} 4%{opacity:1} 10%{transform:translateX(340%) skewX(-18deg);opacity:1} 11%,100%{transform:translateX(340%) skewX(-18deg);opacity:0} }
        @keyframes ad-cta-pop { 0%,10%,100%{transform:scale(1)} 5%{transform:scale(1.02)} }
        .ad-cta-first { animation: ad-cta-pop 5.3s ease-in-out infinite; }
        .ad-cta-first::after { content:''; position:absolute; top:0; bottom:0; left:0; width:36%; background:rgba(255,255,255,0.4); animation: ad-cta-shine 5.3s ease-in-out infinite; pointer-events:none; }
        @media (prefers-reduced-motion: reduce) { .ad-cta-first, .ad-cta-first::after { animation: none; } }
      `}</style>
      <div className={`flex ${compact ? 'gap-1.5' : 'gap-2'} flex-1 min-w-0`}>
        {buttons.map((btn, i) => {
          const wa = btn.action === 'whatsapp';
          const Icon = btn.icon === 'phone' ? Phone : btn.icon === 'download' ? Download : ExternalLink;
          return (
            <button key={btn.action}
              onClick={e => { e.stopPropagation(); runAdButton(btn, ad); }}
              className={`relative overflow-hidden flex-1 min-w-0 flex items-center justify-center gap-1.5 font-bold transition-transform active:scale-[0.97] ${i === 0 ? 'ad-cta-first' : ''} ${compact ? 'px-3 py-2 rounded-full text-xs' : 'px-4 py-2.5 rounded-[13px] text-[13px]'}`}
              style={{
                background: wa ? '#25D366' : 'var(--text-primary)',
                color: wa ? '#fff' : 'var(--bg)',
                boxShadow: `0 3px 8px ${wa ? 'rgba(37,211,102,0.3)' : 'rgba(0,0,0,0.18)'}`,
              }}>
              <span className="truncate">{btn.text}</span>
              {wa ? <WhatsappIcon size={compact ? 13 : 14} /> : <Icon size={compact ? 12 : 13} />}
            </button>
          );
        })}
      </div>
    </>
  );
}
