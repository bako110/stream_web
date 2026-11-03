import { ArrowLeft, Sun, Moon, PanelLeft, PanelLeftClose } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { useSidebarStore } from '../../store/sidebarStore';

export default function SettingsAppearancePage() {
  const navigate = useNavigate();
  const { isDark, toggle } = useThemeStore();
  const { collapsed, setCollapsed } = useSidebarStore();

  return (
    <div className="st-v2 w-full mx-auto p-4 sm:p-6 space-y-5">
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
      {/* Menu latéral (ordinateur) : complet ou icônes seules — choix mémorisé */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-4 pt-4 pb-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Menu latéral</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Sur ordinateur. Vous pouvez aussi le changer avec le bouton en haut du menu. Votre choix est mémorisé.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          {([
            { key: false, label: 'Menu complet', hint: 'Icônes et libellés', icon: <PanelLeft size={18} /> },
            { key: true,  label: 'Icônes seules', hint: 'Menu compact',      icon: <PanelLeftClose size={18} /> },
          ] as const).map(o => {
            const active = collapsed === o.key;
            return (
              <button key={String(o.key)} onClick={() => setCollapsed(o.key)} aria-pressed={active}
                className="flex flex-col items-start gap-1.5 p-3 rounded-xl text-left transition-all"
                style={{
                  background: active ? 'rgba(123,63,242,0.1)' : 'var(--bg-secondary)',
                  border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                  color: active ? 'var(--primary)' : 'var(--text-secondary)',
                }}>
                {o.icon}
                <span className="text-sm font-bold">{o.label}</span>
                <span className="text-[11px] font-normal" style={{ color: 'var(--text-tertiary)' }}>{o.hint}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
