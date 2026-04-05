import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { PageHeader, EmptyState } from '@/shared/components/PageComponents';
import { Button } from '@/shared/ui/button';
import { ArrowLeft, Users, Mail, Phone, MapPin } from 'lucide-react';
import { getCustomerById } from '@/shared/lib/erp-api';
import { useSettings } from '@/app/providers/SettingsContext';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const { formatMoney } = useSettings();
  const { data, isLoading } = useQuery({
    queryKey: ['customers', id],
    queryFn: () => getCustomerById(id || ''),
    enabled: !!id,
  });
  const customer = data?.customer;

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading customer...</div>;
  if (!customer) return <EmptyState icon={Users} title="Customer not found" description="" action={<Link to="/customers"><Button variant="outline">Back</Button></Link>} />;

  const orders = data?.orders || [];
  const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div className="animate-fade-in space-y-6">
      <Link to="/customers"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
      <PageHeader title={customer.name} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="erp-card p-5 flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium">{customer.email}</p></div></div>
        <div className="erp-card p-5 flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm font-medium">{customer.phone}</p></div></div>
        <div className="erp-card p-5 flex items-center gap-3"><MapPin className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm font-medium">{customer.address}</p></div></div>
        <div className="erp-card p-5"><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-xl font-bold">{formatMoney(totalRevenue)}</p></div>
      </div>

      <div className="erp-card p-5">
        <h3 className="erp-section-title">Orders ({orders.length})</h3>
        <table className="w-full">
          <thead><tr className="erp-table-header">
            <th className="text-left p-3">Order #</th>
            <th className="text-right p-3">Amount</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">Date</th>
          </tr></thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="erp-table-row">
                <td className="p-3"><Link to={`/orders/${o.id}`} className="text-sm font-medium text-primary hover:underline">{o.orderNumber}</Link></td>
                <td className="p-3 text-sm text-right font-medium">{formatMoney(o.totalAmount)}</td>
                <td className="p-3"><StatusBadge status={o.status} /></td>
                <td className="p-3 text-sm text-muted-foreground">{o.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No orders yet</p>}
      </div>
    </div>
  );
}

