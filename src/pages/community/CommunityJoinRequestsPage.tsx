import { PageLoader } from '../../components/ui/Spinner';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decodeId } from '../../utils/slugId';
import { ArrowLeft, UserCheck, Clock, Check, X, Users } from 'lucide-react';
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
      toast.success('Demande approuvée');
    } catch {
      toast.error('Erreur lors de l\'approbation');
    } finally { setProcessing(null); }
  }

  async function reject(requestId: string) {
    setProcessing(requestId);
    try {
      await apiClient.post(`/api/v1/communities/${id}/join-requests/${requestId}/reject`);
      setRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success('Demande refusée');
    } catch {
      toast.error('Erreur lors du refus');
    } finally { setProcessing(null); }
  }

  async function approveAll() {
    for (const r of requests) {
      try { await apiClient.post(`/api/v1/communities/${id}/join-requests/${r.id}/approve`); }
      catch {}
    }
    setRequests([]);
    toast.success('Toutes les demandes approuvées');
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Demandes d'adhésion</p>
          {name && <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{name}</p>}
        </div>
        {!loading && requests.length > 0 && (
          <span className="w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ background: '#7B3FF2' }}>
            {requests.length}
          </span>
        )}
      </div>

      {loading ? (
        <PageLoader />
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 px-6 text-center" style={{ opacity: 0.5 }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--bg-secondary)' }}>
            <UserCheck size={24} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="font-bold text-sm" style={{ color: 'var(--text-tertiary)' }}>Aucune demande en attente</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Les nouvelles demandes apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Barre d'actions groupées */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-[11px] font-bold tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
              {requests.length} EN ATTENTE
            </p>
            {requests.length > 1 && (
              <button onClick={approveAll}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
                style={{ background: '#7B3FF215', color: '#7B3FF2' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#7B3FF225'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#7B3FF215'; }}>
                <Users size={11} /> Tout approuver
              </button>
            )}
          </div>

          <div className="px-4 space-y-2.5 pb-6">
            {requests.map(req => {
              const isProcessing = processing === req.id;
              const displayName  = req.display_name ?? req.username ?? 'Utilisateur';
              return (
                <div key={req.id}
                  className="rounded-2xl overflow-hidden transition-all"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {/* Infos utilisateur */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Avatar src={req.avatar_url} name={displayName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {displayName}
                      </p>
                      {req.username && req.display_name && (
                        <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>@{req.username}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                      <Clock size={10} />
                      <span className="text-[10px]">
                        {formatDistanceToNow(new Date(req.created_at), { locale: fr, addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {req.message && (
                    <div className="mx-4 mb-3 px-3 py-2 rounded-xl text-sm italic leading-relaxed"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderLeft: '3px solid #7B3FF240' }}>
                      "{req.message}"
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex border-t" style={{ borderColor: 'var(--border)' }}>
                    <button onClick={() => reject(req.id)} disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40"
                      style={{ color: 'var(--text-tertiary)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#EF444410'; (e.currentTarget as HTMLElement).style.color = '#EF4444'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'; }}>
                      {isProcessing ? <Spinner size="sm" /> : <><X size={14} /> Refuser</>}
                    </button>
                    <div style={{ width: 1, background: 'var(--border)' }} />
                    <button onClick={() => approve(req.id)} disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold transition-colors disabled:opacity-40"
                      style={{ color: '#7B3FF2' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#7B3FF210'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      {isProcessing ? <Spinner size="sm" /> : <><Check size={14} /> Approuver</>}
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
