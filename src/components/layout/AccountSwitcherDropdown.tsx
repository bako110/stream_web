import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, PlusCircle, Check, User as UserIcon } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Spinner } from '../ui/Spinner';
import { useAuthStore } from '../../store/authStore';
import { accountsService, MAX_ACCOUNTS } from '../../services/accountsService';
import type { StoredAccount } from '../../services/accountsService';

/** Avatar + flèche dans le header — ouvre un menu de bascule rapide entre
 * comptes (parité mobile : bascule instantanée sans reconnexion, ajout
 * direct). Contenu identique à AccountsSection (Paramètres > Compte), mais
 * accessible en un clic depuis n'importe quelle page.
 *
 * Le menu est porté vers document.body (createPortal) : le <header> parent
 * (Topbar.tsx) a overflow-hidden + backdrop-filter, qui coupe/masque tout
 * enfant en position absolute qui déborderait de sa boîte — le dropdown
 * s'ouvrait bien en mémoire (open=true) mais restait invisible à l'écran.
 * Même pattern déjà utilisé pour MessagesPopover.tsx sur ce projet. */
export function AccountSwitcherDropdown() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const [accounts, setAccounts] = useState<StoredAccount[]>(() => accountsService.listAccounts());
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setAccounts(accountsService.listAccounts());
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setCoords({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
  }, [open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  if (!user) return null;

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

  const canAdd = accounts.length < MAX_ACCOUNTS;

  const menu = open && coords && createPortal(
        <div ref={menuRef} className="fixed w-64 rounded-2xl overflow-hidden z-[100]"
          style={{ top: coords.top, right: coords.right, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.18)' }}>
          {accounts.map(account => {
            const isSwitching = switchingId === account.user_id;
            const initial = (account.display_name || account.username || '?')[0]?.toUpperCase() ?? '?';
            return (
              <button key={account.user_id}
                onClick={() => handleSwitch(account)}
                disabled={!!switchingId}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 transition-colors text-left"
                style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => { if (!account.is_active) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center">
                  {account.avatar_url
                    ? <img src={account.avatar_url} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full flex items-center justify-center font-black text-xs" style={{ background: 'rgba(123,63,242,0.15)', color: 'var(--primary)' }}>{initial}</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{account.display_name || account.username}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>@{account.username}</p>
                </div>
                {isSwitching ? <Spinner size="sm" /> : account.is_active && <Check size={16} style={{ color: 'var(--primary)' }} />}
              </button>
            );
          })}
          <button
            onClick={() => { setOpen(false); navigate('/profile'); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-3 text-sm font-semibold transition-colors"
            style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <UserIcon size={16} />
            Voir mon profil
          </button>
          <button
            onClick={() => { setOpen(false); navigate('/auth/login?mode=add'); }}
            disabled={!canAdd}
            className="w-full flex items-center gap-2.5 px-3.5 py-3 text-sm font-semibold transition-colors disabled:opacity-40"
            style={{ color: 'var(--primary)' }}
            onMouseEnter={e => { if (canAdd) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <PlusCircle size={16} />
            {canAdd ? 'Ajouter un compte' : `Maximum ${MAX_ACCOUNTS} comptes`}
          </button>
        </div>,
        document.body
      );

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        className="hidden lg:flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-xl transition-all shrink-0"
        style={{ background: open ? 'var(--bg-secondary)' : 'transparent' }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <Avatar src={user.avatar_url} name={user.display_name ?? user.username} size="sm" verified={user.is_verified} />
        <span className="text-sm font-medium truncate max-w-[90px]" style={{ color: 'var(--text-primary)' }}>
          {user.display_name ?? user.username ?? user.first_name}
        </span>
        <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {menu}
    </>
  );
}
