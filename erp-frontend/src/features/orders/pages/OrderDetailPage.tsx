import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { PageHeader, EmptyState, DetailPageSkeleton, ErrorState, RetryButton } from '@/shared/components/PageComponents';
import { Button } from '@/shared/ui/button';
import { useAuth } from '@/app/providers/AuthContext';
import { ArrowLeft, ShoppingCart, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getOrderById, listCustomers, listWarehouses, updateOrderStatus } from '@/shared/lib/erp-api';
import { useSettings } from '@/app/providers/SettingsContext';

export default function OrderDetailPage() {
  const { id } = useParams();
  const { canPerform } = useAuth();
  const { formatMoney } = useSettings();
  const queryClient = useQueryClient();
  const statusToastRef = useRef<string | number | null>(null);
  const [isConfirmSaleDialogOpen, setIsConfirmSaleDialogOpen] = useState(false);
  const [isCancelSaleDialogOpen, setIsCancelSaleDialogOpen] = useState(false);

  const { data: order, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['orders', id],
    queryFn: () => getOrderById(id || ''),
    enabled: !!id,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: listCustomers,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: listWarehouses,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: 'CONFIRMED' | 'PICKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED') =>
      updateOrderStatus(id || '', status, order?.concurrencyStamp),
    onSuccess: async (_, status) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['orders', id] })
      ]);
      toast.success(`Sale ${status.toLowerCase()}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  useEffect(() => {
    if (updateStatusMutation.isPending) {
      if (!statusToastRef.current) {
        const targetStatus = updateStatusMutation.variables?.toLowerCase();
        statusToastRef.current = toast.loading(
          targetStatus ? `Updating sale to ${targetStatus}...` : 'Updating sale...',
          {
            description: 'Please keep this page open while the sale status is being updated.',
          },
        );
      }
      return;
    }

    if (statusToastRef.current) {
      toast.dismiss(statusToastRef.current);
      statusToastRef.current = null;
    }
  }, [updateStatusMutation.isPending, updateStatusMutation.variables]);

  if (isLoading) return <DetailPageSkeleton />;
  if (isError) return <ErrorState title="Unable to load sale" description={(error as Error).message || 'The requested sale could not be loaded right now.'} action={<div className="flex gap-2"><RetryButton onClick={() => void refetch()} /><Link to="/orders"><Button variant="outline">Back to Sales</Button></Link></div>} />;
  if (!order) return <EmptyState icon={ShoppingCart} title="Sale not found" description="This sale does not exist" action={<Link to="/orders"><Button variant="outline">Back to Sales</Button></Link>} />;

  const customer = order.customer || customers.find((item) => item.id === order.customerId);
  const orderWarehouses = Array.from(
    new Map(
      order.items
        .map((item) => {
          const warehouse = warehouses.find((entry) => entry.id === item.warehouseId);
          return warehouse ? [warehouse.id, warehouse] : null;
        })
        .filter(Boolean) as Array<[string, (typeof warehouses)[number]]>,
    ).values(),
  );
  const warehouseSummary =
    orderWarehouses.length === 0
      ? 'Unknown warehouse'
      : orderWarehouses.length === 1
        ? orderWarehouses[0].name
        : `${orderWarehouses.length} warehouses`;
  const reachedStatuses = {
    confirmed: ['confirmed', 'picked', 'shipped', 'delivered'].includes(order.status),
    picked: ['picked', 'shipped', 'delivered'].includes(order.status),
    shipped: ['shipped', 'delivered'].includes(order.status),
    delivered: order.status === 'delivered',
  };

  const statusTimeline = [
    { label: 'Created', date: order.createdAt, done: true },
    { label: 'Confirmed', date: reachedStatuses.confirmed ? order.confirmedAt : undefined, done: reachedStatuses.confirmed },
    { label: 'Picked', date: reachedStatuses.picked ? order.pickedAt : undefined, done: reachedStatuses.picked },
    { label: 'Shipped', date: reachedStatuses.shipped ? order.shippedAt : undefined, done: reachedStatuses.shipped },
    { label: 'Delivered', date: reachedStatuses.delivered ? order.deliveredAt : undefined, done: reachedStatuses.delivered },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/orders"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
      </div>

      <PageHeader title={order.orderNumber}>
        <StatusBadge status={order.status} className="px-3 py-1 text-sm" />
        {order.status === 'draft' && canPerform('orders.confirm') && (
          <>
            <Button requiresOnline className="w-full sm:w-auto" disabled={updateStatusMutation.isPending} onClick={() => setIsConfirmSaleDialogOpen(true)}><CheckCircle className="h-4 w-4 mr-2" />Confirm Sale</Button>
            <ConfirmDialog
              open={isConfirmSaleDialogOpen}
              onOpenChange={setIsConfirmSaleDialogOpen}
              title="Confirm this sale?"
              description="This will reserve stock for the items in this sale."
              onConfirm={() => updateStatusMutation.mutate('CONFIRMED')}
              isConfirming={updateStatusMutation.isPending}
              confirmLabel="Confirm"
            />
          </>
        )}
        {order.status === 'confirmed' && canPerform('orders.pick') && (
          <Button requiresOnline className="w-full sm:w-auto" disabled={updateStatusMutation.isPending} onClick={() => updateStatusMutation.mutate('PICKED')} variant="default"><CheckCircle className="h-4 w-4 mr-2" />{updateStatusMutation.isPending ? 'Updating...' : 'Mark Picked'}</Button>
        )}
        {order.status === 'picked' && canPerform('orders.ship') && (
          <Button requiresOnline className="w-full sm:w-auto" disabled={updateStatusMutation.isPending} onClick={() => updateStatusMutation.mutate('SHIPPED')} variant="default"><CheckCircle className="h-4 w-4 mr-2" />{updateStatusMutation.isPending ? 'Updating...' : 'Mark Shipped'}</Button>
        )}
        {order.status === 'shipped' && canPerform('orders.deliver') && (
          <Button requiresOnline className="w-full sm:w-auto" disabled={updateStatusMutation.isPending} onClick={() => updateStatusMutation.mutate('DELIVERED')} variant="default"><CheckCircle className="h-4 w-4 mr-2" />{updateStatusMutation.isPending ? 'Updating...' : 'Mark Delivered'}</Button>
        )}
        {(order.status === 'draft' || order.status === 'confirmed' || order.status === 'picked') && canPerform('orders.cancel') && (
          <>
            <Button requiresOnline className="w-full sm:w-auto" disabled={updateStatusMutation.isPending} variant="destructive" onClick={() => setIsCancelSaleDialogOpen(true)}><XCircle className="h-4 w-4 mr-2" />Cancel</Button>
            <ConfirmDialog
              open={isCancelSaleDialogOpen}
              onOpenChange={setIsCancelSaleDialogOpen}
              title="Cancel this sale?"
              description="This can't be undone."
              onConfirm={() => updateStatusMutation.mutate('CANCELLED')}
              isConfirming={updateStatusMutation.isPending}
              confirmLabel="Cancel sale"
              cancelLabel="Keep sale"
              confirmClassName="h-12 rounded-2xl bg-destructive text-base font-semibold text-destructive-foreground hover:bg-destructive/90"
            />
          </>
        )}
      </PageHeader>

      <div className="erp-card p-4 sm:p-5">
        <div className="mb-4">
          <p className="text-sm font-medium text-foreground">Sale lifecycle</p>
          <p className="mt-1 text-sm text-muted-foreground">Draft sales can be adjusted freely. Stock is reserved only after confirmation.</p>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:gap-8">
          {statusTimeline.map((step, i) => (
            <div key={step.label} className="flex items-center gap-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${step.done ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}`}>
                {i + 1}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium ${step.done ? '' : 'text-muted-foreground'}`}>{step.label}</p>
                {step.date && <p className="text-xs text-muted-foreground">{step.date}</p>}
              </div>
              {i < statusTimeline.length - 1 && <div className={`hidden h-0.5 w-10 lg:block ${step.done ? 'bg-success' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="erp-card p-5">
          <p className="mb-1 text-sm text-muted-foreground">Customer</p>
          <Link to={`/customers/${customer?.id}`} className="font-semibold text-primary hover:underline">{customer?.name}</Link>
          <p className="mt-1 text-xs text-muted-foreground">{customer?.email}</p>
        </div>
        <div className="erp-card p-5">
          <p className="mb-1 text-sm text-muted-foreground">Fulfillment Warehouses</p>
          <p className="font-semibold">{warehouseSummary}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {orderWarehouses.length > 1
              ? orderWarehouses.map((warehouse) => warehouse.name).join(', ')
              : orderWarehouses[0]?.location || 'Warehouse assignment is stored per line item.'}
          </p>
        </div>
        <div className="erp-card p-5">
          <p className="mb-1 text-sm text-muted-foreground">Total Amount</p>
          <p className="text-2xl font-bold">{formatMoney(order.totalAmount)}</p>
        </div>
      </div>

      <div className="erp-card p-4 sm:p-5">
        <h3 className="erp-section-title">Line Items</h3>

        <div className="hidden md:block">
          <table className="w-full">
            <thead><tr className="erp-table-header">
              <th className="text-left p-3">Product</th>
              <th className="text-left p-3">Warehouse</th>
              <th className="text-right p-3">Qty</th>
              <th className="text-right p-3">Unit Price</th>
              <th className="text-right p-3">Subtotal</th>
            </tr></thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="erp-table-row">
                  <td className="p-3 text-sm font-medium">{item.product?.name}</td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {warehouses.find((warehouse) => warehouse.id === item.warehouseId)?.name ?? 'Unknown warehouse'}
                  </td>
                  <td className="p-3 text-sm text-right">{item.quantity}</td>
                  <td className="p-3 text-sm text-right">{formatMoney(item.unitPrice)}</td>
                  <td className="p-3 text-sm text-right font-semibold">{formatMoney(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
              <tr className="border-t-2">
                <td colSpan={4} className="p-3 text-sm font-semibold text-right">Total</td>
                <td className="p-3 text-sm font-bold text-right">{formatMoney(order.totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-3 md:hidden">
          {order.items.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.product?.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {warehouses.find((warehouse) => warehouse.id === item.warehouseId)?.name ?? 'Unknown warehouse'}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-foreground">{formatMoney(item.quantity * item.unitPrice)}</p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Qty</p>
                  <p className="mt-1 font-medium text-foreground">{item.quantity}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Unit price</p>
                  <p className="mt-1 font-medium text-foreground">{formatMoney(item.unitPrice)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Subtotal</p>
                  <p className="mt-1 font-medium text-foreground">{formatMoney(item.quantity * item.unitPrice)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
