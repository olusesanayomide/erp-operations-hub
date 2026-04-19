import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader, EmptyState, ErrorState, RetryButton, TableSkeleton } from '@/shared/components/PageComponents';
import { PaginationControls } from '@/shared/components/PaginationControls';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog';
import { Label } from '@/shared/ui/label';
import { useAuth } from '@/app/providers/AuthContext';
import { Plus, Search, Factory } from 'lucide-react';
import { toast } from 'sonner';
import { createSupplier, listPaginatedSuppliers } from '@/shared/lib/erp-api';

const PAGE_SIZE = 25;

export default function SuppliersPage() {
  const { canPerform } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });

  useEffect(() => {
    setPage(1);
  }, [search]);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['suppliers', { page, pageSize: PAGE_SIZE, search }],
    queryFn: () => listPaginatedSuppliers({ page, pageSize: PAGE_SIZE, search }),
  });
  const suppliers = data?.items ?? [];
  const pagination = data?.meta ?? { page, pageSize: PAGE_SIZE, total: 0, totalPages: 1 };

  const createMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setDialogOpen(false);
      setForm({ name: '', email: '', phone: '', address: '' });
      toast.success('Supplier created');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="animate-fade-in">
      <PageHeader title="Suppliers" description={`${pagination.total} suppliers`}>
        {canPerform('suppliers.create') && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button requiresOnline><Plus className="h-4 w-4 mr-2" />Add Supplier</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Supplier</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2"><Label>Name</Label><Input placeholder="Supplier name" value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="email@supplier.com" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input placeholder="+1 555-0000" value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Address</Label><Input placeholder="Address" value={form.address} onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))} /></div>
                <Button className="w-full" requiresOnline disabled={createMutation.isPending} onClick={() => {
                  if (!form.name) {
                    toast.error('Supplier name is required');
                    return;
                  }
                  createMutation.mutate(form);
                }}>{createMutation.isPending ? 'Creating...' : 'Create Supplier'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="erp-table-header">
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Phone</th>
              <th className="text-right p-3">Purchases</th>
              <th className="text-left p-3">Created</th>
            </tr></thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id} className="erp-table-row">
                  <td className="p-3"><Link to={`/suppliers/${s.id}`} className="font-medium text-primary hover:underline text-sm">{s.name}</Link></td>
                  <td className="p-3 text-sm text-muted-foreground">{s.email}</td>
                  <td className="p-3 text-sm">{s.phone}</td>
                  <td className="p-3 text-sm text-right font-medium">{s.purchaseCount}</td>
                  <td className="p-3 text-sm text-muted-foreground">{s.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isLoading && <div className="p-6"><TableSkeleton rows={6} cols={5} /></div>}
        {isError && (
          <ErrorState
            title="Unable to load suppliers"
            description={(error as Error).message || 'The supplier directory could not be loaded right now.'}
            action={<RetryButton onClick={() => void refetch()} />}
          />
        )}
        {!isLoading && !isError && suppliers.length === 0 && <EmptyState icon={Factory} title="No suppliers found" description="Add your first supplier" />}
        {!isLoading && !isError && pagination.total > 0 && (
          <PaginationControls
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            totalPages={pagination.totalPages}
            isFetching={isFetching}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}

