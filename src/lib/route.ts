import { useSyncExternalStore } from "react"

/**
 * The app has two places, the board and Settings, so routing is just the URL
 * hash: `#/settings/labels`. Everything goes through `window` so the same code
 * runs under the smoke test's jsdom.
 */

export const SETTINGS_SECTIONS = ["labels"] as const
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]

export type Route = { view: "board" } | { view: "settings"; section: SettingsSection }

const CHANGE_EVENT = "routechange"

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange)
  window.addEventListener("popstate", onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener("hashchange", onChange)
    window.removeEventListener("popstate", onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

function parse(hash: string): Route {
  const [root, section] = hash.replace(/^#\/?/, "").split("/")
  if (root !== "settings") return { view: "board" }

  const known = SETTINGS_SECTIONS.find((candidate) => candidate === section)
  return { view: "settings", section: known ?? SETTINGS_SECTIONS[0] }
}

/** The current route as a string, so `useSyncExternalStore` compares by value. */
function snapshot() {
  return window.location.hash
}

export function useRoute(): Route {
  return parse(useSyncExternalStore(subscribe, snapshot, () => ""))
}

export function currentRoute(): Route {
  return parse(snapshot())
}

function go(hash: string) {
  const url = hash ? `#${hash}` : window.location.pathname + window.location.search
  window.history.pushState(null, "", url)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function sectionHref(section: SettingsSection) {
  return `#/settings/${section}`
}

export function openSettings(section: SettingsSection = SETTINGS_SECTIONS[0]) {
  go(`/settings/${section}`)
}

export function openBoard() {
  go("")
}
