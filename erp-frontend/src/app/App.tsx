import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { AuthProvider, useAuth } from "@/app/providers/AuthContext";
import { SettingsProvider } from "@/app/providers/SettingsContext";
import { AppLayout } from "@/shared/layout/AppLayout";

const LandingPage = lazy(() => import("@/app/pages/LandingPage"));
const NotFound = lazy(() => import("@/app/pages/NotFound"));
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const SignupPage = lazy(() => import("@/features/auth/pages/SignupPage"));
const ForgotPasswordPage = lazy(() => import("@/features/auth/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/features/auth/pages/ResetPasswordPage"));
const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage"));
const ProductsPage = lazy(() => import("@/features/products/pages/ProductsPage"));
const ProductDetailPage = lazy(() => import("@/features/products/pages/ProductDetailPage"));
const InventoryPage = lazy(() => import("@/features/inventory/pages/InventoryPage"));
const OrdersPage = lazy(() => import("@/features/orders/pages/OrdersPage"));
const OrderDetailPage = lazy(() => import("@/features/orders/pages/OrderDetailPage"));
const OrderCreatePage = lazy(() => import("@/features/orders/pages/OrderCreatePage"));
const PurchasesPage = lazy(() => import("@/features/purchases/pages/PurchasesPage"));
const PurchaseDetailPage = lazy(() => import("@/features/purchases/pages/PurchaseDetailPage"));
const PurchaseCreatePage = lazy(() => import("@/features/purchases/pages/PurchaseCreatePage"));
const CustomersPage = lazy(() => import("@/features/customers/pages/CustomersPage"));
const CustomerDetailPage = lazy(() => import("@/features/customers/pages/CustomerDetailPage"));
const SuppliersPage = lazy(() => import("@/features/suppliers/pages/SuppliersPage"));
const SupplierDetailPage = lazy(() => import("@/features/suppliers/pages/SupplierDetailPage"));
const WarehousesPage = lazy(() => import("@/features/warehouses/pages/WarehousesPage"));
const WarehouseDetailPage = lazy(() => import("@/features/warehouses/pages/WarehouseDetailPage"));
const UsersPage = lazy(() => import("@/features/users/pages/UsersPage"));
const SettingsPage = lazy(() => import("@/features/settings/pages/SettingsPage"));
const TenantsPage = lazy(() => import("@/features/platform-admin/pages/TenantsPage"));

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Restoring your session...
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PlatformAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isPlatformAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Restoring your session...
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isPlatformAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      Loading workspace...
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

