import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStockStatus } from '@/shared/types/erp';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { PageHeader, EmptyState } from '@/shared/components/PageComponents';
import { Button } from '@/shared/ui/button';
import { ArrowLeft, Warehouse, MapPin } from 'lucide-react';
import { getWarehouseById } from '@/shared/lib/erp-api';

export default function WarehouseDetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['warehouses', id],
    queryFn: () => getWarehouseById(id || ''),
    enabled: !!id,
  });
  const warehouse = data?.warehouse;

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading warehouse...</div>;
  if (!warehouse) return <EmptyState icon={Warehouse} title="Warehouse not found" description="" action={<Link to="/warehouses"><Button variant="outline">Back</Button></Link>} />;

  const inventory = data?.inventory || [];
  const totalAvailableQty = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const totalReservedQty = inventory.reduce((sum, item) => sum + item.reservedQuantity, 0);
  const totalOnHandQty = inventory.reduce((sum, item) => sum + item.onHandQuantity, 0);

  return (
    <div className="animate-fade-in space-y-6">
      <Link to="/warehouses"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
      <PageHeader title={warehouse.name} description={warehouse.description} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="erp-card p-5 flex items-center gap-3"><MapPin className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Location</p><p className="text-sm font-medium">{warehouse.location}</p></div></div>
        <div className="erp-card p-5"><p className="text-xs text-muted-foreground">Stocked Products</p><p className="text-2xl font-bold">{inventory.length}</p></div>
        <div className="erp-card p-5">
          <p className="text-xs text-muted-foreground">Available / Reserved / On Hand</p>
          <p className="text-2xl font-bold">
            {totalAvailableQty.toLocaleString()} / {totalReservedQty.toLocaleString()} / {totalOnHandQty.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="erp-card p-5">
        <h3 className="erp-section-title">Inventory</h3>
        <table className="w-full">
          <thead><tr className="erp-table-header">
            <th className="text-left p-3">Product</th>
            <th className="text-left p-3">SKU</th>
            <th className="text-right p-3">Available</th>
            <th className="text-right p-3">Reserved</th>
            <th className="text-right p-3">On Hand</th>
            <th className="text-right p-3">Min Stock</th>
            <th className="text-left p-3">Status</th>
          </tr></thead>
          <tbody>
            {inventory.map(inv => (
              <tr key={inv.id} className="erp-table-row">
                <td className="p-3"><Link to={`/products/${inv.productId}`} className="text-sm font-medium text-primary hover:underline">{inv.product?.name}</Link></td>
                <td className="p-3 text-sm text-muted-foreground font-mono">{inv.product?.sku}</td>
                <td className="p-3 text-sm text-right font-semibold">{inv.quantity}</td>
                <td className="p-3 text-sm text-right">{inv.reservedQuantity}</td>
                <td className="p-3 text-sm text-right font-medium">{inv.onHandQuantity}</td>
                <td className="p-3 text-sm text-right text-muted-foreground">{inv.minStock}</td>
                <td className="p-3"><StatusBadge status={getStockStatus(inv.quantity, inv.minStock)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {inventory.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No inventory in this warehouse</p>}
      </div>
    </div>
  );
}

