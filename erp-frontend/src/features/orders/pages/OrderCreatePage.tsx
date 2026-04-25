import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/PageComponents';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { ArrowLeft, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { createOrder, listCustomers, listInventorySummary, listProducts, listWarehouses } from '@/shared/lib/erp-api';
import { useSettings } from '@/app/providers/SettingsContext';
import { cn } from '@/shared/lib/utils';

interface DraftItem {
  productId: string;
  quantity: string;
}

function parsePositiveInteger(value: string) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || !Number.isInteger(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
}

function getRequestedStockByProduct(items: DraftItem[]) {
  const totals = new Map<string, number>();

  for (const item of items) {
    if (!item.productId) continue;
    const quantity = parsePositiveInteger(item.quantity) ?? 0;
    totals.set(item.productId, (totals.get(item.productId) ?? 0) + quantity);
  }

  return totals;
}

export default function OrderCreatePage() {
  const navigate = useNavigate();
  const { formatMoney } = useSettings();
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ productId: '', quantity: '1' }]);
  const createToastRef = useRef<string | number | null>(null);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: listCustomers,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: listWarehouses,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'normalized'],
    queryFn: listProducts,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: listInventorySummary,
  });

  const createMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Order created as draft');
      navigate('/orders');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addItem = () => setItems([...items, { productId: '', quantity: '1' }]);
  const removeItem = (index: number) => setItems(items.filter((_, itemIndex) => itemIndex !== index));
  const updateItem = (index: number, field: keyof DraftItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const requestedStockByProduct = getRequestedStockByProduct(items);

  const getAvailableStock = (productId: string) => {
    if (!warehouseId || !productId) return null;
    const inventoryItem = inventory.find((item) => item.productId === productId && item.warehouseId === warehouseId);
    return inventoryItem?.quantity ?? 0;
  };

  const total = items.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.productId);
    const quantity = parsePositiveInteger(item.quantity) ?? 0;
    return sum + (product?.basePrice || 0) * quantity;
  }, 0);

  const handleSubmit = () => {
    if (!customerId || !warehouseId || items.some((item) => !item.productId)) {
      toast.error('Please fill all required fields');
      return;
    }

    const invalidQuantityIndex = items.findIndex((item) => parsePositiveInteger(item.quantity) === null);
    if (invalidQuantityIndex >= 0) {
      toast.error(`Line ${invalidQuantityIndex + 1}: quantity must be a whole number greater than 0.`);
      return;
    }

    createMutation.mutate({
      customerId,
      warehouseId,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: parsePositiveInteger(item.quantity) as number,
      })),
    });
  };

  useEffect(() => {
    if (createMutation.isPending) {
      if (!createToastRef.current) {
        createToastRef.current = toast.loading('Creating draft order...', {
          description: 'You will be returned to the orders list automatically when it is ready.',
        });
      }
      return;
    }

    if (createToastRef.current) {
      toast.dismiss(createToastRef.current);
      createToastRef.current = null;
    }
  }, [createMutation.isPending]);

  return (
    <div className="mx-auto max-w-4xl animate-fade-in space-y-5 sm:space-y-6">
      <Button variant="ghost" size="sm" className="w-fit" onClick={() => navigate('/orders')}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back
      </Button>

      <PageHeader
        title="Create Order"
        description="Create a new draft order now. Stock is only reserved when you confirm the order."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Customer *</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Source Warehouse *</Label>
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger>
              <SelectValue placeholder="Select warehouse" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="erp-card p-4 sm:p-5">
        <h3 className="erp-section-title">Line Items</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Current warehouse stock is shown for reference while drafting. Warnings here do not block draft creation; the final stock check happens when you confirm.
        </p>

        <div className="space-y-3">
          {items.map((item, index) => {
            const stock = getAvailableStock(item.productId);
            const quantity = parsePositiveInteger(item.quantity) ?? 0;
            const requestedStock = item.productId ? requestedStockByProduct.get(item.productId) ?? quantity : quantity;
            const insufficientStock = stock !== null && requestedStock > stock;
            const product = products.find((entry) => entry.id === item.productId);
            const stockLabel = stock === null
              ? 'Select a warehouse and product to view current stock.'
              : insufficientStock
                ? `Current available stock is ${stock}; this draft requests ${requestedStock} in total for this product.`
                : `Current available stock: ${stock}.`;

            return (
              <div
                key={index}
                className={cn(
                  'rounded-xl border p-3 sm:p-4',
                  insufficientStock ? 'border-warning/40 bg-warning/5' : 'border-border bg-muted/20',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Line {index + 1}</p>
                    <p className="text-xs text-muted-foreground">Choose the product and quantity for this draft.</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0 px-2"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    aria-label={`Remove line ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                  <div className="space-y-1">
                    <Label className="text-xs">Product</Label>
                    <Select value={item.productId} onValueChange={(value) => updateItem(index, 'productId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((entry) => (
                          <SelectItem key={entry.id} value={entry.id}>
                            {entry.name} ({formatMoney(entry.basePrice)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" min={1} step={1} value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 rounded-lg border border-border/60 bg-background/70 p-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Stock guidance</p>
                    <p className={cn('mt-1 flex items-start gap-2 text-sm', insufficientStock ? 'text-warning' : 'text-muted-foreground')}>
                      {insufficientStock && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                      <span>{stockLabel}</span>
                    </p>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Line total</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{formatMoney((product?.basePrice || 0) * quantity)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button variant="outline" size="sm" onClick={addItem} className="mt-4 w-full sm:w-auto">
          <Plus className="mr-1 h-4 w-4" />
          Add Item
        </Button>

        <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">{items.length} item(s)</span>
          <div className="text-left sm:text-right">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-xl font-bold">{formatMoney(total)}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate('/orders')}>
          Cancel
        </Button>
        <Button requiresOnline className="w-full sm:w-auto" disabled={createMutation.isPending} onClick={handleSubmit}>
          {createMutation.isPending ? 'Creating...' : 'Create Draft Order'}
        </Button>
      </div>
    </div>
  );
}
