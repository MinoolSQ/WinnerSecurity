import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('worker' | 'admin')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, dbUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Učitavanje...</div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but profile not loaded yet
  if (!dbUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Učitavanje profila...</div>
      </div>
    );
  }

  // Check role permissions
  if (allowedRoles && !allowedRoles.includes(dbUser.role)) {
    // Redirect to appropriate dashboard
    const redirectPath = dbUser.role === 'admin' ? '/dashboard/admin' : '/dashboard/worker';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}
