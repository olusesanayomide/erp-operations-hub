import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { Skeleton } from '@/shared/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { getSystemHealth } from '@/shared/lib/erp-api';
import { motion, useReducedMotion } from 'framer-motion';
import { DatabaseZap, RotateCw, ServerCrash } from 'lucide-react';
import { useOnlineStatus } from '@/shared/lib/online-status';

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
  const isOnline = useOnlineStatus();
  const title = getTitle(location.pathname);
  const healthQuery = useQuery({
    queryKey: ['system-health'],
    queryFn: getSystemHealth,
    refetchInterval: 30000,
    retry: false,
    enabled: isOnline,
  });
  const isApiUnreachable = isOnline && healthQuery.isError;
  const isDatabaseUnavailable = healthQuery.data?.database === 'down';
  const showHealthBanner = isApiUnreachable || isDatabaseUnavailable;
  const healthMessage = isApiUnreachable
    ? 'The ERP API is unreachable. Your session may still be active, but workspace data cannot be loaded right now.'
    : healthQuery.data?.message ||
      'Workspace data is temporarily unavailable. Your session is active, but the database cannot be reached.';

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader title={title} />
        <main className="flex-1 overflow-auto p-6 bg-background">
          {showHealthBanner && (
            <Alert className="mb-5 border-warning/30 bg-warning/10 text-slate-950 [&>svg]:text-warning">
              {isApiUnreachable ? (
                <ServerCrash className="h-4 w-4" />
              ) : (
                <DatabaseZap className="h-4 w-4" />
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <AlertTitle>
                    {isApiUnreachable ? 'Backend unavailable' : 'Workspace data unavailable'}
                  </AlertTitle>
                  <AlertDescription className="text-slate-700">
                    {healthMessage}
                  </AlertDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit border-warning/30 bg-white/70 text-slate-900 hover:bg-white"
                  onClick={() => void healthQuery.refetch()}
                  disabled={healthQuery.isFetching}
                >
                  <RotateCw className="mr-2 h-3.5 w-3.5" />
                  Check again
                </Button>
              </div>
            </Alert>
          )}
          <Suspense fallback={<AppContentFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
