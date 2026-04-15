import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationEntityType,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchaseLifecycleStatus } from './purchase-status.enum';
import { NotificationsService } from '../../notifications/notifications.service';

const PURCHASE_STATUS_TRANSITIONS: Record<
  PurchaseLifecycleStatus,
  PurchaseLifecycleStatus[]
> = {
  [PurchaseLifecycleStatus.DRAFT]: [
    PurchaseLifecycleStatus.CONFIRMED,
    PurchaseLifecycleStatus.CANCELLED,
  ],
  [PurchaseLifecycleStatus.CONFIRMED]: [
    PurchaseLifecycleStatus.SHIPPED,
    PurchaseLifecycleStatus.RECEIVED,
    PurchaseLifecycleStatus.CANCELLED,
  ],
  [PurchaseLifecycleStatus.SHIPPED]: [PurchaseLifecycleStatus.RECEIVED],
  [PurchaseLifecycleStatus.RECEIVED]: [],
  [PurchaseLifecycleStatus.CANCELLED]: [],
};

@Injectable()
export class PurchaseService {
  constructor(
    private prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private formatPurchaseOrderDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private async generatePurchaseOrderNumber(
    client: Prisma.TransactionClient | PrismaService,
    tenantId: string,
  ) {
    const prefix = `PO-${this.formatPurchaseOrderDate()}`;
    const existingCount = await client.purchase.count({
      where: {
        tenantId,
        purchaseOrder: {
          startsWith: prefix,
        },
      },
    });

    return `${prefix}-${String(existingCount + 1).padStart(4, '0')}`;
  }

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

  async createPurchase(
    tenantId: string,
    userId: string,
    dto: CreatePurchaseDto,
  ) {
    const productIds = Array.from(
      new Set(dto.items.map((item) => item.productId)),
    );

    const [supplier, warehouse, products] = await Promise.all([
      this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, tenantId },
      }),
      this.prisma.warehouse.findFirst({
        where: { id: dto.warehouseId, tenantId },
      }),
      this.prisma.product.findMany({
        where: {
          tenantId,
          id: { in: productIds },
        },
        select: { id: true },
      }),
    ]);

    if (!supplier) {
      throw new BadRequestException('Supplier not found');
    }

    if (!warehouse) {
      throw new BadRequestException('Warehouse not found');
    }

    if (productIds.length !== products.length) {
      throw new BadRequestException(
        'One or more products do not exist in the current tenant.',
      );
    }

    const totalAmount = dto.items.reduce(
      (sum, item) =>
        sum.plus(new Prisma.Decimal(item.price).mul(item.quantity)),
      new Prisma.Decimal(0),
    );
    const manualPurchaseOrder = dto.purchaseOrder?.trim();

    const purchase = await this.prisma.$transaction(async (tx) => {
      const maxAttempts = manualPurchaseOrder ? 1 : 5;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const purchaseOrder =
          manualPurchaseOrder ||
          (await this.generatePurchaseOrderNumber(tx, tenantId));

        try {
          return await tx.purchase.create({
            data: {
              tenantId,
              purchaseOrder,
              supplierId: dto.supplierId,
              warehouseId: dto.warehouseId,
              totalAmount: totalAmount,
              status: PurchaseLifecycleStatus.DRAFT,
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
        } catch (error) {
          const isPurchaseOrderConflict =
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002' &&
            Array.isArray(error.meta?.target) &&
            error.meta.target.includes('tenantId') &&
            error.meta.target.includes('purchaseOrder');

          if (!isPurchaseOrderConflict || manualPurchaseOrder) {
            throw error;
          }

          if (attempt === maxAttempts - 1) {
            throw new BadRequestException(
              'Unable to generate a unique purchase order number. Please try again.',
            );
          }
        }
      }

      throw new BadRequestException('Purchase order could not be created.');
    });

    await this.notificationsService.createForTenant({
      tenantId,
      createdByUserId: userId,
      type: NotificationType.PURCHASE_CREATED,
      title: 'New purchase order created',
      message: `Purchase order ${purchase.purchaseOrder} was created as a draft.`,
      entityType: NotificationEntityType.PURCHASE,
      entityId: purchase.id,
    });

    return purchase;
  }

  async recievePurchase(tenantId: string, userId: string, purchaseId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id: purchaseId, tenantId },
        include: { items: true },
      });
      if (!purchase) {
        throw new NotFoundException('Purchase order not found');
      }
      const currentStatus = purchase.status as PurchaseLifecycleStatus;
      if (
        !PURCHASE_STATUS_TRANSITIONS[currentStatus].includes(
          PurchaseLifecycleStatus.RECEIVED,
        )
      ) {
        throw new BadRequestException(
          `Invalid status transition from ${currentStatus} to ${PurchaseLifecycleStatus.RECEIVED}`,
        );
      }
      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: PurchaseLifecycleStatus.RECEIVED,
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

      await this.notificationsService.createForTenant({
        client: tx,
        tenantId,
        createdByUserId: userId,
        type: NotificationType.PURCHASE_RECEIVED,
        title: 'Purchase order received',
        message: `Purchase order ${purchase.purchaseOrder} was marked as received and inventory was updated.`,
        entityType: NotificationEntityType.PURCHASE,
        entityId: purchase.id,
      });

      return {
        success: true,
        message: 'Purchase order received and stock updated',
      };
    });
  }

  async updateStatus(
    tenantId: string,
    userId: string,
    purchaseId: string,
    status: PurchaseLifecycleStatus,
  ) {
    if (status === PurchaseLifecycleStatus.RECEIVED) {
      return this.recievePurchase(tenantId, userId, purchaseId);
    }

    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id: purchaseId, tenantId },
      });

      if (!purchase) {
        throw new NotFoundException('Purchase order not found');
      }

      const currentStatus = purchase.status as PurchaseLifecycleStatus;

      if (currentStatus === status) {
        throw new BadRequestException(
          'Purchase order is already in that status',
        );
      }

      const allowedTransitions = PURCHASE_STATUS_TRANSITIONS[currentStatus];
      if (!allowedTransitions.includes(status)) {
        throw new BadRequestException(
          `Invalid status transition from ${currentStatus} to ${status}`,
        );
      }

      const updatedPurchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: { status },
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

      await this.notificationsService.createForTenant({
        client: tx,
        tenantId,
        createdByUserId: userId,
        type: NotificationType.PURCHASE_STATUS_CHANGED,
        title: 'Purchase status updated',
        message: `Purchase order ${purchase.purchaseOrder} moved from ${currentStatus.toLowerCase()} to ${status.toLowerCase()}.`,
        entityType: NotificationEntityType.PURCHASE,
        entityId: purchaseId,
      });

      return updatedPurchase;
    });
  }
}
