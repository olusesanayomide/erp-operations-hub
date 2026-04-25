import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const tenantId = 'tenant-1';
  const userId = 'user-1';

  let service: NotificationsService;
  let prisma: {
    userNotification: {
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      userNotification: {
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
    };

    service = new NotificationsService(prisma as any);
  });

  it('marks all unread notifications as read and returns a fresh unread count', async () => {
    prisma.userNotification.updateMany.mockResolvedValue({ count: 3 });

    const result = await service.markAllAsRead(tenantId, userId);

    expect(prisma.userNotification.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId,
        userId,
        readAt: null,
        archivedAt: null,
      },
      data: {
        readAt: expect.any(Date),
      },
    });
    expect(result).toEqual({ updatedCount: 3, unreadCount: 0 });
  });

  it('marks one notification as read and returns the remaining unread count', async () => {
    prisma.userNotification.findFirst.mockResolvedValue({
      id: 'user-notification-1',
      readAt: null,
    });
    prisma.userNotification.update.mockResolvedValue({
      id: 'user-notification-1',
      readAt: new Date('2026-04-25T18:00:00.000Z'),
    });
    prisma.userNotification.count.mockResolvedValue(2);

    const result = await service.markAsRead(tenantId, userId, 'notification-1');

    expect(prisma.userNotification.update).toHaveBeenCalledWith({
      where: { id: 'user-notification-1' },
      data: {
        readAt: expect.any(Date),
      },
    });
    expect(result.unreadCount).toBe(2);
  });

  it('rejects marking a notification outside the current user scope', async () => {
    prisma.userNotification.findFirst.mockResolvedValue(null);

    await expect(
      service.markAsRead(tenantId, userId, 'notification-1'),
    ).rejects.toThrow(new NotFoundException('Notification not found.'));

    expect(prisma.userNotification.update).not.toHaveBeenCalled();
  });
});
