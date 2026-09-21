import { Component, type ErrorInfo, type ReactNode } from "react"
import { Button } from "@/components/ui/button"

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * A render error used to blank the page with nothing but a console trace. Now it
 * shows what broke and leaves the persisted board untouched.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Eisenhower Dash crashed:", error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex h-dvh items-center justify-center p-6">
        <div className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-border bg-card p-5">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-heading text-base font-semibold">Something broke</h1>
            <p className="text-sm text-muted-foreground">
              Your tasks are safe in local storage — reloading will not lose them.
            </p>
          </div>

          <pre className="scrollbar-subtle max-h-40 overflow-auto rounded-md bg-muted p-2.5 text-xs whitespace-pre-wrap text-muted-foreground">
            {error.message}
          </pre>

          <Button size="sm" className="self-start" onClick={() => location.reload()}>
            Reload
          </Button>
        </div>
      </div>
    )
  }
}
