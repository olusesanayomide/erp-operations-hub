import { Component, type ErrorInfo, type ReactNode, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { AuthProvider, useAuth } from "@/app/providers/AuthContext";
import { SettingsProvider } from "@/app/providers/SettingsContext";
import { AppLayout } from "@/shared/layout/AppLayout";
import { Skeleton } from "@/shared/ui/skeleton";
import { LoadingScreen } from "@/shared/components/LoadingMotion";
import { OfflineBanner } from "@/shared/components/OfflineBanner";
import {
  CustomersPage,
  CustomerDetailPage,
  DashboardPage,
  ForgotPasswordPage,
  InventoryPage,
  LandingPage,
  LoginPage,
  NotFound,
  OrderCreatePage,
  OrderDetailPage,
  OrdersPage,
  ProductDetailPage,
  ProductsPage,
  PurchaseCreatePage,
  PurchaseDetailPage,
  PurchasesPage,
  ResetPasswordPage,
  SettingsPage,
  SignupPage,
  SupplierDetailPage,
  SuppliersPage,
  TenantsPage,
  UsersPage,
  WarehouseDetailPage,
  WarehousesPage,
} from "@/app/routeModules";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("Unhandled React render error", {
        error,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_36%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] px-6 py-12 text-slate-950">
        <section className="w-full max-w-lg rounded-[32px] border border-white/80 bg-white/90 p-8 text-center shadow-[0_24px_60px_rgba(59,107,255,0.16)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-600">
            Application Error
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Something went wrong.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Something went wrong. Reload or return to dashboard.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800"
            >
              Reload
            </button>
            <a
              href="/dashboard"
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
            >
              Return to dashboard
            </a>
          </div>
        </section>
      </div>
    );
  }
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, authStatusMessage, authError } = useAuth();
  if (isLoading) {
    return (
      <LoadingScreen message={authStatusMessage || 'Restoring your session...'} />
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ authError }} />;
  return <>{children}</>;
}

function PlatformAdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, isPlatformAdmin, authStatusMessage, authError } = useAuth();

  if (isLoading) {
    return (
      <LoadingScreen message={authStatusMessage || 'Restoring your session...'} />
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace state={{ authError }} />;
  if (!isPlatformAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="mx-auto h-10 w-40 rounded-xl" />
        <Skeleton className="h-32 rounded-3xl" />
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <AppErrorBoundary>
        <OfflineBanner />
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
                <Route element={<ProtectedRoute><SettingsProvider><AppLayout /></SettingsProvider></ProtectedRoute>}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/products/:id" element={<ProductDetailPage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/orders/new" element={<OrderCreatePage />} />
                  <Route path="/orders/:id" element={<OrderDetailPage />} />
                  <Route path="/purchases" element={<PurchasesPage />} />
                  <Route path="/purchases/new" element={<PurchaseCreatePage />} />
                  <Route path="/purchases/:id" element={<PurchaseDetailPage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/customers/:id" element={<CustomerDetailPage />} />
                  <Route path="/suppliers" element={<SuppliersPage />} />
                  <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
                  <Route path="/warehouses" element={<WarehousesPage />} />
                  <Route path="/warehouses/:id" element={<WarehouseDetailPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route
                    path="/admin/tenants"
                    element={
                      <PlatformAdminRoute>
                        <TenantsPage />
                      </PlatformAdminRoute>
                    }
                  />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </AppErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

