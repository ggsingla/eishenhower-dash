export const QUADRANT_IDS = [
  "do",
  "delegate",
  "hold",
  "eliminate",
  "completed",
] as const

export type QuadrantId = (typeof QUADRANT_IDS)[number]

export interface Task {
  id: string
  /** Sequential, board-wide, shown as `#12`. Gives every card the same anchor. */
  number: number
  title: string
  notes: string
  tags: string[]
  quadrant: QuadrantId
  createdAt: number
  updatedAt: number
  completedAt: number | null
  /** Where "reopen" sends a completed task — the column it was finished from. */
  reopenTo: QuadrantId | null
}

/** The editable surface of a task — what the create/edit dialog produces. */
export type TaskDraft = Pick<Task, "title" | "notes" | "tags">

export function isQuadrantId(value: string): value is QuadrantId {
  return (QUADRANT_IDS as readonly string[]).includes(value)
}
