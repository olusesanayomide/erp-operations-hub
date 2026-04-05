import type { LucideIcon } from 'lucide-react';
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
  warning: 'text-warning bg-warning/10',
  success: 'text-success bg-success/10',
  destructive: 'text-destructive bg-destructive/10',
};

export function KPICard({ title, value, icon: Icon, description, trend, variant = 'default', className }: KPICardProps) {
  return (
    <div className={cn('erp-kpi-card animate-fade-in', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
        <div className={cn('p-2.5 rounded-lg', variantStyles[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {(description || trend) && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          {trend && (
            <span className={cn('font-medium', trend.value >= 0 ? 'text-success' : 'text-destructive')}>
              {trend.value >= 0 ? '+' : ''}{trend.value}%
            </span>
          )}
          {description && <span className="text-muted-foreground">{description}</span>}
        </div>
      )}
    </div>
  );
}

