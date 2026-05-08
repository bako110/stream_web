import { ArrowLeft, Film, Calendar, Play, Star, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SettingsContentPage() {
  const navigate = useNavigate();

  const rows = [
    { icon: <Film size={16} />,     label: 'Mes concerts',   to: '/concerts' },
    { icon: <Calendar size={16} />, label: 'Mes événements', to: '/events' },
    { icon: <Play size={16} />,     label: 'Films & Séries', to: '/films' },
    { icon: <Star size={16} />,     label: 'Tendances',      to: '/search' },
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
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Contenu</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Concerts, événements et médias</p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {rows.map((row, i) => (
          <div key={i} role="button" tabIndex={0}
            onClick={() => navigate(row.to)}
            onKeyDown={e => e.key === 'Enter' && navigate(row.to)}
            className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all"
            style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(123,63,242,0.1)' }}>
              <span style={{ color: 'var(--primary)' }}>{row.icon}</span>
            </div>
            <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{row.label}</span>
            <ChevronRight size={15} style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
