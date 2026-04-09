import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Injectable()
export class PurchaseService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.purchase.findMany({
      where: { tenantId },
      include: {
        supplier: true,
        warehouse: true,
        _count: {
          select: { items: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getPurchaseDetails(tenantId: string, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, tenantId },
      include: { items: true, supplier: true, warehouse: true },
    });

    if (!purchase) {
      throw new NotFoundException('Purchase order not found');
    }

    return purchase;
  }

  async createPurchase(tenantId: string, dto: CreatePurchaseDto) {
    const [supplier, warehouse] = await Promise.all([
      this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, tenantId },
      }),
      this.prisma.warehouse.findFirst({
        where: { id: dto.warehouseId, tenantId },
      }),
    ]);

    if (!supplier) {
      throw new BadRequestException('Supplier not found');
    }

    if (!warehouse) {
      throw new BadRequestException('Warehouse not found');
    }

    const totalAmount = dto.items.reduce((sum, item) => {
      return sum + item.quantity * item.price;
    }, 0);
    return this.prisma.purchase.create({
      data: {
        tenantId,
        purchaseOrder: dto.purchaseOrder,
        supplierId: dto.supplierId,
        warehouseId: dto.warehouseId,
        totalAmount: totalAmount,
        status: 'DRAFT',
        items: {
          create: dto.items.map((items) => ({
            productId: items.productId,
            quantity: items.quantity,
            price: items.price,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        supplier: true,
        warehouse: true,
      },
    });
  }

  async recievePurchase(tenantId: string, purchaseId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id: purchaseId, tenantId },
        include: { items: true },
      });
      if (!purchase) {
        throw new NotFoundException('Purchase order not found');
      }
      if (purchase.status === 'RECEIVED') {
        throw new BadRequestException('Purchase order already received');
      }
      if (purchase.status === 'CANCELLED') {
        throw new BadRequestException('Purchase order already cancelled');
      }
      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date(),
        },
      });
      const movementPromises = purchase.items.map((item) => {
        return tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            warehouseId: purchase.warehouseId,
            quantity: item.quantity,
            type: 'IN',
            reference: `Purchase Order ${purchase.purchaseOrder}`,
          },
        });
      });
      const inventoryUpserts = purchase.items.map((item) => {
        return tx.inventoryItem.upsert({
          where: {
            tenantId_productId_warehouseId: {
              tenantId,
              productId: item.productId,
              warehouseId: purchase.warehouseId,
            },
          },
          update: {
            quantity: { increment: item.quantity },
          },
          create: {
            tenantId,
            productId: item.productId,
            warehouseId: purchase.warehouseId,
            quantity: item.quantity,
          },
        });
      });
      await Promise.all([...movementPromises, ...inventoryUpserts]);
      return {
        success: true,
        message: 'Purchase order received and stock updated',
      };
    });
  }
}
