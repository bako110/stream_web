import { useState } from 'react';
import { Star, Crown, Check, Lock, Share2, ChevronDown, ChevronUp, Eye, Globe, Calendar, Clapperboard, Languages, ShieldCheck } from 'lucide-react';

// Briques communes aux pages détail Film et Série (design cinéma : fond flouté,
// hero, titre, actions, synopsis, fiche technique, CTA premium).

export function MediaBackdrop({ image }: { image?: string | null }) {
  if (!image) return null;
  return (
    <div aria-hidden className="absolute inset-x-0 top-0 h-[420px] overflow-hidden pointer-events-none -z-0">
      <img src={image} alt="" className="w-full h-full object-cover"
        style={{ filter: 'blur(48px) saturate(1.3) brightness(0.55)', transform: 'scale(1.3)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 0%, var(--bg) 92%)' }} />
    </div>
  );
}

export function AccessBadge({ isPremium, hasAccess, hasActiveSub, price }: {
  isPremium: boolean; hasAccess: boolean | null; hasActiveSub: boolean; price?: number | null;
}) {
  if (!isPremium) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
        style={{ background: 'rgba(16,185,129,0.9)' }}><Check size={11} /> Gratuit</span>
    );
  }
  if (hasActiveSub) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
        style={{ background: 'rgba(123,63,242,0.9)' }}><Crown size={11} /> Abonné</span>
    );
  }
  if (hasAccess) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
        style={{ background: 'rgba(34,197,94,0.9)' }}><Check size={11} /> Accès débloqué</span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
      style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
      <Crown size={11} /> Premium{price ? ` · ${price.toFixed(2)} €` : ''}
    </span>
  );
}

export function MediaTitleBlock({ title, originalTitle, rating, chips, onShare }: {
  title: string; originalTitle?: string | null; rating?: number | null;
  chips: (string | null | undefined | false)[]; onShare: () => void;
}) {
  const list = chips.filter(Boolean) as string[];
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black leading-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>{title}</h1>
          {originalTitle && originalTitle !== title && (
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{originalTitle}</p>
          )}
        </div>
        <button onClick={onShare} aria-label="Partager"
          className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <Share2 size={17} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        {!!rating && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black"
            style={{ background: 'rgba(250,204,21,0.15)', color: '#CA8A04' }}>
            <Star size={13} fill="currentColor" /> {rating.toFixed(1)}
          </span>
        )}
        {list.map(c => (
          <span key={c} className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{c}</span>
        ))}
      </div>
    </div>
  );
}

export function MediaSynopsis({ text }: { text?: string | null }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const long = text.length > 220;
  return (
    <section className="rounded-3xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <h2 className="text-[11px] font-black uppercase mb-2" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.12em' }}>Synopsis</h2>
      <p className={`text-sm leading-relaxed whitespace-pre-line ${!open && long ? 'line-clamp-4' : ''}`} style={{ color: 'var(--text-secondary)' }}>{text}</p>
      {long && (
        <button onClick={() => setOpen(v => !v)} className="text-sm font-semibold flex items-center gap-1 mt-2" style={{ color: 'var(--primary)' }}>
          {open ? <><ChevronUp size={14} /> Réduire</> : <><ChevronDown size={14} /> Lire la suite</>}
        </button>
      )}
    </section>
  );
}

export function MediaFacts({ director, country, language, classification, year, views }: {
  director?: string | null; country?: string | null; language?: string | null;
  classification?: string | null; year?: number | null; views?: number | null;
}) {
  const rows = [
    director       && { icon: <Clapperboard size={15} />, label: 'Réalisation',    value: director },
    year           && { icon: <Calendar size={15} />,     label: 'Année',          value: String(year) },
    country        && { icon: <Globe size={15} />,        label: 'Pays',           value: country },
    language       && { icon: <Languages size={15} />,    label: 'Langue',         value: language.toUpperCase() },
    classification && { icon: <ShieldCheck size={15} />,  label: 'Classification', value: classification },
    !!views        && { icon: <Eye size={15} />,          label: 'Vues',           value: (views as number).toLocaleString('fr-FR') },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string }[];
  if (rows.length === 0) return null;
  return (
    <section className="rounded-3xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <h2 className="text-[11px] font-black uppercase mb-3" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.12em' }}>Fiche technique</h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
        {rows.map(r => (
          <div key={r.label} className="flex items-start gap-2.5 min-w-0">
            <span className="mt-0.5 shrink-0" style={{ color: 'var(--primary)' }}>{r.icon}</span>
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>{r.label}</dt>
              <dd className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{r.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function PremiumCta({ title, subtitle, onClick }: { title: string; subtitle: string; onClick: () => void }) {
  return (
    <div className="rounded-3xl p-4 flex items-center justify-between gap-4"
      style={{ background: 'linear-gradient(135deg, rgba(123,63,242,0.14), rgba(91,46,196,0.06))', border: '1.5px solid rgba(123,63,242,0.35)' }}>
      <div className="min-w-0">
        <p className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{title}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</p>
      </div>
      <button onClick={onClick}
        className="flex items-center gap-2 h-11 px-5 rounded-full font-black text-white text-sm shrink-0 active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 8px 20px rgba(123,63,242,0.4)' }}>
        <Lock size={14} /> Débloquer
      </button>
    </div>
  );
}
