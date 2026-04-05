import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthContext';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Checkbox } from '@/shared/ui/checkbox';
import { toast } from 'sonner';
import { Boxes, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('sarah@acme.com');
  const [password, setPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email is required'); return; }
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (success) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      setError('Invalid credentials or backend unavailable.');
    }
  };

  return (
    <div className="min-h-screen flex bg-muted">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12">
        <div className="max-w-md text-primary-foreground">
          <div className="flex items-center gap-3 mb-8">
            <Boxes className="h-10 w-10" />
            <span className="text-3xl font-bold tracking-tight">AcmeERP</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Streamline your operations
          </h1>
          <p className="text-primary-foreground/80 text-lg leading-relaxed">
            Manage inventory, orders, purchases, and your entire supply chain from one powerful platform.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Boxes className="h-7 w-7 text-primary" />
            <span className="text-2xl font-bold">AcmeERP</span>
          </div>

          <h2 className="text-2xl font-bold mb-1">Sign in</h2>
          <p className="text-muted-foreground mb-6">Enter your credentials to access the platform</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" />
                <Label htmlFor="remember" className="text-sm font-normal">Remember me</Label>
              </div>
              <button type="button" className="text-sm text-primary hover:underline">Forgot password?</button>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-8 p-4 rounded-xl bg-card border">
            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Backend Login</p>
            <div className="space-y-2">
              {[
                { email: 'admin@erp.com', role: 'Seeded Admin', color: 'text-primary' },
              ].map(a => (
                <button key={a.email} onClick={() => { setEmail(a.email); setPassword('AdminPassword123!'); }}
                  className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors flex items-center justify-between group">
                  <span className="text-sm">{a.email}</span>
                  <span className={`text-xs font-medium ${a.color}`}>{a.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

