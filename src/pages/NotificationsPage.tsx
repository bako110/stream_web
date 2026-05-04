import { Bell, Check, Trash2, Heart, UserPlus, MessageCircle, Radio } from 'lucide-react';
import type { Notification } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useApi } from '../hooks/useApi';
import { Spinner } from '../components/ui/Spinner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  like:    <Heart size={14} />,
  follow:  <UserPlus size={14} />,
  comment: <MessageCircle size={14} />,
  live:    <Radio size={14} />,
  default: <Bell size={14} />,
};

const NOTIF_COLORS: Record<string, string> = {
  like:    '#E0389A',
  follow:  '#7B3FF2',
  comment: '#3B82F6',
  live:    '#F0365A',
  default: '#9290AE',
};

function NotifIcon({ type }: { type: string }) {
  const icon  = NOTIF_ICONS[type]  ?? NOTIF_ICONS.default;
  const color = NOTIF_COLORS[type] ?? NOTIF_COLORS.default;
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white"
      style={{ background: color, boxShadow: `0 0 12px ${color}50` }}>
      {icon}
    </div>
  );
}

export default function NotificationsPage() {
  const { data, loading, refetch } = useApi<Notification[]>(
    () => apiClient.get<Notification[]>(`${Endpoints.notifications.list}?limit=50`),
  );

  async function markAllRead() {
    await apiClient.patch(Endpoints.notifications.readAll);
    refetch();
  }

  async function deleteNotif(id: string) {
    await apiClient.delete(Endpoints.notifications.delete(id));
    refetch();
  }

  const notifications = data ?? [];
  const unreadCount   = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-all font-medium"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => { (e.currentTarget.style.borderColor = 'var(--primary)'); (e.currentTarget.style.color = 'var(--primary)'); }}
            onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--border)'); (e.currentTarget.style.color = 'var(--text-secondary)'); }}>
            <Check size={15} /> Tout marquer lu
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <Spinner />
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Chargement…</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--bg-secondary)' }}>
            <Bell size={28} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Aucune notification</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Vous êtes à jour !</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id}
              className="flex items-start gap-3 p-4 rounded-xl transition-all group"
              style={{
                background: n.is_read ? 'var(--surface)' : 'rgba(123,63,242,0.05)',
                border:     `1px solid ${n.is_read ? 'var(--border)' : 'rgba(123,63,242,0.2)'}`,
              }}>

              {/* Icon */}
              <NotifIcon type={n.type ?? 'default'} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{n.body}</p>
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                  {formatDistanceToNow(new Date(n.created_at), { locale: fr, addSuffix: true })}
                </p>
              </div>

              {/* Unread dot + delete */}
              <div className="flex items-center gap-2 shrink-0">
                {!n.is_read && (
                  <span className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} />
                )}
                <button
                  onClick={() => deleteNotif(n.id)}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(240,54,90,0.1)'); (e.currentTarget.style.color = '#F0365A'); }}
                  onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.color = 'var(--text-tertiary)'); }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
