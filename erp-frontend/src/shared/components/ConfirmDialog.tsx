import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  onConfirm: () => void;
  isConfirming?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmClassName?: string;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isConfirming = false,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmClassName,
}: ConfirmDialogProps) {
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
          <AlertDialogDescription className="text-base leading-8 text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid grid-cols-2 gap-3 border-t border-border/70 px-6 py-5">
          <AlertDialogCancel
            disabled={isConfirming}
            className="mt-0 h-12 rounded-2xl border-border/80 text-base font-semibold"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isConfirming}
            onClick={onConfirm}
            className={
              confirmClassName ??
              'h-12 rounded-2xl bg-foreground text-base font-semibold text-background hover:bg-foreground/90'
            }
          >
            {isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
