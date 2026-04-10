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
    inventoryItem: { updateMany: jest.Mock; upsert: jest.Mock };
    stockMovement: { create: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      order: { findFirst: jest.fn(), update: jest.fn() },
      inventoryItem: { updateMany: jest.fn(), upsert: jest.fn() },
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
    prisma.stockMovement.create.mockResolvedValue({});
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
      },
    });
    expect(prisma.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId,
        productId: 'p-1',
        warehouseId: 'w-1',
        quantity: -3,
        type: 'OUT',
      }),
    });
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: orderId },
      data: { status: OrderLifecycleStatus.CONFIRMED },
    });
  });

  it('does not update order status when stock reservation fails', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: orderId,
      status: OrderLifecycleStatus.DRAFT,
      items: [{ productId: 'p-1', warehouseId: 'w-1', quantity: 10 }],
    });
    prisma.inventoryItem.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.updateStatus(tenantId, orderId, OrderLifecycleStatus.CONFIRMED),
    ).rejects.toThrow(new BadRequestException('Insufficient stock'));

    expect(prisma.order.update).not.toHaveBeenCalled();
  });
});
