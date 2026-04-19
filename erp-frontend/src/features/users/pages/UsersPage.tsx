import { EmptyState, ErrorState, PageHeader, RetryButton, TableSkeleton } from '@/shared/components/PageComponents';
import { RoleBadge } from '@/shared/components/StatusBadge';
import { useAuth } from '@/app/providers/AuthContext';
import { Shield, Users } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listUsers, updateUser } from '@/shared/lib/erp-api';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Button } from '@/shared/ui/button';
import type { UserRole } from '@/shared/types/erp';
import { toast } from 'sonner';

export default function UsersPage() {
  const { user, hasRole, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('staff');
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

  const editingUser = users.find((item) => item.id === editingUserId);
  const isEditingSelf = editingUser?.id === user?.id;

  useEffect(() => {
    if (!editingUser) {
      return;
    }

    setEditName(editingUser.name);
    setEditRole(editingUser.role);
  }, [editingUser]);

	  const updateMutation = useMutation({
	    mutationFn: (payload: {
	      id: string;
	      name: string;
	      role: UserRole;
	      expectedUpdatedAt?: string;
	    }) =>
	      updateUser(payload.id, {
	        name: payload.name,
	        role: payload.role.toUpperCase() as 'ADMIN' | 'MANAGER' | 'STAFF',
	        expectedUpdatedAt: payload.expectedUpdatedAt,
	      }),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['users'], (current: typeof users | undefined) =>
        (current || []).map((item) =>
          item.id === updatedUser.id ? updatedUser : item,
        ),
      );
      if (updatedUser.id === user?.id) {
        void refreshUser().catch((refreshError: Error) => {
          toast.error(refreshError.message || 'User updated, but your session profile could not be refreshed.');
        });
      }
      setEditingUserId(null);
      toast.success('User updated');
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  const openEditDialog = (targetUserId: string) => {
    setEditingUserId(targetUserId);
  };

  const closeEditDialog = (open: boolean) => {
    if (open) {
      return;
    }

    if (updateMutation.isPending) {
      return;
    }

    setEditingUserId(null);
  };

  const handleSave = () => {
    if (!editingUser) {
      return;
    }

    if (!editName.trim()) {
      toast.error('Name is required');
      return;
    }

    updateMutation.mutate({
	      id: editingUser.id,
	      name: editName.trim(),
	      role: editRole,
	      expectedUpdatedAt: editingUser.concurrencyStamp,
	    });
  };

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
                        <button
                          className="text-xs text-primary hover:underline"
                          onClick={() => openEditDialog(u.id)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isLoading && <div className="p-6"><TableSkeleton rows={6} cols={5} /></div>}
            {isError && (
              <ErrorState
                title="Unable to load users"
                description={(error as Error).message || 'The user directory could not be loaded right now.'}
                action={<RetryButton onClick={() => void queryClient.invalidateQueries({ queryKey: ['users'] })} />}
              />
            )}
            {!isLoading && !isError && users.length === 0 && (
              <EmptyState
                icon={Users}
                title="No users found"
                description="Registered users will appear here once they exist in the system."
              />
            )}
          </div>

          <Dialog open={Boolean(editingUser)} onOpenChange={closeEditDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
              </DialogHeader>
              {editingUser && (
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="user-name">Name</Label>
                    <Input
                      id="user-name"
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-role">Role</Label>
                    <Select
                      value={editRole}
                      onValueChange={(value) => setEditRole(value as UserRole)}
                      disabled={isEditingSelf}
                    >
                      <SelectTrigger id="user-role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                    {isEditingSelf && (
                      <p className="text-xs text-muted-foreground">
                        Your own role can’t be changed from this session.
                      </p>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditingUserId(null)}
                      disabled={updateMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button requiresOnline onClick={handleSave} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
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

