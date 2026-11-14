---
name: bars-menus-scroll
description: "HIG rules for the functional layer of an Apple-platform mockup — tab bars (navigation only, search tab), sidebars (adaptable style, icon colors, two levels), toolbars (Liquid Glass, no manual overflow, one prominent action), menus (item icons), scroll edge effects and visionOS Look to Scroll."
when-to-use: "Placing or reviewing a tab bar, sidebar, toolbar, menu or scroll view in any Apple-platform mockup or handoff spec."
keywords: tab-bars, sidebars, toolbars, menus, scroll-views, scroll-edge-effect, look-to-scroll, search-tab, liquid-glass
priority: high
related: ../SKILL.md, liquid-glass.md, macos.md, ipados-iphone-duo.md
---

# Bars, Menus, Scroll Views

Read 2026-11-13 from the HIG JSON endpoints. `/slug` =
`https://developer.apple.com/design/human-interface-guidelines/<slug>`; the date after
each heading is that page's latest change-log entry.

## Tab bars — /tab-bars (2026-06-08, terminology and art)
- **Navigation, not actions**: actions on the current view go in a toolbar.
- Keep it visible across sections (a modal may cover it); avoid overflow (the trailing
  tab becomes **More** on iOS/iPadOS); never disable or hide a tab — explain an empty
  section instead.
- Labels: single words where possible; SF Symbols, **filled** preferred; icons above
  labels in compact, side by side in regular. Badges only for critical information.
- On colorful content, prefer a monochromatic tab bar or a well-differentiated accent.
- iOS: floats at the bottom on Liquid Glass; can **minimize** with an attached accessory
  (Music MiniPlayer) on scroll; can hold a **dedicated search tab at the trailing end**.
- iPadOS: near the top, fixed or convertible to a sidebar; default customizable list of
  five or fewer. Not on watchOS.
- Search as a tab — /search-fields (2026-06-08): two styles, a standard tab that opens a
  search landing page, or a separate button that focuses the field and shows the keyboard.

## Sidebars — /sidebars (2026-06-08, icon colors + adaptable style)
- **No more than two levels**; deeper → split view with a content list. Title groups
  with short labels.
- **Adaptable style** (iOS/iPadOS `sidebarAdaptable`): you choose sidebar or tab bar at
  launch; both include a switch button; adapts to rotation and window width. Consider a
  tab bar first.
- **Icon colors**: accent color by default; on macOS they must follow the user's system
  accent; fixed colors only sparingly for meaning (Mail VIP yellow).
- Extend rich content beneath the floating sidebar (horizontal scroll or background
  extension effect); let people hide it, never hidden by default.

## Toolbars — /toolbars (2025-12-16, Liquid Glass)
- Choose items deliberately; define which items overflow as width shrinks. The system adds
  the overflow menu on macOS/iPadOS — **don't add one manually**, and avoid layouts that
  overflow by default. A More menu only if really needed.
- **Reduce toolbar backgrounds and tinted controls**; let the content layer inform the
  color, use a scroll edge effect to separate bar from content. Monochrome default over
  colorful content.
- Standard components have radii **concentric** with the bar; custom ones must match.
- Titles under 15 characters, never the app name; standard Back/Close symbols, no "Back"
  text; system symbols without borders.
- **One** `.prominent` primary action (Done, Submit), on the trailing side.

## Menus — /menus (2026-06-08, menu item icons)
- Icons **sparingly and with purpose**: common actions, key features, locations, devices,
  visual concepts, user content; none if no icon clearly fits.
- Standard icons for common actions (Share, Print, Search); **all items in a group get an
  icon, or none**.
- iOS/iPadOS small layout (4 symbol-only items on top) for closely related actions;
  medium (3 items, symbol + short label) for three frequent actions.

## Scroll edge effects — /scroll-views (2026-06-08)
- iOS, iPadOS, macOS: separates floating elements (toolbars) from scrolling content.
  Prefer the **automatic** style (more opaque behind dense top toolbars, text outside
  glass controls, pinned headers); **soft** requires legibility testing; **hard** is the
  other manual style.
- Only behind floating UI — not decorative, it doesn't darken like an overlay. One per
  view; in iPad/Mac split views each pane may have one, kept the same height.

## Look to Scroll (visionOS) — /scroll-views (2026-03-24)
- Scrolling by looking near the scroll view's edge; opt-in per scroll view.
- Support it in reading and browsing views; not in dense or control-heavy views; be
  consistent across similar views; prefer full-width/height scroll areas or clear
  boundaries; remove scroll-position effects (parallax) first. Mark which views support it
  in the spec.
