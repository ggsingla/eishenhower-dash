import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { columnOf, insertAt, withoutId, type Columns } from "@/lib/columns"
import { WORKING_QUADRANTS } from "@/lib/quadrants"
import { isQuadrantId, type QuadrantId, type Task } from "@/lib/types"
import { useBoardShortcuts } from "@/hooks/use-board-shortcuts"
import { useBoardStore } from "@/store/board-store"
import { useUiStore } from "@/store/ui-store"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppHeader } from "@/components/app-header"
import { Overlays } from "@/components/overlays"
import { BoardColumn } from "@/components/board/board-column"
import { CompletedRail } from "@/components/board/completed-rail"
import { TaskCard } from "@/components/board/task-card"

export function Board() {
  const tasks = useBoardStore((state) => state.tasks)
  const columns = useBoardStore((state) => state.columns)
  const cursor = useUiStore((state) => state.cursor)

  const [activeId, setActiveId] = useState<string | null>(null)

  // A cross-column drag previews here and commits to the store once, on drop.
  // Writing through on every crossing cost a localStorage serialise and a full
  // board render for each card the pointer passed — the main source of jank.
  const [preview, setPreview] = useState<Columns | null>(null)
  const previewRef = useRef<Columns | null>(null)
  const lastOverId = useRef<UniqueIdentifier | null>(null)
  const justCrossed = useRef(false)

  useBoardShortcuts()

  // Pointer only: keyboard movement goes through the cursor model (⇧ + arrows),
  // which would otherwise collide with dnd-kit's Space/Enter drag activation.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const shown = preview ?? columns

  const byColumn = useMemo(() => {
    const entries = Object.entries(shown) as [QuadrantId, string[]][]
    return Object.fromEntries(
      entries.map(([column, ids]) => [
        column,
        ids.flatMap((id) => {
          const task = tasks[id]
          if (!task) return []
          // While previewed in another column the card already wears its accent.
          return [task.quadrant === column ? task : { ...task, quadrant: column }]
        }),
      ])
    ) as Record<QuadrantId, Task[]>
  }, [shown, tasks])

  // Right after a crossing the layout shifts under the pointer; the collision
  // fallback below leans on this flag for that one frame.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      justCrossed.current = false
    })
    return () => cancelAnimationFrame(frame)
  }, [preview])

  const activeColumn = activeId ? columnOf(shown, activeId) : undefined
  const activeTask =
    activeId && activeColumn
      ? (byColumn[activeColumn].find((task) => task.id === activeId) ?? null)
      : null

  /**
   * Pointer-first collision detection. `closestCorners` flickered at column
   * edges, where a card's corners can sit nearer the neighbouring column than
   * its own. Here whatever is under the pointer wins; a bare column resolves to
   * its nearest card; and when a layout shift leaves the pointer over nothing
   * for a frame, the last hit stands instead of snapping to `null`.
   */
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const pointerHits = pointerWithin(args)
    const hits = pointerHits.length > 0 ? pointerHits : rectIntersection(args)
    let overId = getFirstCollision(hits, "id")

    if (overId !== null) {
      const key = String(overId)
      if (isQuadrantId(key)) {
        const ids = (previewRef.current ?? useBoardStore.getState().columns)[key]
        if (ids.length > 0) {
          const inside = closestCenter({
            ...args,
            droppableContainers: args.droppableContainers.filter(
              (container) => container.id !== overId && ids.includes(String(container.id))
            ),
          })
          overId = inside[0]?.id ?? overId
        }
      }
      lastOverId.current = overId
      return [{ id: overId }]
    }

    if (justCrossed.current) lastOverId.current = args.active.id
    return lastOverId.current !== null ? [{ id: lastOverId.current }] : []
  }, [])

  function clearPreview() {
    previewRef.current = null
    setPreview(null)
  }

  function handleDragStart(event: DragStartEvent) {
    lastOverId.current = null
    setActiveId(String(event.active.id))
  }

  /** Live cross-column preview: the card follows the pointer into its new column. */
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const draggedId = String(active.id)
    const overId = String(over.id)
    const current = previewRef.current ?? useBoardStore.getState().columns
    const from = columnOf(current, draggedId)
    const to = isQuadrantId(overId) ? overId : columnOf(current, overId)
    if (!from || !to || from === to) return

    // Dragging at the rail opens it, so there's somewhere to actually drop.
    if (to === "completed") useUiStore.getState().setCompletedOpen(true)

    const target = current[to]
    const overIndex = target.indexOf(overId)

    let index = target.length
    if (overIndex >= 0) {
      const translated = active.rect.current.translated
      const below =
        translated !== null && translated.top > over.rect.top + over.rect.height / 2
      index = overIndex + (below ? 1 : 0)
    }

    const next: Columns = {
      ...current,
      [from]: withoutId(current[from], draggedId),
      [to]: insertAt(target, draggedId, index),
    }
    previewRef.current = next
    justCrossed.current = true
    setPreview(next)
  }

  function handleDragEnd(event: DragEndEvent) {
    const previewed = previewRef.current
    setActiveId(null)
    clearPreview()

    const { active, over } = event
    // Dropped on nothing: the preview is discarded and the card flies home.
    if (!over) return

    const draggedId = String(active.id)
    const overId = String(over.id)
    const board = useBoardStore.getState()
    const task = board.tasks[draggedId]
    if (!task) return

    // Resolve the final slot against the previewed layout, then commit it as a
    // single store write — one move or one reorder, never both.
    const layout = previewed ?? board.columns
    const to = columnOf(layout, draggedId) ?? task.quadrant
    const ids = layout[to]
    let index = ids.indexOf(draggedId)
    if (overId !== draggedId && !isQuadrantId(overId)) {
      const overIndex = ids.indexOf(overId)
      if (overIndex >= 0) index = overIndex
    }
    if (index < 0) index = ids.length

    if (to !== task.quadrant) {
      board.moveTask(draggedId, to, index)
    } else {
      const fromIndex = board.columns[to].indexOf(draggedId)
      if (fromIndex !== index) board.reorderTask(to, fromIndex, index)
    }
    useUiStore.getState().setCursor({ column: to, index }, "pointer")
  }

  function handleDragCancel() {
    setActiveId(null)
    clearPreview()
  }

  function focusedIndexIn(column: QuadrantId) {
    return cursor?.column === column ? cursor.index : null
  }

  return (
    <TooltipProvider delayDuration={400} skipDelayDuration={200}>
      <div className="flex h-dvh flex-col overflow-hidden">
        <AppHeader />

        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex min-h-0 flex-1 gap-2 px-2 pt-1 pb-2">
            <div className="scrollbar-subtle flex min-h-0 flex-1 gap-2 overflow-x-auto">
              {WORKING_QUADRANTS.map((meta) => (
                <BoardColumn
                  key={meta.id}
                  meta={meta}
                  tasks={byColumn[meta.id]}
                  focusedIndex={focusedIndexIn(meta.id)}
                />
              ))}
            </div>

            <CompletedRail
              tasks={byColumn.completed}
              focusedIndex={focusedIndexIn("completed")}
            />
          </div>

          <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
            {activeTask ? <TaskCard task={activeTask} dragging /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      <Overlays />
    </TooltipProvider>
  )
}
