import { chord, MOD_KEY } from "@/lib/platform"
import { useUiStore } from "@/store/ui-store"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Kbd, KbdGroup } from "@/components/ui/kbd"

interface Shortcut {
  keys: string[]
  label: string
}

const SECTIONS: { heading: string; shortcuts: Shortcut[] }[] = [
  {
    heading: "General",
    shortcuts: [
      { keys: ["C"], label: "New task" },
      { keys: [`${MOD_KEY}K`], label: "Command palette" },
      { keys: ["?"], label: "This cheatsheet" },
      { keys: ["Esc"], label: "Close overlay / clear focus" },
    ],
  },
  {
    heading: "Navigate",
    shortcuts: [
      { keys: ["↑", "↓"], label: "Previous / next card" },
      { keys: ["←", "→"], label: "Previous / next column" },
    ],
  },
  {
    heading: "Focused card",
    shortcuts: [
      { keys: ["↵", "E"], label: "Edit" },
      { keys: ["S"], label: "Move to column…" },
      { keys: ["Space"], label: "Toggle complete" },
      { keys: [chord("⌫")], label: "Delete" },
      { keys: ["⇧↑", "⇧↓"], label: "Reorder within column" },
      { keys: ["⇧←", "⇧→"], label: "Move to adjacent column" },
    ],
  },
  {
    heading: "View",
    shortcuts: [{ keys: ["⇧C"], label: "Show / hide Completed" }],
  },
]

export function ShortcutsDialog() {
  const open = useUiStore((state) => state.shortcutsOpen)
  const setOpen = useUiStore((state) => state.setShortcutsOpen)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            The board is fully navigable without the mouse.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <section key={section.heading} className="flex flex-col gap-1.5">
              <h3 className="text-xs font-medium text-muted-foreground">
                {section.heading}
              </h3>
              {section.shortcuts.map((shortcut) => (
                <div
                  key={shortcut.label + shortcut.keys.join()}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="text-sm text-muted-foreground">{shortcut.label}</span>
                  <KbdGroup>
                    {shortcut.keys.map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </KbdGroup>
                </div>
              ))}
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
