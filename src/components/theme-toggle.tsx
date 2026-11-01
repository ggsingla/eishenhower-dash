import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

const CYCLE = [
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "light", label: "Light", icon: SunIcon },
  { value: "system", label: "System", icon: MonitorIcon },
] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const index = Math.max(
    0,
    CYCLE.findIndex((option) => option.value === theme),
  )
  const current = CYCLE[index]
  const next = CYCLE[(index + 1) % CYCLE.length]

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Theme: ${current.label}. Switch to ${next.label}`}
      title={`Theme: ${current.label}`}
      onClick={() => setTheme(next.value)}
    >
      <current.icon />
    </Button>
  )
}
