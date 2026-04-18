import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { ProductImportMode } from './dto/product.dto';
import {
  buildProductImportPreview,
  ProductImportPreviewResult,
} from './product-import';
import { UserPayload } from 'src/auth/decorator/get-user.decorator';
import {
  createPaginatedResult,
  getPaginationOptions,
  hasListQuery,
  ListQuery,
} from 'src/common/pagination';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async getAll(user: UserPayload, query: ListQuery = {}): Promise<any> {
    if (hasListQuery(query)) {
      const options = getPaginationOptions(query);
      const where: Prisma.ProductWhereInput = {
        tenantId: user.tenantId,
        ...(options.search
          ? {
              OR: [
                { name: { contains: options.search, mode: 'insensitive' } },
                { sku: { contains: options.search, mode: 'insensitive' } },
                { category: { contains: options.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      } as const;
      const [items, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          include: {
            inventoryItems: true,
            orderItems: true,
            stockMovements: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: options.skip,
          take: options.pageSize,
        }),
        this.prisma.product.count({ where }),
      ]);

      return createPaginatedResult(items, total, options);
    }

    return this.prisma.product.findMany({
      where: { tenantId: user.tenantId },
      include: {
        inventoryItems: true,
        orderItems: true,
        stockMovements: true,
      },
    });
  }

  async getById(id: string, user: UserPayload): Promise<Product> {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        inventoryItems: true,
        orderItems: true,
        stockMovements: true,
      },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async createproduct(
    data: {
      name: string;
      sku: string;
      price: number;
      minStock?: number;
      description?: string;
      category?: string;
      unit?: string;
    },
    user: UserPayload,
  ): Promise<Product> {
    if (!data.name || !data.sku || data.price == null) {
      throw new NotFoundException('Missing required fields');
    }

    const description = data.description?.trim() || null;
    const category = data.category?.trim() || 'General';
    const unit = data.unit?.trim() || 'unit';
    const minStock = data.minStock ?? 10;

    return this.prisma.product.create({
      data: {
        tenantId: user.tenantId,
        name: data.name,
        sku: data.sku,
        price: data.price,
        minStock,
        description,
        category,
        unit,
      },
    });
  }

  async previewImport(
    csv: string,
    user: UserPayload,
    mode: ProductImportMode = 'upsert',
  ): Promise<ProductImportPreviewResult> {
    const existingProducts = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId },
      select: { sku: true },
    });

    return buildProductImportPreview(
      csv,
      mode,
      existingProducts.map((product) => product.sku),
    );
  }

  async commitImport(
    csv: string,
    user: UserPayload,
    mode: ProductImportMode = 'upsert',
  ): Promise<{
    mode: ProductImportMode;
    totals: ProductImportPreviewResult['totals'] & { imported: number };
    rows: ProductImportPreviewResult['rows'];
  }> {
    const preview = await this.previewImport(csv, user, mode);
    const validRows = preview.rows.filter((row) => row.issues.length === 0);

    if (preview.totals.rows === 0) {
      throw new BadRequestException('CSV does not contain any product rows.');
    }

    if (validRows.length === 0) {
      throw new BadRequestException(
        'Import preview contains no valid rows. Fix the CSV and try again.',
      );
    }

    await this.prisma.$transaction(
      validRows.map((row) => {
        if (mode === 'create') {
          return this.prisma.product.create({
            data: {
              tenantId: user.tenantId,
              name: row.name,
              sku: row.sku,
              price: row.price ?? 0,
              minStock: row.minStock ?? 10,
            },
          });
        }

        return this.prisma.product.upsert({
          where: {
            tenantId_sku: {
              tenantId: user.tenantId,
              sku: row.sku,
            },
          },
          create: {
            tenantId: user.tenantId,
            name: row.name,
            sku: row.sku,
            price: row.price ?? 0,
            minStock: row.minStock ?? 10,
          },
          update: {
            name: row.name,
            price: row.price ?? 0,
            minStock: row.minStock ?? 10,
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

  async updateProduct(
    id: string,
    data: {
      name?: string;
      sku?: string;
      price?: number;
      minStock?: number;
      description?: string;
      category?: string;
      unit?: string;
    },
    user: UserPayload,
  ): Promise<Product> {
    await this.getById(id, user);

    const normalizedData = {
      ...data,
      description:
        data.description === undefined
          ? undefined
          : data.description.trim() || null,
      category:
        data.category === undefined
          ? undefined
          : data.category.trim() || 'General',
      unit: data.unit === undefined ? undefined : data.unit.trim() || 'unit',
    };

    return this.prisma.product.update({
      where: { id },
      data: normalizedData,
    });
  }

  async deleteProduct(id: string, user: UserPayload): Promise<Product> {
    await this.getById(id, user);

    return this.prisma.product.delete({ where: { id } });
  }
}
