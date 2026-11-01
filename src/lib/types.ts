export const QUADRANT_IDS = [
  "do",
  "delegate",
  "hold",
  "eliminate",
  "completed",
] as const

export type QuadrantId = (typeof QUADRANT_IDS)[number]

/** One choice inside a label type — "Acme" under "Client". Tasks reference it by id. */
export interface LabelOption {
  id: string
  name: string
}

/** A user-defined selector, e.g. "Client", offered in the task editor. */
export interface LabelType {
  id: string
  name: string
  /** Multi-select types may hold several options per task; single holds at most one. */
  multiple: boolean
  options: LabelOption[]
}

/** Label type id → the option ids chosen for it, in the order they were picked. */
export type TaskLabels = Record<string, string[]>

export interface Task {
  id: string
  /** Sequential, board-wide, shown as `#12`. Gives every card the same anchor. */
  number: number
  title: string
  notes: string
  tags: string[]
  /** Absent on tasks saved before label types existed; the store fills in `{}`. */
  labels: TaskLabels
  quadrant: QuadrantId
  createdAt: number
  updatedAt: number
  completedAt: number | null
  /** Where "reopen" sends a completed task — the column it was finished from. */
  reopenTo: QuadrantId | null
}

/** The editable surface of a task — what the create/edit dialog produces. */
export type TaskDraft = Pick<Task, "title" | "notes" | "tags" | "labels">

export function isQuadrantId(value: string): value is QuadrantId {
  return (QUADRANT_IDS as readonly string[]).includes(value)
}
