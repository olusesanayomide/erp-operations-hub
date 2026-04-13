import { Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationEntityType,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type CreateTenantNotificationInput = {
  tenantId: string;
  createdByUserId?: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  recipientUserIds?: string[];
  client?: Prisma.TransactionClient | PrismaService;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createForTenant(input: CreateTenantNotificationInput) {
    const client = input.client ?? this.prisma;
    const recipients = input.recipientUserIds?.length
      ? input.recipientUserIds
      : (
          await client.user.findMany({
            where: { tenantId: input.tenantId },
            select: { id: true },
          })
        ).map((user) => user.id);

    if (recipients.length === 0) {
      return null;
    }

    const notification = await client.notification.create({
      data: {
        tenantId: input.tenantId,
        type: input.type,
        title: input.title,
        message: input.message,
        entityType: input.entityType ?? NotificationEntityType.SYSTEM,
        entityId: input.entityId,
        createdByUserId: input.createdByUserId,
      },
    });

    await client.userNotification.createMany({
      data: recipients.map((userId) => ({
        tenantId: input.tenantId,
        notificationId: notification.id,
        userId,
      })),
      skipDuplicates: true,
    });

    return notification;
  }

  async listForUser(tenantId: string, userId: string, limit = 12) {
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const items = await this.prisma.userNotification.findMany({
      where: {
        tenantId,
        userId,
        archivedAt: null,
      },
      include: {
        notification: true,
      },
      orderBy: {
        notification: {
          createdAt: 'desc',
        },
      },
      take: safeLimit,
    });

    return items.map((item) => ({
      id: item.notification.id,
      type: item.notification.type,
      title: item.notification.title,
      message: item.notification.message,
      entityType: item.notification.entityType,
      entityId: item.notification.entityId,
      createdAt: item.notification.createdAt,
      readAt: item.readAt,
      isRead: !!item.readAt,
    }));
  }

  async getUnreadCount(tenantId: string, userId: string) {
    const unreadCount = await this.prisma.userNotification.count({
      where: {
        tenantId,
        userId,
        readAt: null,
        archivedAt: null,
      },
    });

    return { unreadCount };
  }

  async markAsRead(tenantId: string, userId: string, notificationId: string) {
    const item = await this.prisma.userNotification.findFirst({
      where: {
        tenantId,
        userId,
        notificationId,
        archivedAt: null,
      },
    });

    if (!item) {
      throw new NotFoundException('Notification not found.');
    }

    return this.prisma.userNotification.update({
      where: { id: item.id },
      data: {
        readAt: item.readAt ?? new Date(),
      },
    });
  }

  async markAllAsRead(tenantId: string, userId: string) {
    const result = await this.prisma.userNotification.updateMany({
      where: {
        tenantId,
        userId,
        readAt: null,
        archivedAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { updatedCount: result.count };
  }
}
