import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginPage from './LoginPage';

const AUTH_SLOW_OPERATION_NOTICE_MS = 8000;
const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
}));

vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({
    login: authMocks.login,
    authStatusMessage: 'Signing you in...',
  }),
}));

vi.mock('@/shared/lib/erp-api', () => ({
  AUTH_SLOW_OPERATION_NOTICE_MS: 8000,
}));

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseAuthConfigured: true,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    authMocks.login.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a still-working notice while login is taking longer', async () => {
    vi.useFakeTimers();
    authMocks.login.mockImplementation(() => new Promise(() => {}));

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'Password123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText('Signing you in...')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(AUTH_SLOW_OPERATION_NOTICE_MS);
    });

    expect(screen.getByRole('button', { name: /still signing you in/i })).toBeInTheDocument();
    expect(screen.getByText(/reconnect your erp workspace/i)).toBeInTheDocument();
  });

  it('navigates on successful login before the slow notice appears', async () => {
    authMocks.login.mockResolvedValue({ success: true });

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'Password123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/dashboard page/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/still signing you in/i)).not.toBeInTheDocument();
  });
});
