import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InventoryPage from './InventoryPage';

const invalidateQueries = vi.fn();
const refetchInventory = vi.fn();

const queryState = vi.hoisted(() => ({
  inventory: {
    data: [],
    isLoading: false,
    isError: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(({ queryKey }) => {
    if (queryKey[0] === 'inventory') {
      return queryState.inventory;
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
  beforeEach(() => {
    queryState.inventory = {
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchInventory,
    };
    invalidateQueries.mockClear();
    refetchInventory.mockClear();
  });

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

  it('keeps stale inventory rows visible with a compact refresh warning when refetch fails', () => {
    queryState.inventory = {
      data: [
        {
          id: 'p1-w1',
          productId: 'p1',
          warehouseId: 'w1',
          quantity: 12,
          reservedQuantity: 2,
          onHandQuantity: 14,
          minStock: 5,
          product: { id: 'p1', name: 'Widget', sku: 'W-1', basePrice: 100, minStock: 5, createdAt: '2026-04-22' },
          warehouse: { id: 'w1', name: 'Main', location: 'HQ', itemCount: 1, createdAt: '2026-04-22' },
        },
      ],
      isLoading: false,
      isError: true,
      error: new Error('Unable to reach the ERP backend at http://localhost:3000. Make sure the API server is running.'),
      refetch: refetchInventory,
    };

    render(
      <MemoryRouter>
        <InventoryPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Widget')).toBeInTheDocument();
    expect(screen.getByText('Inventory may be out of date')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /unable to load inventory/i })).not.toBeInTheDocument();
  });
});
