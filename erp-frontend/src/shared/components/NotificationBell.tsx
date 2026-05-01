import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, PackageCheck, ShoppingCart, Truck } from 'lucide-react';
import { useNotifications } from '@/shared/hooks/use-notifications';
import type { NotificationItem } from '@/shared/types/erp';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { cn } from '@/shared/lib/utils';

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getNotificationHref(notification: NotificationItem) {
  if (!notification.entityId) return null;
  if (notification.entityType === 'order') return `/orders/${notification.entityId}`;
  if (notification.entityType === 'purchase') return `/purchases/${notification.entityId}`;
  return null;
}

function getNotificationIcon(notification: NotificationItem) {
  if (notification.type === 'purchase_received') return PackageCheck;
  if (notification.entityType === 'purchase') return Truck;
  if (notification.entityType === 'order') return ShoppingCart;
  return Bell;
}

function getDayGroup(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Earlier';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfNotificationDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startOfToday - startOfNotificationDay) / 86_400_000);

  if (dayDiff === 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  return 'Earlier';
}

function groupNotifications(notifications: NotificationItem[]) {
  const groups = new Map<string, NotificationItem[]>();

  notifications.forEach((notification) => {
    const group = getDayGroup(notification.createdAt);
    groups.set(group, [...(groups.get(group) ?? []), notification]);
  });

  return Array.from(groups.entries());
}

export function NotificationBell({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const {
    notifications,
    isLoadingNotifications,
    isNotificationListError,
    unreadCount,
    isMarkingAllAsRead,
    markAllAsRead,
    markOneAsRead,
    refetchNotifications,
  } = useNotifications({ enabled, isOpen: open });

  const unreadLabel = useMemo(() => {
    if (unreadCount <= 0) return null;
    return unreadCount > 9 ? '9+' : String(unreadCount);
  }, [unreadCount]);

  const groupedNotifications = useMemo(
    () => groupNotifications(notifications),
    [notifications],
  );

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      await markOneAsRead(notification.id);
    }

    const href = getNotificationHref(notification);
    if (href) {
      setOpen(false);
      navigate(href);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative rounded-lg p-2 transition-colors hover:bg-muted"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5 text-muted-foreground" />
          {unreadLabel && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadLabel}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[calc(100vw-2rem)] max-w-[360px] overflow-hidden rounded-xl p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            requiresOnline
            className="h-9 px-2 text-xs"
            disabled={unreadCount === 0 || isMarkingAllAsRead}
            onClick={() => markAllAsRead()}
          >
            <CheckCheck className="mr-1 h-4 w-4" />
            Mark all read
          </Button>
        </div>

        <ScrollArea className="max-h-[420px]">
          <div className="p-2">
            {isLoadingNotifications && (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                Loading notifications...
              </div>
            )}

            {isNotificationListError && !isLoadingNotifications && (
              <div className="space-y-3 px-3 py-6 text-center">
                <p className="text-sm font-medium">Notifications could not be loaded.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refetchNotifications()}
                >
                  Try again
                </Button>
              </div>
            )}

            {!isLoadingNotifications && !isNotificationListError && notifications.length === 0 && (
              <div className="rounded-lg px-3 py-8 text-center text-sm text-muted-foreground">
                No notifications yet.
              </div>
            )}

            {!isLoadingNotifications && !isNotificationListError && groupedNotifications.map(([group, items]) => (
              <div key={group} className="mb-3 last:mb-0">
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase text-muted-foreground">
                  {group}
                </p>
                <div className="space-y-1.5">
                  {items.map((notification) => {
                    const Icon = getNotificationIcon(notification);

                    return (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => void handleNotificationClick(notification)}
                        className="w-full rounded-lg border border-transparent px-3 py-3 text-left transition-colors hover:border-border hover:bg-muted/40"
                      >
                        <div className="flex gap-3">
                          <div
                            className={cn(
                              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                              notification.isRead
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-primary/10 text-primary',
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p className="truncate text-sm font-medium text-foreground">
                                {notification.title}
                              </p>
                              {!notification.isRead && (
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                              )}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {notification.message}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {formatNotificationTime(notification.createdAt)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
