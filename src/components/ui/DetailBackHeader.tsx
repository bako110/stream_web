import { ArrowLeft } from 'lucide-react';

interface Props {
  onBack: () => void;
  label?: string;
}

/** Header "Retour" premium pour les pages de détail accessibles via lien partagé. */
export function DetailBackHeader({ onBack, label = 'Retour' }: Props) {
  return (
    <button
      onClick={onBack}
      className="group inline-flex items-center gap-2.5 mb-6 pl-2.5 pr-4 py-2 rounded-full text-sm font-bold transition-all"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--primary)';
        e.currentTarget.style.color = 'var(--primary)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(123,63,242,0.18)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.color = 'var(--text-secondary)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <span
        className="flex items-center justify-center rounded-full transition-transform group-hover:-translate-x-0.5"
        style={{ width: 22, height: 22, background: 'rgba(123,63,242,0.12)' }}
      >
        <ArrowLeft size={13} />
      </span>
      {label}
    </button>
  );
}
