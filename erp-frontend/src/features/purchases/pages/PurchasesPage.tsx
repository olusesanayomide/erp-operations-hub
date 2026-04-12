import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, EmptyState, ErrorState, RetryButton, TableSkeleton } from '@/shared/components/PageComponents';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { useAuth } from '@/app/providers/AuthContext';
import { useSettings } from '@/app/providers/SettingsContext';
import { Plus, Search, Truck } from 'lucide-react';
import { listPurchases, listSuppliers, listWarehouses } from '@/shared/lib/erp-api';

export default function PurchasesPage() {
  const { canPerform } = useAuth();
  const { formatMoney } = useSettings();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: purchases = [], isLoading: isPurchasesLoading, isError: isPurchasesError, error: purchasesError, refetch: refetchPurchases } = useQuery({
    queryKey: ['purchases'],
    queryFn: listPurchases,
  });

  const { data: suppliers = [], isLoading: isSuppliersLoading, isError: isSuppliersError, error: suppliersError, refetch: refetchSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: listSuppliers,
  });

  const { data: warehouses = [], isLoading: isWarehousesLoading, isError: isWarehousesError, error: warehousesError, refetch: refetchWarehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: listWarehouses,
  });
  const isLoading = isPurchasesLoading || isSuppliersLoading || isWarehousesLoading;
  const isError = isPurchasesError || isSuppliersError || isWarehousesError;
  const loadError = (purchasesError || suppliersError || warehousesError) as Error | null;

  const filtered = purchases.filter((purchase) => {
    const supplier = purchase.supplier || suppliers.find((item) => item.id === purchase.supplierId);
    const matchSearch =
      !search ||
      purchase.purchaseNumber.toLowerCase().includes(search.toLowerCase()) ||
      supplier?.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || purchase.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="animate-fade-in">
      <PageHeader title="Purchases" description={`${purchases.length} purchase orders`}>
        {canPerform('purchases.create') && (
          <Link to="/purchases/new"><Button><Plus className="h-4 w-4 mr-2" />New Purchase Order</Button></Link>
        )}
      </PageHeader>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search purchases..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="erp-table-header">
              <th className="text-left p-3">PO #</th>
              <th className="text-left p-3">Supplier</th>
              <th className="text-left p-3">Warehouse</th>
              <th className="text-right p-3">Items</th>
              <th className="text-right p-3">Total</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Date</th>
            </tr></thead>
            <tbody>
              {filtered.map((purchase) => {
                const supplier = purchase.supplier || suppliers.find((item) => item.id === purchase.supplierId);
                const warehouse = purchase.warehouse || warehouses.find((item) => item.id === purchase.warehouseId);
                return (
                  <tr key={purchase.id} className="erp-table-row">
                    <td className="p-3"><Link to={`/purchases/${purchase.id}`} className="font-medium text-primary hover:underline text-sm">{purchase.purchaseNumber}</Link></td>
                    <td className="p-3 text-sm">{supplier?.name}</td>
                    <td className="p-3 text-sm text-muted-foreground">{warehouse?.name}</td>
                    <td className="p-3 text-sm text-right">{purchase.items.length}</td>
                    <td className="p-3 text-sm text-right font-medium">{formatMoney(purchase.totalAmount)}</td>
                    <td className="p-3"><StatusBadge status={purchase.status} /></td>
                    <td className="p-3 text-sm text-muted-foreground">{purchase.createdAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {isLoading && <div className="p-6"><TableSkeleton rows={6} cols={7} /></div>}
        {isError && (
          <ErrorState
            title="Unable to load purchases"
            description={loadError?.message || 'Purchase records and related reference data could not be loaded right now.'}
            action={<RetryButton onClick={() => { void refetchPurchases(); void refetchSuppliers(); void refetchWarehouses(); }} />}
          />
        )}
        {!isLoading && !isError && filtered.length === 0 && <EmptyState icon={Truck} title="No purchases found" description="Create a purchase order" />}
      </div>
    </div>
  );
}

