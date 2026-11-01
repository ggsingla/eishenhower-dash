import { taskCount } from "@/lib/labels"
import {
  makeSingleSelect,
  removeLabelTypeEverywhere,
  removeOptionEverywhere,
} from "@/lib/label-actions"
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

/** A label edit that would change tasks, waiting for a yes. `count` is how many. */
export type PendingLabelChange =
  | { kind: "option"; typeId: string; optionId: string; name: string; count: number }
  | { kind: "type"; typeId: string; name: string; count: number }
  | { kind: "single"; typeId: string; name: string; count: number }

function describe(change: PendingLabelChange) {
  const tasks = taskCount(change.count)

  switch (change.kind) {
    case "option":
      return {
        title: `Remove “${change.name}”?`,
        body: `It is set on ${tasks}. They will lose this value.`,
        action: "Remove",
      }
    case "type":
      return {
        title: `Delete “${change.name}”?`,
        body: `${tasks} use it. They will lose all of its values, and the label disappears from the task editor.`,
        action: "Delete",
      }
    case "single":
      return {
        title: `Make “${change.name}” single-select?`,
        body: `${tasks} have more than one value. Each keeps only its first.`,
        action: "Make single-select",
      }
  }
}

function apply(change: PendingLabelChange) {
  if (change.kind === "option") removeOptionEverywhere(change.typeId, change.optionId)
  else if (change.kind === "type") removeLabelTypeEverywhere(change.typeId)
  else makeSingleSelect(change.typeId)
}

interface LabelConfirmDialogProps {
  change: PendingLabelChange | null
  onClose: () => void
}

export function LabelConfirmDialog({ change, onClose }: LabelConfirmDialogProps) {
  // Kept after closing so the text doesn't blank out during the exit animation.
  const copy = change ? describe(change) : null

  return (
    <AlertDialog open={change !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy?.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              if (change) apply(change)
              onClose()
            }}
          >
            {copy?.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
