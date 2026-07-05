import { useState, useEffect } from 'react';
import { useConfirm } from '../../components/ui/Dialog';
import { useParams, useNavigate } from 'react-router-dom';
import { encodeId, decodeId } from '../../utils/slugId';
import {
  ArrowLeft, Shield, Star, User, UserX, Ban, Award,
  Film as FilmIcon, Heart, MessageCircle, Eye, Users,
  ChevronRight, BarChart2, GoGold,
} from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner, PageLoader } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface MemberProfile {
  id: string; user_id: string;
  display_name?: string | null; username?: string | null; avatar_url?: string | null;
  role: 'admin' | 'moderator' | 'member';
  joined_at?: string | null; bio?: string | null;
  gogold_total: number; badges: string[];
  posts_count: number; reactions_given: number; events_attended: number;
  is_online: boolean; last_seen?: string | null;
}

interface CreatorStats {
  reels_count: number; reels_views: number; reels_likes: number; reels_comments: number;
  posts_count: number; posts_likes: number; posts_comments: number;
  stories_count: number; stories_views: number;
  followers: number; following: number;
  total_gogold_earned: number; gifts_gogold_earned: number; community_gogold_earned: number;
}

const ROLE_COLORS: Record<string, string> = { admin: '#7B3FF2', moderator: '#7B3FF2', member: '#9390AB' };
const ROLE_LABELS: Record<string, string> = { admin: 'Admin', moderator: 'Modérateur', member: 'Membre' };

function StatRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-4"
      style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: color + '18' }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

export default function CommunityMemberProfilePage() {
  const { id: idSlug, userId: userSlug } = useParams<{ id: string; userId: string }>();
  const id      = decodeId(idSlug!);
  const userId  = decodeId(userSlug!);
  const navigate = useNavigate();
  const { user: me } = useAuthStore();

  const [profile,       setProfile]       = useState<MemberProfile | null>(null);
  const [creatorStats,  setCreatorStats]  = useState<CreatorStats | null>(null);
  const [myRole,        setMyRole]        = useState<string | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [statsLoading,  setStatsLoading]  = useState(false);
  const [showStats,     setShowStats]     = useState(false);
  const [roleLoading,   setRoleLoading]   = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const isMe      = userId === me?.id;
  const canManage = (myRole === 'admin' || myRole === 'moderator') && !isMe;
  const isAdmin   = myRole === 'admin';

  useEffect(() => {
    if (!id || !userId) return;
    setLoading(true);
    Promise.all([
      apiClient.get<any>(Endpoints.communities.memberProfile(id, userId)),
      apiClient.get<any>(`/api/v1/communities/${id}/members`).catch(() => ({ data: [] })),
    ]).then(([r, memR]) => {
      setProfile(r.data?.data ?? r.data);
      const members = Array.isArray(memR.data) ? memR.data : memR.data?.items ?? [];
      const mine = members.find((m: any) => m.user_id === me?.id);
      setMyRole(mine?.role ?? null);
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, [id, userId, me?.id]);

  async function loadCreatorStats() {
    if (!id || !userId || creatorStats) return;
    setStatsLoading(true);
    try {
      const r = await apiClient.get<any>(Endpoints.communities.memberCreatorStats(id, userId));
      setCreatorStats(r.data?.data ?? r.data);
    } catch { toast.error('Stats indisponibles'); }
    finally { setStatsLoading(false); }
  }

  async function changeRole(role: string) {
    if (!id || !userId) return;
    setRoleLoading(true);
    try {
      await apiClient.put(Endpoints.communities.memberRole(id, userId), { role });
      setProfile(prev => prev ? { ...prev, role: role as any } : prev);
      toast.success('Rôle modifié');
    } catch { toast.error('Erreur'); } finally { setRoleLoading(false); }
  }

  async function kickMember() {
    const ok = await confirm({ title: 'Exclure ce membre ?', danger: true, confirmLabel: 'Exclure' });
    if (!ok) return;
    setActionLoading(true);
    try {
      await apiClient.delete(Endpoints.communities.member(id!, userId!));
      toast.success('Membre exclu');
      navigate(-1);
    } catch { toast.error('Erreur'); } finally { setActionLoading(false); }
  }

  async function blockMember() {
    const ok = await confirm({ title: 'Bloquer ce membre ?', message: 'Il ne pourra plus accéder à la communauté.', danger: true, confirmLabel: 'Bloquer' });
    if (!ok) return;
    setActionLoading(true);
    try {
      await apiClient.post(Endpoints.communities.block(id!, userId!));
      toast.success('Membre bloqué');
      navigate(-1);
    } catch { toast.error('Erreur'); } finally { setActionLoading(false); }
  }

  if (loading) return <PageLoader />;

  if (!profile) return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={() => navigate(-1)} style={{ color: 'var(--text-primary)' }}><ArrowLeft size={20} /></button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Profil introuvable</p>
      </div>
    </div>
  );

  const roleColor = ROLE_COLORS[profile.role] ?? '#9390AB';

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl transition-all"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Profil membre</h1>
        </div>
        <button onClick={() => navigate(`/user/${encodeId(userId)}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
          Voir profil <ChevronRight size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Avatar + infos */}
        <div className="p-6 flex flex-col items-center text-center"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <div className="relative mb-3">
            <Avatar src={profile.avatar_url} name={profile.display_name ?? profile.username ?? '?'} size="lg" />
            {profile.is_online && (
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white"
                style={{ background: '#7B3FF2' }} />
            )}
          </div>
          <h2 className="text-lg font-black mb-0.5" style={{ color: 'var(--text-primary)' }}>
            {profile.display_name ?? profile.username}
          </h2>
          {profile.username && (
            <p className="text-sm mb-2" style={{ color: 'var(--text-tertiary)' }}>@{profile.username}</p>
          )}
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: roleColor + '18', color: roleColor }}>
              {profile.role === 'admin' ? <Shield size={11} /> : profile.role === 'moderator' ? <Star size={11} /> : <User size={11} />}
              {ROLE_LABELS[profile.role]}
            </span>
            {profile.is_online
              ? <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#7B3FF218', color: '#7B3FF2' }}>En ligne</span>
              : profile.last_seen && (
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Vu {format(new Date(profile.last_seen), 'd MMM', { locale: fr })}
                </span>
              )}
          </div>
          {profile.bio && (
            <p className="text-sm max-w-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{profile.bio}</p>
          )}
          {profile.joined_at && (
            <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
              Membre depuis {format(new Date(profile.joined_at), 'd MMMM yyyy', { locale: fr })}
            </p>
          )}
          {/* Badges */}
          {profile.badges && profile.badges.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {profile.badges.map((b, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)' }}>{b}</span>
              ))}
            </div>
          )}
        </div>

        {/* Stats dans la communauté */}
        <div className="p-4">
          <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>ACTIVITÉ DANS LA COMMUNAUTÉ</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <StatRow icon={<Award size={15} />} label="GoGold gagnés" value={profile.gogold_total} color="#7B3FF2" />
            <StatRow icon={<MessageCircle size={15} />} label="Messages envoyés" value={profile.posts_count} color="#7B3FF2" />
            <StatRow icon={<Heart size={15} />} label="Réactions données" value={profile.reactions_given} color="#EF4444" />
            <div className="flex items-center gap-3 py-2.5 px-4">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: '#7B3FF218' }}>
                <Users size={15} style={{ color: '#7B3FF2' }} />
              </div>
              <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>Événements</span>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{profile.events_attended}</span>
            </div>
          </div>
        </div>

        {/* Stats créateur */}
        <div className="px-4 pb-2">
          <button onClick={() => { setShowStats(v => !v); if (!showStats) loadCreatorStats(); }}
            className="w-full flex items-center gap-2 p-3.5 rounded-2xl text-sm font-semibold transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <BarChart2 size={16} style={{ color: 'var(--primary)' }} />
            <span style={{ color: 'var(--text-primary)' }}>Stats créateur</span>
            <ChevronRight size={15} className="ml-auto transition-transform"
              style={{ color: 'var(--text-tertiary)', transform: showStats ? 'rotate(90deg)' : 'none' }} />
          </button>
        </div>

        {showStats && (
          <div className="px-4 pb-4">
            {statsLoading ? <PageLoader /> :
              creatorStats ? (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <StatRow icon={<FilmIcon size={15} />} label="Reels publiés" value={creatorStats.reels_count} color="#7B3FF2" />
                  <StatRow icon={<Eye size={15} />} label="Vues des reels" value={creatorStats.reels_views.toLocaleString()} color="#7B3FF2" />
                  <StatRow icon={<Heart size={15} />} label="Likes reels" value={creatorStats.reels_likes.toLocaleString()} color="#EF4444" />
                  <StatRow icon={<MessageCircle size={15} />} label="Posts publiés" value={creatorStats.posts_count} color="#7B3FF2" />
                  <StatRow icon={<Users size={15} />} label="Abonnés" value={creatorStats.followers.toLocaleString()} color="#7B3FF2" />
                  <StatRow icon={<GoGold size={15} />} label="GoGold gagnés (total)" value={creatorStats.total_gogold_earned} color="#7B3FF2" />
                  <StatRow icon={<Award size={15} />} label="GoGold communauté" value={creatorStats.community_gogold_earned} color="#7B3FF2" />
                </div>
              ) : null}
          </div>
        )}

        {/* Actions admin */}
        {canManage && (
          <div className="p-4 space-y-3">
            <p className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--text-tertiary)' }}>GESTION DU RÔLE</p>
            <div className="flex flex-wrap gap-2">
              {isAdmin && profile.role !== 'admin' && (
                <button onClick={() => changeRole('admin')} disabled={roleLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border"
                  style={{ background: '#7B3FF215', borderColor: '#7B3FF240', color: '#7B3FF2' }}>
                  <Shield size={12} /> Promouvoir Admin
                </button>
              )}
              {profile.role !== 'moderator' && (
                <button onClick={() => changeRole('moderator')} disabled={roleLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border"
                  style={{ background: '#7B3FF215', borderColor: '#7B3FF240', color: '#7B3FF2' }}>
                  <Star size={12} /> Promouvoir Mod
                </button>
              )}
              {profile.role !== 'member' && (
                <button onClick={() => changeRole('member')} disabled={roleLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  <User size={12} /> Rétrograder Membre
                </button>
              )}
            </div>

            <p className="text-[10px] font-bold tracking-widest pt-2" style={{ color: '#EF4444' }}>ACTIONS</p>
            <div className="flex gap-2">
              <button onClick={kickMember} disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border"
                style={{ background: '#EF444415', borderColor: '#EF444440', color: '#EF4444' }}>
                <UserX size={12} /> Exclure
              </button>
              {isAdmin && (
                <button onClick={blockMember} disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border"
                  style={{ background: '#EF444410', borderColor: '#EF444430', color: '#EF4444' }}>
                  <Ban size={12} /> Bloquer
                </button>
              )}
            </div>
            <div className="h-4" />
          </div>
        )}
      </div>
      {ConfirmDialog}
    </div>
  );
}
