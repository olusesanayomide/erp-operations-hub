import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { sendPasswordResetEmail } from '@/shared/lib/erp-api';
import { toast } from 'sonner';
import { LoadingText } from '@/shared/components/LoadingMotion';

function getEmailFromLocationState(state: unknown) {
  if (!state || typeof state !== 'object' || !('email' in state)) {
    return '';
  }

  const email = (state as { email?: unknown }).email;
  return typeof email === 'string' ? email : '';
}

export default function ForgotPasswordPage() {
  const prefersReducedMotion = useReducedMotion();
  const location = useLocation();
  const [email, setEmail] = useState(() => getEmailFromLocationState(location.state));
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(email.trim());
      setSubmitted(true);
      toast.success('Password reset email sent');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to send password reset email.',
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
                <h2 className="text-[30px] font-bold tracking-tight text-slate-950">Reset Your Password</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Enter your account email and we&apos;ll send you a secure reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[15px] font-semibold text-slate-900">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    className="h-12 rounded-2xl border border-slate-300 bg-white text-slate-950 shadow-[0_8px_24px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] focus-visible:border-[#4f7dff] focus-visible:ring-2 focus-visible:ring-[#4f7dff]/20"
                  />
                </div>

                {submitted && (
                  <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    If that email exists in Supabase Auth, a reset link is on its way.
                  </p>
                )}

                {error && (
                  <p className="rounded-2xl border border-destructive/15 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  requiresOnline
                  className="h-12 w-full rounded-full border border-[#5f85ff] bg-[linear-gradient(135deg,#3B6BFF_0%,#6D8FFF_100%)] text-base font-semibold shadow-[0_18px_40px_rgba(59,107,255,0.35),inset_0_1px_0_rgba(255,255,255,0.28)] hover:brightness-105"
                  disabled={loading}
                >
                  {loading ? <LoadingText>Sending reset link...</LoadingText> : 'Send reset link'}
                </Button>
              </form>
            </div>
          </div>
        </section>
      </main>
    </motion.div>
  );
}
