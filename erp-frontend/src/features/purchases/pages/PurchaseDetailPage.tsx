import { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { PageHeader, EmptyState, DetailPageSkeleton, ErrorState, RetryButton } from '@/shared/components/PageComponents';
import { Button } from '@/shared/ui/button';
import { useAuth } from '@/app/providers/AuthContext';
import { ArrowLeft, Truck, PackageCheck, CheckCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/shared/ui/alert-dialog';
import {
  getPurchaseById,
  listSuppliers,
  listWarehouses,
  receivePurchase,
  updatePurchaseStatus,
} from '@/shared/lib/erp-api';
import { useSettings } from '@/app/providers/SettingsContext';

export default function PurchaseDetailPage() {
  const { id } = useParams();
  const { canPerform } = useAuth();
  const { formatMoney } = useSettings();
  const queryClient = useQueryClient();
  const receiveToastRef = useRef<string | number | null>(null);
  const statusToastRef = useRef<string | number | null>(null);

  const { data: purchase, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['purchases', id],
    queryFn: () => getPurchaseById(id || ''),
    enabled: !!id,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: listSuppliers,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: listWarehouses,
  });

	  const receiveMutation = useMutation({
	    mutationFn: () => receivePurchase(id || '', purchase?.concurrencyStamp),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['purchases'] }),
        queryClient.invalidateQueries({ queryKey: ['purchases', id] }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
      ]);
      toast.success('Goods received and inventory updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

	  const updateStatusMutation = useMutation({
	    mutationFn: (status: 'CONFIRMED' | 'SHIPPED' | 'CANCELLED') =>
	      updatePurchaseStatus(id || '', status, purchase?.concurrencyStamp),
    onSuccess: async (_, status) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['purchases'] }),
        queryClient.invalidateQueries({ queryKey: ['purchases', id] }),
      ]);
      toast.success(`Purchase order marked ${status.toLowerCase()}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const isBusy = receiveMutation.isPending || updateStatusMutation.isPending;

  useEffect(() => {
    if (receiveMutation.isPending) {
      if (!receiveToastRef.current) {
        receiveToastRef.current = toast.loading('Receiving goods...', {
          description: 'Inventory is being updated. Please keep this page open.',
        });
      }
      return;
    }
    if (receiveToastRef.current) {
      toast.dismiss(receiveToastRef.current);
      receiveToastRef.current = null;
    }
  }, [receiveMutation.isPending]);

  useEffect(() => {
    if (updateStatusMutation.isPending) {
      if (!statusToastRef.current) {
        const targetStatus = updateStatusMutation.variables?.toLowerCase();
        statusToastRef.current = toast.loading(
          targetStatus ? `Updating to ${targetStatus}...` : 'Updating status...',
          { description: 'Please keep this page open.' },
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
  if (isError) return <ErrorState title="Unable to load purchase" description={(error as Error).message || 'The requested purchase order could not be loaded right now.'} action={<div className="flex gap-2"><RetryButton onClick={() => void refetch()} /><Link to="/purchases"><Button variant="outline">Back</Button></Link></div>} />;
  if (!purchase) return <EmptyState icon={Truck} title="Purchase not found" description="This PO does not exist" action={<Link to="/purchases"><Button variant="outline">Back</Button></Link>} />;

  const supplier = purchase.supplier || suppliers.find((item) => item.id === purchase.supplierId);
  const warehouse = purchase.warehouse || warehouses.find((item) => item.id === purchase.warehouseId);

  return (
    <div className="animate-fade-in space-y-6">
      <Link to="/purchases"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>

      <PageHeader title={purchase.purchaseNumber}>
        <StatusBadge status={purchase.status} className="text-sm px-3 py-1" />
        {purchase.status === 'draft' && canPerform('purchases.confirm') && (
          <Button requiresOnline disabled={isBusy} onClick={() => updateStatusMutation.mutate('CONFIRMED')}>
            <CheckCircle className="h-4 w-4 mr-2" />
            {updateStatusMutation.isPending ? 'Confirming...' : 'Confirm PO'}
          </Button>
        )}
        {purchase.status === 'confirmed' && canPerform('purchases.confirm') && (
          <Button requiresOnline variant="outline" disabled={isBusy} onClick={() => updateStatusMutation.mutate('SHIPPED')}>
            <Send className="h-4 w-4 mr-2" />
            {updateStatusMutation.isPending ? 'Updating...' : 'Mark Shipped'}
          </Button>
        )}
        {purchase.status !== 'received' && purchase.status !== 'cancelled' && canPerform('purchases.receive') && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                requiresOnline
                className="bg-success hover:bg-success/90"
                disabled={purchase.status === 'draft' || isBusy}
              >
                <PackageCheck className="h-4 w-4 mr-2" />
                {receiveMutation.isPending ? 'Receiving...' : 'Receive Goods'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Receive goods for {purchase.purchaseNumber}?</AlertDialogTitle>
                <AlertDialogDescription>This will add all items to {warehouse?.name} inventory. Stock levels will be updated immediately.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={receiveMutation.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={receiveMutation.isPending}
                  onClick={() => receiveMutation.mutate()}
                >
                  {receiveMutation.isPending ? 'Receiving...' : 'Confirm Receipt'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="erp-card p-5">
          <p className="text-sm text-muted-foreground mb-1">Supplier</p>
          <Link to={`/suppliers/${supplier?.id}`} className="font-semibold text-primary hover:underline">{supplier?.name}</Link>
          <p className="text-xs text-muted-foreground mt-1">{supplier?.email}</p>
        </div>
        <div className="erp-card p-5">
          <p className="text-sm text-muted-foreground mb-1">Destination Warehouse</p>
          <p className="font-semibold">{warehouse?.name}</p>
          <p className="text-xs text-muted-foreground mt-1">{warehouse?.location}</p>
        </div>
        <div className="erp-card p-5">
          <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
          <p className="text-2xl font-bold">{formatMoney(purchase.totalAmount)}</p>
        </div>
      </div>

      <div className="erp-card p-5">
        <h3 className="erp-section-title">Line Items</h3>
        <table className="w-full">
          <thead><tr className="erp-table-header">
            <th className="text-left p-3">Product</th>
            <th className="text-right p-3">Qty Ordered</th>
            <th className="text-right p-3">Qty Received</th>
            <th className="text-right p-3">Unit Price</th>
            <th className="text-right p-3">Subtotal</th>
          </tr></thead>
          <tbody>
            {purchase.items.map((item) => (
              <tr key={item.id} className="erp-table-row">
                <td className="p-3 text-sm font-medium">{item.product?.name}</td>
                <td className="p-3 text-sm text-right">{item.quantity}</td>
                <td className="p-3 text-sm text-right">{item.receivedQuantity}</td>
                <td className="p-3 text-sm text-right">{formatMoney(item.unitPrice)}</td>
                <td className="p-3 text-sm text-right font-semibold">{formatMoney(item.quantity * item.unitPrice)}</td>
              </tr>
            ))}
            <tr className="border-t-2">
              <td colSpan={4} className="p-3 text-sm font-semibold text-right">Total</td>
              <td className="p-3 text-sm font-bold text-right">{formatMoney(purchase.totalAmount)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

