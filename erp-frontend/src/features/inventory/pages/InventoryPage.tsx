import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader, EmptyState, ErrorState, RetryButton, TableSkeleton } from '@/shared/components/PageComponents';
import { ReferenceDataWarning } from '@/shared/components/ReferenceDataWarning';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Textarea } from '@/shared/ui/textarea';
import { cn } from '@/shared/lib/utils';
import { getStockStatus, type InventoryItem } from '@/shared/types/erp';
import { useAuth } from '@/app/providers/AuthContext';
import { Search, Boxes, ArrowDownRight, ArrowUpRight, ArrowRightLeft, AlertTriangle, Filter, Package2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { listInventorySummary, listProducts, listWarehouses, stockIn, stockOut, transferStock } from '@/shared/lib/erp-api';
import { validatePositiveInteger } from '@/shared/lib/number-validation';

const EMPTY_INVENTORY: InventoryItem[] = [];

function StockLevelChip({
  quantity,
  minStock,
  stockStatus,
}: {
  quantity: number;
  minStock: number;
  stockStatus: ReturnType<typeof getStockStatus>;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        stockStatus === 'out-of-stock' && 'bg-rose-50 text-rose-700',
        stockStatus === 'low-stock' && 'bg-amber-50 text-amber-700',
        stockStatus === 'in-stock' && 'bg-emerald-50 text-emerald-700',
      )}
    >
      {stockStatus !== 'in-stock' && <AlertTriangle className="h-3.5 w-3.5" />}
      <span>{quantity} available</span>
      <span className="text-[10px] font-medium opacity-75">min {minStock}</span>
    </div>
  );
}

function InventoryCard({
  item,
}: {
  item: InventoryItem & {
    stockStatus: ReturnType<typeof getStockStatus>;
  };
}) {
  return (
    <article className="rounded-[14px] border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900">{item.product?.name ?? 'Unknown product'}</h3>
          <p className="mt-1 text-xs text-slate-500">{item.product?.sku ?? 'Unknown SKU'}</p>
        </div>
        <StatusBadge status={item.stockStatus} className="shrink-0" />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <StockLevelChip quantity={item.quantity} minStock={item.minStock} stockStatus={item.stockStatus} />
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400">On Hand</p>
          <p className="text-sm font-semibold text-slate-900">{item.onHandQuantity}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-[12px] bg-slate-50 p-2.5">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.08em] text-slate-400">Warehouse</p>
          <p className="mt-1 truncate text-xs font-medium text-slate-700">{item.warehouse?.name ?? 'Unknown warehouse'}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] text-slate-400">Reserved</p>
          <p className="mt-1 text-xs font-medium text-slate-700">{item.reservedQuantity}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] text-slate-400">Min Stock</p>
          <p className="mt-1 text-xs font-medium text-slate-700">{item.minStock}</p>
        </div>
      </div>
    </article>
  );
}

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
    validatePositiveInteger(stockForm.quantity, 'Quantity').ok;

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
              step="1"
              inputMode="numeric"
              placeholder="0"
              value={stockForm.quantity}
              onChange={(e) => setStockForm((current) => ({ ...current, quantity: e.target.value }))}
            />
          </div>
          <Button className="w-full" type="submit" requiresOnline disabled={!isReady || isSubmitting}>
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
    validatePositiveInteger(transferForm.quantity, 'Quantity').ok &&
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
              step="1"
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
          <Button className="w-full" type="submit" requiresOnline disabled={!isReady || isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Transfer Stock'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function InventoryPage() {
  const { canPerform } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [whFilter, setWhFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockInOpen, setStockInOpen] = useState(false);
  const [stockOutOpen, setStockOutOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [stockInForm, setStockInForm] = useState({ productId: '', warehouseId: '', quantity: '1' });
  const [stockOutForm, setStockOutForm] = useState({ productId: '', warehouseId: '', quantity: '1' });
  const [transferForm, setTransferForm] = useState({
    productId: '',
    sourceWarehouseId: '',
    destinationWarehouseId: '',
    quantity: '1',
    note: '',
  });
  const stockInToastRef = useRef<string | number | null>(null);
  const stockOutToastRef = useRef<string | number | null>(null);
  const transferToastRef = useRef<string | number | null>(null);

  const {
    data: inventoryData,
    isLoading: isInventoryLoading,
    isError: isInventoryError,
    error: inventoryError,
    refetch: refetchInventory,
  } = useQuery({
    queryKey: ['inventory'],
    queryFn: listInventorySummary,
  });
  const inventory = inventoryData ?? EMPTY_INVENTORY;
  const hasInventoryRows = inventory.length > 0;
  const shouldShowInventoryErrorState = isInventoryError && !hasInventoryRows;
  const shouldShowInventoryRefreshWarning = isInventoryError && hasInventoryRows;

  const { data: products = [], isError: isProductsError } = useQuery({
    queryKey: ['products', 'normalized'],
    queryFn: listProducts,
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ['products', 'normalized', 'includeArchived'],
    queryFn: () => listProducts({ includeArchived: true }),
  });

  const { data: warehouses = [], isError: isWarehousesError } = useQuery({
    queryKey: ['warehouses'],
    queryFn: listWarehouses,
  });
  const isReferenceDataError = isProductsError || isWarehousesError;

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
        product: item.product || allProducts.find((product) => product.id === item.productId),
        warehouse: item.warehouse || warehouses.find((warehouse) => warehouse.id === item.warehouseId),
        stockStatus: getStockStatus(item.quantity, item.minStock),
      })),
    [allProducts, inventory, warehouses],
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

  const lowStockCount = enriched.filter((item) => item.stockStatus === 'low-stock').length;
  const outOfStockCount = enriched.filter((item) => item.stockStatus === 'out-of-stock').length;
  const canStockIn = canPerform('inventory.stock-in');
  const canStockOut = canPerform('inventory.stock-out');
  const canTransfer = canPerform('inventory.transfer');

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

    if (!form.productId || !form.warehouseId) {
      toast.error('Product and warehouse are required');
      return;
    }

    const quantity = validatePositiveInteger(form.quantity, 'Quantity');
    if (!quantity.ok) {
      toast.error(quantity.message);
      return;
    }

    const payload = {
      productId: form.productId,
      warehouseId: form.warehouseId,
      quantity: quantity.value,
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

    if (!form.productId || !form.sourceWarehouseId || !form.destinationWarehouseId) {
      toast.error('Product, source warehouse, and destination warehouse are required');
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

    const quantity = validatePositiveInteger(form.quantity, 'Quantity');
    if (!quantity.ok) {
      toast.error(quantity.message);
      return;
    }

    transferMutation.mutate({
      productId: form.productId,
      sourceWarehouseId: form.sourceWarehouseId,
      destinationWarehouseId: form.destinationWarehouseId,
      quantity: quantity.value,
      note: form.note.trim(),
    });
  };

  useEffect(() => {
    if (stockInMutation.isPending) {
      if (!stockInToastRef.current) {
        stockInToastRef.current = toast.loading('Recording stock in...', {
          description: 'This dialog will close and inventory totals will refresh automatically.',
        });
      }
      return;
    }

    if (stockInToastRef.current) {
      toast.dismiss(stockInToastRef.current);
      stockInToastRef.current = null;
    }
  }, [stockInMutation.isPending]);

  useEffect(() => {
    if (stockOutMutation.isPending) {
      if (!stockOutToastRef.current) {
        stockOutToastRef.current = toast.loading('Recording stock out...', {
          description: 'This dialog will close and inventory totals will refresh automatically.',
        });
      }
      return;
    }

    if (stockOutToastRef.current) {
      toast.dismiss(stockOutToastRef.current);
      stockOutToastRef.current = null;
    }
  }, [stockOutMutation.isPending]);

  useEffect(() => {
    if (transferMutation.isPending) {
      if (!transferToastRef.current) {
        transferToastRef.current = toast.loading('Transferring stock...', {
          description: 'This dialog will close and inventory totals will refresh automatically.',
        });
      }
      return;
    }

    if (transferToastRef.current) {
      toast.dismiss(transferToastRef.current);
      transferToastRef.current = null;
    }
  }, [transferMutation.isPending]);

  return (
    <div className="animate-fade-in pb-28 sm:pb-0">
      <div className="hidden sm:block">
        <PageHeader title="Inventory" description={`${inventory.length} records across ${warehouses.length} warehouses`}>
          {canStockIn && (
            <Button variant="outline" requiresOnline onClick={() => setStockInOpen(true)}>
              <ArrowDownRight className="h-4 w-4 mr-2" />Stock In
            </Button>
          )}
          {canStockOut && (
            <Button variant="outline" requiresOnline onClick={() => setStockOutOpen(true)}>
              <ArrowUpRight className="h-4 w-4 mr-2" />Stock Out
            </Button>
          )}
          {canTransfer && (
            <Button variant="outline" requiresOnline onClick={() => setTransferOpen(true)}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />Transfer Stock
            </Button>
          )}
        </PageHeader>
      </div>

      <div className="space-y-4 sm:hidden">
        <section className="rounded-[16px] border border-slate-200 bg-[linear-gradient(135deg,rgba(59,107,255,0.08),rgba(255,255,255,0.98))] p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Inventory Health</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{filtered.length} visible items across {warehouses.length} warehouses</p>
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-slate-200 bg-white text-slate-600 shadow-sm"
              aria-label="Open inventory filters"
            >
              <Filter className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            <div className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">{search ? `Search: ${search}` : 'All products'}</div>
            <div className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">{whFilter === 'all' ? 'All warehouses' : warehouses.find((warehouse) => warehouse.id === whFilter)?.name ?? 'Warehouse'}</div>
            <div className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">{statusFilter === 'all' ? 'All statuses' : statusFilter.replace(/-/g, ' ')}</div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-[12px] bg-white p-2.5 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.08em] text-slate-400">Healthy</p>
              <p className="mt-1 text-base font-semibold text-emerald-700">{enriched.length - lowStockCount - outOfStockCount}</p>
            </div>
            <div className="rounded-[12px] bg-white p-2.5 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.08em] text-slate-400">Low</p>
              <p className="mt-1 text-base font-semibold text-amber-700">{lowStockCount}</p>
            </div>
            <div className="rounded-[12px] bg-white p-2.5 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.08em] text-slate-400">Out</p>
              <p className="mt-1 text-base font-semibold text-rose-700">{outOfStockCount}</p>
            </div>
          </div>
        </section>
      </div>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="rounded-t-[20px] px-4 pb-6 pt-8 sm:hidden">
          <SheetHeader>
            <SheetTitle>Filter Inventory</SheetTitle>
            <SheetDescription>Search products and narrow the list without taking up screen space.</SheetDescription>
          </SheetHeader>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inventory-mobile-search">Search product</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="inventory-mobile-search"
                  placeholder="Product name or SKU"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select value={whFilter} onValueChange={setWhFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  {warehouses.map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              onClick={() => {
                setSearch('');
                setWhFilter('all');
                setStatusFilter('all');
              }}
            >
              Reset Filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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

      <div className="mb-4 hidden flex-wrap gap-3 sm:flex">
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

      {isReferenceDataError && <ReferenceDataWarning />}
      {shouldShowInventoryRefreshWarning && (
        <div className="mb-4 flex flex-col gap-3 rounded-md border border-warning/30 bg-warning/10 p-4 text-sm text-warning-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Inventory may be out of date</p>
              <p className="text-muted-foreground">
                {(inventoryError as Error)?.message || 'The latest inventory refresh failed. Showing the last loaded records.'}
              </p>
            </div>
          </div>
          <RetryButton onClick={() => void refetchInventory()} label="Refresh" />
        </div>
      )}
		
      <div className="erp-card overflow-hidden">
        {isInventoryLoading ? (
          <div className="p-6"><TableSkeleton rows={6} cols={8} /></div>
	        ) : shouldShowInventoryErrorState ? (
          <ErrorState
            title="Unable to load inventory"
            description={(inventoryError as Error)?.message || 'Inventory could not be loaded right now.'}
            action={<RetryButton onClick={() => void refetchInventory()} />}
          />
        ) : (
          <>
            <div className="space-y-3 p-3 sm:hidden">
              {filtered.map((item) => (
                <InventoryCard key={item.id} item={item} />
              ))}
            </div>

            <div className="hidden overflow-x-auto sm:block">
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
	                    <td className="p-3 text-sm font-medium">{item.product?.name ?? 'Unknown product'}</td>
	                    <td className="p-3 text-sm text-muted-foreground font-mono">{item.product?.sku ?? 'Unknown SKU'}</td>
	                    <td className="p-3 text-sm">{item.warehouse?.name ?? 'Unknown warehouse'}</td>
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
          </>
        )}
        {!isInventoryLoading && !isInventoryError && filtered.length === 0 && <EmptyState icon={Boxes} title="No inventory found" description="Adjust your filters" />}
      </div>

      {isMobile && (canStockIn || canStockOut || canTransfer) && (
        <>
          {mobileActionsOpen && (
            <div className="fixed inset-0 z-30 bg-slate-950/10" onClick={() => setMobileActionsOpen(false)} aria-hidden="true" />
          )}
          <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2">
            {mobileActionsOpen && canTransfer && (
              <Button
                variant="outline"
                requiresOnline
                className="h-11 rounded-full border-slate-200 bg-white px-4 shadow-lg"
                onClick={() => {
                  setTransferOpen(true);
                  setMobileActionsOpen(false);
                }}
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transfer Stock
              </Button>
            )}
            {mobileActionsOpen && canStockOut && (
              <Button
                variant="outline"
                requiresOnline
                className="h-11 rounded-full border-slate-200 bg-white px-4 shadow-lg"
                onClick={() => {
                  setStockOutOpen(true);
                  setMobileActionsOpen(false);
                }}
              >
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Stock Out
              </Button>
            )}
            {mobileActionsOpen && canStockIn && (
              <Button
                variant="outline"
                requiresOnline
                className="h-11 rounded-full border-slate-200 bg-white px-4 shadow-lg"
                onClick={() => {
                  setStockInOpen(true);
                  setMobileActionsOpen(false);
                }}
              >
                <ArrowDownRight className="h-4 w-4 mr-2" />
                Stock In
              </Button>
            )}
            <Button
              type="button"
              requiresOnline={false}
              className="h-14 w-14 rounded-full shadow-[0_18px_38px_rgba(59,107,255,0.35)]"
              onClick={() => setMobileActionsOpen((current) => !current)}
              aria-label={mobileActionsOpen ? 'Close inventory actions' : 'Open inventory actions'}
            >
              {mobileActionsOpen ? <Package2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
