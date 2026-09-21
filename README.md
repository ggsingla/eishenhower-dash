# Eisenhower Dash

A local-first Eisenhower board, built to feel like Linear: dense, fast, and fully
keyboard-driven. Four working columns — **Do**, **Delegate**, **Hold**,
**Eliminate** — plus **Completed**, which sits collapsed in a rail on the right
because it's the column you shouldn't have to look at. Everything persists to
`localStorage`: no account, no server, no sync step.

## Stack

- **Vite 8** + **React 19** + **TypeScript**
- **Tailwind CSS v4** (`@tailwindcss/vite`, CSS-first config in `src/index.css`)
- **shadcn/ui** (`radix-nova` style) on Radix primitives
- **@dnd-kit** for drag and drop between and within columns
- **cmdk** (via shadcn's `command`) for the ⌘K palette
- **Zustand** (+ `persist`) for board and view state
- **next-themes** for light / dark / system, **sonner** for undo toasts

## Scripts

```bash
pnpm dev       # dev server
pnpm build     # typecheck + production build
pnpm preview   # serve the production build
pnpm lint      # oxlint
pnpm smoke     # headless run: mounts the app in jsdom and drives the keyboard
```

`pnpm smoke` is the guard that a typecheck and a build can't be: it mounts the
real board, fires real key events, and fails on any React render error. It is
what catches missing-context crashes and dead event handlers.

## How it works

| Path | Role |
| --- | --- |
| `src/lib/types.ts` | `Task` and `QuadrantId` — the whole data model |
| `src/lib/quadrants.ts` | Column metadata: labels, Eisenhower rules, accents, icons, cursor order |
| `src/lib/task-actions.ts` | Mutations with UI consequences (toasts, undo, cursor clamping) — shared by pointer and keyboard |
| `src/store/board-store.ts` | Board data, persisted under `eisenhower-dash:board` |
| `src/store/ui-store.ts` | Cursor, overlays, and the Completed rail state; only the rail preference persists |
| `src/hooks/use-board-shortcuts.ts` | The whole keyboard model, bound once to `window` |
| `src/components/command-palette.tsx` | cmdk palette — root mode plus two sub-modes: "move to" (`S`) and "new task in" |
| `src/components/board/completed-rail.tsx` | The collapsible Completed rail |

State is stored as `tasks: Record<id, Task>` alongside `columns: Record<QuadrantId, string[]>`.
The id arrays carry the ordering, which is what `@dnd-kit/sortable` operates on.

The keyboard cursor is **positional** (`{ column, index }`) rather than an id, so it
survives reordering and deletion without dangling. Pointer and keyboard paths both
funnel through `src/lib/task-actions.ts`, so the two can't drift.

Focus follows the mouse, as in Linear: moving the pointer over a card puts the
cursor on it, so `E`, `S`, `Space`, `⌘⌫` and `⌘K` act on whatever you're hovering
without a click, and leaving the card takes the highlight with it. The cursor
remembers what placed it: hover focus is transient, a click or a drop sticks, and
only keyboard moves scroll the card into view.

Drag and drop previews cross-column moves in the board's local state and commits
one store write on drop, so `localStorage` is never touched mid-drag. Collision
detection is pointer-first (whatever is under the pointer wins, a bare column
resolves to its nearest card) rather than closest-corners, which flickered at
column edges.

Every task carries a sequential `number` (`#12`), assigned on creation and never
reused; boards saved before it existed are numbered in creation order on load.

## Bundle

The board ships as five cacheable eager chunks (~432 kB, ~139 kB gzipped) plus
nine lazy ones. Every overlay — command palette, task editor, cheatsheet, clear
confirmation — and `sonner` load on demand, and the two hot ones are warmed on
idle so `⌘K` and `C` still feel instant. React itself is ~51% of the eager
payload and is the floor for this stack.

Vendor groups live in `vite.config.ts`. Radix is deliberately *not* grouped: one
radix chunk would pull the dialog primitives onto the critical path and undo the
lazy overlays.

## Keyboard

Shortcuts follow Linear's letters wherever an equivalent exists. Press `?` in the
app for the same list.

| | |
| --- | --- |
| `C` | New task |
| `⌘K` | Command palette |
| `?` | Shortcut cheatsheet |
| `Esc` | Close overlay / clear focus |
| `↑` `↓` | Previous / next card |
| `←` `→` | Previous / next column |
| `↵` or `E` | Edit focused card (double-click does the same) |
| `S` | Move focused card to a column |
| `Space` | Toggle complete |
| `⌘⌫` | Delete focused card |
| `⇧↑` `⇧↓` | Reorder within column |
| `⇧←` `⇧→` | Move to adjacent column |
| `⇧C` | Show / hide Completed |

Hovering a card focuses it, so every shortcut above also works on whatever is
under the mouse. Navigating right past **Eliminate** reveals the Completed rail
rather than dead-ending, and dragging a card at the rail opens it mid-drag.

## Using it

- **Add** — `+` on a column header opens an inline composer that stays open after
  `↵` so you can dump a list; `C` opens the full dialog (notes, tags, column).
  From `⌘K`, *New task…* asks for the column first, then opens the dialog with
  that column already selected. `⌫` on an empty query steps back to the root list.
- **Open** — double-click a card, or `↵` / `E` on the focused one. The editor's
  column is a property pill; `⌘↵` saves from any field.
- **Move** — drag a card, `⇧←`/`⇧→`, `S`, or the card menu.
- **Complete** — the circle on a card, or `Space`. Reopening sends it back to the
  column it was completed from.
- **Delete** — `⌘⌫` or the card menu, with an undo toast. *Clear column* wipes a
  whole column behind a confirmation, also undoable.
