import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStockStatus } from '@/shared/types/erp';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { PageHeader, EmptyState, DetailPageSkeleton, ErrorState, RetryButton, TableSkeleton } from '@/shared/components/PageComponents';
import { PaginationControls } from '@/shared/components/PaginationControls';
import { Button } from '@/shared/ui/button';
import { ArrowLeft, Warehouse, MapPin, AlertTriangle } from 'lucide-react';
import { getWarehouseById, getWarehouseInventory } from '@/shared/lib/erp-api';

const WAREHOUSE_INVENTORY_PAGE_SIZE = 25;

export default function WarehouseDetailPage() {
  const { id } = useParams();
  const [inventoryPage, setInventoryPage] = useState(1);
  const warehouseQuery = useQuery({
    queryKey: ['warehouses', id],
    queryFn: () => getWarehouseById(id || ''),
    enabled: !!id,
    staleTime: 30_000,
  });
  const inventoryQuery = useQuery({
    queryKey: ['warehouses', id, 'inventory', inventoryPage, WAREHOUSE_INVENTORY_PAGE_SIZE],
    queryFn: () =>
      getWarehouseInventory(id || '', {
        page: inventoryPage,
        pageSize: WAREHOUSE_INVENTORY_PAGE_SIZE,
      }),
    enabled: !!id,
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
  });
  const warehouse = warehouseQuery.data?.warehouse;
  const inventory = inventoryQuery.data?.items ?? [];
  const inventoryMeta = inventoryQuery.data?.meta;
  const inventoryTotals = inventoryQuery.data?.totals ?? {
    availableQuantity: 0,
    reservedQuantity: 0,
    onHandQuantity: 0,
  };
  const shouldShowWarehouseError =
    warehouseQuery.isError && !warehouseQuery.data;
  const shouldShowWarehouseRefreshWarning =
    warehouseQuery.isError && Boolean(warehouseQuery.data);
  const shouldShowInventoryError =
    inventoryQuery.isError && !inventoryQuery.data;
  const shouldShowInventoryRefreshWarning =
    inventoryQuery.isError && Boolean(inventoryQuery.data);

  if (warehouseQuery.isLoading) return <DetailPageSkeleton />;
  if (shouldShowWarehouseError) {
    return (
      <ErrorState
        title="Unable to load warehouse"
        description={(warehouseQuery.error as Error).message || 'The requested warehouse could not be loaded right now.'}
        action={<div className="flex gap-2"><RetryButton onClick={() => void warehouseQuery.refetch()} /><Link to="/warehouses"><Button variant="outline">Back</Button></Link></div>}
      />
    );
  }
  if (!warehouse) return <EmptyState icon={Warehouse} title="Warehouse not found" description="" action={<Link to="/warehouses"><Button variant="outline">Back</Button></Link>} />;

  return (
    <div className="animate-fade-in space-y-6">
      <Link to="/warehouses"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
      {shouldShowWarehouseRefreshWarning && (
        <div className="flex flex-col gap-3 rounded-md border border-warning/30 bg-warning/10 p-4 text-sm text-warning-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Warehouse details may be out of date</p>
              <p className="text-muted-foreground">
                {(warehouseQuery.error as Error)?.message || 'The latest warehouse refresh failed. Showing the last loaded details.'}
              </p>
            </div>
          </div>
          <RetryButton onClick={() => void warehouseQuery.refetch()} label="Refresh" />
        </div>
      )}
      <PageHeader title={warehouse.name} description={warehouse.description} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="erp-card p-5 flex items-center gap-3"><MapPin className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Location</p><p className="text-sm font-medium">{warehouse.location}</p></div></div>
        <div className="erp-card p-5"><p className="text-xs text-muted-foreground">Stocked Products</p><p className="text-2xl font-bold">{inventoryMeta?.total ?? warehouse.itemCount}</p></div>
        <div className="erp-card p-5">
          <p className="text-xs text-muted-foreground">Available / Reserved / On Hand</p>
          <p className="text-2xl font-bold">
            {inventoryTotals.availableQuantity.toLocaleString()} / {inventoryTotals.reservedQuantity.toLocaleString()} / {inventoryTotals.onHandQuantity.toLocaleString()}
          </p>
        </div>
      </div>

      {shouldShowInventoryRefreshWarning && (
        <div className="flex flex-col gap-3 rounded-md border border-warning/30 bg-warning/10 p-4 text-sm text-warning-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Warehouse inventory may be out of date</p>
              <p className="text-muted-foreground">
                {(inventoryQuery.error as Error)?.message || 'The latest inventory refresh failed. Showing the last loaded page.'}
              </p>
            </div>
          </div>
          <RetryButton onClick={() => void inventoryQuery.refetch()} label="Refresh" />
        </div>
      )}

      <div className="erp-card overflow-hidden">
        <div className="p-5">
          <h3 className="erp-section-title">Inventory</h3>
        </div>
        {inventoryQuery.isLoading ? (
          <div className="p-6"><TableSkeleton rows={6} cols={7} /></div>
        ) : shouldShowInventoryError ? (
          <ErrorState
            title="Unable to load warehouse inventory"
            description={(inventoryQuery.error as Error).message || 'The warehouse inventory could not be loaded right now.'}
            action={<RetryButton onClick={() => void inventoryQuery.refetch()} />}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
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
                      <td className="p-3"><Link to={`/products/${inv.productId}`} className="text-sm font-medium text-primary hover:underline">{inv.product?.name ?? 'Unknown product'}</Link></td>
                      <td className="p-3 text-sm text-muted-foreground font-mono">{inv.product?.sku ?? 'Unknown SKU'}</td>
                      <td className="p-3 text-sm text-right font-semibold">{inv.quantity}</td>
                      <td className="p-3 text-sm text-right">{inv.reservedQuantity}</td>
                      <td className="p-3 text-sm text-right font-medium">{inv.onHandQuantity}</td>
                      <td className="p-3 text-sm text-right text-muted-foreground">{inv.minStock}</td>
                      <td className="p-3"><StatusBadge status={getStockStatus(inv.quantity, inv.minStock)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {inventory.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No inventory in this warehouse</p>}
            {inventoryMeta && inventoryMeta.total > WAREHOUSE_INVENTORY_PAGE_SIZE && (
              <PaginationControls
                page={inventoryMeta.page}
                pageSize={inventoryMeta.pageSize}
                total={inventoryMeta.total}
                totalPages={inventoryMeta.totalPages}
                isFetching={inventoryQuery.isFetching}
                onPageChange={setInventoryPage}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

