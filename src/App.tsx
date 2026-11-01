import { useRoute } from "@/lib/route"
import { Board } from "@/components/board/board"
import { SettingsView } from "@/components/settings/settings-view"

export default function App() {
  const route = useRoute()

  return route.view === "settings" ? <SettingsView section={route.section} /> : <Board />
}
