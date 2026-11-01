import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { ChevronsLeftIcon, ChevronsRightIcon, EraserIcon } from "lucide-react"
import { cn } from "cn"
import { QUADRANT_BY_ID } from "@/lib/quadrants"
import type { Task } from "@/lib/types"
import { useUiStore } from "@/store/ui-store"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SortableTaskCard } from "@/components/board/task-card"

interface CompletedRailProps {
  tasks: Task[]
  focusedIndex: number | null
}

const META = QUADRANT_BY_ID.completed

/**
 * Completed is the column you shouldn't have to look at. It lives as a thin rail
 * on the right, stays a drop target while collapsed, and expands in place.
 */
export function CompletedRail({ tasks, focusedIndex }: CompletedRailProps) {
  const open = useUiStore((state) => state.completedOpen)
  const toggle = useUiStore((state) => state.toggleCompleted)
  const setConfirmClear = useUiStore((state) => state.setConfirmClear)
  const { setNodeRef, isOver } = useDroppable({
    id: META.id,
    data: { type: "column", quadrant: META.id },
  })

  return (
    <div
      ref={setNodeRef}
      aria-label="Completed"
      className={cn(
        "flex min-h-0 shrink-0 flex-col border-l border-border pl-1.5",
        "transition-[width,background-color] duration-200 ease-ui",
        open ? "w-[17rem]" : "w-10",
        isOver && "bg-accent/40"
      )}
    >
      {open ? (
        <>
          <header className="flex h-8 shrink-0 items-center gap-2 px-1.5">
            <META.icon className={cn("size-3.5 shrink-0", META.text)} />
            <h2 className="truncate text-sm font-medium tracking-tight">{META.label}</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {tasks.length}
            </span>
            <div className="ml-auto flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Clear Completed"
                disabled={tasks.length === 0}
                onClick={() => setConfirmClear(META.id)}
              >
                <EraserIcon />
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Hide Completed"
                    onClick={toggle}
                  >
                    <ChevronsRightIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Hide <Kbd>⇧C</Kbd>
                </TooltipContent>
              </Tooltip>
            </div>
          </header>

          <div className="scrollbar-subtle flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded-lg p-1">
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

            {tasks.length === 0 && (
              <p
                data-focused={focusedIndex !== null}
                className={cn(
                  "flex flex-1 items-center justify-center rounded-md border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground/70",
                  "transition-colors duration-100 ease-ui",
                  focusedIndex !== null && "bg-accent text-muted-foreground"
                )}
              >
                Nothing finished yet.
              </p>
            )}
          </div>
        </>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggle}
              aria-label={`Show Completed, ${tasks.length} tasks`}
              className="group/rail flex min-h-0 flex-1 flex-col items-center gap-2 rounded-lg py-2 text-muted-foreground transition-colors duration-100 ease-ui hover:bg-accent/50 hover:text-foreground"
            >
              <ChevronsLeftIcon className="size-3.5 shrink-0" />
              <META.icon className={cn("size-3.5 shrink-0", META.text)} />
              <span className="text-xs font-medium tabular-nums">{tasks.length}</span>
              <span className="mt-1 [writing-mode:vertical-rl] text-xs font-medium tracking-wide">
                Completed
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            Show Completed <Kbd>⇧C</Kbd>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
