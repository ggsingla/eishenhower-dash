import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react"
import { useDndContext } from "@dnd-kit/core"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { AlignLeftIcon, CheckIcon, EllipsisIcon, PencilIcon, TrashIcon } from "lucide-react"
import { cn } from "cn"
import { formatRelativeTime, formatShortAge } from "@/lib/format"
import { chord } from "@/lib/platform"
import { QUADRANTS, QUADRANT_BY_ID } from "@/lib/quadrants"
import { deleteTaskWithUndo, moveTaskTo, toggleComplete } from "@/lib/task-actions"
import type { Task } from "@/lib/types"
import { useUiStore } from "@/store/ui-store"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TaskCardProps {
  task: Task
  focused?: boolean
  dragging?: boolean
  grabbable?: boolean
  onMenuOpenChange?: (open: boolean) => void
}

/** Controls inside the card must not bubble a double-click up into "open editor". */
function stopDoubleClick(event: MouseEvent) {
  event.stopPropagation()
}

/**
 * Presentational card. Also what the drag overlay renders, so it holds no drag
 * state. Every card has the same two rows — title, then identifier and meta —
 * so a column reads as one rhythm whatever the tasks contain.
 */
export function TaskCard({ task, focused, dragging, grabbable, onMenuOpenChange }: TaskCardProps) {
  const meta = QUADRANT_BY_ID[task.quadrant]
  const isComplete = task.quadrant === "completed"
  const stamp = isComplete && task.completedAt ? task.completedAt : task.createdAt

  return (
    <div
      data-focused={focused}
      className={cn(
        "group/card relative flex flex-col gap-1 rounded-md border border-border/70 bg-card px-2.5 py-2 select-none",
        "transition-[background-color,border-color,box-shadow] duration-100 ease-ui",
        grabbable && "cursor-grab active:cursor-grabbing",
        // Focus is one layer: the surface lifts a step. No ring, no accent border.
        focused && "border-border bg-accent",
        dragging &&
          cn(
            "scale-[1.02] cursor-grabbing border-border bg-card",
            "shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_2px_4px_rgba(0,0,0,0.06),0_12px_28px_-8px_rgba(0,0,0,0.22)]",
            "dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.3),0_12px_28px_-8px_rgba(0,0,0,0.6)]"
          )
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={stopDoubleClick}
          onClick={() => toggleComplete(task)}
          aria-label={isComplete ? "Reopen task" : "Mark complete"}
          className={cn(
            // The visible circle is 16px; the pseudo-element widens the hit area.
            "relative mt-px flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-100 ease-ui",
            "before:absolute before:-inset-1.5 before:content-['']",
            isComplete
              ? "border-quadrant-completed bg-quadrant-completed text-white"
              : cn(meta.border, meta.text, "hover:bg-current/15")
          )}
        >
          <CheckIcon
            className={cn(
              "size-2.5 transition-opacity duration-100 ease-ui",
              !isComplete && "opacity-0 group-hover/card:opacity-80"
            )}
            strokeWidth={3.5}
          />
        </button>

        <p
          className={cn(
            "min-w-0 flex-1 text-sm leading-snug font-medium [text-wrap:pretty] break-words",
            isComplete && "text-muted-foreground line-through decoration-1"
          )}
        >
          {task.title}
        </p>

        <DropdownMenu onOpenChange={onMenuOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Options for ${task.title}`}
              onPointerDown={(event) => event.stopPropagation()}
              onDoubleClick={stopDoubleClick}
              className="-my-0.5 -mr-1 opacity-0 transition-opacity duration-100 ease-ui group-hover/card:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
            >
              <EllipsisIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onSelect={() =>
                useUiStore
                  .getState()
                  .openEditor({ taskId: task.id, quadrant: task.quadrant })
              }
            >
              <PencilIcon />
              Edit
              <DropdownMenuShortcut>E</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Move to</DropdownMenuLabel>
            {QUADRANTS.filter((option) => option.id !== task.quadrant).map((option) => (
              <DropdownMenuItem key={option.id} onSelect={() => moveTaskTo(task, option.id)}>
                <span className={cn("size-2 rounded-full", option.dot)} />
                {option.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => deleteTaskWithUndo(task)}>
              <TrashIcon />
              Delete
              <DropdownMenuShortcut>{chord("⌫")}</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex min-w-0 items-center gap-1.5 pl-6 text-[0.6875rem] leading-4 text-muted-foreground">
        <span className="tabular-nums text-muted-foreground/70">#{task.number}</span>
        <time
          dateTime={new Date(stamp).toISOString()}
          title={`${isComplete ? "Completed" : "Created"} ${formatRelativeTime(stamp)}`}
          className="tabular-nums"
        >
          {formatShortAge(stamp)}
        </time>
        {task.notes && (
          <AlignLeftIcon aria-label="Has notes" className="size-3 text-muted-foreground/70" />
        )}
        {task.tags.length > 0 && (
          <span className="flex min-w-0 flex-wrap items-center gap-1">
            {task.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-sm border border-border/70 px-1 leading-4 text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  )
}

interface SortableTaskCardProps {
  task: Task
  index: number
  focused: boolean
}

export function SortableTaskCard({ task, index, focused }: SortableTaskCardProps) {
  const setCursor = useUiStore((state) => state.setCursor)
  const { active: activeDrag } = useDndContext()
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)
  // `attributes` is deliberately unused: it would make every card a tab stop and
  // bind Space/Enter to dnd-kit's keyboard drag, which the cursor model owns.
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", quadrant: task.quadrant },
  })

  // Keyboard navigation has to be able to reach cards below the fold. A card
  // focused by the mouse is already in view, and scrolling it would shift the
  // board under the pointer.
  useEffect(() => {
    if (focused && useUiStore.getState().cursorSource === "keyboard") {
      wrapper.current?.scrollIntoView({ block: "nearest" })
    }
  }, [focused])

  function isUnderCursor() {
    const current = useUiStore.getState().cursor
    return current !== null && current.column === task.quadrant && current.index === index
  }

  /**
   * Focus follows the mouse, as in Linear's lists: whatever is under the pointer
   * is what shortcuts and ⌘K act on, no click required. A cursor already here
   * (placed by the keyboard or a click) is left alone so it keeps its stickiness.
   */
  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    // A finger sweeping down a column is a scroll, not an intent to focus.
    if (event.pointerType === "touch" || activeDrag || isUnderCursor()) return
    setCursor({ column: task.quadrant, index }, "hover")
  }

  /** Hover focus is transient: leaving the card takes the highlight with it. */
  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || activeDrag || menuOpen) return
    const ui = useUiStore.getState()
    if (ui.cursorSource === "hover" && isUnderCursor()) ui.setCursor(null)
  }

  /** The menu lives in a portal, so the pointer "leaves" the card while using it. */
  function handleMenuOpenChange(open: boolean) {
    setMenuOpen(open)
    if (open) return
    const ui = useUiStore.getState()
    const stillHovered = wrapper.current?.matches(":hover") ?? false
    if (!stillHovered && ui.cursorSource === "hover" && isUnderCursor()) ui.setCursor(null)
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    // A click is deliberate: it sticks until the pointer focuses something else.
    setCursor({ column: task.quadrant, index }, "pointer")
    listeners?.onPointerDown?.(event)
  }

  function handleDoubleClick() {
    useUiStore.getState().openEditor({ taskId: task.id, quadrant: task.quadrant })
  }

  return (
    <div
      ref={(node) => {
        wrapper.current = node
        setNodeRef(node)
      }}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "touch-none rounded-md outline-none",
        // While its card is in the overlay, the slot stays as a crisp placeholder
        // rather than a faded copy: same height, contents hidden, dashed edge.
        isDragging &&
          "bg-primary/[0.04] outline-1 -outline-offset-1 outline-dashed outline-primary/40 *:invisible"
      )}
      {...listeners}
      // Spread first, then compose: dnd-kit's own onPointerDown is in `listeners`
      // and would otherwise silently replace the click-to-focus handler.
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onDoubleClick={handleDoubleClick}
    >
      <TaskCard task={task} focused={focused} grabbable onMenuOpenChange={handleMenuOpenChange} />
    </div>
  )
}
