import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decodeId } from '../../utils/slugId';
import { ArrowLeft, UserCheck, UserX, Clock, Check, X } from 'lucide-react';
import { apiClient } from '../../api';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface JoinRequest {
  id: string;
  user_id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  message?: string | null;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function CommunityJoinRequestsPage() {
  const { id: slug }   = useParams<{ id: string }>();
  const id              = decodeId(slug!);
  const navigate        = useNavigate();
  const [requests,    setRequests]   = useState<JoinRequest[]>([]);
  const [loading,     setLoading]    = useState(true);
  const [processing,  setProcessing] = useState<string | null>(null);
  const [name,        setName]       = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      apiClient.get<any>(`/api/v1/communities/${id}`),
      apiClient.get<any>(`/api/v1/communities/${id}/join-requests`),
    ]).then(([commRes, reqRes]) => {
      const comm = commRes.data?.data ?? commRes.data;
      setName(comm?.name ?? '');
      const list = Array.isArray(reqRes.data) ? reqRes.data : reqRes.data?.items ?? reqRes.data?.data ?? [];
      setRequests(list.filter((r: JoinRequest) => r.status === 'pending'));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  async function approve(requestId: string) {
    setProcessing(requestId);
    try {
      await apiClient.post(`/api/v1/communities/${id}/join-requests/${requestId}/approve`);
      setRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success('Demande approuvee');
    } catch {
      toast.error('Erreur lors de l\'approbation');
    } finally { setProcessing(null); }
  }

  async function reject(requestId: string) {
    setProcessing(requestId);
    try {
      await apiClient.post(`/api/v1/communities/${id}/join-requests/${requestId}/reject`);
      setRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success('Demande refusee');
    } catch {
      toast.error('Erreur lors du refus');
    } finally { setProcessing(null); }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl transition-all"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Demandes d'adhesion</p>
          {name && <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{name}</p>}
        </div>
        {!loading && requests.length > 0 && (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
            style={{ background: 'var(--primary)' }}>
            {requests.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 opacity-50 px-6 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-secondary)' }}>
            <UserCheck size={28} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Aucune demande en attente
          </p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Les nouvelles demandes d'adhesion apparaitront ici.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <p className="px-4 pt-4 pb-2 text-[10px] font-bold tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
            {requests.length} DEMANDE{requests.length !== 1 ? 'S' : ''} EN ATTENTE
          </p>
          <div className="px-4 space-y-3 pb-6">
            {requests.map(req => {
              const isProcessing = processing === req.id;
              return (
                <div key={req.id} className="p-4 rounded-2xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar src={req.avatar_url} name={req.display_name ?? req.username ?? '?'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {req.display_name ?? req.username ?? 'Utilisateur'}
                      </p>
                      <div className="flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                        <Clock size={10} />
                        <span className="text-xs">
                          {formatDistanceToNow(new Date(req.created_at), { locale: fr, addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {req.message && (
                    <p className="text-sm mb-3 px-1 leading-relaxed italic"
                      style={{ color: 'var(--text-secondary)', borderLeft: '2px solid var(--border)', paddingLeft: 8 }}>
                      "{req.message}"
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => approve(req.id)} disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                      style={{ background: '#36D9A015', color: '#36D9A0', border: '1px solid #36D9A030' }}>
                      {isProcessing ? <Spinner size="sm" /> : <><Check size={15} /> Approuver</>}
                    </button>
                    <button onClick={() => reject(req.id)} disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                      style={{ background: '#EF444415', color: '#EF4444', border: '1px solid #EF444430' }}>
                      {isProcessing ? <Spinner size="sm" /> : <><X size={15} /> Refuser</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
