import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Check, Heart, UserPlus, MessageCircle, Radio, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import type { Notification } from '../../types';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { Spinner } from '../ui/Spinner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  follow:       <UserPlus size={13} />,
  reaction:     <Heart size={13} />,
  comment:      <MessageCircle size={13} />,
  mention:      <MessageCircle size={13} />,
  reel_posted:  <Radio size={13} />,
  system:       <Bell size={13} />,
  welcome:      <Bell size={13} />,
  reel_analysis_cleared: <CheckCircle size={13} />,
  reel_analysis_limited: <AlertCircle size={13} />,
  reel_analysis_removed: <AlertTriangle size={13} />,
};

const NOTIF_COLOR: Record<string, string> = {
  follow:      '#7B3FF2',
  reaction:    '#E91E8C',
  comment:     '#2196F3',
  mention:     '#2196F3',
  reel_posted: '#FF5722',
  system:      '#607D8B',
  welcome:     '#4CAF50',
  reel_analysis_cleared: '#10B981',
  reel_analysis_limited: '#F59E0B',
  reel_analysis_removed: '#EF4444',
};

function NotifIcon({ type }: { type: string }) {
  const icon  = NOTIF_ICONS[type]  ?? <Bell size={13} />;
  const color = NOTIF_COLOR[type]  ?? '#9290AE';
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white"
      style={{ background: color, boxShadow: `0 0 10px ${color}55` }}>
      {icon}
    </div>
  );
}

export function NotificationsPopover({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const { data, loading, refetch } = useApi<Notification[]>(
    () => apiClient.get<Notification[]>(`${Endpoints.notifications.list}?limit=20`),
  );
  const notifications = data ?? [];
  const unread = notifications.filter(n => !n.is_read).length;

  // Fermeture au clic extérieur — même comportement que MessagesPopover.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [onClose]);

  // Fermeture Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function markAllRead() {
    await apiClient.patch(Endpoints.notifications.readAll);
    refetch();
  }

  async function handleClickNotif(n: Notification) {
    if (!n.is_read) {
      apiClient.patch(Endpoints.notifications.read(n.id)).catch(() => {});
    }
  }

  // Portail vers document.body — même raison que MessagesPopover : le header
  // parent a un backdrop-filter qui piège les descendants position:fixed.
  return createPortal((
    <div
      ref={panelRef}
      className="notif-popover fixed z-[200] flex flex-col overflow-hidden"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.28), 0 4px 16px rgba(0,0,0,0.12)',
        animation: 'popover-in 0.18s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <style>{`
        @keyframes popover-in {
          from { opacity: 0; transform: scale(0.94) translateY(-8px); transform-origin: top right; }
          to   { opacity: 1; transform: scale(1)    translateY(0);     transform-origin: top right; }
        }
        .notif-popover {
          top: 60px; right: 12px; width: 360px; height: 520px;
          border-radius: 1.25rem;
        }
        @media (max-width: 640px) {
          .notif-popover {
            top: 0; right: 0; left: 0; bottom: 0;
            width: auto; height: 100dvh;
            border-radius: 0; border: none;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-2">
          <h3 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
          {unread > 0 && (
            <span className="text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <button onClick={markAllRead} title="Tout lire"
              className="p-1.5 rounded-lg transition-all"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
              <Check size={15} />
            </button>
          )}
          <button onClick={() => { navigate('/notifications'); onClose(); }} title="Voir tout"
            className="p-1.5 rounded-lg transition-all text-[10px] font-semibold px-2.5"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}>
            Voir tout
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full"><Spinner size="md" /></div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: 'var(--bg-secondary)' }}>
              <Bell size={22} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Aucune notification</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => handleClickNotif(n)}
                className="flex items-start gap-2.5 p-3 rounded-xl cursor-pointer transition-all"
                style={{ background: n.is_read ? 'transparent' : 'rgba(123,63,242,0.06)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(123,63,242,0.06)'; }}>
                <NotifIcon type={n.notification_type} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                    {n.title}
                  </p>
                  <p className="text-xs mt-0.5 leading-snug line-clamp-1" style={{ color: 'var(--text-secondary)' }}>
                    {n.body}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    {formatDistanceToNow(new Date(n.created_at), { locale: fr, addSuffix: true })}
                  </p>
                </div>
                {!n.is_read && (
                  <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: 'var(--primary)' }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  ), document.body);
}
