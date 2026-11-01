import { CircleQuestionMarkIcon } from "lucide-react"
import { useUiStore } from "@/store/ui-store"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/** Floating hint that the shortcut sheet exists; does what pressing ? does. */
export function ShortcutsButton() {
  const setShortcutsOpen = useUiStore((state) => state.setShortcutsOpen)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Keyboard shortcuts"
          onClick={() => setShortcutsOpen(true)}
          className="fixed bottom-4 left-4 z-40 rounded-full bg-card text-muted-foreground shadow-sm hover:text-foreground"
        >
          <CircleQuestionMarkIcon />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">
        Keyboard shortcuts <Kbd>?</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}
