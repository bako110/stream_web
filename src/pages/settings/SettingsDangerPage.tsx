import { useState } from 'react';
import { ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { Spinner } from '../../components/ui/Spinner';

export default function SettingsDangerPage() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await apiClient.delete(Endpoints.users.deleteMe);
      await logout();
    } catch { setDeleting(false); setConfirmDelete(false); }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/settings')}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#EF4444')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <ArrowLeft size={16} style={{ color: 'var(--text-primary)' }} />
        </button>
        <div>
          <h1 className="text-xl font-black" style={{ color: '#EF4444' }}>Zone dangereuse</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Actions irréversibles</p>
        </div>
      </div>

      {!confirmDelete ? (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div role="button" tabIndex={0}
            onClick={() => setConfirmDelete(true)}
            onKeyDown={e => e.key === 'Enter' && setConfirmDelete(true)}
            className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all"
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(239,68,68,0.1)' }}>
              <Trash2 size={16} color="#EF4444" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium" style={{ color: '#EF4444' }}>Supprimer mon compte</span>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Action irréversible</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.15)' }}>
              <AlertTriangle size={20} color="#EF4444" />
            </div>
            <div>
              <p className="font-black text-sm" style={{ color: '#EF4444' }}>Confirmer la suppression</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Toutes vos données seront effacées définitivement.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              Annuler
            </button>
            <button onClick={handleDeleteAccount} disabled={deleting}
              className="flex-1 py-3 rounded-xl text-sm font-black text-white disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: '#EF4444' }}>
              {deleting ? <Spinner size="sm" /> : <><Trash2 size={14} /> Supprimer</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
