import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  X,
  MoreHorizontal,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import { useSettings } from '@/app/providers/SettingsContext';
import { ErrorState, RetryButton } from '@/shared/components/PageComponents';
import { getDashboardSummary } from '@/shared/lib/erp-api';
import { cn } from '@/shared/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
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

type RevenueRange = 'monthly' | 'quarterly' | 'annually';

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

function buildRevenueSeries(summary: DashboardSummary, range: RevenueRange) {
  const monthly = summary.analytics?.monthly ?? [];

  if (range === 'monthly') {
    return monthly;
  }

  if (range === 'quarterly') {
    const quarters = new Map<
      string,
      {
        key: string;
        label: string;
        orders: number;
        purchases: number;
        net: number;
      }
    >();

    monthly.forEach((item) => {
      const [yearValue, monthValue] = item.key.split('-');
      const year = Number(yearValue);
      const month = Number(monthValue);
      const quarter = Math.floor((month - 1) / 3) + 1;
      const key = `${year}-Q${quarter}`;
      const existing = quarters.get(key);

      if (existing) {
        existing.orders += item.orders;
        existing.purchases += item.purchases;
        existing.net += item.net;
        return;
      }

      quarters.set(key, {
        key,
        label: `Q${quarter}`,
        orders: item.orders,
        purchases: item.purchases,
        net: item.net,
      });
    });

    return Array.from(quarters.values());
  }

  const years = new Map<
    string,
    {
      key: string;
      label: string;
      orders: number;
      purchases: number;
      net: number;
    }
  >();

  monthly.forEach((item) => {
    const year = item.key.slice(0, 4);
    const existing = years.get(year);

    if (existing) {
      existing.orders += item.orders;
      existing.purchases += item.purchases;
      existing.net += item.net;
      return;
    }

    years.set(year, {
      key: year,
      label: year,
      orders: item.orders,
      purchases: item.purchases,
      net: item.net,
    });
  });

  return Array.from(years.values());
}

function getAnalyticsDegradationMessages(summary: DashboardSummary) {
  const messages: string[] = [];

  if (!summary.analytics?.monthly?.length) {
    messages.push('Revenue and spend history is unavailable right now.');
  }

  if (!summary.analytics?.customerFunnel?.length) {
    messages.push('Customer funnel analytics could not be loaded.');
  }

  if (!summary.analytics?.orderFrequency?.values?.length) {
    messages.push('Sales frequency heatmap data is unavailable.');
  }

  return messages;
}

function buildOrderSources(statuses: DashboardSummary['orders']['byStatus'], totalOrders: number) {
  const rankedStatuses = [...(statuses ?? [])]
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

function formatSalesLabel(value: string) {
  return value
    .replace(/\bOrders\b/g, 'Sales')
    .replace(/\bOrder\b/g, 'Sale')
    .replace(/\borders\b/g, 'sales')
    .replace(/\border\b/g, 'sale');
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
    <DashboardCard className="flex h-full min-w-0 flex-col p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-slate-200 bg-slate-50 text-slate-500">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 sm:text-[0.98rem]">{title}</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-400 sm:mt-1 sm:text-xs">{subtitle}</p>
          </div>
        </div>

        <div
          className={cn(
            'inline-flex max-w-[8.5rem] shrink-0 items-center gap-1 truncate rounded-full px-2.5 py-1 text-xs font-semibold sm:max-w-none',
            trendTone === 'positive' ? 'bg-[#eef3ff] text-[#4f6bff]' : 'bg-[#fff1f1] text-[#e35d5d]',
            trendTone === 'neutral' && 'bg-slate-100 text-slate-600',
          )}
        >
          {trendTone === 'positive' && <ArrowUpRight className="h-3.5 w-3.5" />}
          {trendTone === 'negative' && <ArrowDownRight className="h-3.5 w-3.5" />}
          {trend}
        </div>
      </div>

      <div className="mt-4 min-w-0 sm:mt-5">
        <p
          className="overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(1.5rem,7vw,1.95rem)] font-bold tracking-[-0.05em] text-slate-950 sm:text-[clamp(1.85rem,3.1vw,2.15rem)]"
          title={value}
        >
          {value}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3.5 sm:mt-5 sm:pt-4">
        <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500 sm:text-sm">
          <DetailIcon className="h-4 w-4 shrink-0" />
          <span className="truncate" title={detail}>
            {detail}
          </span>
        </div>
        <Button asChild variant="outline" className="h-11 rounded-[10px] border-slate-200 bg-white px-3 text-xs font-semibold shadow-none sm:px-4">
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
  const [range, setRange] = useState<RevenueRange>('monthly');
  const series = useMemo(() => buildRevenueSeries(summary, range), [range, summary]);
  const safeSeries =
    series.length > 0
      ? series
      : [
          {
            key: 'empty',
            label: 'No data',
            orders: 0,
            purchases: 0,
            net: 0,
          },
        ];
  const peak = Math.max(...safeSeries.map((item) => Math.max(item.orders, item.purchases)), 1);
  const activePoint = safeSeries[safeSeries.length - 1];
  const ticks = buildAxisTicks(peak);
  const gridColumnsClass =
    safeSeries.length <= 2 ? 'grid-cols-2' : safeSeries.length <= 4 ? 'grid-cols-4' : 'grid-cols-12';

  return (
    <DashboardCard className="p-3 sm:p-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900 sm:text-[1.1rem]">Monthly Revenue & Spend</h3>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">Real monthly sales revenue versus purchase spend.</p>
        </div>

        <div className="inline-flex w-full rounded-[10px] border border-slate-200 bg-slate-50 p-1 sm:w-auto">
          {[
            { label: 'Monthly', value: 'monthly' as const },
            { label: 'Quarterly', value: 'quarterly' as const },
            { label: 'Annually', value: 'annually' as const },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRange(option.value)}
              className={cn(
                'flex-1 rounded-[8px] px-2.5 py-2 text-xs font-semibold sm:flex-none sm:px-3 sm:py-1.5',
                range === option.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:mt-7 md:grid-cols-[56px_minmax(0,1fr)]">
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

          <div
            className={cn(
              'relative grid h-[240px] items-end gap-2 rounded-[10px] bg-[linear-gradient(180deg,rgba(79,107,255,0.05),rgba(255,255,255,0.01))] px-1 pb-2 pt-5 sm:h-[280px] sm:gap-3 sm:pt-7',
              gridColumnsClass,
            )}
          >
            {safeSeries.map((item) => {
              const height = Math.max((Math.max(item.orders, item.purchases) / peak) * 100, 14);
              const isActive = item.key === activePoint?.key;

              return (
                <div key={item.key} className="relative flex h-full flex-col items-center justify-end">
                  {isActive && (
                    <>
                      <div className="absolute inset-y-2 border-l border-dashed border-[#aac0ff]" />
                      <div className="absolute left-1/2 top-0 z-20 hidden w-[188px] -translate-x-1/2 rounded-[12px] border border-slate-200 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)] sm:block">
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-4 text-slate-500">
                            <span>Sales Revenue</span>
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

                  <span className={cn('mt-2 text-xs sm:mt-3 sm:text-sm', isActive ? 'font-semibold text-slate-900' : 'text-slate-400')}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 sm:hidden">
            <span className="font-semibold text-slate-900">{activePoint?.label ?? 'Current period'}:</span>{' '}
            Sales {formatMoney(activePoint?.orders ?? 0)}, Spend {formatMoney(activePoint?.purchases ?? 0)}, Net{' '}
            {formatMoney(activePoint?.net ?? 0)}
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
    <DashboardCard className="p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[12px] border border-slate-200 bg-slate-50 text-slate-500">
            <ShoppingCart className="h-3.1 w-4" />
          </div>
          <div>
            <h3 className="text-[1.1rem] font-semibold text-slate-900">Total Sales</h3>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 rounded-full bg-[#eef3ff] px-2.5 py-1 text-xs font-semibold text-[#4f6bff]">
          <ArrowUpRight className="h-3.5 w-3.5" />
          {leadingSource ? `${leadingSource.percent}%` : '0%'}
        </div>
      </div>

      <p className="mt-3 text-[1.85rem] font-bold tracking-[-0.04em] text-slate-950 sm:mt-4 sm:text-[2.1rem]">{totalOrders.toLocaleString()}</p>

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
        <div className="flex min-w-0 items-center gap-2 text-xs text-slate-600 sm:text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="truncate">Track your sales pipeline</span>
        </div>
        <Button asChild variant="outline" className="h-11 rounded-[10px] border-slate-200 bg-white px-3 text-xs font-semibold shadow-none sm:px-4">
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
  const funnelSteps = useMemo(
    () =>
      summary.analytics?.customerFunnel?.length
        ? summary.analytics.customerFunnel.map((step) => ({
            ...step,
            label: formatSalesLabel(step.label),
          }))
        : [
            { label: 'Customers Created', count: 0, value: 0 },
            { label: 'Customers With Sales', count: 0, value: 0 },
            { label: 'Customers In Fulfillment', count: 0, value: 0 },
            { label: 'Customers With Delivered Sales', count: 0, value: 0 },
            { label: 'Repeat Buyers', count: 0, value: 0 },
          ],
    [summary],
  );

  return (
    <DashboardCard className="p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 sm:text-[1.1rem]">Customer Funnel Analytics</h3>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">Customer progression from account creation to sales execution risk.</p>
        </div>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-500"
          aria-label="More customer funnel options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 space-y-2.5 sm:hidden">
        {funnelSteps.map((step) => (
          <div key={step.label} className="rounded-[12px] border border-slate-200 bg-white px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {step.label}
                </p>
                <p className="mt-1 text-sm text-slate-500">{step.count.toLocaleString()} customers</p>
              </div>
              <p className="shrink-0 text-xl font-bold tracking-[-0.04em] text-[#4f6bff]">{step.value}%</p>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[#eef3ff]">
              <div className="h-2 rounded-full bg-[#4f6bff]" style={{ width: `${Math.max(Math.min(step.value, 100), 0)}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 hidden gap-3 sm:grid sm:grid-cols-5">
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
  const values = summary.analytics?.orderFrequency?.values ?? [];
  const hours = summary.analytics?.orderFrequency?.hours ?? [];
  const days = summary.analytics?.orderFrequency?.days ?? [];
  const safeValues =
    values.length > 0
      ? values
      : Array.from({ length: 6 }, () => Array.from({ length: 7 }, () => 0));
  const safeHours = hours.length > 0 ? hours : ['9.00', '10.00', '11.00', '12.00', '13.00', '14.00'];
  const safeDays = days.length > 0 ? days : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const peak = Math.max(...safeValues.flat(), 1);
  const hasOrderFrequencyData = values.some((row) => row.some((value) => value > 0));

  return (
    <DashboardCard className="h-full p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 sm:text-[1.1rem]">Sales Frequency</h3>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">Last 90 days</p>
        </div>

        <div className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
          Last 90 days
        </div>
      </div>

      <div
        className={cn(
          'mt-5 grid gap-3 sm:mt-6',
          compact ? 'grid-cols-[34px_minmax(0,1fr)]' : 'grid-cols-[44px_minmax(0,1fr)]',
        )}
      >
        <div className={cn('grid pt-1 text-slate-400', compact ? 'gap-2 text-xs' : 'gap-3 text-sm')}>
          {safeHours.map((hour) => (
            <span key={hour}>{hour}</span>
          ))}
        </div>

        <div className="space-y-3">
          <div className={cn('grid grid-cols-7', compact ? 'gap-1' : 'gap-1.5')}>
            {safeValues.flatMap((row, rowIndex) =>
              row.map((value, columnIndex) => (
                <div
                  key={`${rowIndex}-${columnIndex}`}
                  className={cn(
                    'aspect-square border border-slate-100',
                    compact ? 'rounded-[5px]' : 'rounded-[6px]',
                    !hasOrderFrequencyData && 'border-dashed bg-slate-50',
                  )}
                  style={{
                    backgroundColor: `rgba(79, 107, 255, ${0.05 + (value / peak) * 0.82})`,
                  }}
                />
              )),
            )}
          </div>

          <div className={cn('grid grid-cols-7 text-center text-slate-400', compact ? 'gap-1 text-[11px]' : 'gap-1.5 text-xs')}>
            {safeDays.map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>

          {!hasOrderFrequencyData && (
            <div className="rounded-[10px] border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-500">
              Sales data will appear here once your first order is confirmed.
            </div>
          )}
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
  const monthRevenue = summary.analytics?.sales?.monthRevenue ?? 0;
  const salesPeriodStart = summary.analytics?.sales?.periodStart;
  const salesPeriodEnd = summary.analytics?.sales?.periodEnd;
  const inventoryLowStockCount = summary.inventory?.lowStockCount ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xs:grid-cols-2 lg:grid-cols-2">
        <MetricCard
          title="Total Sales"
          value={formatMoney(totalSales)}
          subtitle="Confirmed to delivered revenue"
          detail={`This month: ${formatMoney(monthRevenue)}`}
          trend={salesPeriodStart && salesPeriodEnd ? formatDateRange(salesPeriodStart, salesPeriodEnd) : 'Current month'}
          trendTone="neutral"
          icon={TrendingUp}
          href="/orders"
          detailIcon={TrendingUp}
        />
        <MetricCard
          title="Inventory Values"
          value={formatMoney(inventoryValue)}
          subtitle="On-hand stock valuation"
          detail={inventoryLowStockCount > 0 ? 'Need Rebalance Inventory' : 'Healthy inventory balance'}
          trend={inventoryLowStockCount > 0 ? `${inventoryLowStockCount} low stock` : 'Healthy'}
          trendTone={inventoryLowStockCount > 0 ? 'negative' : 'neutral'}
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
  const [analyticsWarningDismissed, setAnalyticsWarningDismissed] = useState(false);
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

  const totalSales = summary.analytics?.sales?.totalRevenue ?? 0;
  const inventoryValue = summary.inventory?.estimatedValue ?? 0;
  const totalOrders = (summary.orders?.byStatus ?? []).reduce((sum, item) => sum + item.value, 0);
  const analyticsDegradationMessages = getAnalyticsDegradationMessages(summary);
  const showAnalyticsWarning =
    analyticsDegradationMessages.length > 0 && !analyticsWarningDismissed;

  return (
    <div className="animate-fade-in">
      <div className="font-['Inter']">
        {showAnalyticsWarning && (
          <Alert className="relative mb-4 border-warning/30 bg-warning/10 pr-12 text-slate-950 [&>svg]:text-warning">
            <AlertTriangle className="h-4 w-4" />
            <button
              type="button"
              onClick={() => setAnalyticsWarningDismissed(true)}
              className="absolute right-4 top-4 inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/70 hover:text-slate-900"
              aria-label="Dismiss analytics warning"
            >
              <X className="h-4 w-4" />
            </button>
            <AlertTitle>Dashboard analytics are partially unavailable</AlertTitle>
            <AlertDescription className="text-slate-700">
              {analyticsDegradationMessages.join(' ')}
            </AlertDescription>
          </Alert>
        )}

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
