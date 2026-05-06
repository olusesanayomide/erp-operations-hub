import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { completeOnboarding } from '@/shared/lib/erp-api';
import { ApiError, setStoredUser } from '@/shared/lib/api';
import { useAuth } from '@/app/providers/AuthContext';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { LoadingText } from '@/shared/components/LoadingMotion';
import { toast } from 'sonner';

export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!companyName.trim()) {
      setError('Company name is required.');
      return;
    }

    setLoading(true);

    try {
      const nextUser = await completeOnboarding({
        companyName: companyName.trim(),
        adminName: adminName.trim() || undefined,
      });

      setStoredUser(nextUser);
      await refreshUser();
      toast.success('Workspace setup complete.');
      navigate('/dashboard', { replace: true });
    } catch (onboardingError) {
      setError(
        onboardingError instanceof ApiError
          ? onboardingError.message
          : onboardingError instanceof Error
            ? onboardingError.message
            : 'Unable to finish workspace setup right now.',
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
        <section className="w-full max-w-xl overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,rgba(196,219,255,0.38),rgba(255,255,255,0.88)_28%,rgba(255,255,255,0.98)_100%)] shadow-[0_22px_48px_rgba(59,107,255,0.14)]">
          <div className="p-5 sm:p-6">
            <div className="rounded-[28px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(246,250,255,0.68))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_16px_36px_rgba(59,107,255,0.08)] sm:p-7">
              <div className="text-center">
                <h2 className="text-[24px] font-bold tracking-tight text-slate-950 sm:text-[30px]">
                  Finish Your Workspace
                </h2>
                <p className="mt-2 text-[13px] leading-6 text-slate-600 sm:text-sm">
                  You&apos;re in. Add your company details so we can personalize the workspace for {user?.email || 'your account'}.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">
                    Company name
                  </Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    placeholder="Acme Incorporated"
                    className="h-12 rounded-2xl border border-slate-300 bg-white text-slate-950 shadow-[0_8px_24px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] focus-visible:border-[#4f7dff] focus-visible:ring-2 focus-visible:ring-[#4f7dff]/20"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="adminName" className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">
                      Your name
                    </Label>
                    <span className="text-xs text-slate-500">Optional</span>
                  </div>
                  <Input
                    id="adminName"
                    value={adminName}
                    onChange={(event) => setAdminName(event.target.value)}
                    placeholder="Your name"
                    className="h-12 rounded-2xl border border-slate-300 bg-white text-slate-950 shadow-[0_8px_24px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] focus-visible:border-[#4f7dff] focus-visible:ring-2 focus-visible:ring-[#4f7dff]/20"
                  />
                </div>

                {error && (
                  <p className="rounded-2xl border border-destructive/15 bg-destructive/5 px-4 py-3 text-sm leading-6 text-destructive">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  requiresOnline
                  className="h-12 w-full rounded-full border border-[#5f85ff] bg-[linear-gradient(135deg,#3B6BFF_0%,#6D8FFF_100%)] text-[15px] font-semibold shadow-[0_18px_40px_rgba(59,107,255,0.35),inset_0_1px_0_rgba(255,255,255,0.28)] hover:brightness-105 sm:text-base"
                  disabled={loading}
                >
                  {loading ? <LoadingText>Saving workspace...</LoadingText> : 'Enter workspace'}
                </Button>
              </form>
            </div>
          </div>
        </section>
      </main>
    </motion.div>
  );
}
