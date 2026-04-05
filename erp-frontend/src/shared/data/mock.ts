import type { User, Product, Customer, Supplier, Warehouse, InventoryItem, Order, Purchase, StockMovement } from '@/shared/types/erp';

export const mockUsers: User[] = [
  { id: 'u1', name: 'Sarah Chen', email: 'sarah@manifest.com', role: 'admin', createdAt: '2024-01-15' },
  { id: 'u2', name: 'Marcus Rivera', email: 'marcus@manifest.com', role: 'manager', createdAt: '2024-02-10' },
  { id: 'u3', name: 'Emily Park', email: 'emily@manifest.com', role: 'staff', createdAt: '2024-03-20' },
  { id: 'u4', name: 'James Wilson', email: 'james@manifest.com', role: 'staff', createdAt: '2024-04-05' },
];

export const mockProducts: Product[] = [
  { id: 'p1', name: 'Industrial Bearing A200', sku: 'BRG-A200', description: 'High-precision bearing for heavy machinery', basePrice: 45.00, category: 'Bearings', unit: 'pc', createdAt: '2024-01-20', updatedAt: '2024-06-15' },
  { id: 'p2', name: 'Steel Shaft S500', sku: 'SHF-S500', description: 'Carbon steel shaft 500mm', basePrice: 120.00, category: 'Shafts', unit: 'pc', createdAt: '2024-01-22', updatedAt: '2024-06-10' },
  { id: 'p3', name: 'Hydraulic Pump HP-30', sku: 'PMP-HP30', description: 'Hydraulic pump 30L/min capacity', basePrice: 890.00, category: 'Pumps', unit: 'pc', createdAt: '2024-02-01', updatedAt: '2024-05-28' },
  { id: 'p4', name: 'Filter Cartridge FC-12', sku: 'FLT-FC12', description: 'Replacement oil filter cartridge', basePrice: 18.50, category: 'Filters', unit: 'pc', createdAt: '2024-02-10', updatedAt: '2024-06-01' },
  { id: 'p5', name: 'Coupling Flexible CF-80', sku: 'CPL-CF80', description: 'Flexible coupling 80mm bore', basePrice: 65.00, category: 'Couplings', unit: 'pc', createdAt: '2024-02-15', updatedAt: '2024-05-20' },
  { id: 'p6', name: 'Gasket Set GS-100', sku: 'GSK-GS100', description: 'Complete gasket set for engine rebuild', basePrice: 32.00, category: 'Gaskets', unit: 'set', createdAt: '2024-03-01', updatedAt: '2024-06-12' },
  { id: 'p7', name: 'V-Belt Drive VB-42', sku: 'BLT-VB42', description: 'Industrial V-belt 42 inch', basePrice: 22.00, category: 'Belts', unit: 'pc', createdAt: '2024-03-05', updatedAt: '2024-06-08' },
  { id: 'p8', name: 'Pneumatic Valve PV-25', sku: 'VLV-PV25', description: '2-way pneumatic valve 25mm', basePrice: 155.00, category: 'Valves', unit: 'pc', createdAt: '2024-03-10', updatedAt: '2024-06-14' },
];

export const mockCustomers: Customer[] = [
  { id: 'c1', name: 'Apex Manufacturing Co.', email: 'orders@apexmfg.com', phone: '+1 555-0101', address: '123 Industrial Blvd, Detroit MI', orderCount: 12, createdAt: '2024-01-20' },
  { id: 'c2', name: 'Pacific Machinery Ltd.', email: 'procurement@pacmach.com', phone: '+1 555-0102', address: '456 Harbor Way, Long Beach CA', orderCount: 8, createdAt: '2024-02-05' },
  { id: 'c3', name: 'Northern Steel Works', email: 'buying@nsw.com', phone: '+1 555-0103', address: '789 Steel Ave, Pittsburgh PA', orderCount: 5, createdAt: '2024-02-20' },
  { id: 'c4', name: 'Summit Engineering', email: 'supply@summit-eng.com', phone: '+1 555-0104', address: '321 Summit Dr, Denver CO', orderCount: 3, createdAt: '2024-03-15' },
];

export const mockSuppliers: Supplier[] = [
  { id: 's1', name: 'Global Parts Supply', email: 'sales@globalparts.com', phone: '+1 555-0201', address: '100 Trade Center, Houston TX', purchaseCount: 15, createdAt: '2024-01-10' },
  { id: 's2', name: 'Precision Components Inc.', email: 'orders@precisioncomp.com', phone: '+1 555-0202', address: '200 Precision Way, Chicago IL', purchaseCount: 10, createdAt: '2024-01-15' },
  { id: 's3', name: 'Eastern Import Group', email: 'supply@eig.com', phone: '+1 555-0203', address: '300 Port Blvd, Newark NJ', purchaseCount: 7, createdAt: '2024-02-01' },
];

export const mockWarehouses: Warehouse[] = [
  { id: 'w1', name: 'Main Distribution Center', location: 'Dallas, TX', description: 'Primary warehouse for all product categories', itemCount: 6, createdAt: '2024-01-01' },
  { id: 'w2', name: 'West Coast Facility', location: 'Los Angeles, CA', description: 'West coast distribution hub', itemCount: 4, createdAt: '2024-01-15' },
  { id: 'w3', name: 'East Coast Warehouse', location: 'Newark, NJ', description: 'East coast storage and distribution', itemCount: 3, createdAt: '2024-02-01' },
];

export const mockInventory: InventoryItem[] = [
  { id: 'inv1', productId: 'p1', warehouseId: 'w1', quantity: 250, minStock: 50 },
  { id: 'inv2', productId: 'p2', warehouseId: 'w1', quantity: 80, minStock: 20 },
  { id: 'inv3', productId: 'p3', warehouseId: 'w1', quantity: 12, minStock: 5 },
  { id: 'inv4', productId: 'p4', warehouseId: 'w1', quantity: 8, minStock: 30 },
  { id: 'inv5', productId: 'p5', warehouseId: 'w1', quantity: 45, minStock: 15 },
  { id: 'inv6', productId: 'p6', warehouseId: 'w1', quantity: 0, minStock: 20 },
  { id: 'inv7', productId: 'p1', warehouseId: 'w2', quantity: 120, minStock: 30 },
  { id: 'inv8', productId: 'p3', warehouseId: 'w2', quantity: 6, minStock: 5 },
  { id: 'inv9', productId: 'p7', warehouseId: 'w2', quantity: 200, minStock: 50 },
  { id: 'inv10', productId: 'p8', warehouseId: 'w2', quantity: 35, minStock: 10 },
  { id: 'inv11', productId: 'p2', warehouseId: 'w3', quantity: 40, minStock: 15 },
  { id: 'inv12', productId: 'p4', warehouseId: 'w3', quantity: 150, minStock: 30 },
  { id: 'inv13', productId: 'p5', warehouseId: 'w3', quantity: 22, minStock: 10 },
];

export const mockOrders: Order[] = [
  { id: 'o1', orderNumber: 'ORD-2024-001', customerId: 'c1', warehouseId: 'w1', status: 'delivered', items: [
    { id: 'oi1', productId: 'p1', quantity: 50, unitPrice: 45 },
    { id: 'oi2', productId: 'p2', quantity: 10, unitPrice: 120 },
  ], totalAmount: 3450, notes: 'Rush delivery requested', createdAt: '2024-05-10', updatedAt: '2024-05-15', confirmedAt: '2024-05-11', pickedAt: '2024-05-12', shippedAt: '2024-05-13', deliveredAt: '2024-05-15' },
  { id: 'o2', orderNumber: 'ORD-2024-002', customerId: 'c2', warehouseId: 'w2', status: 'confirmed', items: [
    { id: 'oi3', productId: 'p3', quantity: 2, unitPrice: 890 },
    { id: 'oi4', productId: 'p8', quantity: 5, unitPrice: 155 },
  ], totalAmount: 2555, notes: '', createdAt: '2024-06-01', updatedAt: '2024-06-02', confirmedAt: '2024-06-02' },
  { id: 'o3', orderNumber: 'ORD-2024-003', customerId: 'c3', warehouseId: 'w1', status: 'draft', items: [
    { id: 'oi5', productId: 'p4', quantity: 100, unitPrice: 18.5 },
    { id: 'oi6', productId: 'p7', quantity: 30, unitPrice: 22 },
  ], totalAmount: 2510, notes: 'Pending customer confirmation', createdAt: '2024-06-10', updatedAt: '2024-06-10' },
  { id: 'o4', orderNumber: 'ORD-2024-004', customerId: 'c1', warehouseId: 'w3', status: 'shipped', items: [
    { id: 'oi7', productId: 'p5', quantity: 15, unitPrice: 65 },
  ], totalAmount: 975, notes: '', createdAt: '2024-06-12', updatedAt: '2024-06-13', confirmedAt: '2024-06-13', pickedAt: '2024-06-14', shippedAt: '2024-06-15' },
  { id: 'o5', orderNumber: 'ORD-2024-005', customerId: 'c4', warehouseId: 'w1', status: 'cancelled', items: [
    { id: 'oi8', productId: 'p6', quantity: 20, unitPrice: 32 },
  ], totalAmount: 640, notes: 'Customer cancelled', createdAt: '2024-06-05', updatedAt: '2024-06-07' },
];

export const mockPurchases: Purchase[] = [
  { id: 'pu1', purchaseNumber: 'PO-2024-001', supplierId: 's1', warehouseId: 'w1', status: 'received', items: [
    { id: 'pi1', productId: 'p1', quantity: 200, unitPrice: 30, receivedQuantity: 200 },
    { id: 'pi2', productId: 'p4', quantity: 500, unitPrice: 12, receivedQuantity: 500 },
  ], totalAmount: 12000, notes: '', createdAt: '2024-04-01', updatedAt: '2024-04-20', confirmedAt: '2024-04-02', receivedAt: '2024-04-20' },
  { id: 'pu2', purchaseNumber: 'PO-2024-002', supplierId: 's2', warehouseId: 'w1', status: 'shipped', items: [
    { id: 'pi3', productId: 'p3', quantity: 10, unitPrice: 650, receivedQuantity: 0 },
  ], totalAmount: 6500, notes: 'Expected delivery June 25', createdAt: '2024-06-05', updatedAt: '2024-06-15', confirmedAt: '2024-06-06' },
  { id: 'pu3', purchaseNumber: 'PO-2024-003', supplierId: 's1', warehouseId: 'w2', status: 'confirmed', items: [
    { id: 'pi4', productId: 'p7', quantity: 100, unitPrice: 14, receivedQuantity: 0 },
    { id: 'pi5', productId: 'p8', quantity: 20, unitPrice: 105, receivedQuantity: 0 },
  ], totalAmount: 3500, notes: '', createdAt: '2024-06-10', updatedAt: '2024-06-11', confirmedAt: '2024-06-11' },
  { id: 'pu4', purchaseNumber: 'PO-2024-004', supplierId: 's3', warehouseId: 'w3', status: 'draft', items: [
    { id: 'pi6', productId: 'p6', quantity: 200, unitPrice: 20, receivedQuantity: 0 },
  ], totalAmount: 4000, notes: 'Awaiting budget approval', createdAt: '2024-06-14', updatedAt: '2024-06-14' },
];

export const mockStockMovements: StockMovement[] = [
  { id: 'sm1', productId: 'p1', warehouseId: 'w1', type: 'purchase-receive', quantity: 200, referenceId: 'pu1', referenceType: 'purchase', notes: 'PO-2024-001 received', createdAt: '2024-04-20', createdBy: 'u2' },
  { id: 'sm2', productId: 'p4', warehouseId: 'w1', type: 'purchase-receive', quantity: 500, referenceId: 'pu1', referenceType: 'purchase', notes: 'PO-2024-001 received', createdAt: '2024-04-20', createdBy: 'u2' },
  { id: 'sm3', productId: 'p1', warehouseId: 'w1', type: 'order-fulfill', quantity: -50, referenceId: 'o1', referenceType: 'order', notes: 'ORD-2024-001 fulfilled', createdAt: '2024-05-15', createdBy: 'u3' },
  { id: 'sm4', productId: 'p2', warehouseId: 'w1', type: 'order-fulfill', quantity: -10, referenceId: 'o1', referenceType: 'order', notes: 'ORD-2024-001 fulfilled', createdAt: '2024-05-15', createdBy: 'u3' },
  { id: 'sm5', productId: 'p5', warehouseId: 'w1', type: 'stock-in', quantity: 30, notes: 'Manual stock adjustment', createdAt: '2024-05-20', createdBy: 'u2' },
  { id: 'sm6', productId: 'p6', warehouseId: 'w1', type: 'stock-out', quantity: -20, notes: 'Damaged goods removed', createdAt: '2024-06-01', createdBy: 'u2' },
];

// Helper to enrich data with relations
export function getProduct(id: string) { return mockProducts.find(p => p.id === id); }
export function getCustomer(id: string) { return mockCustomers.find(c => c.id === id); }
export function getSupplier(id: string) { return mockSuppliers.find(s => s.id === id); }
export function getWarehouse(id: string) { return mockWarehouses.find(w => w.id === id); }
export function getUser(id: string) { return mockUsers.find(u => u.id === id); }

export function getInventoryForProduct(productId: string) {
  return mockInventory.filter(i => i.productId === productId).map(i => ({
    ...i,
    warehouse: getWarehouse(i.warehouseId),
    product: getProduct(i.productId),
  }));
}

export function getInventoryForWarehouse(warehouseId: string) {
  return mockInventory.filter(i => i.warehouseId === warehouseId).map(i => ({
    ...i,
    product: getProduct(i.productId),
    warehouse: getWarehouse(i.warehouseId),
  }));
}

export function getOrdersForCustomer(customerId: string) {
  return mockOrders.filter(o => o.customerId === customerId);
}

export function getPurchasesForSupplier(supplierId: string) {
  return mockPurchases.filter(p => p.supplierId === supplierId);
}

export function getMovementsForProduct(productId: string) {
  return mockStockMovements.filter(m => m.productId === productId);
}

export function getTotalInventory(productId: string) {
  return mockInventory.filter(i => i.productId === productId).reduce((sum, i) => sum + i.quantity, 0);
}

