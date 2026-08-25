import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, Heart, UserPlus, MessageCircle, Radio, CheckSquare, Square, X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import type { Notification } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useApi } from '../hooks/useApi';
import { useWs } from '../context/WebSocketContext';
import { Spinner, PageLoader } from '../components/ui/Spinner';
import { AiAnalysisStatusModal, type AiContentType } from '../components/ui/AiAnalysisStatusModal';
import { encodeId } from '../utils/slugId';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// Types "sociaux purs" qui ouvrent toujours le profil de l'acteur — 'reaction'
// et 'comment' ne sont PAS dans cette liste : ils portent un ref_type/ref_id
// vers le contenu concerné (post/reel/...) et doivent ouvrir CE contenu, pas
// le profil de la personne qui a réagi/commenté. Même liste que côté mobile
// (NotificationsScreen.tsx, USER_NOTIF_TYPES).
const USER_NOTIF_TYPES = new Set(['follow', 'profile_view', 'story_view', 'mention', 'subscription', 'reel_posted']);

/** URL de destination d'une notification — même cascade par ref_type que
 * NotificationsScreen.tsx côté mobile (handlePress). Retourne null si aucune
 * destination connue (notification purement informative). */
function notificationTargetUrl(n: Notification): string | null {
  if (USER_NOTIF_TYPES.has(n.notification_type) && n.actor?.id) {
    return `/user/${encodeId(n.actor.id)}`;
  }
  if (!n.ref_id || !n.ref_type) return null;
  switch (n.ref_type) {
    case 'concert':   return `/concerts/${encodeId(n.ref_id)}`;
    case 'event':     return `/events/${encodeId(n.ref_id)}`;
    case 'reel':      return `/reels?id=${encodeId(n.ref_id)}`;
    case 'post':      return `/posts/${encodeId(n.ref_id)}`;
    case 'community': return `/communities/${encodeId(n.ref_id)}`;
    case 'user':      return `/user/${encodeId(n.ref_id)}`;
    case 'story':     return n.actor?.id ? `/user/${encodeId(n.actor.id)}` : null;
    default:          return null;
  }
}

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  follow:       <UserPlus size={14} />,
  reaction:     <Heart size={14} />,
  comment:      <MessageCircle size={14} />,
  mention:      <MessageCircle size={14} />,
  reel_posted:  <Radio size={14} />,
  system:       <Bell size={14} />,
  welcome:      <Bell size={14} />,
  // Moderation IA (2026-08) — verdict apres analyse automatique d'un reel
  // publie par l'utilisateur (cf. recommendation_system/ai_service).
  reel_analysis_cleared: <CheckCircle size={14} />,
  reel_analysis_limited: <AlertCircle size={14} />,
  reel_analysis_removed: <AlertTriangle size={14} />,
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
  const icon  = NOTIF_ICONS[type]  ?? <Bell size={14} />;
  const color = NOTIF_COLOR[type]  ?? '#9290AE';
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white"
      style={{ background: color, boxShadow: `0 0 12px ${color}55` }}>
      {icon}
    </div>
  );
}

// Corps de notification limité à 2 lignes avec "Voir plus"/"Voir moins" —
// équivalent web de NotifCard côté mobile (NotificationsScreen.tsx),
// bouton affiché seulement si le texte dépasse réellement 2 lignes.
function NotifBody({ text }: { text: string }) {
  const [expanded, setExpanded]   = useState(false);
  const [truncated, setTruncated] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    setTruncated(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);

  return (
    <div>
      <p
        ref={ref}
        className="text-sm mt-0.5 leading-snug"
        style={expanded ? {
          color: 'var(--text-secondary)',
          whiteSpace: 'pre-line',
          wordBreak: 'break-word',
        } : {
          color: 'var(--text-secondary)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
        {text}
      </p>
      {truncated && (
        <button
          onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
          className="text-xs font-bold mt-0.5"
          style={{ color: 'var(--primary)' }}>
          {expanded ? 'Voir moins' : 'Voir plus'}
        </button>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useApi<Notification[]>(
    () => apiClient.get<Notification[]>(`${Endpoints.notifications.list}?limit=100`),
  );
  const { addListener, removeListener, clearUnreadNotifications } = useWs();

  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [selectMode,  setSelectMode]  = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deletingSel, setDeletingSel] = useState(false);
  const [aiStatusTarget, setAiStatusTarget] = useState<{ type: AiContentType; id: string } | null>(null);

  // État local synchronisé depuis `data` — nécessaire pour insérer les
  // notifications reçues en temps réel par WS sans reload complet (data,
  // lui, n'est réécrit que par refetch()).
  const [notifications, setNotifications] = useState<Notification[]>([]);
  useEffect(() => { setNotifications(data ?? []); }, [data]);

  useEffect(() => { clearUnreadNotifications(); }, [clearUnreadNotifications]);

  // Injection temps réel — même pattern que NotificationsScreen.tsx côté
  // mobile : sans id persistant on ne peut pas dédupliquer, on recharge
  // depuis l'API dans ce cas plutôt que de risquer un doublon.
  useEffect(() => {
    const onMessage = (payload: any) => {
      if (payload.type !== 'notification') return;
      if (!payload.id) { refetch(); return; }
      const newItem: Notification = {
        id:                 payload.id,
        notification_type:  payload.notification_type ?? 'system',
        title:              payload.title ?? 'Notification',
        body:               payload.body  ?? '',
        ref_id:             payload.ref_id   ?? null,
        ref_type:           payload.ref_type ?? null,
        is_read:            false,
        created_at:         payload.created_at ?? new Date().toISOString(),
        actor:              payload.actor ?? undefined,
      };
      setNotifications(prev => prev.some(n => n.id === newItem.id) ? prev : [newItem, ...prev]);
    };
    addListener(onMessage);
    return () => removeListener(onMessage);
  }, [addListener, removeListener, refetch]);

  const unread = notifications.filter(n => !n.is_read).length;
  const allSelected   = selected.size > 0 && selected.size === notifications.length;
  const someSelected  = selected.size > 0;

  function toggleItem(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(notifications.map(n => n.id)));
    }
  }

  function enterSelectMode() {
    setSelectMode(true);
    setSelected(new Set());
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  async function markAllRead() {
    await apiClient.patch(Endpoints.notifications.readAll);
    refetch();
  }

  async function deleteOne(id: string) {
    await apiClient.delete(Endpoints.notifications.delete(id));
    refetch();
  }

  async function deleteSelected() {
    if (!someSelected) return;
    setDeletingSel(true);
    try {
      await apiClient.post(Endpoints.notifications.bulkDelete, { ids: [...selected] });
      exitSelectMode();
      refetch();
    } finally {
      setDeletingSel(false);
    }
  }

  async function deleteAll() {
    setDeletingAll(true);
    try {
      await apiClient.delete(Endpoints.notifications.deleteAll);
      exitSelectMode();
      refetch();
    } finally {
      setDeletingAll(false);
    }
  }

  const hasNotifs = notifications.length > 0 && !loading;

  return (
    <div className="w-full mx-auto p-6 space-y-4">

      {/* ── Header : mode normal ── */}
      {!selectMode && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
              Notifications
            </h1>
            {unread > 0 && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                {unread} non lue{unread > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {hasNotifs && (
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <button
                onClick={deleteAll}
                disabled={deletingAll}
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl font-medium disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
                {deletingAll ? <Spinner size="sm" /> : <Trash2 size={13} />}
                Tout supprimer
              </button>

              <button
                onClick={enterSelectMode}
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl font-medium"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                <CheckSquare size={13} />
                Sélectionner
              </button>

              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl font-medium"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  <Check size={13} />
                  Tout lire
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Header : mode sélection ── remplace complètement le header normal */}
      {selectMode && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: 'rgba(123,63,242,0.1)', border: '1px solid rgba(123,63,242,0.3)' }}>

          {/* Gauche : Tout sélectionner */}
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 font-semibold text-sm"
            style={{ color: 'var(--primary)' }}>
            {allSelected
              ? <CheckSquare size={18} />
              : <Square size={18} />
            }
            {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>

          {/* Centre : compteur */}
          <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
            {selected.size} / {notifications.length}
          </span>

          {/* Droite : Supprimer + Annuler */}
          <div className="flex items-center gap-2">
            <button
              onClick={deleteSelected}
              disabled={!someSelected || deletingSel}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl font-semibold text-white disabled:opacity-40"
              style={{ background: '#ef4444' }}>
              {deletingSel ? <Spinner size="sm" /> : <Trash2 size={13} />}
              {someSelected ? `Supprimer (${selected.size})` : 'Supprimer'}
            </button>

            <button
              onClick={exitSelectMode}
              className="p-2 rounded-xl"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Liste ── */}
      {loading ? (
        <PageLoader />
      ) : notifications.length === 0 ? (
        <div className="text-center py-24">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--bg-secondary)' }}>
            <Bell size={28} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Aucune notification</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Vous êtes à jour !</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const isSelected = selected.has(n.id);
            return (
              <div
                key={n.id}
                onClick={() => {
                  if (selectMode) { toggleItem(n.id); return; }
                  if (!n.is_read) {
                    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
                    apiClient.patch(Endpoints.notifications.read(n.id)).catch(() => {});
                  }
                  // Verdict d'analyse IA — écran dédié plutôt que le contenu
                  // générique, intercepte avant la cascade ref_type normale.
                  if (n.notification_type.startsWith('reel_analysis_') && n.ref_id && n.ref_type) {
                    setAiStatusTarget({ type: n.ref_type as AiContentType, id: n.ref_id });
                    return;
                  }
                  const url = notificationTargetUrl(n);
                  if (url) navigate(url);
                }}
                className="flex items-start gap-3 p-4 rounded-xl transition-all group"
                style={{
                  background: isSelected
                    ? 'rgba(123,63,242,0.12)'
                    : n.is_read ? 'var(--surface)' : 'rgba(123,63,242,0.05)',
                  border: `1px solid ${
                    isSelected
                      ? 'rgba(123,63,242,0.5)'
                      : n.is_read ? 'var(--border)' : 'rgba(123,63,242,0.2)'}`,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}>

                {/* Checkbox */}
                {selectMode && (
                  <div className="shrink-0 mt-0.5" style={{ color: isSelected ? 'var(--primary)' : 'var(--text-tertiary)' }}>
                    {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                  </div>
                )}

                <NotifIcon type={n.notification_type} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {n.title}
                  </p>
                  <NotifBody text={n.body} />
                  <p className="text-xs mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                    {formatDistanceToNow(new Date(n.created_at), { locale: fr, addSuffix: true })}
                  </p>
                </div>

                {/* Dot non-lu + poubelle (hors mode sélection) */}
                {!selectMode && (
                  <div className="flex items-center gap-2 shrink-0 self-start mt-0.5">
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} />
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); deleteOne(n.id); }}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--text-tertiary)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AiAnalysisStatusModal
        open={!!aiStatusTarget}
        onClose={() => setAiStatusTarget(null)}
        contentType={aiStatusTarget?.type ?? 'post'}
        contentId={aiStatusTarget?.id ?? ''}
        initialStatus="done"
      />
    </div>
  );
}
