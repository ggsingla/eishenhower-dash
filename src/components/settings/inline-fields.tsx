import { useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { cn } from "cn"
import { Input } from "@/components/ui/input"

interface InlineNameInputProps {
  value: string
  /** Returns why the name was refused, or null once it is saved. */
  onCommit: (name: string) => string | null
  label: string
  className?: string
}

/**
 * A name that reads as text until you reach for it. Enter saves, Esc puts the
 * old name back, and leaving the field saves only if the new name is valid.
 */
export function InlineNameInput({ value, onCommit, label, className }: InlineNameInputProps) {
  // null while the field is at rest, so it always shows the stored name. The ref
  // mirrors it so a blur fired by Enter's own save sees the draft already gone.
  const [draft, setDraftState] = useState<string | null>(null)
  const draftRef = useRef<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  function setDraft(next: string | null) {
    draftRef.current = next
    setDraftState(next)
  }

  function reset() {
    setDraft(null)
    setError(null)
  }

  /** True when there is nothing left to save: unchanged, or saved just now. */
  function attempt() {
    const current = draftRef.current
    if (current === null || current.trim() === value) return true

    const failure = onCommit(current)
    if (failure) setError(failure)
    return failure === null
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault()
      // A refused name stays in the field for fixing; an accepted one lets go.
      if (!attempt()) return
      reset()
      input.current?.blur()
    } else if (event.key === "Escape") {
      event.preventDefault()
      reset()
      input.current?.blur()
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <Input
        ref={input}
        value={draft ?? value}
        aria-label={label}
        aria-invalid={error !== null}
        onChange={(event) => {
          setDraft(event.target.value)
          setError(null)
        }}
        onKeyDown={handleKeyDown}
        // Blurring with a refused name quietly restores the old one.
        onBlur={() => {
          attempt()
          reset()
        }}
        className={cn(
          "h-7 border-transparent bg-transparent px-1.5 hover:border-input dark:bg-transparent",
          className
        )}
      />
      {error && (
        <p role="alert" className="px-1.5 pt-0.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

interface AddInputProps {
  placeholder: string
  label: string
  /** Returns why the name was refused, or null once it is added. */
  onAdd: (name: string) => string | null
  autoFocus?: boolean
  onEmptyBlur?: () => void
  className?: string
}

/** One input that stays focused after each add, so a list can be typed in a run. */
export function AddInput({ placeholder, label, onAdd, autoFocus, onEmptyBlur, className }: AddInputProps) {
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const failure = onAdd(value)
    setError(failure)
    if (!failure) setValue("")
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col", className)}>
      <Input
        autoFocus={autoFocus}
        value={value}
        aria-label={label}
        aria-invalid={error !== null}
        placeholder={placeholder}
        onChange={(event) => {
          setValue(event.target.value)
          setError(null)
        }}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return
          event.preventDefault()
          setValue("")
          setError(null)
          event.currentTarget.blur()
        }}
        onBlur={() => value.trim() === "" && onEmptyBlur?.()}
        className="h-7"
      />
      {error && (
        <p role="alert" className="px-1.5 pt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
