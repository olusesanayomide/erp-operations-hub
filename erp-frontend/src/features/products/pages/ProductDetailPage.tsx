import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { getStockStatus } from '@/shared/types/erp';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { PageHeader, EmptyState } from '@/shared/components/PageComponents';
import { Button } from '@/shared/ui/button';
import { ArrowLeft, Package } from 'lucide-react';
import { getProductById, getWarehouseById, listOrders, listPurchases } from '@/shared/lib/erp-api';
import { useSettings } from '@/app/providers/SettingsContext';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { formatMoney } = useSettings();
  const { data, isLoading } = useQuery({
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

  const inventoryQueries = useQueries({
    queries: (data?.inventory || []).map((item) => ({
      queryKey: ['warehouses', item.warehouseId],
      queryFn: () => getWarehouseById(item.warehouseId),
    })),
  });

  const inventory = useMemo(
    () =>
      (data?.inventory || []).map((item) => ({
        ...item,
        warehouse: inventoryQueries.find((query) => query.data?.warehouse.id === item.warehouseId)?.data?.warehouse,
      })),
    [data?.inventory, inventoryQueries],
  );

  const product = data?.product;

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading product...</div>;
  if (!product) return <EmptyState icon={Package} title="Product not found" description="This product does not exist" action={<Link to="/products"><Button variant="outline">Back to Products</Button></Link>} />;

  const movements = data?.movements || [];
  const relatedOrders = orders.filter(o => o.items.some(i => i.productId === product.id));
  const relatedPurchases = purchases.filter(p => p.items.some(i => i.productId === product.id));

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/products"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
      </div>

      <PageHeader title={product.name} description={`${product.sku} · ${product.category}`} />

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="erp-card p-5">
          <p className="text-sm text-muted-foreground mb-1">Base Price</p>
          <p className="text-2xl font-bold">{formatMoney(product.basePrice)}</p>
        </div>
        <div className="erp-card p-5">
          <p className="text-sm text-muted-foreground mb-1">Unit</p>
          <p className="text-2xl font-bold capitalize">{product.unit}</p>
        </div>
        <div className="erp-card p-5">
          <p className="text-sm text-muted-foreground mb-1">Description</p>
          <p className="text-sm">{product.description}</p>
        </div>
      </div>

      {/* Inventory by warehouse */}
      <div className="erp-card p-5">
        <h3 className="erp-section-title">Inventory by Warehouse</h3>
        <table className="w-full">
          <thead><tr className="erp-table-header">
            <th className="text-left p-3">Warehouse</th>
            <th className="text-right p-3">Quantity</th>
            <th className="text-right p-3">Min Stock</th>
            <th className="text-left p-3">Status</th>
          </tr></thead>
          <tbody>
            {inventory.map(inv => (
              <tr key={inv.id} className="erp-table-row">
                <td className="p-3 text-sm font-medium">{inv.warehouse?.name}</td>
                <td className="p-3 text-sm text-right font-semibold">{inv.quantity}</td>
                <td className="p-3 text-sm text-right text-muted-foreground">{inv.minStock}</td>
                <td className="p-3"><StatusBadge status={getStockStatus(inv.quantity, inv.minStock)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {inventory.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No inventory records</p>}
      </div>

      {/* Stock movements */}
      <div className="erp-card p-5">
        <h3 className="erp-section-title">Stock Movements</h3>
        <table className="w-full">
          <thead><tr className="erp-table-header">
            <th className="text-left p-3">Date</th>
            <th className="text-left p-3">Type</th>
            <th className="text-right p-3">Qty</th>
            <th className="text-left p-3">Notes</th>
          </tr></thead>
          <tbody>
            {movements.map(m => (
              <tr key={m.id} className="erp-table-row">
                <td className="p-3 text-sm text-muted-foreground">{m.createdAt}</td>
                <td className="p-3 text-sm capitalize">{m.type.replace('-', ' ')}</td>
                <td className={`p-3 text-sm text-right font-semibold ${m.quantity > 0 ? 'text-success' : 'text-destructive'}`}>
                  {m.quantity > 0 ? '+' : ''}{m.quantity}
                </td>
                <td className="p-3 text-sm text-muted-foreground">{m.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {movements.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No movements recorded</p>}
      </div>

      {/* Related orders & purchases */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="erp-card p-5">
          <h3 className="erp-section-title">Related Orders ({relatedOrders.length})</h3>
          {relatedOrders.map(o => (
            <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30">
              <span className="text-sm font-medium">{o.orderNumber}</span>
              <StatusBadge status={o.status} />
            </Link>
          ))}
          {relatedOrders.length === 0 && <p className="text-sm text-muted-foreground">None</p>}
        </div>
        <div className="erp-card p-5">
          <h3 className="erp-section-title">Related Purchases ({relatedPurchases.length})</h3>
          {relatedPurchases.map(p => (
            <Link key={p.id} to={`/purchases/${p.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30">
              <span className="text-sm font-medium">{p.purchaseNumber}</span>
              <StatusBadge status={p.status} />
            </Link>
          ))}
          {relatedPurchases.length === 0 && <p className="text-sm text-muted-foreground">None</p>}
        </div>
      </div>
    </div>
  );
}

