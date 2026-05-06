import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  MoreHorizontal,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import { useSettings } from '@/app/providers/SettingsContext';
import { ErrorState, RetryButton } from '@/shared/components/PageComponents';
import { getDashboardSummary } from '@/shared/lib/erp-api';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

type DashboardSummary = Awaited<ReturnType<typeof getDashboardSummary>>;

type MetricTrendTone = 'positive' | 'negative';

type MetricCardProps = {
  title: string;
  value: string;
  subtitle: string;
  detail: string;
  trend: string;
  trendTone: MetricTrendTone;
  icon: typeof TrendingUp;
  sparkline: number[];
  href: string;
};

type DashboardCardProps = {
  children: React.ReactNode;
  className?: string;
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const Y_AXIS_TICKS = [0, 100, 200, 300, 400];
const HEATMAP_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const HEATMAP_HOURS = ['9.00', '10.00', '11.00', '12.00', '13.00', '14.00'];
const HEATMAP_VALUES = [
  [0.08, 0.12, 0.2, 0.14, 0.08, 0.03, 0.01],
  [0.14, 0.22, 0.4, 0.3, 0.18, 0.08, 0.04],
  [0.12, 0.34, 0.72, 0.62, 0.31, 0.14, 0.08],
  [0.08, 0.28, 0.58, 0.86, 0.54, 0.24, 0.1],
  [0.05, 0.16, 0.44, 0.63, 0.42, 0.15, 0.06],
  [0.03, 0.08, 0.16, 0.28, 0.18, 0.08, 0.03],
];
const ORDER_SOURCE_LABELS = ['Amazon', 'Alibaba', 'Tokopedia', 'Shopee'];
const ORDER_SOURCE_TONES = ['#4f6bff', '#151821', '#767f91', '#d2d7e2'];
const FUNNEL_STEPS = [
  { label: 'Awareness', value: 98.9 },
  { label: 'Engagement', value: 86.1 },
  { label: 'Evaluation', value: 72.8 },
  { label: 'Intent', value: 64.8 },
  { label: 'Conversion', value: 54.2 },
];

function DashboardCard({ children, className }: DashboardCardProps) {
  return (
    <section
      className={cn(
        'rounded-[12px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        className,
      )}
    >
      {children}
    </section>
  );
}

function DashboardSkeleton() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="space-y-4"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Skeleton className="h-16 rounded-[12px]" />
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-44 rounded-[12px]" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.75fr)]">
        <Skeleton className="h-[360px] rounded-[12px]" />
        <Skeleton className="h-[360px] rounded-[12px]" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.75fr)]">
        <Skeleton className="h-[220px] rounded-[12px]" />
        <Skeleton className="h-[220px] rounded-[12px]" />
      </div>
    </motion.div>
  );
}

function buildMonthlySeries(summary: DashboardSummary) {
  const anchorValues = [
    summary.inventory.availableQuantity,
    summary.inventory.availableQuantity + summary.inventory.reservedQuantity,
    summary.counts.products * 28,
    summary.orders.activeCount * 38,
    summary.counts.customers * 18,
    summary.counts.suppliers * 24,
  ].filter((value) => Number.isFinite(value) && value > 0);

  const base = Math.max(...anchorValues, 120);

  return MONTH_LABELS.map((month, index) => {
    const wave = 0.52 + Math.sin((index + 1) * 0.72) * 0.21 + (index % 3) * 0.045;
    const assets = Math.round(base * wave * 1.35);
    const salary = Math.round(base * (0.23 + ((index + 2) % 4) * 0.035));
    const monthly = Math.round(base * (0.11 + (index % 5) * 0.018));
    const total = assets + salary + monthly;

    return { month, assets, salary, monthly, total };
  });
}

function buildSparklinePoints(values: number[]) {
  const peak = Math.max(...values, 1);

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - (value / peak) * 100;
      return `${x},${y}`;
    })
    .join(' ');
}

function buildOrderSources(statuses: DashboardSummary['orders']['byStatus'], totalOrders: number) {
  const activeStatuses = statuses.filter((status) => status.value > 0).slice(0, ORDER_SOURCE_LABELS.length);
  const fallbackShares = [0.4, 0.3, 0.2, 0.1];

  return ORDER_SOURCE_LABELS.map((label, index) => {
    const statusValue = activeStatuses[index]?.value;
    const value = statusValue ?? Math.max(Math.round(totalOrders * fallbackShares[index]), 0);
    const percent = totalOrders > 0 ? Math.round((value / totalOrders) * 100) : Math.round(fallbackShares[index] * 100);

    return {
      label,
      value,
      percent,
      color: ORDER_SOURCE_TONES[index],
      flex: ORDER_SOURCE_LABELS.length - index,
    };
  });
}

function MetricCard({
  title,
  value,
  subtitle,
  detail,
  trend,
  trendTone,
  icon: Icon,
  sparkline,
  href,
}: MetricCardProps) {
  return (
    <DashboardCard className="flex h-full min-w-0 flex-col p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-slate-200 bg-slate-50 text-slate-500">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[0.98rem] font-semibold text-slate-900">{title}</p>
            <p className="mt-1 truncate text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>

        <div
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
            trendTone === 'positive' ? 'bg-[#eef3ff] text-[#4f6bff]' : 'bg-[#fff1f1] text-[#e35d5d]',
          )}
        >
          {trendTone === 'positive' ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {trend}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[2.15rem] font-bold tracking-[-0.04em] text-slate-950">{value}</p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="flex min-w-0 items-center gap-2 text-sm text-slate-500">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="truncate">{detail}</span>
        </div>
        <Button asChild variant="outline" className="h-9 rounded-[10px] border-slate-200 bg-white px-4 text-xs font-semibold shadow-none">
          <Link to={href}>View Details</Link>
        </Button>
      </div>
    </DashboardCard>
  );
}

function MonthlyExpensesCard({
  summary,
  formatMoney,
}: {
  summary: DashboardSummary;
  formatMoney: (value: number) => string;
}) {
  const series = useMemo(() => buildMonthlySeries(summary), [summary]);
  const peak = Math.max(...series.map((item) => item.total), 1);
  const activePoint = series[4];

  return (
    <DashboardCard className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-[1.1rem] font-semibold text-slate-900">Monthly Expenses</h3>
          <p className="mt-1 text-sm text-slate-400">Track and compare monthly business spending.</p>
        </div>

        <div className="inline-flex rounded-[10px] border border-slate-200 bg-slate-50 p-1">
          {['Monthly', 'Quarterly', 'Annually'].map((label, index) => (
            <button
              key={label}
              type="button"
              className={cn(
                'rounded-[8px] px-3 py-1.5 text-xs font-semibold',
                index === 0 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-[56px_minmax(0,1fr)]">
        <div className="hidden text-right text-sm text-slate-400 md:grid">
          {Y_AXIS_TICKS.slice().reverse().map((tick) => (
            <span key={tick} className="flex h-[56px] items-start justify-end">
              {tick}K
            </span>
          ))}
        </div>

        <div className="relative">
          <div className="absolute inset-x-0 top-2 hidden md:block">
            {Y_AXIS_TICKS.slice(1).map((tick, index) => (
              <div
                key={tick}
                className="absolute left-0 right-0 border-t border-dashed border-slate-200"
                style={{ top: `${index * 25}%` }}
              />
            ))}
          </div>

          <div className="relative grid h-[280px] grid-cols-12 items-end gap-3 rounded-[10px] bg-[linear-gradient(180deg,rgba(79,107,255,0.05),rgba(255,255,255,0.01))] px-1 pb-2 pt-7">
            {series.map((item) => {
              const height = Math.max((item.total / peak) * 100, 14);
              const isActive = item.month === activePoint.month;

              return (
                <div key={item.month} className="relative flex h-full flex-col items-center justify-end">
                  {isActive && (
                    <>
                      <div className="absolute inset-y-2 border-l border-dashed border-[#aac0ff]" />
                      <div className="absolute left-1/2 top-0 z-20 w-[188px] -translate-x-1/2 rounded-[12px] border border-slate-200 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-4 text-slate-500">
                            <span>Assets Expenses</span>
                            <span className="font-semibold text-slate-900">{formatMoney(item.assets)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-500">
                            <span>Salary Expenses</span>
                            <span className="font-semibold text-slate-900">{formatMoney(item.salary)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-500">
                            <span>Monthly Expenses</span>
                            <span className="font-semibold text-slate-900">{formatMoney(item.monthly)}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div
                    className={cn(
                      'relative w-full rounded-t-[10px] border border-[#dbe3ff] bg-gradient-to-b from-[#4f6bff]/22 to-[#4f6bff]/05',
                      isActive && 'border-[#7f98ff] from-[#4f6bff]/40 to-[#4f6bff]/10',
                    )}
                    style={{ height: `${height}%` }}
                  >
                    {isActive && (
                      <div className="absolute left-1/2 top-0 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#4f6bff]" />
                    )}
                  </div>

                  <span className={cn('mt-3 text-sm', isActive ? 'font-semibold text-slate-900' : 'text-slate-400')}>
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

function TotalOrdersCard({
  totalOrders,
  statuses,
}: {
  totalOrders: number;
  statuses: DashboardSummary['orders']['byStatus'];
}) {
  const sources = useMemo(() => buildOrderSources(statuses, totalOrders), [statuses, totalOrders]);

  return (
    <DashboardCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-slate-200 bg-slate-50 text-slate-500">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[1.1rem] font-semibold text-slate-900">Total Orders</h3>
            <p className="mt-1 text-sm text-slate-400">Order distribution by channel.</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 rounded-full bg-[#eef3ff] px-2.5 py-1 text-xs font-semibold text-[#4f6bff]">
          <ArrowUpRight className="h-3.5 w-3.5" />
          12.3%
        </div>
      </div>

      <p className="mt-6 text-[2.35rem] font-bold tracking-[-0.04em] text-slate-950">{totalOrders.toLocaleString()}</p>

      <div className="mt-6 flex gap-2">
        {sources.map((source) => (
          <div
            key={source.label}
            className="h-9 rounded-[8px]"
            style={{
              background: `linear-gradient(180deg, ${source.color}, ${source.color})`,
              flex: source.flex,
            }}
          />
        ))}
        <div className="h-9 w-2 rounded-[8px] bg-slate-300" />
      </div>

      <div className="mt-6 space-y-4">
        {sources.map((source) => (
          <div key={source.label} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: source.color }} />
                <span>{source.label}</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-900">{source.value.toLocaleString()}</span>
                <span className="rounded-full bg-[#eef3ff] px-2 py-0.5 text-xs font-semibold text-[#4f6bff]">
                  {source.percent}%
                </span>
              </div>
            </div>

            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-[#4f6bff]" style={{ width: `${Math.min(source.percent, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="truncate">Track your order channel</span>
        </div>
        <Button asChild variant="outline" className="h-9 rounded-[10px] border-slate-200 bg-white px-4 text-xs font-semibold shadow-none">
          <Link to="/orders">View Details</Link>
        </Button>
      </div>
    </DashboardCard>
  );
}

function CustomerFunnelCard() {
  return (
    <DashboardCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[1.1rem] font-semibold text-slate-900">Customer Funnel Analytics</h3>
          <p className="mt-1 text-sm text-slate-400">Insights into customer journey and conversions.</p>
        </div>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-500"
          aria-label="More customer funnel options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-5">
        {FUNNEL_STEPS.map((step, index) => (
          <div key={step.label} className="relative rounded-[12px] border border-slate-200 bg-white p-4 text-center">
            <p className="text-[1.72rem] font-bold tracking-[-0.04em] text-[#4f6bff]">{step.value}%</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{step.label}</p>

            {index < FUNNEL_STEPS.length - 1 && (
              <div className="pointer-events-none absolute -right-2 top-1/2 hidden h-0.5 w-4 -translate-y-1/2 bg-[#ccd7ff] sm:block" />
            )}
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

function OrderFrequencyCard() {
  return (
    <DashboardCard className="h-full p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[1.1rem] font-semibold text-slate-900">Order Frequency</h3>
          <p className="mt-1 text-sm text-slate-400">This Week</p>
        </div>

        <div className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
          This Week
        </div>
      </div>

      <div className="mt-6 grid grid-cols-[44px_minmax(0,1fr)] gap-3">
        <div className="grid gap-3 pt-1 text-sm text-slate-400">
          {HEATMAP_HOURS.map((hour) => (
            <span key={hour}>{hour}</span>
          ))}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-7 gap-1.5">
            {HEATMAP_VALUES.flatMap((row, rowIndex) =>
              row.map((value, columnIndex) => (
                <div
                  key={`${rowIndex}-${columnIndex}`}
                  className="aspect-square rounded-[6px] border border-slate-100"
                  style={{
                    backgroundColor: `rgba(79, 107, 255, ${0.05 + value * 0.82})`,
                  }}
                />
              )),
            )}
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-slate-400">
            {HEATMAP_DAYS.map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

function DashboardMainColumn({
  summary,
  formatMoney,
  totalSales,
  inventoryValue,
  monthlySeries,
}: {
  summary: DashboardSummary;
  formatMoney: (value: number) => string;
  totalSales: number;
  inventoryValue: number;
  monthlySeries: ReturnType<typeof buildMonthlySeries>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <MetricCard
          title="Total Sales"
          value={formatMoney(totalSales)}
          subtitle="Revenue in focus"
          detail="04 Dec 2025 - 31 Dec 2025"
          trend="12.3%"
          trendTone="positive"
          icon={TrendingUp}
          sparkline={monthlySeries.slice(0, 7).map((item) => item.total)}
          href="/orders"
        />
        <MetricCard
          title="Inventory Values"
          value={formatMoney(inventoryValue)}
          subtitle="Estimated stock value"
          detail={summary.inventory.lowStockCount > 0 ? 'Need Rebalance Inventory' : 'Healthy inventory balance'}
          trend="12.3%"
          trendTone={summary.inventory.lowStockCount > 0 ? 'negative' : 'positive'}
          icon={Boxes}
          sparkline={monthlySeries.slice(2, 9).map((item) => item.assets)}
          href="/inventory"
        />
      </div>

      <MonthlyExpensesCard summary={summary} formatMoney={formatMoney} />
      <CustomerFunnelCard />
    </div>
  );
}

function DashboardSidebarColumn({
  totalOrders,
  statuses,
}: {
  totalOrders: number;
  statuses: DashboardSummary['orders']['byStatus'];
}) {
  return (
    <div className="space-y-4">
      <TotalOrdersCard totalOrders={totalOrders} statuses={statuses} />
      <OrderFrequencyCard />
    </div>
  );
}

export default function DashboardPage() {
  const { formatMoney } = useSettings();
  const dashboardQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
    retry: 1,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const summary = dashboardQuery.data;

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

  const monthlySeries = buildMonthlySeries(summary);
  const totalSales = summary.orders.recent.reduce((sum, order) => sum + order.totalAmount, 0);
  const inventoryValue = summary.inventory.availableQuantity * 18 + summary.inventory.reservedQuantity * 11;
  const totalOrders = summary.orders.byStatus.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="animate-fade-in">
      <div className="font-['Inter']">
        <div className="mb-5">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-[4px] bg-[#4f6bff]" />
            <h1 className="text-[1.9rem] font-semibold tracking-[-0.04em] text-slate-950">Overview</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">Key metrics of business performance.</p>
        </div>

        <div className="xl:hidden">
          <div className="space-y-4">
            <DashboardMainColumn
              summary={summary}
              formatMoney={formatMoney}
              totalSales={totalSales}
              inventoryValue={inventoryValue}
              monthlySeries={monthlySeries}
            />
            <DashboardSidebarColumn totalOrders={totalOrders} statuses={summary.orders.byStatus ?? []} />
          </div>
        </div>

        <div className="hidden xl:block">
          <PanelGroup autoSaveId="dashboard-overview-split" direction="horizontal" className="min-h-[900px]">
            <Panel defaultSize={70} minSize={56} className="pr-2">
              <DashboardMainColumn
                summary={summary}
                formatMoney={formatMoney}
                totalSales={totalSales}
                inventoryValue={inventoryValue}
                monthlySeries={monthlySeries}
              />
            </Panel>

            <PanelResizeHandle className="group mx-1 flex w-2 items-stretch justify-center">
              <div className="w-px rounded-full bg-slate-200 transition-colors group-hover:bg-[#4f6bff] group-data-[dragging=true]:bg-[#4f6bff]" />
            </PanelResizeHandle>

            <Panel defaultSize={30} minSize={24} maxSize={44} className="pl-2">
              <DashboardSidebarColumn totalOrders={totalOrders} statuses={summary.orders.byStatus ?? []} />
            </Panel>
          </PanelGroup>
        </div>
      </div>
    </div>
  );
}
