import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  NotificationEntityType,
  NotificationType,
  OrderStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { assertUnchangedSinceLoaded } from '../../common/concurrency';
import {
  createPaginatedResult,
  getPaginationOptions,
  hasListQuery,
  ListQuery,
} from '../../common/pagination';
import { OrderLifecycleStatus } from './order-status.enum';
import { CreateOrderDto } from './dto/order.dto';
import { NotificationsService } from '../../notifications/notifications.service';

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

const ORDER_STATUS_DB_MAP: Record<OrderLifecycleStatus, OrderStatus> = {
  [OrderLifecycleStatus.DRAFT]: OrderStatus.DRAFT,
  [OrderLifecycleStatus.CONFIRMED]: OrderStatus.CONFIRMED,
  [OrderLifecycleStatus.PICKED]: OrderStatus.PICKED,
  [OrderLifecycleStatus.SHIPPED]: OrderStatus.SHIPPED,
  [OrderLifecycleStatus.DELIVERED]: OrderStatus.DELIVERED,
  [OrderLifecycleStatus.CANCELLED]: OrderStatus.CANCELLED,
};

const INTERACTIVE_TRANSACTION_OPTIONS = {
  maxWait: 15000,
  timeout: 30000,
} as const;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async notifyTenant(
    input: Parameters<NotificationsService['createForTenant']>[0],
  ) {
    try {
      await this.notificationsService.createForTenant(input);
    } catch (error) {
      this.logger.error('Order notification could not be created.', error);
    }
  }

  private queueTenantNotification(
    input: Parameters<NotificationsService['createForTenant']>[0],
  ) {
    void this.notifyTenant(input);
  }

  private aggregateStockBuckets(
    items: Array<{ productId: string; warehouseId: string; quantity: number }>,
  ) {
    const buckets = new Map<
      string,
      { productId: string; warehouseId: string; quantity: number }
    >();

    for (const item of items) {
      const key = `${item.productId}:${item.warehouseId}`;
      const existing = buckets.get(key);

      if (existing) {
        existing.quantity += item.quantity;
        continue;
      }

      buckets.set(key, {
        productId: item.productId,
        warehouseId: item.warehouseId,
        quantity: item.quantity,
      });
    }

    return Array.from(buckets.values());
  }

  private async reserveOrderItemStock(
    tx: Prisma.TransactionClient,
    tenantId: string,
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
        reservedQuantity: { increment: quantity },
      },
    });

    if (updatedInventory.count === 0) {
      throw new BadRequestException('Insufficient stock');
    }
  }

  private async releaseOrderItemStock(
    tx: Prisma.TransactionClient,
    tenantId: string,
    productId: string,
    warehouseId: string,
    quantity: number,
  ) {
    const updatedInventory = await tx.inventoryItem.updateMany({
      where: {
        tenantId,
        productId,
        warehouseId,
        reservedQuantity: { gte: quantity },
      },
      data: {
        quantity: { increment: quantity },
        reservedQuantity: { decrement: quantity },
      },
    });

    if (updatedInventory.count === 0) {
      throw new BadRequestException('Reserved stock could not be released');
    }
  }

  private async consumeReservedOrderItemStock(
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
        reservedQuantity: { gte: quantity },
      },
      data: {
        reservedQuantity: { decrement: quantity },
      },
    });

    if (updatedInventory.count === 0) {
      throw new BadRequestException('Insufficient reserved stock');
    }

    await tx.stockMovement.create({
      data: {
        tenantId,
        productId,
        warehouseId,
        quantity: -quantity,
        type: 'OUT',
        reference: `Order ${orderId} shipped`,
      },
    });
  }

  async createOrder(tenantId: string, userId: string, dto: CreateOrderDto) {
    if (!dto.items?.length) {
      throw new BadRequestException(
        'Add at least one item before creating the order',
      );
    }

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId },
      });

      if (!customer) {
        throw new BadRequestException('Customer not found');
      }
    }

    const productIds = Array.from(
      new Set(dto.items.map((item) => item.productId)),
    );
    const warehouseIds = Array.from(
      new Set(dto.items.map((item) => item.warehouseId)),
    );

    const [products, warehouses] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          tenantId,
          id: { in: productIds },
        },
      }),
      this.prisma.warehouse.findMany({
        where: {
          tenantId,
          id: { in: warehouseIds },
        },
      }),
    ]);

    if (products.length !== productIds.length) {
      throw new BadRequestException(
        'One or more products do not exist in the current tenant.',
      );
    }

    if (warehouses.length !== warehouseIds.length) {
      throw new BadRequestException(
        'One or more warehouses do not exist in the current tenant.',
      );
    }

    const productsById = new Map(
      products.map((product) => [product.id, product]),
    );
    const totalAmount = dto.items.reduce((sum, item) => {
      const product = productsById.get(item.productId);
      if (!product) {
        throw new BadRequestException('Product not found');
      }

      return sum.plus(new Prisma.Decimal(product.price).mul(item.quantity));
    }, new Prisma.Decimal(0));

    const order = await this.prisma.order.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        status: ORDER_STATUS_DB_MAP[OrderLifecycleStatus.DRAFT],
        totalAmount,
        items: {
          create: dto.items.map((item) => {
            const product = productsById.get(item.productId);

            if (!product) {
              throw new BadRequestException('Product not found');
            }

            return {
              productId: item.productId,
              warehouseId: item.warehouseId,
              quantity: item.quantity,
              price: new Prisma.Decimal(product.price),
            };
          }),
        },
      },
      include: { items: true },
    });

    this.queueTenantNotification({
      tenantId,
      createdByUserId: userId,
      type: NotificationType.ORDER_CREATED,
      title: 'New order created',
      message: `Order ${order.id.slice(0, 8).toUpperCase()} was created as a draft.`,
      entityType: NotificationEntityType.ORDER,
      entityId: order.id,
    });

    return order;
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

  async getOrders(tenantId: string, query: ListQuery = {}) {
    if (hasListQuery(query)) {
      const options = getPaginationOptions(query);
      const requestedStatus = query.status?.trim().toUpperCase();
      const status = Object.values(OrderStatus).includes(
        requestedStatus as OrderStatus,
      )
        ? (requestedStatus as OrderStatus)
        : undefined;
      const where: Prisma.OrderWhereInput = {
        tenantId,
        ...(status ? { status } : {}),
        ...(options.search
          ? {
              OR: [
                { id: { contains: options.search, mode: 'insensitive' } },
                {
                  customer: {
                    is: {
                      name: { contains: options.search, mode: 'insensitive' },
                    },
                  },
                },
              ],
            }
          : {}),
      } as const;
      const [items, total] = await Promise.all([
        this.prisma.order.findMany({
          where,
          include: { items: true, customer: true },
          orderBy: { createdAt: 'desc' },
          skip: options.skip,
          take: options.pageSize,
        }),
        this.prisma.order.count({ where }),
      ]);

      return createPaginatedResult(items, total, options);
    }

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
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async updateStatus(
    tenantId: string,
    userId: string,
    orderId: string,
    status: OrderLifecycleStatus,
    expectedUpdatedAt?: string,
  ) {
    const { updatedOrder, currentStatus } = await this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findFirst({
          where: { id: orderId, tenantId },
          include: { items: true },
        });

        if (!order) {
          throw new BadRequestException('Order not found');
        }

        assertUnchangedSinceLoaded(order.updatedAt, expectedUpdatedAt);

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

        if (
          currentStatus === OrderLifecycleStatus.DRAFT &&
          status === OrderLifecycleStatus.CONFIRMED &&
          order.items.length === 0
        ) {
          throw new BadRequestException(
            'Add at least one item before confirming the order',
          );
        }

        if (
          currentStatus === OrderLifecycleStatus.DRAFT &&
          status === OrderLifecycleStatus.CONFIRMED
        ) {
          for (const item of this.aggregateStockBuckets(order.items)) {
            await this.reserveOrderItemStock(
              tx,
              tenantId,
              item.productId,
              item.warehouseId,
              item.quantity,
            );
          }
        }

        if (
          currentStatus === OrderLifecycleStatus.PICKED &&
          status === OrderLifecycleStatus.SHIPPED
        ) {
          for (const item of this.aggregateStockBuckets(order.items)) {
            await this.consumeReservedOrderItemStock(
              tx,
              tenantId,
              orderId,
              item.productId,
              item.warehouseId,
              item.quantity,
            );
          }
        }

        if (
          status === OrderLifecycleStatus.CANCELLED &&
          (currentStatus === OrderLifecycleStatus.CONFIRMED ||
            currentStatus === OrderLifecycleStatus.PICKED)
        ) {
          for (const item of this.aggregateStockBuckets(order.items)) {
            await this.releaseOrderItemStock(
              tx,
              tenantId,
              item.productId,
              item.warehouseId,
              item.quantity,
            );
          }
        }

        const updateResult = await tx.order.updateMany({
          where: { id: orderId, tenantId },
          data: { status: ORDER_STATUS_DB_MAP[status] },
        });

        if (updateResult.count === 0) {
          throw new BadRequestException('Order not found');
        }

        const updatedOrder = await tx.order.findFirst({
          where: { id: orderId, tenantId },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            customer: true,
          },
        });

        if (!updatedOrder) {
          throw new BadRequestException('Order not found');
        }

        return { updatedOrder, currentStatus };
      },
      INTERACTIVE_TRANSACTION_OPTIONS,
    );

    this.queueTenantNotification({
      tenantId,
      createdByUserId: userId,
      type: NotificationType.ORDER_STATUS_CHANGED,
      title: 'Order status updated',
      message: `Order ${orderId.slice(0, 8).toUpperCase()} moved from ${currentStatus.toLowerCase()} to ${status.toLowerCase()}.`,
      entityType: NotificationEntityType.ORDER,
      entityId: orderId,
    });

    return updatedOrder;
  }
}
