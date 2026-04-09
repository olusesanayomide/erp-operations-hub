import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { StockMovementType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  private async validateProductAndWarehouse(
    tenantId: string,
    productId: string,
    warehouseId: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!product) {
      throw new BadRequestException('Product does not exist');
    }

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, tenantId },
    });
    if (!warehouse) {
      throw new BadRequestException('Warehouse does not exist');
    }

    return { product, warehouse };
  }

  private async getAvailableStock(
    tenantId: string,
    productId: string,
    warehouseId: string,
  ) {
    const summary = await this.prisma.stockMovement.aggregate({
      where: {
        tenantId,
        productId,
        warehouseId,
      },
      _sum: {
        quantity: true,
      },
    });

    return summary._sum.quantity || 0;
  }

  async getInventory(tenantId: string) {
    const groups = await this.prisma.stockMovement.groupBy({
      by: ['productId', 'warehouseId'],
      where: { tenantId },
      _sum: {
        quantity: true,
      },
    });

    return groups.map((item) => ({
      product: item.productId,
      location: item.warehouseId,
      availableStock: item._sum.quantity || 0,
      status: (item._sum.quantity || 0) > 10 ? 'IN_STOCK' : 'LOW_STOCK',
    }));
  }

  async getInventoryByWarehouse(tenantId: string, warehouseId: string) {
    const stock = await this.prisma.stockMovement.groupBy({
      by: ['productId'],
      where: { tenantId, warehouseId },
      _sum: {
        quantity: true,
      },
    });

    return stock.map((item) => ({
      productId: item.productId,
      warehouseId,
      totalQuantity: item._sum.quantity || 0,
    }));
  }

  async stockIn(
    tenantId: string,
    productId: string,
    warehouseId: string,
    quantity: number,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }
    await this.validateProductAndWarehouse(tenantId, productId, warehouseId);

    return this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: {
          tenantId,
          productId,
          warehouseId,
          quantity,
          type: StockMovementType.IN,
          reference: 'API_STOCK_IN',
        },
      }),
      this.prisma.inventoryItem.upsert({
        where: {
          tenantId_productId_warehouseId: { tenantId, productId, warehouseId },
        },
        update: {
          quantity: { increment: quantity },
        },
        create: {
          tenantId,
          productId,
          warehouseId,
          quantity,
        },
      }),
    ]);
  }

  async stockOut(
    tenantId: string,
    productId: string,
    warehouseId: string,
    quantity: number,
  ) {
    if (quantity <= 0)
      throw new BadRequestException('Quantity must be greater than 0');

    await this.validateProductAndWarehouse(tenantId, productId, warehouseId);

    const inventory = await this.prisma.inventoryItem.findUnique({
      where: {
        tenantId_productId_warehouseId: { tenantId, productId, warehouseId },
      },
    });

    if (!inventory)
      throw new BadRequestException('Inventory item does not exist');
    if (inventory.quantity < quantity)
      throw new BadRequestException('Insufficient stock');

    return this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: {
          tenantId,
          productId,
          warehouseId,
          quantity: -quantity,
          type: StockMovementType.OUT,
          reference: 'API_STOCK_OUT',
        },
      }),
      this.prisma.inventoryItem.update({
        where: {
          tenantId_productId_warehouseId: { tenantId, productId, warehouseId },
        },
        data: { quantity: { decrement: quantity } },
      }),
    ]);
  }

  async transferStock(
    tenantId: string,
    productId: string,
    sourceWarehouseId: string,
    destinationWarehouseId: string,
    quantity: number,
    note: string,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const trimmedNote = note.trim();
    if (!trimmedNote) {
      throw new BadRequestException('Transfer note is required');
    }

    if (sourceWarehouseId === destinationWarehouseId) {
      throw new BadRequestException(
        'Source and destination warehouses must be different',
      );
    }

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!product) {
      throw new BadRequestException('Product does not exist');
    }

    const [sourceWarehouse, destinationWarehouse] = await Promise.all([
      this.prisma.warehouse.findFirst({
        where: { id: sourceWarehouseId, tenantId },
      }),
      this.prisma.warehouse.findFirst({
        where: { id: destinationWarehouseId, tenantId },
      }),
    ]);

    if (!sourceWarehouse) {
      throw new BadRequestException('Source warehouse does not exist');
    }

    if (!destinationWarehouse) {
      throw new BadRequestException('Destination warehouse does not exist');
    }

    const [sourceAvailableStock, destinationAvailableStock] = await Promise.all(
      [
        this.getAvailableStock(tenantId, productId, sourceWarehouseId),
        this.getAvailableStock(tenantId, productId, destinationWarehouseId),
      ],
    );

    if (sourceAvailableStock < quantity) {
      throw new BadRequestException('Insufficient stock in source warehouse');
    }

    const transferReferenceId = `TRANSFER-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;
    const sourceReference = `${transferReferenceId} | TO:${destinationWarehouse.name} (${destinationWarehouse.id}) | NOTE:${trimmedNote}`;
    const destinationReference = `${transferReferenceId} | FROM:${sourceWarehouse.name} (${sourceWarehouse.id}) | NOTE:${trimmedNote}`;

    const operations = [
      this.prisma.stockMovement.create({
        data: {
          tenantId,
          productId,
          warehouseId: sourceWarehouseId,
          quantity: -quantity,
          type: StockMovementType.OUT,
          reference: sourceReference,
        },
      }),
      this.prisma.stockMovement.create({
        data: {
          tenantId,
          productId,
          warehouseId: destinationWarehouseId,
          quantity,
          type: StockMovementType.IN,
          reference: destinationReference,
        },
      }),
      this.prisma.inventoryItem.upsert({
        where: {
          tenantId_productId_warehouseId: {
            tenantId,
            productId,
            warehouseId: sourceWarehouseId,
          },
        },
        update: {
          quantity: sourceAvailableStock - quantity,
        },
        create: {
          tenantId,
          productId,
          warehouseId: sourceWarehouseId,
          quantity: sourceAvailableStock - quantity,
        },
      }),
      this.prisma.inventoryItem.upsert({
        where: {
          tenantId_productId_warehouseId: {
            tenantId,
            productId,
            warehouseId: destinationWarehouseId,
          },
        },
        update: {
          quantity: destinationAvailableStock + quantity,
        },
        create: {
          tenantId,
          productId,
          warehouseId: destinationWarehouseId,
          quantity: destinationAvailableStock + quantity,
        },
      }),
    ];

    const [outMovement, inMovement] = await this.prisma.$transaction(operations);

    return {
      success: true,
      message: 'Stock transferred successfully',
      transferReference: transferReferenceId,
      movements: [outMovement, inMovement],
    };
  }
}
