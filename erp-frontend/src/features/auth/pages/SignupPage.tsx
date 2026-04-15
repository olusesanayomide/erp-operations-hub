import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { signupTenant } from '@/shared/lib/erp-api';
import { ApiError } from '@/shared/lib/api';
import { toast } from 'sonner';
import { LoadingText } from '@/shared/components/LoadingMotion';

const containerVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
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

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export default function SignupPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);

  const slugPreview = useMemo(
    () => (slugEdited ? slug : slugify(companyName)),
    [companyName, slug, slugEdited],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!companyName.trim() || !adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      setError('Company name, admin name, email, and password are required.');
      return;
    }

    const nextSlug = (slugEdited ? slug : slugPreview).trim();
    if (!nextSlug) {
      setError('A valid company slug is required.');
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSlug)) {
      setError('Slug can only use lowercase letters, numbers, and hyphens.');
      return;
    }

    if (adminPassword.length < 8) {
      setError('Admin password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      await signupTenant({
        companyName: companyName.trim(),
        slug: nextSlug,
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim(),
        adminPassword,
      });

      toast.success('Tenant created. You can sign in with the new admin account.');
      navigate('/login', {
        replace: true,
        state: { email: adminEmail.trim() },
      });
    } catch (signupError) {
      setError(
        signupError instanceof ApiError
          ? signupError.message
          : signupError instanceof Error
            ? signupError.message
            : 'Unable to create the tenant right now.',
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
          className="w-full max-w-2xl"
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
                  <h2 className="text-[30px] font-bold tracking-tight text-slate-950">Create Your Workspace</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Launch a new company tenant and set up the first administrator in one step.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                  <motion.div variants={itemVariants} className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="companyName" className="text-[15px] font-semibold text-slate-900">Company name</Label>
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(event) => {
                          const value = event.target.value;
                          setCompanyName(value);
                          if (!slugEdited) {
                            setSlug(slugify(value));
                          }
                        }}
                        placeholder="Acme Incorporated"
                        className="h-12 rounded-2xl border border-slate-300 bg-white text-slate-950 shadow-[0_8px_24px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] focus-visible:border-[#4f7dff] focus-visible:ring-2 focus-visible:ring-[#4f7dff]/20"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="slug" className="text-[15px] font-semibold text-slate-900">Workspace slug</Label>
                      <Input
                        id="slug"
                        value={slugEdited ? slug : slugPreview}
                        onChange={(event) => {
                          setSlugEdited(true);
                          setSlug(slugify(event.target.value));
                        }}
                        placeholder="acme-incorporated"
                        className="h-12 rounded-2xl border border-slate-300 bg-white text-slate-950 shadow-[0_8px_24px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] focus-visible:border-[#4f7dff] focus-visible:ring-2 focus-visible:ring-[#4f7dff]/20"
                      />
                      <p className="text-xs text-slate-500">
                        This becomes the unique business identifier for your tenant.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="adminName" className="text-[15px] font-semibold text-slate-900">Admin name</Label>
                      <Input
                        id="adminName"
                        value={adminName}
                        onChange={(event) => setAdminName(event.target.value)}
                        placeholder="Jane Founder"
                        className="h-12 rounded-2xl border border-slate-300 bg-white text-slate-950 shadow-[0_8px_24px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] focus-visible:border-[#4f7dff] focus-visible:ring-2 focus-visible:ring-[#4f7dff]/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="adminEmail" className="text-[15px] font-semibold text-slate-900">Admin email</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={adminEmail}
                        onChange={(event) => setAdminEmail(event.target.value)}
                        placeholder="you@company.com"
                        className="h-12 rounded-2xl border border-slate-300 bg-white text-slate-950 shadow-[0_8px_24px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] focus-visible:border-[#4f7dff] focus-visible:ring-2 focus-visible:ring-[#4f7dff]/20"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="adminPassword" className="text-[15px] font-semibold text-slate-900">Admin password</Label>
                      <div className="relative">
                        <Input
                          id="adminPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={adminPassword}
                          onChange={(event) => setAdminPassword(event.target.value)}
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

                  <motion.div variants={itemVariants} whileHover={prefersReducedMotion ? undefined : { y: -3, scale: 1.01 }} whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}>
                    <Button
                      type="submit"
                      className="h-12 w-full rounded-full border border-[#5f85ff] bg-[linear-gradient(135deg,#3B6BFF_0%,#6D8FFF_100%)] text-base font-semibold shadow-[0_18px_40px_rgba(59,107,255,0.35),inset_0_1px_0_rgba(255,255,255,0.28)] hover:brightness-105"
                      disabled={loading}
                    >
                      {loading ? <LoadingText>Creating workspace...</LoadingText> : 'Create workspace'}
                    </Button>
                  </motion.div>
                </form>

                <motion.div variants={itemVariants} className="mt-6 text-center text-sm text-slate-600">
                  Already have a workspace?{' '}
                  <Link to="/login" className="font-semibold text-primary transition-colors hover:text-[#2f57da]">
                    Sign in
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.section>
      </main>
    </motion.div>
  );
}
