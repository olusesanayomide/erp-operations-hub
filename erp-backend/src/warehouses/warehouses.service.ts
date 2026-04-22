import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
      const where: Prisma.WarehouseWhereInput = {
        tenantId: user.tenantId,
        ...(options.search
          ? {
              OR: [
                { name: { contains: options.search, mode: 'insensitive' } },
                { location: { contains: options.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      } as const;
      const [items, total] = await Promise.all([
        this.prisma.warehouse.findMany({
          where,
          include: {
            _count: {
              select: { purchases: true },
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
      where: { tenantId: user.tenantId },
      include: {
        _count: {
          select: { purchases: true },
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
    await this.findOne(id, user);

    return this.prisma.warehouse.update({
      where: { id },
      data: updateWarehouseDto,
    });
  }

  async remove(id: string, user: UserPayload) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        _count: {
          select: {
            inventoryItems: true,
            purchases: true,
          },
        },
      },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }
    if (warehouse._count.inventoryItems > 0) {
      throw new BadRequestException(
        'Cannot delete  warehouse: It still contains, inventory . Move stock to another stock location ',
      );
    }
    return this.prisma.warehouse.delete({ where: { id } });
  }
}
