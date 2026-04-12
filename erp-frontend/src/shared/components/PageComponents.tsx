import { Skeleton } from '@/shared/ui/skeleton';
import { Button } from '@/shared/ui/button';
import { AlertTriangle, Package } from 'lucide-react';

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, description, icon: Icon = Package, action }: {
  title: string;
  description: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="p-4 rounded-full bg-muted mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  icon: Icon = AlertTriangle,
  action,
}: {
  title: string;
  description: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="mb-4 rounded-full bg-destructive/10 p-4">
        <Icon className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">{title}</h3>
      <p className="mb-4 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export function RetryButton({
  onClick,
  label = 'Try Again',
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button variant="outline" onClick={onClick}>
      {label}
    </Button>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-9 w-24" />
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <div className="rounded-xl border p-5">
        <TableSkeleton rows={5} cols={4} />
      </div>
    </div>
  );
}

export function PageHeader({ title, description, children }: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="erp-page-header">
      <div>
        <h1 className="erp-page-title">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2 mt-3 sm:mt-0">{children}</div>}
    </div>
  );
}

