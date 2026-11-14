---
name: touch-input
description: Touch on Mac (Mac with a touch display, Sidecar iPad) - HIG guidance and the AppKit gesture recognizer APIs to support it
when-to-use: supporting touch on macOS 27, migrating mouse tracking loops, sizing tap targets, revealing hover-only controls
keywords: touch display, Sidecar, NSGestureRecognizer, NSClickGestureRecognizer, touchCapabilities, allowedTouchTypes, hidden controls, hover
priority: high
related: app-structure.md, appkit-integration.md
---

# Touch on Mac

Sources (read 2026-11-13): HIG designing-for-macos (alert 2026-10-28), gestures (2026-10-28), pointing-devices (2026-10-28) at `developer.apple.com/design/human-interface-guidelines/<slug>`; AppKit articles `appkit/adopting-gesture-recognizers-in-your-app` and `appkit/handling-appkit-gestures` on `developer.apple.com/documentation/`.

## HIG rules

- Touch is **secondary** to keyboard and pointing device. People use it for "brief, intentional interactions" (reach forward to a stationary Mac). Keep the interface stable and predictable whatever the input.
- Keep control size and density as is (optimized for keyboard and pointer). Enlarge the **tap target** beyond the visual bounds instead; standard framework controls already do. For small or dense controls, show a temporary touch-sized variant while touched and keep it briefly after release (system steppers, sliders, dials do this).
- Every function stays reachable by keyboard and pointer; add touch equivalents for pointer-only actions (modifier-drag, hover menus).
- Preserve existing iPhone/iPad/trackpad gestures; test for conflicts with macOS system gestures. Support direct and indirect touch; use modifier keys where a gesture must work for all touch inputs.

| Action | Trackpad | Touch display |
|---|---|---|
| Select | Primary click | Tap |
| Open | Double click | Double tap |
| Scroll | Two fingers | One finger |
| Zoom / Rotate | Pinch / two-finger rotate | Pinch / two-finger rotate |
| Context menu | Secondary click | Touch and hold |
| Drag | Click and drag | Touch and hold, then drag |

### Hidden controls (pointing-devices > Touch support for hidden controls)

- Controls shown only on hover need a touch path; reserve it for **essential** controls (not tooltips, not what scroll/swipe already offers). Do not keep them permanently visible.
- Reveal only controls for the touched content; hide again when done or after a few seconds. Sidebars and the tab close button are exceptions: keep visible until touch leaves the sidebar or the pointer is used again; after closing the selected tab by touch, show the close button on the new selected tab.
- A tap on a hidden control's area reveals it without activating; it acts on the next tap. Keep the current selection through both taps.
- Offer a short context menu (touch and hold) as the dependable route.

## AppKit APIs (read on developer.apple.com JSON, 2026-11-13)

| API | Availability | Use |
|---|---|---|
| `NSClickGestureRecognizer`, `NSPressGestureRecognizer`, `NSPanGestureRecognizer`, `NSMagnificationGestureRecognizer`, `NSRotationGestureRecognizer` | macOS 10.10 | Standard recognizers: one model for mouse, trackpad, touch. Prefer them over custom ones |
| `NSGestureRecognizer.allowedTouchTypes` (`NSTouch.TouchTypeMask`, e.g. `.direct`) | macOS 10.12.2 | Restrict a recognizer to direct touch; for a touch-only pan also set `buttonMask = 0` |
| `NSScreen.touchCapabilities` (`NSScreen.TouchCapabilities`, `.multiTouch`) | macOS 27.0 | Detect a touch screen only to offer a touch-specific option (e.g. signature capture); otherwise write input-agnostic code |
| `NSEvent.isTouchSwipeNavigationEnabled` | macOS 27.0 | Check before page-navigation swipes (user can disable in System Settings); AppKit does not translate swipes for you |
| `NSView.exclusiveGestureBehavior` (`.inherit` default, `.exclusive`, `.notExclusive`) | macOS 27.0 | Only one view's recognizers are active at a time by default; Info.plist `NSViewGestureRecognizerIsExclusive` (YES when the key is absent; Xcode writes NO into new macOS app projects, so new apps are not exclusive unless changed) sets it app-wide |
| `NSWindow.disablesDirectTouchSystemGestures` | **macOS 27.3 (beta in Apple's docs on 2026-11-13; above the 27.2 target)** | Let a window claim 3+ simultaneous touches before system Multi-Touch gestures; use sparingly |
| Info.plist `NSIsTouchNative` (macOS 27.0) | | Only for apps embedding a non-AppKit input stack with its own touch pipeline; skips AppKit's mouse-emulation recognizers |
| `NSGestureRecognizerDelegate` `gestureRecognizer(_:shouldReceive:)` (touch) / `gestureRecognizer(_:shouldAttemptToRecognizeWith:)` (pointer) | | Filter by location, e.g. a resize grip inside a large view |

### Migration checklist

1. Standard AppKit controls and recognizers work with touch unchanged; test every window, sheet and popover (tap, one-finger drag/scroll/text selection, pinch/rotate, small grips).
2. `mouseDown/Dragged/Up` overrides and tracking loops still run (AppKit emulates a single-finger tap/drag) but miss multi-finger gestures: replace them with recognizers or target-action.
3. Custom `NSGestureRecognizer` subclasses must reach a terminal state (ended, failed, cancelled) and handle `touchesCancelled`/`mouseCancelled`; otherwise the app looks frozen.
4. `NSApplication.currentEvent` no longer reliably holds the initiating event in control actions: use `NSEvent.modifierFlags` and `NSEvent.pressedMouseButtons` (a touch is not a pressed button).
5. Hover (`NSTrackingArea`, SwiftUI `onHover`) is pointer-only; give touch another route (above). Keyboard and scroll-wheel events behave the same on every input source.
6. Context menus: override `NSView.menu(for:)` instead of `rightMouseDown`; in SwiftUI use `contextMenu(menuItems:)` (touch and hold opens it).
7. No Mac with a touch display? Connect an iPad via Sidecar: AppKit routes its touches the same way.

SwiftUI: no touch-specific API appears in these HIG pages; the AppKit article states gesture recognizers are a shared input model across AppKit, SwiftUI and Mac Catalyst. Enlarge hit areas with `contentShape(_:eoFill:)` (macOS 10.15) when a custom control is small.
