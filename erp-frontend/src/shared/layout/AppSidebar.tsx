import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthContext';
import { preloadRoute } from '@/app/routeModules';
import { cn } from '@/shared/lib/utils';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { Sheet, SheetContent } from '@/shared/ui/sheet';
import { ChevronDown, ChevronLeft, LogOut } from 'lucide-react';
import { buildNavigationGroups } from './navigation';
import { Button } from '@/shared/ui/button';

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
  const groups = buildNavigationGroups(!!user?.isPlatformAdmin);

  useEffect(() => {
    if (!isMobile || !mobileOpen) {
      return;
    }

    setClosedGroups(
      groups
        .filter((group) => !group.items.some((item) => location.pathname.startsWith(item.path)))
        .map((group) => group.label),
    );
  }, [groups, isMobile, location.pathname, mobileOpen]);

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

  const getGroupAccentClasses = (label: string) => {
    if (label === 'Overview') return 'bg-white/70 border-white/70';
    if (label === 'Inventory') return 'bg-sky-400/10 border-sky-300/20';
    if (label === 'Operations') return 'bg-emerald-400/10 border-emerald-300/20';
    if (label === 'Directory') return 'bg-amber-400/10 border-amber-300/20';
    return 'bg-slate-400/10 border-slate-300/20';
  };

  const getItemIconClasses = (groupLabel: string, isActive: boolean) => {
    if (isActive) return 'bg-white text-slate-900';
    if (groupLabel === 'Inventory') return 'bg-sky-400/15 text-sky-100';
    if (groupLabel === 'Operations') return 'bg-emerald-400/15 text-emerald-100';
    if (groupLabel === 'Directory') return 'bg-amber-400/15 text-amber-100';
    if (groupLabel === 'Admin') return 'bg-slate-200/15 text-slate-100';
    return 'bg-white/15 text-white';
  };

  const getItemIconStrokeWidth = (groupLabel: string) => {
    if (groupLabel === 'Inventory') return 1.9;
    return 2;
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
            <div
              key={group.label}
              className={cn(
                !collapsed && 'mb-3 rounded-2xl border p-1.5',
                !collapsed && getGroupAccentClasses(group.label),
              )}
            >
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className="mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/80 transition-colors hover:text-sidebar-foreground"
                  aria-expanded={isOpen}
                >
                  <span>{group.label}</span>
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !isOpen && '-rotate-90')} />
                </button>
              )}

              <div
                className={cn(
                  'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                )}
              >
                <div className="overflow-hidden">
                  <div className="space-y-1 pt-0.5">
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
                            'flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-white text-slate-950 shadow-[0_8px_20px_rgba(15,23,42,0.18)]'
                              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                            collapsed && 'justify-center px-2'
                          )}
                          title={collapsed ? item.label : undefined}
                        >
                          <span
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                              getItemIconClasses(group.label, isActive),
                            )}
                          >
                            <item.icon className="h-4.5 w-4.5 shrink-0" strokeWidth={2} />
                          </span>
                          {!collapsed && (
                            <span className="truncate">
                              <item.icon className="hidden" strokeWidth={getItemIconStrokeWidth(group.label)} />
                              {item.label}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {isMobile && user && (
        <div className="border-t border-sidebar-border px-4 py-3">
          <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/35 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white">
                {user.name.split(' ').map((segment) => segment[0]).join('').slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-sidebar-primary-foreground">{user.name}</p>
                <p className="mt-0.5 truncate text-xs text-sidebar-muted">{user.email}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="mt-2 h-9 w-full justify-center text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={() => void logout()}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        </div>
      )}

    </aside>
  );

  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:right-3 [&>button]:top-3 [&>button]:h-11 [&>button]:w-11 [&>button]:rounded-full">
          {navContent}
        </SheetContent>
      </Sheet>
    );
  }

  return navContent;
}

