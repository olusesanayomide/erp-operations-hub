import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Role } from 'src/auth/enums/role.enum';
import { UserPayload } from 'src/auth/decorator/get-user.decorator';
import {
  createPaginatedResult,
  getPaginationOptions,
  hasListQuery,
  ListQuery,
} from 'src/common/pagination';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  private shouldIncludeArchived(user: UserPayload, query: ListQuery = {}) {
    return (
      query.includeArchived === 'true' &&
      (user.roles.includes(Role.ADMIN) || user.roles.includes(Role.MANAGER))
    );
  }

  private buildSupplierWhere(
    user: UserPayload,
    query: ListQuery = {},
  ): Prisma.SupplierWhereInput {
    const options = getPaginationOptions(query);

    return {
      tenantId: user.tenantId,
      ...(this.shouldIncludeArchived(user, query) ? {} : { archivedAt: null }),
      ...(options.search
        ? {
            OR: [
              { name: { contains: options.search, mode: 'insensitive' } },
              { email: { contains: options.search, mode: 'insensitive' } },
              { phone: { contains: options.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    } as const;
  }

  async create(createSupplierDto: CreateSupplierDto, user: UserPayload) {
    return this.prisma.supplier.create({
      data: {
        ...createSupplierDto,
        tenantId: user.tenantId,
      },
    });
  }

  async findAll(user: UserPayload, query: ListQuery = {}) {
    if (hasListQuery(query)) {
      const options = getPaginationOptions(query);
      const where = this.buildSupplierWhere(user, query);
      const [items, total] = await Promise.all([
        this.prisma.supplier.findMany({
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
        this.prisma.supplier.count({ where }),
      ]);

      return createPaginatedResult(items, total, options);
    }

    return this.prisma.supplier.findMany({
      where: this.buildSupplierWhere(user, query),
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    });
  }

  async findOne(id: string, user: UserPayload) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { purchases: true },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
    user: UserPayload,
  ) {
    const supplier = await this.findOne(id, user);

    if (supplier.archivedAt) {
      throw new BadRequestException('Archived suppliers cannot be updated.');
    }

    return this.prisma.supplier.update({
      where: { id },
      data: updateSupplierDto,
    });
  }

  async remove(id: string, user: UserPayload) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { _count: { select: { purchases: true } } },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    const dependencySummary = {
      purchases: supplier._count.purchases,
    };

    if (dependencySummary.purchases > 0) {
      if (!supplier.archivedAt) {
        await this.prisma.supplier.update({
          where: { id },
          data: { archivedAt: new Date() },
        });
      }

      return {
        action: 'archived' as const,
        message:
          'Supplier archived because it is linked to existing purchase history.',
        dependencySummary,
      };
    }

    await this.prisma.supplier.delete({
      where: { id },
    });

    return {
      action: 'deleted' as const,
      message:
        'Supplier deleted permanently because it had no related records.',
      dependencySummary,
    };
  }
}
