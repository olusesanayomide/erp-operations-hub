import { useState } from 'react';
import { useAuth } from '@/app/providers/AuthContext';
import { Search, Bell, ChevronDown, LogOut, UserCircle } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { RoleBadge } from '@/shared/components/StatusBadge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/shared/ui/dropdown-menu';

export function AppHeader({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-6 shrink-0">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 w-64 h-9 bg-muted/50 border-0 focus-visible:bg-background focus-visible:ring-1"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="h-4.5 w-4.5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
        </button>

        {/* User menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors">
                <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <span className="text-sm font-medium hidden lg:inline">{user.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden lg:inline" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <RoleBadge role={user.role} />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem><UserCircle className="mr-2 h-4 w-4" /> Profile</DropdownMenuItem>
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

