import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { Skeleton } from '@/shared/ui/skeleton';
import { motion, useReducedMotion } from 'framer-motion';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/products': 'Products',
  '/inventory': 'Inventory',
  '/orders': 'Orders',
  '/purchases': 'Purchases',
  '/customers': 'Customers',
  '/suppliers': 'Suppliers',
  '/warehouses': 'Warehouses',
  '/users': 'Users',
  '/admin/tenants': 'Tenant Administration',
  '/settings': 'Settings',
};

function getTitle(pathname: string) {
  const match = Object.entries(pageTitles).find(([path]) => pathname.startsWith(path));
  return match ? match[1] : 'Manifest';
}

function AppContentFallback() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="space-y-6"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </motion.div>
  );
}

export function AppLayout() {
  const location = useLocation();
  const title = getTitle(location.pathname);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader title={title} />
        <main className="flex-1 overflow-auto p-6 bg-background">
          <Suspense fallback={<AppContentFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
