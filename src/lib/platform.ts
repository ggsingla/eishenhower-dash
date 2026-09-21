const isApple =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform)

/** "⌘" on Apple hardware, "Ctrl" everywhere else. */
export const MOD_KEY = isApple ? "⌘" : "Ctrl"

/** Joins a chord for display: `chord("Backspace")` → "⌘⌫" / "Ctrl+⌫". */
export function chord(...keys: string[]) {
  return isApple ? [MOD_KEY, ...keys].join("") : [MOD_KEY, ...keys].join("+")
}
