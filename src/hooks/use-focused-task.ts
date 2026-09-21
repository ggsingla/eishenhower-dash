import type { Task } from "@/lib/types"
import { useBoardStore } from "@/store/board-store"
import { useUiStore, type Cursor } from "@/store/ui-store"

function resolve(
  cursor: Cursor | null,
  columns: Record<string, string[]>,
  tasks: Record<string, Task>
): Task | null {
  if (!cursor) return null

  const id = columns[cursor.column]?.[cursor.index]
  return id ? (tasks[id] ?? null) : null
}

/** The task under the keyboard cursor, or null when nothing is focused. */
export function useFocusedTask() {
  const cursor = useUiStore((state) => state.cursor)
  const columns = useBoardStore((state) => state.columns)
  const tasks = useBoardStore((state) => state.tasks)

  return resolve(cursor, columns, tasks)
}

/** Same lookup, for code running outside React (keyboard handlers, actions). */
export function getFocusedTask() {
  const { columns, tasks } = useBoardStore.getState()
  return resolve(useUiStore.getState().cursor, columns, tasks)
}
