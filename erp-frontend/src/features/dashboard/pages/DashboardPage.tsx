import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/app/providers/AuthContext';
import { useSettings } from '@/app/providers/SettingsContext';
import { KPICard } from '@/shared/components/KPICard';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { getStockStatus } from '@/shared/types/erp';
import { Link } from 'react-router-dom';
import {
  Package, Boxes, AlertTriangle, ShoppingCart, Truck, Users,
  Factory, Warehouse, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { listCustomers, listInventory, listOrders, listProducts, listPurchases, listSuppliers, listWarehouses } from '@/shared/lib/erp-api';

const CHART_COLORS = [
  'hsl(220,14%,80%)',
  'hsl(210,80%,52%)',
  'hsl(220,14%,65%)',
  'hsl(38,92%,50%)',
  'hsl(152,60%,40%)',
  'hsl(0,72%,51%)',
];

function DashboardSkeleton() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="space-y-6"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="erp-card p-5 lg:col-span-2">
          <Skeleton className="mb-5 h-5 w-44" />
          <Skeleton className="h-60 w-full rounded-xl" />
        </div>
        <div className="erp-card p-5">
          <Skeleton className="mb-5 h-5 w-32" />
          <Skeleton className="mx-auto h-52 w-52 rounded-full" />
        </div>
      </div>

      <div className="erp-card p-5">
        <Skeleton className="mb-5 h-5 w-32" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="erp-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-14" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((__, rowIndex) => (
                <div
                  key={rowIndex}
                  className="flex items-center justify-between rounded-lg bg-muted/20 p-3"
                >
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className="space-y-2 text-right">
                    <Skeleton className="ml-auto h-4 w-16" />
                    <Skeleton className="ml-auto h-5 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { canPerform } = useAuth();
  const { formatMoney } = useSettings();

  const productsQuery = useQuery({ queryKey: ['products', 'normalized'], queryFn: listProducts });
  const inventoryQuery = useQuery({ queryKey: ['inventory'], queryFn: listInventory });
  const ordersQuery = useQuery({ queryKey: ['orders'], queryFn: listOrders });
  const purchasesQuery = useQuery({ queryKey: ['purchases'], queryFn: listPurchases });
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: listCustomers });
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: listSuppliers });
  const warehousesQuery = useQuery({ queryKey: ['warehouses'], queryFn: listWarehouses });

  const products = productsQuery.data ?? [];
  const inventory = inventoryQuery.data ?? [];
  const orders = ordersQuery.data ?? [];
  const purchases = purchasesQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const suppliers = suppliersQuery.data ?? [];
  const warehouses = warehousesQuery.data ?? [];

  const queries = [
    productsQuery,
    inventoryQuery,
    ordersQuery,
    purchasesQuery,
    customersQuery,
    suppliersQuery,
    warehousesQuery,
  ];

  const isDashboardLoading = queries.some((query) => query.isLoading);
  const hasLoadedDashboardData = queries.some((query) => query.data !== undefined);

  const lowStockItems = inventory.filter((item) => {
    const status = getStockStatus(item.quantity, item.minStock);
    return status === 'low-stock' || status === 'out-of-stock';
  });

  const totalAvailableInventoryQty = inventory.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const totalReservedInventoryQty = inventory.reduce(
    (sum, item) => sum + item.reservedQuantity,
    0,
  );
  const activeOrders = orders.filter((order) =>
    ['draft', 'confirmed', 'picked', 'shipped'].includes(order.status),
  ).length;
  const draftPurchases = purchases.filter((purchase) => purchase.status === 'draft').length;

  const ordersByStatus = [
    { name: 'Draft', value: orders.filter((order) => order.status === 'draft').length },
    { name: 'Confirmed', value: orders.filter((order) => order.status === 'confirmed').length },
    { name: 'Picked', value: orders.filter((order) => order.status === 'picked').length },
    { name: 'Shipped', value: orders.filter((order) => order.status === 'shipped').length },
    { name: 'Delivered', value: orders.filter((order) => order.status === 'delivered').length },
    { name: 'Cancelled', value: orders.filter((order) => order.status === 'cancelled').length },
  ];

  const stockTrend = useMemo(() => {
    const recentPurchases = purchases.slice(0, 6).map((purchase) => ({
      month: purchase.createdAt.slice(5, 7),
      in: purchase.totalAmount,
      out: 0,
    }));
    const recentOrders = orders.slice(0, 6).map((order) => ({
      month: order.createdAt.slice(5, 7),
      in: 0,
      out: order.totalAmount,
    }));
    const combined = [...recentPurchases, ...recentOrders];
    if (combined.length === 0) {
      return [
        { month: '01', in: 0, out: 0 },
        { month: '02', in: 0, out: 0 },
      ];
    }
    return combined;
  }, [orders, purchases]);

  const quickActions = [
    { label: 'New Order', icon: ShoppingCart, path: '/orders/new', perm: 'orders.create' },
    { label: 'New Purchase', icon: Truck, path: '/purchases/new', perm: 'purchases.create' },
    { label: 'Stock In', icon: ArrowDownRight, path: '/inventory', perm: 'inventory.stock-in' },
    { label: 'Stock Out', icon: ArrowUpRight, path: '/inventory', perm: 'inventory.stock-out' },
    { label: 'Add Customer', icon: Users, path: '/customers', perm: 'customers.create' },
    { label: 'Add Supplier', icon: Factory, path: '/suppliers', perm: 'suppliers.create' },
    { label: 'Add Warehouse', icon: Warehouse, path: '/warehouses', perm: 'warehouses.create' },
  ].filter((action) => canPerform(action.perm));

  if (isDashboardLoading && !hasLoadedDashboardData) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Total Products" value={products.length} icon={Package} />
        <KPICard title="Available Inventory" value={totalAvailableInventoryQty.toLocaleString()} icon={Boxes} />
        <KPICard title="Reserved Inventory" value={totalReservedInventoryQty.toLocaleString()} icon={Boxes} />
        <KPICard title="Low Stock Items" value={lowStockItems.length} icon={AlertTriangle} variant={lowStockItems.length > 0 ? 'warning' : 'default'} />
        <KPICard title="Active Orders" value={activeOrders} icon={ShoppingCart} />
        <KPICard title="Draft Purchases" value={draftPurchases} icon={Truck} variant={draftPurchases > 0 ? 'warning' : 'default'} />
        <KPICard title="Customers" value={customers.length} icon={Users} />
        <KPICard title="Suppliers" value={suppliers.length} icon={Factory} />
        <KPICard title="Warehouses" value={warehouses.length} icon={Warehouse} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="erp-card p-5 lg:col-span-2">
          <h3 className="erp-section-title">Order vs Purchase Value</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stockTrend}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} className="text-xs" />
              <YAxis axisLine={false} tickLine={false} className="text-xs" />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220,13%,91%)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              <Bar dataKey="in" name="Purchases" fill="hsl(152,60%,40%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="out" name="Orders" fill="hsl(0,72%,51%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="erp-card p-5">
          <h3 className="erp-section-title">Orders by Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={ordersByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                {ordersByStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {ordersByStatus.map((status, i) => (
              <div key={status.name} className="flex items-center gap-1.5 text-xs">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                <span className="text-muted-foreground">{status.name} ({status.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {quickActions.length > 0 && (
        <div className="erp-card p-5">
          <h3 className="erp-section-title">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Link key={action.label} to={action.path}>
                <Button variant="outline" className="w-full h-auto py-3 flex-col gap-2 hover:bg-muted/50">
                  <action.icon className="h-5 w-5 text-primary" />
                  <span className="text-xs font-medium">{action.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="erp-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">Low Stock Alerts</h3>
            <Link to="/inventory" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {lowStockItems.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">{item.product?.name}</p>
                  <p className="text-xs text-muted-foreground">{item.warehouse?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{item.quantity} / {item.minStock}</p>
                  <StatusBadge status={getStockStatus(item.quantity, item.minStock)} />
                </div>
              </div>
            ))}
            {lowStockItems.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">All items are well stocked</p>}
          </div>
        </div>

        <div className="erp-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">Recent Orders</h3>
            <Link to="/orders" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {orders.slice(0, 5).map((order) => (
              <Link key={order.id} to={`/orders/${order.id}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">{order.customer?.name || customers.find((customer) => customer.id === order.customerId)?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatMoney(order.totalAmount)}</p>
                  <StatusBadge status={order.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

