import { useCallback, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmState = {
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
} | null;

/**
 * In-app confirm dialog to replace window.confirm on iOS.
 * Usage: const { confirm, dialog } = useConfirmDialog(); … await confirm({…}); return <>{dialog}</>
 */
export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState>(null);

  const confirm = useCallback(
    (opts: {
      title: string;
      description: string;
      confirmLabel?: string;
      danger?: boolean;
    }) =>
      new Promise<boolean>((resolve) => {
        setState({ ...opts, resolve });
      }),
    [],
  );

  const dialog = (
    <AlertDialog
      open={!!state}
      onOpenChange={(open) => {
        if (!open && state) {
          state.resolve(false);
          setState(null);
        }
      }}
    >
      <AlertDialogContent data-no-swipe-back>
        <AlertDialogHeader>
          <AlertDialogTitle>{state?.title}</AlertDialogTitle>
          <AlertDialogDescription>{state?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              state?.resolve(false);
              setState(null);
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className={state?.danger ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            onClick={() => {
              state?.resolve(true);
              setState(null);
            }}
          >
            {state?.confirmLabel ?? "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}
