import { useState } from 'react';
import { Bell, Check, Trash2, Heart, UserPlus, MessageCircle, Radio, CheckSquare, Square, X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import type { Notification } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useApi } from '../hooks/useApi';
import { Spinner, PageLoader } from '../components/ui/Spinner';
import { AiAnalysisStatusModal, type AiContentType } from '../components/ui/AiAnalysisStatusModal';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

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

export default function NotificationsPage() {
  const { data, loading, refetch } = useApi<Notification[]>(
    () => apiClient.get<Notification[]>(`${Endpoints.notifications.list}?limit=100`),
  );

  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [selectMode,  setSelectMode]  = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deletingSel, setDeletingSel] = useState(false);
  const [aiStatusTarget, setAiStatusTarget] = useState<{ type: AiContentType; id: string } | null>(null);

  const notifications = data ?? [];
  const unread        = notifications.filter(n => !n.is_read).length;
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
                  if (n.notification_type.startsWith('reel_analysis_') && n.ref_id && n.ref_type) {
                    setAiStatusTarget({ type: n.ref_type as AiContentType, id: n.ref_id });
                  }
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
                  cursor: selectMode ? 'pointer' : 'default',
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
                  <p className="text-sm mt-0.5 leading-snug" style={{ color: 'var(--text-secondary)' }}>
                    {n.body}
                  </p>
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
