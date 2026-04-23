import { lazy } from "react";

const loadLandingPage = () => import("@/app/pages/LandingPage");
const loadNotFoundPage = () => import("@/app/pages/NotFound");
const loadLoginPage = () => import("@/features/auth/pages/LoginPage");
const loadSignupPage = () => import("@/features/auth/pages/SignupPage");
const loadJoinTenantPage = () => import("@/features/auth/pages/JoinTenantPage");
const loadForgotPasswordPage = () => import("@/features/auth/pages/ForgotPasswordPage");
const loadResetPasswordPage = () => import("@/features/auth/pages/ResetPasswordPage");
const loadDashboardPage = () => import("@/features/dashboard/pages/DashboardPage");
const loadProductsPage = () => import("@/features/products/pages/ProductsPage");
const loadProductDetailPage = () => import("@/features/products/pages/ProductDetailPage");
const loadInventoryPage = () => import("@/features/inventory/pages/InventoryPage");
const loadOrdersPage = () => import("@/features/orders/pages/OrdersPage");
const loadOrderDetailPage = () => import("@/features/orders/pages/OrderDetailPage");
const loadOrderCreatePage = () => import("@/features/orders/pages/OrderCreatePage");
const loadPurchasesPage = () => import("@/features/purchases/pages/PurchasesPage");
const loadPurchaseDetailPage = () => import("@/features/purchases/pages/PurchaseDetailPage");
const loadPurchaseCreatePage = () => import("@/features/purchases/pages/PurchaseCreatePage");
const loadCustomersPage = () => import("@/features/customers/pages/CustomersPage");
const loadCustomerDetailPage = () => import("@/features/customers/pages/CustomerDetailPage");
const loadSuppliersPage = () => import("@/features/suppliers/pages/SuppliersPage");
const loadSupplierDetailPage = () => import("@/features/suppliers/pages/SupplierDetailPage");
const loadWarehousesPage = () => import("@/features/warehouses/pages/WarehousesPage");
const loadWarehouseDetailPage = () => import("@/features/warehouses/pages/WarehouseDetailPage");
const loadUsersPage = () => import("@/features/users/pages/UsersPage");
const loadSettingsPage = () => import("@/features/settings/pages/SettingsPage");
const loadTenantsPage = () => import("@/features/platform-admin/pages/TenantsPage");

export const LandingPage = lazy(loadLandingPage);
export const NotFound = lazy(loadNotFoundPage);
export const LoginPage = lazy(loadLoginPage);
export const SignupPage = lazy(loadSignupPage);
export const JoinTenantPage = lazy(loadJoinTenantPage);
export const ForgotPasswordPage = lazy(loadForgotPasswordPage);
export const ResetPasswordPage = lazy(loadResetPasswordPage);
export const DashboardPage = lazy(loadDashboardPage);
export const ProductsPage = lazy(loadProductsPage);
export const ProductDetailPage = lazy(loadProductDetailPage);
export const InventoryPage = lazy(loadInventoryPage);
export const OrdersPage = lazy(loadOrdersPage);
export const OrderDetailPage = lazy(loadOrderDetailPage);
export const OrderCreatePage = lazy(loadOrderCreatePage);
export const PurchasesPage = lazy(loadPurchasesPage);
export const PurchaseDetailPage = lazy(loadPurchaseDetailPage);
export const PurchaseCreatePage = lazy(loadPurchaseCreatePage);
export const CustomersPage = lazy(loadCustomersPage);
export const CustomerDetailPage = lazy(loadCustomerDetailPage);
export const SuppliersPage = lazy(loadSuppliersPage);
export const SupplierDetailPage = lazy(loadSupplierDetailPage);
export const WarehousesPage = lazy(loadWarehousesPage);
export const WarehouseDetailPage = lazy(loadWarehouseDetailPage);
export const UsersPage = lazy(loadUsersPage);
export const SettingsPage = lazy(loadSettingsPage);
export const TenantsPage = lazy(loadTenantsPage);

const routePreloaders: Array<[pathPrefix: string, preload: () => Promise<unknown>]> = [
  ["/dashboard", loadDashboardPage],
  ["/products", loadProductsPage],
  ["/inventory", loadInventoryPage],
  ["/orders", loadOrdersPage],
  ["/purchases", loadPurchasesPage],
  ["/customers", loadCustomersPage],
  ["/suppliers", loadSuppliersPage],
  ["/warehouses", loadWarehousesPage],
  ["/users", loadUsersPage],
  ["/settings", loadSettingsPage],
  ["/admin/tenants", loadTenantsPage],
];

export function preloadRoute(pathname: string) {
  const match = routePreloaders.find(([pathPrefix]) => pathname.startsWith(pathPrefix));
  return match ? match[1]() : Promise.resolve();
}
