import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { StockMovementType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  private async validateProductAndWarehouse(productId: string, warehouseId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new BadRequestException('Product does not exist');
    }

    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });
    if (!warehouse) {
      throw new BadRequestException('Warehouse does not exist');
    }

    return { product, warehouse };
  }

  private async getAvailableStock(productId: string, warehouseId: string) {
    const summary = await this.prisma.stockMovement.aggregate({
      where: {
        productId,
        warehouseId,
      },
      _sum: {
        quantity: true,
      },
    });

    return summary._sum.quantity || 0;
  }

  // Get all inventory items
  async getInventory() {
    const groups = await this.prisma.stockMovement.groupBy({
      by: ['productId', 'warehouseId'],
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

  // Get Inventory by Warehouse
  async getInventoryByWarehouse(warehouseId: string) {
    const stock = await this.prisma.stockMovement.groupBy({
      by: ['productId'],
      where: { warehouseId },
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

  // Add stock to a warehouse
  async stockIn(productId: string, warehouseId: string, quantity: number) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }
    await this.validateProductAndWarehouse(productId, warehouseId);

    return this.prisma.$transaction([
      // Record the stock movement
      this.prisma.stockMovement.create({
        data: {
          productId,
          warehouseId,
          quantity,
          type: StockMovementType.IN,
          reference: 'API_STOCK_IN',
        },
      }),

      // Update or create the inventory item
      this.prisma.inventoryItem.upsert({
        where: {
          productId_warehouseId: { productId, warehouseId },
        },
        update: {
          quantity: { increment: quantity },
        },
        create: {
          productId,
          warehouseId,
          quantity,
        },
      }),
    ]);
  }

  // Remove stock from a warehouse
  async stockOut(productId: string, warehouseId: string, quantity: number) {
    if (quantity <= 0)
      throw new BadRequestException('Quantity must be greater than 0');

    await this.validateProductAndWarehouse(productId, warehouseId);

    // Check if inventory exists and has enough stock
    const inventory = await this.prisma.inventoryItem.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    });

    if (!inventory)
      throw new BadRequestException('Inventory item does not exist');
    if (inventory.quantity < quantity)
      throw new BadRequestException('Insufficient stock');

    return this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: {
          productId,
          warehouseId,
          quantity: -quantity,
          type: StockMovementType.OUT,
          reference: 'API_STOCK_OUT',
        },
      }),
      this.prisma.inventoryItem.update({
        where: { productId_warehouseId: { productId, warehouseId } },
        data: { quantity: { decrement: quantity } },
      }),
    ]);
  }

  async transferStock(
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

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new BadRequestException('Product does not exist');
    }

    const [sourceWarehouse, destinationWarehouse] = await Promise.all([
      this.prisma.warehouse.findUnique({
        where: { id: sourceWarehouseId },
      }),
      this.prisma.warehouse.findUnique({
        where: { id: destinationWarehouseId },
      }),
    ]);

    if (!sourceWarehouse) {
      throw new BadRequestException('Source warehouse does not exist');
    }

    if (!destinationWarehouse) {
      throw new BadRequestException('Destination warehouse does not exist');
    }

    const [sourceAvailableStock, destinationAvailableStock] = await Promise.all([
      this.getAvailableStock(productId, sourceWarehouseId),
      this.getAvailableStock(productId, destinationWarehouseId),
    ]);

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
          productId,
          warehouseId: sourceWarehouseId,
          quantity: -quantity,
          type: StockMovementType.OUT,
          reference: sourceReference,
        },
      }),
      this.prisma.stockMovement.create({
        data: {
          productId,
          warehouseId: destinationWarehouseId,
          quantity,
          type: StockMovementType.IN,
          reference: destinationReference,
        },
      }),
      this.prisma.inventoryItem.upsert({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId: sourceWarehouseId,
          },
        },
        update: {
          quantity: sourceAvailableStock - quantity,
        },
        create: {
          productId,
          warehouseId: sourceWarehouseId,
          quantity: sourceAvailableStock - quantity,
        },
      }),
      this.prisma.inventoryItem.upsert({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId: destinationWarehouseId,
          },
        },
        update: {
          quantity: destinationAvailableStock + quantity,
        },
        create: {
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

  // // Get all stock movements
  // async getStockMovements(_page: number, _limit: number) {
  //   const skip = (_page - 1) * _limit;
  //   const movement = await this.prisma.stockMovement.findMany({
  //     skip,
  //     take: _limit,
  //     orderBy: { createdAt: 'desc' },
  //     include: {
  //       product: true,
  //       warehouse: true,
  //     },
  //   });
  //   console.log('movements fetched:', movement.length);
  //   return movement;
  // }
}
