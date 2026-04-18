import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma, PurchaseStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const ACTIVE_ORDER_STATUSES = [
  OrderStatus.DRAFT,
  OrderStatus.CONFIRMED,
  OrderStatus.PICKED,
  OrderStatus.SHIPPED,
];

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.DRAFT]: 'Draft',
  [OrderStatus.CONFIRMED]: 'Confirmed',
  [OrderStatus.PICKED]: 'Picked',
  [OrderStatus.SHIPPED]: 'Shipped',
  [OrderStatus.DELIVERED]: 'Delivered',
  [OrderStatus.CANCELLED]: 'Cancelled',
};

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0;
  return Number(value);
}

function getPreviousPeriodWindow() {
  const currentEnd = new Date();
  const currentStart = new Date(currentEnd);
  currentStart.setDate(currentStart.getDate() - 30);

  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - 30);

  return {
    currentStart,
    currentEnd,
    previousStart,
    previousEnd: currentStart,
  };
}

function calculateTrend(current: number, previous: number) {
  if (previous === 0) {
    if (current > 0) return 100;
    if (current < 0) return -100;
    return 0;
  }

  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

function createTrend(current: number, previous: number, label = 'vs previous 30d') {
  return {
    value: calculateTrend(current, previous),
    label,
    current,
    previous,
  };
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(tenantId: string) {
    const { currentStart, currentEnd, previousStart, previousEnd } =
      getPreviousPeriodWindow();

    const [
      productCount,
      customerCount,
      supplierCount,
      warehouseCount,
      activeOrderCount,
      draftPurchaseCount,
      inventoryItems,
      orderStatusGroups,
      recentOrders,
      recentOrdersForTrend,
      recentPurchasesForTrend,
      currentProductsCreated,
      previousProductsCreated,
      currentCustomersCreated,
      previousCustomersCreated,
      currentSuppliersCreated,
      previousSuppliersCreated,
      currentWarehousesCreated,
      previousWarehousesCreated,
      currentActiveOrdersCreated,
      previousActiveOrdersCreated,
      currentDraftPurchasesCreated,
      previousDraftPurchasesCreated,
      currentInventoryMovements,
      previousInventoryMovements,
    ] = await Promise.all([
      this.prisma.product.count({ where: { tenantId } }),
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.supplier.count({ where: { tenantId } }),
      this.prisma.warehouse.count({ where: { tenantId } }),
      this.prisma.order.count({
        where: { tenantId, status: { in: ACTIVE_ORDER_STATUSES } },
      }),
      this.prisma.purchase.count({
        where: { tenantId, status: PurchaseStatus.DRAFT },
      }),
      this.prisma.inventoryItem.findMany({
        where: { tenantId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              minStock: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { _all: true },
      }),
      this.prisma.order.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          customerId: true,
          totalAmount: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.order.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          createdAt: true,
          totalAmount: true,
        },
      }),
      this.prisma.purchase.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          createdAt: true,
          totalAmount: true,
        },
      }),
      this.prisma.product.count({
        where: { tenantId, createdAt: { gte: currentStart, lt: currentEnd } },
      }),
      this.prisma.product.count({
        where: { tenantId, createdAt: { gte: previousStart, lt: previousEnd } },
      }),
      this.prisma.customer.count({
        where: { tenantId, createdAt: { gte: currentStart, lt: currentEnd } },
      }),
      this.prisma.customer.count({
        where: { tenantId, createdAt: { gte: previousStart, lt: previousEnd } },
      }),
      this.prisma.supplier.count({
        where: { tenantId, createdAt: { gte: currentStart, lt: currentEnd } },
      }),
      this.prisma.supplier.count({
        where: { tenantId, createdAt: { gte: previousStart, lt: previousEnd } },
      }),
      this.prisma.warehouse.count({
        where: { tenantId, createdAt: { gte: currentStart, lt: currentEnd } },
      }),
      this.prisma.warehouse.count({
        where: { tenantId, createdAt: { gte: previousStart, lt: previousEnd } },
      }),
      this.prisma.order.count({
        where: {
          tenantId,
          status: { in: ACTIVE_ORDER_STATUSES },
          createdAt: { gte: currentStart, lt: currentEnd },
        },
      }),
      this.prisma.order.count({
        where: {
          tenantId,
          status: { in: ACTIVE_ORDER_STATUSES },
          createdAt: { gte: previousStart, lt: previousEnd },
        },
      }),
      this.prisma.purchase.count({
        where: {
          tenantId,
          status: PurchaseStatus.DRAFT,
          createdAt: { gte: currentStart, lt: currentEnd },
        },
      }),
      this.prisma.purchase.count({
        where: {
          tenantId,
          status: PurchaseStatus.DRAFT,
          createdAt: { gte: previousStart, lt: previousEnd },
        },
      }),
      this.prisma.stockMovement.findMany({
        where: { tenantId, createdAt: { gte: currentStart, lt: currentEnd } },
        select: {
          quantity: true,
          type: true,
        },
      }),
      this.prisma.stockMovement.findMany({
        where: { tenantId, createdAt: { gte: previousStart, lt: previousEnd } },
        select: {
          quantity: true,
          type: true,
        },
      }),
    ]);

    const availableQuantity = inventoryItems.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0,
    );
    const reservedQuantity = inventoryItems.reduce(
      (sum, item) => sum + (item.reservedQuantity || 0),
      0,
    );

    const lowStockItems = inventoryItems
      .filter((item) => item.quantity <= (item.product?.minStock ?? 10))
      .map((item) => {
        const minStock = item.product?.minStock ?? 10;
        const status =
          item.quantity > minStock
            ? 'in-stock'
            : item.quantity > 0
              ? 'low-stock'
              : 'out-of-stock';

        return {
          id: item.id,
          productId: item.productId,
          warehouseId: item.warehouseId,
          productName: item.product?.name ?? 'Unknown product',
          productSku: item.product?.sku ?? '',
          warehouseName: item.warehouse?.name ?? 'Unknown warehouse',
          quantity: item.quantity || 0,
          reservedQuantity: item.reservedQuantity || 0,
          onHandQuantity: (item.quantity || 0) + (item.reservedQuantity || 0),
          minStock,
          status,
        };
      });

    const orderCountsByStatus = new Map(
      orderStatusGroups.map((group) => [group.status, group._count._all]),
    );

    const ordersByStatus = Object.values(OrderStatus).map((status) => ({
      name: ORDER_STATUS_LABELS[status],
      value: orderCountsByStatus.get(status) ?? 0,
    }));

    const stockTrend = [
      ...recentPurchasesForTrend.map((purchase) => ({
        month: String(purchase.createdAt.getMonth() + 1).padStart(2, '0'),
        in: toNumber(purchase.totalAmount),
        out: 0,
      })),
      ...recentOrdersForTrend.map((order) => ({
        month: String(order.createdAt.getMonth() + 1).padStart(2, '0'),
        in: 0,
        out: toNumber(order.totalAmount),
      })),
    ];

    const getNetInventoryMovement = (
      movements: typeof currentInventoryMovements,
    ) =>
      movements.reduce((sum, movement) => {
        if (movement.type === 'IN') return sum + movement.quantity;
        if (movement.type === 'OUT') return sum - movement.quantity;
        return sum + movement.quantity;
      }, 0);

    const currentNetInventoryMovement = getNetInventoryMovement(
      currentInventoryMovements,
    );
    const previousNetInventoryMovement = getNetInventoryMovement(
      previousInventoryMovements,
    );

    return {
      counts: {
        products: productCount,
        customers: customerCount,
        suppliers: supplierCount,
        warehouses: warehouseCount,
      },
      inventory: {
        availableQuantity,
        reservedQuantity,
        lowStockCount: lowStockItems.length,
        lowStockItems: lowStockItems.slice(0, 5),
      },
      orders: {
        activeCount: activeOrderCount,
        byStatus: ordersByStatus,
        recent: recentOrders.map((order) => ({
          id: order.id,
          orderNumber: `ORD-${order.id.slice(0, 8).toUpperCase()}`,
          customerId: order.customerId,
          customerName: order.customer?.name ?? null,
          status: order.status.toLowerCase(),
          totalAmount: toNumber(order.totalAmount),
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        })),
      },
      purchases: {
        draftCount: draftPurchaseCount,
      },
      stockTrend:
        stockTrend.length > 0
          ? stockTrend
          : [
              { month: '01', in: 0, out: 0 },
              { month: '02', in: 0, out: 0 },
            ],
      trends: {
        products: createTrend(currentProductsCreated, previousProductsCreated),
        customers: createTrend(currentCustomersCreated, previousCustomersCreated),
        suppliers: createTrend(currentSuppliersCreated, previousSuppliersCreated),
        warehouses: createTrend(
          currentWarehousesCreated,
          previousWarehousesCreated,
        ),
        activeOrders: createTrend(
          currentActiveOrdersCreated,
          previousActiveOrdersCreated,
        ),
        draftPurchases: createTrend(
          currentDraftPurchasesCreated,
          previousDraftPurchasesCreated,
        ),
        availableInventory: createTrend(
          currentNetInventoryMovement,
          previousNetInventoryMovement,
          'net stock vs previous 30d',
        ),
      },
    };
  }
}
