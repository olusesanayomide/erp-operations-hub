import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { OrderStatus, Prisma, PurchaseStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

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
    try {
      return await this.buildSummary(tenantId);
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        throw new ServiceUnavailableException(
          'The database is currently unreachable. Please try again in a moment.',
        );
      }

      throw error;
    }
  }

  private async buildSummary(tenantId: string) {
    // A single raw query aggregates all headline counts in one DB round-trip,
    // avoiding N separate COUNT queries over the Supabase network connection.
    const headlineCounts = await this.prisma.$queryRaw<
      DashboardHeadlineCounts[]
    >`
      SELECT
        (SELECT COUNT(*)::bigint FROM "Product"   WHERE "tenantId" = ${tenantId}) AS "productCount",
        (SELECT COUNT(*)::bigint FROM "Customer"  WHERE "tenantId" = ${tenantId}) AS "customerCount",
        (SELECT COUNT(*)::bigint FROM "Supplier"  WHERE "tenantId" = ${tenantId}) AS "supplierCount",
        (SELECT COUNT(*)::bigint FROM "Warehouse" WHERE "tenantId" = ${tenantId}) AS "warehouseCount",
        (
          SELECT COUNT(*)::bigint
          FROM "Order"
          WHERE "tenantId" = ${tenantId}
            AND "status" IN (
              ${OrderStatus.DRAFT}::"OrderStatus",
              ${OrderStatus.CONFIRMED}::"OrderStatus",
              ${OrderStatus.PICKED}::"OrderStatus",
              ${OrderStatus.SHIPPED}::"OrderStatus"
            )
        ) AS "activeOrderCount",
        (
          SELECT COUNT(*)::bigint
          FROM "Purchase"
          WHERE "tenantId" = ${tenantId}
            AND "status" = ${PurchaseStatus.DRAFT}::"PurchaseStatus"
        ) AS "draftPurchaseCount"
    `;

    // Remaining queries run in parallel — zero sequential awaits after this point.
    const [
      inventoryTotals,
      lowStockCountResult,
      lowStockItems,
      orderStatusGroups,
      recentOrders,
    ] = await Promise.all([
      this.prisma.inventoryItem.aggregate({
        where: { tenantId },
        _sum: { quantity: true, reservedQuantity: true },
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
          product."name"      AS "productName",
          product."sku"       AS "productSku",
          warehouse."name"    AS "warehouseName",
          inventory."quantity",
          inventory."reservedQuantity",
          product."minStock"
        FROM "InventoryItem" inventory
        INNER JOIN "Product"   product   ON product."id"   = inventory."productId"
        INNER JOIN "Warehouse" warehouse ON warehouse."id" = inventory."warehouseId"
        WHERE inventory."tenantId" = ${tenantId}
          AND inventory."quantity" <= product."minStock"
        ORDER BY inventory."quantity" ASC, product."name" ASC
        LIMIT 5
      `,

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
          customer: { select: { id: true, name: true } },
        },
      }),
    ]);

    // --- Shape response ---

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

    return {
      counts: {
        products: toCount(headlineCounts[0]?.productCount),
        customers: toCount(headlineCounts[0]?.customerCount),
        suppliers: toCount(headlineCounts[0]?.supplierCount),
        warehouses: toCount(headlineCounts[0]?.warehouseCount),
      },
      inventory: {
        availableQuantity,
        reservedQuantity,
        lowStockCount,
        lowStockItems: formattedLowStockItems,
      },
      orders: {
        activeCount: toCount(headlineCounts[0]?.activeOrderCount),
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
        draftCount: toCount(headlineCounts[0]?.draftPurchaseCount),
      },
    };
  }
}
