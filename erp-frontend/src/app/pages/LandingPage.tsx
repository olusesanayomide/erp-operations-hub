import { Link, Navigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Boxes,
  Factory,
  FileText,
  Package2,
  Shield,
  ShieldCheck,
  Truck,
  Upload,
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

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="w-full">
        <section className="relative overflow-hidden border-b border-border bg-card">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_62%)]" />
            <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(180deg,transparent,rgba(59,130,246,0.06))]" />
            <div className="absolute left-0 top-[18%] h-px w-40 bg-border/80" />
            <div className="absolute right-0 top-[18%] h-px w-40 bg-border/80" />
            <div className="absolute left-[10%] top-[18%] h-16 w-16 rounded-bl-[28px] border-b border-l border-border/70" />
            <div className="absolute right-[10%] top-[18%] h-16 w-16 rounded-br-[28px] border-b border-r border-border/70" />
            <div className="absolute left-0 bottom-[28%] h-px w-44 bg-border/70" />
            <div className="absolute right-0 bottom-[28%] h-px w-44 bg-border/70" />
          </div>

          <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5 lg:px-10">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Boxes className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Manifest</p>
                <p className="text-xs text-muted-foreground">for Operations</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
              <a href="#features" className="transition-colors hover:text-foreground">
                Products
              </a>
              <a href="#overview" className="transition-colors hover:text-foreground">
                Docs
              </a>
              <a href="#changes" className="transition-colors hover:text-foreground">
                Changelog
              </a>
              <a href="#blog" className="transition-colors hover:text-foreground">
                Blog
              </a>
            </nav>

            <Link to="/login">
              <Button variant="outline" className="h-9 rounded-full px-4 text-xs">
                Log in
              </Button>
            </Link>
          </header>

          <div className="relative z-10 mx-auto max-w-7xl px-6 pb-8 pt-10 lg:px-10 lg:pb-10">
            <div id="overview" className="mx-auto max-w-4xl text-center">
               
              <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Release, organize and scale your business operations in one place.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Effortless inventory control, procurement visibility, customer workflows,
                and warehouse coordination inside a single ERP experience.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/login">
                  <Button className="rounded-full px-6">
                    Start free trial
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" className="rounded-full px-6">
                    Read docs
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mx-auto mt-12 grid max-w-5xl gap-8 md:grid-cols-3">
              {heroBenefits.map((item) => (
                <div key={item.title} className="text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="mt-4 text-sm font-medium">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-[24px] border border-border bg-background shadow-sm">
              <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
                <span>Operations Console</span>
                <span>Thu 8 May 15:09</span>
              </div>
              <div className="bg-[linear-gradient(180deg,rgba(96,165,250,0.28),rgba(255,255,255,0.75)_38%,rgba(255,255,255,1)_100%)] p-6 sm:p-8">
                <div className="mx-auto max-w-3xl rounded-[20px] border border-border bg-card shadow-sm">
                  <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <div className="ml-3 rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground">
                      /erp/ops/dashboard
                    </div>
                  </div>
                  <div className="grid gap-4 p-4 md:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-2xl border border-border bg-background p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Workflow status</p>
                      <div className="mt-4 space-y-3">
                        {[
                          ['Purchase intake', '14 pending'],
                          ['Warehouse sync', 'Stable'],
                          ['Fulfillment pace', 'On schedule'],
                        ].map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3">
                            <span className="text-sm text-muted-foreground">{label}</span>
                            <span className="text-sm font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border bg-background p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Warehouse view</p>
                        <div className="mt-4 flex h-24 items-center justify-center rounded-xl bg-muted/40">
                          <Warehouse className="h-8 w-8 text-primary" />
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border bg-background p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Product sync</p>
                        <div className="mt-4 flex h-24 items-center justify-center rounded-xl bg-muted/40">
                          <Package2 className="h-8 w-8 text-primary" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-14 lg:px-10 lg:py-18">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              More than just a tool
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Explore what else Manifest can do for your operations team.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featureCards.map((card, index) => (
              <div
                key={card.title}
                className="rounded-2xl border border-border bg-card px-6 py-8 text-center shadow-sm"
              >
                <div
                  className={[
                    'mx-auto flex h-20 w-20 items-center justify-center rounded-full',
                    index === 0 && 'bg-blue-50 text-blue-600',
                    index === 1 && 'bg-violet-50 text-violet-600',
                    index === 2 && 'bg-rose-50 text-rose-600',
                    index === 3 && 'bg-emerald-50 text-emerald-600',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <card.icon className="h-8 w-8" />
                </div>
                <h3 className="mt-6 text-xl font-semibold">{card.title}</h3>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </section>

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
    </div>
  );
}
