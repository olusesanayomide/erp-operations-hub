import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader, EmptyState, ErrorState, RetryButton, TableSkeleton } from '@/shared/components/PageComponents';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog';
import { Label } from '@/shared/ui/label';
import { useAuth } from '@/app/providers/AuthContext';
import { Plus, Search, Warehouse, MapPin, Package } from 'lucide-react';
import { toast } from 'sonner';
import { createWarehouse, listWarehouses } from '@/shared/lib/erp-api';

export default function WarehousesPage() {
  const { canPerform } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', description: '' });
  const createToastRef = useRef<string | number | null>(null);

  const {
    data: warehouses = [],
    isLoading: isWarehousesLoading,
    isError: isWarehousesError,
    error: warehousesError,
    refetch: refetchWarehouses,
  } = useQuery({
    queryKey: ['warehouses'],
    queryFn: listWarehouses,
  });

  const createMutation = useMutation({
    mutationFn: createWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setDialogOpen(false);
      setForm({ name: '', location: '', description: '' });
      toast.success('Warehouse created');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filtered = warehouses.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) || w.location.toLowerCase().includes(search.toLowerCase())
  );

  function handleCreateWarehouse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error('Warehouse name is required');
      return;
    }

    createMutation.mutate({
      name: form.name.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
    });
  }

  useEffect(() => {
    if (createMutation.isPending) {
      if (!createToastRef.current) {
        createToastRef.current = toast.loading('Creating warehouse...', {
          description: 'This dialog will close and the warehouse list will refresh automatically.',
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
    <div className="animate-fade-in">
      <PageHeader title="Warehouses" description={`${warehouses.length} warehouses`}>
        {canPerform('warehouses.create') && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button requiresOnline><Plus className="h-4 w-4 mr-2" />Add Warehouse</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Warehouse</DialogTitle></DialogHeader>
              <form className="space-y-4 py-2" onSubmit={handleCreateWarehouse}>
                <div className="space-y-2"><Label>Name</Label><Input placeholder="Warehouse name" value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Location</Label><Input placeholder="City, State" value={form.location} onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Description</Label><Input placeholder="Description" value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} /></div>
                <Button className="w-full" type="submit" requiresOnline disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create Warehouse'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search warehouses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

		      {/* Warehouse Cards */}
	      {isWarehousesLoading && <div className="rounded-xl border p-6"><TableSkeleton rows={6} cols={3} /></div>}
	      {isWarehousesError && (
	        <ErrorState
	          title="Unable to load warehouses"
	          description={(warehousesError as Error)?.message || 'Warehouse records could not be loaded right now.'}
	          action={<RetryButton onClick={() => void refetchWarehouses()} />}
	        />
	      )}
	      {!isWarehousesLoading && !isWarehousesError && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
	        {filtered.map(w => {
	          return (
	            <Link key={w.id} to={`/warehouses/${w.id}`} className="erp-card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <Warehouse className="h-5 w-5 text-primary" />
                </div>
              </div>
              <h3 className="font-semibold mb-1">{w.name}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                <MapPin className="h-3.5 w-3.5" />{w.location}
              </div>
              <div className="flex items-center gap-4 pt-3 border-t">
	                <div className="flex items-center gap-1.5 text-sm">
	                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
	                  <span className="font-medium">{w.itemCount}</span>
	                  <span className="text-muted-foreground">products</span>
	                </div>
	              </div>
	            </Link>
	          );
        })}
      </div>}
	      {!isWarehousesLoading && !isWarehousesError && filtered.length === 0 && <EmptyState icon={Warehouse} title="No warehouses found" description="Add your first warehouse" />}
    </div>
  );
}

