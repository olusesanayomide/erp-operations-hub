import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/PageComponents';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { ArrowLeft, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { createOrder, listCustomers, listInventory, listProducts, listWarehouses } from '@/shared/lib/erp-api';
import { useSettings } from '@/app/providers/SettingsContext';

interface DraftItem {
  productId: string;
  quantity: number;
}

export default function OrderCreatePage() {
  const navigate = useNavigate();
  const { formatMoney } = useSettings();
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ productId: '', quantity: 1 }]);

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
    queryFn: listInventory,
  });

  const createMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Order created as draft');
      navigate('/orders');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addItem = () => setItems([...items, { productId: '', quantity: 1 }]);
  const removeItem = (index: number) => setItems(items.filter((_, itemIndex) => itemIndex !== index));
  const updateItem = (index: number, field: keyof DraftItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const getAvailableStock = (productId: string) => {
    if (!warehouseId || !productId) return null;
    const inventoryItem = inventory.find((item) => item.productId === productId && item.warehouseId === warehouseId);
    return inventoryItem?.quantity ?? 0;
  };

  const total = items.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return sum + (product?.basePrice || 0) * item.quantity;
  }, 0);

  const handleSubmit = () => {
    if (!customerId || !warehouseId || items.some((item) => !item.productId)) {
      toast.error('Please fill all required fields');
      return;
    }

    createMutation.mutate({
      customerId,
      warehouseId,
      items,
    });
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => navigate('/orders')}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
      <PageHeader title="Create Order" description="Create a new draft order" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Customer *</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
            <SelectContent>{customers.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Source Warehouse *</Label>
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
            <SelectContent>{warehouses.map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="erp-card p-5">
        <h3 className="erp-section-title">Line Items</h3>
        <div className="space-y-3">
          {items.map((item, index) => {
            const stock = getAvailableStock(item.productId);
            const insufficientStock = stock !== null && item.quantity > stock;
            const product = products.find((entry) => entry.id === item.productId);
            return (
              <div key={index} className="flex items-end gap-3 p-3 rounded-lg bg-muted/30">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Product</Label>
                  <Select value={item.productId} onValueChange={(value) => updateItem(index, 'productId', value)}>
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>{products.map((entry) => <SelectItem key={entry.id} value={entry.id}>{entry.name} ({formatMoney(entry.basePrice)})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-1">
                  <Label className="text-xs">Qty</Label>
                  <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))} />
                </div>
                <div className="w-24 text-right">
                  <p className="text-sm font-semibold">{formatMoney((product?.basePrice || 0) * item.quantity)}</p>
                  {stock !== null && (
                    <p className={`text-xs ${insufficientStock ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {insufficientStock && <AlertTriangle className="inline h-3 w-3 mr-0.5" />}
                      Stock: {stock}
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeItem(index)} disabled={items.length === 1}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            );
          })}
        </div>
        <Button variant="outline" size="sm" onClick={addItem} className="mt-3"><Plus className="h-4 w-4 mr-1" />Add Item</Button>

        <div className="mt-4 pt-4 border-t flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{items.length} item(s)</span>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-xl font-bold">{formatMoney(total)}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/orders')}>Cancel</Button>
        <Button disabled={createMutation.isPending} onClick={handleSubmit}>{createMutation.isPending ? 'Creating...' : 'Create Draft Order'}</Button>
      </div>
    </div>
  );
}

