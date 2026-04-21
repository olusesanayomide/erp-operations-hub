import { BadRequestException } from '@nestjs/common';
import { StockMovementType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { InventoryService } from './inventory.service';

describe('InventoryService stockOut', () => {
  let service: InventoryService;
  const tenantId = 'tenant-1';
  let prisma: {
    product: { findFirst: jest.Mock };
    warehouse: { findFirst: jest.Mock };
    inventoryItem: { updateMany: jest.Mock };
    stockMovement: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      product: { findFirst: jest.fn() },
      warehouse: { findFirst: jest.fn() },
      inventoryItem: { updateMany: jest.fn() },
      stockMovement: { create: jest.fn() },
      $transaction: jest.fn(),
    };

    prisma.$transaction.mockImplementation((operation: unknown) => {
      if (typeof operation === 'function') {
        return (operation as (client: typeof prisma) => unknown)(prisma);
      }

      return Promise.all(operation as Promise<unknown>[]);
    });

    service = new InventoryService(prisma as unknown as PrismaService);
  });

  it('deducts stock with an atomic quantity guard', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'w1' });
    prisma.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    prisma.stockMovement.create.mockResolvedValue({
      id: 'movement-1',
      type: StockMovementType.OUT,
    });

    const result = await service.stockOut(tenantId, 'p1', 'w1', 4);

    expect(result).toEqual({ id: 'movement-1', type: StockMovementType.OUT });
    expect(prisma.inventoryItem.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId,
        productId: 'p1',
        warehouseId: 'w1',
        quantity: { gte: 4 },
      },
      data: {
        quantity: { decrement: 4 },
      },
    });
    expect(prisma.stockMovement.create).toHaveBeenCalledWith({
      data: {
        tenantId,
        productId: 'p1',
        warehouseId: 'w1',
        quantity: -4,
        type: StockMovementType.OUT,
        reference: 'STOCK_OUT',
      },
    });
  });

  it('rejects without creating a movement when stock is missing or insufficient', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'w1' });
    prisma.inventoryItem.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.stockOut(tenantId, 'p1', 'w1', 4)).rejects.toThrow(
      new BadRequestException('Insufficient stock'),
    );

    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
  });
});

describe('InventoryService transferStock', () => {
  let service: InventoryService;
  const tenantId = 'tenant-1';
  let prisma: {
    product: { findFirst: jest.Mock };
    warehouse: { findFirst: jest.Mock };
    inventoryItem: { upsert: jest.Mock; updateMany: jest.Mock };
    stockMovement: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      product: { findFirst: jest.fn() },
      warehouse: { findFirst: jest.fn() },
      inventoryItem: { upsert: jest.fn(), updateMany: jest.fn() },
      stockMovement: { create: jest.fn() },
      $transaction: jest.fn(),
    };

    prisma.$transaction.mockImplementation(async (operation: any) => {
      if (typeof operation === 'function') {
        return operation(prisma as any);
      }

      return Promise.all(operation);
    });

    service = new InventoryService(prisma as any);
  });

  it('transfers stock when destination inventory already exists', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.warehouse.findFirst
      .mockResolvedValueOnce({ id: 'w1', name: 'Main' })
      .mockResolvedValueOnce({ id: 'w2', name: 'Overflow' });
    prisma.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    prisma.stockMovement.create
      .mockResolvedValueOnce({
        id: 'm1',
        type: StockMovementType.OUT,
        warehouseId: 'w1',
        quantity: -5,
      })
      .mockResolvedValueOnce({
        id: 'm2',
        type: StockMovementType.IN,
        warehouseId: 'w2',
        quantity: 5,
      });
    prisma.inventoryItem.upsert.mockResolvedValue({});

    const result = await service.transferStock(
      tenantId,
      'p1',
      'w1',
      'w2',
      5,
      'Rebalance',
    );

    expect(result.success).toBe(true);
    expect(result.movements).toHaveLength(2);
    expect(prisma.stockMovement.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        productId: 'p1',
        warehouseId: 'w1',
        quantity: -5,
        type: StockMovementType.OUT,
        reference: expect.stringContaining('NOTE:Rebalance'),
      }),
    });
    expect(prisma.stockMovement.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        productId: 'p1',
        warehouseId: 'w2',
        quantity: 5,
        type: StockMovementType.IN,
        reference: expect.stringContaining('FROM:Main'),
      }),
    });
    expect(prisma.inventoryItem.upsert).toHaveBeenCalledWith({
      where: {
        tenantId_productId_warehouseId: {
          tenantId,
          productId: 'p1',
          warehouseId: 'w2',
        },
      },
      update: {
        quantity: {
          increment: 5,
        },
      },
      create: {
        tenantId,
        productId: 'p1',
        warehouseId: 'w2',
        quantity: 5,
        reservedQuantity: 0,
      },
    });
    expect(prisma.inventoryItem.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId,
        productId: 'p1',
        warehouseId: 'w1',
        quantity: { gte: 5 },
      },
      data: {
        quantity: { decrement: 5 },
      },
    });
  });

  it('creates destination inventory when it does not exist', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.warehouse.findFirst
      .mockResolvedValueOnce({ id: 'w1', name: 'Main' })
      .mockResolvedValueOnce({ id: 'w3', name: 'Remote' });
    prisma.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    prisma.stockMovement.create.mockResolvedValue({});
    prisma.inventoryItem.upsert.mockResolvedValue({});

    await service.transferStock(
      tenantId,
      'p1',
      'w1',
      'w3',
      3,
      'Stock balancing',
    );

    expect(prisma.inventoryItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          tenantId,
          productId: 'p1',
          warehouseId: 'w3',
          quantity: 3,
          reservedQuantity: 0,
        },
      }),
    );
  });

  it('rejects transfer when source inventory row is missing or insufficient', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.warehouse.findFirst
      .mockResolvedValueOnce({ id: 'w1', name: 'Main' })
      .mockResolvedValueOnce({ id: 'w2', name: 'Overflow' });
    prisma.inventoryItem.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.transferStock(tenantId, 'p1', 'w1', 'w2', 5, 'Move stock'),
    ).rejects.toThrow(
      new BadRequestException('Insufficient stock in source warehouse'),
    );
  });

  it('rejects transfers with insufficient stock', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.warehouse.findFirst
      .mockResolvedValueOnce({ id: 'w1', name: 'Main' })
      .mockResolvedValueOnce({ id: 'w2', name: 'Overflow' });
    prisma.inventoryItem.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.transferStock(tenantId, 'p1', 'w1', 'w2', 5, 'Rebalance'),
    ).rejects.toThrow(
      new BadRequestException('Insufficient stock in source warehouse'),
    );
  });

  it('rejects same-warehouse transfers', async () => {
    await expect(
      service.transferStock(tenantId, 'p1', 'w1', 'w1', 1, 'Rebalance'),
    ).rejects.toThrow(
      new BadRequestException(
        'Source and destination warehouses must be different',
      ),
    );
  });

  it('rejects blank notes', async () => {
    await expect(
      service.transferStock(tenantId, 'p1', 'w1', 'w2', 1, '   '),
    ).rejects.toThrow(new BadRequestException('Transfer note is required'));
  });
});
