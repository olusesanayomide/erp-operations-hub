import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PrismaService } from 'prisma/prisma.service';
import { CustomerImportMode } from './dto/customer-import.dto';
import {
  buildCustomerImportPreview,
  CustomerImportPreviewResult,
} from './customer-import';
import { UserPayload } from 'src/auth/decorator/get-user.decorator';
import {
  createPaginatedResult,
  getPaginationOptions,
  hasListQuery,
  ListQuery,
} from 'src/common/pagination';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto, user: UserPayload) {
    return this.prisma.customer.create({
      data: {
        ...createCustomerDto,
        tenantId: user.tenantId,
      },
    });
  }

  async previewImport(
    csv: string,
    user: UserPayload,
    mode: CustomerImportMode = 'upsert',
  ): Promise<CustomerImportPreviewResult> {
    const existingCustomers = await this.prisma.customer.findMany({
      where: { tenantId: user.tenantId },
      select: { email: true },
    });

    return buildCustomerImportPreview(
      csv,
      mode,
      existingCustomers.map((customer) => customer.email),
    );
  }

  async commitImport(
    csv: string,
    user: UserPayload,
    mode: CustomerImportMode = 'upsert',
  ): Promise<{
    mode: CustomerImportMode;
    totals: CustomerImportPreviewResult['totals'] & { imported: number };
    rows: CustomerImportPreviewResult['rows'];
  }> {
    const preview = await this.previewImport(csv, user, mode);
    const validRows = preview.rows.filter((row) => row.issues.length === 0);

    if (preview.totals.rows === 0) {
      throw new BadRequestException('CSV does not contain any customer rows.');
    }

    if (validRows.length === 0) {
      throw new BadRequestException(
        'Import preview contains no valid rows. Fix the CSV and try again.',
      );
    }

    await this.prisma.$transaction(
      validRows.map((row) => {
        if (mode === 'create') {
          return this.prisma.customer.create({
            data: {
              tenantId: user.tenantId,
              name: row.name,
              email: row.email,
              phone: row.phone || null,
              address: row.address || null,
            },
          });
        }

        return this.prisma.customer.upsert({
          where: {
            tenantId_email: {
              tenantId: user.tenantId,
              email: row.email,
            },
          },
          create: {
            tenantId: user.tenantId,
            name: row.name,
            email: row.email,
            phone: row.phone || null,
            address: row.address || null,
          },
          update: {
            name: row.name,
            phone: row.phone || null,
            address: row.address || null,
          },
        });
      }),
    );

    return {
      mode,
      totals: {
        ...preview.totals,
        imported: validRows.length,
      },
      rows: preview.rows,
    };
  }

  async findAll(user: UserPayload, query: ListQuery = {}) {
    if (hasListQuery(query)) {
      const options = getPaginationOptions(query);
      const where: Prisma.CustomerWhereInput = {
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
        this.prisma.customer.findMany({
          where,
          include: {
            _count: {
              select: { orders: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: options.skip,
          take: options.pageSize,
        }),
        this.prisma.customer.count({ where }),
      ]);

      return createPaginatedResult(items, total, options);
    }

    return this.prisma.customer.findMany({
      where: { tenantId: user.tenantId },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });
  }

  async findOne(id: string, user: UserPayload) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { orders: true },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    user: UserPayload,
  ) {
    await this.findOne(id, user);

    return this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
    });
  }

  async remove(id: string, user: UserPayload) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { _count: { select: { orders: true } } },
    });
    if (!customer) {
      throw new BadRequestException(`Customer with ID ${id} not found  `);
    }
    if (customer._count.orders > 0) {
      throw new BadRequestException(
        'Cannot delete customer with existing order history , Consider archiving instead',
      );
    }
    return this.prisma.customer.delete({ where: { id } });
  }
}
