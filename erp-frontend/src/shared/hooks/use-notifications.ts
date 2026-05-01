import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/shared/lib/erp-api';
import type { NotificationItem } from '@/shared/types/erp';

const unreadCountKey = ['notifications', 'unread-count'] as const;

function notificationListKey(limit: number) {
  return ['notifications', 'list', limit] as const;
}

export function useNotifications({
  enabled,
  isOpen,
  limit = 12,
}: {
  enabled: boolean;
  isOpen: boolean;
  limit?: number;
}) {
  const queryClient = useQueryClient();
  const listKey = notificationListKey(limit);

  const unreadQuery = useQuery({
    queryKey: unreadCountKey,
    queryFn: getUnreadNotificationCount,
    enabled,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const notificationsQuery = useQuery({
    queryKey: listKey,
    queryFn: () => listNotifications(limit),
    enabled: enabled && isOpen,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const markOneAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: (result, notificationId) => {
      queryClient.setQueryData<NotificationItem[]>(listKey, (current = []) =>
        current.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                isRead: true,
                readAt: notification.readAt ?? new Date().toISOString(),
              }
            : notification,
        ),
      );
      queryClient.setQueryData(unreadCountKey, {
        unreadCount: result.unreadCount ?? 0,
      });
      void queryClient.invalidateQueries({ queryKey: unreadCountKey });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: (result) => {
      const readAt = new Date().toISOString();

      queryClient.setQueryData<NotificationItem[]>(listKey, (current = []) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
          readAt: notification.readAt ?? readAt,
        })),
      );
      queryClient.setQueryData(unreadCountKey, {
        unreadCount: result.unreadCount ?? 0,
      });
      void queryClient.invalidateQueries({ queryKey: unreadCountKey });
    },
  });

  return {
    notifications: notificationsQuery.data ?? [],
    isLoadingNotifications: notificationsQuery.isLoading,
    isNotificationListError: notificationsQuery.isError,
    unreadCount: unreadQuery.data?.unreadCount ?? 0,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    markAllAsRead: markAllAsReadMutation.mutate,
    markOneAsRead: markOneAsReadMutation.mutateAsync,
    refetchNotifications: notificationsQuery.refetch,
  };
}
