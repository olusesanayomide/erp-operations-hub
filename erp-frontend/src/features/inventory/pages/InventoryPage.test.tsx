import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InventoryPage from './InventoryPage';

const invalidateQueries = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(({ queryKey }) => {
    if (queryKey[0] === 'inventory') {
      return { data: [], isLoading: false };
    }
    if (queryKey[0] === 'products') {
      return { data: [{ id: 'p1', name: 'Widget', sku: 'W-1' }], isLoading: false };
    }
    if (queryKey[0] === 'warehouses') {
      return { data: [{ id: 'w1', name: 'Main' }, { id: 'w2', name: 'Overflow' }], isLoading: false };
    }
    return { data: [], isLoading: false };
  }),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries,
  })),
}));

vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({
    canPerform: (permission: string) => permission === 'inventory.transfer',
  }),
}));

vi.mock('@/shared/lib/erp-api', () => ({
  listInventorySummary: vi.fn(),
  listProducts: vi.fn(),
  listWarehouses: vi.fn(),
  stockIn: vi.fn(),
  stockOut: vi.fn(),
  transferStock: vi.fn(),
}));

describe('InventoryPage', () => {
  it('shows the transfer stock action for authorized users', () => {
    render(
      <MemoryRouter>
        <InventoryPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /transfer stock/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^stock in$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^stock out$/i })).not.toBeInTheDocument();
  });
});
