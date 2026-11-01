import { firstOnly, withoutOption, withoutType } from "@/lib/labels"
import { useBoardStore } from "@/store/board-store"
import { useSettingsStore } from "@/store/settings-store"

/**
 * Label edits that reach into tasks. Tasks hold option ids, so removing an
 * option or type must strip those ids in the same breath, or cards would point
 * at nothing.
 */

export function removeOptionEverywhere(typeId: string, optionId: string) {
  useSettingsStore.getState().removeOption(typeId, optionId)
  useBoardStore.getState().mapTaskLabels((labels) => withoutOption(labels, typeId, optionId))
}

export function removeLabelTypeEverywhere(typeId: string) {
  useSettingsStore.getState().removeLabelType(typeId)
  useBoardStore.getState().mapTaskLabels((labels) => withoutType(labels, typeId))
}

/** Switching to single-select: a task holding several picks keeps its first. */
export function makeSingleSelect(typeId: string) {
  useSettingsStore.getState().setLabelTypeMultiple(typeId, false)
  useBoardStore.getState().mapTaskLabels((labels) => firstOnly(labels, typeId))
}
