import { lazy, Suspense, useEffect, useState } from "react"
import { useUiStore } from "@/store/ui-store"

// Every overlay is dialog-shaped and none of them are on screen at first paint,
// so each one ships as its own chunk instead of weighing down the board.
const CommandPalette = lazy(() =>
  import("@/components/command-palette").then((m) => ({ default: m.CommandPalette }))
)
const TaskEditor = lazy(() =>
  import("@/components/board/task-editor").then((m) => ({ default: m.TaskEditor }))
)
const ShortcutsDialog = lazy(() =>
  import("@/components/shortcuts-dialog").then((m) => ({ default: m.ShortcutsDialog }))
)
const ClearColumnDialog = lazy(() =>
  import("@/components/board/clear-column-dialog").then((m) => ({
    default: m.ClearColumnDialog,
  }))
)
// Toasts can fire from any action, so this one mounts immediately — it is lazy
// only to keep sonner out of the initial chunk.
const Toaster = lazy(() =>
  import("@/components/ui/sonner").then((m) => ({ default: m.Toaster }))
)

/**
 * Latches true the first time an overlay opens. Unmounting on close would cut
 * off the exit animation and re-suspend on the next open.
 */
function useKeepMounted(open: boolean) {
  const [mounted, setMounted] = useState(open)
  if (open && !mounted) setMounted(true)
  return mounted
}

export function Overlays() {
  const palette = useKeepMounted(useUiStore((state) => state.paletteOpen))
  const editor = useKeepMounted(useUiStore((state) => state.editorOpen))
  const shortcuts = useKeepMounted(useUiStore((state) => state.shortcutsOpen))
  const clear = useKeepMounted(useUiStore((state) => state.confirmClear !== null))

  // Warm the two that get opened constantly, once the board is idle, so ⌘K and
  // C feel instant rather than waiting on a network round trip.
  useEffect(() => {
    const warm = () => {
      void import("@/components/command-palette")
      void import("@/components/board/task-editor")
    }

    if (typeof requestIdleCallback === "function") {
      const handle = requestIdleCallback(warm)
      return () => cancelIdleCallback(handle)
    }

    const handle = setTimeout(warm, 1500)
    return () => clearTimeout(handle)
  }, [])

  // One boundary each: a sibling still loading must not unmount an open dialog.
  return (
    <>
      <Suspense fallback={null}>{palette && <CommandPalette />}</Suspense>
      <Suspense fallback={null}>{editor && <TaskEditor />}</Suspense>
      <Suspense fallback={null}>{shortcuts && <ShortcutsDialog />}</Suspense>
      <Suspense fallback={null}>{clear && <ClearColumnDialog />}</Suspense>
      <Suspense fallback={null}>
        <Toaster position="bottom-right" />
      </Suspense>
    </>
  )
}
