import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Spinner } from '../ui/Spinner';

// AppShell already blocks render until isInitializing is false.
// We also wait during an in-flight token refresh to avoid a premature redirect.
export function ProtectedRoute() {
  const { isAuthenticated, accessToken, isRefreshing } = useAuthStore();
  const location = useLocation();

  if (isRefreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !accessToken) {
    // Conserve la destination (ex: /join/{code} depuis un lien d'invitation
    // partagé) pour y revenir automatiquement après connexion — LoginPage lit
    // deja ce parametre via getSafeRedirect(searchParams.get('redirect')).
    const redirect = encodeURIComponent(location.pathname + location.search);
    // Message explicite affiché sur LoginPage — évite un redirect silencieux
    // sans contexte, notamment depuis un lien d'invitation communauté /join/.
    const message = location.pathname.startsWith('/join/')
      ? "Connecte-toi pour rejoindre cette communauté."
      : "Connecte-toi pour continuer.";
    return <Navigate to={`/auth/login?redirect=${redirect}`} state={{ message }} replace />;
  }

  return <Outlet />;
}
