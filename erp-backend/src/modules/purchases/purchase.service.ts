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

  async findAll() {
    return this.prisma.purchase.findMany({
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

  // Get purchase Order
  async getPurchaseDetails(id: string) {
    return this.prisma.purchase.findUnique({
      where: { id },
      include: { items: true, supplier: true, warehouse: true },
    });
  }

  // Create Purchase
  async createPurchase(dto: CreatePurchaseDto) {
    const totalAmount = dto.items.reduce((sum, item) => {
      return sum + item.quantity * item.price;
    }, 0);
    return this.prisma.purchase.create({
      data: {
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

  async recievePurchase(purchaseId: string) {
    return await this.prisma.$transaction(async (tx) => {
      // fetchc purchase order
      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
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
      //    Update Purchase Items
      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date(),
        },
      });
      //   Generate Stock Movement
      const movementPromises = purchase.items.map((item) => {
        return tx.stockMovement.create({
          data: {
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
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: purchase.warehouseId,
            },
          },
          update: {
            quantity: { increment: item.quantity },
          },
          create: {
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
