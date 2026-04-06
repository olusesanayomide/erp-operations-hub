import { PageHeader } from '@/shared/components/PageComponents';
import { RoleBadge } from '@/shared/components/StatusBadge';
import { useAuth } from '@/app/providers/AuthContext';
import { Shield, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listUsers } from '@/shared/lib/erp-api';

export default function UsersPage() {
  const { user, hasRole } = useAuth();
  const {
    data: users = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    enabled: hasRole('admin'),
  });

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
                  {users.map(u => (
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
            {isLoading && (
              <p className="p-4 text-sm text-muted-foreground">Loading users...</p>
            )}
            {isError && (
              <p className="p-4 text-sm text-destructive">
                {(error as Error).message || 'Unable to load users.'}
              </p>
            )}
            {!isLoading && !isError && users.length === 0 && (
              <div className="p-8 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <h3 className="font-semibold mb-1">No users found</h3>
                <p className="text-sm text-muted-foreground">
                  Registered users will appear here once they exist in the system.
                </p>
              </div>
            )}
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

