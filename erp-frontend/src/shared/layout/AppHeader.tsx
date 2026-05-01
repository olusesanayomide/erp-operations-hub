import { useAuth } from '@/app/providers/AuthContext';
import { ChevronDown, LogOut, Menu } from 'lucide-react';
import { NotificationBell } from '@/shared/components/NotificationBell';
import { RoleBadge } from '@/shared/components/StatusBadge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/shared/ui/dropdown-menu';
import { Button } from '@/shared/ui/button';

export function AppHeader({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  const { user, logout } = useAuth();

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
        <NotificationBell enabled={!!user} />

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

