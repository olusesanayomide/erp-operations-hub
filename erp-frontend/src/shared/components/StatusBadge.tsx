import { cn } from '@/shared/lib/utils';
import type { OrderStatus, PurchaseStatus, StockStatus, TenantStatus } from '@/shared/types/erp';

type BadgeStatus = OrderStatus | PurchaseStatus | StockStatus | TenantStatus | 'inactive';

const statusConfig: Record<string, { label: string; className: string }> = {
  'draft': { label: 'Draft', className: 'status-draft' },
  'confirmed': { label: 'Confirmed', className: 'status-confirmed' },
  'picked': { label: 'Picked', className: 'status-picked' },
  'cancelled': { label: 'Cancelled', className: 'status-cancelled' },
  'shipped': { label: 'Shipped', className: 'status-shipped' },
  'delivered': { label: 'Delivered', className: 'status-delivered' },
  'received': { label: 'Received', className: 'status-received' },
  'pending': { label: 'Pending', className: 'status-pending' },
  'in-stock': { label: 'In Stock', className: 'status-in-stock' },
  'low-stock': { label: 'Low Stock', className: 'status-low-stock' },
  'out-of-stock': { label: 'Out of Stock', className: 'status-out-of-stock' },
  'active': { label: 'Active', className: 'status-in-stock' },
  'suspended': { label: 'Suspended', className: 'status-cancelled' },
  'archived': { label: 'Archived', className: 'status-draft' },
  'inactive': { label: 'Inactive', className: 'status-draft' },
};

export function StatusBadge({ status, className }: { status: BadgeStatus; className?: string }) {
  const config = statusConfig[status] || { label: status, className: 'status-draft' };
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin: 'border border-primary/20 bg-primary text-primary-foreground shadow-sm',
    manager: 'border border-info/20 bg-info/10 text-info',
    staff: 'border border-border bg-muted text-muted-foreground',
  };
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
      colors[role] || colors.staff
    )}>
      {role}
    </span>
  );
}

