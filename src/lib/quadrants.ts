import {
  BanIcon,
  CircleCheckIcon,
  TimerIcon,
  UsersIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react"
import type { QuadrantId } from "@/lib/types"

export interface QuadrantMeta {
  id: QuadrantId
  label: string
  /** The Eisenhower rule that puts a task in this column. */
  hint: string
  icon: LucideIcon
  /** Solid accent — the status dot and the card's focus edge. */
  dot: string
  /** Accent as text. */
  text: string
  /** Accent as a border, for the card's status control. */
  border: string
  /** Accent as a hairline ring, used while a drag hovers the column. */
  ring: string
}

export const QUADRANTS: QuadrantMeta[] = [
  {
    id: "do",
    label: "Do",
    hint: "Urgent & important",
    icon: ZapIcon,
    dot: "bg-quadrant-do",
    text: "text-quadrant-do",
    border: "border-quadrant-do",
    ring: "ring-quadrant-do/50",
  },
  {
    id: "delegate",
    label: "Delegate",
    hint: "Urgent, not important",
    icon: UsersIcon,
    dot: "bg-quadrant-delegate",
    text: "text-quadrant-delegate",
    border: "border-quadrant-delegate",
    ring: "ring-quadrant-delegate/50",
  },
  {
    id: "hold",
    label: "Hold",
    hint: "Important, not urgent",
    icon: TimerIcon,
    dot: "bg-quadrant-hold",
    text: "text-quadrant-hold",
    border: "border-quadrant-hold",
    ring: "ring-quadrant-hold/50",
  },
  {
    id: "eliminate",
    label: "Eliminate",
    hint: "Neither urgent nor important",
    icon: BanIcon,
    dot: "bg-quadrant-eliminate",
    text: "text-quadrant-eliminate",
    border: "border-quadrant-eliminate",
    ring: "ring-quadrant-eliminate/50",
  },
  {
    id: "completed",
    label: "Completed",
    hint: "Done — kept around in case you need to look back",
    icon: CircleCheckIcon,
    dot: "bg-quadrant-completed",
    text: "text-quadrant-completed",
    border: "border-quadrant-completed",
    ring: "ring-quadrant-completed/50",
  },
]

/** The four columns you actually work in; Completed lives in its own rail. */
export const WORKING_QUADRANTS = QUADRANTS.filter((quadrant) => quadrant.id !== "completed")

export const QUADRANT_BY_ID = Object.fromEntries(
  QUADRANTS.map((quadrant) => [quadrant.id, quadrant])
) as Record<QuadrantId, QuadrantMeta>

/** Left-to-right order the keyboard cursor walks. */
export const COLUMN_ORDER: QuadrantId[] = QUADRANTS.map((quadrant) => quadrant.id)
