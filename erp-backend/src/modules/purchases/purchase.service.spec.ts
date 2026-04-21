import { BadRequestException } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { PurchaseLifecycleStatus } from './purchase-status.enum';

describe('PurchaseService.createPurchase', () => {
  const tenantId = 'tenant-1';
  const userId = 'user-1';

  let service: PurchaseService;
  let prisma: {
    $transaction: jest.Mock;
    supplier: { findFirst: jest.Mock };
    warehouse: { findFirst: jest.Mock };
    product: { findMany: jest.Mock };
    purchase: { count: jest.Mock; create: jest.Mock };
  };
  let notificationsService: { createForTenant: jest.Mock };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      supplier: { findFirst: jest.fn() },
      warehouse: { findFirst: jest.fn() },
      product: { findMany: jest.fn() },
      purchase: { count: jest.fn(), create: jest.fn() },
    };
    notificationsService = { createForTenant: jest.fn() };

    prisma.$transaction.mockImplementation(async (operation: any) =>
      operation(prisma as any),
    );

    service = new PurchaseService(prisma as any, notificationsService as any);
  });

  it('rejects purchase creation when any product is outside tenant scope', async () => {
    prisma.supplier.findFirst.mockResolvedValue({ id: 's-1' });
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'w-1' });
    prisma.product.findMany.mockResolvedValue([{ id: 'p-1' }]);

    await expect(
      service.createPurchase(tenantId, userId, {
        purchaseOrder: 'PO-001',
        supplierId: 's-1',
        warehouseId: 'w-1',
        items: [
          { productId: 'p-1', quantity: 2, price: 10.5 },
          { productId: 'p-2', quantity: 1, price: 30 },
        ],
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'One or more products do not exist in the current tenant.',
      ),
    );

    expect(prisma.purchase.create).not.toHaveBeenCalled();
  });

  it('creates purchase when supplier, warehouse, and products are valid', async () => {
    prisma.supplier.findFirst.mockResolvedValue({ id: 's-1' });
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'w-1' });
    prisma.product.findMany.mockResolvedValue([{ id: 'p-1' }, { id: 'p-2' }]);
    prisma.purchase.create.mockResolvedValue({ id: 'purchase-1' });

    const result = await service.createPurchase(tenantId, userId, {
      purchaseOrder: 'PO-002',
      supplierId: 's-1',
      warehouseId: 'w-1',
      items: [
        { productId: 'p-1', quantity: 2, price: 10.5 },
        { productId: 'p-2', quantity: 1, price: 30 },
      ],
    });

    expect(result).toEqual({ id: 'purchase-1' });
    expect(prisma.purchase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId,
          purchaseOrder: 'PO-002',
          supplierId: 's-1',
          warehouseId: 'w-1',
          status: 'DRAFT',
        }),
      }),
    );
  });
});

describe('PurchaseService.updateStatus', () => {
  const tenantId = 'tenant-1';
  const userId = 'user-1';
  const purchaseId = 'purchase-1';

  let service: PurchaseService;
  let prisma: {
    $transaction: jest.Mock;
    purchase: { findFirst: jest.Mock; update: jest.Mock };
    stockMovement: { createMany: jest.Mock };
    inventoryItem: { upsert: jest.Mock };
  };
  let notificationsService: { createForTenant: jest.Mock };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      purchase: { findFirst: jest.fn(), update: jest.fn() },
      stockMovement: { createMany: jest.fn() },
      inventoryItem: { upsert: jest.fn() },
    };
    notificationsService = { createForTenant: jest.fn() };

    prisma.$transaction.mockImplementation(async (operation: any) => {
      if (typeof operation === 'function') {
        return operation(prisma as any);
      }

      return Promise.all(operation);
    });

    service = new PurchaseService(prisma as any, notificationsService as any);
  });

  it('blocks draft purchases from jumping straight to received', async () => {
    prisma.purchase.findFirst.mockResolvedValue({
      id: purchaseId,
      status: PurchaseLifecycleStatus.DRAFT,
      items: [],
    });

    await expect(
      service.receivePurchase(tenantId, userId, purchaseId),
    ).rejects.toThrow(
      new BadRequestException(
        `Invalid status transition from ${PurchaseLifecycleStatus.DRAFT} to ${PurchaseLifecycleStatus.RECEIVED}`,
      ),
    );
  });

  it('receives purchases with batched stock movements and aggregated inventory upserts', async () => {
    prisma.purchase.findFirst.mockResolvedValue({
      id: purchaseId,
      status: PurchaseLifecycleStatus.CONFIRMED,
      purchaseOrder: 'PO-001',
      warehouseId: 'warehouse-1',
      updatedAt: new Date('2026-04-21T10:00:00.000Z'),
      items: [
        { productId: 'p-1', quantity: 2 },
        { productId: 'p-1', quantity: 3 },
        { productId: 'p-2', quantity: 4 },
      ],
    });
    prisma.purchase.update.mockResolvedValue({});
    prisma.stockMovement.createMany.mockResolvedValue({ count: 3 });
    prisma.inventoryItem.upsert.mockResolvedValue({});
    notificationsService.createForTenant.mockResolvedValue({});

    const result = await service.receivePurchase(tenantId, userId, purchaseId);

    expect(result).toEqual({
      success: true,
      message: 'Purchase order received and stock updated',
    });
    expect(prisma.stockMovement.createMany).toHaveBeenCalledWith({
      data: [
        {
          tenantId,
          productId: 'p-1',
          warehouseId: 'warehouse-1',
          quantity: 2,
          type: 'IN',
          reference: 'Purchase Order PO-001',
        },
        {
          tenantId,
          productId: 'p-1',
          warehouseId: 'warehouse-1',
          quantity: 3,
          type: 'IN',
          reference: 'Purchase Order PO-001',
        },
        {
          tenantId,
          productId: 'p-2',
          warehouseId: 'warehouse-1',
          quantity: 4,
          type: 'IN',
          reference: 'Purchase Order PO-001',
        },
      ],
    });
    expect(prisma.inventoryItem.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.inventoryItem.upsert).toHaveBeenCalledWith({
      where: {
        tenantId_productId_warehouseId: {
          tenantId,
          productId: 'p-1',
          warehouseId: 'warehouse-1',
        },
      },
      update: {
        quantity: { increment: 5 },
      },
      create: {
        tenantId,
        productId: 'p-1',
        warehouseId: 'warehouse-1',
        quantity: 5,
        reservedQuantity: 0,
      },
    });
    expect(prisma.inventoryItem.upsert).toHaveBeenCalledWith({
      where: {
        tenantId_productId_warehouseId: {
          tenantId,
          productId: 'p-2',
          warehouseId: 'warehouse-1',
        },
      },
      update: {
        quantity: { increment: 4 },
      },
      create: {
        tenantId,
        productId: 'p-2',
        warehouseId: 'warehouse-1',
        quantity: 4,
        reservedQuantity: 0,
      },
    });
  });

  it('allows confirmed purchases to move to shipped', async () => {
    prisma.purchase.findFirst.mockResolvedValue({
      id: purchaseId,
      status: PurchaseLifecycleStatus.CONFIRMED,
    });
    prisma.purchase.update.mockResolvedValue({
      id: purchaseId,
      status: PurchaseLifecycleStatus.SHIPPED,
    });

    const result = await service.updateStatus(
      tenantId,
      userId,
      purchaseId,
      PurchaseLifecycleStatus.SHIPPED,
    );

    expect((result as { status: PurchaseLifecycleStatus }).status).toBe(
      PurchaseLifecycleStatus.SHIPPED,
    );
    expect(prisma.purchase.update).toHaveBeenCalledWith({
      where: { id: purchaseId },
      data: { status: PurchaseLifecycleStatus.SHIPPED },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        supplier: true,
        warehouse: true,
      },
    });
  });
});
