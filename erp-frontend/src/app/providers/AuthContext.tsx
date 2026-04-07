import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, UserRole } from '@/shared/types/erp';
import {
  ApiError,
  getStoredUser,
  setStoredToken,
  setStoredUser,
} from '@/shared/lib/api';
import {
  getCurrentUser,
  loginRequest,
  loginWithSupabase,
  logoutSupabase,
  normalizeUser,
} from '@/shared/lib/erp-api';
import { AUTH_MODE, isSupabaseAuthConfigured, supabase } from '@/shared/lib/supabase';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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
    'inventory.view', 'inventory.stock-in', 'inventory.stock-out', 'inventory.transfer', 'inventory.adjust',
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (AUTH_MODE === 'supabase') {
      if (!isSupabaseAuthConfigured || !supabase) {
        console.warn('Supabase auth mode is enabled, but the client is not configured.');
        setStoredToken(null);
        setStoredUser(null);
        setUser(null);
        setIsLoading(false);
        return;
      }

      let mounted = true;

      supabase.auth
        .getSession()
        .then(({ data, error }) => {
          if (!mounted) return;

          if (error || !data.session?.user) {
            setStoredUser(null);
            setUser(null);
            setIsLoading(false);
            return;
          }

          return getCurrentUser()
            .then((nextUser) => {
              if (!mounted) return;
              setStoredUser(nextUser);
              setUser(nextUser);
            })
            .catch(() => {
              if (!mounted) return;
              setStoredUser(null);
              setUser(null);
            })
            .finally(() => {
              if (mounted) setIsLoading(false);
            });
        })
        .finally(() => {
          if (mounted) setIsLoading(false);
        });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;

        if (!session?.user) {
          setStoredUser(null);
          setUser(null);
          setIsLoading(false);
          return;
        }

        void getCurrentUser()
          .then((nextUser) => {
            if (!mounted) return;
            setStoredUser(nextUser);
            setUser(nextUser);
          })
          .catch(() => {
            if (!mounted) return;
            setStoredUser(null);
            setUser(null);
          })
          .finally(() => {
            if (mounted) setIsLoading(false);
          });
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }

    if (!user) {
      setIsLoading(false);
      return;
    }

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
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      if (AUTH_MODE === 'supabase') {
        if (!isSupabaseAuthConfigured) {
          console.warn('Supabase auth mode is enabled, but VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing.');
          return false;
        }

        const nextUser = await loginWithSupabase(email, password);
        setStoredToken(null);
        setStoredUser(nextUser);
        setUser(nextUser);
        return true;
      }

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
    if (AUTH_MODE === 'supabase') {
      void logoutSupabase();
    }

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
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, hasRole, canPerform }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

