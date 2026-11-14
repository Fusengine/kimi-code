---
name: uikit-26-27
description: UIKit 26 and 27 additions verified on Apple docs - automatic Observable tracking, iPhone Duo hinge and vertical bar APIs, state restoration extension, TextKit tables and viewport, menu image visibility, navigation bar minimization
when-to-use: writing or migrating UIKit code for iOS 26/27, reacting to Observable models in views, supporting iPhone Duo, extending state restoration, building rich text with tables
keywords: UIHingeInteraction, UIHinge, preferredVerticalBarBehavior, verticalBarEdge, axisBehavior, UIScene.extendStateRestoration, updateProperties, UIObservationTrackingEnabled, NSTextTable, NSTextViewportLayoutControllerDelegate, UITextAttachmentViewProviderReusePolicy, preferredImageVisibility, navigationBarMinimization
priority: high
related: uikit-integration.md, ../../ipados/references/menu-bar-windows.md, ../../ipados/references/resizing-and-mirroring.md, ../../swiftui-core/references/hig-iphone-duo.md
---

# UIKit 26 and 27

Sources, all read 2026-11-13: UIKit updates page https://developer.apple.com/documentation/updates/uikit (JSON `.../tutorials/data/documentation/updates/UIKit.json`), iOS and iPadOS 27 release notes https://developer.apple.com/documentation/ios-ipados-release-notes/ios-ipados-27-release-notes, symbol pages `developer.apple.com/tutorials/data/documentation/uikit/<symbol>.json` (`introducedAt` quoted). Version `27.1` APIs are above the iOS 27.0 floor: gate with `#available`.

## Automatic Observable tracking (iOS 26.0)

Source: https://developer.apple.com/documentation/uikit/updating-views-automatically-with-observation-tracking-in-uikit.

- Read `@Observable` properties inside `updateProperties()` (view controller or view, iOS 26.0 per `setNeedsUpdateProperties()`) or `layoutSubviews()`: UIKit tracks what you read and re-runs the method when it changes. No manual `setNeedsLayout()` bookkeeping.
- `updateProperties()` runs after trait collection updates and before `layoutSubviews()`: put text, colors and visibility there; keep geometry in `layoutSubviews()`. Call `setNeedsUpdateProperties()` to force a pass.
- Cells: `cell.configurationUpdateHandler` is tracked too (read the model inside the handler).
- `UICollectionViewCompositionalLayoutSectionProvider` closures take part in tracking (June 2026), so a model change invalidates the compositional layout.
- iOS 18 needs Info.plist `UIObservationTrackingEnabled` = YES; "In iOS 26 and later, this key isn't required" (https://developer.apple.com/documentation/bundleresources/information-property-list/uiobservationtrackingenabled).

```swift
@Observable final class MessageModel { var showStatus = false; var statusText = "" }

final class InboxViewController: UIViewController {
    let model = MessageModel()
    private let statusLabel = UILabel()

    override func updateProperties() {
        super.updateProperties()
        statusLabel.alpha = model.showStatus ? 1 : 0   // tracked read
        statusLabel.text = model.statusText
    }
}
```

## iPhone Duo: hinge and vertical bars (iOS 27.1)

Layout types (`UIArrangementViewController`, `UIView.ReservedRegion`) are in [hig-iphone-duo.md](../../swiftui-core/references/hig-iphone-duo.md). Additional UIKit symbols, all `introducedAt` 27.1:

| Need | Symbol |
|------|--------|
| Observe the hinge | `UIHingeInteraction(updateHandler:)` on a view; `isEnabled`; handler gets `UIHingeInteraction.Update` whose `hinge` is `nil` when the view leaves a hierarchy that provides hinge updates |
| Read the hinge | `UIHinge.angle` (`CGFloat`), `UIHinge.status`: `closed`, `partiallyOpen`, `fullyOpen`, `unknown` |
| Opt out of vertical bars | override `UIViewController.preferredVerticalBarBehavior` (`UIVerticalBarBehavior`: `automatic`, `disabled`); `childForPreferredVerticalBarBehavior`; `setNeedsUpdateOfVerticalBarConfiguration()` |
| Where vertical bars go | `UITraitCollection.verticalBarEdge` (`UIVerticalBarEdge`: leading or trailing); React via `systemTraitsAffectingVerticalBarEdge` |
| Bar item axis | `UIBarButtonItem.axisBehavior` (`UIBarButtonItem.AxisBehavior`: `automatic`, `horizontalOnly`, `verticalPreferred`); `UINavigationItem.verticalBarCompressionBehavior` (`UIVerticalBarCompressionBehavior`, e.g. `.prefersBarItems`, `.prefersTabBar`) |
| Query reserved regions | `UIView.reservedRegions(kind:options:)` |
| Outer display while capturing | `UISceneAccessory.cameraCapture(sceneConfiguration:)` (27.1), registered with `UIViewController.registerSceneAccessory(_:)` (27.0) |

Apple's guidance for `preferredVerticalBarBehavior`: disable the vertical bar only for UIs better served by horizontal bars (full-screen video player, non-scrolling layout such as a calculator); treat it as a stable choice, not a per-state toggle.

## App life cycle and state

- `UIScene.extendStateRestoration()` / `completeStateRestoration()`: with the iOS 27 SDK use them to extend state restoration across the background-to-foreground activation transition (iOS 27 notes; the symbols list `introducedAt` 15.0, the extension behavior is tied to linking against the 27 SDK).
- Scene-based life cycle is mandatory with the 27 SDK; a launch screen key is required; `canOpenURL:` is deprecated: see `swift-core/references/sdk-27-changes.md`.

## Menus and bars

- `UIMenuElement.preferredImageVisibility` (27.0; `UIMenuElement.ImageVisibility`: `automatic`, `hidden`, `visible`; also on `UIMenu`, `UIAction`, `UICommand`, `UIKeyCommand` initializers): iPadOS and macOS menu bar and context menus hide menu element images by default; system items (Settings, Share, Print) stay visible.
- `UINavigationItem.navigationBarMinimization` (27.0, `UIBarMinimization`) replaces `barMinimizeBehavior` and `barMinimizationSafeAreaAdjustment`.
- Tab bar (WWDC26 session 278): `UITabBarController.prominentTabIdentifier` (27.0) makes any tab the always-visible prominent tab; iPhone apps can opt into a sidebar with `tabBarController.sidebar.preferredPlacement = .sidebar` (an app choice, no user toggle; check `sidebar.isAvailable`). Navigation bar: `navigationItem.navigationBarMinimization.minimizationBehavior` (e.g. `.onScrollDown`) and `.safeAreaAdjustment` (e.g. `.disabled`). Scroll edge effect `.automatic` no longer switches between soft and hard: re-evaluate overrides, especially `.soft`.
- `UISearchController` with center placement shows the scope bar inline beside the search field (27 SDK).
- Siri can load content from `UIDragInteractionDelegate` (27.0): no animation or modal UI in `dragInteraction(_:sessionWillBegin:)`; do it in `dragInteraction(_:sessionDidMove:)`.
- `UIDragInteraction.allowsPointerDragBeforeLiftDelay`: independent lift timing for pointer drags.
- Presented view controllers inherit traits through the superview chain of the presentation (27 SDK): custom `UIPresentationController` trait propagation may need a review.

## TextKit (iOS 27.0 unless noted)

| Need | Symbol |
|------|--------|
| Tables in attributed strings | `NSTextTable`, `NSTextBlock`, `NSTextTableBlock` ("represent table structures in attributed strings", UIKit updates June 2026; the symbol pages show `introducedAt` 6.0, so test table rendering on the iOS 27 runtime before relying on it), `NSParagraphStyle.textBlocks` |
| Override viewport layout in a `UITextView` subclass | conform to `NSTextViewportLayoutControllerDelegate` (`textViewportLayoutControllerWillLayout(_:)`, `...DidLayout(_:)`, `textViewportLayoutController(_:configureRenderingSurfaceFor:)`) |
| Custom drawing surfaces | `NSTextViewportRenderingSurface` (protocol, 27.0) |
| Keep attachment views alive | `UITextView.register(_:forTextAttachmentViewProviderType:)` with `UITextAttachmentViewProviderReusePolicy` (`onScrollingOutOfViewport`, `onEditingInlineParagraphs`): avoids flicker and keeps view state |

Not covered here: Liquid Glass types (`UIGlassEffect`, `UIScrollEdgeEffect`, `UIBackgroundExtensionView`) live in [liquid-glass.md](../../swiftui-core/references/liquid-glass.md).
