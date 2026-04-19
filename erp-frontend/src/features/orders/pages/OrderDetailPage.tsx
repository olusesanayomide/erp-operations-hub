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
import { getOrderById, getWarehouseById, listCustomers, listWarehouses, updateOrderStatus } from '@/shared/lib/erp-api';
import { useSettings } from '@/app/providers/SettingsContext';

export default function OrderDetailPage() {
  const { id } = useParams();
  const { canPerform } = useAuth();
  const { formatMoney } = useSettings();
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', id] });
      toast.success(`Order ${status.toLowerCase()}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

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
        <StatusBadge status={order.status} className="text-sm px-3 py-1" />
        {order.status === 'draft' && canPerform('orders.confirm') && (
          <AlertDialog>
            <AlertDialogTrigger asChild><Button requiresOnline><CheckCircle className="h-4 w-4 mr-2" />Confirm Order</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm this order?</AlertDialogTitle>
                <AlertDialogDescription>
                  <span className="flex items-start gap-2 text-warning"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />This will reserve stock from {warehouse?.name}. Stock leaves inventory history only when the order is marked shipped.</span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => updateStatusMutation.mutate('CONFIRMED')}>Confirm</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {order.status === 'confirmed' && canPerform('orders.pick') && (
          <Button requiresOnline onClick={() => updateStatusMutation.mutate('PICKED')} variant="default"><CheckCircle className="h-4 w-4 mr-2" />Mark Picked</Button>
        )}
        {order.status === 'picked' && canPerform('orders.ship') && (
          <Button requiresOnline onClick={() => updateStatusMutation.mutate('SHIPPED')} variant="default"><CheckCircle className="h-4 w-4 mr-2" />Mark Shipped</Button>
        )}
        {order.status === 'shipped' && canPerform('orders.deliver') && (
          <Button requiresOnline onClick={() => updateStatusMutation.mutate('DELIVERED')} variant="default"><CheckCircle className="h-4 w-4 mr-2" />Mark Delivered</Button>
        )}
        {(order.status === 'draft' || order.status === 'confirmed' || order.status === 'picked') && canPerform('orders.cancel') && (
          <AlertDialog>
            <AlertDialogTrigger asChild><Button requiresOnline variant="destructive"><XCircle className="h-4 w-4 mr-2" />Cancel</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                <AlertDialogDescription>This action is irreversible. Any reserved stock will be released for confirmed or picked orders.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Order</AlertDialogCancel>
                <AlertDialogAction onClick={() => updateStatusMutation.mutate('CANCELLED')} className="bg-destructive hover:bg-destructive/90">Cancel Order</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </PageHeader>

      <div className="erp-card p-5">
        <div className="flex items-center gap-8">
          {statusTimeline.map((step, i) => (
            <div key={step.label} className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${step.done ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}`}>
                {i + 1}
              </div>
              <div>
                <p className={`text-sm font-medium ${step.done ? '' : 'text-muted-foreground'}`}>{step.label}</p>
                {step.date && <p className="text-xs text-muted-foreground">{step.date}</p>}
              </div>
              {i < statusTimeline.length - 1 && <div className={`h-0.5 w-12 ${step.done ? 'bg-success' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="erp-card p-5">
          <p className="text-sm text-muted-foreground mb-1">Customer</p>
          <Link to={`/customers/${customer?.id}`} className="font-semibold text-primary hover:underline">{customer?.name}</Link>
          <p className="text-xs text-muted-foreground mt-1">{customer?.email}</p>
        </div>
        <div className="erp-card p-5">
          <p className="text-sm text-muted-foreground mb-1">Warehouse</p>
          <p className="font-semibold">{warehouse?.name}</p>
          <p className="text-xs text-muted-foreground mt-1">{warehouse?.location}</p>
        </div>
        <div className="erp-card p-5">
          <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
          <p className="text-2xl font-bold">{formatMoney(order.totalAmount)}</p>
        </div>
      </div>

      <div className="erp-card p-5">
        <h3 className="erp-section-title">Line Items</h3>
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
    </div>
  );
}

