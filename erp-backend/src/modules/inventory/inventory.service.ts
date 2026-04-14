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
    const inventory = await this.prisma.inventoryItem.findUnique({
      where: {
        tenantId_productId_warehouseId: { tenantId, productId, warehouseId },
      },
    });

    return inventory?.quantity || 0;
  }

  async getInventory(tenantId: string) {
    const groups = await this.prisma.inventoryItem.findMany({
      where: { tenantId },
      include: {
        product: {
          select: {
            minStock: true,
          },
        },
      },
    });

    return groups.map((item) => ({
      product: item.productId,
      location: item.warehouseId,
      availableStock: item.quantity || 0,
      reservedStock: item.reservedQuantity || 0,
      onHandStock: (item.quantity || 0) + (item.reservedQuantity || 0),
      minStock: item.product?.minStock ?? 10,
      status:
        (item.quantity || 0) > (item.product?.minStock ?? 10)
          ? 'IN_STOCK'
          : (item.quantity || 0) > 0
            ? 'LOW_STOCK'
            : 'OUT_OF_STOCK',
    }));
  }

  async getInventoryByWarehouse(tenantId: string, warehouseId: string) {
    const stock = await this.prisma.inventoryItem.findMany({
      where: { tenantId, warehouseId },
    });

    return stock.map((item) => ({
      productId: item.productId,
      warehouseId,
      availableQuantity: item.quantity || 0,
      reservedQuantity: item.reservedQuantity || 0,
      totalQuantity: (item.quantity || 0) + (item.reservedQuantity || 0),
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
          reference: 'STOCK_IN',
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
          reservedQuantity: 0,
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
          reference: 'STOCK_OUT',
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

    const transferReferenceId = `TRANSFER-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;
    const sourceReference = `${transferReferenceId} | TO:${destinationWarehouse.name} (${destinationWarehouse.id}) | NOTE:${trimmedNote}`;
    const destinationReference = `${transferReferenceId} | FROM:${sourceWarehouse.name} (${sourceWarehouse.id}) | NOTE:${trimmedNote}`;

    const { outMovement, inMovement } = await this.prisma.$transaction(
      async (tx) => {
        const sourceUpdate = await tx.inventoryItem.updateMany({
          where: {
            tenantId,
            productId,
            warehouseId: sourceWarehouseId,
            quantity: { gte: quantity },
          },
          data: {
            quantity: { decrement: quantity },
          },
        });

        if (sourceUpdate.count === 0) {
          throw new BadRequestException(
            'Insufficient stock in source warehouse',
          );
        }

        await tx.inventoryItem.upsert({
          where: {
            tenantId_productId_warehouseId: {
              tenantId,
              productId,
              warehouseId: destinationWarehouseId,
            },
          },
          update: {
            quantity: { increment: quantity },
          },
          create: {
            tenantId,
            productId,
            warehouseId: destinationWarehouseId,
            quantity,
            reservedQuantity: 0,
          },
        });

        const outMovement = await tx.stockMovement.create({
          data: {
            tenantId,
            productId,
            warehouseId: sourceWarehouseId,
            quantity: -quantity,
            type: StockMovementType.OUT,
            reference: sourceReference,
          },
        });
        const inMovement = await tx.stockMovement.create({
          data: {
            tenantId,
            productId,
            warehouseId: destinationWarehouseId,
            quantity,
            type: StockMovementType.IN,
            reference: destinationReference,
          },
        });

        return { outMovement, inMovement };
      },
    );

    return {
      success: true,
      message: 'Stock transferred successfully',
      transferReference: transferReferenceId,
      movements: [outMovement, inMovement],
    };
  }
}
