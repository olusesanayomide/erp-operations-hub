import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UsersPage from './UsersPage';

const mutate = vi.fn();
const invalidateQueries = vi.fn();
const setQueryData = vi.fn();

const users = [
  {
    id: 'user-1',
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    role: 'manager',
    createdAt: '2026-04-11',
  },
  {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    createdAt: '2026-04-10',
  },
];

const invites = [
  {
    id: 'invite-1',
    email: 'pending@example.com',
    role: 'staff',
    status: 'pending',
    expiresAt: '2026-04-30',
    createdAt: '2026-04-23',
  },
];

function setInputValue(input: HTMLElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;

  valueSetter?.call(input, value);
  fireEvent.input(input, { target: { value } });
}

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(({ queryKey }) => {
    if (queryKey[0] === 'users') {
      return {
        data: users,
        isLoading: false,
        isError: false,
      };
    }
    if (queryKey[0] === 'tenant-invites') {
      return {
        data: invites,
        isLoading: false,
        isError: false,
      };
    }

    return { data: [], isLoading: false, isError: false };
  }),
  useMutation: vi.fn(() => ({
    mutate,
    isPending: false,
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries,
    setQueryData,
  })),
}));

vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@example.com',
    role: 'admin',
    },
    hasRole: (role: string) => role === 'admin',
    refreshUser: vi.fn(),
  }),
}));

vi.mock('@/shared/lib/erp-api', () => ({
  createTenantInvite: vi.fn(),
  listTenantInvites: vi.fn(),
  listUsers: vi.fn(),
  revokeTenantInvite: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('UsersPage', () => {
  beforeEach(() => {
    mutate.mockClear();
    invalidateQueries.mockClear();
    setQueryData.mockClear();
  });

  it('opens the edit dialog and submits updated user values', async () => {
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);

    expect(screen.getByRole('heading', { name: /edit user/i })).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    const nameInput = within(dialog).getByLabelText(/name/i);

    await waitFor(() => expect(nameInput).toHaveValue('Sarah Chen'));

    setInputValue(nameInput, 'Sarah Johnson');
    expect(nameInput).toHaveValue('Sarah Johnson');
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(mutate).toHaveBeenCalledWith({
      id: 'user-1',
      name: 'Sarah Johnson',
      role: 'manager',
      expectedUpdatedAt: undefined,
    });
  });

  it('disables role changes when editing your own user', () => {
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[1]);

    expect(
      screen.getByText(/your own role cannot be changed from this session/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('opens the invite dialog and submits an invite request', () => {
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /invite user/i }));

    expect(screen.getByRole('heading', { name: /invite user/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'new-staff@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^name$/i), {
      target: { value: 'New Staff' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create invite/i }));

    expect(mutate).toHaveBeenCalled();
  });

  it('renders pending invites and allows revoking an invite', () => {
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('pending@example.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /revoke/i }));

    expect(mutate).toHaveBeenCalledWith('invite-1');
  });
});
