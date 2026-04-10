import { BadRequestException } from '@nestjs/common';
import { PurchaseService } from './purchase.service';

describe('PurchaseService.createPurchase', () => {
  const tenantId = 'tenant-1';

  let service: PurchaseService;
  let prisma: {
    supplier: { findFirst: jest.Mock };
    warehouse: { findFirst: jest.Mock };
    product: { findMany: jest.Mock };
    purchase: { create: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      supplier: { findFirst: jest.fn() },
      warehouse: { findFirst: jest.fn() },
      product: { findMany: jest.fn() },
      purchase: { create: jest.fn() },
    };

    service = new PurchaseService(prisma as any);
  });

  it('rejects purchase creation when any product is outside tenant scope', async () => {
    prisma.supplier.findFirst.mockResolvedValue({ id: 's-1' });
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'w-1' });
    prisma.product.findMany.mockResolvedValue([{ id: 'p-1' }]);

    await expect(
      service.createPurchase(tenantId, {
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

    const result = await service.createPurchase(tenantId, {
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
