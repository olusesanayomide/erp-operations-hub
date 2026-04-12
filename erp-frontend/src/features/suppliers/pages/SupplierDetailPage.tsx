import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { PageHeader, EmptyState, DetailPageSkeleton, ErrorState, RetryButton } from '@/shared/components/PageComponents';
import { Button } from '@/shared/ui/button';
import { ArrowLeft, Factory, Mail, Phone, MapPin } from 'lucide-react';
import { getSupplierById } from '@/shared/lib/erp-api';
import { useSettings } from '@/app/providers/SettingsContext';

export default function SupplierDetailPage() {
  const { id } = useParams();
  const { formatMoney } = useSettings();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['suppliers', id],
    queryFn: () => getSupplierById(id || ''),
    enabled: !!id,
  });
  const supplier = data?.supplier;

  if (isLoading) return <DetailPageSkeleton />;
  if (isError) return <ErrorState title="Unable to load supplier" description={(error as Error).message || 'The requested supplier could not be loaded right now.'} action={<div className="flex gap-2"><RetryButton onClick={() => void refetch()} /><Link to="/suppliers"><Button variant="outline">Back</Button></Link></div>} />;
  if (!supplier) return <EmptyState icon={Factory} title="Supplier not found" description="" action={<Link to="/suppliers"><Button variant="outline">Back</Button></Link>} />;

  const purchases = data?.purchases || [];
  const totalSpent = purchases.reduce((s, p) => s + p.totalAmount, 0);

  return (
    <div className="animate-fade-in space-y-6">
      <Link to="/suppliers"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
      <PageHeader title={supplier.name} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="erp-card p-5 flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium">{supplier.email}</p></div></div>
        <div className="erp-card p-5 flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm font-medium">{supplier.phone}</p></div></div>
        <div className="erp-card p-5 flex items-center gap-3"><MapPin className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm font-medium">{supplier.address}</p></div></div>
        <div className="erp-card p-5"><p className="text-xs text-muted-foreground">Total Spend</p><p className="text-xl font-bold">{formatMoney(totalSpent)}</p></div>
      </div>

      <div className="erp-card p-5">
        <h3 className="erp-section-title">Purchase Orders ({purchases.length})</h3>
        <table className="w-full">
          <thead><tr className="erp-table-header">
            <th className="text-left p-3">PO #</th>
            <th className="text-right p-3">Amount</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">Date</th>
          </tr></thead>
          <tbody>
            {purchases.map(p => (
              <tr key={p.id} className="erp-table-row">
                <td className="p-3"><Link to={`/purchases/${p.id}`} className="text-sm font-medium text-primary hover:underline">{p.purchaseNumber}</Link></td>
                <td className="p-3 text-sm text-right font-medium">{formatMoney(p.totalAmount)}</td>
                <td className="p-3"><StatusBadge status={p.status} /></td>
                <td className="p-3 text-sm text-muted-foreground">{p.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {purchases.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No purchases yet</p>}
      </div>
    </div>
  );
}

