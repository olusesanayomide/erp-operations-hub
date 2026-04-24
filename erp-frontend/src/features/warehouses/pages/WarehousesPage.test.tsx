import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WarehousesPage from './WarehousesPage';

const invalidateQueries = vi.fn();
const mutationSpy = vi.fn();

const warehouses = [
  {
    id: 'warehouse-1',
    name: 'Main Warehouse',
    location: 'HQ',
    itemCount: 12,
    createdAt: '2026-04-20',
  },
];

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: warehouses,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })),
  useMutation: vi.fn((options) => ({
    mutate: (payload: unknown) => {
      mutationSpy(payload);
      options.onSuccess?.();
    },
    isPending: false,
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries,
  })),
}));

vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({
    canPerform: (permission: string) => permission === 'warehouses.create',
  }),
}));

vi.mock('@/shared/lib/erp-api', () => ({
  createWarehouse: vi.fn(),
  listWarehouses: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('WarehousesPage', () => {
  beforeEach(() => {
    invalidateQueries.mockClear();
    mutationSpy.mockClear();
  });

  it('submits the create warehouse form and refreshes warehouse data in place', async () => {
    render(
      <MemoryRouter>
        <WarehousesPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /add warehouse/i }));

    fireEvent.change(screen.getByPlaceholderText(/warehouse name/i), {
      target: { value: ' Annex Warehouse ' },
    });
    fireEvent.change(screen.getByPlaceholderText(/city, state/i), {
      target: { value: ' Lagos ' },
    });
    fireEvent.change(screen.getByPlaceholderText(/^description$/i), {
      target: { value: ' Overflow stock ' },
    });

    fireEvent.submit(screen.getByRole('button', { name: /create warehouse/i }).closest('form')!);

    expect(mutationSpy).toHaveBeenCalledWith({
      name: 'Annex Warehouse',
      location: 'Lagos',
      description: 'Overflow stock',
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['warehouses'] });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /new warehouse/i })).not.toBeInTheDocument();
    });
  });
});
