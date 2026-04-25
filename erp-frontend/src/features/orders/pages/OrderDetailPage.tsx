import { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { PageHeader, EmptyState, DetailPageSkeleton, ErrorState, RetryButton } from '@/shared/components/PageComponents';
import { Button } from '@/shared/ui/button';
import { useAuth } from '@/app/providers/AuthContext';
import { ArrowLeft, ShoppingCart, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/shared/ui/alert-dialog';
import { getOrderById, listCustomers, listWarehouses, updateOrderStatus } from '@/shared/lib/erp-api';
import { useSettings } from '@/app/providers/SettingsContext';

export default function OrderDetailPage() {
  const { id } = useParams();
  const { canPerform } = useAuth();
  const { formatMoney } = useSettings();
  const queryClient = useQueryClient();
  const statusToastRef = useRef<string | number | null>(null);

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
    onSuccess: (_, status) => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['orders', id] });
      toast.success(`Order ${status.toLowerCase()}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  useEffect(() => {
    if (updateStatusMutation.isPending) {
      if (!statusToastRef.current) {
        const targetStatus = updateStatusMutation.variables?.toLowerCase();
        statusToastRef.current = toast.loading(
          targetStatus ? `Updating order to ${targetStatus}...` : 'Updating order...',
          {
            description: 'Please keep this page open while the order status is being updated.',
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
  if (isError) return <ErrorState title="Unable to load order" description={(error as Error).message || 'The requested order could not be loaded right now.'} action={<div className="flex gap-2"><RetryButton onClick={() => void refetch()} /><Link to="/orders"><Button variant="outline">Back to Orders</Button></Link></div>} />;
  if (!order) return <EmptyState icon={ShoppingCart} title="Order not found" description="This order does not exist" action={<Link to="/orders"><Button variant="outline">Back to Orders</Button></Link>} />;

  const customer = order.customer || customers.find((item) => item.id === order.customerId);
  const warehouse = order.warehouse || warehouses.find((item) => item.id === order.warehouseId);
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
          <AlertDialog>
            <AlertDialogTrigger asChild><Button requiresOnline className="w-full sm:w-auto" disabled={updateStatusMutation.isPending}><CheckCircle className="h-4 w-4 mr-2" />Confirm Order</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm this order?</AlertDialogTitle>
                <AlertDialogDescription>
                  <span className="flex items-start gap-2 text-warning"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />This will reserve stock from {warehouse?.name}. Stock leaves inventory history only when the order is marked shipped.</span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={updateStatusMutation.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction disabled={updateStatusMutation.isPending} onClick={() => updateStatusMutation.mutate('CONFIRMED')}>
                  {updateStatusMutation.isPending ? 'Confirming...' : 'Confirm'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
          <AlertDialog>
            <AlertDialogTrigger asChild><Button requiresOnline className="w-full sm:w-auto" disabled={updateStatusMutation.isPending} variant="destructive"><XCircle className="h-4 w-4 mr-2" />Cancel</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                <AlertDialogDescription>This action is irreversible. Any reserved stock will be released for confirmed or picked orders.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={updateStatusMutation.isPending}>Keep Order</AlertDialogCancel>
                <AlertDialogAction disabled={updateStatusMutation.isPending} onClick={() => updateStatusMutation.mutate('CANCELLED')} className="bg-destructive hover:bg-destructive/90">{updateStatusMutation.isPending ? 'Cancelling...' : 'Cancel Order'}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </PageHeader>

      <div className="erp-card p-4 sm:p-5">
        <div className="mb-4">
          <p className="text-sm font-medium text-foreground">Order lifecycle</p>
          <p className="mt-1 text-sm text-muted-foreground">Draft orders can be adjusted freely. Stock is reserved only after confirmation.</p>
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
          <p className="mb-1 text-sm text-muted-foreground">Warehouse</p>
          <p className="font-semibold">{warehouse?.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{warehouse?.location}</p>
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
              <th className="text-right p-3">Qty</th>
              <th className="text-right p-3">Unit Price</th>
              <th className="text-right p-3">Subtotal</th>
            </tr></thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="erp-table-row">
                  <td className="p-3 text-sm font-medium">{item.product?.name}</td>
                  <td className="p-3 text-sm text-right">{item.quantity}</td>
                  <td className="p-3 text-sm text-right">{formatMoney(item.unitPrice)}</td>
                  <td className="p-3 text-sm text-right font-semibold">{formatMoney(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
              <tr className="border-t-2">
                <td colSpan={3} className="p-3 text-sm font-semibold text-right">Total</td>
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
                  <p className="mt-1 text-xs text-muted-foreground">Qty {item.quantity}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-foreground">{formatMoney(item.quantity * item.unitPrice)}</p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
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
