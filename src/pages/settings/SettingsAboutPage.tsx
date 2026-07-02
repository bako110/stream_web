import { ArrowLeft, Info, Shield, FileText, Lock, Mail, ExternalLink, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SettingsAboutPage() {
  const navigate = useNavigate();

  const rows = [
    {
      icon: <Info size={16} />,
      label: 'Version',
      value: '1.0.0 (web)',
      onClick: undefined as (() => void) | undefined,
    },
    {
      icon: <FileText size={16} />,
      label: "Conditions d'utilisation",
      value: 'CGU v2.0 · GoFolyX',
      onClick: () => navigate('/cgu'),
    },
    {
      icon: <Lock size={16} />,
      label: 'Politique de confidentialité',
      value: 'RGPD · Données personnelles',
      onClick: () => navigate('/politique-confidentialite'),
    },
    {
      icon: <Shield size={16} />,
      label: 'Confidentialité du compte',
      value: 'Gérer vos préférences',
      onClick: () => navigate('/privacy'),
    },
    {
      icon: <Mail size={16} />,
      label: 'Aide & Support',
      value: 'support@gofolyx.com',
      onClick: () => navigate('/support'),
    },
    {
      icon: <ExternalLink size={16} />,
      label: 'Site web GoFolyX',
      value: 'gofolyx.app',
      onClick: () => window.open('https://gofolyx.app', '_blank'),
    },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">

      {/* Header */}
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

      {/* App identity card */}
      <div className="rounded-2xl p-5 flex items-center gap-4"
        style={{ background: 'linear-gradient(135deg,rgba(123,63,242,0.08),rgba(123,63,242,0.05))', border: '1px solid rgba(123,63,242,0.18)' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 font-black text-xl"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', color: '#fff' }}>
          GX
        </div>
        <div>
          <p className="font-black text-base" style={{ color: 'var(--text-primary)' }}>GoFolyX</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Version 1.0.0 (web) · © 2026</p>
        </div>
      </div>

      {/* Liens */}
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
            {row.onClick && <ChevronRight size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
          </div>
        ))}
      </div>

      {/* Badges légaux */}
      <div className="flex flex-wrap gap-2">
        {['RGPD', 'AES-256', 'TLS 1.3', 'Hébergement UE', 'PCI-DSS'].map(label => (
          <span key={label} className="text-xs px-3 py-1 rounded-full font-semibold"
            style={{ background: 'rgba(123,63,242,0.08)', color: 'var(--primary)', border: '1px solid rgba(123,63,242,0.15)' }}>
            {label}
          </span>
        ))}
      </div>

    </div>
  );
}
