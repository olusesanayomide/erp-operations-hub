import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import JoinTenantPage from './JoinTenantPage';
import { acceptTenantInvite, getTenantInvite } from '@/shared/lib/erp-api';

vi.mock('@/shared/lib/erp-api', () => ({
  acceptTenantInvite: vi.fn(),
  getTenantInvite: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function renderJoinPage(path = '/join/invite-token') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/join/:token" element={<JoinTenantPage />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('JoinTenantPage', () => {
  beforeEach(() => {
    vi.mocked(acceptTenantInvite).mockReset();
    vi.mocked(getTenantInvite).mockReset();
  });

  it('validates the token and renders safe invite details', async () => {
    vi.mocked(getTenantInvite).mockResolvedValue({
      tenantName: 'Johndoe Co',
      email: 'staff@example.com',
      name: 'Staff User',
      role: 'staff',
      expiresAt: '2026-04-30',
    });

    renderJoinPage();

    expect(await screen.findByText(/johndoe co/i)).toBeInTheDocument();
    expect(screen.getByText('staff@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Staff User')).toBeInTheDocument();
  });

  it('accepts an invite with name and password', async () => {
    vi.mocked(getTenantInvite).mockResolvedValue({
      tenantName: 'Johndoe Co',
      email: 'staff@example.com',
      role: 'manager',
      expiresAt: '2026-04-30',
    });
    vi.mocked(acceptTenantInvite).mockResolvedValue({});

    renderJoinPage();

    await screen.findByText(/johndoe co/i);
    fireEvent.change(screen.getByLabelText(/^name$/i), {
      target: { value: 'Staff User' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'StrongPassword123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /join workspace/i }));

    expect(await screen.findByText(/login page/i)).toBeInTheDocument();
    expect(acceptTenantInvite).toHaveBeenCalledWith('invite-token', {
      name: 'Staff User',
      password: 'StrongPassword123!',
    });
  });

  it('shows helpful errors for invalid or expired invite links', async () => {
    vi.mocked(getTenantInvite).mockRejectedValue(
      new Error('This invite has expired.'),
    );

    renderJoinPage();

    expect(await screen.findByText('This invite has expired.')).toBeInTheDocument();
  });
});
