import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { accountsService } from '../../services/accountsService';
import type { StoredAccount } from '../../services/accountsService';
import { AccountSwitcherMenu } from './AccountSwitcherMenu';

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
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const [accounts, setAccounts] = useState<StoredAccount[]>(() => accountsService.listAccounts());
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

  const menu = open && coords && createPortal(
        <div ref={menuRef} className="fixed w-64 rounded-2xl overflow-hidden z-[100]"
          style={{ top: coords.top, right: coords.right, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.18)' }}>
          <AccountSwitcherMenu accounts={accounts} onClose={() => setOpen(false)} />
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
