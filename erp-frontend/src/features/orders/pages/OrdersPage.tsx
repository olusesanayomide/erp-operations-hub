import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, EmptyState, ErrorState, RetryButton, TableSkeleton } from '@/shared/components/PageComponents';
import { ReferenceDataWarning } from '@/shared/components/ReferenceDataWarning';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { useAuth } from '@/app/providers/AuthContext';
import { useSettings } from '@/app/providers/SettingsContext';
import { Plus, Search, ShoppingCart } from 'lucide-react';
import { listCustomers, listOrders, listWarehouses } from '@/shared/lib/erp-api';

export default function OrdersPage() {
  const { canPerform } = useAuth();
  const { formatMoney } = useSettings();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: orders = [], isLoading: isOrdersLoading, isError: isOrdersError, error: ordersError, refetch: refetchOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: listOrders,
  });

  const { data: customers = [], isError: isCustomersError } = useQuery({
    queryKey: ['customers'],
    queryFn: listCustomers,
  });

  const { data: warehouses = [], isError: isWarehousesError } = useQuery({
    queryKey: ['warehouses'],
    queryFn: listWarehouses,
  });
  const isReferenceDataError = isCustomersError || isWarehousesError;

  const filtered = orders.filter((order) => {
    const customer = order.customer || customers.find((item) => item.id === order.customerId);
    const matchSearch =
      !search ||
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      customer?.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="animate-fade-in">
      <PageHeader title="Orders" description={`${orders.length} orders`}>
        {canPerform('orders.create') && (
          <Link to="/orders/new"><Button><Plus className="h-4 w-4 mr-2" />New Order</Button></Link>
        )}
      </PageHeader>

      {isReferenceDataError && <ReferenceDataWarning />}

	      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="picked">Picked</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="erp-table-header">
              <th className="text-left p-3">Order #</th>
              <th className="text-left p-3">Customer</th>
              <th className="text-left p-3">Warehouse</th>
              <th className="text-right p-3">Items</th>
              <th className="text-right p-3">Total</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Date</th>
            </tr></thead>
            <tbody>
              {filtered.map((order) => {
                const customer = order.customer || customers.find((item) => item.id === order.customerId);
                const warehouse = order.warehouse || warehouses.find((item) => item.id === order.warehouseId);
                return (
                  <tr key={order.id} className="erp-table-row">
                    <td className="p-3"><Link to={`/orders/${order.id}`} className="font-medium text-primary hover:underline text-sm">{order.orderNumber}</Link></td>
	                    <td className="p-3 text-sm">{customer?.name ?? 'Unknown customer'}</td>
	                    <td className="p-3 text-sm text-muted-foreground">{warehouse?.name ?? 'Unknown warehouse'}</td>
                    <td className="p-3 text-sm text-right">{order.items.length}</td>
                    <td className="p-3 text-sm text-right font-medium">{formatMoney(order.totalAmount)}</td>
                    <td className="p-3"><StatusBadge status={order.status} /></td>
                    <td className="p-3 text-sm text-muted-foreground">{order.createdAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
	        {isOrdersLoading && <div className="p-6"><TableSkeleton rows={6} cols={7} /></div>}
	        {isOrdersError && (
	          <ErrorState
	            title="Unable to load orders"
	            description={(ordersError as Error)?.message || 'Orders could not be loaded right now.'}
	            action={<RetryButton onClick={() => void refetchOrders()} />}
	          />
	        )}
	        {!isOrdersLoading && !isOrdersError && filtered.length === 0 && <EmptyState icon={ShoppingCart} title="No orders found" description="Create your first order" />}
      </div>
    </div>
  );
}

