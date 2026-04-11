import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UsersPage from './UsersPage';

const mutate = vi.fn();
const invalidateQueries = vi.fn();
const setQueryData = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(({ queryKey }) => {
    if (queryKey[0] === 'users') {
      return {
        data: [
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
        ],
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
  }),
}));

vi.mock('@/shared/lib/erp-api', () => ({
  listUsers: vi.fn(),
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

  it('opens the edit dialog and submits updated user values', () => {
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);

    expect(screen.getByRole('heading', { name: /edit user/i })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'Sarah Johnson' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(mutate).toHaveBeenCalledWith({
      id: 'user-1',
      name: 'Sarah Johnson',
      role: 'manager',
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
      screen.getByText(/your own role can.t be changed from this session/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
