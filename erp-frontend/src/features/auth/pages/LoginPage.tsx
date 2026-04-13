import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Checkbox } from '@/shared/ui/checkbox';
import { toast } from 'sonner';
import { isSupabaseAuthConfigured } from '@/shared/lib/supabase';

const containerVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function LoginPage() {
  const { login, authStatusMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const [email, setEmail] = useState(() => (location.state as { email?: string } | null)?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    const result = await login(email, password);

    if (result.success) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      setLoading(false);
      setError(result.error || 'Unable to sign in with Supabase.');
    }
  };

  return (
    <motion.div
      className="relative min-h-screen overflow-hidden bg-card text-foreground"
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1 }}
      transition={{ duration: 0.45 }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_62%)]"
          animate={prefersReducedMotion ? undefined : { opacity: [0.78, 1, 0.8], scale: [1, 1.03, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-[-8%] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(109,143,255,0.18),transparent_68%)] blur-2xl"
          animate={prefersReducedMotion ? undefined : { x: [0, 24, 0], y: [0, -16, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-[-4%] top-[18%] h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.75),rgba(184,210,255,0.3),transparent_72%)] blur-2xl"
          animate={prefersReducedMotion ? undefined : { x: [0, -18, 0], y: [0, 12, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10 lg:px-10 lg:py-14">
        <motion.section
          className="w-full max-w-md"
          initial={prefersReducedMotion ? false : 'hidden'}
          animate={prefersReducedMotion ? undefined : 'visible'}
          variants={containerVariants}
        >
          <motion.div
            variants={itemVariants}
            className="overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,rgba(196,219,255,0.38),rgba(255,255,255,0.88)_28%,rgba(255,255,255,0.98)_100%)] shadow-[0_22px_48px_rgba(59,107,255,0.14)]"
          >
            <div className="relative p-5 sm:p-6">
              <motion.div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(109,143,255,0.14),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(255,255,255,0.95),transparent_46%)]"
                animate={prefersReducedMotion ? undefined : { opacity: [0.65, 1, 0.72] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="relative rounded-[28px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(246,250,255,0.68))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_16px_36px_rgba(59,107,255,0.08)] sm:p-7">
                <div className="text-center">
                  <h2 className="text-[30px] font-bold tracking-tight text-slate-950">Welcome Back</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Enter your details and access your dashboard 
                  </p>
                </div>

                {!isSupabaseAuthConfigured && (
                  <div className="mt-5 rounded-2xl border border-amber-200/70 bg-amber-50/85 px-4 py-3 text-sm text-amber-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                    Supabase auth mode is enabled, but `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not configured yet.
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="email" className="text-[15px] font-semibold text-slate-900">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="h-12 rounded-2xl border border-slate-300 bg-white text-slate-950 placeholder:text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] focus-visible:border-[#4f7dff] focus-visible:ring-2 focus-visible:ring-[#4f7dff]/20"
                    />
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="password" className="text-[15px] font-semibold text-slate-900">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="........"
                        className="h-12 rounded-2xl border border-slate-300 bg-white pr-12 text-slate-950 placeholder:text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] focus-visible:border-[#4f7dff] focus-visible:ring-2 focus-visible:ring-[#4f7dff]/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </motion.div>

                  {error && (
                    <motion.p
                      initial={prefersReducedMotion ? false : { opacity: 0, y: -6 }}
                      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                      className="rounded-2xl border border-destructive/15 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                    >
                      {error}
                    </motion.p>
                  )}

                  <motion.div variants={itemVariants} className="flex items-center justify-between gap-4">
                    <div className="flex min-h-11 items-center gap-3">
                      <Checkbox id="remember" />
                      <Label htmlFor="remember" className="text-sm font-medium leading-none text-slate-600">Remember me</Label>
                    </div>
                    <Link to="/forgot-password" className="flex min-h-11 items-center text-sm font-medium text-primary transition-colors hover:text-[#2f57da]">
                      Forgot password?
                    </Link>
                  </motion.div>

                  <motion.div variants={itemVariants} whileHover={prefersReducedMotion ? undefined : { y: -3, scale: 1.01 }} whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}>
                    <Button
                      type="submit"
                      className="h-12 w-full rounded-full border border-[#5f85ff] bg-[linear-gradient(135deg,#3B6BFF_0%,#6D8FFF_100%)] text-base font-semibold shadow-[0_18px_40px_rgba(59,107,255,0.35),inset_0_1px_0_rgba(255,255,255,0.28)] hover:brightness-105"
                      disabled={loading}
                    >
                      {loading ? (
                        <motion.span
                          animate={prefersReducedMotion ? undefined : { opacity: [1, 0.55, 1] }}
                          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          {authStatusMessage || 'Signing you in...'}
                        </motion.span>
                      ) : (
                        'Sign in'
                      )}
                    </Button>
                  </motion.div>
                </form>

                <div className="mt-6 text-center text-sm text-slate-600">
                  New organization?{' '}
                  <Link to="/signup" className="font-semibold text-primary transition-colors hover:text-[#2f57da]">
                    Create a workspace
                  </Link>
                </div>

              </div>
            </div>
          </motion.div>
        </motion.section>
      </main>
    </motion.div>
  );
}
