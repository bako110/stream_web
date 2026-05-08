import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Bell, Check, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import toast from 'react-hot-toast';

export default function SettingsNotificationsPage() {
  const navigate = useNavigate();
  const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem('pref_push') !== 'false');
  const [unreadCount, setUnreadCount] = useState(0);

  const loadCount = useCallback(async () => {
    try {
      const res = await apiClient.get<any>(Endpoints.notifications.unreadCount);
      setUnreadCount(res.data?.count ?? 0);
    } catch {}
  }, []);

  useEffect(() => { loadCount(); }, [loadCount]);

  const rows = [
    {
      icon: <Bell size={16} />,
      label: 'Notifications push',
      right: (
        <button
          onClick={() => setPushEnabled(v => { const n = !v; localStorage.setItem('pref_push', String(n)); return n; })}
          className="relative rounded-full transition-colors shrink-0"
          style={{ background: pushEnabled ? 'var(--primary)' : 'var(--border)', height: 22, width: 40 }}>
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${pushEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      ),
    },
    {
      icon: <Bell size={16} />,
      label: 'Voir les notifications',
      value: unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Toutes lues',
      onClick: () => navigate('/notifications'),
    },
    {
      icon: <Check size={16} />,
      label: 'Tout marquer comme lu',
      onClick: async () => {
        await apiClient.post(Endpoints.notifications.readAll).catch(() => {});
        setUnreadCount(0);
        toast.success('Notifications marquées comme lues.');
      },
    },
    {
      icon: <Trash2 size={16} />,
      label: 'Effacer toutes les notifications',
      danger: true,
      onClick: async () => {
        await apiClient.delete(Endpoints.notifications.deleteAll).catch(() => {});
        toast.success('Notifications effacées.');
        setUnreadCount(0);
      },
    },
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
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Notifications</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Préférences et gestion</p>
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
              style={{ background: row.danger ? 'rgba(239,68,68,0.1)' : 'rgba(123,63,242,0.1)' }}>
              <span style={{ color: row.danger ? '#EF4444' : 'var(--primary)' }}>{row.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium" style={{ color: row.danger ? '#EF4444' : 'var(--text-primary)' }}>{row.label}</span>
              {row.value && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{row.value}</p>}
            </div>
            {'right' in row ? row.right : null}
          </div>
        ))}
      </div>
    </div>
  );
}
