import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { OrderLifecycleStatus } from './order-status.enum';

const ORDER_STATUS_TRANSITIONS: Record<
  OrderLifecycleStatus,
  OrderLifecycleStatus[]
> = {
  [OrderLifecycleStatus.DRAFT]: [
    OrderLifecycleStatus.CONFIRMED,
    OrderLifecycleStatus.CANCELLED,
  ],
  [OrderLifecycleStatus.CONFIRMED]: [
    OrderLifecycleStatus.PICKED,
    OrderLifecycleStatus.CANCELLED,
  ],
  [OrderLifecycleStatus.PICKED]: [
    OrderLifecycleStatus.SHIPPED,
    OrderLifecycleStatus.CANCELLED,
  ],
  [OrderLifecycleStatus.SHIPPED]: [OrderLifecycleStatus.DELIVERED],
  [OrderLifecycleStatus.DELIVERED]: [],
  [OrderLifecycleStatus.CANCELLED]: [],
};

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private async reserveOrderItemStock(
    tx: Prisma.TransactionClient,
    tenantId: string,
    orderId: string,
    productId: string,
    warehouseId: string,
    quantity: number,
  ) {
    const updatedInventory = await tx.inventoryItem.updateMany({
      where: {
        tenantId,
        productId,
        warehouseId,
        quantity: { gte: quantity },
      },
      data: {
        quantity: { decrement: quantity },
      },
    });

    if (updatedInventory.count === 0) {
      throw new BadRequestException('Insufficient stock');
    }

    await tx.stockMovement.create({
      data: {
        tenantId,
        productId,
        warehouseId,
        quantity: -quantity,
        type: 'OUT',
        reference: `Order ${orderId} confirmed`,
      },
    });
  }

  private async releaseOrderItemStock(
    tx: Prisma.TransactionClient,
    tenantId: string,
    orderId: string,
    productId: string,
    warehouseId: string,
    quantity: number,
  ) {
    await tx.inventoryItem.upsert({
      where: {
        tenantId_productId_warehouseId: {
          tenantId,
          productId,
          warehouseId,
        },
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
    });

    await tx.stockMovement.create({
      data: {
        tenantId,
        productId,
        warehouseId,
        quantity,
        type: 'IN',
        reference: `Order ${orderId} cancelled`,
      },
    });
  }

  async createOrder(tenantId: string, customerId?: string) {
    if (customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: customerId, tenantId },
      });

      if (!customer) {
        throw new BadRequestException('Customer not found');
      }
    }

    return this.prisma.order.create({
      data: {
        tenantId,
        customerId,
        status: OrderLifecycleStatus.DRAFT as any,
        totalAmount: 0,
      },
    });
  }

  async addItem(
    tenantId: string,
    orderId: string,
    productId: string,
    quantity: number,
    warehouseId: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { items: true },
    });

    if (!order) throw new BadRequestException('Order not found');
    if ((order.status as OrderLifecycleStatus) !== OrderLifecycleStatus.DRAFT)
      throw new BadRequestException('Cannot add items to a non-draft order');

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!product) throw new BadRequestException('product not found');
    const price = new Prisma.Decimal(product.price);

    const inventory = await this.prisma.inventoryItem.findUnique({
      where: {
        tenantId_productId_warehouseId: { tenantId, productId, warehouseId },
      },
    });

    if (!inventory || inventory.quantity < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    const orderItem = await this.prisma.orderItem.create({
      data: {
        orderId,
        productId,
        warehouseId,
        quantity,
        price,
      },
    });

    const existingTotal = order.items.reduce(
      (sum, item) =>
        sum.plus(new Prisma.Decimal(item.price).mul(item.quantity)),
      new Prisma.Decimal(0),
    );
    const newTotal = existingTotal.plus(price.mul(quantity));

    await this.prisma.order.update({
      where: { id: orderId },
      data: { totalAmount: newTotal },
    });

    return orderItem;
  }

  async getOrders(tenantId: string) {
    return this.prisma.order.findMany({
      where: { tenantId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(tenantId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });
    if (!order) {
      throw new NotFoundException(`Order wiht ID ${id} not found`);
    }
    return order;
  }

  async updateStatus(
    tenantId: string,
    orderId: string,
    status: OrderLifecycleStatus,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, tenantId },
        include: { items: true },
      });

      if (!order) {
        throw new BadRequestException('Order not found');
      }

      const currentStatus = order.status as OrderLifecycleStatus;

      if (currentStatus === status) {
        throw new BadRequestException('Order is already in that status');
      }

      const allowedTransitions = ORDER_STATUS_TRANSITIONS[currentStatus];
      if (!allowedTransitions.includes(status)) {
        throw new BadRequestException(
          `Invalid status transition from ${currentStatus} to ${status}`,
        );
      }

      const isConfirmingOrder =
        currentStatus === OrderLifecycleStatus.DRAFT &&
        status === OrderLifecycleStatus.CONFIRMED;

      if (isConfirmingOrder) {
        if (order.items.length === 0) {
          throw new BadRequestException(
            'Add at least one item before confirming the order',
          );
        }

        for (const item of order.items) {
          await this.reserveOrderItemStock(
            tx,
            tenantId,
            orderId,
            item.productId,
            item.warehouseId,
            item.quantity,
          );
        }
      }

      const isCancellingReservedOrder =
        status === OrderLifecycleStatus.CANCELLED &&
        (currentStatus === OrderLifecycleStatus.CONFIRMED ||
          currentStatus === OrderLifecycleStatus.PICKED);

      if (isCancellingReservedOrder) {
        for (const item of order.items) {
          await this.releaseOrderItemStock(
            tx,
            tenantId,
            orderId,
            item.productId,
            item.warehouseId,
            item.quantity,
          );
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status: status as any },
      });
    });
  }
}
