import { Prisma, OrderStatus } from '@prisma/client';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const tenantId = 'tenant-1';

  let service: DashboardService;
  let prisma: {
    $queryRaw: jest.Mock;
    inventoryItem: {
      aggregate: jest.Mock;
    };
    order: {
      groupBy: jest.Mock;
      findMany: jest.Mock;
      aggregate: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      $queryRaw: jest.fn(),
      inventoryItem: {
        aggregate: jest.fn(),
      },
      order: {
        groupBy: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
    };

    service = new DashboardService(prisma as never);
  });

  it('builds a tenant-scoped analytics summary with shaped monthly, funnel, and heatmap data', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          productCount: BigInt(4),
          customerCount: BigInt(8),
          supplierCount: BigInt(3),
          warehouseCount: BigInt(2),
          activeOrderCount: BigInt(5),
          draftPurchaseCount: BigInt(1),
        },
      ])
      .mockResolvedValueOnce([{ total: new Prisma.Decimal('25800000.00') }])
      .mockResolvedValueOnce([{ count: BigInt(2) }])
      .mockResolvedValueOnce([
        {
          id: 'inventory-1',
          productId: 'product-1',
          warehouseId: 'warehouse-1',
          productName: 'Widget',
          productSku: 'WID-1',
          warehouseName: 'Main',
          quantity: 3,
          reservedQuantity: 1,
          minStock: 5,
        },
      ])
      .mockResolvedValueOnce([
        { month: new Date('2026-04-01T00:00:00.000Z'), total: new Prisma.Decimal('1450000.00') },
        { month: new Date('2026-05-01T00:00:00.000Z'), total: new Prisma.Decimal('2450000.00') },
      ])
      .mockResolvedValueOnce([
        { month: new Date('2026-04-01T00:00:00.000Z'), total: new Prisma.Decimal('210000.00') },
        { month: new Date('2026-05-01T00:00:00.000Z'), total: new Prisma.Decimal('430000.00') },
      ])
      .mockResolvedValueOnce([
        {
          customersCreated: BigInt(10),
          customersWithOrders: BigInt(8),
          customersWithProgressedOrders: BigInt(6),
          customersWithDeliveredOrders: BigInt(4),
          repeatBuyers: BigInt(2),
        },
      ])
      .mockResolvedValueOnce([
        { dayOfWeek: 1, hourOfDay: 9, count: BigInt(3) },
        { dayOfWeek: 3, hourOfDay: 11, count: BigInt(7) },
      ]);

    prisma.inventoryItem.aggregate.mockResolvedValue({
      _sum: {
        quantity: 30,
        reservedQuantity: 12,
      },
    });

    prisma.order.groupBy.mockResolvedValue([
      { status: OrderStatus.DRAFT, _count: { _all: 1 } },
      { status: OrderStatus.CONFIRMED, _count: { _all: 2 } },
      { status: OrderStatus.SHIPPED, _count: { _all: 1 } },
    ]);

    prisma.order.findMany.mockResolvedValue([
      {
        id: 'order-1',
        status: OrderStatus.CONFIRMED,
        customerId: 'customer-1',
        totalAmount: new Prisma.Decimal('500000.00'),
        createdAt: new Date('2026-05-02T00:00:00.000Z'),
        updatedAt: new Date('2026-05-03T00:00:00.000Z'),
        customer: { id: 'customer-1', name: 'Acme' },
      },
    ]);

    prisma.order.aggregate.mockResolvedValue({
      _sum: {
        totalAmount: new Prisma.Decimal('1450000.00'),
      },
    });

    const summary = await service.getSummary(tenantId);

    expect(summary.counts).toEqual({
      products: 4,
      customers: 8,
      suppliers: 3,
      warehouses: 2,
    });
    expect(summary.inventory.estimatedValue).toBe(25800000);
    expect(summary.inventory.lowStockCount).toBe(2);
    expect(summary.inventory.lowStockItems[0]).toEqual(
      expect.objectContaining({
        productName: 'Widget',
        status: 'low-stock',
      }),
    );
    expect(summary.orders.activeCount).toBe(5);
    expect(summary.orders.byStatus).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Draft', value: 1 }),
        expect.objectContaining({ name: 'Confirmed', value: 2 }),
        expect.objectContaining({ name: 'Shipped', value: 1 }),
        expect.objectContaining({ name: 'Delivered', value: 0 }),
      ]),
    );
    expect(summary.analytics.sales.totalRevenue).toBe(1450000);
    expect(summary.analytics.monthly).toHaveLength(12);
    expect(summary.analytics.monthly.at(-1)).toEqual(
      expect.objectContaining({
        orders: 2450000,
        purchases: 430000,
        net: 2020000,
      }),
    );
    expect(summary.analytics.customerFunnel).toEqual([
      { label: 'Customers Created', count: 10, value: 100 },
      { label: 'Customers With Orders', count: 8, value: 80 },
      { label: 'Customers In Fulfillment', count: 6, value: 60 },
      { label: 'Customers With Delivered Orders', count: 4, value: 40 },
      { label: 'Repeat Buyers', count: 2, value: 20 },
    ]);
    expect(summary.analytics.orderFrequency.hours).toEqual([
      '9.00',
      '10.00',
      '11.00',
      '12.00',
      '13.00',
      '14.00',
    ]);
    expect(summary.analytics.orderFrequency.values[0][1]).toBe(3);
    expect(summary.analytics.orderFrequency.values[2][3]).toBe(7);

    expect(prisma.inventoryItem.aggregate).toHaveBeenCalledWith({
      where: { tenantId },
      _sum: { quantity: true, reservedQuantity: true },
    });
    expect(prisma.order.groupBy).toHaveBeenCalledWith({
      by: ['status'],
      where: { tenantId },
      _count: { _all: true },
    });
  });

  it('returns safe zeroed analytics when the source queries come back empty', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          productCount: BigInt(0),
          customerCount: BigInt(0),
          supplierCount: BigInt(0),
          warehouseCount: BigInt(0),
          activeOrderCount: BigInt(0),
          draftPurchaseCount: BigInt(0),
        },
      ])
      .mockResolvedValueOnce([{ total: null }])
      .mockResolvedValueOnce([{ count: null }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          customersCreated: BigInt(0),
          customersWithOrders: BigInt(0),
          customersWithProgressedOrders: BigInt(0),
          customersWithDeliveredOrders: BigInt(0),
          repeatBuyers: BigInt(0),
        },
      ])
      .mockResolvedValueOnce([]);

    prisma.inventoryItem.aggregate.mockResolvedValue({
      _sum: {
        quantity: null,
        reservedQuantity: null,
      },
    });

    prisma.order.groupBy.mockResolvedValue([]);
    prisma.order.findMany.mockResolvedValue([]);
    prisma.order.aggregate.mockResolvedValue({
      _sum: {
        totalAmount: null,
      },
    });

    const summary = await service.getSummary(tenantId);

    expect(summary.inventory).toEqual(
      expect.objectContaining({
        availableQuantity: 0,
        reservedQuantity: 0,
        estimatedValue: 0,
        lowStockCount: 0,
        lowStockItems: [],
      }),
    );
    expect(summary.analytics.customerFunnel.every((step) => step.value === 0)).toBe(true);
    expect(summary.analytics.orderFrequency.values).toHaveLength(6);
    expect(summary.analytics.orderFrequency.values.every((row) => row.every((value) => value === 0))).toBe(true);
  });
});
