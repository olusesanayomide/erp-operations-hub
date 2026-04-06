import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { AuthProvider, useAuth } from "@/app/providers/AuthContext";
import { SettingsProvider } from "@/app/providers/SettingsContext";
import { AppLayout } from "@/shared/layout/AppLayout";
import LandingPage from "@/app/pages/LandingPage";
import NotFound from "@/app/pages/NotFound";
import LoginPage from "@/features/auth/pages/LoginPage";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import ProductsPage from "@/features/products/pages/ProductsPage";
import ProductDetailPage from "@/features/products/pages/ProductDetailPage";
import InventoryPage from "@/features/inventory/pages/InventoryPage";
import OrdersPage from "@/features/orders/pages/OrdersPage";
import OrderDetailPage from "@/features/orders/pages/OrderDetailPage";
import OrderCreatePage from "@/features/orders/pages/OrderCreatePage";
import PurchasesPage from "@/features/purchases/pages/PurchasesPage";
import PurchaseDetailPage from "@/features/purchases/pages/PurchaseDetailPage";
import PurchaseCreatePage from "@/features/purchases/pages/PurchaseCreatePage";
import CustomersPage from "@/features/customers/pages/CustomersPage";
import CustomerDetailPage from "@/features/customers/pages/CustomerDetailPage";
import SuppliersPage from "@/features/suppliers/pages/SuppliersPage";
import SupplierDetailPage from "@/features/suppliers/pages/SupplierDetailPage";
import WarehousesPage from "@/features/warehouses/pages/WarehousesPage";
import WarehouseDetailPage from "@/features/warehouses/pages/WarehouseDetailPage";
import UsersPage from "@/features/users/pages/UsersPage";
import SettingsPage from "@/features/settings/pages/SettingsPage";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <AuthProvider>
        <SettingsProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
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
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </SettingsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

