import { Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

// AppShell already blocks render until isInitializing is false,
// so here we only need to redirect authenticated users away.
//
// Exception : ?mode=add laisse passer un utilisateur DEJA connecte — c'est le
// multi-compte (AccountSwitcherDropdown/SettingsAccountPage) qui ouvre /login
// dans ce mode pour ajouter un compte supplementaire sans quitter la session
// active. Sans cette exception, la redirection vers /feed empecherait meme
// d'afficher le formulaire.
export function PublicOnlyRoute() {
  const { isAuthenticated, accessToken } = useAuthStore();
  const [searchParams] = useSearchParams();
  const isAddAccountMode = searchParams.get('mode') === 'add';

  if (isAuthenticated && accessToken && !isAddAccountMode) {
    return <Navigate to="/feed" replace />;
  }

  return <Outlet />;
}
