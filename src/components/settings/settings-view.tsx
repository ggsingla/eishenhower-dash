import { useEffect, type ComponentType } from "react"
import { ArrowLeftIcon, TagsIcon, type LucideIcon } from "lucide-react"
import { cn } from "cn"
import { openBoard, sectionHref, type SettingsSection } from "@/lib/route"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Separator } from "@/components/ui/separator"
import { LabelsPage } from "@/components/settings/labels-page"

interface SectionMeta {
  label: string
  icon: LucideIcon
  Page: ComponentType
}

/** Adding a settings area is one entry here plus its id in `SETTINGS_SECTIONS`. */
const SECTIONS: Record<SettingsSection, SectionMeta> = {
  labels: { label: "Labels", icon: TagsIcon, Page: LabelsPage },
}

const SECTION_ORDER = Object.keys(SECTIONS) as SettingsSection[]

/** Menus and dialogs own Escape; typing in a field owns it too (it cancels the edit). */
const ESCAPE_OWNERS =
  'input, textarea, select, [role="menu"], [role="dialog"], [role="alertdialog"], [data-radix-popper-content-wrapper]'

export function SettingsView({ section }: { section: SettingsSection }) {
  const { Page } = SECTIONS[section]

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return

      const target = event.target instanceof Element ? event.target : null
      if (target?.closest(ESCAPE_OWNERS)) return

      openBoard()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={openBoard}
          className="gap-1.5 pr-1.5"
          data-icon="inline-start"
        >
          <ArrowLeftIcon />
          Board
          <Kbd className="ml-1">Esc</Kbd>
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <h1 className="font-heading text-sm font-semibold tracking-tight">Settings</h1>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Settings sections"
          className="flex w-52 shrink-0 flex-col gap-0.5 border-r border-border p-2"
        >
          {SECTION_ORDER.map((id) => {
            const item = SECTIONS[id]
            const current = id === section

            return (
              <a
                key={id}
                href={sectionHref(id)}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors duration-100 ease-ui outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  current
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </a>
            )
          })}
        </nav>

        <main className="scrollbar-subtle min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-6 py-8">
            <Page />
          </div>
        </main>
      </div>
    </div>
  )
}
