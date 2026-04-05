import { Link, Navigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Factory,
  FileText,
  Layers3,
  Package2,
  Route,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  Upload,
  Users,
  Warehouse,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useAuth } from '@/app/providers/AuthContext';

const featureCards = [
  {
    title: 'Inventory',
    description:
      'Track stock across warehouses with a calmer interface and clear operational context.',
    icon: Warehouse,
  },
  {
    title: 'Orders',
    description:
      'Move from draft to fulfillment with structured workflows built for real operations teams.',
    icon: Truck,
  },
  {
    title: 'Procurement',
    description:
      'Keep suppliers, purchase intake, and warehouse impact visible in one place.',
    icon: Factory,
  },
  {
    title: 'Control',
    description:
      'Support role-aware access and a dependable ERP foundation from day one.',
    icon: ShieldCheck,
  },
];

const heroBenefits = [
  {
    title: 'Upload your data',
    description: 'Prepare products, suppliers, and warehouse records in one place.',
    icon: Upload,
  },
  {
    title: 'Control the workflow',
    description: 'Structured approvals and clearer operational checkpoints across teams.',
    icon: Shield,
  },
  {
    title: 'Keep distribution smooth',
    description: 'Track inventory movement and fulfillment with reliable visibility.',
    icon: FileText,
  },
];

const problemSolution = [
  {
    title: 'Too many disconnected tools',
    description:
      'Teams bounce between spreadsheets, chat threads, and siloed systems just to complete routine operational work.',
  },
  {
    title: 'One operating surface',
    description:
      'Manifest brings inventory, purchasing, warehouse visibility, and order execution into one structured workflow.',
  },
];

const steps = [
  {
    step: '01',
    title: 'Set up your core data',
    description:
      'Create products, warehouses, customers, and suppliers in one consistent system.',
    icon: Layers3,
  },
  {
    step: '02',
    title: 'Run operational workflows',
    description:
      'Handle procurement, stock movement, and order execution without switching contexts.',
    icon: Route,
  },
  {
    step: '03',
    title: 'Track progress clearly',
    description:
      'See workflow health, pending actions, and warehouse status from a shared operational view.',
    icon: CheckCircle2,
  },
];

const capabilitySections = [
  {
    eyebrow: 'Inventory & Warehouses',
    title: 'Clear stock visibility without spreadsheet drift.',
    description:
      'Track quantities, warehouse coverage, and movement history from a central inventory surface built for daily use.',
    points: [
      'Warehouse-aware stock views',
      'Movement and adjustment tracking',
      'Low-stock awareness and operational context',
    ],
    icon: Warehouse,
  },
  {
    eyebrow: 'Purchases & Orders',
    title: 'One flow from inbound purchases to outbound fulfillment.',
    description:
      'Keep suppliers, purchases, customers, and orders connected so teams can move work forward with less friction.',
    points: [
      'Purchase and receiving workflows',
      'Structured order lifecycle tracking',
      'Shared view across operations roles',
    ],
    icon: SlidersHorizontal,
  },
];

const useCases = [
  {
    title: 'For operations leads',
    description:
      'Get one place to monitor inventory, warehouse activity, and fulfillment progress.',
    icon: Users,
  },
  {
    title: 'For procurement teams',
    description:
      'Manage suppliers, purchasing flow, and inbound stock with clearer status visibility.',
    icon: Factory,
  },
  {
    title: 'For warehouse teams',
    description:
      'Track stock movement, warehouse-specific views, and handoffs with less confusion.',
    icon: Truck,
  },
];

const trustItems = [
  'Role-aware access across the platform',
  'Shared operational visibility for teams',
  'Structured workflows instead of ad-hoc processes',
  'Centralized records for products, suppliers, customers, and warehouses',
];

const sectionVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.12,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <motion.div
      className="min-h-screen bg-background text-foreground"
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1 }}
      transition={{ duration: 0.45 }}
    >
      <main className="w-full">
        <section className="relative overflow-hidden border-b border-border bg-card">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_62%)]"
              animate={prefersReducedMotion ? undefined : { opacity: [0.75, 1, 0.78], scale: [1, 1.04, 1] }}
              transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(180deg,transparent,rgba(59,130,246,0.06))]"
              animate={prefersReducedMotion ? undefined : { opacity: [0.45, 0.72, 0.45] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="absolute left-0 top-[18%] h-px w-40 bg-border/80" />
            <div className="absolute right-0 top-[18%] h-px w-40 bg-border/80" />
            <div className="absolute left-[10%] top-[18%] h-16 w-16 rounded-bl-[28px] border-b border-l border-border/70" />
            <div className="absolute right-[10%] top-[18%] h-16 w-16 rounded-br-[28px] border-b border-r border-border/70" />
            <div className="absolute left-0 bottom-[28%] h-px w-44 bg-border/70" />
            <div className="absolute right-0 bottom-[28%] h-px w-44 bg-border/70" />
          </div>

          <motion.header
            className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5 lg:px-10"
            initial={prefersReducedMotion ? false : 'hidden'}
            animate={prefersReducedMotion ? undefined : 'visible'}
            variants={sectionVariants}
          >
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Boxes className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-brand-dark">Manifest</p>
                <p className="text-xs text-brand-muted">for Operations</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
              <a
                href="#features"
                className="relative pb-1 text-brand-muted transition-colors duration-200 hover:text-brand-dark after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-300 hover:after:scale-x-100"
              >
                Products
              </a>
              <a
                href="#overview"
                className="relative pb-1 text-brand-muted transition-colors duration-200 hover:text-brand-dark after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-300 hover:after:scale-x-100"
              >
                Docs
              </a>
              <a
                href="#changes"
                className="relative pb-1 text-brand-muted transition-colors duration-200 hover:text-brand-dark after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-300 hover:after:scale-x-100"
              >
                Changelog
              </a>
              <a
                href="#blog"
                className="relative pb-1 text-brand-muted transition-colors duration-200 hover:text-brand-dark after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-300 hover:after:scale-x-100"
              >
                Blog
              </a>
            </nav>

            <Link to="/login">
              <motion.div whileHover={prefersReducedMotion ? undefined : { y: -2, scale: 1.02 }} whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}>
                <Button
                  variant="outline"
                  className="h-10 rounded-full border-white/70 bg-white/70 px-4 text-xs text-brand-dark shadow-[0_10px_25px_rgba(26,29,37,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-md hover:bg-white"
                >
                  Log in
                </Button>
              </motion.div>
            </Link>
          </motion.header>

          <motion.div
            className="relative z-10 mx-auto max-w-7xl px-6 pb-8 pt-10 lg:px-10 lg:pb-10"
            initial={prefersReducedMotion ? false : 'hidden'}
            animate={prefersReducedMotion ? undefined : 'visible'}
            variants={sectionVariants}
          >
            <motion.div id="overview" className="mx-auto max-w-4xl text-center" variants={itemVariants}>
               
              <h1 className="text-brand-dark mx-auto mt-6 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                The Single Source of Truth for Enterprise Operations.              </h1>
              <p className="text-brand-muted mx-auto mt-5 max-w-2xl text-sm leading-7 sm:text-base">
                Bridging the gap between complex backend logic and seamless field execution. 
                Manage procurement, inventory, and fulfillment in one unified interface.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/login">
                  <motion.div whileHover={prefersReducedMotion ? undefined : { y: -3, scale: 1.02 }} whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}>
                    <Button className="rounded-full border border-[#5f85ff] bg-[linear-gradient(135deg,#3B6BFF_0%,#6D8FFF_100%)] px-6 shadow-[0_18px_40px_rgba(59,107,255,0.35),inset_0_1px_0_rgba(255,255,255,0.28)] hover:brightness-105">
                      Start free trial
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </Link>
                <Link to="/login">
                  <motion.div whileHover={prefersReducedMotion ? undefined : { y: -3, scale: 1.02 }} whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}>
                    <Button
                      variant="outline"
                      className="rounded-full border-slate-200 bg-white px-6 text-brand-dark shadow-[0_8px_24px_rgba(26,29,37,0.06),inset_0_1px_0_rgba(255,255,255,0.95)] hover:bg-slate-50"
                    >
                      Read docs
                    </Button>
                  </motion.div>
                </Link>
              </div>
            </motion.div>

            <motion.div className="mx-auto mt-12 grid max-w-5xl gap-8 md:grid-cols-3" variants={sectionVariants}>
              {heroBenefits.map((item, index) => (
                <motion.div
                  key={item.title}
                  variants={itemVariants}
                  whileHover={prefersReducedMotion ? undefined : { y: -8, scale: 1.015 }}
                  className="rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(246,250,255,0.72))] px-6 py-8 text-center shadow-[0_16px_34px_rgba(59,107,255,0.08),inset_0_1px_0_rgba(255,255,255,0.94)] backdrop-blur-md"
                >
                  <motion.div
                    className="relative mx-auto h-24 w-24"
                    animate={prefersReducedMotion ? undefined : { y: [0, -4, 0] }}
                    transition={{ duration: 4 + index, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.95),rgba(207,225,255,0.72)_45%,rgba(183,210,255,0.38)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_18px_36px_rgba(59,107,255,0.14)]" />
                    <div className="absolute inset-[10px] rounded-full border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(232,241,255,0.68))]" />
                    <div className="absolute inset-[22px] rounded-2xl bg-[linear-gradient(180deg,rgba(59,107,255,0.18),rgba(109,143,255,0.06))] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" />
                    <motion.div
                      className={[
                        'absolute inset-[26px] flex items-center justify-center rounded-2xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(227,238,255,0.88))] text-[#3B6BFF] shadow-[0_10px_20px_rgba(59,107,255,0.10)]',
                        index === 1 && 'text-[#5c6cff]',
                        index === 2 && 'text-[#4b7bff]',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      whileHover={prefersReducedMotion ? undefined : { rotate: [0, -5, 5, 0] }}
                      transition={{ duration: 0.45 }}
                    >
                      <item.icon className="h-7 w-7 stroke-[2.1]" />
                    </motion.div>
                  </motion.div>
                  <h3 className="mt-6 text-sm font-medium text-brand-dark">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-brand-muted">{item.description}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(196,219,255,0.38),rgba(255,255,255,0.88)_34%,rgba(255,255,255,0.98)_100%)] shadow-[0_22px_48px_rgba(59,107,255,0.10)]"
              variants={itemVariants}
              whileHover={prefersReducedMotion ? undefined : { y: -6, scale: 1.005 }}
            >
              <div className="flex items-center justify-between border-b border-white/70 bg-white/55 px-5 py-4 text-xs text-[#1A1D25] backdrop-blur-md">
                <span className="font-medium">Operations Console</span>
                <span className="text-brand-muted">Thu 8 May 15:09</span>
              </div>
              <div className="relative p-6 sm:p-8">
                <motion.div
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(109,143,255,0.14),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(255,255,255,0.95),transparent_45%)]"
                  animate={prefersReducedMotion ? undefined : { opacity: [0.65, 1, 0.7] }}
                  transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="relative mx-auto max-w-3xl rounded-[28px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(246,250,255,0.62))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_16px_36px_rgba(59,107,255,0.08)] sm:p-5">
                  <div className="rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(245,249,255,0.58))] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <div className="flex items-center gap-2 border-b border-white/70 px-4 py-3">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                      <div className="ml-3 rounded-full border border-white/70 bg-white/45 px-3 py-1 text-[11px] text-brand-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                        /erp/ops/dashboard
                      </div>
                    </div>
                    <div className="grid gap-4 p-4 md:grid-cols-[1.2fr_0.8fr]">
                      <motion.div
                        className="rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(245,249,255,0.68))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_10px_24px_rgba(59,107,255,0.06)]"
                        initial={prefersReducedMotion ? false : { opacity: 0, x: -16 }}
                        whileInView={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.35 }}
                        transition={{ duration: 0.55 }}
                      >
                        <p className="text-xs uppercase tracking-[0.18em] text-brand-muted">Workflow status</p>
                        <div className="mt-4 space-y-3">
                          {[
                            ['Purchase intake', '14 pending'],
                            ['Warehouse sync', 'Stable'],
                            ['Fulfillment pace', 'On schedule'],
                          ].map(([label, value]) => (
                            <motion.div
                              key={label}
                              className="rounded-xl border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(248,250,255,0.74))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]"
                              whileHover={prefersReducedMotion ? undefined : { x: 4 }}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-brand-muted">{label}</span>
                                <span className="text-sm font-medium text-brand-dark">{value}</span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                      <motion.div
                        className="space-y-4"
                        initial={prefersReducedMotion ? false : { opacity: 0, x: 16 }}
                        whileInView={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.35 }}
                        transition={{ duration: 0.55, delay: 0.08 }}
                      >
                        <motion.div className="rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(245,249,255,0.68))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_10px_24px_rgba(59,107,255,0.06)]" whileHover={prefersReducedMotion ? undefined : { y: -4 }}>
                          <p className="text-xs uppercase tracking-[0.18em] text-brand-muted">Warehouse view</p>
                          <div className="mt-4 flex h-28 items-center justify-center rounded-[18px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(232,241,255,0.62))] shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                            <motion.div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.95),rgba(206,226,255,0.75)_48%,rgba(182,210,255,0.40)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_16px_34px_rgba(59,107,255,0.18)]" animate={prefersReducedMotion ? undefined : { rotate: [0, 4, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
                              <div className="absolute inset-[12px] rounded-full border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.90),rgba(225,238,255,0.82))]" />
                              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(221,235,255,0.88))] text-[#3B6BFF] shadow-[0_10px_20px_rgba(59,107,255,0.12)]">
                                <Warehouse className="h-5 w-5 stroke-[2.1]" />
                              </div>
                            </motion.div>
                          </div>
                        </motion.div>
                        <motion.div className="rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(245,249,255,0.68))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_10px_24px_rgba(59,107,255,0.06)]" whileHover={prefersReducedMotion ? undefined : { y: -4 }}>
                          <p className="text-xs uppercase tracking-[0.18em] text-brand-muted">Product sync</p>
                          <div className="mt-4 flex h-28 items-center justify-center rounded-[18px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(232,241,255,0.62))] shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                            <motion.div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.95),rgba(206,226,255,0.75)_48%,rgba(182,210,255,0.40)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_16px_34px_rgba(59,107,255,0.18)]" animate={prefersReducedMotion ? undefined : { rotate: [0, -4, 0] }} transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}>
                              <div className="absolute inset-[12px] rounded-full border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.90),rgba(225,238,255,0.82))]" />
                              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(221,235,255,0.88))] text-[#3B6BFF] shadow-[0_10px_20px_rgba(59,107,255,0.12)]">
                                <Package2 className="h-5 w-5 stroke-[2.1]" />
                              </div>
                            </motion.div>
                          </div>
                        </motion.div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        
        <motion.section className="border-t border-border/70 bg-card" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={sectionVariants}>
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-medium text-brand-muted">Why Manifest ?</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
                 Operations are messy. Visibility shouldn't be.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-brand-muted sm:text-base">
               Most businesses outgrow their spreadsheets long before they find a solution that scales. Manifest centralizes your fragmented data into a single, high-fidelity source of truth.
              </p>
            </div>

            <motion.div className="mt-10 grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch" variants={sectionVariants}>
              <motion.div className="relative rounded-[32px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(247,250,255,0.74))] p-8 shadow-[0_18px_40px_rgba(59,107,255,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md" variants={itemVariants} whileHover={prefersReducedMotion ? undefined : { y: -6, scale: 1.01 }}>
                <div className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(186,59,62,0.45),transparent)]" />
                <div className="mb-6 inline-flex items-center rounded-full border border-[#BA3B3E]/15 bg-brand-maroon-soft px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#BA3B3E]">
                  Problem
                </div>
                <p className="text-sm font-medium text-brand-muted">
                  {problemSolution[0].title}
                </p>
                <p className="mt-5 text-2xl leading-[1.55] tracking-[-0.03em] text-brand-dark sm:text-[2rem]">
                  {problemSolution[0].description}
                </p>
              </motion.div>

              <div className="hidden items-center justify-center lg:flex">
                <motion.div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(246,249,255,0.78))] shadow-[0_16px_30px_rgba(59,107,255,0.10),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md" animate={prefersReducedMotion ? undefined : { x: [0, 6, 0], rotate: [0, 4, 0] }} transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}>
                  <ArrowUpRight className="h-5 w-5 text-primary" />
                </motion.div>
              </div>

              <motion.div className="relative rounded-[32px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(247,250,255,0.74))] p-8 shadow-[0_18px_40px_rgba(59,107,255,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md" variants={itemVariants} whileHover={prefersReducedMotion ? undefined : { y: -6, scale: 1.01 }}>
                <div className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(59,107,255,0.55),transparent)]" />
                <div className="mb-6 inline-flex items-center rounded-full border border-primary/15 bg-blue-50/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-primary">
                  Solution
                </div>
                <p className="text-sm font-medium text-brand-muted">
                  {problemSolution[1].title}
                </p>
                <p className="mt-5 text-2xl leading-[1.55] tracking-[-0.03em] text-brand-dark sm:text-[2rem]">
                  {problemSolution[1].description}
                </p>
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section className="mx-auto max-w-7xl px-6 py-16 lg:px-10" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={sectionVariants}>
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-muted-foreground">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              A simple flow for complex operational work.
            </h2>
          </div>

          <motion.div className="mt-10 grid gap-4 lg:grid-cols-3" variants={sectionVariants}>
            {steps.map((item) => (
              <motion.div
                key={item.step}
                variants={itemVariants}
                whileHover={prefersReducedMotion ? undefined : { y: -7, scale: 1.015 }}
                className="relative overflow-hidden rounded-[28px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(246,250,255,0.74))] p-6 shadow-[0_16px_34px_rgba(59,107,255,0.08),inset_0_1px_0_rgba(255,255,255,0.94)] backdrop-blur-md"
              >
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.28),transparent_45%)]" />
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-semibold tracking-[-0.03em] text-brand-dark">{item.step}</span>
                  <motion.div className="relative flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(228,238,252,0.82))] text-primary shadow-[0_14px_28px_rgba(59,107,255,0.10)]" whileHover={prefersReducedMotion ? undefined : { rotate: [0, -6, 6, 0] }} transition={{ duration: 0.45 }}>
                    <div className="absolute inset-[8px] rounded-[16px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(240,245,255,0.58))]" />
                    <item.icon className="relative h-6 w-6 stroke-[2.2]" />
                  </motion.div>
                </div>
                <h3 className="relative mt-6 text-xl font-semibold">{item.title}</h3>
                <p className="relative mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <motion.section className="border-t border-border/70 bg-card" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={sectionVariants}>
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-muted-foreground">Capabilities</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Deeper product areas that make the platform useful every day.
              </h2>
            </div>

            <motion.div className="mt-10 space-y-6" variants={sectionVariants}>
              {capabilitySections.map((section) => (
                <motion.div
                  key={section.title}
                  variants={itemVariants}
                  whileHover={prefersReducedMotion ? undefined : { y: -6 }}
                  className="grid gap-6 rounded-3xl border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(246,250,255,0.74))] p-8 shadow-[0_16px_34px_rgba(59,107,255,0.06),inset_0_1px_0_rgba(255,255,255,0.94)] lg:grid-cols-[1.05fr_0.95fr]"
                >
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{section.eyebrow}</p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight">{section.title}</h3>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
                      {section.description}
                    </p>
                    <div className="mt-6 space-y-3">
                      {section.points.map((point) => (
                        <div key={point} className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#3B6BFF] drop-shadow-[0_0_8px_rgba(59,107,255,0.45)]" />
                          <span className="text-sm text-[#7A8396]">{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-center rounded-2xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(244,248,255,0.68))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                    <motion.div className="w-full max-w-[260px] rounded-[26px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(245,249,255,0.72))] p-5 shadow-[0_16px_34px_rgba(59,107,255,0.08),inset_0_1px_0_rgba(255,255,255,0.94)] backdrop-blur-md" whileHover={prefersReducedMotion ? undefined : { rotateX: 4, rotateY: -4 }}>
                      <div className="rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(233,241,255,0.48))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(225,238,255,0.82))] text-[#3B6BFF] shadow-[0_14px_28px_rgba(59,107,255,0.12)]">
                          <div className="absolute inset-[8px] rounded-[14px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(238,245,255,0.62))]" />
                          <section.icon className="relative h-6 w-6 stroke-[2.1]" />
                        </div>
                        <div className="mt-12">
                          <p className="text-xs uppercase tracking-[0.18em] text-[#7A8396]">
                            Manifest module
                          </p>
                          <p className="mt-3 text-lg font-semibold text-brand-dark">{section.eyebrow}</p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        <motion.section className="mx-auto max-w-7xl px-6 py-16 lg:px-10" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={sectionVariants}>
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-muted-foreground">Use cases</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Built for the people running the operation.
            </h2>
          </div>

          <motion.div className="mt-10 grid gap-4 lg:grid-cols-3" variants={sectionVariants}>
            {useCases.map((item) => (
              <motion.div key={item.title} variants={itemVariants} whileHover={prefersReducedMotion ? undefined : { y: -6, scale: 1.01 }} className="rounded-2xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(246,250,255,0.72))] p-6 shadow-[0_14px_30px_rgba(59,107,255,0.06),inset_0_1px_0_rgba(255,255,255,0.94)]">
                <motion.div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(230,239,255,0.82))] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]" whileHover={prefersReducedMotion ? undefined : { rotate: [0, -8, 8, 0] }} transition={{ duration: 0.5 }}>
                  <item.icon className="h-5 w-5" />
                </motion.div>
                <h3 className="mt-5 text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <motion.section className="border-t border-border/70 bg-card" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={sectionVariants}>
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Reliability</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                A more trustworthy foundation for ERP work.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Manifest is designed to reduce ambiguity, improve coordination, and give teams a more dependable place to work.
              </p>
            </div>

            <motion.div className="grid gap-3 sm:grid-cols-2" variants={sectionVariants}>
              {trustItems.map((item) => (
                <motion.div key={item} variants={itemVariants} whileHover={prefersReducedMotion ? undefined : { y: -4 }} className="rounded-2xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(246,250,255,0.72))] p-5 shadow-[0_14px_30px_rgba(59,107,255,0.06),inset_0_1px_0_rgba(255,255,255,0.94)]">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                    <p className="text-sm leading-7 text-foreground/90">{item}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

       
        <motion.section className="border-t border-border/70 bg-card" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} variants={sectionVariants}>
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
            <motion.div className="rounded-3xl border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(246,250,255,0.74))] px-6 py-12 text-center shadow-[0_16px_34px_rgba(59,107,255,0.06),inset_0_1px_0_rgba(255,255,255,0.94)] sm:px-10" variants={itemVariants} whileHover={prefersReducedMotion ? undefined : { y: -4 }}>
              <p className="text-sm font-medium text-muted-foreground">Start using Manifest</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Bring your operations into one structured workspace.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Access inventory, warehouse, procurement, supplier, customer, and order workflows from one place.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/login">
                  <motion.div whileHover={prefersReducedMotion ? undefined : { y: -3, scale: 1.02 }} whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}>
                    <Button size="lg">
                      Open ERP
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </Link>
                <Link to="/login">
                  <motion.div whileHover={prefersReducedMotion ? undefined : { y: -3, scale: 1.02 }} whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}>
                    <Button size="lg" variant="outline">
                      View login access
                    </Button>
                  </motion.div>
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.section>

        <footer className="overflow-hidden border-t border-border bg-card">
          <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
            <div className="flex flex-col gap-8 border-b border-border/70 pb-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Boxes className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-3">
                  
                  <div>
                    <p className="text-sm font-medium">Manifest</p>
                    <p className="text-xs text-muted-foreground">Operations Platform</p>
                  </div>
                </div>
              </div>

             </div>

            <div className="grid gap-8 border-b border-border/70 py-10 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Product</p>
                <div className="mt-4 space-y-3 text-sm">
                  <a href="#features" className="block text-foreground/90 transition-colors hover:text-foreground">Inventory Management</a>
                  <a href="#features" className="block text-foreground/90 transition-colors hover:text-foreground">Order Management</a>
                  <a href="#features" className="block text-foreground/90 transition-colors hover:text-foreground">Procurement Flow</a>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Docs & Resources</p>
                <div className="mt-4 space-y-3 text-sm">
                  <a href="#overview" className="block text-foreground/90 transition-colors hover:text-foreground">Platform Docs</a>
                  <a href="#overview" className="block text-foreground/90 transition-colors hover:text-foreground">Implementation Guide</a>
                  <a href="#changes" className="block text-foreground/90 transition-colors hover:text-foreground">Changelog</a>
                  <a href="#blog" className="block text-foreground/90 transition-colors hover:text-foreground">Blog</a>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Security & Legal</p>
                <div className="mt-4 space-y-3 text-sm">
                  <a href="#features" className="block text-foreground/90 transition-colors hover:text-foreground">Security Overview</a>
                  <a href="#features" className="block text-foreground/90 transition-colors hover:text-foreground">Privacy Policy</a>
                  <a href="#features" className="block text-foreground/90 transition-colors hover:text-foreground">Terms</a>
                  <a href="#features" className="block text-foreground/90 transition-colors hover:text-foreground">Compliance</a>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Company & Contact</p>
                <div className="mt-4 space-y-3 text-sm">
                  <Link to="/login" className="block text-foreground/90 transition-colors hover:text-foreground">Contact Sales</Link>
                  <a href="#blog" className="block text-foreground/90 transition-colors hover:text-foreground">Updates</a>
                  <a href="#changes" className="block text-foreground/90 transition-colors hover:text-foreground">Release Notes</a>
                  <Link to="/login" className="block text-foreground/90 transition-colors hover:text-foreground">Get Access</Link>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>&copy; 2026 Manifest, Inc.</p>
              <p>Built for modern operations teams.</p>
            </div>
          </div>
        </footer>

        <section id="changes" className="sr-only" />
        <section id="blog" className="sr-only" />
      </main>
    </motion.div>
  );
}
