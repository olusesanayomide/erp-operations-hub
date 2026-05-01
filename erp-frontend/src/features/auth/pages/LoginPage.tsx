import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';
import { AUTH_SLOW_OPERATION_NOTICE_MS } from '@/shared/lib/erp-api';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Checkbox } from '@/shared/ui/checkbox';
import { toast } from 'sonner';
import { isSupabaseAuthConfigured } from '@/shared/lib/supabase';
import { LoadingText } from '@/shared/components/LoadingMotion';

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
  const routeState = location.state as { authError?: string; email?: string } | null;
  const [email, setEmail] = useState(() => routeState?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(routeState?.authError || '');
  const [showSlowLoginNotice, setShowSlowLoginNotice] = useState(false);

  useEffect(() => {
    if (!routeState?.authError) return;

    navigate(location.pathname, {
      replace: true,
      state: routeState.email ? { email: routeState.email } : null,
    });
  }, [location.pathname, navigate, routeState?.authError, routeState?.email]);

  useEffect(() => {
    if (!loading) {
      setShowSlowLoginNotice(false);
      return;
    }

    const noticeTimer = window.setTimeout(() => {
      setShowSlowLoginNotice(true);
    }, AUTH_SLOW_OPERATION_NOTICE_MS);

    return () => window.clearTimeout(noticeTimer);
  }, [loading]);

  const clearErrorOnEdit = () => {
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setShowSlowLoginNotice(false);
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
      className="relative min-h-screen overflow-hidden bg-slate-50 text-foreground"
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1 }}
      transition={{ duration: 0.45 }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_62%)]"
          animate={prefersReducedMotion ? undefined : { opacity: [0.78, 1, 0.8], scale: [1, 1.03, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-5 py-8 sm:px-6 lg:px-10 lg:py-14">
        <motion.section
          className="w-full max-w-[400px]"
          initial={prefersReducedMotion ? false : 'hidden'}
          animate={prefersReducedMotion ? undefined : 'visible'}
          variants={containerVariants}
        >
          <motion.div
            variants={itemVariants}
            className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <div className="p-6 sm:p-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome Back</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Enter your details to access your ERP dashboard.
                </p>
              </div>

              {!isSupabaseAuthConfigured && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  Supabase auth mode is enabled, but `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not configured yet.
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => {
                      clearErrorOnEdit();
                      setEmail(e.target.value);
                    }}
                    placeholder="you@company.com"
                    className="h-12 rounded-xl border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-950 shadow-none placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:ring-offset-0"
                  />
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => {
                        clearErrorOnEdit();
                        setPassword(e.target.value);
                      }}
                      placeholder="Password"
                      className="h-12 rounded-xl border-slate-200 bg-slate-50/50 px-4 py-3 pr-12 text-sm text-slate-950 shadow-none placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:ring-offset-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </motion.div>

                {error && (
                  <motion.p
                    initial={prefersReducedMotion ? false : { opacity: 0, y: -6 }}
                    animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                    className="rounded-xl border border-destructive/15 bg-destructive/5 px-4 py-3 text-sm leading-6 text-destructive"
                  >
                    {error}
                  </motion.p>
                )}

                {showSlowLoginNotice && !error && (
                  <motion.p
                    initial={prefersReducedMotion ? false : { opacity: 0, y: -6 }}
                    animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                    className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900"
                  >
                    Still signing you in. On slower or unstable networks this can take a little longer while we reconnect your ERP workspace. Please keep this page open.
                  </motion.p>
                )}

                <motion.div variants={itemVariants} className="flex min-h-11 items-center justify-between gap-4">
                  <div className="flex min-h-11 items-center gap-3">
                    <Checkbox id="remember" />
                    <Label htmlFor="remember" className="text-sm font-medium leading-none text-slate-700">Remember me</Label>
                  </div>
                  <Link to="/forgot-password" className="flex min-h-11 items-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-700">
                    Forgot password?
                  </Link>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Button
                    type="submit"
                    requiresOnline
                    className="h-12 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-[0.98]"
                    disabled={loading}
                  >
                    {loading ? (
                      <LoadingText>
                        {showSlowLoginNotice ? 'Still signing you in...' : authStatusMessage || 'Signing you in...'}
                      </LoadingText>
                    ) : (
                      'Sign in'
                    )}
                  </Button>
                </motion.div>
              </form>

              <div className="mt-6 text-center text-sm text-slate-500">
                New organization?{' '}
                <Link to="/signup" className="inline-flex min-h-11 items-center font-semibold text-blue-600 transition-colors hover:text-blue-700">
                  Create a workspace
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.section>
      </main>
    </motion.div>
  );
}
