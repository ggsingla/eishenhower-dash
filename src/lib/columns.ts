import type { QuadrantId } from "@/lib/types"

/** Column contents as ordered id lists — the shape both the store and drag previews use. */
export type Columns = Record<QuadrantId, string[]>

export function emptyColumns(): Columns {
  return { do: [], delegate: [], hold: [], eliminate: [], completed: [] }
}

export function withoutId(ids: string[], id: string) {
  return ids.filter((candidate) => candidate !== id)
}

/** Inserts at `index`, or appends when the index is out of range. */
export function insertAt(ids: string[], id: string, index: number) {
  const next = [...ids]
  next.splice(index < 0 || index > next.length ? next.length : index, 0, id)
  return next
}

/** The column whose list holds `id`, if any. */
export function columnOf(columns: Columns, id: string): QuadrantId | undefined {
  return (Object.keys(columns) as QuadrantId[]).find((column) => columns[column].includes(id))
}
