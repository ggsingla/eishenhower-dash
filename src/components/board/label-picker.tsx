import { ChevronDownIcon } from "lucide-react"
import { cn } from "cn"
import type { LabelType } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** The label shown on the pill: the type's name until something is picked. */
function summary(type: LabelType, value: string[]) {
  const names = value.flatMap((id) => type.options.find((option) => option.id === id)?.name ?? [])
  if (names.length === 0) return null

  return names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0]
}

interface LabelPickerProps {
  type: LabelType
  value: string[]
  /** `null` clears the type; otherwise the option picked (or toggled, for multi). */
  onPick: (optionId: string | null) => void
}

/** One pill per label type in the editor's properties row. */
export function LabelPicker({ type, value, onPick }: LabelPickerProps) {
  const chosen = summary(type, value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`${type.name}: ${chosen ?? "none"}`}
          className={cn("gap-1.5 pr-1.5", chosen ? "text-foreground" : "text-muted-foreground")}
        >
          {chosen ?? type.name}
          <ChevronDownIcon className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuLabel>{type.name}</DropdownMenuLabel>
        {type.multiple ? (
          type.options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.id}
              checked={value.includes(option.id)}
              onCheckedChange={() => onPick(option.id)}
              // Several picks in one visit: the menu stays open between ticks.
              onSelect={(event) => event.preventDefault()}
            >
              {option.name}
            </DropdownMenuCheckboxItem>
          ))
        ) : (
          <DropdownMenuRadioGroup
            value={value[0] ?? ""}
            onValueChange={(next) => onPick(next === "" ? null : next)}
          >
            <DropdownMenuRadioItem value="">None</DropdownMenuRadioItem>
            <DropdownMenuSeparator />
            {type.options.map((option) => (
              <DropdownMenuRadioItem key={option.id} value={option.id}>
                {option.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}
        {type.multiple && value.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onPick(null)}>Clear</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
