import {
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react"
import { cn } from "cn"
import { MOD_KEY } from "@/lib/platform"
import { WORKING_QUADRANTS } from "@/lib/quadrants"
import { useBoardStore } from "@/store/board-store"
import { useUiStore } from "@/store/ui-store"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ThemeToggle } from "@/components/theme-toggle"

export function AppHeader() {
  const columns = useBoardStore((state) => state.columns)
  const completedOpen = useUiStore((state) => state.completedOpen)
  const toggleCompleted = useUiStore((state) => state.toggleCompleted)
  const openPalette = useUiStore((state) => state.openPalette)
  const openEditor = useUiStore((state) => state.openEditor)

  const open = WORKING_QUADRANTS.reduce(
    (total, meta) => total + columns[meta.id].length,
    0
  )

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-3">
      <div className="flex items-center gap-2">
        <span className="size-4 rounded-[5px] bg-primary" aria-hidden />
        <h1 className="font-heading text-sm font-semibold tracking-tight">
          Eisenhower
        </h1>
      </div>

      <Separator orientation="vertical" className="h-4" />

      <p className="hidden text-xs text-muted-foreground tabular-nums sm:block">
        <span className="font-medium text-foreground">{open}</span> open
        <span className="mx-1.5 text-border">·</span>
        <span className="font-medium text-foreground">
          {columns.completed.length}
        </span>{" "}
        done
      </p>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => openPalette("root")}
          className="gap-2 pr-1.5 text-muted-foreground"
          data-icon="inline-start"
        >
          <SearchIcon />
          <span className="hidden sm:inline">Commands</span>
          <Kbd className="ml-1">{MOD_KEY}K</Kbd>
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-pressed={completedOpen}
              aria-label={completedOpen ? "Hide Completed" : "Show Completed"}
              onClick={toggleCompleted}
              className={cn(completedOpen && "bg-muted text-foreground")}
            >
              {completedOpen ? <PanelRightCloseIcon /> : <PanelRightOpenIcon />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {completedOpen ? "Hide" : "Show"} Completed <Kbd>⇧C</Kbd>
          </TooltipContent>
        </Tooltip>

        <ThemeToggle />

        <Button size="sm" onClick={() => openEditor({ quadrant: "do" })} className="pr-1.5">
          <PlusIcon />
          <span className="hidden sm:inline">New task</span>
          <Kbd className="ml-1 bg-primary-foreground/15 text-primary-foreground/80">C</Kbd>
        </Button>
      </div>
    </header>
  )
}
