---
name: appkit-27
description: AppKit 26 and 27 additions verified on Apple docs - automatic Observable tracking, NSRefreshController, NSControl.Events, tab-role segmented controls, NSTextSelectionManager, menu image visibility, titlebar accessories
when-to-use: writing or migrating AppKit code for macOS 26/27, binding views to @Observable models, adding pull-to-refresh, building tab-style segmented controls or custom text views
keywords: NSRefreshController, NSControl.Events, addTarget, NSSegmentedControl.Role, tabs, NSToolbarItemGroup.Role, NSTextSelectionManager, observation tracking, viewWillLayout, preferredImageVisibility, NSTitlebarAccessoryViewController
priority: high
related: appkit-integration.md, touch-input.md, app-structure.md
---

# AppKit 26 and 27

Sources, all read 2026-11-13: AppKit updates page https://developer.apple.com/documentation/updates/appkit (JSON `.../tutorials/data/documentation/updates/AppKit.json`), macOS 27 release notes https://developer.apple.com/documentation/macos-release-notes/macos-27-release-notes, symbol pages `developer.apple.com/tutorials/data/documentation/appkit/<symbol>.json` (`introducedAt` quoted). Touch, Sidecar and gesture recognizers: [touch-input.md](touch-input.md).

## Automatic Observable tracking

Source: https://developer.apple.com/documentation/appkit/updating-views-automatically-with-observation-tracking-in-appkit.

- AppKit tracks `@Observable` reads inside `viewWillLayout()` (view controller), `layout()`, `updateConstraints()` and `draw(_:)` (view), and re-runs the method when a read property changes. No manual `needsLayout` / `needsDisplay` bookkeeping.
- Drawing overrides called from `draw(_:)` are covered, including cell overrides such as `drawKnob(_:)` and `drawBar(inside:flipped:)`.
- Same idea as UIKit's `updateProperties()` ([uikit-26-27.md](../../ios/references/uikit-26-27.md)); AppKit's article names `viewWillLayout()` as the place for property updates.

```swift
@Observable final class MessageModel { var showStatus = false; var statusText = "" }

final class InboxViewController: NSViewController {
    let model = MessageModel()
    private let statusLabel = NSTextField(labelWithString: "")

    override func viewWillLayout() {
        super.viewWillLayout()
        statusLabel.alphaValue = model.showStatus ? 1 : 0   // tracked read
        statusLabel.stringValue = model.statusText
    }
}
```

## New controls and events (macOS 27.0)

| Need | Symbol | Notes |
|------|--------|-------|
| Pull to refresh | `NSRefreshController` assigned to `NSScrollView.refreshController` | Members: `action`, `target`, `attributedTitle`, `tintColor`, `isRefreshing`, `beginRefreshing()`, `endRefreshing()`. Call `endRefreshing()` when the work completes (macOS 27 notes) |
| Control events like `UIControl` | `NSControl.Events` + `addTarget(_:action:for:)` / `removeTarget(_:action:for:)` | Events: tracking (`trackingBegan`, `trackingEndedInside`, ...), semantic (`valueChanged`, `primaryActionTriggered`, `menuActionTriggered`), aggregate (`allEvents`). The type and `addTarget` pages show macOS 11.0 while event members such as `valueChanged` show 27.0 and the June 2026 updates list them as new: gate on your deployment target |
| Tab-style segmented control | `NSSegmentedControl.role = .tabs` (`NSSegmentedControl.Role`: `automatic`, `tabs`, `valueSelection`) | VoiceOver reads it as "tabs" with a distinct look; keep `valueSelection` for value pickers like text alignment (macOS 27 notes) |
| Toolbar group semantic role | `NSToolbarItemGroup.role` (`NSToolbarItemGroup.Role`) | Also iOS 13.0 / Mac Catalyst 27.0 per the symbol page |
| Custom text selection | `NSTextSelectionManager` | Click, drag, shift-click and word/line/paragraph selection through gesture recognizers instead of overriding `mouseDown:`; `NSTextView` now uses it; subclasses that override `mouseDown:` keep working through a fallback |
| Drag from a gesture | `NSView.beginDraggingSession(items:gesture:source:)` | Returns `NSDraggingSession?` |
| Menu item images | `NSMenuItem.preferredImageVisibility` (`automatic`, `hidden`, `visible`) | macOS 27: menu bar and context menus hide symbol images by default for apps linked on macOS 26 or later; system items (Settings, Share, Print) keep theirs; a menu item with no title and only an image is hidden in the 27 SDK unless you set `.visible` |
| Titlebar accessories | `NSTitlebarAccessoryViewController` | Linked on macOS 27: may draw outside its bounds (shadows, interactive glass); reveal animations may clip it |

```swift
final class ListViewController: NSViewController {
    private let refresh = NSRefreshController()
    @IBOutlet var scrollView: NSScrollView!

    override func viewDidLoad() {
        super.viewDidLoad()
        refresh.target = self
        refresh.action = #selector(reload(_:))
        scrollView.refreshController = refresh
    }

    @objc func reload(_ sender: Any?) {
        Task {
            try? await Task.sleep(for: .seconds(1))   // replace with your async data load
            refresh.endRefreshing()
        }
    }
}
```

`action` is typed `Selector?` and `target` `AnyObject?` (symbol pages); Apple documents no parameter form for the action method, so the sample takes `Any?` and ends refreshing through its own reference.

## macOS 26 additions still current

| Need | Symbol |
|------|--------|
| Old control metrics | `NSView.prefersCompactControlSizeMetrics` (metrics consistent with macOS 15 and earlier) |
| Largest control size | `NSControl.ControlSize.extraLarge` (cases: `mini`, `small`, `regular`, `large`, `extraLarge`) |
| Split view accessories | `NSSplitViewItemAccessoryViewController` (macOS 26.0) in `NSSplitViewItem.topAlignedAccessoryViewControllers` / `bottomAlignedAccessoryViewControllers` |
| Prominent toolbar item | `NSToolbarItem.Style.prominent` (26.0) with `backgroundTintColor` (26.0) |
| Extend content under sidebars | `NSBackgroundExtensionView` (26.0) |

Liquid Glass types (`NSGlassEffectView`, `NSGlassEffectContainerView`, `.glass` bezel) are in [liquid-glass.md](../../swiftui-core/references/liquid-glass.md).
