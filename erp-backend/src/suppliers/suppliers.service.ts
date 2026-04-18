import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
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
      const where: Prisma.SupplierWhereInput = {
        tenantId: user.tenantId,
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
      where: { tenantId: user.tenantId },
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
    await this.findOne(id, user);

    return this.prisma.supplier.update({
      where: { id },
      data: updateSupplierDto,
    });
  }

  async remove(id: string, user: UserPayload) {
    await this.findOne(id, user);

    return this.prisma.supplier.delete({
      where: { id },
    });
  }
}
