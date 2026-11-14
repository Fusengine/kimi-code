---
name: menu-bar-windows
description: iPadOS menu bar (SwiftUI commands, keyboard shortcuts, UIMenuBuilder) and windowing (full screen vs windowed, multiple scenes, window size)
when-to-use: adding menus and shortcuts to an iPad app, supporting windowed iPadOS, opening content in a new window, setting a minimum window size
keywords: commands, CommandMenu, CommandGroup, keyboardShortcut, UIMenuBuilder, UIKeyCommand, windowed, openWindow, UISceneSizeRestrictions, ActivationInteraction
priority: high
related: keyboard-shortcuts.md, multitasking.md, adaptive-layouts.md
---

# iPadOS Menu Bar and Windowing

Sources (read 2026-11-13): HIG the-menu-bar, windows, multitasking, menus; UIKit article `uikit/multitasking-on-ipad-mac-and-apple-vision-pro`. Symbol availability read on `developer.apple.com/tutorials/data/documentation/<path>.json`.

## Menu bar (HIG the-menu-bar > iPadOS)

- Hidden until revealed (pointer to the top edge, or swipe down from it); centered; occupies the status bar space. No Apple menu, no menu bar extras; no About/Services/app-visibility items in the app menu.
- It is often hidden, so **every function must be reachable from the UI**. Dynamic menu items exist only with a hardware keyboard: always offer another route. Do not use the menu bar as a catch-all.
- Reserve `YourApp > Settings` for the app's page in iPadOS Settings; link in-app preferences with a separate item beneath it.
- Tab-style apps: add each tab as a View menu item and consider key bindings per tab.
- Rows are taller than on Mac: group related items into submenus sooner. Menu item icons: all items of a group or none ([toolbars-navigation.md](../../swiftui-core/references/toolbars-navigation.md#menu-item-icons-hig-menus-updated-2026-06-08)).

| API | Availability | Use |
|---|---|---|
| `Scene.commands(content:)`, `Commands` | iOS/iPadOS 14.0 | Declare menu bar commands on a scene |
| `CommandMenu`, `CommandGroup(after:/before:/replacing:addition:)`, `CommandGroupPlacement` (`.newItem`, `.toolbar`, `.sidebar`, `.windowArrangement`, `.help`, ...) | iOS/iPadOS 14.0 | New menus / extend system menus |
| `View.keyboardShortcut(_:modifiers:)` (default `.command`) | iOS/iPadOS 14.0 | Shortcut shown in the menu and the hold-⌘ overlay |
| `Scene.commandsRemoved()` | iOS/iPadOS 16.0 | Drop default commands |
| `FocusedValue` / `focusedValue(_:_:)` | iOS/iPadOS 14.0 | Menu commands acting on the focused window's content |
| `UIMenuBuilder`, `UIKeyCommand` | iOS/iPadOS 13.0 / 7.0 | UIKit equivalents (see Apple's "Adding menus and shortcuts to the menu bar and user interface") |
| `UIMainMenuSystem.shared`, `setBuildConfiguration(_:buildHandler:)`, `UIMainMenuSystem.Configuration` | iOS/iPadOS 26.0 (`uikit/uimainmenusystem`, read 2026-11-13) | Configure the main menu in UIKit; `Configuration` holds per-area preferences (`documentPreference`, `findingPreference`, `inspectorPreference`, `newScenePreference`, `printingPreference`, `sidebarPreference`, `textFormattingPreference`, `toolbarPreference`, `findingConfiguration`), then customize with the `UIMenuBuilder` handler |
| `UIMenuElement.preferredImageVisibility` | iOS/iPadOS 27.0 | Menu bar and context menus hide menu element images by default on iPadOS 27 and macOS 27; `UIMenuElement.ImageVisibility` is `automatic`, `hidden` or `visible`; use `.visible` only where the HIG wants an icon (iOS 27 release notes) |

```swift
WindowGroup { ContentView() }
    .commands {
        CommandGroup(after: .newItem) {
            Button("New Note", systemImage: "square.and.pencil") { }   // icon: all items or none
                .keyboardShortcut("n", modifiers: [.command, .shift])
        }
    }
```

## Windowing (HIG windows > iPadOS, multitasking > iPadOS)

- Two presentations, chosen by the person in Multitasking & Gestures settings: **full screen** (windows fill the screen, app switcher between windows) and **windowed** (freely resizable, several on screen, system remembers size and placement). Apps get no indication of the chosen configuration: adapt to any window size ([adaptive-layouts.md](adaptive-layouts.md)). Slide Over / Split View / Stage Manager rows in `multitasking.md` are legacy terms; the HIG now describes full screen and windowed.
- Windowed windows show window controls at the leading edge of the toolbar: move your own leading toolbar buttons inward so they are not hidden.
- Let people open content in a new window by gesture (Notes pinch): `collectionView(_:sceneActivationConfigurationForItemAt:point:)` (iOS/iPadOS 15.0) for collection items, `UIWindowScene.ActivationInteraction` (15.0) for other views. Single-file viewing without your own window: `QLPreviewSceneActivationConfiguration` (15.0) - multiple-window support is still required.
- Multiple scenes: Info.plist `UIApplicationSupportsMultipleScenes`; SwiftUI `openWindow` (`OpenWindowAction`, iOS/iPadOS 16.0) and `supportsMultipleWindows` environment value (16.0).
- Minimum window size: `UISceneSizeRestrictions`; observe geometry with `windowScene(_:didUpdateEffectiveGeometry:)` (iOS/iPadOS 26.0) and defer heavy updates while the scene is interactively resizing. SwiftUI: `defaultSize(width:height:)`, `windowResizability(_:)` (iOS/iPadOS 17.0).
- Multitasking duties (HIG multitasking): save/restore context at any time, pause attention-demanding activity on switch-away, handle audio interruptions, finish user-started tasks in the background, notifications sparingly.
