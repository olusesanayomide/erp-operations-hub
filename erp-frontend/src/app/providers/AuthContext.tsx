import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User, UserRole } from '@/shared/types/erp';
import { ApiError, getStoredUser, setStoredUser } from '@/shared/lib/api';
import {
  clearCurrentUserRequest,
  getCurrentUser,
  loginWithSupabase,
  logoutSupabase,
} from '@/shared/lib/erp-api';
import { isSupabaseAuthConfigured, supabase } from '@/shared/lib/supabase';

interface AuthContextType {
  user: User | null;
  tenant: User['tenant'] | null;
  isPlatformAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  authStatusMessage: string;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
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
  const [authStatusMessage, setAuthStatusMessage] = useState('Restoring your session...');
  const authTransitionRef = useRef<((value: { success: boolean; error?: string }) => void) | null>(null);
  const hasResolvedInitialSessionRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseAuthConfigured || !supabase) {
      console.warn('Supabase auth is enabled, but the client is not configured.');
      clearCurrentUserRequest();
      setStoredUser(null);
      setUser(null);
      setAuthStatusMessage('');
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const resolveTransition = (value: { success: boolean; error?: string }) => {
      authTransitionRef.current?.(value);
      authTransitionRef.current = null;
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      const isInitialSessionRestore = !hasResolvedInitialSessionRef.current;
      const isBlockingAuthTransition = authTransitionRef.current !== null;
      const shouldBlockUi = isInitialSessionRestore || isBlockingAuthTransition;

      if (shouldBlockUi) {
        setIsLoading(true);
        setAuthStatusMessage(
          isInitialSessionRestore
            ? 'Restoring your session...'
            : 'Loading your workspace...',
        );
      }

      if (!session?.user) {
        clearCurrentUserRequest();
        setStoredUser(null);
        setUser(null);
        hasResolvedInitialSessionRef.current = true;
        if (shouldBlockUi) {
          setAuthStatusMessage('');
          setIsLoading(false);
        }
        resolveTransition({ success: true });
        return;
      }

      void getCurrentUser(session.access_token)
        .then((nextUser) => {
          if (!mounted) return;
          setStoredUser(nextUser);
          setUser(nextUser);
          resolveTransition({ success: true });
        })
        .catch((error) => {
          if (!mounted) return;
          setStoredUser(null);
          setUser(null);
          clearCurrentUserRequest();
          void logoutSupabase();

          const message =
            error instanceof ApiError
              ? error.message
              : 'Signed in with Supabase, but failed to load your ERP user profile.';

          if (shouldBlockUi) {
            setAuthStatusMessage('');
          }
          resolveTransition({ success: false, error: message });
        })
        .finally(() => {
          if (mounted) {
            hasResolvedInitialSessionRef.current = true;
            if (shouldBlockUi) {
              setAuthStatusMessage('');
              setIsLoading(false);
            }
          }
        });
    });

    return () => {
      mounted = false;
      authTransitionRef.current = null;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      if (!isSupabaseAuthConfigured) {
        console.warn('Supabase auth is enabled, but VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing.');
        return {
          success: false,
          error: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
        };
      }

      setIsLoading(true);
      setAuthStatusMessage('Signing you in...');
      const transition = new Promise<{ success: boolean; error?: string }>((resolve) => {
        authTransitionRef.current = resolve;
      });

      await loginWithSupabase(email, password);
      return transition;
    } catch (error) {
      authTransitionRef.current = null;
      setAuthStatusMessage('');
      setIsLoading(false);

      if (!(error instanceof ApiError)) {
        console.error(error);
      }

      return {
        success: false,
        error:
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Unable to sign in.',
      };
    }
  }, []);

  const logout = useCallback(() => {
    void logoutSupabase();
    clearCurrentUserRequest();
    setStoredUser(null);
    setUser(null);
    setAuthStatusMessage('');
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
    <AuthContext.Provider
      value={{
        user,
        tenant: user?.tenant ?? null,
        isPlatformAdmin: user?.isPlatformAdmin ?? false,
        isAuthenticated: !!user,
        isLoading,
        authStatusMessage,
        login,
        logout,
        hasRole,
        canPerform,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
