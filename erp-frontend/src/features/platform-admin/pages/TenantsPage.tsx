import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, FolderArchive, PauseCircle, PlayCircle, ShieldAlert } from 'lucide-react';
import { PageHeader, TableSkeleton } from '@/shared/components/PageComponents';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Button } from '@/shared/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import { listTenants, updateTenantStatus } from '@/shared/lib/erp-api';
import type { PlatformTenant, TenantStatus } from '@/shared/types/erp';
import { toast } from 'sonner';

const statusActions: Record<
  TenantStatus,
  Array<{
    label: string;
    nextStatus: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
    icon: typeof PlayCircle;
    tone: string;
    description: string;
  }>
> = {
  active: [
    {
      label: 'Suspend',
      nextStatus: 'SUSPENDED',
      icon: PauseCircle,
      tone: 'text-amber-700',
      description: 'This blocks sign-in and API access until the tenant is reactivated.',
    },
    {
      label: 'Archive',
      nextStatus: 'ARCHIVED',
      icon: FolderArchive,
      tone: 'text-slate-700',
      description: 'This marks the tenant as archived and prevents future sign-ins.',
    },
  ],
  suspended: [
    {
      label: 'Reactivate',
      nextStatus: 'ACTIVE',
      icon: PlayCircle,
      tone: 'text-emerald-700',
      description: 'This restores access for the tenant and its users.',
    },
    {
      label: 'Archive',
      nextStatus: 'ARCHIVED',
      icon: FolderArchive,
      tone: 'text-slate-700',
      description: 'This moves the tenant to an archived state instead of a temporary suspension.',
    },
  ],
  archived: [
    {
      label: 'Reactivate',
      nextStatus: 'ACTIVE',
      icon: PlayCircle,
      tone: 'text-emerald-700',
      description: 'This restores access for an archived tenant.',
    },
  ],
};

export default function TenantsPage() {
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<{
    tenant: PlatformTenant;
    nextStatus: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
    label: string;
    description: string;
  } | null>(null);

  const {
    data: tenants = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['platform-tenants'],
    queryFn: listTenants,
  });

  const mutation = useMutation({
    mutationFn: ({ tenantId, status }: { tenantId: string; status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED' }) =>
      updateTenantStatus(tenantId, status),
    onSuccess: (tenant) => {
      queryClient.setQueryData<PlatformTenant[]>(['platform-tenants'], (current) =>
        current?.map((item) => (item.id === tenant.id ? tenant : item)) ?? [tenant],
      );
      toast.success(`${tenant.name} is now ${tenant.status}.`);
      setPendingAction(null);
    },
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error ? mutationError.message : 'Unable to update tenant status.',
      );
    },
  });

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Tenant Administration"
        description="Manage tenant lifecycle and keep platform-level access under control."
      />

      <div className="erp-card overflow-hidden">
        {isLoading && <div className="p-6"><TableSkeleton rows={6} cols={5} /></div>}

        {isError && (
          <div className="p-8 text-center">
            <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-destructive" />
            <h3 className="mb-1 font-semibold">Unable to load tenants</h3>
            <p className="text-sm text-muted-foreground">
              {(error as Error).message || 'The tenant directory could not be loaded.'}
            </p>
          </div>
        )}

        {!isLoading && !isError && tenants.length === 0 && (
          <div className="p-8 text-center">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-1 font-semibold">No tenants yet</h3>
            <p className="text-sm text-muted-foreground">
              New businesses created through self-serve signup will appear here.
            </p>
          </div>
        )}

        {!isLoading && !isError && tenants.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={tenant.status} />
                  </TableCell>
                  <TableCell>{tenant.userCount}</TableCell>
                  <TableCell>{tenant.createdAt}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {statusActions[tenant.status].map((action) => {
                        const Icon = action.icon;
                        return (
                          <AlertDialog
                            key={`${tenant.id}-${action.nextStatus}`}
                            open={
                              pendingAction?.tenant.id === tenant.id &&
                              pendingAction?.nextStatus === action.nextStatus
                            }
                            onOpenChange={(open) => {
                              if (!open) {
                                setPendingAction(null);
                              } else {
                                setPendingAction({
                                  tenant,
                                  nextStatus: action.nextStatus,
                                  label: action.label,
                                  description: action.description,
                                });
                              }
                            }}
                          >
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className={action.tone}>
                                <Icon className="mr-1.5 h-4 w-4" />
                                {action.label}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{action.label} {tenant.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {action.description}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  disabled={mutation.isPending}
                                  onClick={() =>
                                    mutation.mutate({
                                      tenantId: tenant.id,
                                      status: action.nextStatus,
                                    })
                                  }
                                >
                                  {mutation.isPending ? 'Saving...' : action.label}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        );
                      })}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
