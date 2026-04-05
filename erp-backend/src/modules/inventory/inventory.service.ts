import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { StockMovementType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

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
