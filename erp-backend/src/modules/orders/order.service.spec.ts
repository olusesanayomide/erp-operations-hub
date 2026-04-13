import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './order.service';
import { OrderLifecycleStatus } from './order-status.enum';

describe('OrdersService.updateStatus', () => {
  const tenantId = 'tenant-1';
  const orderId = 'order-1';

  let service: OrdersService;
  let prisma: {
    $transaction: jest.Mock;
    order: { findFirst: jest.Mock; update: jest.Mock };
    inventoryItem: { updateMany: jest.Mock };
    stockMovement: { create: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      order: { findFirst: jest.fn(), update: jest.fn() },
      inventoryItem: { updateMany: jest.fn() },
      stockMovement: { create: jest.fn() },
    };

    prisma.$transaction.mockImplementation(async (operation: any) => {
      if (typeof operation === 'function') {
        return operation(prisma as any);
      }

      return Promise.all(operation);
    });

    service = new OrdersService(prisma as any);
  });

  it('confirms draft order and reserves stock atomically', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: orderId,
      status: OrderLifecycleStatus.DRAFT,
      items: [{ productId: 'p-1', warehouseId: 'w-1', quantity: 3 }],
    });
    prisma.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    prisma.order.update.mockResolvedValue({
      id: orderId,
      status: OrderLifecycleStatus.CONFIRMED,
    });

    const result = await service.updateStatus(
      tenantId,
      orderId,
      OrderLifecycleStatus.CONFIRMED,
    );

    expect(result.status).toBe(OrderLifecycleStatus.CONFIRMED);
    expect(prisma.inventoryItem.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId,
        productId: 'p-1',
        warehouseId: 'w-1',
        quantity: { gte: 3 },
      },
      data: {
        quantity: { decrement: 3 },
        reservedQuantity: { increment: 3 },
      },
    });
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: orderId },
      data: { status: OrderLifecycleStatus.CONFIRMED },
    });
  });

  it('ships picked order and consumes reserved stock atomically', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: orderId,
      status: OrderLifecycleStatus.PICKED,
      items: [{ productId: 'p-1', warehouseId: 'w-1', quantity: 3 }],
    });
    prisma.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    prisma.stockMovement.create.mockResolvedValue({});
    prisma.order.update.mockResolvedValue({
      id: orderId,
      status: OrderLifecycleStatus.SHIPPED,
    });

    const result = await service.updateStatus(
      tenantId,
      orderId,
      OrderLifecycleStatus.SHIPPED,
    );

    expect(result.status).toBe(OrderLifecycleStatus.SHIPPED);
    expect(prisma.inventoryItem.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId,
        productId: 'p-1',
        warehouseId: 'w-1',
        reservedQuantity: { gte: 3 },
      },
      data: {
        reservedQuantity: { decrement: 3 },
      },
    });
    expect(prisma.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId,
        productId: 'p-1',
        warehouseId: 'w-1',
        quantity: -3,
        type: 'OUT',
        reference: `Order ${orderId} shipped`,
      }),
    });
  });

  it('does not update shipped status when stock consumption fails', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: orderId,
      status: OrderLifecycleStatus.PICKED,
      items: [{ productId: 'p-1', warehouseId: 'w-1', quantity: 10 }],
    });
    prisma.inventoryItem.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.updateStatus(tenantId, orderId, OrderLifecycleStatus.SHIPPED),
    ).rejects.toThrow(new BadRequestException('Insufficient reserved stock'));

    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('cancels confirmed order and releases reserved stock', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: orderId,
      status: OrderLifecycleStatus.CONFIRMED,
      items: [{ productId: 'p-1', warehouseId: 'w-1', quantity: 2 }],
    });
    prisma.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    prisma.order.update.mockResolvedValue({
      id: orderId,
      status: OrderLifecycleStatus.CANCELLED,
    });

    const result = await service.updateStatus(
      tenantId,
      orderId,
      OrderLifecycleStatus.CANCELLED,
    );

    expect(result.status).toBe(OrderLifecycleStatus.CANCELLED);
    expect(prisma.inventoryItem.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId,
        productId: 'p-1',
        warehouseId: 'w-1',
        reservedQuantity: { gte: 2 },
      },
      data: {
        quantity: { increment: 2 },
        reservedQuantity: { decrement: 2 },
      },
    });
  });
});

describe('OrdersService.createOrder', () => {
  const tenantId = 'tenant-1';

  let service: OrdersService;
  let prisma: {
    $transaction: jest.Mock;
    customer: { findFirst: jest.Mock };
    product: { findMany: jest.Mock };
    warehouse: { findMany: jest.Mock };
    order: { create: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      customer: { findFirst: jest.fn() },
      product: { findMany: jest.fn() },
      warehouse: { findMany: jest.fn() },
      order: { create: jest.fn() },
    };

    prisma.$transaction.mockImplementation(async (operation: any) => {
      if (typeof operation === 'function') {
        return operation(prisma as any);
      }

      return Promise.all(operation);
    });

    service = new OrdersService(prisma as any);
  });

  it('creates an order with items atomically in a single transaction', async () => {
    prisma.customer.findFirst.mockResolvedValue({ id: 'customer-1' });
    prisma.product.findMany.mockResolvedValue([
      { id: 'product-1', price: 12.5 },
      { id: 'product-2', price: 7.25 },
    ]);
    prisma.warehouse.findMany.mockResolvedValue([{ id: 'warehouse-1' }]);
    prisma.order.create.mockResolvedValue({
      id: 'order-1',
      items: [
        {
          id: 'item-1',
          productId: 'product-1',
          quantity: 2,
          warehouseId: 'warehouse-1',
          price: 12.5,
        },
        {
          id: 'item-2',
          productId: 'product-2',
          quantity: 1,
          warehouseId: 'warehouse-1',
          price: 7.25,
        },
      ],
    });

    const result = await service.createOrder(tenantId, {
      customerId: 'customer-1',
      items: [
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 2 },
        { productId: 'product-2', warehouseId: 'warehouse-1', quantity: 1 },
      ],
    });

    expect(result.id).toBe('order-1');
    expect(prisma.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId,
        customerId: 'customer-1',
        status: OrderLifecycleStatus.DRAFT,
        items: {
          create: [
            expect.objectContaining({
              productId: 'product-1',
              warehouseId: 'warehouse-1',
              quantity: 2,
            }),
            expect.objectContaining({
              productId: 'product-2',
              warehouseId: 'warehouse-1',
              quantity: 1,
            }),
          ],
        },
      }),
      include: { items: true },
    });
  });

  it('rejects order creation when no items are provided', async () => {
    await expect(
      service.createOrder(tenantId, {
        customerId: 'customer-1',
        items: [],
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Add at least one item before creating the order',
      ),
    );

    expect(prisma.order.create).not.toHaveBeenCalled();
  });
});
