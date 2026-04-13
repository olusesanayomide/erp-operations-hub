import { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { AuthProvider, useAuth } from "@/app/providers/AuthContext";
import { SettingsProvider } from "@/app/providers/SettingsContext";
import { AppLayout } from "@/shared/layout/AppLayout";
import { Skeleton } from "@/shared/ui/skeleton";
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

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, authStatusMessage } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        {authStatusMessage || 'Restoring your session...'}
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PlatformAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isPlatformAdmin, authStatusMessage } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        {authStatusMessage || 'Restoring your session...'}
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
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
      <AuthProvider>
        <SettingsProvider>
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
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
        </SettingsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

