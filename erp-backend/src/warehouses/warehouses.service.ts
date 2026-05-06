import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Role } from 'src/auth/enums/role.enum';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { UserPayload } from '../auth/decorator/get-user.decorator';
import {
  createPaginatedResult,
  getPaginationOptions,
  hasListQuery,
  ListQuery,
} from '../common/pagination';

@Injectable()
export class WarehousesService {
  constructor(private prisma: PrismaService) {}

  private shouldIncludeArchived(user: UserPayload, query: ListQuery = {}) {
    return (
      query.includeArchived === 'true' &&
      (user.roles.includes(Role.ADMIN) || user.roles.includes(Role.MANAGER))
    );
  }

  private buildWarehouseWhere(
    user: UserPayload,
    query: ListQuery = {},
  ): Prisma.WarehouseWhereInput {
    const options = getPaginationOptions(query);

    return {
      tenantId: user.tenantId,
      ...(this.shouldIncludeArchived(user, query) ? {} : { archivedAt: null }),
      ...(options.search
        ? {
            OR: [
              { name: { contains: options.search, mode: 'insensitive' } },
              { location: { contains: options.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    } as const;
  }

  async create(createWarehouseDto: CreateWarehouseDto, user: UserPayload) {
    return this.prisma.warehouse.create({
      data: {
        ...createWarehouseDto,
        tenantId: user.tenantId,
      },
    });
  }

  async findAll(user: UserPayload, query: ListQuery = {}) {
    if (hasListQuery(query)) {
      const options = getPaginationOptions(query);
      const where = this.buildWarehouseWhere(user, query);
      const [items, total] = await Promise.all([
        this.prisma.warehouse.findMany({
          where,
          include: {
            _count: {
              select: { inventoryItems: true, purchases: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: options.skip,
          take: options.pageSize,
        }),
        this.prisma.warehouse.count({ where }),
      ]);

      return createPaginatedResult(items, total, options);
    }

    return this.prisma.warehouse.findMany({
      where: this.buildWarehouseWhere(user, query),
      include: {
        _count: {
          select: { inventoryItems: true, purchases: true },
        },
      },
    });
  }

  async findOne(id: string, user: UserPayload) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        _count: {
          select: { inventoryItems: true, purchases: true },
        },
      },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }
    return warehouse;
  }

  async findInventory(id: string, user: UserPayload, query: ListQuery = {}) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId: user.tenantId },
      select: { id: true },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    const options = getPaginationOptions(query);
    const where: Prisma.InventoryItemWhereInput = {
      tenantId: user.tenantId,
      warehouseId: id,
      ...(options.search
        ? {
            product: {
              OR: [
                { name: { contains: options.search, mode: 'insensitive' } },
                { sku: { contains: options.search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const [items, total, totals] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        orderBy: [{ product: { name: 'asc' } }, { id: 'asc' }],
        skip: options.skip,
        take: options.pageSize,
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
      }),
      this.prisma.inventoryItem.count({ where }),
      this.prisma.inventoryItem.aggregate({
        where,
        _sum: {
          quantity: true,
          reservedQuantity: true,
        },
      }),
    ]);

    return {
      ...createPaginatedResult(items, total, options),
      totals: {
        availableQuantity: totals._sum.quantity ?? 0,
        reservedQuantity: totals._sum.reservedQuantity ?? 0,
        onHandQuantity:
          (totals._sum.quantity ?? 0) + (totals._sum.reservedQuantity ?? 0),
      },
    };
  }

  async update(
    id: string,
    updateWarehouseDto: UpdateWarehouseDto,
    user: UserPayload,
  ) {
    const warehouse = await this.findOne(id, user);

    if (warehouse.archivedAt) {
      throw new BadRequestException('Archived warehouses cannot be updated.');
    }

    return this.prisma.warehouse.update({
      where: { id },
      data: updateWarehouseDto,
    });
  }

  async remove(id: string, user: UserPayload) {
    const [warehouse, activeInventoryItems] = await Promise.all([
      this.prisma.warehouse.findFirst({
        where: { id, tenantId: user.tenantId },
        include: {
          _count: {
            select: {
              inventoryItems: true,
              purchases: true,
              stockMovements: true,
            },
          },
        },
      }),
      this.prisma.inventoryItem.count({
        where: {
          tenantId: user.tenantId,
          warehouseId: id,
          OR: [{ quantity: { gt: 0 } }, { reservedQuantity: { gt: 0 } }],
        },
      }),
    ]);

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    const dependencySummary = {
      inventoryItems: warehouse._count.inventoryItems,
      activeInventoryItems,
      purchases: warehouse._count.purchases,
      stockMovements: warehouse._count.stockMovements,
    };

    if (dependencySummary.activeInventoryItems > 0) {
      throw new BadRequestException(
        'Cannot remove warehouse while it still holds active inventory. Move or clear stock first.',
      );
    }

    const hasDependencies =
      dependencySummary.inventoryItems > 0 ||
      dependencySummary.purchases > 0 ||
      dependencySummary.stockMovements > 0;

    if (hasDependencies) {
      if (!warehouse.archivedAt) {
        await this.prisma.warehouse.update({
          where: { id },
          data: { archivedAt: new Date() },
        });
      }

      return {
        action: 'archived' as const,
        message:
          'Warehouse archived because it is linked to historical inventory or purchasing records.',
        dependencySummary,
      };
    }

    await this.prisma.warehouse.delete({ where: { id } });

    return {
      action: 'deleted' as const,
      message:
        'Warehouse deleted permanently because it had no related records.',
      dependencySummary,
    };
  }
}
