import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './AuthContext';
import { ApiError } from '@/shared/lib/api';

const AUTH_LOGIN_PROFILE_TIMEOUT_MS = 90000;
const AUTH_LOGIN_PROFILE_TIMEOUT_MESSAGE =
  'Signed in, but we could not load your ERP profile. Please check that the backend is running and try again.';
const AUTH_RESTORE_TIMEOUT_MS = 120000;
const AUTH_RESTORE_TIMEOUT_MESSAGE =
  'We could not verify your session. Please sign in again.';

const authMocks = vi.hoisted(() => ({
  clearCurrentUserRequest: vi.fn(),
  getCurrentUser: vi.fn(),
  loginWithSupabase: vi.fn(),
  logoutSupabase: vi.fn(),
}));

let authStateChangeHandler:
  | ((event: string, session: { user?: object | null; access_token: string } | null) => void)
  | null = null;

vi.mock('@/shared/lib/erp-api', () => ({
  AUTH_LOGIN_PROFILE_TIMEOUT_MS: 90000,
  AUTH_LOGIN_PROFILE_TIMEOUT_MESSAGE:
    'Signed in, but we could not load your ERP profile. Please check that the backend is running and try again.',
  AUTH_RESTORE_TIMEOUT_MS: 120000,
  AUTH_RESTORE_TIMEOUT_MESSAGE:
    'We could not verify your session. Please sign in again.',
  clearCurrentUserRequest: authMocks.clearCurrentUserRequest,
  getCurrentUser: authMocks.getCurrentUser,
  loginWithSupabase: authMocks.loginWithSupabase,
  logoutSupabase: authMocks.logoutSupabase,
}));

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseAuthConfigured: true,
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((callback) => {
        authStateChangeHandler = callback;
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      }),
      getSession: vi.fn(async () => ({
        data: {
          session: null,
        },
      })),
    },
  },
}));

function AuthProbe() {
  const { authError, authStatusMessage, login } = useAuth();
  const [result, setResult] = useState('idle');

  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          const nextResult = await login('jane@example.com', 'Password123!');
          setResult(JSON.stringify(nextResult));
        }}
      >
        Trigger login
      </button>
      <div>{authStatusMessage}</div>
      <div>{authError}</div>
      <div data-testid="result">{result}</div>
    </div>
  );
}

function renderAuthProvider() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AuthProvider login flow', () => {
  beforeEach(() => {
    authStateChangeHandler = null;
    authMocks.getCurrentUser.mockReset();
    authMocks.loginWithSupabase.mockReset();
    authMocks.logoutSupabase.mockReset();
    authMocks.clearCurrentUserRequest.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the signup-aligned login timeout settings for ERP profile hydration', async () => {
    authMocks.getCurrentUser.mockResolvedValue({
      id: 'user-1',
      name: 'Jane',
      email: 'jane@example.com',
      role: 'admin',
      tenant: { id: 'tenant-1', name: 'Acme', slug: 'acme', status: 'active' },
      isPlatformAdmin: false,
      createdAt: '2026-04-24',
    });
    authMocks.loginWithSupabase.mockImplementation(async () => {
      authStateChangeHandler?.('SIGNED_IN', {
        user: { id: 'user-1' },
        access_token: 'token-123',
      });
      return null;
    });

    renderAuthProvider();
    fireEvent.click(screen.getByRole('button', { name: /trigger login/i }));

    await waitFor(() => {
      expect(authMocks.getCurrentUser).toHaveBeenCalledWith('token-123', {
        timeoutMs: AUTH_LOGIN_PROFILE_TIMEOUT_MS,
        timeoutMessage: AUTH_LOGIN_PROFILE_TIMEOUT_MESSAGE,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('"success":true');
    });
  });

  it('does not fail early while login is still waiting on profile hydration', async () => {
    vi.useFakeTimers();
    authMocks.getCurrentUser.mockImplementation(() => new Promise(() => {}));
    authMocks.loginWithSupabase.mockImplementation(async () => {
      authStateChangeHandler?.('SIGNED_IN', {
        user: { id: 'user-1' },
        access_token: 'token-123',
      });
      return null;
    });

    renderAuthProvider();
    fireEvent.click(screen.getByRole('button', { name: /trigger login/i }));

    await act(async () => {
      vi.advanceTimersByTime(80000);
    });

    expect(screen.getByTestId('result')).toHaveTextContent('idle');
    expect(screen.queryByText(AUTH_LOGIN_PROFILE_TIMEOUT_MESSAGE)).not.toBeInTheDocument();
  });

  it('returns the shared timeout-style error when ERP profile hydration fails', async () => {
    authMocks.getCurrentUser.mockRejectedValue(
      new ApiError(AUTH_LOGIN_PROFILE_TIMEOUT_MESSAGE, 0),
    );
    authMocks.loginWithSupabase.mockImplementation(async () => {
      authStateChangeHandler?.('SIGNED_IN', {
        user: { id: 'user-1' },
        access_token: 'token-123',
      });
      return null;
    });

    renderAuthProvider();
    fireEvent.click(screen.getByRole('button', { name: /trigger login/i }));

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('"success":false');
    });

    expect(screen.getByText(AUTH_LOGIN_PROFILE_TIMEOUT_MESSAGE)).toBeInTheDocument();
    expect(authMocks.logoutSupabase).toHaveBeenCalled();
  });
});
