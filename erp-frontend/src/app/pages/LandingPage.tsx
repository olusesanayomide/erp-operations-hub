import { Link, Navigate } from 'react-router-dom';
import { ArrowUpRight, Boxes, Factory, Package2, ShieldCheck, Truck, Warehouse } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useAuth } from '@/app/providers/AuthContext';

const featureCards = [
  {
    title: 'Inventory That Stays Calm',
    description: 'Track stock across locations with fewer interruptions, clear thresholds, and an interface that keeps signal ahead of noise.',
    icon: Warehouse,
    className: 'md:col-span-7',
  },
  {
    title: 'Order Operations',
    description: 'Move from draft to fulfillment with structured workflows built for real teams, not improvised spreadsheets.',
    icon: Truck,
    className: 'md:col-span-5',
  },
  {
    title: 'Procurement Visibility',
    description: 'See supplier activity, inbound purchases, and warehouse impact in one steady control layer.',
    icon: Factory,
    className: 'md:col-span-4',
  },
  {
    title: 'Enterprise-Ready Controls',
    description: 'Support role-aware access, shared operational context, and ERP structure that feels professional from the first login.',
    icon: ShieldCheck,
    className: 'md:col-span-4',
  },
  {
    title: 'Product Intelligence',
    description: 'Keep products, customers, suppliers, and warehouses connected through a single operating system for the business.',
    icon: Package2,
    className: 'md:col-span-4',
  },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_0%_0%,rgba(245,176,65,0.18),transparent_24%),radial-gradient(circle_at_100%_0%,rgba(84,126,255,0.16),transparent_28%),radial-gradient(circle_at_20%_100%,rgba(106,201,164,0.10),transparent_22%),linear-gradient(180deg,#fcfaf5_0%,#ffffff_42%,#fbfcff_100%)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#f7d9a7]/35 blur-3xl" />
        <div className="absolute right-[-80px] top-[-20px] h-80 w-80 rounded-full bg-[#d6e5ff]/65 blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#edf3ff] blur-3xl" />
      </div>

      <header className="fixed inset-x-0 top-4 z-40">
        <div className="mx-auto flex w-[min(1180px,calc(100%-24px))] items-center justify-between gap-6 rounded-full border border-white/70 bg-background/78 px-5 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:px-6">
          <Link to="/" className="flex items-center gap-4 text-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
              <Boxes className="h-4 w-4" />
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight">AcmeERP</p>
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Operations Platform</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground lg:flex">
            <a href="#overview" className="transition-colors hover:text-foreground">Overview</a>
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#access" className="transition-colors hover:text-foreground">Access</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="hidden h-10 px-4 sm:inline-flex">Sign In</Button>
            </Link>
            <Link to="/login">
              <Button className="h-10 px-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_rgba(67,97,238,0.18)]">Open ERP</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-20 px-6 pb-20 pt-32 lg:px-10">
        <section id="overview" className="grid grid-cols-1 gap-y-10 py-20 md:py-24 lg:grid-cols-12">
          <div className="lg:col-span-8 lg:col-start-3">
            <div className="flex flex-col items-center text-center">
              <h1 className="max-w-5xl text-5xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl" style={{ lineHeight: 1.2 }}>
 Manage inventory, orders, and purchasing in one unified workspace
               </h1>

              <p className="mt-6 max-w-3xl text-lg text-slate-500 sm:text-xl" style={{ lineHeight: 1.6 }}>
                AcmeERP brings inventory, warehouse management, purchasing, suppliers, and order execution into one refined operating surface designed for fast-moving B2B teams.
              </p>

              <div id="access" className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
                <Link to="/login">
                  <Button
                    size="lg"
                    className="w-full border border-white/30 bg-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_12px_rgba(67,97,238,0.15)] sm:w-auto"
                  >
                    Sign In
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="w-full border border-[#e8e8e8] bg-white/60 text-slate-700 hover:bg-white sm:w-auto"
                  >
                    Seeded Admin Access
                  </Button>
                </Link>
              </div>

              <div className="mt-12 w-full overflow-hidden rounded-[28px] border border-[#f1f1f1] bg-white/90 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
                <div className="rounded-[24px] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <p className="text-sm font-medium text-slate-400">Operations Overview</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-950">Calm, high-signal ERP workspace</p>
                    </div>
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
                      Live ERP Preview
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-12">
                    <div className="rounded-[22px] bg-slate-950 p-6 text-white lg:col-span-7">
                      <div className="mb-8 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-white/60">Inventory pulse</p>
                          <p className="mt-2 text-3xl font-semibold">4 warehouses in sync</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 px-3 py-2 text-sm text-white/80">Stable</div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {[
                          ['Orders', '182'],
                          ['Suppliers', '46'],
                          ['Stock Alerts', '08'],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
                            <p className="text-xs uppercase tracking-[0.18em] text-white/45">{label}</p>
                            <p className="mt-3 text-2xl font-semibold">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 lg:col-span-5">
                      <div className="rounded-[22px] border border-[#f1f1f1] bg-white p-5 shadow-sm">
                        <p className="text-sm font-medium text-slate-400">Workflow health</p>
                        <div className="mt-4 space-y-3">
                          {[
                            ['Purchase intake', '14 pending'],
                            ['Warehouse capacity', '82% utilized'],
                            ['Fulfillment pace', 'On schedule'],
                          ].map(([label, value]) => (
                            <div key={label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                              <span className="text-sm text-slate-500">{label}</span>
                              <span className="text-sm font-medium text-slate-900">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-[#f1f1f1] bg-white p-5 shadow-sm">
                        <p className="text-sm font-medium text-slate-400">Executive summary</p>
                        <p className="mt-3 text-2xl font-semibold text-slate-950">Unified purchasing, stock, and order flow.</p>
                        <p className="mt-3 text-sm leading-7 text-slate-500">
                          Designed to feel premium, dependable, and quiet enough for real operational focus.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {featureCards.map((card) => (
            <div key={card.title} className={`rounded-[22px] border border-[#f1f1f1] bg-white p-7 shadow-[0_10px_30px_rgba(15,23,42,0.04)] ${card.className}`}>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-primary">
                <card.icon className="h-5 w-5" />
              </div>
              <h2 className="mb-3 text-xl font-semibold text-slate-950">{card.title}</h2>
              <p className="text-sm leading-7 text-slate-500">{card.description}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

