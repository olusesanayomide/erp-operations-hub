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
  authError: string;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  canPerform: (action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_PROFILE_TIMEOUT_MS = 12000;
const AUTH_RESTORE_TIMEOUT_MESSAGE =
  'We could not verify your session. Please sign in again.';

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
  const [isVerifiedSession, setIsVerifiedSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authStatusMessage, setAuthStatusMessage] = useState('Restoring your session...');
  const [authError, setAuthError] = useState('');
  const authTransitionRef = useRef<((value: { success: boolean; error?: string }) => void) | null>(null);
  const hasResolvedInitialSessionRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseAuthConfigured || !supabase) {
      console.warn('Supabase auth is enabled, but the client is not configured.');
      clearCurrentUserRequest();
      setStoredUser(null);
      setUser(null);
      setIsVerifiedSession(false);
      setAuthStatusMessage('');
      setAuthError('');
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const resolveTransition = (value: { success: boolean; error?: string }) => {
      authTransitionRef.current?.(value);
      authTransitionRef.current = null;
    };

    const resolveCurrentUserWithTimeout = (accessToken: string) =>
      Promise.race([
        getCurrentUser(accessToken),
        new Promise<never>((_, reject) => {
          window.setTimeout(
            () => reject(new Error(AUTH_RESTORE_TIMEOUT_MESSAGE)),
            AUTH_PROFILE_TIMEOUT_MS,
          );
        }),
      ]);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      const isInitialSessionRestore = !hasResolvedInitialSessionRef.current;
      const isBlockingAuthTransition = authTransitionRef.current !== null;
      const shouldBlockUi = isInitialSessionRestore || isBlockingAuthTransition;

      if (shouldBlockUi) {
        setIsLoading(true);
        setAuthError('');
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
        setIsVerifiedSession(false);
        setAuthError('');
        hasResolvedInitialSessionRef.current = true;
        if (shouldBlockUi) {
          setAuthStatusMessage('');
          setIsLoading(false);
        }
        resolveTransition({ success: true });
        return;
      }

      void resolveCurrentUserWithTimeout(session.access_token)
        .then((nextUser) => {
          if (!mounted) return;
          setStoredUser(nextUser);
          setUser(nextUser);
          setIsVerifiedSession(true);
          setAuthError('');
          resolveTransition({ success: true });
        })
        .catch((error) => {
          if (!mounted) return;
          setStoredUser(null);
          setUser(null);
          setIsVerifiedSession(false);
          clearCurrentUserRequest();
          void logoutSupabase();

          const message =
            error instanceof ApiError
              ? error.message
              : error instanceof Error
                ? error.message
                : 'Signed in with Supabase, but failed to load your ERP user profile.';

          if (shouldBlockUi) {
            setAuthStatusMessage('');
          }
          setAuthError(message);
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
        setAuthError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
        return {
          success: false,
          error: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
        };
      }

      setIsLoading(true);
      setAuthStatusMessage('Signing you in...');
      setAuthError('');
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

      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Unable to sign in.';
      setAuthError(message);

      return {
        success: false,
        error: message,
      };
    }
  }, []);

  const logout = useCallback(() => {
    void logoutSupabase();
    clearCurrentUserRequest();
    setStoredUser(null);
    setUser(null);
    setIsVerifiedSession(false);
    setAuthStatusMessage('');
    setAuthError('');
  }, []);

  const refreshUser = useCallback(async () => {
    if (!isSupabaseAuthConfigured || !supabase) {
      return null;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      clearCurrentUserRequest();
      setStoredUser(null);
      setUser(null);
      setIsVerifiedSession(false);
      setAuthError('');
      return null;
    }

    clearCurrentUserRequest();
    const nextUser = await getCurrentUser(session.access_token);
    setStoredUser(nextUser);
    setUser(nextUser);
    setIsVerifiedSession(true);
    setAuthError('');
    return nextUser;
  }, []);

  const hasRole = useCallback((role: UserRole | UserRole[]) => {
    if (!isVerifiedSession || !user) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role);
  }, [isVerifiedSession, user]);

  const canPerform = useCallback((action: string) => {
    if (!isVerifiedSession || !user) return false;
    const perms = rolePermissions[user.role];
    return perms.includes('*') || perms.includes(action);
  }, [isVerifiedSession, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant: user?.tenant ?? null,
        isPlatformAdmin: isVerifiedSession ? user?.isPlatformAdmin ?? false : false,
        isAuthenticated: isVerifiedSession && !!user,
        isLoading,
        authStatusMessage,
        authError,
        login,
        logout,
        refreshUser,
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
