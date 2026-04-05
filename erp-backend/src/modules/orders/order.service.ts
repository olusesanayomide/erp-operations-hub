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
    private inventoryService: InventoryService, // inject inventory service
  ) {}

  //   Create a new order
  async createOrder(customerId?: string) {
    return this.prisma.order.create({
      data: {
        customerId,
        status: OrderLifecycleStatus.DRAFT as any,
        totalAmount: 0,
      },
    });
  }

  //   Add an item to an order
  async addItem(
    orderId: string,
    productId: string,
    quantity: number,
    warehouseId: string, // warehouse to reduce stock from
  ) {
    // Fetch the order
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new BadRequestException('Order not found');
    if ((order.status as OrderLifecycleStatus) !== OrderLifecycleStatus.DRAFT)
      throw new BadRequestException('Cannot add items to a non-draft order');

    // Fetch product price
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new BadRequestException('product not found');
    const price = product.price;

    // Check stock
    const inventory = await this.prisma.inventoryItem.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    });

    if (!inventory || inventory.quantity < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    // Add item
    const orderItem = await this.prisma.orderItem.create({
      data: {
        orderId,
        productId,
        warehouseId,
        quantity,
        price,
      },
    });

    // Update totalAmount
    const newTotal =
      order.items.reduce((sum, item) => sum + item.price * item.quantity, 0) +
      price * quantity;

    await this.prisma.order.update({
      where: { id: orderId },
      data: { totalAmount: newTotal },
    });

    return orderItem;
  }

  //   Get all orders
  async getOrders() {
    return this.prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  //  Get Order by Id
  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
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

  //   Update order status
  async updateStatus(orderId: string, status: OrderLifecycleStatus) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
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
