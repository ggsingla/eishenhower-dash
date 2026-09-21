import { useState, type KeyboardEvent } from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { EllipsisIcon, EraserIcon, PlusIcon } from "lucide-react"
import { cn } from "cn"
import type { QuadrantMeta } from "@/lib/quadrants"
import type { QuadrantId, Task } from "@/lib/types"
import { useBoardStore } from "@/store/board-store"
import { useUiStore } from "@/store/ui-store"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import { SortableTaskCard } from "@/components/board/task-card"

interface BoardColumnProps {
  meta: QuadrantMeta
  tasks: Task[]
  /** Index of the card under the keyboard cursor, if the cursor is in this column. */
  focusedIndex: number | null
}

export function BoardColumn({ meta, tasks, focusedIndex }: BoardColumnProps) {
  const [composing, setComposing] = useState(false)
  const { setNodeRef, isOver } = useDroppable({
    id: meta.id,
    data: { type: "column", quadrant: meta.id },
  })

  return (
    <section
      aria-label={meta.label}
      className="group/column flex min-h-0 w-56 min-w-56 flex-1 flex-col"
    >
      <ColumnHeader
        meta={meta}
        count={tasks.length}
        onCompose={() => setComposing(true)}
      />

      <div
        ref={setNodeRef}
        className={cn(
          "scrollbar-subtle flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded-lg p-1",
          "transition-colors duration-100 ease-ui",
          isOver && cn("bg-accent/40 ring-1 ring-inset", meta.ring)
        )}
      >
        {composing && (
          <Composer quadrant={meta.id} onClose={() => setComposing(false)} />
        )}

        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task, index) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              index={index}
              focused={focusedIndex === index}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && !composing && (
          // One quiet line, not a box: the rule is a hint, and the column keeps
          // its whole height as a drop target either way.
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="mt-0.5 rounded-md px-2 py-2.5 text-center text-xs text-muted-foreground/60 transition-colors duration-100 ease-ui hover:text-muted-foreground"
          >
            {meta.hint}
          </button>
        )}
      </div>
    </section>
  )
}

function ColumnHeader({
  meta,
  count,
  onCompose,
}: {
  meta: QuadrantMeta
  count: number
  onCompose: () => void
}) {
  const setConfirmClear = useUiStore((state) => state.setConfirmClear)
  const openEditor = useUiStore((state) => state.openEditor)

  return (
    <header className="flex h-8 shrink-0 items-center gap-2 px-1.5">
      <meta.icon className={cn("size-3.5 shrink-0", meta.text)} />
      <h2 className="truncate text-sm font-medium tracking-tight">{meta.label}</h2>
      <span className="text-xs text-muted-foreground tabular-nums">{count}</span>

      <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity duration-100 ease-ui group-hover/column:opacity-100 focus-within:opacity-100">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Add task to ${meta.label}`}
          onClick={onCompose}
        >
          <PlusIcon />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" aria-label={`${meta.label} options`}>
              <EllipsisIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => openEditor({ quadrant: meta.id })}>
              <PlusIcon />
              New task…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={count === 0}
              onSelect={() => setConfirmClear(meta.id)}
            >
              <EraserIcon />
              Clear column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

/** Inline card composer — stays open after Enter so you can dump a list fast. */
function Composer({ quadrant, onClose }: { quadrant: QuadrantId; onClose: () => void }) {
  const [value, setValue] = useState("")
  const addTask = useBoardStore((state) => state.addTask)

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      if (value.trim() === "") {
        onClose()
        return
      }

      addTask({ title: value, notes: "", tags: [] }, quadrant)
      setValue("")
    }
  }

  return (
    <div className="rounded-md border border-primary/50 bg-card px-2.5 py-2 ring-2 ring-primary/20">
      <textarea
        autoFocus
        rows={2}
        value={value}
        placeholder="Task title…"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => value.trim() === "" && onClose()}
        className="w-full resize-none bg-transparent text-sm leading-snug font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground"
      />
      <div className="flex items-center justify-end gap-1 text-[0.6875rem] text-muted-foreground">
        <Kbd className="h-4">↵</Kbd>
        <span>add</span>
        <Kbd className="ml-1 h-4">Esc</Kbd>
        <span>close</span>
      </div>
    </div>
  )
}
