import { ArrowLeft, Info, Shield, Link } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SettingsAboutPage() {
  const navigate = useNavigate();

  const rows = [
    { icon: <Info size={16} />,   label: 'Version',                   value: '1.0.0 (web)' },
    { icon: <Shield size={16} />, label: "Conditions d'utilisation",  onClick: () => window.open('https://folix.app/terms', '_blank') },
    { icon: <Link size={16} />,   label: 'Aide & Support',            value: 'support@folix.app', onClick: () => window.open('mailto:support@folix.app') },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/settings')}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <ArrowLeft size={16} style={{ color: 'var(--text-primary)' }} />
        </button>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>À propos</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Version, conditions et support</p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {rows.map((row, i) => (
          <div key={i}
            role={row.onClick ? 'button' : undefined}
            tabIndex={row.onClick ? 0 : undefined}
            onClick={row.onClick}
            onKeyDown={row.onClick ? e => e.key === 'Enter' && row.onClick!() : undefined}
            className={`flex items-center gap-3 px-4 py-3.5 transition-all ${row.onClick ? 'cursor-pointer' : ''}`}
            style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}
            onMouseEnter={e => row.onClick && (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => row.onClick && (e.currentTarget.style.background = 'transparent')}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(123,63,242,0.1)' }}>
              <span style={{ color: 'var(--primary)' }}>{row.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{row.label}</span>
              {row.value && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{row.value}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
