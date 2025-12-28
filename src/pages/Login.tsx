import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Shield } from 'lucide-react';

export default function LoginPage() {
  const { user, dbUser, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'worker' | 'admin'>('worker');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  if (!loading && user && dbUser) {
    const redirectPath = dbUser.role === 'admin' ? '/dashboard/admin' : '/dashboard/worker';
    return <Navigate to={redirectPath} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(username.trim(), password);
        if (error) {
          toast({
            variant: 'destructive',
            title: 'Greška pri prijavi',
            description: error.message === 'Invalid login credentials' 
              ? 'Pogrešno korisničko ime ili lozinka' 
              : error.message,
          });
        }
      } else {
        if (!name.trim()) {
          toast({
            variant: 'destructive',
            title: 'Greška',
            description: 'Ime je obavezno',
          });
          setSubmitting(false);
          return;
        }
        
        if (!username.trim()) {
          toast({
            variant: 'destructive',
            title: 'Greška',
            description: 'Korisničko ime je obavezno',
          });
          setSubmitting(false);
          return;
        }
        
        const { error } = await signUp(username.trim(), password, name.trim(), role);
        if (error) {
          let message = error.message;
          if (error.message.includes('already registered') || error.message.includes('User already registered')) {
            message = 'Korisničko ime je već registrovan';
          }
          toast({
            variant: 'destructive',
            title: 'Greška pri registraciji',
            description: message,
          });
        } else {
          toast({
            title: 'Uspešna registracija',
            description: 'Možete se prijaviti',
          });
          setIsLogin(true);
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Učitavanje...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">
            {isLogin ? 'Prijava' : 'Registracija'}
          </CardTitle>
          <CardDescription>
            Sistem za upravljanje smenama obezbeđenja
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Ime i prezime</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Marko Marković"
                    required={!isLogin}
                  />
                </div>
                
                <div className="space-y-3">
                  <Label>Uloga</Label>
                  <RadioGroup value={role} onValueChange={(value) => setRole(value as 'worker' | 'admin')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="worker" id="worker" />
                      <Label htmlFor="worker" className="font-normal cursor-pointer">
                        Radnik
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="admin" id="admin" />
                      <Label htmlFor="admin" className="font-normal cursor-pointer">
                        Administrator
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username">Korisničko ime</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="korisnicko_ime"
                required
                pattern="[a-zA-Z0-9_]+"
                title="Korisničko ime može sadržati samo slova, brojeve i donje crtice"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Lozinka</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Molimo sačekajte...' : (isLogin ? 'Prijavi se' : 'Registruj se')}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setRole('worker'); // Reset role when switching
              }}
              className="text-primary hover:underline"
            >
              {isLogin ? 'Nemate nalog? Registrujte se' : 'Već imate nalog? Prijavite se'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
