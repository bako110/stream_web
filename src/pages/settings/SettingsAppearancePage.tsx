import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';

export default function SettingsAppearancePage() {
  const navigate = useNavigate();
  const { isDark, toggle } = useThemeStore();

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
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Apparence</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Thème et affichage</p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(123,63,242,0.1)' }}>
            {isDark ? <Moon size={16} style={{ color: 'var(--primary)' }} /> : <Sun size={16} style={{ color: 'var(--primary)' }} />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Mode sombre</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{isDark ? 'Activé' : 'Désactivé'}</p>
          </div>
          <button onClick={toggle}
            className="relative rounded-full transition-colors shrink-0"
            style={{ background: isDark ? 'var(--primary)' : 'var(--border)', height: 22, width: 40 }}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isDark ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
