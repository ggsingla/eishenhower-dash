import { create } from "zustand"
import { persist } from "zustand/middleware"
import { checkName } from "@/lib/labels"
import type { LabelType } from "@/lib/types"

const STORAGE_KEY = "eisenhower-dash:settings"

/** `ok` carries what the caller needs next; a failed edit says why, ready to show inline. */
export type Outcome<T = object> = ({ ok: true } & T) | { ok: false; error: string }

export interface SettingsState {
  labelTypes: LabelType[]

  addLabelType: (name: string) => Outcome<{ id: string }>
  renameLabelType: (id: string, name: string) => Outcome
  setLabelTypeMultiple: (id: string, multiple: boolean) => void
  removeLabelType: (id: string) => void
  reorderLabelTypes: (fromIndex: number, toIndex: number) => void

  addOption: (typeId: string, name: string) => Outcome<{ id: string }>
  renameOption: (typeId: string, optionId: string, name: string) => Outcome
  removeOption: (typeId: string, optionId: string) => void
  reorderOptions: (typeId: string, fromIndex: number, toIndex: number) => void
}

function moved<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex < 0 || fromIndex >= items.length || fromIndex === toIndex) return items

  const next = [...items]
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => {
      function updateType(id: string, change: (type: LabelType) => LabelType) {
        set((state) => ({
          labelTypes: state.labelTypes.map((type) => (type.id === id ? change(type) : type)),
        }))
      }

      return {
        labelTypes: [],

        addLabelType: (raw) => {
          const checked = checkName(raw, get().labelTypes)
          if (!checked.ok) return { ok: false, error: checked.error }

          const id = crypto.randomUUID()
          set((state) => ({
            labelTypes: [
              ...state.labelTypes,
              { id, name: checked.name, multiple: false, options: [] },
            ],
          }))
          return { ok: true, id }
        },

        renameLabelType: (id, raw) => {
          const checked = checkName(raw, get().labelTypes, id)
          if (!checked.ok) return { ok: false, error: checked.error }

          updateType(id, (type) => ({ ...type, name: checked.name }))
          return { ok: true }
        },

        setLabelTypeMultiple: (id, multiple) =>
          updateType(id, (type) => ({ ...type, multiple })),

        removeLabelType: (id) =>
          set((state) => ({ labelTypes: state.labelTypes.filter((type) => type.id !== id) })),

        reorderLabelTypes: (fromIndex, toIndex) =>
          set((state) => ({ labelTypes: moved(state.labelTypes, fromIndex, toIndex) })),

        addOption: (typeId, raw) => {
          const type = get().labelTypes.find((candidate) => candidate.id === typeId)
          if (!type) return { ok: false, error: "That label type no longer exists." }

          const checked = checkName(raw, type.options)
          if (!checked.ok) return { ok: false, error: checked.error }

          const id = crypto.randomUUID()
          updateType(typeId, (current) => ({
            ...current,
            options: [...current.options, { id, name: checked.name }],
          }))
          return { ok: true, id }
        },

        renameOption: (typeId, optionId, raw) => {
          const type = get().labelTypes.find((candidate) => candidate.id === typeId)
          if (!type) return { ok: false, error: "That label type no longer exists." }

          const checked = checkName(raw, type.options, optionId)
          if (!checked.ok) return { ok: false, error: checked.error }

          updateType(typeId, (current) => ({
            ...current,
            options: current.options.map((option) =>
              option.id === optionId ? { ...option, name: checked.name } : option
            ),
          }))
          return { ok: true }
        },

        removeOption: (typeId, optionId) =>
          updateType(typeId, (type) => ({
            ...type,
            options: type.options.filter((option) => option.id !== optionId),
          })),

        reorderOptions: (typeId, fromIndex, toIndex) =>
          updateType(typeId, (type) => ({
            ...type,
            options: moved(type.options, fromIndex, toIndex),
          })),
      }
    },
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (state) => ({ labelTypes: state.labelTypes }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<Pick<SettingsState, "labelTypes">> | undefined
        return { ...current, labelTypes: saved?.labelTypes ?? [] }
      },
    }
  )
)
