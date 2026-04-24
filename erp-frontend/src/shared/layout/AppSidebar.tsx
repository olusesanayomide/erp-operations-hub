import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthContext';
import { preloadRoute } from '@/app/routeModules';
import { cn } from '@/shared/lib/utils';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { Sheet, SheetContent } from '@/shared/ui/sheet';
import {
  LayoutDashboard, Package, Boxes, ShoppingCart, Truck,
  Users, Factory, Warehouse, Settings, ChevronLeft, LogOut, UserCircle, Building2, ChevronDown
} from 'lucide-react';
import { RoleBadge } from '@/shared/components/StatusBadge';

const navGroups = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Products', path: '/products', icon: Package },
      { label: 'Inventory', path: '/inventory', icon: Boxes },
      { label: 'Warehouses', path: '/warehouses', icon: Warehouse },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Orders', path: '/orders', icon: ShoppingCart },
      { label: 'Purchases', path: '/purchases', icon: Truck },
    ],
  },
  {
    label: 'Directory',
    items: [
      { label: 'Customers', path: '/customers', icon: Users },
      { label: 'Suppliers', path: '/suppliers', icon: Factory },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Users', path: '/users', icon: UserCircle },
      { label: 'Settings', path: '/settings', icon: Settings },
    ],
  },
];

export function AppSidebar({
  mobileOpen,
  onMobileOpenChange,
}: {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [closedGroups, setClosedGroups] = useState<string[]>([]);
  const { user, logout } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const groups = user?.isPlatformAdmin
    ? navGroups.map((group) =>
        group.label === 'Admin'
          ? {
              ...group,
              items: [...group.items, { label: 'Tenants', path: '/admin/tenants', icon: Building2 }],
            }
          : group,
      )
    : navGroups;

  const handleIntent = (path: string) => {
    void preloadRoute(path);
  };

  const toggleGroup = (label: string) => {
    setClosedGroups((current) =>
      current.includes(label)
        ? current.filter((groupLabel) => groupLabel !== label)
        : [...current, label],
    );
  };

  const navContent = (
    <aside className={cn(
      'flex h-full flex-col bg-sidebar text-sidebar-foreground md:h-screen',
      isMobile ? 'w-full' : 'border-r border-sidebar-border transition-all duration-300 shrink-0',
      !isMobile && (collapsed ? 'w-16' : 'w-60')
    )}>
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        {!collapsed && (
          <span className="text-lg font-bold text-sidebar-primary-foreground tracking-tight">
            Manifest
          </span>
        )}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'p-1.5 rounded-md hover:bg-sidebar-accent transition-colors',
              collapsed ? 'mx-auto' : 'ml-auto'
            )}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        {groups.map((group) => {
          const isGroupActive = group.items.some((item) => location.pathname.startsWith(item.path));
          const isOpen = collapsed || isGroupActive || !closedGroups.includes(group.label);

          return (
            <div key={group.label} className={cn(!collapsed && 'mb-3')}>
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className="mb-1 flex w-full items-center justify-between px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted transition-colors hover:text-sidebar-foreground"
                  aria-expanded={isOpen}
                >
                  <span>{group.label}</span>
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !isOpen && '-rotate-90')} />
                </button>
              )}

              {isOpen && (
                <div className="space-y-0.5">
                  {group.items.map(item => {
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => {
                          if (isMobile) {
                            onMobileOpenChange(false);
                          }
                        }}
                        onMouseEnter={() => handleIntent(item.path)}
                        onFocus={() => handleIntent(item.path)}
                        onTouchStart={() => handleIntent(item.path)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-primary-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                          collapsed && 'justify-center px-2'
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        <item.icon className="h-4.5 w-4.5 shrink-0" strokeWidth={2} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
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
              <button
                onClick={() => {
                  if (isMobile) {
                    onMobileOpenChange(false);
                  }
                  logout();
                }}
                className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-accent-foreground transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );

  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:right-3 [&>button]:top-3">
          {navContent}
        </SheetContent>
      </Sheet>
    );
  }

  return navContent;
}

