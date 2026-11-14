---
name: macos
description: "macOS mockup rules from the HIG — system window frame, fixed text styles (no Dynamic Type), desktop tinting under the graphite accent, pointer styles, touch as a secondary input (2026-10-28), window layout and sidebar rules."
when-to-use: "Designing a macOS window, sidebar or toolbar mockup and its handoff spec."
keywords: macos, window, desktop-tinting, graphite, pointer, touch, sidebar, typography
priority: high
related: ../SKILL.md, type-scales-other.md, semantic-colors.md, liquid-glass.md
---

# macOS

All rules fetched 2026-10-12. A `/slug` on a line means
`https://developer.apple.com/design/human-interface-guidelines/<slug>`.

## Window frame — system-drawn
- Avoid custom window frames or controls and never imitate the system appearance; the
  mockup frames content inside a standard window (frame with window controls and toolbar
  above a body area). — /windows
- Windows are user-resizable: the mockup canvas is a convenience, not a spec size; say so
  in the handoff.
- Don't put controls or critical information at the bottom of a window (people drag
  windows below the screen edge); keep content clear of the camera housing at the top
  edge. — /layout (macOS)

## Typography — no Dynamic Type
macOS doesn't support Dynamic Type. Use the fixed built-in text styles (Body 13 pt …
Large Title 26 pt, full table in `type-scales-other.md`) and, inside standard controls,
the dynamic system font variants (control content, menu, tool tips, …). — /typography

## Desktop tinting — only under the graphite accent
When people choose the **graphite** accent color, macOS tints window backgrounds with the
desktop picture. Add transparency only to custom components that have a visible background
or bezel, and only in a neutral (non-colored) state — colored states stay opaque so their
color doesn't drift. Show it in the mockup as a variant, not as the default. — /dark-mode

## Color and materials
- Use macOS dynamic system colors (`semantic-colors.md`) and vibrant colors on materials;
  choose materials by purpose, not by the color they appear to give. — /materials
- Sidebar icons use the accent color by default and must follow the accent the user picks;
  fixed colors only sparingly to carry meaning (e.g. Mail's yellow VIP). — /sidebars

## Pointer first
- macOS communicates interactivity through **standard pointer styles** and shows a
  **tooltip** after hovering a button; secondary click reveals context menus.
  — /pointing-devices, /buttons
- The highlight / lift / hover *content effects* are **iPadOS** pointer effects, not
  macOS — don't spec them for a Mac window. A custom hover visual is a project choice,
  labeled as such.
- Default control size 28×28 pt, minimum 20×20 pt (`touch-targets.md`).

## Touch on Mac — secondary input (HIG change 2026-10-28, read 2026-11-13)
Sources: /designing-for-macos, /gestures (macOS), /pointing-devices ("Touch support for
hidden controls") — all three carry the 2026-10-28 change-log entry.
- "In macOS, touch is secondary to keyboard and pointing device input." On a Mac with a
  touch display, people "tend to use touch for brief, intentional interactions rather
  than sustained work." The mockup stays a pointer-and-keyboard layout. — /gestures,
  /designing-for-macos
- **Same layout, same control size** when touch is supported; "Make tap targets bigger,
  not the controls themselves" (the hit area may extend past the visual bounds). Standard
  controls get an optimal tap target automatically. The HIG states **no numeric Mac tap
  target** — write the hit-area size in the spec as a project token. — /gestures
- **Expandable controls**: small or dense controls may show a temporary touch-sized
  variant on tap (steppers, sliders, dials do it automatically). Show it as a state, not
  as the default. — /gestures
- **Touch never the only way in**; conversely give touch equivalents for pointer-only
  actions (shift-drag, hover menus). — /gestures
- **Hover-revealed controls**: decide which need touch (essential ones only — not
  tooltips, not what a swipe already covers); a tap on their general location reveals
  only the relevant ones, which hide again after use or a few seconds; keep the current
  selection; put essential hidden controls in a context menu (touch and hold). Never keep
  them visible permanently just for touch. Exceptions to the auto-hide: **sidebar** — a
  tap on a header or row performs the same action as a click (expand/collapse, select)
  and reveals only that item's controls, which stay visible until touch moves outside
  the sidebar or a pointing device is used again; a tap on a hidden control's area
  reveals it without activating it (it acts on the next tap). **Tabbed window** — a tap
  anywhere shows the selected tab's close button until the pointer is used again. Spec
  each as a "touch-revealed" state. — /pointing-devices

## Sidebars (also iPadOS) — /sidebars
- Show **no more than two levels** of hierarchy. Deeper data → a **split view with a
  content list between the sidebar and the detail view**, not a third disclosure level.
- With two levels, title each group with a short descriptive label.
- Let people hide the sidebar (View menu Show/Hide Sidebar or a button); don't hide it by
  default. Sidebars float in the Liquid Glass layer; content can extend beneath them.
- macOS sidebar row height, text and glyph size follow the small/medium/large sidebar
  size people pick in General settings — state which size the mockup shows; no critical actions
  at the bottom of a sidebar. (Read 2026-11-13; page change 2026-06-08.)
