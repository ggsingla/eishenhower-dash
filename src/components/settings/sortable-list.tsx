import type { ReactNode } from "react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVerticalIcon } from "lucide-react"
import { cn } from "cn"

interface SortableListProps {
  ids: string[]
  onReorder: (fromIndex: number, toIndex: number) => void
  children: ReactNode
}

/** A vertically reorderable list. Each context is its own, so lists can nest. */
export function SortableList({ ids, onReorder, children }: SortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return

    onReorder(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

interface SortableRowProps {
  id: string
  /** Receives the grip to place wherever the row wants it. */
  children: (grip: ReactNode) => ReactNode
  label: string
}

/** Only the grip starts a drag, so the inputs inside a row stay clickable. */
export function SortableRow({ id, label, children }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const grip = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label={`Reorder ${label}`}
      className="flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/60 transition-colors duration-100 ease-ui outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVerticalIcon className="size-3.5" />
    </button>
  )

  return (
    <div
      ref={setNodeRef}
      // Rows only travel up and down.
      style={{
        transform: CSS.Translate.toString(transform && { ...transform, x: 0 }),
        transition,
      }}
      className={cn("relative", isDragging && "z-10 opacity-80")}
    >
      {children(grip)}
    </div>
  )
}
