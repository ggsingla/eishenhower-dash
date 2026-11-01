import { create } from "zustand"
import { persist } from "zustand/middleware"
import { emptyColumns, insertAt, withoutId, type Columns } from "@/lib/columns"
import type { QuadrantId, Task, TaskDraft, TaskLabels } from "@/lib/types"

const STORAGE_KEY = "eisenhower-dash:board"

export interface BoardState {
  tasks: Record<string, Task>
  columns: Columns
  /** Next `Task.number` to hand out; never reused, so ids stay stable after deletes. */
  nextNumber: number
  addTask: (draft: TaskDraft, quadrant: QuadrantId) => Task
  updateTask: (id: string, patch: Partial<TaskDraft>) => void
  /** Removes the task and hands back enough state to put it back (undo). */
  deleteTask: (id: string) => { task: Task; index: number } | null
  restoreTask: (task: Task, index: number) => void
  /** Moves a task to another column, defaulting to the end of it. */
  moveTask: (id: string, to: QuadrantId, toIndex?: number) => void
  reorderTask: (column: QuadrantId, fromIndex: number, toIndex: number) => void
  clearColumn: (column: QuadrantId) => void
  /**
   * Rewrites every task's labels through `change`. Returning the same object
   * leaves that task untouched, so only tasks that actually differ re-render.
   */
  mapTaskLabels: (change: (labels: TaskLabels) => TaskLabels) => void
}

/** Boards saved before label types existed carry no `labels`; every task gets an empty set. */
function withLabels(tasks: Record<string, Task>) {
  const filled: Record<string, Task> = {}
  for (const [id, task] of Object.entries(tasks)) {
    filled[id] = task.labels ? task : { ...task, labels: {} }
  }
  return filled
}

/** Boards saved before identifiers existed get them in creation order. */
function numberTasks(tasks: Record<string, Task>, from = 1) {
  const numbered = { ...tasks }
  let next = from
  for (const task of Object.values(tasks)) {
    if (typeof task.number === "number") next = Math.max(next, task.number + 1)
  }
  const unnumbered = Object.values(tasks)
    .filter((task) => typeof task.number !== "number")
    .sort((a, b) => a.createdAt - b.createdAt)
  for (const task of unnumbered) numbered[task.id] = { ...task, number: next++ }
  return { tasks: numbered, nextNumber: next }
}

export const useBoardStore = create<BoardState>()(
  persist(
    (set, get) => ({
      tasks: {},
      columns: emptyColumns(),
      nextNumber: 1,

      addTask: (draft, quadrant) => {
        const now = Date.now()
        const task: Task = {
          id: crypto.randomUUID(),
          number: get().nextNumber,
          title: draft.title.trim(),
          notes: draft.notes.trim(),
          tags: draft.tags,
          labels: draft.labels,
          quadrant,
          createdAt: now,
          updatedAt: now,
          completedAt: quadrant === "completed" ? now : null,
          reopenTo: null,
        }

        set((state) => ({
          tasks: { ...state.tasks, [task.id]: task },
          columns: { ...state.columns, [quadrant]: [task.id, ...state.columns[quadrant]] },
          nextNumber: task.number + 1,
        }))

        return task
      },

      updateTask: (id, patch) => {
        set((state) => {
          const task = state.tasks[id]
          if (!task) return state

          return {
            tasks: {
              ...state.tasks,
              [id]: {
                ...task,
                ...patch,
                title: patch.title?.trim() ?? task.title,
                notes: patch.notes?.trim() ?? task.notes,
                updatedAt: Date.now(),
              },
            },
          }
        })
      },

      deleteTask: (id) => {
        const state = get()
        const task = state.tasks[id]
        if (!task) return null

        const index = state.columns[task.quadrant].indexOf(id)
        const tasks = { ...state.tasks }
        delete tasks[id]

        set({
          tasks,
          columns: {
            ...state.columns,
            [task.quadrant]: withoutId(state.columns[task.quadrant], id),
          },
        })

        return { task, index }
      },

      restoreTask: (task, index) => {
        set((state) => ({
          tasks: { ...state.tasks, [task.id]: task },
          columns: {
            ...state.columns,
            [task.quadrant]: insertAt(state.columns[task.quadrant], task.id, index),
          },
        }))
      },

      moveTask: (id, to, toIndex) => {
        set((state) => {
          const task = state.tasks[id]
          if (!task) return state

          const from = task.quadrant
          const target = withoutId(state.columns[to], id)
          const index = toIndex === undefined ? target.length : toIndex

          const columns: Columns = { ...state.columns, [to]: insertAt(target, id, index) }
          if (from !== to) columns[from] = withoutId(state.columns[from], id)

          return {
            columns,
            tasks: {
              ...state.tasks,
              [id]: {
                ...task,
                quadrant: to,
                updatedAt: Date.now(),
                completedAt:
                  to === "completed" ? (task.completedAt ?? Date.now()) : null,
                reopenTo:
                  to === "completed" && from !== "completed" ? from : task.reopenTo,
              },
            },
          }
        })
      },

      reorderTask: (column, fromIndex, toIndex) => {
        set((state) => {
          const ids = [...state.columns[column]]
          if (fromIndex < 0 || fromIndex >= ids.length) return state

          const [moved] = ids.splice(fromIndex, 1)
          ids.splice(toIndex, 0, moved)
          return { columns: { ...state.columns, [column]: ids } }
        })
      },

      clearColumn: (column) => {
        set((state) => {
          const tasks = { ...state.tasks }
          for (const id of state.columns[column]) delete tasks[id]
          return { tasks, columns: { ...state.columns, [column]: [] } }
        })
      },

      mapTaskLabels: (change) => {
        set((state) => {
          let changed = false
          const tasks: Record<string, Task> = {}
          for (const [id, task] of Object.entries(state.tasks)) {
            const labels = change(task.labels)
            changed ||= labels !== task.labels
            tasks[id] = labels === task.labels ? task : { ...task, labels }
          }
          return changed ? { tasks } : state
        })
      },
    }),
    {
      name: STORAGE_KEY,
      version: 3,
      // Actions live on the same object as the data; only the data is persisted.
      partialize: (state) => ({
        tasks: state.tasks,
        columns: state.columns,
        nextNumber: state.nextNumber,
      }),
      // v2 added `Task.number`, v3 `Task.labels`. Older boards are brought forward.
      migrate: (persisted, version) => {
        const saved = persisted as Partial<Pick<BoardState, "tasks" | "columns" | "nextNumber">>
        if (version < 2) return { ...saved, ...numberTasks(withLabels(saved.tasks ?? {})) }
        return { ...saved, tasks: withLabels(saved.tasks ?? {}) }
      },
      merge: (persisted, current) => {
        const saved = persisted as
          | Partial<Pick<BoardState, "tasks" | "columns" | "nextNumber">>
          | undefined
        // Number defensively too: a payload that skipped migration must not crash a card.
        const { tasks, nextNumber } = numberTasks(
          withLabels(saved?.tasks ?? {}),
          saved?.nextNumber ?? 1
        )
        return {
          ...current,
          tasks,
          nextNumber,
          // Spread over a fresh skeleton so a column added in a later version
          // never comes back undefined from an older payload.
          columns: { ...emptyColumns(), ...saved?.columns },
        }
      },
    }
  )
)

export const selectTask = (id: string) => (state: BoardState) => state.tasks[id]
export const selectColumn = (column: QuadrantId) => (state: BoardState) => state.columns[column]
