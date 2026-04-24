import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/PageComponents';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createPurchase, listProducts, listSuppliers, listWarehouses } from '@/shared/lib/erp-api';
import { useSettings } from '@/app/providers/SettingsContext';

interface DraftItem {
  productId: string;
  quantity: string;
  unitPrice: string;
}

function parsePositiveInteger(value: string) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || !Number.isInteger(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
}

function parsePositiveAmount(value: string) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
}

export default function PurchaseCreatePage() {
  const navigate = useNavigate();
  const { formatMoney } = useSettings();
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ productId: '', quantity: '1', unitPrice: '' }]);
  const createToastRef = useRef<string | number | null>(null);

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: listSuppliers,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: listWarehouses,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'normalized'],
    queryFn: listProducts,
  });

  const createMutation = useMutation({
    mutationFn: createPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast.success('Purchase order created');
      navigate('/purchases');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addItem = () => setItems([...items, { productId: '', quantity: '1', unitPrice: '' }]);
  const removeItem = (index: number) => setItems(items.filter((_, itemIndex) => itemIndex !== index));
  const updateItem = (index: number, field: keyof DraftItem, value: string) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const total = items.reduce((sum, item) => {
    const quantity = parsePositiveInteger(item.quantity) ?? 0;
    const unitPrice = parsePositiveAmount(item.unitPrice) ?? 0;
    return sum + unitPrice * quantity;
  }, 0);

  const handleSubmit = () => {
    if (!supplierId || !warehouseId || items.some((item) => !item.productId)) {
      toast.error('Please fill all required fields');
      return;
    }

    const invalidQuantityIndex = items.findIndex((item) => parsePositiveInteger(item.quantity) === null);
    if (invalidQuantityIndex >= 0) {
      toast.error(`Line ${invalidQuantityIndex + 1}: quantity must be a whole number greater than 0.`);
      return;
    }

    const invalidPriceIndex = items.findIndex((item) => parsePositiveAmount(item.unitPrice) === null);
    if (invalidPriceIndex >= 0) {
      toast.error(`Line ${invalidPriceIndex + 1}: unit price must be greater than 0.`);
      return;
    }

    createMutation.mutate({
      supplierId,
      warehouseId,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: parsePositiveInteger(item.quantity) as number,
        price: parsePositiveAmount(item.unitPrice) as number,
      })),
    });
  };

  useEffect(() => {
    if (createMutation.isPending) {
      if (!createToastRef.current) {
        createToastRef.current = toast.loading('Creating purchase order...', {
          description: 'You will be returned to the purchase list automatically when it is ready.',
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
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => navigate('/purchases')}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
      <PageHeader title="Create Purchase Order" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Supplier *</Label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
            <SelectContent>{suppliers.map((supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Destination Warehouse *</Label>
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
            <SelectContent>{warehouses.map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="erp-card p-5">
        <h3 className="erp-section-title">Items</h3>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex items-end gap-3 p-3 rounded-lg bg-muted/30">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Product</Label>
                <Select value={item.productId} onValueChange={(value) => {
                  const product = products.find((entry) => entry.id === value);
                  setItems((current) =>
                    current.map((entry, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...entry,
                            productId: value,
                            unitPrice: product
                              ? (product.basePrice * 0.65).toFixed(2)
                              : entry.unitPrice,
                          }
                        : entry,
                    ),
                  );
                }}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="w-20 space-y-1">
                <Label className="text-xs">Qty</Label>
                <Input type="number" min={1} step={1} value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
              </div>
              <div className="w-28 space-y-1">
                <Label className="text-xs">Unit Price</Label>
                <Input type="number" min="0.01" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', e.target.value)} />
              </div>
              <div className="w-24 text-right">
                <p className="text-sm font-semibold">{formatMoney((parsePositiveAmount(item.unitPrice) ?? 0) * (parsePositiveInteger(item.quantity) ?? 0))}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeItem(index)} disabled={items.length === 1}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addItem} className="mt-3"><Plus className="h-4 w-4 mr-1" />Add Item</Button>

        <div className="mt-4 pt-4 border-t flex justify-end">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-xl font-bold">{formatMoney(total)}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/purchases')}>Cancel</Button>
        <Button requiresOnline disabled={createMutation.isPending} onClick={handleSubmit}>{createMutation.isPending ? 'Creating...' : 'Create Draft PO'}</Button>
      </div>
    </div>
  );
}

