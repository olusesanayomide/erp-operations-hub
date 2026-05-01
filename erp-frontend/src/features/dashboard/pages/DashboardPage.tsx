import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  Boxes,
  ChevronRight,
  Factory,
  Package,
  Plus,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';
import { useSettings } from '@/app/providers/SettingsContext';
import { ErrorState, RetryButton } from '@/shared/components/PageComponents';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { getDashboardSummary } from '@/shared/lib/erp-api';
import { cn } from '@/shared/lib/utils';
import type { OrderStatus, StockStatus } from '@/shared/types/erp';
import { Button } from '@/shared/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';
import { Skeleton } from '@/shared/ui/skeleton';

type DashboardSummary = Awaited<ReturnType<typeof getDashboardSummary>>;

type QuickAction = {
  label: string;
  icon: typeof ShoppingCart;
  path: string;
  perm: string;
  priority: 'primary' | 'secondary';
};

const STATUS_BAR_COLORS = [
  'bg-slate-300',
  'bg-sky-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-slate-500',
  'bg-rose-500',
];

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Stock In', icon: ArrowDownRight, path: '/inventory', perm: 'inventory.stock-in', priority: 'primary' },
  { label: 'Stock Out', icon: ArrowUpRight, path: '/inventory', perm: 'inventory.stock-out', priority: 'primary' },
  { label: 'Transfer', icon: ArrowRightLeft, path: '/inventory', perm: 'inventory.transfer', priority: 'primary' },
  { label: 'New Order', icon: ShoppingCart, path: '/orders/new', perm: 'orders.create', priority: 'primary' },
  { label: 'New Purchase', icon: Truck, path: '/purchases/new', perm: 'purchases.create', priority: 'secondary' },
  { label: 'Add Customer', icon: Users, path: '/customers', perm: 'customers.create', priority: 'secondary' },
  { label: 'Add Supplier', icon: Factory, path: '/suppliers', perm: 'suppliers.create', priority: 'secondary' },
  { label: 'Add Warehouse', icon: Warehouse, path: '/warehouses', perm: 'warehouses.create', priority: 'secondary' },
];

function DashboardSkeleton() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="space-y-4"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Skeleton className="h-36 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-24 shrink-0 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-52 rounded-xl" />
    </motion.div>
  );
}

function SectionHeader({
  title,
  description,
  linkTo,
  linkLabel = 'View all',
}: {
  title: string;
  description?: string;
  linkTo?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description && <p className="mt-1 text-[11px] leading-4 text-slate-500">{description}</p>}
      </div>
      {linkTo && (
        <Link to={linkTo} className="inline-flex min-h-11 items-center text-xs font-semibold text-primary">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

function InventoryMetricTile({
  label,
  value,
  description,
  icon: Icon,
  href,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  description: string;
  icon: typeof Package;
  href: string;
  tone?: 'default' | 'warning' | 'success';
}) {
  const toneClasses = {
    default: 'bg-slate-100 text-slate-700',
    warning: 'bg-amber-50 text-amber-700',
    success: 'bg-emerald-50 text-emerald-700',
  };

  return (
    <Link
      to={href}
      className="group rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-[1.375rem] font-bold leading-7 text-slate-950">{value}</p>
          <p className="mt-1 text-[11px] leading-4 text-slate-400">{description}</p>
        </div>
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            toneClasses[tone],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

function HealthCard({
  summary,
  lowStockCount,
  draftPurchaseCount,
}: {
  summary: DashboardSummary;
  lowStockCount: number;
  draftPurchaseCount: number;
}) {
  const healthTone =
    lowStockCount > 0
      ? 'warning'
      : summary.orders.activeCount > 0 || draftPurchaseCount > 0
        ? 'default'
        : 'success';

  const toneClasses = {
    default: 'border-slate-200 bg-white text-slate-950 before:bg-sky-500',
    warning: 'border-amber-200 bg-amber-50/70 text-slate-950 before:bg-amber-500',
    success: 'border-emerald-200 bg-emerald-50/70 text-slate-950 before:bg-emerald-500',
  };

  const title =
    lowStockCount > 0
      ? `${lowStockCount} low stock item${lowStockCount === 1 ? '' : 's'} need attention`
      : 'Inventory is healthy';

  const description =
    lowStockCount > 0
      ? 'Review shortages first to prevent delayed fulfillment.'
      : 'No urgent stock alerts right now. Focus on active orders and replenishment.';

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-xl border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] before:absolute before:inset-y-0 before:left-0 before:w-1',
        toneClasses[healthTone],
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Health</p>
          <h2 className="mt-2 text-lg font-bold leading-6 text-slate-950">{title}</h2>
          <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            healthTone === 'default' && 'bg-sky-50 text-sky-700',
            healthTone === 'warning' && 'bg-amber-100 text-amber-700',
            healthTone === 'success' && 'bg-emerald-100 text-emerald-700',
          )}
        >
          <AlertTriangle className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-slate-200/80 bg-white/70 p-3">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Low Stock</p>
          <p className="mt-1 text-base font-bold text-slate-950">{lowStockCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200/80 bg-white/70 p-3">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Reserved</p>
          <p className="mt-1 text-base font-bold text-slate-950">{summary.inventory.reservedQuantity.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-slate-200/80 bg-white/70 p-3">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Active</p>
          <p className="mt-1 text-base font-bold text-slate-950">{summary.orders.activeCount}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          asChild
          size="sm"
          className={cn(
            'min-h-11 rounded-lg px-4 shadow-none',
            healthTone === 'default' && 'bg-slate-950 text-white hover:bg-slate-800',
          )}
        >
          <Link to={lowStockCount > 0 ? '/inventory' : '/orders'}>
            {lowStockCount > 0 ? 'Review alerts' : 'Open active orders'}
          </Link>
        </Button>
        {draftPurchaseCount > 0 && (
          <Button
            asChild
            size="sm"
            variant={healthTone === 'default' ? 'ghost' : 'outline'}
            className="min-h-11 rounded-lg px-4"
          >
            <Link to="/purchases">
              Draft purchases
            </Link>
          </Button>
        )}
      </div>
    </section>
  );
}

function QuickActionButton({
  action,
}: {
  action: QuickAction;
}) {
  return (
    <Button
      asChild
      variant="outline"
      className="flex min-h-20 w-[5.75rem] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-slate-200 bg-white/70 px-3 py-3 text-center shadow-none hover:bg-slate-50"
    >
      <Link to={action.path}>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <action.icon className="h-5 w-5" />
        </div>
        <span className="text-[11px] font-semibold leading-4 text-slate-700">{action.label}</span>
      </Link>
    </Button>
  );
}

function StatusBar({
  statuses,
}: {
  statuses: DashboardSummary['orders']['byStatus'];
}) {
  const total = statuses.reduce((sum, status) => sum + status.value, 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <SectionHeader
        title="Order Status"
        linkTo="/orders"
      />

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="flex h-full w-full">
          {statuses.map((status, index) => {
            const width = total > 0 ? `${(status.value / total) * 100}%` : `${100 / statuses.length}%`;
            return (
              <div
                key={status.name}
                className={cn('h-full', STATUS_BAR_COLORS[index % STATUS_BAR_COLORS.length])}
                style={{ width }}
                aria-hidden="true"
              />
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {statuses.map((status, index) => (
          <Link
            key={status.name}
            to="/orders"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <span
              className={cn('h-2.5 w-2.5 rounded-full', STATUS_BAR_COLORS[index % STATUS_BAR_COLORS.length])}
            />
            <span>{status.name}</span>
            <span className="text-muted-foreground">{status.value}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { canPerform } = useAuth();
  const { formatMoney } = useSettings();
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
    retry: 1,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const summary = dashboardQuery.data;

  const availableActions = useMemo(
    () => QUICK_ACTIONS.filter((action) => canPerform(action.perm)),
    [canPerform],
  );
  const primaryActions = availableActions.filter((action) => action.priority === 'primary').slice(0, 4);
  const secondaryActions = availableActions.filter((action) => action.priority === 'secondary');

  if (dashboardQuery.isLoading && !summary) {
    return <DashboardSkeleton />;
  }

  if (dashboardQuery.isError && !summary) {
    return (
      <ErrorState
        title="Dashboard data could not be loaded"
        description={
          dashboardQuery.error instanceof Error
            ? dashboardQuery.error.message
            : 'The dashboard summary request failed. Please try again.'
        }
        action={<RetryButton onClick={() => void dashboardQuery.refetch()} />}
      />
    );
  }

  if (!summary) {
    return null;
  }

  const lowStockItems = summary.inventory.lowStockItems ?? [];
  const lowStockCount = summary.inventory.lowStockCount ?? 0;
  const draftPurchaseCount = summary.purchases.draftCount ?? 0;
  const recentOrders = (summary.orders.recent ?? []).slice(0, 3);

  return (
    <div className="space-y-4 animate-fade-in">
      <HealthCard
        summary={summary}
        lowStockCount={lowStockCount}
        draftPurchaseCount={draftPurchaseCount}
      />

      <section className="space-y-4">
        <SectionHeader
          title="Inventory Overview"
          linkTo="/inventory"
        />

        <div className="grid grid-cols-2 gap-3">
          <InventoryMetricTile
            label="Available"
            value={summary.inventory.availableQuantity.toLocaleString()}
            description="Ready to sell"
            icon={Boxes}
            href="/inventory"
          />
          <InventoryMetricTile
            label="Reserved"
            value={summary.inventory.reservedQuantity.toLocaleString()}
            description="Committed stock"
            icon={ArrowUpRight}
            href="/inventory"
          />
          <InventoryMetricTile
            label="Low Stock"
            value={lowStockCount}
            description={lowStockCount > 0 ? 'Needs action' : 'Healthy'}
            icon={AlertTriangle}
            href="/inventory"
            tone={lowStockCount > 0 ? 'warning' : 'success'}
          />
          <InventoryMetricTile
            label="Coverage"
            value={summary.counts.warehouses}
            description="Warehouse locations"
            icon={Warehouse}
            href="/warehouses"
          />
        </div>
      </section>

      {primaryActions.length > 0 && (
        <section className="space-y-4">
          <SectionHeader
            title="Quick Actions"
          />

          <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
            {primaryActions.map((action) => (
              <div key={action.label} className="snap-start">
                <QuickActionButton action={action} />
              </div>
            ))}

            {secondaryActions.length > 0 && (
              <Button
                variant="outline"
                className="flex min-h-20 w-[5.75rem] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-xl border-slate-200 bg-white/70 px-3 py-3 text-center shadow-none hover:bg-slate-50"
                onClick={() => setMoreActionsOpen(true)}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-semibold leading-4 text-slate-700">More</span>
              </Button>
            )}
          </div>
        </section>
      )}

      <StatusBar statuses={summary.orders.byStatus ?? []} />

      <section className="space-y-4">
        <SectionHeader
          title="Recent Orders"
          linkTo="/orders"
        />

        <div className="space-y-2">
          {recentOrders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="flex min-h-20 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950">{order.orderNumber}</p>
                <p className="mt-1 truncate text-[11px] leading-4 text-slate-500">
                  {order.customerName || 'Unknown customer'}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {formatMoney(order.totalAmount)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={order.status as OrderStatus} />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}

          {recentOrders.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              No orders yet.
            </p>
          )}
        </div>
      </section>

      {lowStockCount > 0 && (
        <section className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <SectionHeader
            title="Low Stock Alerts"
            linkTo="/inventory"
          />

          <div className="space-y-2">
            {lowStockItems.slice(0, 3).map((item) => (
              <Link
                key={item.id}
                to="/inventory"
                className="flex min-h-20 items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-4 py-3 transition-colors hover:bg-amber-50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">{item.productName}</p>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500">{item.warehouseName}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-950">
                    {item.quantity} / {item.minStock}
                  </p>
                  <StatusBadge status={item.status as StockStatus} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        <Link to="/products" className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300 hover:bg-slate-50">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Products</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{summary.counts.products}</p>
        </Link>
        <Link to="/customers" className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300 hover:bg-slate-50">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Customers</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{summary.counts.customers}</p>
        </Link>
      </section>

      <Sheet open={moreActionsOpen} onOpenChange={setMoreActionsOpen}>
        <SheetContent side="bottom" className="rounded-t-xl px-4 pb-6 pt-8">
          <SheetHeader>
            <SheetTitle>More Actions</SheetTitle>
            <SheetDescription>
              Secondary setup and admin tasks stay out of the main mobile flow until needed.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {secondaryActions.map((action) => (
              <Link
                key={action.label}
                to={action.path}
                onClick={() => setMoreActionsOpen(false)}
                className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <action.icon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800">{action.label}</p>
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
