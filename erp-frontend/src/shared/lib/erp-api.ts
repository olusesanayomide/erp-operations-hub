import type {
  Customer,
  InventoryItem,
  NotificationItem,
  Order,
  Product,
  Purchase,
  StockMovement,
  Supplier,
  PlatformTenant,
  TenantInvite,
  TenantInviteDetails,
  TenantInviteStatus,
  TenantSummary,
  User,
  UserRole,
  Warehouse,
} from "@/shared/types/erp";
import { apiRequest } from "./api";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type BackendAuthUser = {
  sub: string;
  tenantId: string;
  email: string;
  name?: string | null;
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
  roles: string[];
  isPlatformAdmin: boolean;
  createdAt?: string;
};

type BackendUserListItem = {
  id: string;
  tenantId: string;
  tenantName: string;
  email: string;
  name?: string | null;
  roles: string[];
  isPlatformAdmin: boolean;
  createdAt: string;
  updatedAt?: string;
};

type BackendTenantListItem = {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  userCount: number;
};

type BackendTenantInvite = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  inviteLink?: string;
};

type BackendTenantInviteDetails = {
  tenantName: string;
  email: string;
  name?: string | null;
  role: string;
  expiresAt: string;
};

type BackendCurrencySettings = {
  currencyCode: string;
  locale: string;
  exchangeRate: number;
  updatedAt?: string;
  expectedUpdatedAt?: string;
};

type BackendNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
  readAt?: string | null;
  isRead: boolean;
};

type BackendProduct = {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  category?: string | null;
  unit?: string | null;
  minStock?: number | null;
  price: number;
  createdAt: string;
  updatedAt?: string | null;
  inventoryItems?: Array<{
    id: string;
    productId: string;
    warehouseId: string;
    quantity: number;
    reservedQuantity?: number;
    product?: BackendProduct;
    warehouse?: BackendWarehouse;
  }>;
  stockMovements?: BackendStockMovement[];
  orderItems?: Array<{
    id: string;
    orderId: string;
    warehouseId: string;
    quantity: number;
    price: number;
  }>;
};

type ProductImportMode = "create" | "upsert";

type ProductImportRowPreview = {
  rowNumber: number;
  name: string;
  sku: string;
  price: number | null;
  minStock: number | null;
  action: "create" | "update" | null;
  issues: string[];
};

type ProductImportPreview = {
  mode: ProductImportMode;
  totals: {
    rows: number;
    valid: number;
    invalid: number;
    creates: number;
    updates: number;
  };
  rows: ProductImportRowPreview[];
};

type ProductImportCommitResult = {
  mode: ProductImportMode;
  totals: ProductImportPreview["totals"] & {
    imported: number;
  };
  rows: ProductImportRowPreview[];
};

type CustomerImportMode = "create" | "upsert";

type CustomerImportRowPreview = {
  rowNumber: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  action: "create" | "update" | null;
  issues: string[];
};

type CustomerImportPreview = {
  mode: CustomerImportMode;
  totals: {
    rows: number;
    valid: number;
    invalid: number;
    creates: number;
    updates: number;
  };
  rows: CustomerImportRowPreview[];
};

type CustomerImportCommitResult = {
  mode: CustomerImportMode;
  totals: CustomerImportPreview["totals"] & {
    imported: number;
  };
  rows: CustomerImportRowPreview[];
};

type BackendWarehouse = {
  id: string;
  name: string;
  location?: string | null;
  description?: string | null;
  createdAt: string;
  inventoryItems?: Array<{
    id: string;
    productId: string;
    warehouseId: string;
    quantity: number;
    reservedQuantity?: number;
    product?: BackendProduct;
  }>;
  _count?: {
    inventoryItems?: number;
    purchases?: number;
  };
};

type BackendWarehouseInventoryItem = {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  reservedQuantity?: number;
  product?: {
    id: string;
    name: string;
    sku: string;
    minStock?: number | null;
  };
};

type WarehouseInventoryTotals = {
  availableQuantity: number;
  reservedQuantity: number;
  onHandQuantity: number;
};

type WarehouseInventoryResponse = PaginatedResponse<InventoryItem> & {
  totals: WarehouseInventoryTotals;
};

type BackendCustomer = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  createdAt: string;
  orders?: BackendOrder[];
  _count?: {
    orders?: number;
  };
};

type BackendSupplier = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  createdAt: string;
  purchases?: BackendPurchase[];
  _count?: {
    purchases?: number;
  };
};

type BackendOrder = {
  id: string;
  status: string;
  customerId?: string | null;
  customer?: BackendCustomer | null;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    productId: string;
    warehouseId: string;
    quantity: number;
    price: number;
    product?: BackendProduct;
  }>;
};

type BackendPurchase = {
  id: string;
  purchaseOrder: string;
  supplierId: string;
  supplier?: BackendSupplier;
  warehouseId: string;
  warehouse?: BackendWarehouse;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  receivedAt?: string | null;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    price: number;
    product?: BackendProduct;
  }>;
  _count?: {
    items?: number;
  };
};

type BackendStockMovement = {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  type: string;
  reference?: string | null;
  createdAt: string;
  product?: BackendProduct;
  warehouse?: BackendWarehouse;
};

type BackendInventorySummary = {
  product: string;
  location: string;
  availableStock: number;
  reservedStock?: number;
  onHandStock?: number;
  minStock?: number;
  status: string;
};

type BackendDashboardSummary = {
  counts: {
    products: number;
    customers: number;
    suppliers: number;
    warehouses: number;
  };
  inventory: {
    availableQuantity: number;
    reservedQuantity: number;
    lowStockCount: number;
    lowStockItems: Array<{
      id: string;
      productId: string;
      warehouseId: string;
      productName: string;
      productSku: string;
      warehouseName: string;
      quantity: number;
      reservedQuantity: number;
      onHandQuantity: number;
      minStock: number;
      status: string;
    }>;
  };
  orders: {
    activeCount: number;
    byStatus: Array<{ name: string; value: number }>;
    recent: Array<{
      id: string;
      orderNumber: string;
      customerId?: string | null;
      customerName?: string | null;
      status: Order["status"];
      totalAmount: number;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  purchases: {
    draftCount: number;
  };
  stockTrend: Array<{ month: string; in: number; out: number }>;
  trends: {
    products: DashboardTrend;
    customers: DashboardTrend;
    suppliers: DashboardTrend;
    warehouses: DashboardTrend;
    activeOrders: DashboardTrend;
    draftPurchases: DashboardTrend;
    availableInventory: DashboardTrend;
  };
};

type DashboardTrend = {
  value: number;
  label: string;
  current: number;
  previous: number;
};

export const AUTH_SLOW_OPERATION_NOTICE_MS = 8000;
export const AUTH_LOGIN_PROFILE_TIMEOUT_MS = 90000;
export const AUTH_LOGIN_PROFILE_TIMEOUT_MESSAGE =
  "Signed in, but we could not load your ERP profile. Please check that the backend is running and try again.";
export const AUTH_RESTORE_TIMEOUT_MS = 120000;
export const AUTH_RESTORE_TIMEOUT_MESSAGE =
  "We could not verify your session. Please sign in again.";

const TENANT_SIGNUP_TIMEOUT_MS = AUTH_LOGIN_PROFILE_TIMEOUT_MS;
const TENANT_SIGNUP_TIMEOUT_MESSAGE =
  "Workspace setup is taking longer than expected. If your connection is unstable, please wait a moment and try signing in before submitting again.";

export type ListPageParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type SystemHealth = {
  status: "ok" | "degraded";
  api: "ok";
  database: "ok" | "down";
  checkedAt: string;
  message?: string;
};

let currentUserRequest: Promise<User> | null = null;

function buildListQuery(params: ListPageParams) {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  if (params.status?.trim() && params.status !== "all") {
    searchParams.set("status", params.status.trim());
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function mapPaginatedResponse<TInput, TOutput>(
  response: PaginatedResponse<TInput>,
  mapItem: (item: TInput) => TOutput,
) {
  return {
    items: response.items.map(mapItem),
    meta: response.meta,
  } satisfies PaginatedResponse<TOutput>;
}

function normalizeAuthUser(data: BackendAuthUser): User {
  return {
    id: data.sub,
    name: data.name || data.email,
    email: data.email,
    role: normalizeRole(data.roles?.[0]),
    tenant: normalizeTenant(data.tenant),
    isPlatformAdmin: data.isPlatformAdmin,
    createdAt: data.createdAt || new Date().toISOString(),
  } satisfies User;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function normalizeRole(role?: string | null): UserRole {
  const normalized = role?.toLowerCase();
  if (normalized === "admin" || normalized === "manager" || normalized === "staff") {
    return normalized;
  }
  return "staff";
}

function normalizeInviteStatus(status?: string | null): TenantInviteStatus {
  const normalized = status?.toLowerCase();
  if (normalized === "accepted" || normalized === "revoked") {
    return normalized;
  }
  return "pending";
}

function normalizeTenantInvite(raw: BackendTenantInvite): TenantInvite {
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name || undefined,
    role: normalizeRole(raw.role),
    status: normalizeInviteStatus(raw.status),
    expiresAt: formatDate(raw.expiresAt),
    createdAt: formatDate(raw.createdAt),
    inviteLink: raw.inviteLink,
  };
}

function normalizeTenantInviteDetails(
  raw: BackendTenantInviteDetails,
): TenantInviteDetails {
  return {
    tenantName: raw.tenantName,
    email: raw.email,
    name: raw.name || undefined,
    role: normalizeRole(raw.role),
    expiresAt: formatDate(raw.expiresAt),
  };
}

function normalizeNotificationType(
  type: string,
): NotificationItem['type'] {
  switch (type.toLowerCase()) {
    case 'order_created':
    case 'order_status_changed':
    case 'purchase_created':
    case 'purchase_status_changed':
    case 'purchase_received':
      return type.toLowerCase() as NotificationItem['type'];
    default:
      return 'order_created';
  }
}

function normalizeNotificationEntityType(
  entityType?: string | null,
): NotificationItem['entityType'] {
  switch (entityType?.toLowerCase()) {
    case 'order':
    case 'purchase':
      return entityType.toLowerCase() as NotificationItem['entityType'];
    default:
      return 'system';
  }
}

function normalizeNotification(raw: BackendNotification): NotificationItem {
  return {
    id: raw.id,
    type: normalizeNotificationType(raw.type),
    title: raw.title,
    message: raw.message,
    entityType: normalizeNotificationEntityType(raw.entityType),
    entityId: raw.entityId || undefined,
    createdAt: raw.createdAt,
    readAt: raw.readAt || undefined,
    isRead: raw.isRead,
  };
}

function normalizeTenant(raw: {
  id: string;
  name: string;
  slug: string;
  status: string;
}): TenantSummary {
  const normalizedStatus = raw.status.toLowerCase();

  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    status:
      normalizedStatus === "suspended" || normalizedStatus === "archived"
        ? normalizedStatus
        : "active",
  };
}

function createOrderNumber(id: string) {
  return `ORD-${id.slice(0, 8).toUpperCase()}`;
}

function createPurchaseNumber(id: string, purchaseOrder?: string | null) {
  return purchaseOrder || `PO-${id.slice(0, 8).toUpperCase()}`;
}

function getOrderStatusRank(status: Order["status"]) {
  const ranks: Record<Order["status"], number> = {
    draft: 0,
    confirmed: 1,
    picked: 2,
    shipped: 3,
    delivered: 4,
    cancelled: -1,
  };

  return ranks[status];
}

export function normalizeProduct(raw: BackendProduct): Product {
  return {
    id: raw.id,
    name: raw.name,
    sku: raw.sku,
    description: raw.description || "",
    basePrice: raw.price,
    category: raw.category || "General",
    unit: raw.unit || "unit",
    minStock: raw.minStock ?? 10,
    createdAt: formatDate(raw.createdAt),
    updatedAt: formatDate(raw.updatedAt || raw.createdAt),
  };
}

export function normalizeWarehouse(raw: BackendWarehouse): Warehouse {
  return {
    id: raw.id,
    name: raw.name,
    location: raw.location || "Unspecified location",
    description: raw.description || "",
    itemCount: raw._count?.inventoryItems ?? raw.inventoryItems?.length ?? 0,
    createdAt: formatDate(raw.createdAt),
  };
}

function normalizeInventoryProduct(
  raw: NonNullable<BackendWarehouseInventoryItem["product"]>,
): Product {
  return {
    id: raw.id,
    name: raw.name,
    sku: raw.sku,
    description: "",
    basePrice: 0,
    category: "General",
    unit: "unit",
    minStock: raw.minStock ?? 10,
    createdAt: "",
    updatedAt: "",
  };
}

function normalizeWarehouseInventoryItem(
  raw: BackendWarehouseInventoryItem,
): InventoryItem {
  const reservedQuantity = raw.reservedQuantity ?? 0;
  const product = raw.product ? normalizeInventoryProduct(raw.product) : undefined;

  return {
    id: raw.id,
    productId: raw.productId,
    warehouseId: raw.warehouseId,
    quantity: raw.quantity,
    reservedQuantity,
    onHandQuantity: raw.quantity + reservedQuantity,
    minStock: raw.product?.minStock ?? 10,
    product,
  };
}

export function normalizeCustomer(raw: BackendCustomer): Customer {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone || "N/A",
    address: raw.address || "N/A",
    orderCount: raw._count?.orders ?? raw.orders?.length ?? 0,
    createdAt: formatDate(raw.createdAt),
  };
}

export function normalizeSupplier(raw: BackendSupplier): Supplier {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email || "N/A",
    phone: raw.phone || "N/A",
    address: raw.address || "N/A",
    purchaseCount: raw._count?.purchases ?? raw.purchases?.length ?? 0,
    createdAt: formatDate(raw.createdAt),
  };
}

export function normalizeInventoryItem(
  raw:
    | BackendInventorySummary
    | {
        id: string;
        productId: string;
        warehouseId: string;
        quantity: number;
        reservedQuantity?: number;
        product?: BackendProduct;
        warehouse?: BackendWarehouse;
      },
  productsById: Map<string, Product>,
  warehousesById: Map<string, Warehouse>,
): InventoryItem {
  const productId = "product" in raw ? raw.product : raw.productId;
  const warehouseId = "location" in raw ? raw.location : raw.warehouseId;
  const quantity = "availableStock" in raw ? raw.availableStock : raw.quantity;
  const reservedQuantity =
    "reservedStock" in raw ? raw.reservedStock || 0 : raw.reservedQuantity || 0;
  const onHandQuantity =
    "onHandStock" in raw ? raw.onHandStock || quantity + reservedQuantity : quantity + reservedQuantity;

  return {
    id: "id" in raw ? raw.id : `${productId}-${warehouseId}`,
    productId,
    warehouseId,
    quantity,
    reservedQuantity,
    onHandQuantity,
    minStock: "minStock" in raw ? raw.minStock || 0 : raw.product ? raw.product.minStock ?? 10 : productsById.get(productId)?.minStock ?? 10,
    product: "product" in raw ? productsById.get(productId) : raw.product ? normalizeProduct(raw.product) : productsById.get(productId),
    warehouse:
      "warehouse" in raw
        ? raw.warehouse
          ? normalizeWarehouse(raw.warehouse)
          : warehousesById.get(warehouseId)
        : warehousesById.get(warehouseId),
  };
}

export function normalizeOrder(raw: BackendOrder): Order {
  const warehouseId = raw.items[0]?.warehouseId || "";
  const normalizedStatus = raw.status.toLowerCase() as Order["status"];
  const statusRank = getOrderStatusRank(normalizedStatus);

  return {
    id: raw.id,
    orderNumber: createOrderNumber(raw.id),
    customerId: raw.customerId || "",
    warehouseId,
    status: normalizedStatus,
    items: raw.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.price,
      product: item.product ? normalizeProduct(item.product) : undefined,
    })),
    totalAmount: raw.totalAmount,
    notes: "",
    createdAt: formatDate(raw.createdAt),
    updatedAt: formatDate(raw.updatedAt),
    concurrencyStamp: raw.updatedAt,
    confirmedAt: statusRank >= 1 ? formatDate(raw.updatedAt) : undefined,
    pickedAt: statusRank >= 2 ? formatDate(raw.updatedAt) : undefined,
    shippedAt: statusRank >= 3 ? formatDate(raw.updatedAt) : undefined,
    deliveredAt: statusRank >= 4 ? formatDate(raw.updatedAt) : undefined,
    customer: raw.customer ? normalizeCustomer(raw.customer) : undefined,
  };
}

export function normalizePurchase(raw: BackendPurchase): Purchase {
  return {
    id: raw.id,
    purchaseNumber: createPurchaseNumber(raw.id, raw.purchaseOrder),
    supplierId: raw.supplierId,
    warehouseId: raw.warehouseId,
    status: raw.status.toLowerCase() as Purchase["status"],
    items: (raw.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.price,
      receivedQuantity: raw.status === "RECEIVED" ? item.quantity : 0,
      product: item.product ? normalizeProduct(item.product) : undefined,
    })),
    totalAmount: raw.totalAmount,
    notes: "",
    createdAt: formatDate(raw.createdAt),
    updatedAt: formatDate(raw.updatedAt),
    concurrencyStamp: raw.updatedAt,
    receivedAt: raw.receivedAt ? formatDate(raw.receivedAt) : undefined,
    supplier: raw.supplier ? normalizeSupplier(raw.supplier) : undefined,
    warehouse: raw.warehouse ? normalizeWarehouse(raw.warehouse) : undefined,
  };
}

export function normalizeMovement(raw: BackendStockMovement): StockMovement {
  const normalizedType =
    raw.type === "IN" ? "stock-in" : raw.type === "OUT" ? "stock-out" : "adjustment";

  return {
    id: raw.id,
    productId: raw.productId,
    warehouseId: raw.warehouseId,
    type: normalizedType,
    quantity: raw.quantity,
    notes: raw.reference || "",
    createdAt: formatDate(raw.createdAt),
    product: raw.product ? normalizeProduct(raw.product) : undefined,
    warehouse: raw.warehouse ? normalizeWarehouse(raw.warehouse) : undefined,
  };
}

export async function getCurrentUser(
  accessToken?: string | null,
  init?: {
    timeoutMs?: number;
    timeoutMessage?: string;
  },
) {
  if (!currentUserRequest) {
    currentUserRequest = apiRequest<BackendAuthUser>("/auth/me", {
      accessToken,
      timeoutMs: init?.timeoutMs,
      timeoutMessage: init?.timeoutMessage,
    })
      .then(normalizeAuthUser)
      .finally(() => {
        currentUserRequest = null;
      });
  }

  return currentUserRequest;
}

export function clearCurrentUserRequest() {
  currentUserRequest = null;
}

export async function listUsers() {
  const items = await apiRequest<BackendUserListItem[]>("/auth/users");
  return items.map((item) => ({
    id: item.id,
    name: item.name || item.email,
    email: item.email,
    role: normalizeRole(item.roles?.[0]),
    tenant: {
      id: item.tenantId,
      name: item.tenantName,
      slug: "",
      status: "active",
    },
    isPlatformAdmin: item.isPlatformAdmin,
    createdAt: formatDate(item.createdAt),
    updatedAt: item.updatedAt ? formatDate(item.updatedAt) : undefined,
    concurrencyStamp: item.updatedAt,
  })) satisfies User[];
}

export async function updateUser(
  userId: string,
  payload: {
    name?: string;
    role?: "ADMIN" | "MANAGER" | "STAFF";
    expectedUpdatedAt?: string;
  },
) {
  const item = await apiRequest<BackendUserListItem>(`/auth/users/${userId}`, {
    method: "PATCH",
    body: payload,
  });

  return {
    id: item.id,
    name: item.name || item.email,
    email: item.email,
    role: normalizeRole(item.roles?.[0]),
    tenant: {
      id: item.tenantId,
      name: item.tenantName,
      slug: "",
      status: "active",
    },
    isPlatformAdmin: item.isPlatformAdmin,
    createdAt: formatDate(item.createdAt),
    updatedAt: item.updatedAt ? formatDate(item.updatedAt) : undefined,
    concurrencyStamp: item.updatedAt,
  } satisfies User;
}

export async function createTenantInvite(payload: {
  email: string;
  role: "ADMIN" | "MANAGER" | "STAFF";
  name?: string;
}) {
  const item = await apiRequest<BackendTenantInvite>("/auth/invites", {
    method: "POST",
    body: payload,
  });
  return normalizeTenantInvite(item);
}

export async function listTenantInvites() {
  const items = await apiRequest<BackendTenantInvite[]>("/auth/invites");
  return items.map(normalizeTenantInvite);
}

export async function revokeTenantInvite(inviteId: string) {
  const item = await apiRequest<BackendTenantInvite>(`/auth/invites/${inviteId}/revoke`, {
    method: "PATCH",
  });
  return normalizeTenantInvite(item);
}

export async function getTenantInvite(token: string) {
  const item = await apiRequest<BackendTenantInviteDetails>(
    `/auth/invites/${encodeURIComponent(token)}`,
    { accessToken: null },
  );
  return normalizeTenantInviteDetails(item);
}

export async function acceptTenantInvite(
  token: string,
  payload: {
    name: string;
    password: string;
  },
) {
  return apiRequest(`/auth/invites/${encodeURIComponent(token)}/accept`, {
    method: "POST",
    accessToken: null,
    body: payload,
    timeoutMessage:
      "Joining this workspace is taking longer than expected. Please keep this page open and try signing in before submitting again.",
    timeoutMs: TENANT_SIGNUP_TIMEOUT_MS,
  });
}

export async function loginWithSupabase(email: string, password: string) {
  if (!supabase) {
    throw new Error("Supabase auth is not configured.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("Supabase did not return a user.");
  }

  return data.session satisfies Session | null;
}

function getAuthRedirectBaseUrl() {
  const configuredUrl = import.meta.env.VITE_SITE_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  if (import.meta.env.PROD) {
    throw new Error("VITE_SITE_URL must be configured for production password reset links.");
  }

  return "http://localhost:8080";
}

export async function sendPasswordResetEmail(email: string) {
  if (!supabase) {
    throw new Error("Supabase auth is not configured.");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAuthRedirectBaseUrl()}/auth/reset-password`,
  });

  if (error) {
    throw error;
  }
}

export async function updateSupabasePassword(password: string) {
  if (!supabase) {
    throw new Error("Supabase auth is not configured.");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw error;
  }
}

export async function logoutSupabase() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function signupTenant(payload: {
  companyName: string;
  slug?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}) {
  return apiRequest("/auth/signup-tenant", {
    method: "POST",
    body: payload,
    timeoutMessage: TENANT_SIGNUP_TIMEOUT_MESSAGE,
    timeoutMs: TENANT_SIGNUP_TIMEOUT_MS,
  });
}

export async function listTenants() {
  const items = await apiRequest<BackendTenantListItem[]>("/auth/tenants");
  return items.map(
    (item) =>
      ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        status: normalizeTenant({
          id: item.id,
          name: item.name,
          slug: item.slug,
          status: item.status,
        }).status,
        createdAt: formatDate(item.createdAt),
        updatedAt: formatDate(item.updatedAt),
        concurrencyStamp: item.updatedAt,
        userCount: item.userCount,
      }) satisfies PlatformTenant,
  );
}

export async function updateTenantStatus(
  tenantId: string,
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED",
  expectedUpdatedAt?: string,
) {
  const item = await apiRequest<BackendTenantListItem>(`/auth/tenants/${tenantId}/status`, {
    method: "PATCH",
    body: { status, expectedUpdatedAt },
  });

  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    status: normalizeTenant({
      id: item.id,
      name: item.name,
      slug: item.slug,
      status: item.status,
    }).status,
    createdAt: formatDate(item.createdAt),
    updatedAt: formatDate(item.updatedAt),
    concurrencyStamp: item.updatedAt,
    userCount: item.userCount,
  } satisfies PlatformTenant;
}

export async function getCurrencySettings() {
  return apiRequest<BackendCurrencySettings>("/settings/currency");
}

export async function getSystemHealth() {
  return apiRequest<SystemHealth>("/health", {
    accessToken: null,
  });
}

export async function listNotifications(limit = 12) {
  const items = await apiRequest<BackendNotification[]>(`/notifications?limit=${limit}`);
  return items.map(normalizeNotification);
}

export async function getUnreadNotificationCount() {
  return apiRequest<{ unreadCount: number }>('/notifications/unread-count');
}

export async function markNotificationAsRead(notificationId: string) {
  return apiRequest<{ unreadCount: number }>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });
}

export async function markAllNotificationsAsRead() {
  return apiRequest<{ updatedCount: number; unreadCount: number }>('/notifications/read-all', {
    method: 'PATCH',
  });
}

export async function updateCurrencySettings(payload: BackendCurrencySettings) {
  return apiRequest<BackendCurrencySettings>("/settings/currency", {
    method: "PATCH",
    body: payload,
  });
}

export async function getDashboardSummary() {
  return apiRequest<BackendDashboardSummary>("/dashboard/summary", {
    timeoutMs: 60000,
  });
}

export async function listProducts() {
  const items = await apiRequest<BackendProduct[]>("/products");
  return items.map(normalizeProduct);
}

export async function listRawProducts() {
  return apiRequest<BackendProduct[]>("/products");
}

export async function listPaginatedRawProducts(params: ListPageParams) {
  return apiRequest<PaginatedResponse<BackendProduct>>(`/products${buildListQuery(params)}`);
}

export async function getProductById(id: string) {
  const item = await apiRequest<BackendProduct>(`/products/${id}`);
  return {
    product: normalizeProduct(item),
    inventory: (item.inventoryItems || []).map((inventoryItem) => ({
      id: inventoryItem.id,
      productId: inventoryItem.productId,
      warehouseId: inventoryItem.warehouseId,
      quantity: inventoryItem.quantity,
      reservedQuantity: inventoryItem.reservedQuantity || 0,
      onHandQuantity: inventoryItem.quantity + (inventoryItem.reservedQuantity || 0),
      minStock: item.minStock,
    })),
    movements: (item.stockMovements || []).map(normalizeMovement),
    relatedOrderIds: Array.from(new Set((item.orderItems || []).map((orderItem) => orderItem.orderId))),
  };
}

export async function createProduct(payload: {
  name: string;
  sku: string;
  price: number;
  minStock?: number;
  description?: string;
  category?: string;
  unit?: string;
}) {
  const item = await apiRequest<BackendProduct>("/products", {
    method: "POST",
    body: payload,
  });
  return normalizeProduct(item);
}

export async function previewProductImport(payload: {
  csv: string;
  mode?: ProductImportMode;
}) {
  return apiRequest<ProductImportPreview>("/products/import/preview", {
    method: "POST",
    body: payload,
  });
}

export async function commitProductImport(payload: {
  csv: string;
  mode?: ProductImportMode;
}) {
  return apiRequest<ProductImportCommitResult>("/products/import/commit", {
    method: "POST",
    body: payload,
  });
}

export async function listCustomers() {
  const items = await apiRequest<BackendCustomer[]>("/customers");
  return items.map(normalizeCustomer);
}

export async function listPaginatedCustomers(params: ListPageParams) {
  const response = await apiRequest<PaginatedResponse<BackendCustomer>>(`/customers${buildListQuery(params)}`);
  return mapPaginatedResponse(response, normalizeCustomer);
}

export async function getCustomerById(id: string) {
  const item = await apiRequest<BackendCustomer>(`/customers/${id}`);
  return {
    customer: normalizeCustomer(item),
    orders: (item.orders || []).map(normalizeOrder),
  };
}

export async function createCustomer(payload: {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}) {
  const item = await apiRequest<BackendCustomer>("/customers", {
    method: "POST",
    body: payload,
  });
  return normalizeCustomer(item);
}

export async function previewCustomerImport(payload: {
  csv: string;
  mode?: CustomerImportMode;
}) {
  return apiRequest<CustomerImportPreview>("/customers/import/preview", {
    method: "POST",
    body: payload,
  });
}

export async function commitCustomerImport(payload: {
  csv: string;
  mode?: CustomerImportMode;
}) {
  return apiRequest<CustomerImportCommitResult>("/customers/import/commit", {
    method: "POST",
    body: payload,
  });
}

export async function listSuppliers() {
  const items = await apiRequest<BackendSupplier[]>("/suppliers");
  return items.map(normalizeSupplier);
}

export async function listPaginatedSuppliers(params: ListPageParams) {
  const response = await apiRequest<PaginatedResponse<BackendSupplier>>(`/suppliers${buildListQuery(params)}`);
  return mapPaginatedResponse(response, normalizeSupplier);
}

export async function getSupplierById(id: string) {
  const item = await apiRequest<BackendSupplier>(`/suppliers/${id}`);
  return {
    supplier: normalizeSupplier(item),
    purchases: (item.purchases || []).map(normalizePurchase),
  };
}

export async function createSupplier(payload: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}) {
  const item = await apiRequest<BackendSupplier>("/suppliers", {
    method: "POST",
    body: payload,
  });
  return normalizeSupplier(item);
}

export async function listWarehouses() {
  const items = await apiRequest<BackendWarehouse[]>("/warehouses");
  return items.map(normalizeWarehouse);
}

export async function listPaginatedWarehouses(params: ListPageParams) {
  const response = await apiRequest<PaginatedResponse<BackendWarehouse>>(`/warehouses${buildListQuery(params)}`);
  return mapPaginatedResponse(response, normalizeWarehouse);
}

export async function getWarehouseById(id: string) {
  const item = await apiRequest<BackendWarehouse>(`/warehouses/${id}`);
  return {
    warehouse: normalizeWarehouse(item),
  };
}

export async function getWarehouseInventory(
  id: string,
  params: ListPageParams = {},
): Promise<WarehouseInventoryResponse> {
  const response = await apiRequest<
    PaginatedResponse<BackendWarehouseInventoryItem> & {
      totals: WarehouseInventoryTotals;
    }
  >(`/warehouses/${id}/inventory${buildListQuery(params)}`);

  return {
    ...mapPaginatedResponse(response, normalizeWarehouseInventoryItem),
    totals: response.totals,
  };
}

export async function createWarehouse(payload: {
  name: string;
  location?: string;
  description?: string;
}) {
  const item = await apiRequest<BackendWarehouse>("/warehouses", {
    method: "POST",
    body: payload,
  });
  return normalizeWarehouse(item);
}

export async function listOrders() {
  const items = await apiRequest<BackendOrder[]>("/orders");
  return items.map(normalizeOrder);
}

export async function listPaginatedOrders(params: ListPageParams) {
  const response = await apiRequest<PaginatedResponse<BackendOrder>>(`/orders${buildListQuery(params)}`);
  return mapPaginatedResponse(response, normalizeOrder);
}

export async function getOrderById(id: string) {
  const item = await apiRequest<BackendOrder>(`/orders/${id}`);
  return normalizeOrder(item);
}

export async function createOrder(payload: {
  customerId: string;
  warehouseId: string;
  items: Array<{ productId: string; quantity: number }>;
}) {
  const order = await apiRequest<BackendOrder>("/orders", {
    method: "POST",
    body: {
      customerId: payload.customerId,
      items: payload.items.map((item) => ({
        productId: item.productId,
        warehouseId: payload.warehouseId,
        quantity: item.quantity,
      })),
    },
  });

  return normalizeOrder(order);
}

export async function updateOrderStatus(
  id: string,
  status: "CONFIRMED" | "PICKED" | "SHIPPED" | "DELIVERED" | "CANCELLED",
  expectedUpdatedAt?: string,
) {
  const item = await apiRequest<BackendOrder>(`/orders/${id}/status`, {
    method: "PATCH",
    body: { status, expectedUpdatedAt },
  });
  return normalizeOrder(item);
}

export async function listPurchases() {
  const items = await apiRequest<BackendPurchase[]>("/purchases");
  return items.map((item) =>
    normalizePurchase({
      ...item,
      items: item.items || [],
    }),
  );
}

export async function listPaginatedPurchases(params: ListPageParams) {
  const response = await apiRequest<PaginatedResponse<BackendPurchase>>(`/purchases${buildListQuery(params)}`);
  return mapPaginatedResponse(response, (item) =>
    normalizePurchase({
      ...item,
      items: item.items || [],
    }),
  );
}

export async function getPurchaseById(id: string) {
  const item = await apiRequest<BackendPurchase>(`/purchases/${id}`);
  return normalizePurchase(item);
}

export async function createPurchase(payload: {
  supplierId: string;
  warehouseId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
}) {
  const item = await apiRequest<BackendPurchase>("/purchases", {
    method: "POST",
    body: {
      supplierId: payload.supplierId,
      warehouseId: payload.warehouseId,
      items: payload.items,
    },
  });
  return normalizePurchase({
    ...item,
    items: item.items || [],
  });
}

export async function receivePurchase(id: string, expectedUpdatedAt?: string) {
  await apiRequest(`/purchases/${id}/receive`, {
    method: "PATCH",
    body: { expectedUpdatedAt },
  });
}

export async function updatePurchaseStatus(
  id: string,
  status: "CONFIRMED" | "SHIPPED" | "RECEIVED" | "CANCELLED",
  expectedUpdatedAt?: string,
) {
  const item = await apiRequest<BackendPurchase>(`/purchases/${id}/status`, {
    method: "PATCH",
    body: { status, expectedUpdatedAt },
  });

  return normalizePurchase(item);
}

export async function listInventory() {
  const [summary, rawProducts, warehouses] = await Promise.all([
    apiRequest<BackendInventorySummary[]>("/inventory"),
    listRawProducts(),
    listWarehouses(),
  ]);

  const productsById = new Map(rawProducts.map((product) => [product.id, normalizeProduct(product)]));
  const warehousesById = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse]));

  return summary.map((item) => normalizeInventoryItem(item, productsById, warehousesById));
}

export async function listInventorySummary() {
  const summary = await apiRequest<BackendInventorySummary[]>("/inventory");
  return summary.map((item) => normalizeInventoryItem(item, new Map(), new Map()));
}

export async function stockIn(payload: {
  productId: string;
  warehouseId: string;
  quantity: number;
}) {
  await apiRequest("/inventory/stock-in", {
    method: "POST",
    body: payload,
  });
}

export async function stockOut(payload: {
  productId: string;
  warehouseId: string;
  quantity: number;
}) {
  await apiRequest("/inventory/stock-out", {
    method: "POST",
    body: payload,
  });
}

export async function transferStock(payload: {
  productId: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  quantity: number;
  note: string;
}) {
  await apiRequest("/inventory/transfer", {
    method: "POST",
    body: payload,
  });
}

