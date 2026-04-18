import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader, EmptyState, ErrorState, RetryButton, TableSkeleton } from '@/shared/components/PageComponents';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Textarea } from '@/shared/ui/textarea';
import { getStockStatus } from '@/shared/types/erp';
import { useAuth } from '@/app/providers/AuthContext';
import { Search, Boxes, ArrowDownRight, ArrowUpRight, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { listInventorySummary, listProducts, listWarehouses, stockIn, stockOut, transferStock } from '@/shared/lib/erp-api';

function StockDialog({
  type,
  open,
  onOpenChange,
  stockForm,
  setStockForm,
  products,
  warehouses,
  onSubmit,
  isSubmitting,
}: {
  type: 'in' | 'out';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockForm: { productId: string; warehouseId: string; quantity: string };
  setStockForm: React.Dispatch<
    React.SetStateAction<{
      productId: string;
      warehouseId: string;
      quantity: string;
    }>
  >;
  products: Array<{ id: string; name: string }>;
  warehouses: Array<{ id: string; name: string }>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
}) {
  const isReady =
    Boolean(stockForm.productId) &&
    Boolean(stockForm.warehouseId) &&
    Number(stockForm.quantity) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Stock {type === 'in' ? 'In' : 'Out'}</DialogTitle></DialogHeader>
        <form className="space-y-4 py-2" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={stockForm.productId} onValueChange={(value) => setStockForm((current) => ({ ...current, productId: value }))}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Warehouse</Label>
            <Select value={stockForm.warehouseId} onValueChange={(value) => setStockForm((current) => ({ ...current, warehouseId: value }))}>
              <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
              <SelectContent>{warehouses.map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              inputMode="numeric"
              placeholder="0"
              value={stockForm.quantity}
              onChange={(e) => setStockForm((current) => ({ ...current, quantity: e.target.value }))}
            />
          </div>
          <Button className="w-full" type="submit" disabled={!isReady || isSubmitting}>
            {isSubmitting ? 'Saving...' : type === 'in' ? 'Record Stock In' : 'Record Stock Out'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({
  open,
  onOpenChange,
  transferForm,
  setTransferForm,
  products,
  warehouses,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transferForm: {
    productId: string;
    sourceWarehouseId: string;
    destinationWarehouseId: string;
    quantity: string;
    note: string;
  };
  setTransferForm: React.Dispatch<
    React.SetStateAction<{
      productId: string;
      sourceWarehouseId: string;
      destinationWarehouseId: string;
      quantity: string;
      note: string;
    }>
  >;
  products: Array<{ id: string; name: string }>;
  warehouses: Array<{ id: string; name: string }>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
}) {
  const isReady =
    Boolean(transferForm.productId) &&
    Boolean(transferForm.sourceWarehouseId) &&
    Boolean(transferForm.destinationWarehouseId) &&
    transferForm.sourceWarehouseId !== transferForm.destinationWarehouseId &&
    Number(transferForm.quantity) > 0 &&
    Boolean(transferForm.note.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Transfer Stock</DialogTitle></DialogHeader>
        <form className="space-y-4 py-2" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={transferForm.productId} onValueChange={(value) => setTransferForm((current) => ({ ...current, productId: value }))}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Source Warehouse</Label>
              <Select value={transferForm.sourceWarehouseId} onValueChange={(value) => setTransferForm((current) => ({ ...current, sourceWarehouseId: value }))}>
                <SelectTrigger><SelectValue placeholder="Select source warehouse" /></SelectTrigger>
                <SelectContent>{warehouses.map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Destination Warehouse</Label>
              <Select value={transferForm.destinationWarehouseId} onValueChange={(value) => setTransferForm((current) => ({ ...current, destinationWarehouseId: value }))}>
                <SelectTrigger><SelectValue placeholder="Select destination warehouse" /></SelectTrigger>
                <SelectContent>{warehouses.map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              inputMode="numeric"
              placeholder="0"
              value={transferForm.quantity}
              onChange={(e) => setTransferForm((current) => ({ ...current, quantity: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Transfer Note</Label>
            <Textarea
              placeholder="Why is this stock being moved?"
              value={transferForm.note}
              onChange={(e) => setTransferForm((current) => ({ ...current, note: e.target.value }))}
            />
          </div>
          {transferForm.sourceWarehouseId && transferForm.sourceWarehouseId === transferForm.destinationWarehouseId && (
            <p className="text-sm text-destructive">Source and destination warehouses must be different.</p>
          )}
          <Button className="w-full" type="submit" disabled={!isReady || isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Transfer Stock'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function InventoryPage() {
  const { canPerform } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [whFilter, setWhFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockInOpen, setStockInOpen] = useState(false);
  const [stockOutOpen, setStockOutOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [stockInForm, setStockInForm] = useState({ productId: '', warehouseId: '', quantity: '1' });
  const [stockOutForm, setStockOutForm] = useState({ productId: '', warehouseId: '', quantity: '1' });
  const [transferForm, setTransferForm] = useState({
    productId: '',
    sourceWarehouseId: '',
    destinationWarehouseId: '',
    quantity: '1',
    note: '',
  });

  const { data: inventory = [], isLoading: isInventoryLoading, isError: isInventoryError, error: inventoryError, refetch: refetchInventory } = useQuery({
    queryKey: ['inventory'],
    queryFn: listInventorySummary,
  });

  const { data: products = [], isLoading: isProductsLoading, isError: isProductsError, error: productsError, refetch: refetchProducts } = useQuery({
    queryKey: ['products', 'normalized'],
    queryFn: listProducts,
  });

  const { data: warehouses = [], isLoading: isWarehousesLoading, isError: isWarehousesError, error: warehousesError, refetch: refetchWarehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: listWarehouses,
  });
  const isLoading = isInventoryLoading || isProductsLoading || isWarehousesLoading;
  const isError = isInventoryError || isProductsError || isWarehousesError;
  const loadError = (inventoryError || productsError || warehousesError) as Error | null;

  const stockInMutation = useMutation({
    mutationFn: stockIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setStockInOpen(false);
      setStockInForm({ productId: '', warehouseId: '', quantity: '1' });
      toast.success('Stock in recorded');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const stockOutMutation = useMutation({
    mutationFn: stockOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setStockOutOpen(false);
      setStockOutForm({ productId: '', warehouseId: '', quantity: '1' });
      toast.success('Stock out recorded');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const transferMutation = useMutation({
    mutationFn: transferStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setTransferOpen(false);
      setTransferForm({
        productId: '',
        sourceWarehouseId: '',
        destinationWarehouseId: '',
        quantity: '1',
        note: '',
      });
      toast.success('Stock transferred');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  useEffect(() => {
    if (products.length === 0 || warehouses.length === 0) {
      return;
    }

    setStockInForm((current) => ({
      productId: current.productId || products[0].id,
      warehouseId: current.warehouseId || warehouses[0].id,
      quantity: current.quantity || '1',
    }));

    setStockOutForm((current) => ({
      productId: current.productId || products[0].id,
      warehouseId: current.warehouseId || warehouses[0].id,
      quantity: current.quantity || '1',
    }));

    setTransferForm((current) => ({
      productId: current.productId || products[0].id,
      sourceWarehouseId: current.sourceWarehouseId || warehouses[0].id,
      destinationWarehouseId:
        current.destinationWarehouseId ||
        warehouses.find((warehouse) => warehouse.id !== (current.sourceWarehouseId || warehouses[0].id))?.id ||
        warehouses[0].id,
      quantity: current.quantity || '1',
      note: current.note,
    }));
  }, [products, warehouses]);

  const enriched = useMemo(
    () =>
      inventory.map((item) => ({
        ...item,
        product: item.product || products.find((product) => product.id === item.productId),
        warehouse: item.warehouse || warehouses.find((warehouse) => warehouse.id === item.warehouseId),
        stockStatus: getStockStatus(item.quantity, item.minStock),
      })),
    [inventory, products, warehouses],
  );

  const filtered = enriched.filter((item) => {
    const matchSearch =
      !search ||
      item.product?.name.toLowerCase().includes(search.toLowerCase()) ||
      item.product?.sku.toLowerCase().includes(search.toLowerCase());
    const matchWarehouse = whFilter === 'all' || item.warehouseId === whFilter;
    const matchStatus = statusFilter === 'all' || item.stockStatus === statusFilter;
    return matchSearch && matchWarehouse && matchStatus;
  });

  const handleSubmit = (
    type: 'in' | 'out',
    form: { productId: string; warehouseId: string; quantity: string },
  ) => {
    if (products.length === 0) {
      toast.error('Create at least one product before recording stock.');
      return;
    }

    if (warehouses.length === 0) {
      toast.error('Create a warehouse before recording stock.');
      return;
    }

    if (!form.productId || !form.warehouseId || Number(form.quantity) <= 0) {
      toast.error('Product, warehouse, and quantity are required');
      return;
    }

    const payload = {
      productId: form.productId,
      warehouseId: form.warehouseId,
      quantity: Number(form.quantity),
    };

    if (type === 'in') {
      stockInMutation.mutate(payload);
      return;
    }

    stockOutMutation.mutate(payload);
  };

  const handleTransferSubmit = (form: typeof transferForm) => {
    if (products.length === 0) {
      toast.error('Create at least one product before transferring stock.');
      return;
    }

    if (warehouses.length < 2) {
      toast.error('Create at least two warehouses before transferring stock.');
      return;
    }

    if (!form.productId || !form.sourceWarehouseId || !form.destinationWarehouseId || Number(form.quantity) <= 0) {
      toast.error('Product, source warehouse, destination warehouse, and quantity are required');
      return;
    }

    if (form.sourceWarehouseId === form.destinationWarehouseId) {
      toast.error('Source and destination warehouses must be different');
      return;
    }

    if (!form.note.trim()) {
      toast.error('Transfer note is required');
      return;
    }

    transferMutation.mutate({
      productId: form.productId,
      sourceWarehouseId: form.sourceWarehouseId,
      destinationWarehouseId: form.destinationWarehouseId,
      quantity: Number(form.quantity),
      note: form.note.trim(),
    });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Inventory" description={`${inventory.length} records across ${warehouses.length} warehouses`}>
        {canPerform('inventory.stock-in') && (
          <Button variant="outline" onClick={() => setStockInOpen(true)}>
            <ArrowDownRight className="h-4 w-4 mr-2" />Stock In
          </Button>
        )}
        {canPerform('inventory.stock-out') && (
          <Button variant="outline" onClick={() => setStockOutOpen(true)}>
            <ArrowUpRight className="h-4 w-4 mr-2" />Stock Out
          </Button>
        )}
        {canPerform('inventory.transfer') && (
          <Button variant="outline" onClick={() => setTransferOpen(true)}>
            <ArrowRightLeft className="h-4 w-4 mr-2" />Transfer Stock
          </Button>
        )}
      </PageHeader>

      <StockDialog
        type="in"
        open={stockInOpen}
        onOpenChange={setStockInOpen}
        stockForm={stockInForm}
        setStockForm={setStockInForm}
        products={products}
        warehouses={warehouses}
        isSubmitting={stockInMutation.isPending}
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit('in', stockInForm);
        }}
      />
      <StockDialog
        type="out"
        open={stockOutOpen}
        onOpenChange={setStockOutOpen}
        stockForm={stockOutForm}
        setStockForm={setStockOutForm}
        products={products}
        warehouses={warehouses}
        isSubmitting={stockOutMutation.isPending}
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit('out', stockOutForm);
        }}
      />
      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        transferForm={transferForm}
        setTransferForm={setTransferForm}
        products={products}
        warehouses={warehouses}
        isSubmitting={transferMutation.isPending}
        onSubmit={(event) => {
          event.preventDefault();
          handleTransferSubmit(transferForm);
        }}
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search product..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={whFilter} onValueChange={setWhFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            {warehouses.map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="in-stock">In Stock</SelectItem>
            <SelectItem value="low-stock">Low Stock</SelectItem>
            <SelectItem value="out-of-stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Available stock can be sold immediately. Reserved stock is committed to confirmed or picked orders.
      </p>

      <div className="erp-card overflow-hidden">
        {isLoading ? (
          <div className="p-6"><TableSkeleton rows={6} cols={8} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="erp-table-header">
                <th className="text-left p-3">Product</th>
                <th className="text-left p-3">SKU</th>
                <th className="text-left p-3">Warehouse</th>
                <th className="text-right p-3">Available</th>
                <th className="text-right p-3">Reserved</th>
                <th className="text-right p-3">On Hand</th>
                <th className="text-right p-3">Min Stock</th>
                <th className="text-left p-3">Status</th>
              </tr></thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="erp-table-row">
                    <td className="p-3 text-sm font-medium">{item.product?.name}</td>
                    <td className="p-3 text-sm text-muted-foreground font-mono">{item.product?.sku}</td>
                    <td className="p-3 text-sm">{item.warehouse?.name}</td>
                    <td className={`p-3 text-sm text-right font-semibold ${item.stockStatus === 'low-stock' ? 'text-warning' : item.stockStatus === 'out-of-stock' ? 'text-destructive' : ''}`}>
                      {item.quantity}
                    </td>
                    <td className="p-3 text-sm text-right">{item.reservedQuantity}</td>
                    <td className="p-3 text-sm text-right font-medium">{item.onHandQuantity}</td>
                    <td className="p-3 text-sm text-right text-muted-foreground">{item.minStock}</td>
                    <td className="p-3"><StatusBadge status={item.stockStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {isError && (
          <ErrorState
            title="Unable to load inventory"
            description={loadError?.message || 'Inventory and related reference data could not be loaded right now.'}
            action={<RetryButton onClick={() => { void refetchInventory(); void refetchProducts(); void refetchWarehouses(); }} />}
          />
        )}
        {!isLoading && !isError && filtered.length === 0 && <EmptyState icon={Boxes} title="No inventory found" description="Adjust your filters" />}
      </div>
    </div>
  );
}

