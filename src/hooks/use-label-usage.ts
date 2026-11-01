import { useMemo } from "react"
import { countLabelUsage } from "@/lib/labels"
import { useBoardStore } from "@/store/board-store"

/** How many tasks lean on each label option and type; recomputed when tasks change. */
export function useLabelUsage() {
  const tasks = useBoardStore((state) => state.tasks)
  return useMemo(() => countLabelUsage(tasks), [tasks])
}
