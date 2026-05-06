import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Package, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/providers/AuthContext';
import { useSettings } from '@/app/providers/SettingsContext';
import { PageHeader, EmptyState, DetailPageSkeleton, ErrorState, RetryButton } from '@/shared/components/PageComponents';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Button } from '@/shared/ui/button';
import { deleteProduct, getProductById, listOrders, listPurchases, listWarehouses } from '@/shared/lib/erp-api';
import { getStockStatus } from '@/shared/types/erp';

export default function ProductDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canPerform } = useAuth();
  const { id } = useParams();
  const { formatMoney } = useSettings();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['products', id],
    queryFn: () => getProductById(id || ''),
    enabled: !!id,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: listOrders,
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases'],
    queryFn: listPurchases,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: listWarehouses,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(result.message);
      navigate('/products');
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  const inventory = useMemo(
    () =>
      (data?.inventory || []).map((item) => ({
        ...item,
        warehouse: warehouses.find((warehouse) => warehouse.id === item.warehouseId),
      })),
    [data?.inventory, warehouses],
  );

  const product = data?.product;

  if (isLoading) return <DetailPageSkeleton />;
  if (isError) {
    return (
      <ErrorState
        title="Unable to load product"
        description={(error as Error).message || 'The requested product could not be loaded right now.'}
        action={<div className="flex gap-2"><RetryButton onClick={() => void refetch()} /><Link to="/products"><Button variant="outline">Back to Products</Button></Link></div>}
      />
    );
  }
  if (!product) return <EmptyState icon={Package} title="Product not found" description="This product does not exist" action={<Link to="/products"><Button variant="outline">Back to Products</Button></Link>} />;

  const movements = data?.movements || [];
  const relatedOrders = orders.filter((order) => order.items.some((item) => item.productId === product.id));
  const relatedPurchases = purchases.filter((purchase) => purchase.items.some((item) => item.productId === product.id));

  function handleRemoveProduct() {
    const confirmed = window.confirm(
      `Remove ${product.name}?\n\nUnused products will be deleted permanently. Products linked to inventory, orders, purchases, or stock movements will be archived instead and removed from the active catalog.`,
    );

    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(product.id);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/products"><Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-4 w-4" />Back</Button></Link>
        {canPerform('products.delete') && !product.isArchived && (
          <Button
            variant="outline"
            size="sm"
            requiresOnline
            disabled={deleteMutation.isPending}
            onClick={handleRemoveProduct}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteMutation.isPending ? 'Removing...' : 'Remove Product'}
          </Button>
        )}
      </div>

      <PageHeader title={product.name} description={`${product.sku} · ${product.category}`} />

      {product.isArchived && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          This product is archived. It remains visible for history and reporting, but it should no longer be used in new transactions.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="erp-card p-5">
          <p className="mb-1 text-sm text-muted-foreground">Base Price</p>
          <p className="text-2xl font-bold">{formatMoney(product.basePrice)}</p>
        </div>
        <div className="erp-card p-5">
          <p className="mb-1 text-sm text-muted-foreground">Unit</p>
          <p className="text-2xl font-bold capitalize">{product.unit}</p>
        </div>
        <div className="erp-card p-5">
          <p className="mb-1 text-sm text-muted-foreground">Min Stock</p>
          <p className="text-2xl font-bold">{product.minStock}</p>
        </div>
        <div className="erp-card p-5">
          <p className="mb-1 text-sm text-muted-foreground">Description</p>
          <p className="text-sm">{product.description}</p>
        </div>
      </div>

      <div className="erp-card p-5">
        <h3 className="erp-section-title">Inventory by Warehouse</h3>
        <table className="w-full">
          <thead><tr className="erp-table-header">
            <th className="p-3 text-left">Warehouse</th>
            <th className="p-3 text-right">Available</th>
            <th className="p-3 text-right">Reserved</th>
            <th className="p-3 text-right">On Hand</th>
            <th className="p-3 text-right">Min Stock</th>
            <th className="p-3 text-left">Status</th>
          </tr></thead>
          <tbody>
            {inventory.map((inv) => (
              <tr key={inv.id} className="erp-table-row">
                <td className="p-3 text-sm font-medium">{inv.warehouse?.name ?? 'Unknown warehouse'}</td>
                <td className="p-3 text-right text-sm font-semibold">{inv.quantity}</td>
                <td className="p-3 text-right text-sm">{inv.reservedQuantity}</td>
                <td className="p-3 text-right text-sm font-medium">{inv.onHandQuantity}</td>
                <td className="p-3 text-right text-sm text-muted-foreground">{inv.minStock}</td>
                <td className="p-3"><StatusBadge status={getStockStatus(inv.quantity, inv.minStock)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {inventory.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No inventory records</p>}
      </div>

      <div className="erp-card p-5">
        <h3 className="erp-section-title">Stock Movements</h3>
        <table className="w-full">
          <thead><tr className="erp-table-header">
            <th className="p-3 text-left">Date</th>
            <th className="p-3 text-left">Type</th>
            <th className="p-3 text-right">Qty</th>
            <th className="p-3 text-left">Notes</th>
          </tr></thead>
          <tbody>
            {movements.map((movement) => (
              <tr key={movement.id} className="erp-table-row">
                <td className="p-3 text-sm text-muted-foreground">{movement.createdAt}</td>
                <td className="p-3 text-sm capitalize">{movement.type.replace('-', ' ')}</td>
                <td className={`p-3 text-right text-sm font-semibold ${movement.quantity > 0 ? 'text-success' : 'text-destructive'}`}>
                  {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                </td>
                <td className="p-3 text-sm text-muted-foreground">{movement.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {movements.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No movements recorded</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="erp-card p-5">
          <h3 className="erp-section-title">Related Orders ({relatedOrders.length})</h3>
          {relatedOrders.map((order) => (
            <Link key={order.id} to={`/orders/${order.id}`} className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/30">
              <span className="text-sm font-medium">{order.orderNumber}</span>
              <StatusBadge status={order.status} />
            </Link>
          ))}
          {relatedOrders.length === 0 && <p className="text-sm text-muted-foreground">None</p>}
        </div>
        <div className="erp-card p-5">
          <h3 className="erp-section-title">Related Purchases ({relatedPurchases.length})</h3>
          {relatedPurchases.map((purchase) => (
            <Link key={purchase.id} to={`/purchases/${purchase.id}`} className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/30">
              <span className="text-sm font-medium">{purchase.purchaseNumber}</span>
              <StatusBadge status={purchase.status} />
            </Link>
          ))}
          {relatedPurchases.length === 0 && <p className="text-sm text-muted-foreground">None</p>}
        </div>
      </div>
    </div>
  );
}
