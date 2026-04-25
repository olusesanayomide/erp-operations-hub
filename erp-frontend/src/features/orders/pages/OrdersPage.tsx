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
          <Link to="/orders/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </Link>
        )}
      </PageHeader>

      {isReferenceDataError && <ReferenceDataWarning />}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
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
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="erp-table-header">
                <th className="p-3 text-left">Order #</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Warehouse</th>
                <th className="p-3 text-right">Items</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const customer = order.customer || customers.find((item) => item.id === order.customerId);
                const warehouse = order.warehouse || warehouses.find((item) => item.id === order.warehouseId);

                return (
                  <tr key={order.id} className="erp-table-row">
                    <td className="p-3">
                      <Link to={`/orders/${order.id}`} className="text-sm font-medium text-primary hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="p-3 text-sm">{customer?.name ?? 'Unknown customer'}</td>
                    <td className="p-3 text-sm text-muted-foreground">{warehouse?.name ?? 'Unknown warehouse'}</td>
                    <td className="p-3 text-right text-sm">{order.items.length}</td>
                    <td className="p-3 text-right text-sm font-medium">{formatMoney(order.totalAmount)}</td>
                    <td className="p-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{order.createdAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!isOrdersLoading && !isOrdersError && filtered.length > 0 && (
          <div className="grid gap-3 p-3 md:hidden">
            {filtered.map((order) => {
              const customer = order.customer || customers.find((item) => item.id === order.customerId);
              const warehouse = order.warehouse || warehouses.find((item) => item.id === order.warehouseId);

              return (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary">{order.orderNumber}</p>
                      <p className="mt-1 truncate text-sm text-foreground">{customer?.name ?? 'Unknown customer'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{warehouse?.name ?? 'Unknown warehouse'}</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Items</p>
                      <p className="mt-1 font-medium text-foreground">{order.items.length}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Date</p>
                      <p className="mt-1 font-medium text-foreground">{order.createdAt}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Total</p>
                      <p className="mt-1 text-base font-semibold text-foreground">{formatMoney(order.totalAmount)}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {isOrdersLoading && (
          <div className="p-6">
            <TableSkeleton rows={6} cols={7} />
          </div>
        )}

        {isOrdersError && (
          <ErrorState
            title="Unable to load orders"
            description={(ordersError as Error)?.message || 'Orders could not be loaded right now.'}
            action={<RetryButton onClick={() => void refetchOrders()} />}
          />
        )}

        {!isOrdersLoading && !isOrdersError && filtered.length === 0 && (
          <EmptyState icon={ShoppingCart} title="No orders found" description="Create your first order" />
        )}
      </div>
    </div>
  );
}
