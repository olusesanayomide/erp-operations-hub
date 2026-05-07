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

function toDecimal(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return new Prisma.Decimal(0);
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function toCount(value: bigint | number | string | null | undefined) {
  if (value == null) return 0;
  return Number(value);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function monthKey(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

function monthLabel(date: Date) {
  return date.toLocaleString('en-US', { month: 'short' });
}

type DashboardHeadlineCounts = {
  productCount: bigint;
  customerCount: bigint;
  supplierCount: bigint;
  warehouseCount: bigint;
  activeOrderCount: bigint;
  draftPurchaseCount: bigint;
};

type MonthlyOrderTotal = {
  month: Date;
  total: Prisma.Decimal | number | string | null;
};

type MonthlyPurchaseTotal = {
  month: Date;
  total: Prisma.Decimal | number | string | null;
};

type InventoryValueTotal = {
  total: Prisma.Decimal | number | string | null;
};

const SALES_STATUSES = [
  OrderStatus.CONFIRMED,
  OrderStatus.PICKED,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

const PURCHASE_EXPENSE_STATUSES = [
  PurchaseStatus.CONFIRMED,
  PurchaseStatus.SHIPPED,
  PurchaseStatus.RECEIVED,
];
const FUNNEL_PROGRESS_STATUSES = [
  OrderStatus.CONFIRMED,
  OrderStatus.PICKED,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];
const HEATMAP_HOURS = [9, 10, 11, 12, 13, 14];
const HEATMAP_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
    const now = new Date();

    // A single raw query aggregates all headline counts in one DB round-trip,
    // avoiding N separate COUNT queries over the Supabase network connection.
    const headlineCounts = await this.prisma.$queryRaw<
      DashboardHeadlineCounts[]
    >`
      SELECT
        (SELECT COUNT(*)::bigint FROM "Product"   WHERE "tenantId" = ${tenantId} AND "archivedAt" IS NULL) AS "productCount",
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
      inventoryValueTotals,
      lowStockCountResult,
      lowStockItems,
      orderStatusGroups,
      recentOrders,
      salesTotals,
      monthlyOrderTotals,
      monthlyPurchaseTotals,
      customerFunnelCounts,
      orderFrequencyRows,
    ] = await Promise.all([
      this.prisma.inventoryItem.aggregate({
        where: { tenantId },
        _sum: { quantity: true, reservedQuantity: true },
      }),

      this.prisma.$queryRaw<InventoryValueTotal[]>`
        SELECT COALESCE(SUM((inventory."quantity" + inventory."reservedQuantity") * product."price"), 0) AS "total"
        FROM "InventoryItem" inventory
        INNER JOIN "Product" product ON product."id" = inventory."productId"
        WHERE inventory."tenantId" = ${tenantId}
          AND product."archivedAt" IS NULL
      `,

      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS "count"
        FROM "InventoryItem" inventory
        INNER JOIN "Product" product ON product."id" = inventory."productId"
        WHERE inventory."tenantId" = ${tenantId}
          AND product."archivedAt" IS NULL
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
          AND product."archivedAt" IS NULL
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

      this.prisma.order.aggregate({
        where: {
          tenantId,
          status: { in: SALES_STATUSES },
        },
        _sum: { totalAmount: true },
      }),

      this.prisma.$queryRaw<MonthlyOrderTotal[]>`
        SELECT DATE_TRUNC('month', "createdAt") AS "month", COALESCE(SUM("totalAmount"), 0) AS "total"
        FROM "Order"
        WHERE "tenantId" = ${tenantId}
          AND "status" IN (${Prisma.join(SALES_STATUSES.map((status) => Prisma.sql`${status}::"OrderStatus"`))})
          AND "createdAt" >= ${startOfMonth(new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1))}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY DATE_TRUNC('month', "createdAt") ASC
      `,

      this.prisma.$queryRaw<MonthlyPurchaseTotal[]>`
        SELECT DATE_TRUNC('month', "createdAt") AS "month", COALESCE(SUM("totalAmount"), 0) AS "total"
        FROM "Purchase"
        WHERE "tenantId" = ${tenantId}
          AND "status" IN (${Prisma.join(PURCHASE_EXPENSE_STATUSES.map((status) => Prisma.sql`${status}::"PurchaseStatus"`))})
          AND "createdAt" >= ${startOfMonth(new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1))}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY DATE_TRUNC('month', "createdAt") ASC
      `,

      this.prisma.$queryRaw<
        Array<{
          customersCreated: bigint;
          customersWithOrders: bigint;
          customersWithProgressedOrders: bigint;
          customersWithDeliveredOrders: bigint;
          repeatBuyers: bigint;
        }>
      >`
        SELECT
          (SELECT COUNT(*)::bigint FROM "Customer" WHERE "tenantId" = ${tenantId} AND "archivedAt" IS NULL) AS "customersCreated",
          (
            SELECT COUNT(DISTINCT "customerId")::bigint
            FROM "Order"
            WHERE "tenantId" = ${tenantId}
              AND "customerId" IS NOT NULL
          ) AS "customersWithOrders",
          (
            SELECT COUNT(DISTINCT "customerId")::bigint
            FROM "Order"
            WHERE "tenantId" = ${tenantId}
              AND "customerId" IS NOT NULL
              AND "status" IN (${Prisma.join(FUNNEL_PROGRESS_STATUSES.map((status) => Prisma.sql`${status}::"OrderStatus"`))})
          ) AS "customersWithProgressedOrders",
          (
            SELECT COUNT(DISTINCT "customerId")::bigint
            FROM "Order"
            WHERE "tenantId" = ${tenantId}
              AND "customerId" IS NOT NULL
              AND "status" = ${OrderStatus.DELIVERED}::"OrderStatus"
          ) AS "customersWithDeliveredOrders",
          (
            SELECT COUNT(*)::bigint
            FROM (
              SELECT "customerId"
              FROM "Order"
              WHERE "tenantId" = ${tenantId}
                AND "customerId" IS NOT NULL
                AND "status" = ${OrderStatus.DELIVERED}::"OrderStatus"
              GROUP BY "customerId"
              HAVING COUNT(*) >= 2
            ) delivered_buyers
          ) AS "repeatBuyers"
      `,

      this.prisma.$queryRaw<
        Array<{
          dayOfWeek: number;
          hourOfDay: number;
          count: bigint;
        }>
      >`
        SELECT
          EXTRACT(DOW FROM "createdAt")::int AS "dayOfWeek",
          EXTRACT(HOUR FROM "createdAt")::int AS "hourOfDay",
          COUNT(*)::bigint AS "count"
        FROM "Order"
        WHERE "tenantId" = ${tenantId}
          AND "createdAt" >= ${new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)}
        GROUP BY EXTRACT(DOW FROM "createdAt"), EXTRACT(HOUR FROM "createdAt")
      `,
    ]);

    // --- Shape response ---

    const availableQuantity = inventoryTotals._sum.quantity ?? 0;
    const reservedQuantity = inventoryTotals._sum.reservedQuantity ?? 0;
    const inventoryValue = toNumber(inventoryValueTotals[0]?.total);
    const lowStockCount = toCount(lowStockCountResult[0]?.count);
    const totalSales = toNumber(salesTotals._sum.totalAmount);

    const firstMonth = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 11, 1));
    const monthlyOrdersByKey = new Map(
      monthlyOrderTotals.map((item) => [monthKey(new Date(item.month)), toDecimal(item.total)]),
    );
    const monthlyPurchasesByKey = new Map(
      monthlyPurchaseTotals.map((item) => [monthKey(new Date(item.month)), toDecimal(item.total)]),
    );

    const monthly = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
      const key = monthKey(date);
      const orders = monthlyOrdersByKey.get(key) ?? new Prisma.Decimal(0);
      const purchases = monthlyPurchasesByKey.get(key) ?? new Prisma.Decimal(0);
      const net = orders.minus(purchases);

      return {
        key,
        label: monthLabel(date),
        orders: toNumber(orders),
        purchases: toNumber(purchases),
        net: toNumber(net),
      };
    });

    const funnelBase = Math.max(toCount(customerFunnelCounts[0]?.customersCreated), 1);
    const funnelSteps = [
      { label: 'Customers Created', count: toCount(customerFunnelCounts[0]?.customersCreated) },
      { label: 'Customers With Orders', count: toCount(customerFunnelCounts[0]?.customersWithOrders) },
      { label: 'Customers In Fulfillment', count: toCount(customerFunnelCounts[0]?.customersWithProgressedOrders) },
      { label: 'Customers With Delivered Orders', count: toCount(customerFunnelCounts[0]?.customersWithDeliveredOrders) },
      { label: 'Repeat Buyers', count: toCount(customerFunnelCounts[0]?.repeatBuyers) },
    ].map((step) => ({
      ...step,
      value: Number(((step.count / funnelBase) * 100).toFixed(1)),
    }));

    const frequencyLookup = new Map(
      orderFrequencyRows.map((row) => [`${row.hourOfDay}-${row.dayOfWeek}`, toCount(row.count)]),
    );
    const frequencyValues = HEATMAP_HOURS.map((hour) =>
      Array.from({ length: 7 }, (_, day) => frequencyLookup.get(`${hour}-${day}`) ?? 0),
    );

    const currentMonth = monthly[monthly.length - 1];
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

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
        estimatedValue: inventoryValue,
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
      analytics: {
        sales: {
          totalRevenue: totalSales,
          monthRevenue: currentMonth?.orders ?? 0,
          periodStart: currentMonthStart,
          periodEnd: currentMonthEnd,
        },
        purchasing: {
          monthSpend: currentMonth?.purchases ?? 0,
        },
        monthly,
        customerFunnel: funnelSteps,
        orderFrequency: {
          days: HEATMAP_DAYS,
          hours: HEATMAP_HOURS.map((hour) => `${hour}.00`),
          values: frequencyValues,
        },
      },
    };
  }
}
