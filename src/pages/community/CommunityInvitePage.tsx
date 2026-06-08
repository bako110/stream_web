import { PageLoader } from '../../components/ui/Spinner';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, RefreshCw, Share2, Check, Link } from 'lucide-react';
import { apiClient } from '../../api';
import { decodeId } from '../../utils/slugId';
import { Spinner } from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

export default function CommunityInvitePage() {
  const { id: slug } = useParams<{ id: string }>();
  const id           = decodeId(slug!);
  const navigate     = useNavigate();
  const mountedRef   = useRef(true);

  const [name,       setName]       = useState('');
  const [code,       setCode]       = useState('');
  const [myRole,     setMyRole]     = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [regen,      setRegen]      = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Lien d'invitation deep-link
  const inviteLink = code ? `${window.location.origin}/join/${code}` : '';

  const isAdmin   = myRole === 'admin';
  const canManage = myRole === 'admin' || myRole === 'moderator';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Le champ `invite_code` est dans l'objet community directement
      const [commRes, roleRes] = await Promise.all([
        apiClient.get<any>(`/api/v1/communities/${id}`),
        apiClient.get<any>(`/api/v1/communities/${id}/role`).catch(() => ({ data: null })),
      ]);
      if (!mountedRef.current) return;
      const comm = commRes.data?.data ?? commRes.data;
      setName(comm?.name ?? '');
      setCode(comm?.invite_code ?? '');
      setMyRole(roleRes.data?.role ?? null);
    } catch { /* silencieux */ }
    finally { if (mountedRef.current) setLoading(false); }
  }, [id]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  async function regenerate() {
    if (!confirm('Régénérer le code ? L\'ancien lien ne fonctionnera plus.')) return;
    setRegen(true);
    try {
      // Endpoint exact mobile : POST /invite-code (pas /invite/regenerate)
      const res = await apiClient.post<any>(`/api/v1/communities/${id}/invite-code`);
      const newCode = res.data?.invite_code ?? res.data?.data?.invite_code ?? res.data;
      if (typeof newCode === 'string') setCode(newCode);
      toast.success('Code régénéré');
    } catch (e: any) { toast.error(e?.response?.data?.detail ?? 'Erreur'); }
    finally { if (mountedRef.current) setRegen(false); }
  }

  function copyCode() {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => { if (mountedRef.current) setCopied(false); }, 2000);
      toast.success('Code copié');
    });
  }

  function copyLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopiedLink(true);
      setTimeout(() => { if (mountedRef.current) setCopiedLink(false); }, 2000);
      toast.success('Lien copié');
    });
  }

  function share() {
    if (!code) return;
    if (navigator.share) {
      navigator.share({
        title: `Rejoins "${name}" sur GoFolyX`,
        text:  `Utilise ce code pour rejoindre la communauté : ${code}`,
        url:   inviteLink,
      }).catch(() => {});
    } else {
      copyLink();
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl transition-all"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Inviter des membres</p>
          {name && <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{name}</p>}
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : !code ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
          <Link size={32} style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-tertiary)' }}>
            Code d'invitation non disponible
          </p>
          {isAdmin && (
            <button onClick={regenerate} disabled={regen}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(90deg, #7B3FF2, #E0389A)' }}>
              {regen ? <Spinner size="sm" /> : <><RefreshCw size={14} /> Générer un code</>}
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Illustration */}
          <div className="flex flex-col items-center pt-4 pb-2">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg, #7B3FF2, #E0389A)' }}>
              <Link size={32} color="white" />
            </div>
            <p className="text-lg font-black text-center" style={{ color: 'var(--text-primary)' }}>
              Partage le code d'invitation
            </p>
            <p className="text-sm text-center mt-1 max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
              Envoie ce code à tes amis pour qu'ils rejoignent la communauté
            </p>
          </div>

          {/* Code en boîtes individuelles */}
          <div className="rounded-3xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="p-5 text-center">
              <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>
                CODE D'INVITATION
              </p>
              <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
                {code.split('').map((ch, i) => (
                  <div key={i} className="w-9 h-10 rounded-xl flex items-center justify-center font-black text-lg"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                    {ch}
                  </div>
                ))}
              </div>
              <button onClick={copyCode}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all"
                style={{
                  background: copied ? '#10B98115' : 'linear-gradient(90deg, #7B3FF2, #E0389A)',
                  color: copied ? '#10B981' : 'white',
                  border: copied ? '1px solid #10B98130' : 'none',
                }}>
                {copied ? <><Check size={15} /> Copié !</> : <><Copy size={15} /> Copier le code</>}
              </button>
            </div>
          </div>

          {/* Lien complet */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: 'var(--text-tertiary)' }}>LIEN D'INVITATION</p>
            <p className="text-xs mb-3 break-all" style={{ color: 'var(--text-secondary)' }}>{inviteLink}</p>
            <div className="flex gap-2">
              <button onClick={copyLink}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: copiedLink ? '#10B98115' : 'var(--bg-secondary)',
                  color: copiedLink ? '#10B981' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}>
                {copiedLink ? <><Check size={13} /> Copié</> : <><Copy size={13} /> Copier</>}
              </button>
              <button onClick={share}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(90deg, #7B3FF2, #E0389A)' }}>
                <Share2 size={13} /> Partager
              </button>
            </div>
          </div>

          {/* Régénérer — admin seulement */}
          {isAdmin && (
            <button onClick={regenerate} disabled={regen}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              {regen ? <Spinner size="sm" /> : <><RefreshCw size={14} /> Régénérer le code</>}
            </button>
          )}
          <div className="h-4" />
        </div>
      )}
    </div>
  );
}
