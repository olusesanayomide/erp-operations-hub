import { PageHeader } from '@/shared/components/PageComponents';
import { RoleBadge } from '@/shared/components/StatusBadge';
import { mockUsers } from '@/shared/data/mock';
import { useAuth } from '@/app/providers/AuthContext';
import { UserCircle, Shield } from 'lucide-react';

export default function UsersPage() {
  const { user, hasRole } = useAuth();

  return (
    <div className="animate-fade-in space-y-6">
      {/* Current user profile */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
            {user?.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user?.name}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <RoleBadge role={user?.role || 'staff'} />
          </div>
        </div>
      </div>

      {/* User management (admin only) */}
      {hasRole('admin') && (
        <>
          <PageHeader title="User Management" description="Manage team members and roles" />
          <div className="erp-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="erp-table-header">
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Role</th>
                  <th className="text-left p-3">Created</th>
                  <th className="text-left p-3">Actions</th>
                </tr></thead>
                <tbody>
                  {mockUsers.map(u => (
                    <tr key={u.id} className="erp-table-row">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                            {u.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-sm font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">{u.email}</td>
                      <td className="p-3"><RoleBadge role={u.role} /></td>
                      <td className="p-3 text-sm text-muted-foreground">{u.createdAt}</td>
                      <td className="p-3">
                        <button className="text-xs text-primary hover:underline">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!hasRole('admin') && (
        <div className="erp-card p-8 text-center">
          <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Access Restricted</h3>
          <p className="text-sm text-muted-foreground">User management is only available to administrators.</p>
        </div>
      )}
    </div>
  );
}

