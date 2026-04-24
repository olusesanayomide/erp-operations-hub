import { useMemo } from 'react';
import { useAuth } from '@/app/providers/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, CheckCheck, Menu } from 'lucide-react';
import { RoleBadge } from '@/shared/components/StatusBadge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/shared/ui/dropdown-menu';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { ScrollArea } from '@/shared/ui/scroll-area';
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/shared/lib/erp-api';
import type { NotificationItem } from '@/shared/types/erp';

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

export function AppHeader({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => listNotifications(12),
    refetchInterval: 60000,
    enabled: !!user,
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadNotificationCount,
    refetchInterval: 30000,
    enabled: !!user,
  });

  const unreadCount = unreadData?.unreadCount ?? 0;

  const markOneAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const unreadLabel = useMemo(() => {
    if (unreadCount <= 0) return null;
    return unreadCount > 9 ? '9+' : String(unreadCount);
  }, [unreadCount]);

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      await markOneAsReadMutation.mutateAsync(notification.id);
    }

    const href = getNotificationHref(notification);
    if (href) {
      navigate(href);
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-card px-4 xs:px-5 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h2 className="truncate text-base font-semibold tracking-tight xs:text-lg">{title}</h2>
      </div>

      <div className="flex items-center gap-1.5 xs:gap-3">
        <Popover>
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
          <PopoverContent align="end" className="w-[calc(100vw-2rem)] max-w-[360px] p-0">
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
                className="h-8 px-2 text-xs"
                disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
                onClick={() => markAllAsReadMutation.mutate()}
              >
                <CheckCheck className="mr-1 h-4 w-4" />
                Mark all read
              </Button>
            </div>

            <ScrollArea className="max-h-[420px]">
              <div className="p-2">
                {notifications.length === 0 ? (
                  <div className="rounded-lg px-3 py-8 text-center text-sm text-muted-foreground">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => void handleNotificationClick(notification)}
                      className="mb-2 w-full rounded-xl border px-3 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-foreground">
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <Badge variant="secondary" className="px-2 py-0 text-[10px]">
                                New
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {notification.message}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* User menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-muted">
                <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <span className="hidden max-w-[10rem] truncate text-sm font-medium md:inline">{user.name}</span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:inline" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <RoleBadge role={user.role} />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

