import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthContext';
import { cn } from '@/shared/lib/utils';
import {
  LayoutDashboard, Package, Boxes, ShoppingCart, Truck,
  Users, Factory, Warehouse, Settings, ChevronLeft, LogOut, UserCircle
} from 'lucide-react';
import { RoleBadge } from '@/shared/components/StatusBadge';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', path: '/products', icon: Package },
  { label: 'Inventory', path: '/inventory', icon: Boxes },
  { label: 'Orders', path: '/orders', icon: ShoppingCart },
  { label: 'Purchases', path: '/purchases', icon: Truck },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Suppliers', path: '/suppliers', icon: Factory },
  { label: 'Warehouses', path: '/warehouses', icon: Warehouse },
  { label: 'Users', path: '/users', icon: UserCircle },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <aside className={cn(
      'flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 shrink-0',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <span className="text-lg font-bold text-sidebar-primary-foreground tracking-tight">
            Acme<span className="text-sidebar-primary">ERP</span>
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'p-1.5 rounded-md hover:bg-sidebar-accent transition-colors',
            collapsed ? 'mx-auto' : 'ml-auto'
          )}
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map(item => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User section */}
      {user && (
        <div className="border-t border-sidebar-border p-3">
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-sm font-semibold shrink-0">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{user.name}</p>
                <RoleBadge role={user.role} />
              </div>
            )}
            {!collapsed && (
              <button onClick={logout} className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-accent-foreground transition-colors" title="Logout">
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

