import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

// AppShell already blocks render until isInitializing is false,
// so here we only need to redirect authenticated users away.
export function PublicOnlyRoute() {
  const { isAuthenticated, accessToken } = useAuthStore();

  if (isAuthenticated && accessToken) {
    return <Navigate to="/feed" replace />;
  }

  return <Outlet />;
}
