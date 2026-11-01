import { useEffect } from "react"
import { COLUMN_ORDER } from "@/lib/quadrants"
import { openSettings } from "@/lib/route"
import {
  deleteTaskWithUndo,
  moveTaskTo,
  toggleComplete,
} from "@/lib/task-actions"
import type { QuadrantId } from "@/lib/types"
import { useBoardStore } from "@/store/board-store"
import { isOverlayOpen, useUiStore, type Cursor } from "@/store/ui-store"

const FIELD_SELECTOR = 'input, textarea, select, [contenteditable="true"]'
/** An open menu or dialog owns the keyboard; the board must not react to keys typed into it. */
const LAYER_SELECTOR =
  '[role="menu"], [role="dialog"], [role="alertdialog"], [role="listbox"], [data-radix-popper-content-wrapper]'
/** Enter and Space already mean "activate" on these, so the board stays out of the way. */
const CONTROL_SELECTOR = 'button, a[href], [role="button"], [role="menuitem"]'

function clamp(value: number, max: number) {
  return Math.min(Math.max(value, 0), Math.max(max, 0))
}

/** First card of the first column that has one — where the cursor lands cold. */
function seedCursor(columns: Record<QuadrantId, string[]>): Cursor | null {
  const column = COLUMN_ORDER.find((id) => columns[id].length > 0)
  return column ? { column, index: 0 } : null
}

/**
 * Board-level keyboard model, mirroring Linear's letters where an equivalent
 * exists. Bound once to the window; every branch reads fresh store state.
 */
export function useBoardShortcuts() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Radix marks the Escape that dismisses a menu or dialog as handled; that
      // key must not fall through and clear the cursor as well.
      if (event.defaultPrevented) return

      // A keydown with nothing focused targets the document or the window, and
      // neither of those has .closest().
      const target = event.target instanceof Element ? event.target : null
      // Card and column menus are not in the UI store, so they are detected by
      // where focus sits: Radix traps it inside the open layer.
      if (target?.closest(LAYER_SELECTOR)) return

      const ui = useUiStore.getState()
      const mod = event.metaKey || event.ctrlKey

      // The palette is reachable from anywhere that isn't already an overlay.
      if (mod && event.key.toLowerCase() === "k") {
        if (isOverlayOpen(ui)) return
        event.preventDefault()
        ui.openPalette("root")
        return
      }

      if (isOverlayOpen(ui)) return

      // ⌘, — the platform convention for preferences. Fine from inside a field too.
      if (mod && event.key === ",") {
        event.preventDefault()
        openSettings()
        return
      }

      if (target?.closest(FIELD_SELECTOR)) {
        // Escape hands the keyboard back to the board.
        if (event.key === "Escape" && target instanceof HTMLElement) target.blur()
        return
      }

      const board = useBoardStore.getState()
      const cursor = ui.cursor
      const focusedId = cursor ? board.columns[cursor.column]?.[cursor.index] : undefined
      const focused = focusedId ? board.tasks[focusedId] : undefined

      if (event.key === "Escape") {
        ui.setCursor(null)
        return
      }

      if (event.key === "?") {
        event.preventDefault()
        ui.setShortcutsOpen(true)
        return
      }

      if (mod || event.altKey) {
        // ⌘⌫ / Ctrl+⌫ — delete whatever is focused.
        if (focused && (event.key === "Backspace" || event.key === "Delete")) {
          event.preventDefault()
          deleteTaskWithUndo(focused)
        }
        return
      }

      if (event.key === "C" && event.shiftKey) {
        event.preventDefault()
        ui.toggleCompleted()
        return
      }

      if (event.key === "c") {
        event.preventDefault()
        const quadrant = cursor && cursor.column !== "completed" ? cursor.column : "do"
        ui.openEditor({ quadrant })
        return
      }

      if (event.key.startsWith("Arrow")) {
        event.preventDefault()
        handleArrow(event.key, event.shiftKey)
        return
      }

      if (!focused) return

      const onControl = Boolean(target?.closest(CONTROL_SELECTOR))
      if (onControl && (event.key === "Enter" || event.key === " ")) return

      if (event.key === "e" || event.key === "Enter") {
        event.preventDefault()
        ui.openEditor({ taskId: focused.id, quadrant: focused.quadrant })
        return
      }

      if (event.key === "s") {
        event.preventDefault()
        ui.openPalette("move")
        return
      }

      if (event.key === " ") {
        event.preventDefault()
        toggleComplete(focused)
      }
    }

    function handleArrow(key: string, shift: boolean) {
      const ui = useUiStore.getState()
      const board = useBoardStore.getState()

      const cursor = ui.cursor ?? seedCursor(board.columns)
      if (!cursor) return

      if (!ui.cursor) {
        ui.setCursor(cursor)
        return
      }

      const vertical = key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0
      const horizontal = key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0
      const taskId = board.columns[cursor.column]?.[cursor.index]
      const task = taskId ? board.tasks[taskId] : undefined

      if (!shift) {
        if (vertical !== 0) {
          const ids = board.columns[cursor.column]
          ui.setCursor({
            column: cursor.column,
            index: clamp(cursor.index + vertical, ids.length - 1),
          })
          return
        }

        const position = COLUMN_ORDER.indexOf(cursor.column)
        const column = COLUMN_ORDER[clamp(position + horizontal, COLUMN_ORDER.length - 1)]
        // Navigating into Completed reveals the rail rather than dead-ending.
        if (column === "completed") ui.setCompletedOpen(true)

        ui.setCursor({
          column,
          index: clamp(cursor.index, board.columns[column].length - 1),
        })
        return
      }

      if (!task) return

      if (vertical !== 0) {
        const ids = board.columns[cursor.column]
        const index = clamp(cursor.index + vertical, ids.length - 1)
        if (index === cursor.index) return

        board.reorderTask(cursor.column, cursor.index, index)
        ui.setCursor({ column: cursor.column, index })
        return
      }

      const position = COLUMN_ORDER.indexOf(cursor.column)
      const column = COLUMN_ORDER[clamp(position + horizontal, COLUMN_ORDER.length - 1)]
      if (column === cursor.column) return

      // Land at the same height in the new column so the card stays under the eye.
      const index = Math.min(cursor.index, board.columns[column].length)
      moveTaskTo(task, column, index)
      ui.setCursor({ column, index })
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])
}
