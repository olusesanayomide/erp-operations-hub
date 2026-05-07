import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';

type DestructiveConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  onConfirm: () => void;
  isConfirming?: boolean;
  confirmLabel?: string;
};

export function DestructiveConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isConfirming = false,
  confirmLabel = 'Remove',
}: DestructiveConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        size="sm"
        className="overflow-hidden rounded-[2rem] border-border/70 p-0 shadow-2xl"
      >
        <AlertDialogHeader className="space-y-3 px-6 pb-6 pt-7 text-center">
          <AlertDialogTitle className="text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-foreground">
            {title}
          </AlertDialogTitle>
          {description ? (
            <AlertDialogDescription className="text-base leading-8 text-muted-foreground">
              {description}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row items-center justify-between gap-3 border-t border-border/70 px-6 py-5 sm:space-x-0">
          <AlertDialogCancel
            disabled={isConfirming}
            className="mt-0 h-12 rounded-2xl border-border/80 px-6 text-base font-semibold"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isConfirming}
            onClick={onConfirm}
            className="h-12 rounded-2xl bg-destructive px-6 text-base font-semibold text-destructive-foreground hover:bg-destructive/90"
          >
            {isConfirming ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
