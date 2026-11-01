import { useState, type FormEvent, type KeyboardEvent } from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "cn"
import { QUADRANTS, QUADRANT_BY_ID } from "@/lib/quadrants"
import { isQuadrantId, type QuadrantId, type Task, type TaskDraft } from "@/lib/types"
import { withPick } from "@/lib/labels"
import { useBoardStore } from "@/store/board-store"
import { useSettingsStore } from "@/store/settings-store"
import { useUiStore } from "@/store/ui-store"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LabelPicker } from "@/components/board/label-picker"
import { TagEditor } from "@/components/board/tag-editor"

/** Create / edit dialog. Reads its subject straight off the UI store. */
export function TaskEditor() {
  const open = useUiStore((state) => state.editorOpen)
  const setOpen = useUiStore((state) => state.setEditorOpen)
  const taskId = useUiStore((state) => state.editorTaskId)
  const quadrant = useUiStore((state) => state.editorQuadrant)
  const task = useBoardStore((state) => (taskId ? state.tasks[taskId] : undefined))

  function handleSubmit(draft: TaskDraft, target: QuadrantId) {
    const board = useBoardStore.getState()
    setOpen(false)

    if (task) {
      board.updateTask(task.id, draft)
      if (target !== task.quadrant) board.moveTask(task.id, target)
      return
    }

    board.addTask(draft, target)
    if (target === "completed") useUiStore.getState().setCompletedOpen(true)
    // New tasks land at the top of their column — follow them with the cursor.
    useUiStore.getState().setCursor({ column: target, index: 0 })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? `Edit #${task.number}` : "New task"}</DialogTitle>
          <DialogDescription>
            {task
              ? "Change the details or move it to another column."
              : "Give it a name, then decide where it belongs."}
          </DialogDescription>
        </DialogHeader>

        {/* Keyed so the form remounts with fresh state whenever the subject changes. */}
        <TaskForm
          key={`${task?.id ?? "new"}:${quadrant}`}
          task={task}
          quadrant={quadrant}
          onCancel={() => setOpen(false)}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}

interface TaskFormProps {
  task?: Task
  quadrant: QuadrantId
  onCancel: () => void
  onSubmit: (draft: TaskDraft, quadrant: QuadrantId) => void
}

function TaskForm({ task, quadrant, onCancel, onSubmit }: TaskFormProps) {
  const [draft, setDraft] = useState<TaskDraft>(() =>
    task
      ? { title: task.title, notes: task.notes, tags: task.tags, labels: task.labels }
      : { title: "", notes: "", tags: [], labels: {} }
  )
  const labelTypes = useSettingsStore((state) => state.labelTypes)
  const [target, setTarget] = useState<QuadrantId>(task?.quadrant ?? quadrant)
  const canSubmit = draft.title.trim() !== ""

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    onSubmit(draft, target)
  }

  /** ⌘↵ submits from any field, so notes don't need a trip to the button. */
  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && canSubmit) {
      event.preventDefault()
      onSubmit(draft, target)
    }
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="task-title">Title</Label>
        <Input
          id="task-title"
          autoFocus
          value={draft.title}
          placeholder="Ship the quarterly report"
          onChange={(event) =>
            setDraft((current) => ({ ...current, title: event.target.value }))
          }
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="task-notes">Notes</Label>
        <Textarea
          id="task-notes"
          rows={3}
          value={draft.notes}
          placeholder="Context, links, next step…"
          onChange={(event) =>
            setDraft((current) => ({ ...current, notes: event.target.value }))
          }
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="task-tags">Tags</Label>
        <TagEditor
          id="task-tags"
          value={draft.tags}
          onChange={(tags) => setDraft((current) => ({ ...current, tags }))}
        />
      </div>

      {/* Properties row: one pill per property, the way Linear's composer does status. */}
      <div className="flex flex-wrap items-center gap-2">
        <ColumnPicker value={target} onChange={setTarget} />
        {/* A type with no options has nothing to pick, so it stays out of the way. */}
        {labelTypes
          .filter((type) => type.options.length > 0)
          .map((type) => (
            <LabelPicker
              key={type.id}
              type={type}
              value={draft.labels[type.id] ?? []}
              onPick={(optionId) =>
                setDraft((current) => ({
                  ...current,
                  labels: withPick(current.labels, type, optionId),
                }))
              }
            />
          ))}
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!canSubmit}>
          {task ? "Save changes" : "Add task"}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** A property pill: shows the chosen column, opens a menu of all five on click. */
function ColumnPicker({
  value,
  onChange,
}: {
  value: QuadrantId
  onChange: (column: QuadrantId) => void
}) {
  const meta = QUADRANT_BY_ID[value]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Column: ${meta.label}`}
          className="gap-1.5 pr-1.5 text-foreground"
        >
          <span className={cn("size-2 shrink-0 rounded-full", meta.dot)} />
          {meta.label}
          <ChevronDownIcon className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-72">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => isQuadrantId(next) && onChange(next)}
        >
          {QUADRANTS.map((option) => (
            <DropdownMenuRadioItem key={option.id} value={option.id}>
              <span className={cn("size-2 shrink-0 rounded-full", option.dot)} />
              {option.label}
              <span className="ml-auto truncate text-xs text-muted-foreground">
                {option.hint}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
