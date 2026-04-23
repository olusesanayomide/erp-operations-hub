import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Shield, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/providers/AuthContext';
import { EmptyState, ErrorState, PageHeader, RetryButton, TableSkeleton } from '@/shared/components/PageComponents';
import { RoleBadge } from '@/shared/components/StatusBadge';
import {
  createTenantInvite,
  listTenantInvites,
  listUsers,
  revokeTenantInvite,
  updateUser,
} from '@/shared/lib/erp-api';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import type { TenantInvite, UserRole } from '@/shared/types/erp';

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'staff', label: 'Staff' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
];

function getInitials(name?: string | null) {
  const value = name?.trim();
  if (!value) return '?';
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function toBackendRole(role: UserRole) {
  return role.toUpperCase() as 'ADMIN' | 'MANAGER' | 'STAFF';
}

export default function UsersPage() {
  const { user, hasRole, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('staff');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('staff');
  const [createdInvite, setCreatedInvite] = useState<TenantInvite | null>(null);

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

  const {
    data: invites = [],
    isLoading: invitesLoading,
    isError: invitesError,
    error: invitesQueryError,
  } = useQuery({
    queryKey: ['tenant-invites'],
    queryFn: listTenantInvites,
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
        role: toBackendRole(payload.role),
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

  const inviteMutation = useMutation({
    mutationFn: () =>
      createTenantInvite({
        email: inviteEmail.trim(),
        name: inviteName.trim() || undefined,
        role: toBackendRole(inviteRole),
      }),
    onSuccess: (invite) => {
      setCreatedInvite(invite);
      queryClient.setQueryData<TenantInvite[]>(['tenant-invites'], (current) => [
        invite,
        ...(current || []),
      ]);
      toast.success('Invite created. Copy the link and share it securely.');
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  const revokeMutation = useMutation({
    mutationFn: revokeTenantInvite,
    onSuccess: (revokedInvite) => {
      queryClient.setQueryData<TenantInvite[]>(['tenant-invites'], (current) =>
        (current || []).filter((invite) => invite.id !== revokedInvite.id),
      );
      toast.success('Invite revoked');
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  const openInviteDialog = () => {
    setInviteDialogOpen(true);
    setCreatedInvite(null);
  };

  const closeInviteDialog = (open: boolean) => {
    if (!open && inviteMutation.isPending) {
      return;
    }

    setInviteDialogOpen(open);
    if (!open) {
      setInviteEmail('');
      setInviteName('');
      setInviteRole('staff');
      setCreatedInvite(null);
    }
  };

  const openEditDialog = (targetUserId: string) => {
    setEditingUserId(targetUserId);
  };

  const closeEditDialog = (open: boolean) => {
    if (open || updateMutation.isPending) {
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

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    inviteMutation.mutate();
  };

  const copyInviteLink = async () => {
    if (!createdInvite?.inviteLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdInvite.inviteLink);
      toast.success('Invite link copied');
    } catch {
      toast.error('Unable to copy invite link. Select and copy it manually.');
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="erp-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
            {getInitials(user?.name)}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user?.name}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <RoleBadge role={user?.role || 'staff'} />
          </div>
        </div>
      </div>

      {hasRole('admin') && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <PageHeader title="User Management" description="Manage team members, roles, and onboarding invites" />
            <Button requiresOnline onClick={openInviteDialog} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invite user
            </Button>
          </div>

          <div className="erp-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="erp-table-header">
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-left">Role</th>
                    <th className="p-3 text-left">Created</th>
                    <th className="p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item.id} className="erp-table-row">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                            {getInitials(item.name)}
                          </div>
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">{item.email}</td>
                      <td className="p-3"><RoleBadge role={item.role} /></td>
                      <td className="p-3 text-sm text-muted-foreground">{item.createdAt}</td>
                      <td className="p-3">
                        <button
                          className="text-xs text-primary hover:underline"
                          onClick={() => openEditDialog(item.id)}
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

          <div className="erp-card p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Pending invites</h3>
                <p className="text-sm text-muted-foreground">
                  Share invite links manually and revoke unused links when needed.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => void queryClient.invalidateQueries({ queryKey: ['tenant-invites'] })}
              >
                Refresh
              </Button>
            </div>

            {invitesLoading && <TableSkeleton rows={3} cols={4} />}
            {invitesError && (
              <ErrorState
                title="Unable to load invites"
                description={(invitesQueryError as Error).message || 'Pending invites could not be loaded.'}
                action={<RetryButton onClick={() => void queryClient.invalidateQueries({ queryKey: ['tenant-invites'] })} />}
              />
            )}
            {!invitesLoading && !invitesError && invites.length === 0 && (
              <EmptyState
                icon={UserPlus}
                title="No pending invites"
                description="Create an invite to let a staff member join this tenant."
              />
            )}
            {!invitesLoading && !invitesError && invites.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="erp-table-header">
                      <th className="p-3 text-left">Email</th>
                      <th className="p-3 text-left">Role</th>
                      <th className="p-3 text-left">Expires</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((invite) => (
                      <tr key={invite.id} className="erp-table-row">
                        <td className="p-3">
                          <p className="text-sm font-medium">{invite.email}</p>
                          {invite.name && <p className="text-xs text-muted-foreground">{invite.name}</p>}
                        </td>
                        <td className="p-3"><RoleBadge role={invite.role} /></td>
                        <td className="p-3 text-sm text-muted-foreground">{invite.expiresAt}</td>
                        <td className="p-3">
                          <Button
                            variant="outline"
                            size="sm"
                            requiresOnline
                            disabled={revokeMutation.isPending}
                            onClick={() => revokeMutation.mutate(invite.id)}
                          >
                            Revoke
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Dialog open={inviteDialogOpen} onOpenChange={closeInviteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite user</DialogTitle>
                <DialogDescription>
                  Create a secure invite link for a team member to join this tenant.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="staff@company.com"
                    disabled={inviteMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Name</Label>
                  <Input
                    id="invite-name"
                    value={inviteName}
                    onChange={(event) => setInviteName(event.target.value)}
                    placeholder="Optional full name"
                    disabled={inviteMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value) => setInviteRole(value as UserRole)}
                    disabled={inviteMutation.isPending}
                  >
                    <SelectTrigger id="invite-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {createdInvite?.inviteLink && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                    <p className="font-semibold">Invite link created</p>
                    <div className="mt-2 flex gap-2">
                      <Input readOnly value={createdInvite.inviteLink} aria-label="Invite link" />
                      <Button type="button" variant="outline" onClick={copyInviteLink} className="gap-2">
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => closeInviteDialog(false)}
                    disabled={inviteMutation.isPending}
                  >
                    Close
                  </Button>
                  <Button requiresOnline onClick={handleInvite} disabled={inviteMutation.isPending}>
                    {inviteMutation.isPending ? 'Creating...' : 'Create Invite'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={Boolean(editingUser)} onOpenChange={closeEditDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update this user's display name or role within the current tenant.
                </DialogDescription>
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
                        {ROLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isEditingSelf && (
                      <p className="text-xs text-muted-foreground">
                        Your own role cannot be changed from this session.
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
          <Shield className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="mb-1 font-semibold">Access Restricted</h3>
          <p className="text-sm text-muted-foreground">User management is only available to administrators.</p>
        </div>
      )}
    </div>
  );
}
