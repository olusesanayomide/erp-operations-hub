import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: { value: number; label: string };
  variant?: 'default' | 'warning' | 'success' | 'destructive';
  className?: string;
}

const variantStyles = {
  default: 'text-primary bg-primary/10',
  warning: 'text-warning bg-warning/15',
  success: 'text-success bg-success/10',
  destructive: 'text-destructive bg-destructive/10',
};

export function KPICard({ title, value, icon: Icon, description, trend, variant = 'default', className }: KPICardProps) {
  const TrendIcon = !trend ? null : trend.value > 0 ? ArrowUpRight : trend.value < 0 ? ArrowDownRight : Minus;

  return (
    <div className={cn('erp-kpi-card animate-fade-in', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="text-[1.55rem] font-bold leading-8 tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', variantStyles[variant])}>
          <Icon className="h-4.5 w-4.5" strokeWidth={2} />
        </div>
      </div>
      {(description || trend) && (
        <div className="mt-2 flex min-h-5 items-center gap-2 text-xs">
          {trend && (
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold',
              trend.value > 0 && 'bg-success/10 text-success',
              trend.value < 0 && 'bg-destructive/10 text-destructive',
              trend.value === 0 && 'bg-muted text-slate-600',
            )}>
              {TrendIcon && <TrendIcon className="h-3 w-3" strokeWidth={2} />}
              {trend.value >= 0 ? '+' : ''}{trend.value}%
            </span>
          )}
          {description && <span className="truncate text-slate-500">{description}</span>}
        </div>
      )}
    </div>
  );
}

