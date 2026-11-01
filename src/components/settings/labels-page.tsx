import { useState } from "react"
import { PlusIcon, TagsIcon } from "lucide-react"
import { useLabelUsage } from "@/hooks/use-label-usage"
import { useSettingsStore } from "@/store/settings-store"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { AddInput } from "@/components/settings/inline-fields"
import {
  LabelConfirmDialog,
  type PendingLabelChange,
} from "@/components/settings/label-confirm-dialog"
import { LabelTypeCard } from "@/components/settings/label-type-card"
import { SortableList } from "@/components/settings/sortable-list"

export function LabelsPage() {
  const labelTypes = useSettingsStore((state) => state.labelTypes)
  const reorderLabelTypes = useSettingsStore((state) => state.reorderLabelTypes)
  const usage = useLabelUsage()
  const [pending, setPending] = useState<PendingLabelChange | null>(null)
  const [justAdded, setJustAdded] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-lg font-semibold tracking-tight">Labels</h2>
        <p className="text-sm text-muted-foreground">
          Define selectors like Client or Project. Each one shows up as a dropdown when you
          create or edit a task. Choose whether a task can pick one option or several.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {labelTypes.length === 0 ? (
          <Empty className="border py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TagsIcon />
              </EmptyMedia>
              <EmptyTitle>No label types yet</EmptyTitle>
              <EmptyDescription>
                Add one, like “Client”, then fill it with the names you want to pick from.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <SortableList
            ids={labelTypes.map((type) => type.id)}
            onReorder={reorderLabelTypes}
          >
            <div className="flex flex-col gap-3">
              {labelTypes.map((type) => (
                <LabelTypeCard
                  key={type.id}
                  type={type}
                  usage={usage}
                  autoFocusOptions={justAdded === type.id}
                  onRequestConfirm={setPending}
                />
              ))}
            </div>
          </SortableList>
        )}

        <AddLabelType onAdded={setJustAdded} />
      </div>

      <LabelConfirmDialog change={pending} onClose={() => setPending(null)} />
    </div>
  )
}

function AddLabelType({ onAdded }: { onAdded: (id: string) => void }) {
  const [adding, setAdding] = useState(false)

  if (!adding) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setAdding(true)}
        className="self-start"
        data-icon="inline-start"
      >
        <PlusIcon />
        Add label type
      </Button>
    )
  }

  return (
    <AddInput
      autoFocus
      label="New label type name"
      placeholder="Name it, like Client, then press Enter"
      onAdd={(name) => {
        const result = useSettingsStore.getState().addLabelType(name)
        if (!result.ok) return result.error

        onAdded(result.id)
        setAdding(false)
        return null
      }}
      onEmptyBlur={() => setAdding(false)}
      className="max-w-sm"
    />
  )
}
