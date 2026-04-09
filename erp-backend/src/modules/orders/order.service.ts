import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
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
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
  ) {}

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
    const price = product.price;

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

    const newTotal =
      order.items.reduce((sum, item) => sum + item.price * item.quantity, 0) +
      price * quantity;

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
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { items: true },
    });
    if (!order) throw new BadRequestException('Order not found');
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
        await this.inventoryService.stockOut(
          tenantId,
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
        await this.inventoryService.stockIn(
          tenantId,
          item.productId,
          item.warehouseId,
          item.quantity,
        );
      }
    }
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: status as any },
    });
  }
}
