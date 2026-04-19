import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { supabase } from '@/shared/lib/supabase';
import { logoutSupabase, updateSupabasePassword } from '@/shared/lib/erp-api';
import { toast } from 'sonner';
import { LoadingText } from '@/shared/components/LoadingMotion';

function hasRecoveryToken() {
  if (typeof window === 'undefined') {
    return false;
  }

  const hash = window.location.hash;
  const search = window.location.search;

  return hash.includes('type=recovery') || search.includes('type=recovery');
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRecoverySessionReady, setIsRecoverySessionReady] = useState(false);

  const recoveryLinkDetected = useMemo(() => hasRecoveryToken(), []);

  useEffect(() => {
    if (!supabase || !recoveryLinkDetected) {
      return;
    }

    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }

      if (data.session) {
        setIsRecoverySessionReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) {
        return;
      }

      if (event === 'PASSWORD_RECOVERY' || Boolean(session)) {
        setIsRecoverySessionReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [recoveryLinkDetected]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('New password is required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await updateSupabasePassword(password);
      await logoutSupabase();
      toast.success('Password updated. Sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Unable to update password.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="relative min-h-screen overflow-hidden bg-card text-foreground"
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1 }}
      transition={{ duration: 0.45 }}
    >
      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10 lg:px-10 lg:py-14">
        <section className="w-full max-w-md overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,rgba(196,219,255,0.38),rgba(255,255,255,0.88)_28%,rgba(255,255,255,0.98)_100%)] shadow-[0_22px_48px_rgba(59,107,255,0.14)]">
          <div className="p-5 sm:p-6">
            <div className="rounded-[28px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(246,250,255,0.68))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_16px_36px_rgba(59,107,255,0.08)] sm:p-7">
              <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-[#2f57da]">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>

              <div className="text-center">
                <h2 className="text-[30px] font-bold tracking-tight text-slate-950">Choose a New Password</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Finish your recovery flow by setting a new password for your account.
                </p>
              </div>

              {!recoveryLinkDetected && (
                <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Open this page from the reset link sent by Supabase Auth.
                </p>
              )}

              {recoveryLinkDetected && !isRecoverySessionReady && (
                <p className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <LoadingText>Verifying your recovery link...</LoadingText>
                </p>
              )}

              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[15px] font-semibold text-slate-900">New password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 8 characters"
                      className="h-12 rounded-2xl border border-slate-300 bg-white pr-12 text-slate-950 shadow-[0_8px_24px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] focus-visible:border-[#4f7dff] focus-visible:ring-2 focus-visible:ring-[#4f7dff]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-[15px] font-semibold text-slate-900">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat your new password"
                    className="h-12 rounded-2xl border border-slate-300 bg-white text-slate-950 shadow-[0_8px_24px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] focus-visible:border-[#4f7dff] focus-visible:ring-2 focus-visible:ring-[#4f7dff]/20"
                  />
                </div>

                {error && (
                  <p className="rounded-2xl border border-destructive/15 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  requiresOnline
                  className="h-12 w-full rounded-full border border-[#5f85ff] bg-[linear-gradient(135deg,#3B6BFF_0%,#6D8FFF_100%)] text-base font-semibold shadow-[0_18px_40px_rgba(59,107,255,0.35),inset_0_1px_0_rgba(255,255,255,0.28)] hover:brightness-105"
                  disabled={loading || !recoveryLinkDetected || !isRecoverySessionReady}
                >
                  {loading ? <LoadingText>Updating password...</LoadingText> : 'Update password'}
                </Button>
              </form>
            </div>
          </div>
        </section>
      </main>
    </motion.div>
  );
}
