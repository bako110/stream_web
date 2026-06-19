import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCheck } from 'lucide-react';
import { useConfirm } from '../components/ui/Dialog';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import toast from 'react-hot-toast';

interface BlockedUser {
  id: string;
  username: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

function displayName(u: BlockedUser) {
  const full = [u.first_name, u.last_name].filter(Boolean).join(' ');
  return u.display_name ?? (full || u.username);
}

export default function BlockedUsersPage() {
  const navigate     = useNavigate();
  const [users,      setUsers]      = useState<BlockedUser[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);
  const { confirm, ConfirmDialog }  = useConfirm();

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get<BlockedUser[]>(Endpoints.users.blocked);
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch { toast.error('Impossible de charger la liste.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUnblock(user: BlockedUser) {
    const ok = await confirm({ title: `Débloquer @${user.username} ?`, confirmLabel: 'Débloquer' });
    if (!ok) return;
    setUnblocking(user.id);
    try {
      await apiClient.delete(Endpoints.users.block(user.id));
      setUsers(prev => prev.filter(u => u.id !== user.id));
      toast.success(`@${user.username} débloqué.`);
    } catch { toast.error('Impossible de débloquer cet utilisateur.'); }
    finally { setUnblocking(null); }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/settings')}
          className="p-2.5 rounded-xl transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <ArrowLeft size={17} />
        </button>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Utilisateurs bloqués</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{users.length} utilisateur{users.length !== 1 ? 's' : ''} bloqué{users.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl animate-pulse"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-12 h-12 rounded-full" style={{ background: 'var(--bg-secondary)' }} />
              <div className="flex-1 space-y-2">
                <div className="h-4 rounded-lg w-2/5" style={{ background: 'var(--bg-secondary)' }} />
                <div className="h-3 rounded-lg w-1/4" style={{ background: 'var(--bg-secondary)' }} />
              </div>
              <div className="w-20 h-8 rounded-full" style={{ background: 'var(--bg-secondary)' }} />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl py-16 flex flex-col items-center gap-3 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <UserCheck size={40} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
          <p className="font-black text-base" style={{ color: 'var(--text-primary)' }}>Aucun utilisateur bloqué</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Les utilisateurs que vous bloquez apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map(user => (
            <div key={user.id} className="flex items-center gap-3 p-4 rounded-2xl transition-all"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Avatar src={user.avatar_url} name={displayName(user)} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{displayName(user)}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>@{user.username}</p>
                {user.bio && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{user.bio}</p>
                )}
              </div>
              <button
                onClick={() => handleUnblock(user)}
                disabled={unblocking === user.id}
                className="shrink-0 px-3.5 py-2 rounded-full text-xs font-black transition-all disabled:opacity-50"
                style={{ border: '1.5px solid var(--primary)', color: 'var(--primary)', background: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--primary)'; }}>
                {unblocking === user.id ? <Spinner size="sm" /> : 'Débloquer'}
              </button>
            </div>
          ))}
        </div>
      )}
      {ConfirmDialog}
    </div>
  );
}
