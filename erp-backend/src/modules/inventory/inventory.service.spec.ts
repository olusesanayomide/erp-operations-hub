import { BadRequestException } from '@nestjs/common';
import { StockMovementType } from '@prisma/client';
import { InventoryService } from './inventory.service';

describe('InventoryService transferStock', () => {
  let service: InventoryService;
  const tenantId = 'tenant-1';
  let prisma: {
    product: { findFirst: jest.Mock };
    warehouse: { findFirst: jest.Mock };
    inventoryItem: { upsert: jest.Mock };
    stockMovement: { create: jest.Mock; aggregate: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      product: { findFirst: jest.fn() },
      warehouse: { findFirst: jest.fn() },
      inventoryItem: { upsert: jest.fn() },
      stockMovement: {
        create: jest.fn(),
        aggregate: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    prisma.$transaction.mockImplementation(async (operations: any[]) =>
      Promise.all(operations),
    );

    service = new InventoryService(prisma as any);
  });

  it('transfers stock when destination inventory already exists', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.warehouse.findFirst
      .mockResolvedValueOnce({ id: 'w1', name: 'Main' })
      .mockResolvedValueOnce({ id: 'w2', name: 'Overflow' });
    prisma.stockMovement.aggregate
      .mockResolvedValueOnce({ _sum: { quantity: 20 } })
      .mockResolvedValueOnce({ _sum: { quantity: 4 } });
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
    expect(prisma.inventoryItem.upsert).toHaveBeenNthCalledWith(1, {
      where: {
        tenantId_productId_warehouseId: {
          tenantId,
          productId: 'p1',
          warehouseId: 'w1',
        },
      },
      update: {
        quantity: 15,
      },
      create: {
        tenantId,
        productId: 'p1',
        warehouseId: 'w1',
        quantity: 15,
      },
    });
    expect(prisma.inventoryItem.upsert).toHaveBeenNthCalledWith(2, {
      where: {
        tenantId_productId_warehouseId: {
          tenantId,
          productId: 'p1',
          warehouseId: 'w2',
        },
      },
      update: {
        quantity: 9,
      },
      create: {
        tenantId,
        productId: 'p1',
        warehouseId: 'w2',
        quantity: 9,
      },
    });
  });

  it('creates destination inventory when it does not exist', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.warehouse.findFirst
      .mockResolvedValueOnce({ id: 'w1', name: 'Main' })
      .mockResolvedValueOnce({ id: 'w3', name: 'Remote' });
    prisma.stockMovement.aggregate
      .mockResolvedValueOnce({ _sum: { quantity: 10 } })
      .mockResolvedValueOnce({ _sum: { quantity: 0 } });
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

    expect(prisma.inventoryItem.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        create: {
          tenantId,
          productId: 'p1',
          warehouseId: 'w3',
          quantity: 3,
        },
      }),
    );
  });

  it('creates a source inventory row when the ledger shows stock but the row is missing', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.warehouse.findFirst
      .mockResolvedValueOnce({ id: 'w1', name: 'Main' })
      .mockResolvedValueOnce({ id: 'w2', name: 'Overflow' });
    prisma.stockMovement.aggregate
      .mockResolvedValueOnce({ _sum: { quantity: 8 } })
      .mockResolvedValueOnce({ _sum: { quantity: 0 } });
    prisma.stockMovement.create.mockResolvedValue({});
    prisma.inventoryItem.upsert.mockResolvedValue({});

    await service.transferStock(
      tenantId,
      'p1',
      'w1',
      'w2',
      5,
      'Move from ledger-only stock',
    );

    expect(prisma.inventoryItem.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        create: {
          tenantId,
          productId: 'p1',
          warehouseId: 'w1',
          quantity: 3,
        },
      }),
    );
  });

  it('rejects transfers with insufficient stock', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.warehouse.findFirst
      .mockResolvedValueOnce({ id: 'w1', name: 'Main' })
      .mockResolvedValueOnce({ id: 'w2', name: 'Overflow' });
    prisma.stockMovement.aggregate
      .mockResolvedValueOnce({ _sum: { quantity: 2 } })
      .mockResolvedValueOnce({ _sum: { quantity: 0 } });

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
