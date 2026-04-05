import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, UserRole } from '@/shared/types/erp';
import {
  ApiError,
  getStoredUser,
  setStoredToken,
  setStoredUser,
} from '@/shared/lib/api';
import { getCurrentUser, loginRequest, normalizeUser } from '@/shared/lib/erp-api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  canPerform: (action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const rolePermissions: Record<UserRole, string[]> = {
  admin: ['*'],
  manager: [
    'products.create', 'products.edit', 'products.view',
    'inventory.view', 'inventory.stock-in', 'inventory.stock-out', 'inventory.adjust',
    'orders.view', 'orders.create', 'orders.confirm', 'orders.pick', 'orders.ship', 'orders.deliver', 'orders.cancel',
    'purchases.view', 'purchases.create', 'purchases.confirm', 'purchases.receive',
    'customers.view', 'customers.create', 'customers.edit',
    'suppliers.view', 'suppliers.create', 'suppliers.edit',
    'warehouses.view', 'warehouses.create', 'warehouses.edit',
    'users.view',
  ],
  staff: [
    'products.view',
    'inventory.view',
    'orders.view', 'orders.create',
    'purchases.view',
    'customers.view', 'customers.create',
    'suppliers.view',
    'warehouses.view',
    'users.view-self',
  ],
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser<User>());

  useEffect(() => {
    if (!user) return;

    getCurrentUser()
      .then((nextUser) => {
        setUser((current) => {
          if (!current) return current;
          setStoredUser(nextUser);
          return nextUser;
        });
      })
      .catch(() => {
        setStoredToken(null);
        setStoredUser(null);
        setUser(null);
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await loginRequest(email, password);
      const nextUser = normalizeUser(result.user);
      setStoredToken(result.access_token);
      setStoredUser(nextUser);
      setUser(nextUser);
      return true;
    } catch (error) {
      if (!(error instanceof ApiError)) {
        console.error(error);
      }
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setStoredUser(null);
    setUser(null);
  }, []);

  const hasRole = useCallback((role: UserRole | UserRole[]) => {
    if (!user) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role);
  }, [user]);

  const canPerform = useCallback((action: string) => {
    if (!user) return false;
    const perms = rolePermissions[user.role];
    return perms.includes('*') || perms.includes(action);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, hasRole, canPerform }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

