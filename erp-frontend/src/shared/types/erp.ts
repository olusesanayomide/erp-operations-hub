export type UserRole = 'admin' | 'manager' | 'staff';
export type TenantStatus = 'active' | 'suspended' | 'archived';

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
}

export interface PlatformTenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
  userCount: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenant: TenantSummary;
  isPlatformAdmin: boolean;
  avatar?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  basePrice: number;
  category: string;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  reservedQuantity: number;
  onHandQuantity: number;
  minStock: number;
  product?: Product;
  warehouse?: Warehouse;
}

export type StockMovementType = 'stock-in' | 'stock-out' | 'purchase-receive' | 'order-fulfill' | 'adjustment';

export interface StockMovement {
  id: string;
  productId: string;
  warehouseId: string;
  type: StockMovementType;
  quantity: number;
  referenceId?: string;
  referenceType?: 'order' | 'purchase';
  notes: string;
  createdAt: string;
  createdBy: string;
  product?: Product;
  warehouse?: Warehouse;
}

export type OrderStatus =
  | 'draft'
  | 'confirmed'
  | 'picked'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  product?: Product;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  warehouseId: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  pickedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  customer?: Customer;
  warehouse?: Warehouse;
}

export type PurchaseStatus = 'draft' | 'confirmed' | 'shipped' | 'received' | 'cancelled';

export interface PurchaseItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  receivedQuantity: number;
  product?: Product;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  warehouseId: string;
  status: PurchaseStatus;
  items: PurchaseItem[];
  totalAmount: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  receivedAt?: string;
  supplier?: Supplier;
  warehouse?: Warehouse;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  orderCount: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  purchaseCount: number;
  createdAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  description: string;
  itemCount: number;
  createdAt: string;
}

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

export function getStockStatus(quantity: number, minStock: number): StockStatus {
  if (quantity <= 0) return 'out-of-stock';
  if (quantity <= minStock) return 'low-stock';
  return 'in-stock';
}
