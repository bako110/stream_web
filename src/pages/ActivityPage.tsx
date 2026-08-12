import { PageLoader } from '../components/ui/Spinner';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../components/ui/Dialog';
import { encodeId } from '../utils/slugId';
import {
  Activity, UserPlus, Calendar, Music2, Users, Film,
  MessageCircle, Heart, Eye, AtSign, Gift, ChevronRight,
  UserCheck, Bell, Trash2,
} from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Spinner } from '../components/ui/Spinner';
import { Avatar } from '../components/ui/Avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { formatTimeAgo } from '../utils/date';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActivityActor {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

interface ActivityItem {
  id: string;
  actor_id: string;
  actor: ActivityActor | null;
  target_user_id?: string | null;
  activity_type: string;
  ref_id?: string | null;
  summary?: string | null;
  created_at: string;
}

type ActivityTab = 'all' | 'foryou' | 'unread';

// ── Config ────────────────────────────────────────────────────────────────────

const CFG: Record<string, {
  Icon: React.FC<any>;
  grad: [string, string];
  label: (name: string, summary?: string | null) => string;
}> = {
  follow:           { Icon: UserPlus,       grad: ['#7B3FF2','#9B65F5'], label: () => 'vous suit maintenant' },
  event_created:    { Icon: Calendar,       grad: ['#7B3FF2','#5B2EC4'], label: (_, s) => s || 'a créé un événement' },
  concert_created:  { Icon: Music2,         grad: ['#7B3FF2','#A78BFA'], label: (_, s) => s || 'a créé un concert' },
  event_going:      { Icon: Calendar,       grad: ['#7B3FF2','#5B2EC4'], label: (_, s) => s || 'va à un événement' },
  concert_going:    { Icon: Music2,         grad: ['#7B3FF2','#5B2EC4'], label: (_, s) => s || 'va à un concert' },
  community_joined: { Icon: Users,          grad: ['#9B65F5','#C4B5FD'], label: (_, s) => s || 'a rejoint une communauté' },
  reel_posted:      { Icon: Film,           grad: ['#7B3FF2','#5B2EC4'], label: (_, s) => s || 'a posté un reel' },
  comment:          { Icon: MessageCircle,  grad: ['#7B3FF2','#5B2EC4'], label: (_, s) => s || 'a commenté votre contenu' },
  reaction:         { Icon: Heart,          grad: ['#EF4444','#FCA5A5'], label: (_, s) => s || 'a réagi à votre contenu' },
  story_view:       { Icon: Eye,            grad: ['#7B3FF2','#5B2EC4'], label: () => 'a vu votre story' },
  mention:          { Icon: AtSign,         grad: ['#06B6D4','#67E8F9'], label: (_, s) => s || 'vous a mentionné' },
  birthday:         { Icon: Gift,           grad: ['#7B3FF2','#5B2EC4'], label: () => "fête son anniversaire aujourd'hui" },
};

const NAVIGABLE = ['concert_created','concert_going','event_created','event_going','community_joined','reel_posted'];
const FOR_YOU   = ['reaction','comment','follow','mention'];


function groupByDate(items: ActivityItem[]): { title: string; items: ActivityItem[] }[] {
  const sections: Record<string, ActivityItem[]> = {};
  const now = Date.now();
  for (const item of items) {
    const hrs = (now - new Date(item.created_at).getTime()) / 3_600_000;
    const label = hrs < 24 ? "Aujourd'hui" : hrs < 48 ? 'Hier' : hrs < 168 ? 'Cette semaine' : 'Plus ancien';
    if (!sections[label]) sections[label] = [];
    sections[label].push(item);
  }
  const ORDER = ["Aujourd'hui", 'Hier', 'Cette semaine', 'Plus ancien'];
  return ORDER.filter(k => sections[k]).map(k => ({ title: k, items: sections[k] }));
}

// ── ActivityCard ──────────────────────────────────────────────────────────────

function ActivityCard({
  item, isRead, isFollowing, onPress, onFollow, onDelete,
}: {
  item: ActivityItem;
  isRead: boolean;
  isFollowing: boolean;
  onPress: () => void;
  onFollow: () => void;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();
  const cfg        = CFG[item.activity_type] ?? CFG.follow;
  const { Icon }   = cfg;
  const actorName  = item.actor?.display_name || item.actor?.username || 'Utilisateur';
  const isNav      = NAVIGABLE.includes(item.activity_type) && !!item.ref_id;
  const isFollow   = item.activity_type === 'follow';
  const isBirthday = item.activity_type === 'birthday';
  const [c1, c2]   = cfg.grad;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({ title: 'Supprimer cette activité ?', danger: true, confirmLabel: 'Supprimer' });
    if (!ok) return;
    setDeleting(true);
    try {
      await apiClient.delete(Endpoints.activity.delete(item.id));
      onDelete(item.id);
      toast.success('Activité supprimée');
    } catch {
      toast.error('Erreur lors de la suppression');
      setDeleting(false);
    }
  };

  return (
    <>
    <div
      className="group flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all"
      style={{
        background: isRead ? 'var(--surface)' : `rgba(123,63,242,0.05)`,
        border: `1px solid ${isRead ? 'var(--border)' : 'rgba(123,63,242,0.2)'}`,
      }}
      onClick={onPress}
      onMouseEnter={e => (e.currentTarget.style.borderColor = c1 + '60')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = isRead ? 'var(--border)' : 'rgba(123,63,242,0.2)')}
    >
      {/* Point non-lu */}
      {!isRead && (
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--primary)' }} />
      )}

      {/* Avatar + badge type */}
      <div className="relative shrink-0" onClick={e => { e.stopPropagation(); }}>
        <Avatar src={item.actor?.avatar_url} name={actorName} size="sm" />
        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
          style={{ background: `linear-gradient(135deg,${c1},${c2})` }}>
          <Icon size={9} color="#fff" />
        </div>
      </div>

      {/* Texte */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
          <span className="font-bold">{actorName} </span>
          <span style={{ color: 'var(--text-secondary)' }}>{cfg.label(actorName, item.summary)}</span>
          {isBirthday && ' 🎂'}
        </p>
        {item.summary && item.summary !== cfg.label(actorName, item.summary) && (
          <p className="text-xs mt-0.5 px-2 py-0.5 rounded inline-block truncate max-w-full"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            {item.summary}
          </p>
        )}
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {formatTimeAgo(item.created_at)}
        </p>
      </div>

      {/* Actions droite */}
      <div className="flex items-center gap-2 shrink-0">
        {isFollow && !isFollowing && (
          <button onClick={e => { e.stopPropagation(); onFollow(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all"
            style={{ background: 'var(--primary)' }}>
            <UserPlus size={12} /> Suivre
          </button>
        )}
        {isFollow && isFollowing && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            <UserCheck size={12} /> Suivi(e)
          </div>
        )}
        {isNav && !isFollow && (
          <div className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-secondary)' }}>
            <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
          </div>
        )}

        {/* Bouton supprimer — visible au hover */}
        <button onClick={handleDelete} disabled={deleting}
          className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
          title="Supprimer">
          {deleting ? <Spinner size="sm" /> : <Trash2 size={13} />}
        </button>
      </div>
    </div>
    {ConfirmDialog}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const navigate     = useNavigate();
  const [items, setItems]       = useState<ActivityItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(true);
  const [tab, setTab]           = useState<ActivityTab>('all');
  const [readIds, setReadIds]   = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<Set<string>>(new Set());

  const load = useCallback(async (p = 1, refresh = false) => {
    try {
      const r = await apiClient.get<ActivityItem[]>(`${Endpoints.activity.feed}?page=${p}&limit=30`);
      const data = Array.isArray(r.data) ? r.data : [];
      if (refresh || p === 1) {
        setItems(data);
        setTimeout(() => setReadIds(new Set(data.map(d => d.id))), 1000);
      } else {
        setItems(prev => {
          const ids = new Set(prev.map(x => x.id));
          return [...prev, ...data.filter(d => !ids.has(d.id))];
        });
      }
      setHasMore(data.length >= 30);
      setPage(p);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(1); }, []);

  const handleFollow = useCallback(async (actorId: string) => {
    setFollowing(prev => new Set([...prev, actorId]));
    try {
      await apiClient.post(`${Endpoints.users.follow(actorId)}`);
    } catch {
      setFollowing(prev => { const s = new Set(prev); s.delete(actorId); return s; });
    }
  }, []);

  const handlePress = useCallback((item: ActivityItem) => {
    if (!item.ref_id) {
      if (item.actor) navigate(`/user/${encodeId(item.actor.id)}`);
      return;
    }
    const t = item.activity_type;
    if (t === 'concert_created' || t === 'concert_going') navigate(`/concerts/${encodeId(item.ref_id)}`);
    else if (t === 'event_created' || t === 'event_going') navigate(`/events/${encodeId(item.ref_id)}`);
    else if (t === 'community_joined') navigate(`/communities/${encodeId(item.ref_id)}`);
    else if (t === 'reel_posted') navigate(`/reels`);
    else if (item.actor) navigate(`/user/${encodeId(item.actor.id)}`);
  }, [navigate]);

  const handleDelete = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const filtered = tab === 'unread'
    ? items.filter(i => !readIds.has(i.id))
    : tab === 'foryou'
    ? items.filter(i => FOR_YOU.includes(i.activity_type))
    : items;

  const sections     = groupByDate(filtered);
  const unreadCount  = items.filter(i => !readIds.has(i.id)).length;

  const TABS: { key: ActivityTab; label: string }[] = [
    { key: 'all',    label: 'Tout' },
    { key: 'foryou', label: 'Pour vous' },
    { key: 'unread', label: `Non lus${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center relative"
          style={{ background: 'rgba(123,63,242,0.12)' }}>
          <Activity size={20} style={{ color: 'var(--primary)' }} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center"
              style={{ background: 'var(--primary)' }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <div>
          <h1 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Activité</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {items.length} événement{items.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex-1 py-3 text-sm font-semibold transition-all relative"
            style={{ color: tab === t.key ? 'var(--primary)' : 'var(--text-tertiary)' }}>
            {t.label}
            {tab === t.key && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
                style={{ background: 'var(--primary)' }} />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <PageLoader />
        ) : sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--bg-secondary)' }}>
              <Bell size={28} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {tab === 'unread' ? 'Tout est lu ✓' : 'Aucune activité'}
            </p>
            <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
              {tab === 'unread'
                ? 'Vous êtes à jour.'
                : 'Suivez des personnes pour voir leur activité ici.'}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {sections.map(section => (
              <section key={section.title}>
                {/* Section header */}
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-[10px] font-bold tracking-widest shrink-0"
                    style={{ color: 'var(--text-tertiary)' }}>
                    {section.title.toUpperCase()}
                  </p>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                </div>

                <div className="space-y-2">
                  {section.items.map(item => (
                    <ActivityCard
                      key={item.id}
                      item={item}
                      isRead={readIds.has(item.id)}
                      isFollowing={following.has(item.actor?.id ?? '')}
                      onPress={() => handlePress(item)}
                      onFollow={() => item.actor && handleFollow(item.actor.id)}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            ))}

            {/* Voir plus */}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button onClick={() => load(page + 1)} disabled={loading}
                  className="btn-secondary px-8">
                  {loading ? <Spinner size="sm" className="mx-auto" /> : 'Voir plus'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
