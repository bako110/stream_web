import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Spinner } from '../ui/Spinner';

// AppShell already blocks render until isInitializing is false.
// We also wait during an in-flight token refresh to avoid a premature redirect.
export function ProtectedRoute() {
  const { isAuthenticated, accessToken, isRefreshing } = useAuthStore();

  if (isRefreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
