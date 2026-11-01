import { Trash2Icon, XIcon } from "lucide-react"
import { cn } from "cn"
import { removeLabelTypeEverywhere, removeOptionEverywhere } from "@/lib/label-actions"
import { taskCount, type LabelUsage } from "@/lib/labels"
import type { LabelOption, LabelType } from "@/lib/types"
import { useSettingsStore } from "@/store/settings-store"
import { Button } from "@/components/ui/button"
import { AddInput, InlineNameInput } from "@/components/settings/inline-fields"
import type { PendingLabelChange } from "@/components/settings/label-confirm-dialog"
import { SortableList, SortableRow } from "@/components/settings/sortable-list"

interface LabelTypeCardProps {
  type: LabelType
  usage: LabelUsage
  /** Focus the option input — set right after the type is created. */
  autoFocusOptions: boolean
  onRequestConfirm: (change: PendingLabelChange) => void
}

export function LabelTypeCard({ type, usage, autoFocusOptions, onRequestConfirm }: LabelTypeCardProps) {
  const store = useSettingsStore.getState

  function handleDelete() {
    const count = usage.byType[type.id] ?? 0
    if (count > 0) onRequestConfirm({ kind: "type", typeId: type.id, name: type.name, count })
    else removeLabelTypeEverywhere(type.id)
  }

  function handleMode(multiple: boolean) {
    if (multiple === type.multiple) return

    const overflow = usage.overflow[type.id] ?? 0
    if (!multiple && overflow > 0) {
      onRequestConfirm({ kind: "single", typeId: type.id, name: type.name, count: overflow })
      return
    }
    store().setLabelTypeMultiple(type.id, multiple)
  }

  function handleDeleteOption(option: LabelOption) {
    const count = usage.byOption[option.id] ?? 0
    if (count > 0) {
      onRequestConfirm({
        kind: "option",
        typeId: type.id,
        optionId: option.id,
        name: option.name,
        count,
      })
    } else {
      removeOptionEverywhere(type.id, option.id)
    }
  }

  return (
    <SortableRow id={type.id} label={type.name}>
      {(grip) => (
        <section
          aria-label={type.name}
          className="rounded-lg border border-border bg-card"
        >
          <header className="flex items-center gap-1 p-1.5">
            {grip}
            <InlineNameInput
              value={type.name}
              label={`Name of label type ${type.name}`}
              onCommit={(name) => {
                const result = store().renameLabelType(type.id, name)
                return result.ok ? null : result.error
              }}
              className="text-sm font-medium"
            />
            <ModeToggle multiple={type.multiple} onChange={handleMode} />
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Delete label type ${type.name}`}
              onClick={handleDelete}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2Icon />
            </Button>
          </header>

          <div className="flex flex-col gap-0.5 border-t border-border/70 p-1.5">
            <SortableList
              ids={type.options.map((option) => option.id)}
              onReorder={(from, to) => store().reorderOptions(type.id, from, to)}
            >
              {type.options.map((option) => (
                <OptionRow
                  key={option.id}
                  typeId={type.id}
                  option={option}
                  used={usage.byOption[option.id] ?? 0}
                  onDelete={() => handleDeleteOption(option)}
                />
              ))}
            </SortableList>

            {type.options.length === 0 && (
              <p className="px-7 py-1 text-xs text-muted-foreground">
                No options yet. This label stays out of the task editor until it has one.
              </p>
            )}

            <AddInput
              autoFocus={autoFocusOptions}
              label={`Add option to ${type.name}`}
              placeholder="Add an option and press Enter"
              onAdd={(name) => {
                const result = store().addOption(type.id, name)
                return result.ok ? null : result.error
              }}
              className="pt-1 pl-7"
            />
          </div>
        </section>
      )}
    </SortableRow>
  )
}

interface OptionRowProps {
  typeId: string
  option: LabelOption
  used: number
  onDelete: () => void
}

function OptionRow({ typeId, option, used, onDelete }: OptionRowProps) {
  return (
    <SortableRow id={option.id} label={option.name}>
      {(grip) => (
        <div
          data-used={used > 0}
          className="group/option flex items-center gap-1 rounded-md pr-1 transition-colors duration-100 ease-ui hover:bg-accent/40"
        >
          {grip}
          <InlineNameInput
            value={option.name}
            label={`Name of option ${option.name}`}
            onCommit={(name) => {
              const result = useSettingsStore.getState().renameOption(typeId, option.id, name)
              return result.ok ? null : result.error
            }}
            // An option already on a task reads dimmer: it's in use, handle with care.
            className={cn("text-sm", used > 0 && "text-muted-foreground")}
          />
          {used > 0 && (
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {taskCount(used)}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Remove option ${option.name}`}
            onClick={onDelete}
            className="opacity-0 transition-opacity duration-100 ease-ui group-hover/option:opacity-100 focus-visible:opacity-100"
          >
            <XIcon />
          </Button>
        </div>
      )}
    </SortableRow>
  )
}

function ModeToggle({
  multiple,
  onChange,
}: {
  multiple: boolean
  onChange: (multiple: boolean) => void
}) {
  const modes = [
    { multiple: false, label: "Single", hint: "A task can pick one option" },
    { multiple: true, label: "Multiple", hint: "A task can pick several options" },
  ]

  return (
    <div role="group" aria-label="Selection mode" className="flex rounded-md bg-muted p-0.5">
      {modes.map((mode) => (
        <button
          key={mode.label}
          type="button"
          title={mode.hint}
          aria-pressed={multiple === mode.multiple}
          onClick={() => onChange(mode.multiple)}
          className={cn(
            "rounded-[5px] px-2 py-0.5 text-xs font-medium transition-colors duration-100 ease-ui outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            multiple === mode.multiple
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  )
}
