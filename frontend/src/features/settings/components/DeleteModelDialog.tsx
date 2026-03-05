import React from "react";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
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

interface DeleteModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelName: string;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const DeleteModelDialog: React.FC<DeleteModelDialogProps> = ({
  open,
  onOpenChange,
  modelName,
  onConfirm,
  isDeleting = false,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Remove Model</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            Are you sure you want to remove{" "}
            <span className="font-medium text-foreground">"{modelName}"</span> from the catalog?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="font-medium text-amber-700 dark:text-amber-500">Note:</p>
          </div>
          <ul className="mt-1 text-muted-foreground space-y-1 list-disc list-inside ml-6">
            <li>This model will no longer appear in purpose dropdowns</li>
            <li>Existing purpose assignments using this model are not affected</li>
          </ul>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Removing...
              </>
            ) : (
              "Remove Model"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
