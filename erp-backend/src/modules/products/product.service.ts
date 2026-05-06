import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { Role } from '../../auth/enums/role.enum';
import { ProductImportMode } from './dto/product.dto';
import {
  buildProductImportPreview,
  ProductImportPreviewResult,
} from './product-import';
import { UserPayload } from '../../auth/decorator/get-user.decorator';
import {
  createPaginatedResult,
  getPaginationOptions,
  hasListQuery,
  ListQuery,
} from '../../common/pagination';

type ProductListItem = Prisma.ProductGetPayload<{
  include: {
    inventoryItems: {
      select: {
        id: true;
        productId: true;
        warehouseId: true;
        quantity: true;
        reservedQuantity: true;
      };
    };
    _count: {
      select: {
        orderItems: true;
        stockMovements: true;
      };
    };
  };
}>;

type ProductListResult =
  | ProductListItem[]
  | ReturnType<typeof createPaginatedResult<ProductListItem>>;

type ProductDetail = Prisma.ProductGetPayload<{
  include: {
    inventoryItems: true;
    orderItems: true;
    stockMovements: true;
    purchaseItems: true;
  };
}>;

type ProductDependencySummary = {
  inventoryItems: number;
  activeInventoryItems: number;
  stockMovements: number;
  orderItems: number;
  purchaseItems: number;
};

export type ProductRemovalResult = {
  action: 'deleted' | 'archived';
  message: string;
  dependencySummary: ProductDependencySummary;
};

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  private shouldIncludeArchived(
    user: UserPayload,
    query: ListQuery = {},
  ) {
    return (
      query.includeArchived === 'true' &&
      (user.roles.includes(Role.ADMIN) || user.roles.includes(Role.MANAGER))
    );
  }

  private buildProductWhere(
    user: UserPayload,
    query: ListQuery = {},
  ): Prisma.ProductWhereInput {
    const search = query.search?.trim() ?? '';
    const includeArchived = this.shouldIncludeArchived(user, query);

    return {
      tenantId: user.tenantId,
      ...(includeArchived ? {} : { archivedAt: null }),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
              { category: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private async getScopedProduct(
    id: string,
    user: UserPayload,
  ): Promise<ProductDetail> {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        inventoryItems: true,
        orderItems: true,
        stockMovements: true,
        purchaseItems: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private summarizeDependencies(product: ProductDetail): ProductDependencySummary {
    return {
      inventoryItems: product.inventoryItems.length,
      activeInventoryItems: product.inventoryItems.filter(
        (item) => item.quantity > 0 || item.reservedQuantity > 0,
      ).length,
      stockMovements: product.stockMovements.length,
      orderItems: product.orderItems.length,
      purchaseItems: product.purchaseItems.length,
    };
  }

  async getAll(
    user: UserPayload,
    query: ListQuery = {},
  ): Promise<ProductListResult> {
    if (hasListQuery(query)) {
      const options = getPaginationOptions(query);
      const where = this.buildProductWhere(user, query);
      const [items, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          include: {
            inventoryItems: {
              select: {
                id: true,
                productId: true,
                warehouseId: true,
                quantity: true,
                reservedQuantity: true,
              },
            },
            _count: {
              select: {
                orderItems: true,
                stockMovements: true,
              },
            },
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
      where: this.buildProductWhere(user, query),
      include: {
        inventoryItems: {
          select: {
            id: true,
            productId: true,
            warehouseId: true,
            quantity: true,
            reservedQuantity: true,
          },
        },
        _count: {
          select: {
            orderItems: true,
            stockMovements: true,
          },
        },
      },
    });
  }

  async getById(id: string, user: UserPayload): Promise<ProductDetail> {
    return this.getScopedProduct(id, user);
  }

  async createProduct(
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
            archivedAt: null,
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
    const product = await this.getScopedProduct(id, user);

    if (product.archivedAt) {
      throw new BadRequestException('Archived products cannot be updated.');
    }

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

  async deleteProduct(
    id: string,
    user: UserPayload,
  ): Promise<ProductRemovalResult> {
    const product = await this.getScopedProduct(id, user);
    const dependencySummary = this.summarizeDependencies(product);
    if (dependencySummary.activeInventoryItems > 0) {
      throw new BadRequestException(
        'Cannot remove product while stock is still assigned to it. Clear or transfer inventory first.',
      );
    }
    const hasDependencies = Object.values(dependencySummary).some(
      (count) => count > 0,
    );

    if (!hasDependencies) {
      await this.prisma.product.delete({ where: { id } });

      return {
        action: 'deleted',
        message: 'Product deleted permanently because it had no related records.',
        dependencySummary,
      };
    }

    if (!product.archivedAt) {
      await this.prisma.product.update({
        where: { id },
        data: { archivedAt: new Date() },
      });
    }

    return {
      action: 'archived',
      message:
        'Product archived because it is linked to existing business records.',
      dependencySummary,
    };
  }
}
