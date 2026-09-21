import { notify } from "@/lib/notify"
import { QUADRANT_BY_ID } from "@/lib/quadrants"
import type { QuadrantId, Task } from "@/lib/types"
import { useBoardStore } from "@/store/board-store"
import { useUiStore } from "@/store/ui-store"

/**
 * Board mutations that carry UI consequences — toasts, undo, keeping the
 * keyboard cursor on something that still exists. Shared by the pointer and
 * keyboard paths so the two can never drift.
 */

/** Keeps the cursor inside its column after that column got shorter. */
function clampCursor(column: QuadrantId) {
  const ui = useUiStore.getState()
  const cursor = ui.cursor
  if (!cursor || cursor.column !== column) return

  const length = useBoardStore.getState().columns[column].length
  if (length === 0) {
    ui.setCursor(null)
    return
  }

  if (cursor.index > length - 1) {
    ui.setCursor({ column, index: length - 1 }, ui.cursorSource)
  }
}

export function moveTaskTo(task: Task, to: QuadrantId, index?: number) {
  if (task.quadrant === to) return

  useBoardStore.getState().moveTask(task.id, to, index)
  if (to === "completed") useUiStore.getState().setCompletedOpen(true)
  clampCursor(task.quadrant)
}

/** Completes (or reopens) a task. Returns the undo for a completion, which the toast also offers. */
export function toggleComplete(task: Task): (() => void) | undefined {
  const board = useBoardStore.getState()

  if (task.quadrant === "completed") {
    board.moveTask(task.id, task.reopenTo ?? "do")
    clampCursor("completed")
    return
  }

  // Remember the slot so undo puts the card back where it was, not on top.
  const index = board.columns[task.quadrant].indexOf(task.id)
  board.moveTask(task.id, "completed")
  clampCursor(task.quadrant)

  const undo = () => board.moveTask(task.id, task.quadrant, index)
  notify.success("Completed", {
    description: task.title,
    action: { label: "Undo", onClick: undo },
  })
  return undo
}

export function deleteTaskWithUndo(task: Task) {
  const board = useBoardStore.getState()
  const removed = board.deleteTask(task.id)
  if (!removed) return

  clampCursor(task.quadrant)
  notify.message("Task deleted", {
    description: task.title,
    action: {
      label: "Undo",
      onClick: () => board.restoreTask(removed.task, removed.index),
    },
  })
}

export function clearColumnWithUndo(column: QuadrantId) {
  const board = useBoardStore.getState()
  const snapshot = board.columns[column]
    .map((id, index) => ({ task: board.tasks[id], index }))
    .filter((entry) => Boolean(entry.task))

  if (snapshot.length === 0) return

  board.clearColumn(column)
  clampCursor(column)

  notify.message(`Cleared ${QUADRANT_BY_ID[column].label}`, {
    description: `${snapshot.length} task${snapshot.length === 1 ? "" : "s"} removed`,
    action: {
      label: "Undo",
      onClick: () => {
        for (const entry of snapshot) board.restoreTask(entry.task, entry.index)
      },
    },
  })
}
