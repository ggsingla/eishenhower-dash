import { QUADRANT_BY_ID } from "@/lib/quadrants"
import { clearColumnWithUndo } from "@/lib/task-actions"
import { useUiStore } from "@/store/ui-store"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function ClearColumnDialog() {
  const column = useUiStore((state) => state.confirmClear)
  const setConfirmClear = useUiStore((state) => state.setConfirmClear)

  return (
    <AlertDialog
      open={column !== null}
      onOpenChange={(open) => !open && setConfirmClear(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Clear {column ? QUADRANT_BY_ID[column].label : ""}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Every task in this column is removed. You can undo it from the toast
            right after.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (column) clearColumnWithUndo(column)
              setConfirmClear(null)
            }}
          >
            Clear
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
