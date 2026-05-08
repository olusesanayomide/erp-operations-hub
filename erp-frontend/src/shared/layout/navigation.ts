import {
  Bell,
  Boxes,
  Building2,
  Factory,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  UserCircle,
  Warehouse,
} from 'lucide-react';

export type NavigationItem = {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

const baseNavigationGroups: NavigationGroup[] = [
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
      { label: 'Sales', path: '/orders', icon: ShoppingCart },
      { label: 'Purchases', path: '/purchases', icon: Truck },
    ],
  },
  {
    label: 'Directory',
    items: [
      { label: 'Customers', path: '/customers', icon: UserCircle },
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

export function buildNavigationGroups(isPlatformAdmin: boolean): NavigationGroup[] {
  if (!isPlatformAdmin) {
    return baseNavigationGroups;
  }

  return baseNavigationGroups.map((group) =>
    group.label === 'Admin'
      ? {
          ...group,
          items: [...group.items, { label: 'Tenants', path: '/admin/tenants', icon: Building2 }],
        }
      : group,
  );
}

export const mobileTabItems = [
  { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Inventory', path: '/inventory', icon: Boxes },
  { label: 'Sales', path: '/orders', icon: ShoppingCart },
  { label: 'Alerts', icon: Bell },
  { label: 'Menu', icon: Menu },
] as const;
