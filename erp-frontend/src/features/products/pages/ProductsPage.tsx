import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader, EmptyState } from '@/shared/components/PageComponents';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { useAuth } from '@/app/providers/AuthContext';
import { Download, FileSpreadsheet, Package, Plus, Search } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/shared/ui/dialog';
import { Label } from '@/shared/ui/label';
import { toast } from 'sonner';
import { commitProductImport, createProduct, listRawProducts, normalizeProduct, previewProductImport } from '@/shared/lib/erp-api';
import { useSettings } from '@/app/providers/SettingsContext';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

type ProductImportMode = 'create' | 'upsert';

type ProductImportPreview = Awaited<ReturnType<typeof previewProductImport>>;

export default function ProductsPage() {
  const { canPerform } = useAuth();
  const { formatMoney } = useSettings();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', sku: '', price: '', category: '' });
  const [importMode, setImportMode] = useState<ProductImportMode>('upsert');
  const [importFileName, setImportFileName] = useState('');
  const [importCsv, setImportCsv] = useState('');
  const [preview, setPreview] = useState<ProductImportPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: rawProducts = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: listRawProducts,
  });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDialogOpen(false);
      setForm({ name: '', sku: '', price: '', category: '' });
      toast.success('Product created');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const previewImportMutation = useMutation({
    mutationFn: previewProductImport,
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
    mutationFn: commitProductImport,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Imported ${result.totals.imported} product(s).`);
      resetImportDialog();
      setImportDialogOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const products = rawProducts.map(normalizeProduct);
  const getTotalInventory = (productId: string) =>
    rawProducts
      .find((product) => product.id === productId)
      ?.inventoryItems?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
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

  async function handleImportFileChange(event: React.ChangeEvent<HTMLInputElement>) {
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
    const csvTemplate = 'name,sku,price\nIndustrial Valve,VALVE-001,149.99\nWarehouse Scanner,SCAN-002,89.50\n';
    const blob = new Blob([csvTemplate], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Products" description={`${products.length} products`}>
        {canPerform('products.create') && (
          <>
            <Dialog open={importDialogOpen} onOpenChange={(open) => {
              setImportDialogOpen(open);
              if (!open) resetImportDialog();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-6xl overflow-hidden p-0">
                <div className="flex max-h-[90vh] flex-col">
                  <DialogHeader className="border-b border-border px-6 py-5">
                    <DialogTitle>Import products from CSV</DialogTitle>
                    <DialogDescription>
                      Upload a product file, review row-level issues, then confirm the import. SKU is used as the matching key.
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
                            Required columns: <span className="font-mono">name</span>, <span className="font-mono">sku</span>, <span className="font-mono">price</span>
                          </p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={handleDownloadTemplate}>
                          <Download className="h-4 w-4 mr-2" />
                          Template
                        </Button>
                      </div>
                      <div className="mt-4 space-y-3">
                        <Input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFileChange} />
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
                          className={`rounded-xl border p-4 text-left transition-colors ${importMode === 'upsert' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                          onClick={() => {
                            setImportMode('upsert');
                            setPreview(null);
                          }}
                        >
                          <p className="font-medium">Upsert by SKU</p>
                          <p className="mt-1 text-sm text-muted-foreground">Create missing products and update name or price for SKUs that already exist.</p>
                        </button>
                        <button
                          type="button"
                          className={`rounded-xl border p-4 text-left transition-colors ${importMode === 'create' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                          onClick={() => {
                            setImportMode('create');
                            setPreview(null);
                          }}
                        >
                          <p className="font-medium">Create only</p>
                          <p className="mt-1 text-sm text-muted-foreground">Reject any row whose SKU is already in the catalog and import only brand-new products.</p>
                        </button>
                      </div>
                    </div>
                      </div>

                      <div className="rounded-xl border border-border bg-background p-4 lg:sticky lg:top-0">
                        <p className="text-sm font-medium">Import summary</p>
                        {preview ? (
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Rows</p>
                              <p className="mt-1 text-2xl font-semibold">{preview.totals.rows}</p>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Valid</p>
                              <p className="mt-1 text-2xl font-semibold">{preview.totals.valid}</p>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Create</p>
                              <p className="mt-1 text-2xl font-semibold">{preview.totals.creates}</p>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Update</p>
                              <p className="mt-1 text-2xl font-semibold">{preview.totals.updates}</p>
                            </div>
                            <div className="col-span-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Needs attention</p>
                              <p className="mt-1 text-2xl font-semibold">{preview.totals.invalid}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-4 text-sm text-muted-foreground">
                            Run a preview to see what will be created, updated, or blocked before anything is written.
                          </p>
                        )}
                      </div>
                    </div>
                    {preview && (
                      <div className="mt-5 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">Row review</p>
                            <p className="text-sm text-muted-foreground">Invalid rows stay out of the import until the CSV is fixed and previewed again.</p>
                          </div>
                        </div>
                        <div className="rounded-xl border border-border">
                          <ScrollArea className="h-[320px] w-full">
                            <div className="min-w-[860px]">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-16">Row</TableHead>
                                    <TableHead className="min-w-[220px]">Name</TableHead>
                                    <TableHead className="w-[140px]">SKU</TableHead>
                                    <TableHead className="w-[180px] text-right">Price</TableHead>
                                    <TableHead className="w-[120px]">Action</TableHead>
                                    <TableHead className="min-w-[240px]">Issues</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {preview.rows.map((row) => (
                                    <TableRow key={`${row.rowNumber}-${row.sku || row.name}`}>
                                      <TableCell>{row.rowNumber}</TableCell>
                                      <TableCell className="max-w-[220px] break-words">
                                        {row.name || <span className="text-muted-foreground">Missing</span>}
                                      </TableCell>
                                      <TableCell className="font-mono text-xs">{row.sku || <span className="text-muted-foreground">Missing</span>}</TableCell>
                                      <TableCell className="whitespace-nowrap text-right">
                                        {typeof row.price === 'number' ? formatMoney(row.price) : <span className="text-muted-foreground">Invalid</span>}
                                      </TableCell>
                                      <TableCell>
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${row.action === 'create' ? 'bg-emerald-100 text-emerald-700' : row.action === 'update' ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                                          {row.action ? row.action : 'blocked'}
                                        </span>
                                      </TableCell>
                                      <TableCell className="max-w-[260px] text-sm leading-6 whitespace-normal break-words">
                                        {row.issues.length > 0 ? row.issues.join(' ') : <span className="text-emerald-700">Ready</span>}
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
                    <Button type="button" variant="ghost" onClick={() => {
                      setImportDialogOpen(false);
                      resetImportDialog();
                    }}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!importCsv || previewImportMutation.isPending}
                      onClick={() => previewImportMutation.mutate({ csv: importCsv, mode: importMode })}
                    >
                      {previewImportMutation.isPending ? 'Reviewing...' : 'Preview Import'}
                    </Button>
                    <Button
                      type="button"
                      disabled={!preview || preview.totals.valid === 0 || commitImportMutation.isPending}
                      onClick={() => commitImportMutation.mutate({ csv: importCsv, mode: importMode })}
                    >
                      {commitImportMutation.isPending ? 'Importing...' : `Import ${preview?.totals.valid ?? 0} Rows`}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Product</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Product</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2"><Label>Name</Label><Input placeholder="Product name" value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>SKU</Label><Input placeholder="SKU-000" value={form.sku} onChange={(e) => setForm((current) => ({ ...current, sku: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Price</Label><Input type="number" placeholder="0.00" value={form.price} onChange={(e) => setForm((current) => ({ ...current, price: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-2"><Label>Category</Label><Input placeholder="Category" value={form.category} onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))} /></div>
                  <Button
                    className="w-full"
                    disabled={createMutation.isPending}
                    onClick={() => {
                      if (!form.name || !form.sku || !form.price) {
                        toast.error('Name, SKU, and price are required');
                        return;
                      }
                      createMutation.mutate({
                        name: form.name,
                        sku: form.sku,
                        price: Number(form.price),
                      });
                    }}
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Product'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </PageHeader>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="erp-table-header">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">SKU</th>
                <th className="text-left p-3">Category</th>
                <th className="text-right p-3">Base Price</th>
                <th className="text-right p-3">Total Stock</th>
                <th className="text-left p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="erp-table-row">
                  <td className="p-3">
                    <Link to={`/products/${p.id}`} className="font-medium text-primary hover:underline">{p.name}</Link>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground font-mono">{p.sku}</td>
                  <td className="p-3 text-sm">{p.category}</td>
                  <td className="p-3 text-sm text-right font-medium">{formatMoney(p.basePrice)}</td>
                  <td className="p-3 text-sm text-right">{getTotalInventory(p.id)}</td>
                  <td className="p-3 text-sm text-muted-foreground">{p.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isLoading && <p className="p-4 text-sm text-muted-foreground">Loading products...</p>}
        {filtered.length === 0 && <EmptyState icon={Package} title="No products found" description="Try adjusting your search" />}
      </div>
    </div>
  );
}

