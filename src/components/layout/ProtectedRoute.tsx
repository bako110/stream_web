import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

// AppShell already blocks render until isInitializing is false,
// so here we only need to check the final auth state.
export function ProtectedRoute() {
  const { isAuthenticated, accessToken } = useAuthStore();

  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
