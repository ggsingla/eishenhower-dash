interface NotifyOptions {
  description?: string
  action?: { label: string; onClick: () => void }
}

/**
 * Toasts load sonner on demand, keeping it out of the initial chunk. The
 * Toaster itself is mounted lazily at app start, so it is always listening by
 * the time a user action can fire one of these.
 */
async function emit(kind: "message" | "success", title: string, options?: NotifyOptions) {
  const { toast } = await import("sonner")
  if (kind === "success") toast.success(title, options)
  else toast(title, options)
}

export const notify = {
  message: (title: string, options?: NotifyOptions) => void emit("message", title, options),
  success: (title: string, options?: NotifyOptions) => void emit("success", title, options),
}
