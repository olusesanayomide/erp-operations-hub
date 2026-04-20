import { Injectable, ServiceUnavailableException } from '@nestjs/common';
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

function toCount(value: bigint | number | string | null | undefined) {
  if (value == null) return 0;
  return Number(value);
}

type DashboardHeadlineCounts = {
  productCount: bigint;
  customerCount: bigint;
  supplierCount: bigint;
  warehouseCount: bigint;
  activeOrderCount: bigint;
  draftPurchaseCount: bigint;
};

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

function createTrend(
  current: number,
  previous: number,
  label = 'vs previous 30d',
) {
  return {
    value: calculateTrend(current, previous),
    label,
    current,
    previous,
  };
}

function isDatabaseUnavailableError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P1001'
  );
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(tenantId: string) {
    const { currentStart, currentEnd, previousStart, previousEnd } =
      getPreviousPeriodWindow();

    try {
      return await this.buildSummary(
        tenantId,
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
      );
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        throw new ServiceUnavailableException(
          'The database is currently unreachable. Please try again in a moment.',
        );
      }

      throw error;
    }
  }

  private async buildSummary(
    tenantId: string,
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date,
  ) {
    const headlineCounts = await this.prisma.$queryRaw<
      DashboardHeadlineCounts[]
    >`
      SELECT
        (SELECT COUNT(*)::bigint FROM "Product" WHERE "tenantId" = ${tenantId}) AS "productCount",
        (SELECT COUNT(*)::bigint FROM "Customer" WHERE "tenantId" = ${tenantId}) AS "customerCount",
        (SELECT COUNT(*)::bigint FROM "Supplier" WHERE "tenantId" = ${tenantId}) AS "supplierCount",
        (SELECT COUNT(*)::bigint FROM "Warehouse" WHERE "tenantId" = ${tenantId}) AS "warehouseCount",
        (
          SELECT COUNT(*)::bigint
          FROM "Order"
          WHERE "tenantId" = ${tenantId}
            AND "status" IN (${OrderStatus.DRAFT}::"OrderStatus", ${OrderStatus.CONFIRMED}::"OrderStatus", ${OrderStatus.PICKED}::"OrderStatus", ${OrderStatus.SHIPPED}::"OrderStatus")
        ) AS "activeOrderCount",
        (
          SELECT COUNT(*)::bigint
          FROM "Purchase"
          WHERE "tenantId" = ${tenantId}
            AND "status" = ${PurchaseStatus.DRAFT}::"PurchaseStatus"
        ) AS "draftPurchaseCount"
    `;

    const productCount = toCount(headlineCounts[0]?.productCount);
    const customerCount = toCount(headlineCounts[0]?.customerCount);
    const supplierCount = toCount(headlineCounts[0]?.supplierCount);
    const warehouseCount = toCount(headlineCounts[0]?.warehouseCount);
    const activeOrderCount = toCount(headlineCounts[0]?.activeOrderCount);
    const draftPurchaseCount = toCount(headlineCounts[0]?.draftPurchaseCount);

    const [inventoryTotals, lowStockCountResult, lowStockItems] =
      await Promise.all([
        this.prisma.inventoryItem.aggregate({
          where: { tenantId },
          _sum: {
            quantity: true,
            reservedQuantity: true,
          },
        }),
        this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS "count"
        FROM "InventoryItem" inventory
        INNER JOIN "Product" product ON product."id" = inventory."productId"
        WHERE inventory."tenantId" = ${tenantId}
          AND inventory."quantity" <= product."minStock"
      `,
        this.prisma.$queryRaw<
          Array<{
            id: string;
            productId: string;
            warehouseId: string;
            productName: string | null;
            productSku: string | null;
            warehouseName: string | null;
            quantity: number;
            reservedQuantity: number;
            minStock: number;
          }>
        >`
        SELECT
          inventory."id",
          inventory."productId",
          inventory."warehouseId",
          product."name" AS "productName",
          product."sku" AS "productSku",
          warehouse."name" AS "warehouseName",
          inventory."quantity",
          inventory."reservedQuantity",
          product."minStock"
        FROM "InventoryItem" inventory
        INNER JOIN "Product" product ON product."id" = inventory."productId"
        INNER JOIN "Warehouse" warehouse ON warehouse."id" = inventory."warehouseId"
        WHERE inventory."tenantId" = ${tenantId}
          AND inventory."quantity" <= product."minStock"
        ORDER BY inventory."quantity" ASC, product."name" ASC
        LIMIT 5
      `,
      ]);

    const [orderStatusGroups, recentOrders, recentOrdersForTrend] =
      await Promise.all([
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
      ]);

    const [
      recentPurchasesForTrend,
      currentProductsCreated,
      previousProductsCreated,
      currentCustomersCreated,
      previousCustomersCreated,
      currentSuppliersCreated,
      previousSuppliersCreated,
      currentWarehousesCreated,
      previousWarehousesCreated,
    ] = await Promise.all([
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
    ]);

    const [
      currentActiveOrdersCreated,
      previousActiveOrdersCreated,
      currentDraftPurchasesCreated,
      previousDraftPurchasesCreated,
      currentInventoryMovementGroups,
      previousInventoryMovementGroups,
    ] = await Promise.all([
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
      this.prisma.stockMovement.groupBy({
        by: ['type'],
        where: { tenantId, createdAt: { gte: currentStart, lt: currentEnd } },
        _sum: { quantity: true },
      }),
      this.prisma.stockMovement.groupBy({
        by: ['type'],
        where: { tenantId, createdAt: { gte: previousStart, lt: previousEnd } },
        _sum: { quantity: true },
      }),
    ]);

    const availableQuantity = inventoryTotals._sum.quantity ?? 0;
    const reservedQuantity = inventoryTotals._sum.reservedQuantity ?? 0;
    const lowStockCount = toCount(lowStockCountResult[0]?.count);
    const formattedLowStockItems = lowStockItems.map((item) => {
      const minStock = item.minStock ?? 10;
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
        productName: item.productName ?? 'Unknown product',
        productSku: item.productSku ?? '',
        warehouseName: item.warehouseName ?? 'Unknown warehouse',
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
      groups: typeof currentInventoryMovementGroups,
    ) =>
      groups.reduce((sum, group) => {
        const quantity = group._sum.quantity ?? 0;
        if (group.type === 'IN') return sum + quantity;
        if (group.type === 'OUT') return sum - quantity;
        return sum + quantity;
      }, 0);

    const currentNetInventoryMovement = getNetInventoryMovement(
      currentInventoryMovementGroups,
    );
    const previousNetInventoryMovement = getNetInventoryMovement(
      previousInventoryMovementGroups,
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
        lowStockCount,
        lowStockItems: formattedLowStockItems,
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
        customers: createTrend(
          currentCustomersCreated,
          previousCustomersCreated,
        ),
        suppliers: createTrend(
          currentSuppliersCreated,
          previousSuppliersCreated,
        ),
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
