import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Product } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import {
  ProductImportMode,
} from './dto/product.dto';
import {
  buildProductImportPreview,
  ProductImportPreviewResult,
} from './product-import';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  //   Get all products
  async getAll(): Promise<any[]> {
    return this.prisma.product.findMany({
      include: {
        inventoryItems: true,
        orderItems: true,
        stockMovements: true,
      },
    });
  }

  //   Get product by ID
  async getById(Id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id: Id },
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

  //   create product
  async createproduct(data: {
    name: string;
    sku: string;
    price: number;
  }): Promise<Product> {
    if (!data.name || !data.sku || data.price == null) {
      throw new NotFoundException('Missing required fields');
    }
    return this.prisma.product.create({
      data,
    });
  }

  async previewImport(
    csv: string,
    mode: ProductImportMode = 'upsert',
  ): Promise<ProductImportPreviewResult> {
    const existingProducts = await this.prisma.product.findMany({
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
    mode: ProductImportMode = 'upsert',
  ): Promise<{
    mode: ProductImportMode;
    totals: ProductImportPreviewResult['totals'] & { imported: number };
    rows: ProductImportPreviewResult['rows'];
  }> {
    const preview = await this.previewImport(csv, mode);
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
              name: row.name,
              sku: row.sku,
              price: row.price ?? 0,
            },
          });
        }

        return this.prisma.product.upsert({
          where: { sku: row.sku },
          create: {
            name: row.name,
            sku: row.sku,
            price: row.price ?? 0,
          },
          update: {
            name: row.name,
            price: row.price ?? 0,
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

  //   Update product
  async updateProduct(
    id: string,
    data: { name?: string; sku?: string; price?: number },
  ): Promise<Product> {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }
    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  //   Delete product
  async deleteProduct(id: string): Promise<Product> {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }
    return this.prisma.product.delete({ where: { id } });
  }
}
