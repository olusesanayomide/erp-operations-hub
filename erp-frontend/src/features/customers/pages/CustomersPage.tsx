import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader, EmptyState } from '@/shared/components/PageComponents';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import { Label } from '@/shared/ui/label';
import { useAuth } from '@/app/providers/AuthContext';
import { Download, FileSpreadsheet, Plus, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  commitCustomerImport,
  createCustomer,
  listCustomers,
  previewCustomerImport,
} from '@/shared/lib/erp-api';
import { ScrollArea } from '@/shared/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';

type CustomerImportMode = 'create' | 'upsert';
type CustomerImportPreview = Awaited<ReturnType<typeof previewCustomerImport>>;

export default function CustomersPage() {
  const { canPerform } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [importMode, setImportMode] = useState<CustomerImportMode>('upsert');
  const [importFileName, setImportFileName] = useState('');
  const [importCsv, setImportCsv] = useState('');
  const [preview, setPreview] = useState<CustomerImportPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: listCustomers,
  });

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDialogOpen(false);
      setForm({ name: '', email: '', phone: '', address: '' });
      toast.success('Customer created');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const previewImportMutation = useMutation({
    mutationFn: previewCustomerImport,
    onSuccess: (result) => {
      setPreview(result);
      if (result.totals.invalid > 0) {
        toast.warning(`Preview ready. ${result.totals.invalid} row(s) need attention.`);
        return;
      }
      toast.success(`Preview ready. ${result.totals.valid} row(s) can be imported.`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const commitImportMutation = useMutation({
    mutationFn: commitCustomerImport,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`Imported ${result.totals.imported} customer(s).`);
      resetImportDialog();
      setImportDialogOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filtered = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(search.toLowerCase()) ||
      customer.email.toLowerCase().includes(search.toLowerCase()),
  );

  function resetImportDialog() {
    setImportMode('upsert');
    setImportFileName('');
    setImportCsv('');
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleImportFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please choose a CSV file.');
      event.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      setImportFileName(file.name);
      setImportCsv(text);
      setPreview(null);
    } catch {
      toast.error('Unable to read the selected CSV file.');
      event.target.value = '';
    }
  }

  function handleDownloadTemplate() {
    const csvTemplate =
      'name,email,phone,address\nAcme Corp,billing@acme.com,+1234567890,123 Business Lane\nNorthwind Ltd,ops@northwind.com,+2348012345678,42 Marina Road\n';
    const blob = new Blob([csvTemplate], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'customers-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Customers" description={`${customers.length} customers`}>
        {canPerform('customers.create') && (
          <>
            <Dialog
              open={importDialogOpen}
              onOpenChange={(open) => {
                setImportDialogOpen(open);
                if (!open) resetImportDialog();
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-6xl overflow-hidden p-0">
                <div className="flex max-h-[90vh] flex-col">
                  <DialogHeader className="border-b border-border px-6 py-5">
                    <DialogTitle>Import customers from CSV</DialogTitle>
                    <DialogDescription>
                      Upload a customer file, review row-level issues, then confirm
                      the import. Email is used as the matching key.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_360px]">
                      <div className="space-y-4">
                        <div className="rounded-xl border border-border bg-muted/30 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">CSV source</p>
                              <p className="text-sm text-muted-foreground">
                                Required columns:{' '}
                                <span className="font-mono">name</span>,{' '}
                                <span className="font-mono">email</span>
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleDownloadTemplate}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Template
                            </Button>
                          </div>
                          <div className="mt-4 space-y-3">
                            <Input
                              ref={fileInputRef}
                              type="file"
                              accept=".csv,text/csv"
                              onChange={handleImportFileChange}
                            />
                            <p className="text-sm text-muted-foreground">
                              {importFileName || 'No CSV selected yet.'}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-border bg-background p-4">
                          <Label className="text-sm font-medium">Import mode</Label>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <button
                              type="button"
                              className={`rounded-xl border p-4 text-left transition-colors ${
                                importMode === 'upsert'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/40'
                              }`}
                              onClick={() => {
                                setImportMode('upsert');
                                setPreview(null);
                              }}
                            >
                              <p className="font-medium">Upsert by email</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Create missing customers and update details for
                                email addresses that already exist.
                              </p>
                            </button>
                            <button
                              type="button"
                              className={`rounded-xl border p-4 text-left transition-colors ${
                                importMode === 'create'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/40'
                              }`}
                              onClick={() => {
                                setImportMode('create');
                                setPreview(null);
                              }}
                            >
                              <p className="font-medium">Create only</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Reject any row whose email is already in the registry
                                and import only brand-new customers.
                              </p>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-background p-4 lg:sticky lg:top-0">
                        <p className="text-sm font-medium">Import summary</p>
                        {preview ? (
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Rows
                              </p>
                              <p className="mt-1 text-2xl font-semibold">
                                {preview.totals.rows}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Valid
                              </p>
                              <p className="mt-1 text-2xl font-semibold">
                                {preview.totals.valid}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Create
                              </p>
                              <p className="mt-1 text-2xl font-semibold">
                                {preview.totals.creates}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Update
                              </p>
                              <p className="mt-1 text-2xl font-semibold">
                                {preview.totals.updates}
                              </p>
                            </div>
                            <div className="col-span-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Needs attention
                              </p>
                              <p className="mt-1 text-2xl font-semibold">
                                {preview.totals.invalid}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-4 text-sm text-muted-foreground">
                            Run a preview to see what will be created, updated, or
                            blocked before anything is written.
                          </p>
                        )}
                      </div>
                    </div>

                    {preview && (
                      <div className="mt-5 space-y-3">
                        <div>
                          <p className="text-sm font-medium">Row review</p>
                          <p className="text-sm text-muted-foreground">
                            Invalid rows stay out of the import until the CSV is
                            fixed and previewed again.
                          </p>
                        </div>
                        <div className="rounded-xl border border-border">
                          <ScrollArea className="h-[320px] w-full">
                            <div className="min-w-[980px]">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-16">Row</TableHead>
                                    <TableHead className="min-w-[180px]">
                                      Name
                                    </TableHead>
                                    <TableHead className="min-w-[220px]">
                                      Email
                                    </TableHead>
                                    <TableHead className="w-[160px]">
                                      Phone
                                    </TableHead>
                                    <TableHead className="min-w-[220px]">
                                      Address
                                    </TableHead>
                                    <TableHead className="w-[120px]">
                                      Action
                                    </TableHead>
                                    <TableHead className="min-w-[240px]">
                                      Issues
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {preview.rows.map((row) => (
                                    <TableRow
                                      key={`${row.rowNumber}-${row.email || row.name}`}
                                    >
                                      <TableCell>{row.rowNumber}</TableCell>
                                      <TableCell className="max-w-[180px] break-words">
                                        {row.name || (
                                          <span className="text-muted-foreground">
                                            Missing
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell className="break-words">
                                        {row.email || (
                                          <span className="text-muted-foreground">
                                            Missing
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {row.phone || (
                                          <span className="text-muted-foreground">
                                            Optional
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell className="max-w-[220px] break-words">
                                        {row.address || (
                                          <span className="text-muted-foreground">
                                            Optional
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <span
                                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                            row.action === 'create'
                                              ? 'bg-emerald-100 text-emerald-700'
                                              : row.action === 'update'
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-muted text-muted-foreground'
                                          }`}
                                        >
                                          {row.action ? row.action : 'blocked'}
                                        </span>
                                      </TableCell>
                                      <TableCell className="max-w-[260px] text-sm leading-6 whitespace-normal break-words">
                                        {row.issues.length > 0 ? (
                                          row.issues.join(' ')
                                        ) : (
                                          <span className="text-emerald-700">
                                            Ready
                                          </span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </ScrollArea>
                        </div>
                      </div>
                    )}
                  </div>

                  <DialogFooter className="border-t border-border px-6 py-4">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setImportDialogOpen(false);
                        resetImportDialog();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!importCsv || previewImportMutation.isPending}
                      onClick={() =>
                        previewImportMutation.mutate({
                          csv: importCsv,
                          mode: importMode,
                        })
                      }
                    >
                      {previewImportMutation.isPending
                        ? 'Reviewing...'
                        : 'Preview Import'}
                    </Button>
                    <Button
                      type="button"
                      disabled={
                        !preview ||
                        preview.totals.valid === 0 ||
                        commitImportMutation.isPending
                      }
                      onClick={() =>
                        commitImportMutation.mutate({
                          csv: importCsv,
                          mode: importMode,
                        })
                      }
                    >
                      {commitImportMutation.isPending
                        ? 'Importing...'
                        : `Import ${preview?.totals.valid ?? 0} Rows`}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Customer</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      placeholder="Company name"
                      value={form.name}
                      onChange={(e) =>
                        setForm((current) => ({ ...current, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="email@company.com"
                      value={form.email}
                      onChange={(e) =>
                        setForm((current) => ({ ...current, email: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      placeholder="+1 555-0000"
                      value={form.phone}
                      onChange={(e) =>
                        setForm((current) => ({ ...current, phone: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      placeholder="Street address"
                      value={form.address}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          address: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={createMutation.isPending}
                    onClick={() => {
                      if (!form.name || !form.email) {
                        toast.error('Name and email are required');
                        return;
                      }
                      createMutation.mutate(form);
                    }}
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Customer'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </PageHeader>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="erp-table-header">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Phone</th>
                <th className="text-right p-3">Orders</th>
                <th className="text-left p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr key={customer.id} className="erp-table-row">
                  <td className="p-3">
                    <Link
                      to={`/customers/${customer.id}`}
                      className="font-medium text-primary hover:underline text-sm"
                    >
                      {customer.name}
                    </Link>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {customer.email}
                  </td>
                  <td className="p-3 text-sm">{customer.phone}</td>
                  <td className="p-3 text-sm text-right font-medium">
                    {customer.orderCount}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {customer.createdAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isLoading && (
          <p className="p-4 text-sm text-muted-foreground">Loading customers...</p>
        )}
        {filtered.length === 0 && (
          <EmptyState
            icon={Users}
            title="No customers found"
            description="Add your first customer"
          />
        )}
      </div>
    </div>
  );
}

