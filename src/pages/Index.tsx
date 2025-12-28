import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

const Index = () => {
  const { user, dbUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Učitavanje...</div>
      </div>
    );
  }

  // Not logged in - go to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in - redirect based on role
  if (dbUser) {
    const redirectPath = dbUser.role === 'admin' ? '/dashboard/admin' : '/dashboard/worker';
    return <Navigate to={redirectPath} replace />;
  }

  // Loading profile
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-muted-foreground">Učitavanje profila...</div>
    </div>
  );
};

export default Index;
