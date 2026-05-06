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

type MetricTrendTone = 'positive' | 'negative' | 'neutral';

type MetricCardProps = {
  title: string;
  value: string;
  subtitle: string;
  detail: string;
  trend: string;
  trendTone: MetricTrendTone;
  icon: typeof TrendingUp;
  href: string;
  detailIcon?: typeof CalendarDays;
};

type DashboardCardProps = {
  children: React.ReactNode;
  className?: string;
};

const ORDER_SOURCE_TONES = ['#4f6bff', '#151821', '#767f91', '#d2d7e2'];
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

function formatDateRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`;
}

function formatAxisTick(value: number) {
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10}K`;
  return `${Math.round(value)}`;
}

function buildAxisTicks(maxValue: number) {
  const safeMax = Math.max(maxValue, 1);
  const roundedMax = Math.ceil(safeMax / 1000) * 1000;
  return [0, roundedMax * 0.25, roundedMax * 0.5, roundedMax * 0.75, roundedMax];
}

function buildOrderSources(statuses: DashboardSummary['orders']['byStatus'], totalOrders: number) {
  const rankedStatuses = [...statuses]
    .sort((left, right) => right.value - left.value)
    .slice(0, 4);

  return rankedStatuses.map((status, index) => {
    const percent = totalOrders > 0 ? Math.round((status.value / totalOrders) * 100) : 0;

    return {
      label: status.name,
      value: status.value,
      percent,
      color: ORDER_SOURCE_TONES[index],
      flex: Math.max(4 - index, 1),
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
  href,
  detailIcon: DetailIcon = CalendarDays,
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
            trendTone === 'neutral' && 'bg-slate-100 text-slate-600',
          )}
        >
          {trendTone === 'positive' && <ArrowUpRight className="h-3.5 w-3.5" />}
          {trendTone === 'negative' && <ArrowDownRight className="h-3.5 w-3.5" />}
          {trend}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[2.15rem] font-bold tracking-[-0.04em] text-slate-950">{value}</p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="flex min-w-0 items-center gap-2 text-sm text-slate-500">
          <DetailIcon className="h-4 w-4 shrink-0" />
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
  const series = useMemo(() => summary.analytics.monthly, [summary]);
  const peak = Math.max(...series.map((item) => Math.max(item.orders, item.purchases)), 1);
  const activePoint = series[4];
  const ticks = buildAxisTicks(peak);

  return (
    <DashboardCard className="p-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-[1.1rem] font-semibold text-slate-900">Monthly Revenue & Spend</h3>
          <p className="mt-1 text-sm text-slate-400">Real monthly order revenue versus purchase spend.</p>
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
          {ticks.slice().reverse().map((tick) => (
            <span key={tick} className="flex h-[56px] items-start justify-end">
              {formatAxisTick(tick)}
            </span>
          ))}
        </div>

        <div className="relative">
          <div className="absolute inset-x-0 top-2 hidden md:block">
            {ticks.slice(1).map((tick, index) => (
              <div
                key={tick}
                className="absolute left-0 right-0 border-t border-dashed border-slate-200"
                style={{ top: `${index * 25}%` }}
              />
            ))}
          </div>

          <div className="relative grid h-[280px] grid-cols-12 items-end gap-3 rounded-[10px] bg-[linear-gradient(180deg,rgba(79,107,255,0.05),rgba(255,255,255,0.01))] px-1 pb-2 pt-7">
            {series.map((item) => {
              const height = Math.max((Math.max(item.orders, item.purchases) / peak) * 100, 14);
              const isActive = item.key === activePoint?.key;

              return (
                <div key={item.key} className="relative flex h-full flex-col items-center justify-end">
                  {isActive && (
                    <>
                      <div className="absolute inset-y-2 border-l border-dashed border-[#aac0ff]" />
                      <div className="absolute left-1/2 top-0 z-20 w-[188px] -translate-x-1/2 rounded-[12px] border border-slate-200 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-4 text-slate-500">
                            <span>Order Revenue</span>
                            <span className="font-semibold text-slate-900">{formatMoney(item.orders)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-500">
                            <span>Purchase Spend</span>
                            <span className="font-semibold text-slate-900">{formatMoney(item.purchases)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-500">
                            <span>Net Flow</span>
                            <span className="font-semibold text-slate-900">{formatMoney(item.net)}</span>
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
                    {item.label}
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
  const leadingSource = sources[0];

  return (
    <DashboardCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[12px] border border-slate-200 bg-slate-50 text-slate-500">
            <ShoppingCart className="h-3.1 w-4" />
          </div>
          <div>
            <h3 className="text-[1.1rem] font-semibold text-slate-900">Total Orders</h3>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 rounded-full bg-[#eef3ff] px-2.5 py-1 text-xs font-semibold text-[#4f6bff]">
          <ArrowUpRight className="h-3.5 w-3.5" />
          {leadingSource ? `${leadingSource.percent}%` : '0%'}
        </div>
      </div>

      <p className="mt-4 text-[2.1rem] font-bold tracking-[-0.04em] text-slate-950">{totalOrders.toLocaleString()}</p>

      <div className="mt-4 flex gap-2">
        {sources.map((source) => (
          <div
            key={source.label}
            className="h-8 rounded-[8px]"
            style={{
              background: `linear-gradient(180deg, ${source.color}, ${source.color})`,
              flex: source.flex,
            }}
          />
        ))}
        <div className="h-8 w-2 rounded-[8px] bg-slate-300" />
      </div>

      <div className="mt-4 space-y-3">
        {sources.map((source) => (
          <div key={source.label} className="space-y-1.5">
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

            <div className="h-1.5 rounded-full bg-slate-100">
              <div className="h-1.5 rounded-full bg-[#4f6bff]" style={{ width: `${Math.min(source.percent, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-[10px] border border-slate-200 bg-slate-50 px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="truncate">Track your order pipeline</span>
        </div>
        <Button asChild variant="outline" className="h-8 rounded-[10px] border-slate-200 bg-white px-4 text-xs font-semibold shadow-none">
          <Link to="/orders">View Details</Link>
        </Button>
      </div>
    </DashboardCard>
  );
}

function CustomerFunnelCard({
  summary,
}: {
  summary: DashboardSummary;
}) {
  const funnelSteps = useMemo(() => summary.analytics.customerFunnel, [summary]);

  return (
    <DashboardCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[1.1rem] font-semibold text-slate-900">Customer Funnel Analytics</h3>
          <p className="mt-1 text-sm text-slate-400">Customer progression from account creation to order execution risk.</p>
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
        {funnelSteps.map((step, index) => (
          <div key={step.label} className="relative rounded-[12px] border border-slate-200 bg-white p-4 text-center">
            <p className="text-[1.72rem] font-bold tracking-[-0.04em] text-[#4f6bff]">{step.value}%</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{step.label}</p>

            {index < funnelSteps.length - 1 && (
              <div className="pointer-events-none absolute -right-2 top-1/2 hidden h-0.5 w-4 -translate-y-1/2 bg-[#ccd7ff] sm:block" />
            )}
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

function OrderFrequencyCard({
  compact = false,
  summary,
}: {
  compact?: boolean;
  summary: DashboardSummary;
}) {
  const values = summary.analytics.orderFrequency.values;
  const hours = summary.analytics.orderFrequency.hours;
  const days = summary.analytics.orderFrequency.days;
  const peak = Math.max(...values.flat(), 1);

  return (
    <DashboardCard className="h-full p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[1.1rem] font-semibold text-slate-900">Order Frequency</h3>
          <p className="mt-1 text-sm text-slate-400">Last 90 days</p>
        </div>

        <div className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
          Last 90 days
        </div>
      </div>

      <div
        className={cn(
          'mt-6 grid gap-3',
          compact ? 'grid-cols-[34px_minmax(0,1fr)]' : 'grid-cols-[44px_minmax(0,1fr)]',
        )}
      >
        <div className={cn('grid pt-1 text-slate-400', compact ? 'gap-2 text-xs' : 'gap-3 text-sm')}>
          {hours.map((hour) => (
            <span key={hour}>{hour}</span>
          ))}
        </div>

        <div className="space-y-3">
          <div className={cn('grid grid-cols-7', compact ? 'gap-1' : 'gap-1.5')}>
            {values.flatMap((row, rowIndex) =>
              row.map((value, columnIndex) => (
                <div
                  key={`${rowIndex}-${columnIndex}`}
                  className={cn('aspect-square border border-slate-100', compact ? 'rounded-[5px]' : 'rounded-[6px]')}
                  style={{
                    backgroundColor: `rgba(79, 107, 255, ${0.05 + (value / peak) * 0.82})`,
                  }}
                />
              )),
            )}
          </div>

          <div className={cn('grid grid-cols-7 text-center text-slate-400', compact ? 'gap-1 text-[11px]' : 'gap-1.5 text-xs')}>
            {days.map((day, index) => (
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
}: {
  summary: DashboardSummary;
  formatMoney: (value: number) => string;
  totalSales: number;
  inventoryValue: number;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <MetricCard
          title="Total Sales"
          value={formatMoney(totalSales)}
          subtitle="Confirmed to delivered revenue"
          detail={`This month: ${formatMoney(summary.analytics.sales.monthRevenue)}`}
          trend={formatDateRange(summary.analytics.sales.periodStart, summary.analytics.sales.periodEnd)}
          trendTone="neutral"
          icon={TrendingUp}
          href="/orders"
          detailIcon={TrendingUp}
        />
        <MetricCard
          title="Inventory Values"
          value={formatMoney(inventoryValue)}
          subtitle="On-hand stock valuation"
          detail={summary.inventory.lowStockCount > 0 ? 'Need Rebalance Inventory' : 'Healthy inventory balance'}
          trend={summary.inventory.lowStockCount > 0 ? `${summary.inventory.lowStockCount} low stock` : 'Healthy'}
          trendTone={summary.inventory.lowStockCount > 0 ? 'negative' : 'neutral'}
          icon={Boxes}
          href="/inventory"
          detailIcon={Boxes}
        />
      </div>

      <MonthlyExpensesCard summary={summary} formatMoney={formatMoney} />
      <CustomerFunnelCard summary={summary} />
    </div>
  );
}

function DashboardSidebarColumn({
  totalOrders,
  statuses,
  summary,
}: {
  totalOrders: number;
  statuses: DashboardSummary['orders']['byStatus'];
  summary: DashboardSummary;
}) {
  return (
    <div className="space-y-4">
      <TotalOrdersCard totalOrders={totalOrders} statuses={statuses} />
      <OrderFrequencyCard compact summary={summary} />
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

  const totalSales = summary.analytics.sales.totalRevenue;
  const inventoryValue = summary.inventory.estimatedValue;
  const totalOrders = summary.orders.byStatus.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="animate-fade-in">
      <div className="font-['Inter']">
        <div className="lg:hidden">
          <div className="space-y-4">
            <DashboardMainColumn
              summary={summary}
              formatMoney={formatMoney}
              totalSales={totalSales}
              inventoryValue={inventoryValue}
            />
            <DashboardSidebarColumn totalOrders={totalOrders} statuses={summary.orders.byStatus ?? []} summary={summary} />
          </div>
        </div>

        <div className="hidden lg:block">
          <PanelGroup autoSaveId="dashboard-overview-split" direction="horizontal" className="min-h-[900px]">
            <Panel defaultSize={70} minSize={56} className="pr-2">
              <DashboardMainColumn
                summary={summary}
                formatMoney={formatMoney}
                totalSales={totalSales}
                inventoryValue={inventoryValue}
              />
            </Panel>

            <PanelResizeHandle className="group mx-1 flex w-2 items-stretch justify-center">
              <div className="w-px rounded-full bg-slate-200 transition-colors group-hover:bg-[#4f6bff] group-data-[dragging=true]:bg-[#4f6bff]" />
            </PanelResizeHandle>

            <Panel defaultSize={30} minSize={24} maxSize={44} className="pl-2">
              <DashboardSidebarColumn totalOrders={totalOrders} statuses={summary.orders.byStatus ?? []} summary={summary} />
            </Panel>
          </PanelGroup>
        </div>
      </div>
    </div>
  );
}
