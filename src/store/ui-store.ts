import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { QuadrantId } from "@/lib/types"

/** Where the keyboard cursor sits. Stored positionally so it survives reordering. */
export interface Cursor {
  column: QuadrantId
  index: number
}

export type PaletteMode = "root" | "move" | "create"

/**
 * What last placed the cursor.
 * - `keyboard`: arrows or actions; sticky, and scrolls the card into view.
 * - `pointer`: a click or a drop; sticky, no scroll — the card is under the mouse.
 * - `hover`: the pointer passing over a card; cleared again when it leaves.
 */
export type CursorSource = "keyboard" | "pointer" | "hover"

export interface UiState {
  /** The Completed rail is collapsed by default — it's the column you don't need. */
  completedOpen: boolean
  setCompletedOpen: (open: boolean) => void
  toggleCompleted: () => void

  cursor: Cursor | null
  cursorSource: CursorSource
  setCursor: (cursor: Cursor | null, source?: CursorSource) => void

  paletteOpen: boolean
  paletteMode: PaletteMode
  openPalette: (mode?: PaletteMode) => void
  setPaletteOpen: (open: boolean) => void

  shortcutsOpen: boolean
  setShortcutsOpen: (open: boolean) => void

  editorOpen: boolean
  editorTaskId: string | null
  editorQuadrant: QuadrantId
  openEditor: (options?: { taskId?: string; quadrant?: QuadrantId }) => void
  setEditorOpen: (open: boolean) => void

  /** Column awaiting a "clear everything?" confirmation. */
  confirmClear: QuadrantId | null
  setConfirmClear: (column: QuadrantId | null) => void
}

/** A hover cursor becomes a sticky one — same position, so no card re-renders. */
function pinHover(state: UiState): Partial<UiState> {
  return state.cursorSource === "hover" ? { cursorSource: "pointer" } : {}
}

function sameCursor(a: Cursor | null, b: Cursor | null) {
  return a === b || (a !== null && b !== null && a.column === b.column && a.index === b.index)
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      completedOpen: false,
      // Collapsing the rail must not strand the cursor on a card nobody can see.
      setCompletedOpen: (open) =>
        set((state) => ({
          completedOpen: open,
          cursor: !open && state.cursor?.column === "completed" ? null : state.cursor,
        })),
      toggleCompleted: () =>
        set((state) => ({
          completedOpen: !state.completedOpen,
          cursor:
            state.completedOpen && state.cursor?.column === "completed"
              ? null
              : state.cursor,
        })),

      cursor: null,
      cursorSource: "keyboard",
      // Pointer moves call this continuously; bail before touching state when
      // nothing changed so hovering a focused card costs no render.
      setCursor: (cursor, source = "keyboard") =>
        set((state) =>
          sameCursor(state.cursor, cursor) && state.cursorSource === source
            ? state
            : { cursor, cursorSource: source }
        ),

      paletteOpen: false,
      paletteMode: "root",
      // Acting on a hovered card pins it: the overlay's subject must not vanish
      // when the pointer drifts off the card, and it stays selected afterwards.
      openPalette: (mode = "root") =>
        set((state) => ({ paletteOpen: true, paletteMode: mode, ...pinHover(state) })),
      setPaletteOpen: (open) => set({ paletteOpen: open }),

      shortcutsOpen: false,
      setShortcutsOpen: (open) => set({ shortcutsOpen: open }),

      editorOpen: false,
      editorTaskId: null,
      editorQuadrant: "do",
      openEditor: (options = {}) =>
        set((state) => ({
          editorOpen: true,
          editorTaskId: options.taskId ?? null,
          editorQuadrant: options.quadrant ?? state.editorQuadrant,
          ...pinHover(state),
        })),
      setEditorOpen: (open) => set({ editorOpen: open }),

      confirmClear: null,
      setConfirmClear: (column) => set({ confirmClear: column }),
    }),
    {
      name: "eisenhower-dash:ui",
      version: 1,
      // Only the view preference outlives the session; transient state resets.
      partialize: (state) => ({ completedOpen: state.completedOpen }),
    }
  )
)

/** True while any overlay owns the keyboard. */
export function isOverlayOpen(state: UiState) {
  return (
    state.paletteOpen ||
    state.shortcutsOpen ||
    state.editorOpen ||
    state.confirmClear !== null
  )
}
