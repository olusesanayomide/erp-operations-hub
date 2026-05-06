import { ProductService } from './product.service';
import { Role } from '../../auth/enums/role.enum';

describe('ProductService.deleteProduct', () => {
  const user = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    email: 'admin@example.com',
    roles: [Role.ADMIN],
    isPlatformAdmin: false,
  };

  let service: ProductService;
  let prisma: {
    product: {
      findFirst: jest.Mock;
      delete: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      product: {
        findFirst: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    service = new ProductService(prisma as any);
  });

  it('hard deletes products with no dependencies', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 'product-1',
      archivedAt: null,
      inventoryItems: [],
      stockMovements: [],
      orderItems: [],
      purchaseItems: [],
    });
    prisma.product.delete.mockResolvedValue({ id: 'product-1' });

    const result = await service.deleteProduct('product-1', user as any);

    expect(prisma.product.delete).toHaveBeenCalledWith({
      where: { id: 'product-1' },
    });
    expect(prisma.product.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      action: 'deleted',
      message:
        'Product deleted permanently because it had no related records.',
      dependencySummary: {
        inventoryItems: 0,
        activeInventoryItems: 0,
        stockMovements: 0,
        orderItems: 0,
        purchaseItems: 0,
      },
    });
  });

  it('blocks removal when the product still has active inventory', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 'product-stocked',
      archivedAt: null,
      inventoryItems: [{ id: 'inventory-1', quantity: 4, reservedQuantity: 0 }],
      stockMovements: [],
      orderItems: [],
      purchaseItems: [],
    });

    await expect(
      service.deleteProduct('product-stocked', user as any),
    ).rejects.toThrow(
      'Cannot remove product while stock is still assigned to it. Clear or transfer inventory first.',
    );

    expect(prisma.product.delete).not.toHaveBeenCalled();
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it('archives products that have dependencies', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 'product-2',
      archivedAt: null,
      inventoryItems: [{ id: 'inventory-1' }],
      stockMovements: [{ id: 'movement-1' }],
      orderItems: [],
      purchaseItems: [{ id: 'purchase-item-1' }],
    });
    prisma.product.update.mockResolvedValue({ id: 'product-2' });

    const result = await service.deleteProduct('product-2', user as any);

    expect(prisma.product.delete).not.toHaveBeenCalled();
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'product-2' },
      data: { archivedAt: expect.any(Date) },
    });
    expect(result.action).toBe('archived');
    expect(result.dependencySummary).toEqual({
      inventoryItems: 1,
      activeInventoryItems: 0,
      stockMovements: 1,
      orderItems: 0,
      purchaseItems: 1,
    });
  });
});

describe('ProductService.getAll', () => {
  const managerUser = {
    userId: 'user-2',
    tenantId: 'tenant-1',
    email: 'manager@example.com',
    roles: [Role.MANAGER],
    isPlatformAdmin: false,
  };

  let service: ProductService;
  let prisma: {
    product: {
      findFirst: jest.Mock;
      delete: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      product: {
        findFirst: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    service = new ProductService(prisma as any);
  });

  it('excludes archived products by default', async () => {
    await service.getAll(managerUser as any);

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          archivedAt: null,
        }),
      }),
    );
  });

  it('allows managers to include archived products when requested', async () => {
    await service.getAll(managerUser as any, { includeArchived: 'true' });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          archivedAt: null,
        }),
      }),
    );
  });
});
