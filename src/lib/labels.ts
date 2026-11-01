import type { LabelType, Task, TaskLabels } from "@/lib/types"

/** Trimmed name, or the reason it can't be used. Duplicates ignore case. */
export function checkName(
  raw: string,
  siblings: { id: string; name: string }[],
  selfId?: string
): { ok: true; name: string } | { ok: false; error: string } {
  const name = raw.trim()
  if (name === "") return { ok: false, error: "Name can't be empty." }

  const clash = siblings.some(
    (sibling) => sibling.id !== selfId && sibling.name.toLowerCase() === name.toLowerCase()
  )
  if (clash) return { ok: false, error: `“${name}” already exists.` }

  return { ok: true, name }
}

/** `labels` without one option; the same object back when it wasn't there. */
export function withoutOption(labels: TaskLabels, typeId: string, optionId: string): TaskLabels {
  const current = labels[typeId]
  if (!current?.includes(optionId)) return labels

  const next = { ...labels }
  const rest = current.filter((id) => id !== optionId)
  if (rest.length > 0) next[typeId] = rest
  else delete next[typeId]
  return next
}

export function withoutType(labels: TaskLabels, typeId: string): TaskLabels {
  if (!(typeId in labels)) return labels

  const next = { ...labels }
  delete next[typeId]
  return next
}

/** Keeps only the first pick of a type — what a task keeps when it turns single-select. */
export function firstOnly(labels: TaskLabels, typeId: string): TaskLabels {
  const current = labels[typeId]
  if (!current || current.length <= 1) return labels

  return { ...labels, [typeId]: current.slice(0, 1) }
}

/** The editor's pick for one type: replaces for single-select, toggles for multi. */
export function withPick(labels: TaskLabels, type: LabelType, optionId: string | null): TaskLabels {
  if (optionId === null) return withoutType(labels, type.id)

  const current = labels[type.id] ?? []
  if (!type.multiple) return { ...labels, [type.id]: [optionId] }

  return current.includes(optionId)
    ? withoutOption(labels, type.id, optionId)
    : { ...labels, [type.id]: [...current, optionId] }
}

export interface LabelUsage {
  /** Tasks carrying each option, keyed by option id. */
  byOption: Record<string, number>
  /** Tasks carrying any option of each type, keyed by type id. */
  byType: Record<string, number>
  /** Tasks with more than one pick of a type — the ones single-select would trim. */
  overflow: Record<string, number>
}

export function countLabelUsage(tasks: Record<string, Task>): LabelUsage {
  const usage: LabelUsage = { byOption: {}, byType: {}, overflow: {} }

  for (const task of Object.values(tasks)) {
    for (const [typeId, optionIds] of Object.entries(task.labels ?? {})) {
      if (optionIds.length === 0) continue
      usage.byType[typeId] = (usage.byType[typeId] ?? 0) + 1
      if (optionIds.length > 1) usage.overflow[typeId] = (usage.overflow[typeId] ?? 0) + 1
      for (const optionId of optionIds) {
        usage.byOption[optionId] = (usage.byOption[optionId] ?? 0) + 1
      }
    }
  }

  return usage
}

/** "1 task" / "4 tasks". */
export function taskCount(count: number) {
  return `${count} task${count === 1 ? "" : "s"}`
}
