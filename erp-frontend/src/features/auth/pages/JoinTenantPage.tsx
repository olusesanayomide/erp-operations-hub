import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { acceptTenantInvite, getTenantInvite } from '@/shared/lib/erp-api';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { LoadingText } from '@/shared/components/LoadingMotion';
import { RoleBadge } from '@/shared/components/StatusBadge';
import { toast } from 'sonner';

export default function JoinTenantPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const {
    data: invite,
    isLoading,
    isError,
    error: inviteError,
  } = useQuery({
    queryKey: ['tenant-invite', token],
    queryFn: () => getTenantInvite(token),
    enabled: Boolean(token),
    retry: false,
  });

  useEffect(() => {
    if (invite?.name && !name) {
      setName(invite.name);
    }
  }, [invite?.name, name]);

  const acceptMutation = useMutation({
    mutationFn: () => acceptTenantInvite(token, { name: name.trim(), password }),
    onSuccess: () => {
      toast.success('Workspace joined. You can now sign in.');
      navigate('/login', {
        replace: true,
        state: { email: invite?.email },
      });
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message || 'Unable to accept this invite right now.');
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    acceptMutation.mutate();
  };

  return (
    <motion.div
      className="relative min-h-screen overflow-hidden bg-card text-foreground"
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1 }}
      transition={{ duration: 0.45 }}
    >
      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10 lg:px-10 lg:py-14">
        <section className="w-full max-w-lg overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,rgba(196,219,255,0.38),rgba(255,255,255,0.88)_28%,rgba(255,255,255,0.98)_100%)] shadow-[0_22px_48px_rgba(59,107,255,0.14)]">
          <div className="p-5 sm:p-6">
            <div className="rounded-[28px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(246,250,255,0.68))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_16px_36px_rgba(59,107,255,0.08)] sm:p-7">
              <div className="text-center">
                <h2 className="text-[30px] font-bold tracking-tight text-slate-950">Join Workspace</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Accept your invite and create your secure sign-in password.
                </p>
              </div>

              {isLoading && (
                <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  <LoadingText>Checking invite...</LoadingText>
                </div>
              )}

              {isError && (
                <div className="mt-8 rounded-2xl border border-destructive/15 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {(inviteError as Error).message || 'This invite link could not be validated.'}
                </div>
              )}

              {invite && (
                <>
                  <div className="mt-8 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-700">
                    <p>
                      You have been invited to join{' '}
                      <span className="font-semibold text-slate-950">{invite.tenantName}</span>.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                        {invite.email}
                      </span>
                      <RoleBadge role={invite.role} />
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      Invite expires on {invite.expiresAt}.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="join-name" className="text-[15px] font-semibold text-slate-900">Name</Label>
                      <Input
                        id="join-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Your full name"
                        className="h-12 rounded-2xl border border-slate-300 bg-white text-slate-950 shadow-[0_8px_24px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] focus-visible:border-[#4f7dff] focus-visible:ring-2 focus-visible:ring-[#4f7dff]/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="join-password" className="text-[15px] font-semibold text-slate-900">Password</Label>
                      <div className="relative">
                        <Input
                          id="join-password"
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

                    {error && (
                      <p className="rounded-2xl border border-destructive/15 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                        {error}
                      </p>
                    )}

                    <Button
                      type="submit"
                      requiresOnline
                      disabled={acceptMutation.isPending}
                      className="h-12 w-full rounded-full border border-[#5f85ff] bg-[linear-gradient(135deg,#3B6BFF_0%,#6D8FFF_100%)] text-base font-semibold shadow-[0_18px_40px_rgba(59,107,255,0.35),inset_0_1px_0_rgba(255,255,255,0.28)] hover:brightness-105"
                    >
                      {acceptMutation.isPending ? <LoadingText>Joining workspace...</LoadingText> : 'Join workspace'}
                    </Button>
                  </form>
                </>
              )}

              <p className="mt-6 text-center text-sm text-slate-600">
                Already joined?{' '}
                <Link to="/login" className="font-semibold text-primary transition-colors hover:text-[#2f57da]">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
    </motion.div>
  );
}
