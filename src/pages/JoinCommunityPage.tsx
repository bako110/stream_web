import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Lock, Globe, Key, Zap, Shield, Clock, MessageCircle, UserPlus, AlertCircle } from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { encodeId } from '../utils/slugId';
import { Spinner, PageLoader } from '../components/ui/Spinner';
import { extractApiErrorMessage } from '../utils/apiError';
import toast from 'react-hot-toast';

interface JoinCommunity {
  id: string;
  name: string;
  description?: string | null;
  banner_url?: string | null;
  avatar_url?: string | null;
  is_private: boolean;
  is_verified?: boolean;
  members_count: number;
  entry_price_gogold?: number;
  requires_approval?: boolean;
  join_status?: 'member' | 'pending' | null;
}

/** Page /join/{code} — parite avec JoinCommunityScreen.tsx (mobile). Point
 * d'atterrissage humain du lien d'invitation (les bots recoivent deja un
 * apercu Open Graph cote serveur, cf. app/routers/og.py::public_join_community,
 * sans authentification requise). Cette page necessite un compte -- comme le
 * reste de l'app -- ProtectedRoute redirige un visiteur non connecte vers
 * /auth/login?redirect=/join/{code} pour revenir ici apres connexion. */
export default function JoinCommunityPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [community, setCommunity] = useState<JoinCommunity | null>(null);
  const [loading, setLoading]     = useState(true);
  const [joining, setJoining]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const inviteCode = (code ?? '').trim().toUpperCase();

  useEffect(() => {
    if (!inviteCode) { setError('Code invalide.'); setLoading(false); return; }
    apiClient.get<JoinCommunity>(Endpoints.communities.joinByCode(inviteCode))
      .then(res => setCommunity(res.data))
      .catch(err => setError(extractApiErrorMessage(err, "Code invalide ou expiré.")))
      .finally(() => setLoading(false));
  }, [inviteCode]);

  async function doJoin() {
    setJoining(true);
    try {
      const res = await apiClient.post<{ joined?: boolean; pending?: boolean; community_id?: string; error?: string }>(
        Endpoints.communities.joinByCode(inviteCode)
      );
      if (res.data?.joined || res.data?.error === 'already_member') {
        navigate(`/communities/${encodeId(res.data.community_id ?? community!.id)}`, { replace: true });
      } else if (res.data?.pending || res.data?.error === 'already_pending') {
        toast.success("Demande envoyée — l'admin doit approuver ta demande.");
        navigate('/communities');
      } else if (res.data?.error === 'insufficient_gogold') {
        toast.error(`Il te faut ${community?.entry_price_gogold} GoGold pour rejoindre cette communauté.`);
      } else if (res.data?.error === 'blocked') {
        toast.error("Tu ne peux pas rejoindre cette communauté.");
      } else if (res.data?.error) {
        toast.error("Impossible de rejoindre cette communauté.");
      }
    } catch (err: any) {
      toast.error(extractApiErrorMessage(err, 'Impossible de rejoindre.'));
    } finally {
      setJoining(false);
    }
  }

  function handleAction() {
    if (!community) return;
    if (community.join_status === 'member') {
      navigate(`/communities/${encodeId(community.id)}`);
      return;
    }
    const price = community.entry_price_gogold ?? 0;
    if (price > 0) {
      const ok = window.confirm(`Cette communauté coûte ${price} GoGold pour rejoindre. Continuer ?`);
      if (!ok) return;
    }
    doJoin();
  }

  if (loading) return <PageLoader />;

  if (error || !community) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-8 text-center" style={{ background: 'var(--bg)' }}>
        <div className="w-18 h-18 rounded-full flex items-center justify-center" style={{ width: 72, height: 72, background: 'rgba(239,68,68,0.1)' }}>
          <AlertCircle size={36} style={{ color: '#EF4444' }} />
        </div>
        <h1 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Lien invalide</h1>
        <p className="text-sm max-w-xs" style={{ color: 'var(--text-secondary)' }}>
          {error ?? "Ce code d'invitation est invalide ou a expiré."}
        </p>
        <button onClick={() => navigate('/communities')} className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
          Retour
        </button>
      </div>
    );
  }

  const alreadyMember   = community.join_status === 'member';
  const pendingApproval = community.join_status === 'pending';
  const price           = community.entry_price_gogold ?? 0;
  const needsApproval    = community.requires_approval || community.is_private;

  const joinLabel = needsApproval ? 'Demander à rejoindre'
    : price > 0 ? `Rejoindre · ${price} GoGold`
    : 'Rejoindre';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Bannière */}
      <div className="relative" style={{ height: 220, background: '#000' }}>
        {community.banner_url
          ? <img src={community.banner_url} className="w-full h-full object-cover" alt="" />
          : <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }} />
        }
        <div className="absolute inset-x-0 bottom-0 h-24" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }} />
        <button onClick={() => navigate('/communities')}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <X size={18} color="#fff" />
        </button>
      </div>

      <div className="max-w-lg mx-auto px-6 py-6 space-y-4">
        {/* Avatar + nom */}
        <div className="flex items-center gap-3.5" style={{ marginTop: -44 }}>
          {community.avatar_url
            ? <img src={community.avatar_url} className="w-16 h-16 rounded-full object-cover shrink-0" style={{ border: '3px solid var(--bg)' }} alt="" />
            : <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0" style={{ border: '3px solid var(--bg)', background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
                <span className="text-white font-black text-xl">{community.name[0]?.toUpperCase()}</span>
              </div>
          }
          <div className="flex-1 min-w-0 pt-5">
            <p className="text-xl font-black truncate" style={{ color: 'var(--text-primary)' }}>{community.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {community.is_private ? <Lock size={12} style={{ color: 'var(--text-tertiary)' }} /> : <Globe size={12} style={{ color: 'var(--text-tertiary)' }} />}
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {community.is_private ? 'Communauté privée' : 'Communauté publique'} · {community.members_count} membre{community.members_count !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {community.description && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{community.description}</p>
        )}

        {/* Badge code d'invitation */}
        <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl" style={{ background: 'rgba(123,63,242,0.06)', border: '1px solid rgba(123,63,242,0.2)' }}>
          <Key size={14} style={{ color: 'var(--primary)' }} />
          <span className="text-sm" style={{ color: 'var(--primary)' }}>
            Invité via le code <span className="font-black">{inviteCode}</span>
          </span>
        </div>

        {/* Badge prix */}
        {price > 0 && !alreadyMember && !pendingApproval && (
          <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <Zap size={14} style={{ color: '#F59E0B' }} />
            <span className="text-sm" style={{ color: '#F59E0B' }}>Adhésion : <span className="font-black">{price} GoGold</span></span>
          </div>
        )}

        {/* Badge approbation */}
        {needsApproval && !alreadyMember && !pendingApproval && (
          <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <Shield size={14} style={{ color: '#3B82F6' }} />
            <span className="text-sm" style={{ color: '#3B82F6' }}>Communauté sur approbation — l'admin doit accepter</span>
          </div>
        )}

        {/* Bouton principal */}
        {alreadyMember ? (
          <button onClick={handleAction}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-white"
            style={{ background: 'linear-gradient(90deg,#10B981,#059669)' }}>
            <MessageCircle size={20} /> Ouvrir la discussion
          </button>
        ) : pendingApproval ? (
          <div className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1.5px solid rgba(245,158,11,0.25)', color: '#F59E0B' }}>
            <Clock size={18} /> Demande en cours d'examen
          </div>
        ) : (
          <button onClick={handleAction} disabled={joining}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(90deg,#7B3FF2,#5B2EC4)' }}>
            {joining ? <Spinner size="sm" /> : <><UserPlus size={20} /> {joinLabel}</>}
          </button>
        )}

        {needsApproval && !alreadyMember && !pendingApproval && price === 0 && (
          <p className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
            L'admin devra approuver ta demande
          </p>
        )}
      </div>
    </div>
  );
}
