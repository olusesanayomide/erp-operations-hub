import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/app/providers/AuthContext';
import { useSettings } from '@/app/providers/SettingsContext';
import { KPICard } from '@/shared/components/KPICard';
import { ErrorState, RetryButton } from '@/shared/components/PageComponents';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { Link } from 'react-router-dom';
import {
  Package, Boxes, AlertTriangle, ShoppingCart, Truck, Users,
  Factory, Warehouse, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { BarChart, Bar, CartesianGrid, Legend, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getDashboardSummary } from '@/shared/lib/erp-api';
import type { OrderStatus, StockStatus } from '@/shared/types/erp';

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

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
    retry: 1,
  });

  const summary = dashboardQuery.data;
  const lowStockItems = summary?.inventory.lowStockItems ?? [];
  const ordersByStatus = summary?.orders.byStatus ?? [];
  const stockTrend = summary?.stockTrend ?? [
    { month: '01', in: 0, out: 0 },
    { month: '02', in: 0, out: 0 },
  ];

  const totalOrdersByStatus = ordersByStatus.reduce((total, status) => total + status.value, 0);
  const lowStockCount = summary?.inventory.lowStockCount ?? 0;
  const draftPurchaseCount = summary?.purchases.draftCount ?? 0;

  const quickActions = [
    { label: 'New Order', icon: ShoppingCart, path: '/orders/new', perm: 'orders.create' },
    { label: 'New Purchase', icon: Truck, path: '/purchases/new', perm: 'purchases.create' },
    { label: 'Stock In', icon: ArrowDownRight, path: '/inventory', perm: 'inventory.stock-in' },
    { label: 'Stock Out', icon: ArrowUpRight, path: '/inventory', perm: 'inventory.stock-out' },
    { label: 'Add Customer', icon: Users, path: '/customers', perm: 'customers.create' },
    { label: 'Add Supplier', icon: Factory, path: '/suppliers', perm: 'suppliers.create' },
    { label: 'Add Warehouse', icon: Warehouse, path: '/warehouses', perm: 'warehouses.create' },
  ].filter((action) => canPerform(action.perm));

  if (dashboardQuery.isLoading && !summary) {
    return <DashboardSkeleton />;
  }

  if (dashboardQuery.isError && !summary) {
    return (
      <ErrorState
        title="Dashboard data could not be loaded"
        description={
          dashboardQuery.error instanceof Error
            ? dashboardQuery.error.message
            : 'The dashboard summary request failed. Please try again.'
        }
        action={<RetryButton onClick={() => dashboardQuery.refetch()} />}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KPICard title="Total Products" value={summary?.counts.products ?? 0} icon={Package} trend={summary?.trends.products} description={summary?.trends.products?.label ?? 'catalog'} />
        <KPICard title="Available Inventory" value={(summary?.inventory.availableQuantity ?? 0).toLocaleString()} icon={Boxes} trend={summary?.trends.availableInventory} description={summary?.trends.availableInventory?.label ?? 'sellable'} />
        <KPICard title="Reserved Inventory" value={(summary?.inventory.reservedQuantity ?? 0).toLocaleString()} icon={Boxes} description="committed" />
        <KPICard title="Low Stock Items" value={lowStockCount} icon={AlertTriangle} variant={lowStockCount > 0 ? 'warning' : 'success'} description={lowStockCount > 0 ? 'needs action' : 'healthy'} />
        <KPICard title="Active Orders" value={summary?.orders.activeCount ?? 0} icon={ShoppingCart} trend={summary?.trends.activeOrders} description={summary?.trends.activeOrders?.label ?? 'open flow'} />
        <KPICard title="Draft Purchases" value={draftPurchaseCount} icon={Truck} variant={draftPurchaseCount > 0 ? 'warning' : 'default'} trend={summary?.trends.draftPurchases} description={summary?.trends.draftPurchases?.label ?? 'awaiting action'} />
        <KPICard title="Customers" value={summary?.counts.customers ?? 0} icon={Users} trend={summary?.trends.customers} description={summary?.trends.customers?.label ?? 'accounts'} />
        <KPICard title="Suppliers" value={summary?.counts.suppliers ?? 0} icon={Factory} trend={summary?.trends.suppliers} description={summary?.trends.suppliers?.label ?? 'vendors'} />
        <KPICard title="Warehouses" value={summary?.counts.warehouses ?? 0} icon={Warehouse} trend={summary?.trends.warehouses} description={summary?.trends.warehouses?.label ?? 'locations'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="erp-card p-5 lg:col-span-2">
          <h3 className="erp-section-title">Order vs Purchase Value</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stockTrend} barGap={8} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="hsl(220,28%,89%)" strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(224,18%,22%)', fontSize: 12, fontWeight: 600 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(224,18%,22%)', fontSize: 12, fontWeight: 600 }}
              />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220,13%,91%)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ color: 'hsl(224,18%,22%)', fontSize: 12, fontWeight: 600, paddingBottom: 12 }}
              />
              <Bar dataKey="in" name="Purchases" fill="hsl(152,60%,40%)" radius={[8, 8, 0, 0]} barSize={30} />
              <Bar dataKey="out" name="Orders" fill="hsl(223,100%,61%)" radius={[8, 8, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="erp-card p-5">
          <h3 className="erp-section-title">Orders by Status</h3>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie
                data={ordersByStatus}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={76}
                innerRadius={60}
                paddingAngle={2}
              >
                {ordersByStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-950 text-xl font-bold">
                {totalOrdersByStatus}
              </text>
              <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-500 text-xs font-semibold">
                Total Orders
              </text>
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
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-warning/20 bg-warning/10 p-2.5">
                <div>
                  <p className="text-sm font-medium">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">{item.warehouseName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{item.quantity} / {item.minStock}</p>
                  <StatusBadge status={item.status as StockStatus} />
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
            {(summary?.orders.recent ?? []).map((order) => (
              <Link key={order.id} to={`/orders/${order.id}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">{order.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatMoney(order.totalAmount)}</p>
                  <StatusBadge status={order.status as OrderStatus} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

