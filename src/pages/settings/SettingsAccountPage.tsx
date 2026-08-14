import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowLeft, Lock, Eye, EyeOff, Shield, AlertTriangle,
  User, Edit2, ChevronRight, CheckCircle, PlusCircle, XCircle, CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import { extractApiErrorMessage } from '../../utils/apiError';
import { accountsService, MAX_ACCOUNTS } from '../../services/accountsService';
import type { StoredAccount } from '../../services/accountsService';
import { useConfirm } from '../../components/ui/Dialog';

// ── Section multi-compte — parite avec SettingsCompteScreen.tsx (mobile) ──────
function AccountsSection() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<StoredAccount[]>(() => accountsService.listAccounts());
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();
  const canAdd = accounts.length < MAX_ACCOUNTS;

  async function handleSwitch(account: StoredAccount) {
    if (account.is_active || switchingId) return;
    setSwitchingId(account.user_id);
    try {
      await accountsService.switchAccount(account.user_id);
      window.location.reload();
    } catch {
      setSwitchingId(null);
    }
  }

  async function handleRemove(account: StoredAccount) {
    const ok = await confirm({
      title: 'Retirer ce compte ?',
      message: `Tu pourras ajouter à nouveau "${account.display_name || account.username}" plus tard.`,
      confirmLabel: 'Retirer',
      danger: true,
    });
    if (!ok) return;
    const wasActive = account.is_active;
    const newActive = await accountsService.removeAccount(account.user_id);
    if (wasActive) {
      if (newActive === null) window.location.href = '/auth/login';
      else window.location.reload();
      return;
    }
    setAccounts(accountsService.listAccounts());
  }

  if (accounts.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="px-4 pt-3.5 pb-2 text-xs font-black tracking-widest" style={{ color: 'var(--text-tertiary)' }}>COMPTES</p>
      {accounts.map((account, i) => {
        const isSwitching = switchingId === account.user_id;
        const initial = (account.display_name || account.username || '?')[0]?.toUpperCase() ?? '?';
        return (
          <div key={account.user_id}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all"
            style={{ borderTop: '1px solid var(--border)', opacity: account.is_active ? 1 : 0.9 }}
            onClick={() => handleSwitch(account)}
            onMouseEnter={e => { if (!account.is_active) (e.currentTarget.style.background = 'var(--bg-secondary)'); }}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
              style={account.is_active ? { border: '2px solid var(--primary)' } : {}}>
              {account.avatar_url
                ? <img src={account.avatar_url} className="w-full h-full object-cover" alt="" />
                : <div className="w-full h-full flex items-center justify-center font-black" style={{ background: 'rgba(123,63,242,0.15)', color: 'var(--primary)' }}>{initial}</div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{account.display_name || account.username}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>@{account.username}</p>
            </div>
            {isSwitching ? (
              <Spinner size="sm" />
            ) : account.is_active ? (
              <CheckCircle2 size={20} style={{ color: 'var(--primary)' }} />
            ) : (
              <button onClick={e => { e.stopPropagation(); handleRemove(account); }}
                className="p-1" style={{ color: 'var(--text-tertiary)' }} title="Retirer ce compte">
                <XCircle size={18} />
              </button>
            )}
          </div>
        );
      })}
      <button onClick={() => navigate('/auth/login?mode=add')} disabled={!canAdd}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors disabled:opacity-40"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--primary)' }}
        onMouseEnter={e => { if (canAdd) (e.currentTarget.style.background = 'var(--bg-secondary)'); }}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <PlusCircle size={16} />
        {canAdd ? 'Ajouter un compte' : `Maximum ${MAX_ACCOUNTS} comptes atteint`}
      </button>

      {ConfirmDialog}
    </div>
  );
}

export default function SettingsAccountPage() {
  const navigate = useNavigate();
  const [pwForm,    setPwForm]    = useState({ current_password: '', new_password: '', confirm: '' });
  const [showPw,    setShowPw]    = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError,   setPwError]   = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) { setPwError('Les mots de passe ne correspondent pas'); return; }
    setPwLoading(true); setPwError(''); setPwSuccess(false);
    try {
      await apiClient.post(Endpoints.auth.changePassword, { current_password: pwForm.current_password, new_password: pwForm.new_password });
      setPwSuccess(true);
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch (e: any) {
      setPwError(extractApiErrorMessage(e, 'Erreur lors du changement de mot de passe'));
    } finally { setPwLoading(false); }
  }

  const links = [
    { icon: <Edit2 size={16} />,       label: 'Modifier le profil',       to: '/profile' },
    { icon: <Shield size={16} />,      label: 'Confidentialité',          to: '/privacy' },
    { icon: <AlertTriangle size={16}/>,label: 'Utilisateurs bloqués',     to: '/blocked-users' },
    { icon: <User size={16} />,        label: 'Abonnements / Abonnés',    to: '/profile' },
  ];

  return (
    <div className="w-full mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/settings')}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <ArrowLeft size={16} style={{ color: 'var(--text-primary)' }} />
        </button>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Compte</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Profil, sécurité et confidentialité</p>
        </div>
      </div>

      {/* Multi-compte */}
      <AccountsSection />

      {/* Navigation links */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {links.map((row, i) => (
          <div key={i} role="button" tabIndex={0}
            onClick={() => navigate(row.to)}
            onKeyDown={e => e.key === 'Enter' && navigate(row.to)}
            className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all"
            style={{ borderBottom: i < links.length - 1 ? '1px solid var(--border)' : 'none' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(123,63,242,0.1)' }}>
              <span style={{ color: 'var(--primary)' }}>{row.icon}</span>
            </div>
            <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{row.label}</span>
            <ChevronRight size={15} style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ))}
      </div>

      {/* Change password */}
      <form onSubmit={changePassword} className="rounded-2xl p-4 space-y-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Changer le mot de passe</p>

        {pwError && (
          <div className="text-xs px-3 py-2 rounded-xl"
            style={{ background: 'rgba(123,63,242,0.08)', border: '1px solid rgba(123,63,242,0.2)', color: '#7B3FF2' }}>
            {pwError}
          </div>
        )}
        {pwSuccess && (
          <div className="text-xs px-3 py-2 rounded-xl flex items-center gap-1.5"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E' }}>
            <CheckCircle size={12} /> Mot de passe modifié !
          </div>
        )}

        {([
          { key: 'current_password', label: 'Mot de passe actuel' },
          { key: 'new_password',     label: 'Nouveau mot de passe' },
          { key: 'confirm',          label: 'Confirmer le nouveau' },
        ] as const).map(({ key, label }) => (
          <div key={key} className="relative">
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-tertiary)' }}>{label}</label>
            <input
              type={showPw ? 'text' : 'password'}
              value={pwForm[key]}
              onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
              required
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none pr-10"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            {key === 'confirm' && (
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 bottom-2.5" style={{ color: 'var(--text-tertiary)' }}>
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            )}
          </div>
        ))}

        <button type="submit" disabled={pwLoading}
          className="w-full py-3 rounded-xl font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'var(--primary)' }}>
          {pwLoading ? <Spinner size="sm" /> : <><Lock size={14} /> Modifier</>}
        </button>
      </form>
    </div>
  );
}
