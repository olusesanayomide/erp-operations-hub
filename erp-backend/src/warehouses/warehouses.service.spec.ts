import { NotFoundException } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { Role } from '../auth/enums/role.enum';
import type { UserPayload } from '../auth/decorator/get-user.decorator';

describe('WarehousesService', () => {
  let service: WarehousesService;
  let prisma: {
    warehouse: {
      findFirst: jest.Mock;
    };
    inventoryItem: {
      findMany: jest.Mock;
      count: jest.Mock;
      aggregate: jest.Mock;
    };
  };
  const user: UserPayload = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    email: 'admin@example.com',
    roles: [Role.ADMIN],
    isPlatformAdmin: false,
  };

  beforeEach(() => {
    prisma = {
      warehouse: {
        findFirst: jest.fn(),
      },
      inventoryItem: {
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
    };

    service = new WarehousesService(prisma as any);
  });

  it('loads warehouse details without eager-loading inventory rows', async () => {
    prisma.warehouse.findFirst.mockResolvedValue({
      id: 'warehouse-1',
      tenantId: 'tenant-1',
      name: 'Main',
      _count: { inventoryItems: 30, purchases: 2 },
    });

    await service.findOne('warehouse-1', user);

    expect(prisma.warehouse.findFirst).toHaveBeenCalledWith({
      where: { id: 'warehouse-1', tenantId: 'tenant-1' },
      include: {
        _count: {
          select: { inventoryItems: true, purchases: true },
        },
      },
    });
  });

  it('loads paginated warehouse inventory with lightweight product fields and totals', async () => {
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'warehouse-1' });
    prisma.inventoryItem.findMany.mockResolvedValue([
      {
        id: 'inventory-1',
        productId: 'product-1',
        warehouseId: 'warehouse-1',
        quantity: 12,
        reservedQuantity: 3,
        product: {
          id: 'product-1',
          name: 'Pump',
          sku: 'PUMP-001',
          minStock: 5,
        },
      },
    ]);
    prisma.inventoryItem.count.mockResolvedValue(40);
    prisma.inventoryItem.aggregate.mockResolvedValue({
      _sum: { quantity: 120, reservedQuantity: 15 },
    });

    const result = await service.findInventory('warehouse-1', user, {
      page: '2',
      pageSize: '10',
      search: 'pump',
    });

    expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        warehouseId: 'warehouse-1',
        product: {
          OR: [
            { name: { contains: 'pump', mode: 'insensitive' } },
            { sku: { contains: 'pump', mode: 'insensitive' } },
          ],
        },
      },
      orderBy: [{ product: { name: 'asc' } }, { id: 'asc' }],
      skip: 10,
      take: 10,
      select: {
        id: true,
        productId: true,
        warehouseId: true,
        quantity: true,
        reservedQuantity: true,
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            minStock: true,
          },
        },
      },
    });
    expect(result.meta).toEqual({
      page: 2,
      pageSize: 10,
      total: 40,
      totalPages: 4,
    });
    expect(result.totals).toEqual({
      availableQuantity: 120,
      reservedQuantity: 15,
      onHandQuantity: 135,
    });
  });

  it('rejects inventory lookup when the warehouse is outside the tenant', async () => {
    prisma.warehouse.findFirst.mockResolvedValue(null);

    await expect(service.findInventory('warehouse-1', user)).rejects.toThrow(
      new NotFoundException('Warehouse with ID warehouse-1 not found'),
    );

    expect(prisma.inventoryItem.findMany).not.toHaveBeenCalled();
  });
});
