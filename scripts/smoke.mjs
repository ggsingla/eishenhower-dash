/**
 * Headless smoke test: mounts the real app in jsdom and drives it the way a
 * person would — keyboard first. Catches render-time crashes (missing context,
 * bad hooks) that a typecheck and a build both sail straight past.
 *
 *   pnpm smoke
 */
import { JSDOM } from "jsdom"
import { createServer } from "vite"

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
})

for (const key of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "Element",
  "Node",
  "Event",
  "KeyboardEvent",
  "MouseEvent",
  "PointerEvent",
  "DOMRect",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "localStorage",
  "matchMedia",
  "MutationObserver",
  "IntersectionObserver",
  "DOMParser",
  "CustomEvent",
  "FocusEvent",
  "InputEvent",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "HTMLButtonElement",
  "CSS",
  "scrollTo",
  "NodeFilter",
  "NodeIterator",
  "TreeWalker",
  "Range",
  "Selection",
  "DocumentFragment",
  "ShadowRoot",
  "AbortController",
  "HTMLDivElement",
  "SVGElement",
]) {
  // Always override where possible: Node ships its own Event/navigator, and
  // jsdom's dispatchEvent rejects instances that aren't its own.
  if (dom.window[key] === undefined) continue
  Object.defineProperty(globalThis, key, {
    value: dom.window[key],
    configurable: true,
    writable: true,
  })
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true
// Radix measures elements; jsdom reports zeroes but must not throw.
dom.window.Element.prototype.scrollIntoView = () => {}
dom.window.Element.prototype.hasPointerCapture = () => false
dom.window.Element.prototype.setPointerCapture = () => {}
dom.window.Element.prototype.releasePointerCapture = () => {}
if (!dom.window.matchMedia) {
  dom.window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  })
  globalThis.matchMedia = dom.window.matchMedia
}
dom.window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = dom.window.ResizeObserver
dom.window.DOMRect ??= class {
  constructor(x = 0, y = 0, width = 0, height = 0) {
    Object.assign(this, { x, y, width, height, top: y, left: x, right: x + width, bottom: y + height })
  }
}

const failures = []
const notes = []

// Surface anything a listener throws; jsdom otherwise swallows it into a log line.
dom.window.addEventListener("error", (event) => {
  failures.push(`  ✘ uncaught in listener: ${event.error?.stack ?? event.message}`)
})

function check(label, condition, detail = "") {
  if (condition) {
    notes.push(`  ✔ ${label}`)
    return true
  }
  failures.push(`  ✘ ${label}${detail ? ` — ${detail}` : ""}`)
  return false
}

// Any React render error surfaces here instead of silently blanking the page.
const consoleErrors = []
const realError = console.error
console.error = (...args) => {
  consoleErrors.push(args.map(String).join(" "))
  realError(...args)
}

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "warn",
})

let exitCode = 0
try {
  // React itself loads through Node — Vite externalises it for SSR, so the app
  // modules below resolve to this exact instance.
  const React = await import("react")
  const { act } = React
  const { createRoot } = await import("react-dom/client")
  const { Board } = await server.ssrLoadModule("/src/components/board/board.tsx")
  const { useBoardStore } = await server.ssrLoadModule("/src/store/board-store.ts")
  const { useUiStore } = await server.ssrLoadModule("/src/store/ui-store.ts")

  const container = document.getElementById("root")
  const root = createRoot(container)

  await act(async () => {
    root.render(React.createElement(Board))
  })
  check("board mounts", container.textContent.includes("Do"), container.innerHTML.slice(0, 200))

  // Seed two tasks through the store, the same call the composer makes. New
  // tasks land on top, so Do reads [Second smoke task, Smoke task].
  await act(async () => {
    useBoardStore.getState().addTask({ title: "Smoke task", notes: "", tags: ["x"] }, "do")
    useBoardStore.getState().addTask({ title: "Second smoke task", notes: "", tags: [] }, "do")
  })
  check("task renders", container.textContent.includes("Smoke task"))
  const [secondId, smokeId] = useBoardStore.getState().columns.do
  check(
    "tasks are numbered in creation order",
    useBoardStore.getState().tasks[smokeId].number === 1 &&
      useBoardStore.getState().tasks[secondId].number === 2 &&
      container.textContent.includes("#1"),
    JSON.stringify(Object.values(useBoardStore.getState().tasks).map((task) => task.number))
  )

  /** Overlays are lazy chunks; poll until the content shows up or we give up. */
  async function settle(predicate) {
    for (let i = 0; i < 100; i++) {
      if (predicate && predicate()) return true
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })
    }
    return predicate ? predicate() : true
  }

  const bodyHas = (text) => () => document.body.textContent.includes(text)

  function press(key, init = {}) {
    return act(async () => {
      window.dispatchEvent(
        new dom.window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init })
      )
    })
  }

  await press("ArrowDown")
  check(
    "arrow seeds the cursor",
    useUiStore.getState().cursor?.column === "do",
    JSON.stringify(useUiStore.getState().cursor)
  )

  // Focus follows the mouse: a pointer move over a card is enough to target it.
  await act(async () => useUiStore.getState().setCursor(null))
  const hovered = [...container.querySelectorAll("[data-focused]")].find(
    (node) => node.textContent.includes("Smoke task") && !node.textContent.includes("Second")
  )
  await act(async () => {
    hovered?.dispatchEvent(new dom.window.MouseEvent("pointermove", { bubbles: true }))
  })
  check(
    "hovering a card focuses it",
    useUiStore.getState().cursor?.column === "do" && useUiStore.getState().cursor?.index === 1,
    JSON.stringify(useUiStore.getState().cursor)
  )

  // …and only while the pointer is there. React derives onPointerLeave from pointerout.
  await act(async () => {
    hovered?.dispatchEvent(
      new dom.window.MouseEvent("pointerout", { bubbles: true, relatedTarget: document.body })
    )
  })
  check(
    "leaving a hovered card clears the focus",
    useUiStore.getState().cursor === null,
    JSON.stringify(useUiStore.getState().cursor)
  )

  // A keyboard-placed cursor is sticky: the mouse passing over that same card
  // (index 0 after the arrow seeds it) neither re-sources nor clears it.
  await press("ArrowDown")
  const seeded = [...container.querySelectorAll("[data-focused]")].find((node) =>
    node.textContent.includes("Second smoke task")
  )
  await act(async () => {
    seeded?.dispatchEvent(new dom.window.MouseEvent("pointermove", { bubbles: true }))
    seeded?.dispatchEvent(
      new dom.window.MouseEvent("pointerout", { bubbles: true, relatedTarget: document.body })
    )
  })
  check(
    "keyboard focus survives a mouse pass",
    useUiStore.getState().cursor?.index === 0 && useUiStore.getState().cursorSource === "keyboard",
    JSON.stringify(useUiStore.getState())
  )

  // Undo of a completion restores the original slot, not the top of the column.
  const { toggleComplete } = await server.ssrLoadModule("/src/lib/task-actions.ts")
  let undo
  await act(async () => {
    undo = toggleComplete(useBoardStore.getState().tasks[smokeId])
  })
  check(
    "completing moves the task out of its column",
    !useBoardStore.getState().columns.do.includes(smokeId)
  )
  await act(async () => undo?.())
  check(
    "undo restores the original position",
    useBoardStore.getState().columns.do.indexOf(smokeId) === 1,
    JSON.stringify(useBoardStore.getState().columns.do)
  )

  await press("k", { metaKey: true })
  check("⌘K opens the palette", useUiStore.getState().paletteOpen)
  check(
    "palette renders its items",
    await settle(bodyHas("New task…")),
    "palette body missing command items"
  )

  // Create is a two-step flow: one root item, then a column picker.
  await act(async () => useUiStore.getState().openPalette("create"))
  check(
    "create mode lists the working columns",
    await settle(bodyHas("New task in")) &&
      ["Do", "Delegate", "Hold", "Eliminate"].every((label) =>
        document.body.textContent.includes(label)
      ),
    "create mode missing column items"
  )

  await act(async () => useUiStore.getState().setPaletteOpen(false))

  await press("c")
  check("C opens the editor", useUiStore.getState().editorOpen)
  check("editor renders", await settle(bodyHas("New task")))
  await act(async () => useUiStore.getState().setEditorOpen(false))

  await press("?")
  check("? opens the cheatsheet", useUiStore.getState().shortcutsOpen)
  check("cheatsheet renders", await settle(bodyHas("Keyboard shortcuts")))
  await act(async () => useUiStore.getState().setShortcutsOpen(false))

  await press("s")
  check("S opens move mode", useUiStore.getState().paletteMode === "move")
  check("move mode lists targets", await settle(bodyHas("Delegate")))
  await act(async () => useUiStore.getState().setPaletteOpen(false))

  await press(" ")
  check(
    "Space completes the focused task",
    useBoardStore.getState().columns.completed.length === 1,
    JSON.stringify(useBoardStore.getState().columns)
  )

  await press("C", { shiftKey: true })
  check("⇧C toggles the Completed rail", useUiStore.getState().completedOpen === true)

  const completedId = useBoardStore.getState().columns.completed[0]
  await act(async () => {
    useUiStore.getState().setCursor({ column: "completed", index: 0 })
  })
  await press("Backspace", { metaKey: true })
  check(
    "⌘⌫ deletes the focused task",
    useBoardStore.getState().tasks[completedId] === undefined
  )

  await act(async () => root.unmount())

  const renderErrors = consoleErrors.filter(
    (line) => !/not wrapped in act|useLayoutEffect does nothing on the server/i.test(line)
  )
  check("no React errors logged", renderErrors.length === 0, renderErrors[0]?.slice(0, 300))
} catch (error) {
  failures.push(`  ✘ threw: ${error?.stack ?? error}`)
} finally {
  await server.close()
}

console.error = realError
console.log(notes.join("\n"))
if (failures.length > 0) {
  console.log("\nFAILURES:")
  console.log(failures.join("\n"))
  exitCode = 1
} else {
  console.log("\nall smoke checks passed")
}
process.exit(exitCode)
