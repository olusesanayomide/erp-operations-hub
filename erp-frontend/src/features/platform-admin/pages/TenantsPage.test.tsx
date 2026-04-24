import { fireEvent, render, screen } from '@testing-library/react';
import TenantsPage from './TenantsPage';

const refetch = vi.fn();
const setQueryData = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: [],
    isLoading: false,
    isError: true,
    error: new Error('The tenant directory could not be loaded.'),
    refetch,
  })),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useQueryClient: vi.fn(() => ({
    setQueryData,
  })),
}));

vi.mock('@/shared/lib/erp-api', () => ({
  listTenants: vi.fn(),
  updateTenantStatus: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('TenantsPage', () => {
  beforeEach(() => {
    refetch.mockClear();
    setQueryData.mockClear();
  });

  it('offers scoped refresh actions instead of relying on browser reload', () => {
    render(<TenantsPage />);

    const refreshButtons = screen.getAllByRole('button', { name: /refresh|try again/i });
    fireEvent.click(refreshButtons[0]);

    expect(refetch).toHaveBeenCalled();
  });
});
