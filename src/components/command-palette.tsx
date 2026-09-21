import type { KeyboardEvent } from "react"
import { useTheme } from "next-themes"
import {
  CircleCheckIcon,
  EraserIcon,
  KeyboardIcon,
  MonitorIcon,
  MoonIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  PencilIcon,
  PlusIcon,
  SunIcon,
  TrashIcon,
} from "lucide-react"
import { cn } from "cn"
import { QUADRANTS, QUADRANT_BY_ID, WORKING_QUADRANTS, type QuadrantMeta } from "@/lib/quadrants"
import { chord } from "@/lib/platform"
import { deleteTaskWithUndo, moveTaskTo, toggleComplete } from "@/lib/task-actions"
import { useFocusedTask } from "@/hooks/use-focused-task"
import { useUiStore } from "@/store/ui-store"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

/** cmdk matches `defaultValue` against item values verbatim, so both come from here. */
function createValue(meta: QuadrantMeta) {
  return `new task in ${meta.label} ${meta.hint}`
}

export function CommandPalette() {
  const open = useUiStore((state) => state.paletteOpen)
  const mode = useUiStore((state) => state.paletteMode)
  const setOpen = useUiStore((state) => state.setPaletteOpen)
  const openPalette = useUiStore((state) => state.openPalette)
  const completedOpen = useUiStore((state) => state.completedOpen)
  const cursor = useUiStore((state) => state.cursor)
  const focused = useFocusedTask()
  const { setTheme } = useTheme()

  /** Every item closes the palette first, so the action lands on a settled UI. */
  function run(action: () => void) {
    setOpen(false)
    action()
  }

  /** Backspace on an empty query steps a sub-mode back to the root list. */
  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (mode === "root" || event.key !== "Backspace" || event.currentTarget.value !== "") return
    event.preventDefault()
    openPalette("root")
  }

  // Move mode needs a subject; without one it falls back to the root list.
  const isMoveMode = mode === "move" && focused !== null
  const isCreateMode = mode === "create"

  // Preselect the column under the cursor so ↵ alone creates where you're looking.
  const suggested = cursor && cursor.column !== "completed" ? cursor.column : "do"

  const copy = isMoveMode
    ? {
        title: "Move task",
        description: "Pick a column for the focused task",
        placeholder: `Move "${focused.title}" to…`,
      }
    : isCreateMode
      ? {
          title: "New task",
          description: "Pick the column the new task goes in",
          placeholder: "New task in…",
        }
      : {
          title: "Command palette",
          description: "Run any board action",
          placeholder: "Type a command or search…",
        }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={copy.title}
      description={copy.description}
      className="sm:max-w-lg"
    >
      {/*
        CommandDialog only supplies the Dialog shell — cmdk's context root is ours.
        Keyed on the mode so switching lists starts from a clean query and selection.
      */}
      <Command
        key={mode}
        loop
        defaultValue={isCreateMode ? createValue(QUADRANT_BY_ID[suggested]) : undefined}
      >
        <CommandInput autoFocus placeholder={copy.placeholder} onKeyDown={handleInputKeyDown} />
        <CommandList>
          <CommandEmpty>No matching command.</CommandEmpty>

          {isMoveMode ? (
            <CommandGroup heading="Move to">
              {QUADRANTS.filter((meta) => meta.id !== focused.quadrant).map((meta) => (
                <CommandItem
                  key={meta.id}
                  value={`move ${meta.label} ${meta.hint}`}
                  onSelect={() => run(() => moveTaskTo(focused, meta.id))}
                >
                  <span className={cn("size-2 rounded-full", meta.dot)} />
                  {meta.label}
                  <span className="text-xs text-muted-foreground">{meta.hint}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : isCreateMode ? (
            <CommandGroup heading="New task in">
              {WORKING_QUADRANTS.map((meta) => (
                <CommandItem
                  key={meta.id}
                  value={createValue(meta)}
                  onSelect={() =>
                    run(() => useUiStore.getState().openEditor({ quadrant: meta.id }))
                  }
                >
                  <span className={cn("size-2 rounded-full", meta.dot)} />
                  {meta.label}
                  <span className="text-xs text-muted-foreground">{meta.hint}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : (
            <>
              {focused && (
                <>
                  <CommandGroup heading={focused.title}>
                    <CommandItem
                      value="edit task"
                      onSelect={() =>
                        run(() =>
                          useUiStore
                            .getState()
                            .openEditor({ taskId: focused.id, quadrant: focused.quadrant })
                        )
                      }
                    >
                      <PencilIcon />
                      Edit task
                      <CommandShortcut>E</CommandShortcut>
                    </CommandItem>
                    <CommandItem
                      value="move task status column"
                      onSelect={() => openPalette("move")}
                    >
                      <PanelRightOpenIcon />
                      Move to…
                      <CommandShortcut>S</CommandShortcut>
                    </CommandItem>
                    <CommandItem
                      value="toggle complete done reopen"
                      onSelect={() => run(() => toggleComplete(focused))}
                    >
                      <CircleCheckIcon />
                      {focused.quadrant === "completed" ? "Reopen task" : "Mark complete"}
                      <CommandShortcut>Space</CommandShortcut>
                    </CommandItem>
                    <CommandItem
                      value="delete task"
                      onSelect={() => run(() => deleteTaskWithUndo(focused))}
                    >
                      <TrashIcon />
                      Delete task
                      <CommandShortcut>{chord("⌫")}</CommandShortcut>
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              <CommandGroup heading="Create">
                <CommandItem
                  value="new task create add"
                  onSelect={() => openPalette("create")}
                >
                  <PlusIcon />
                  New task…
                  <CommandShortcut>C</CommandShortcut>
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="View">
                <CommandItem
                  value="toggle completed column rail"
                  onSelect={() => run(() => useUiStore.getState().toggleCompleted())}
                >
                  {completedOpen ? <PanelRightCloseIcon /> : <PanelRightOpenIcon />}
                  {completedOpen ? "Hide Completed" : "Show Completed"}
                  <CommandShortcut>⇧C</CommandShortcut>
                </CommandItem>
                <CommandItem value="theme light" onSelect={() => run(() => setTheme("light"))}>
                  <SunIcon />
                  Light theme
                </CommandItem>
                <CommandItem value="theme dark" onSelect={() => run(() => setTheme("dark"))}>
                  <MoonIcon />
                  Dark theme
                </CommandItem>
                <CommandItem value="theme system" onSelect={() => run(() => setTheme("system"))}>
                  <MonitorIcon />
                  System theme
                </CommandItem>
                <CommandItem
                  value="keyboard shortcuts help"
                  onSelect={() => run(() => useUiStore.getState().setShortcutsOpen(true))}
                >
                  <KeyboardIcon />
                  Keyboard shortcuts
                  <CommandShortcut>?</CommandShortcut>
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Danger zone">
                {QUADRANTS.map((meta) => (
                  <CommandItem
                    key={meta.id}
                    value={`clear column ${meta.label}`}
                    onSelect={() =>
                      run(() => useUiStore.getState().setConfirmClear(meta.id))
                    }
                  >
                    <EraserIcon />
                    Clear {meta.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
