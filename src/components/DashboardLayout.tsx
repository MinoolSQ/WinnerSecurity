import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Shield, LogOut, User } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { dbUser, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm md:text-base">{title}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{dbUser?.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Odjava</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container py-4 md:py-6">
        {children}
      </main>
    </div>
  );
}
