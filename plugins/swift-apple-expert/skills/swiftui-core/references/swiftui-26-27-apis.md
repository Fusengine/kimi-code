---
name: swiftui-26-27-apis
description: Verified SwiftUI 26/27 APIs not covered elsewhere - WebView, Animatable macro, drag containers, rich TextEditor, item alerts, status bar toolbar, TabsPickerStyle, concentric radii, hosting scene delegate, 27.1 hinge and vertical-bar toolbar APIs, iOS 27 behaviour changes
when-to-use: embedding web content, animating custom views, multi-item drag, editing attributed text, presenting alerts from an item or error, hiding the status bar, tab-style pickers, folding-device toolbars
keywords: WebView, WebPage, Animatable, dragContainer, draggable, TextEditor, AttributedString, alert item, alert error, toolbarVisibility statusBar, TabsPickerStyle, concentricCornerRadii, UIHostingSceneDelegate, onHingeChange, toolbarVerticalBehavior, axisBehavior
priority: medium
related: views-modifiers.md, toolbars-navigation.md, hig-iphone-duo.md
---

# SwiftUI 26/27 APIs (verified)

Every row was read on its Apple JSON page (`https://developer.apple.com/tutorials/data/documentation/<path>.json`) on 2026-11-13; availability is the page's `introducedAt`. Change lists: https://developer.apple.com/documentation/updates/swiftui and the iOS & iPadOS 27 release notes (https://developer.apple.com/documentation/ios-ipados-release-notes/ios-ipados-27-release-notes).

## Web content: `WebView` and `WebPage` (WebKit, iOS/iPadOS/Mac Catalyst/macOS/visionOS 26.0)

SwiftUI-native web view; prefer it to wrapping `WKWebView`. Not available on tvOS or watchOS.

```swift
import WebKit

WebView(url: URL(string: "https://www.apple.com"))        // init(url: URL?)

@State private var page = WebPage()                       // @MainActor final class, init(configuration:)
WebView(page)                                             // init(_ page: WebPage)
page.load(URLRequest(url: url))                           // also load(_ url: URL?), load(html:baseURL:)
```

`load(...)` returns an `AsyncSequence` of `WebPage.NavigationEvent`. `WebPage` is observable state: `title`, `url`, `isLoading`, `estimatedProgress`, plus `callJavaScript(_:arguments:in:contentWorld:)`, `navigations`, `backForwardList`. Sources: https://developer.apple.com/documentation/webkit/webview-swift.struct, https://developer.apple.com/documentation/webkit/webpage

## `@Animatable` macro (`Animatable()`, iOS 13.0 / macOS 10.15 back-deployed)

Synthesizes `Animatable` conformance and `animatableData` from the type's animatable stored properties (struct, class or enum). Replace hand-written `animatableData` with it. Annotate properties that cannot animate with `@AnimatableIgnored`; no conformance is generated if the type already conforms, computed properties are excluded, and the type needs stored properties. Source: https://developer.apple.com/documentation/swiftui/animatable()

## Multi-item drag: `dragContainer` + `draggable(containerItemID:)` (iOS/iPadOS/visionOS 27.0, macOS 26.0)

```swift
VStack {
    ForEach(fruits) { fruit in
        FruitView(fruit).draggable(containerItemID: fruit.name)
    }
}
.dragContainer(itemID: \Fruit.name) { ids in fruits(with: ids) }   // Item: Transferable, ItemID: Hashable & Sendable
```

The payload closure receives the dragged ids and returns the `Transferable` items; supports lazy containers. Sources: https://developer.apple.com/documentation/swiftui/view/dragcontainer(for:itemid:in:_:), https://developer.apple.com/documentation/swiftui/view/draggable(containeritemid:containernamespace:)

## Rich text: `TextEditor` with `AttributedString` (iOS/iPadOS/macOS/visionOS 26.0)

`TextEditor(text: Binding<AttributedString>, selection: Binding<AttributedTextSelection>? = nil)`. Constrain allowed formatting with `AttributedTextFormattingDefinition` (iOS 26.0); `AttributedTextSelection` (iOS 26.0) carries the selection and its attributes. Source: https://developer.apple.com/documentation/swiftui/texteditor/init(text:selection:)

## Alerts and dialogs from an item or an error (back-deployed to iOS 15 / macOS 12)

```swift
.alert("Delete?", item: $pendingDelete) { item in           // alert(_:item:actions:), Binding<T?>
    Button("Delete", role: .destructive) { delete(item) }
}
.alert(error: $loadError) { Button("OK") {} }               // alert(error:actions:), E: LocalizedError
.confirmationDialog("Share", item: $shareItem) { item in ... }   // confirmationDialog(_:item:titleVisibility:actions:)
```

Actions use `@ContentBuilder`. Sources: https://developer.apple.com/documentation/swiftui/view/alert(_:item:actions:), https://developer.apple.com/documentation/swiftui/view/alert(error:actions:), https://developer.apple.com/documentation/swiftui/view/confirmationdialog(_:item:titlevisibility:actions:)

## Status bar (iOS/iPadOS/Mac Catalyst 27.0)

`ToolbarPlacement.statusBar` plugs into the existing bar modifiers: `.toolbarVisibility(hide ? .hidden : .automatic, for: .statusBar)` and `.toolbarColorScheme(scheme, for: .statusBar)` (iOS 27 release notes, SwiftUI > New Features; `ToolbarPlacement.statusBar` page: https://developer.apple.com/documentation/swiftui/toolbarplacement/statusbar).
## `TabsPickerStyle` (all platforms 27.0 except watchOS)

`.pickerStyle(.tabs)`: like `.segmented`, but VoiceOver reads "tabs" and macOS draws a distinct look. Use it for pickers that switch content or navigation, not for value selection (e.g. text alignment). Source: https://developer.apple.com/documentation/swiftui/tabspickerstyle (release note rationale from the iOS 27 notes).

## `GeometryProxy.concentricCornerRadii` (27.0, all platforms)

`RectangleCornerRadii?` concentric with the container shape (and `concentricCornerRadii(in:)`), for custom drawing or layout without rendering a `ConcentricRectangle`. Source: https://developer.apple.com/documentation/swiftui/geometryproxy/concentriccornerradii

## `UIHostingSceneDelegate` (iOS/iPadOS/Mac Catalyst/visionOS 26.0, tvOS 27.0)

Bridges SwiftUI scenes into a UIKit lifecycle: declare SwiftUI scenes in the static `rootScene`, activate one by id or presented value with `UISceneSessionActivationRequest`, and return the class from `application(_:configurationForConnecting:options:)` via `UISceneConfiguration`. Source: https://developer.apple.com/documentation/swiftui/uihostingscenedelegate

## iOS/iPadOS 27.1 hinge and vertical-bar APIs (all platforms 27.1)

Foldable (iPhone Duo) support; layout rules in [hig-iphone-duo.md](hig-iphone-duo.md).

| API | Role |
|-----|------|
| `onHingeChange(isEnabled:_:)` | Action receiving two `DeviceHingeContext` values when the hinge context changes |
| `DeviceHingeContext.hinge` | Current `DeviceHinge?`; `DeviceHinge` has `angle: Angle` and `status` |
| `toolbarVerticalBehavior(_:)` | `ToolbarVerticalBehavior`: `.automatic`, `.disabled` |
| `axisBehavior(_:)` on `ToolbarContent` | `ToolbarItemAxisBehavior`: `.automatic`, `.horizontalOnly`, `.verticalPreferred`; a `.horizontalOnly` item is hidden when no horizontal bar exists |
| `toolbarVerticalCompressionBehavior(_:)` | How bars compress when space is constrained |
| `EnvironmentValues.toolbarVerticalEdge` | `HorizontalEdge?` where the vertical bar sits |

Sources: https://developer.apple.com/documentation/swiftui/view/onhingechange(isenabled:_:), https://developer.apple.com/documentation/swiftui/toolbaritemaxisbehavior, https://developer.apple.com/documentation/swiftui/toolbarverticalbehavior

## iOS 27 behaviour changes (SDK 27 builds)

- **Selectable `Text`** (`.textSelection(.enabled)`) now uses the system text selection UI (loupe, handles) instead of a callout menu; extra gestures may appear. Wrap custom gestures on such text in `.highPriorityGesture()`. A custom `TextRenderer` now applies to selectable text.
- **`TabView`** may crash if `selection` points at a hidden or unavailable tab: keep it on a visible tab.
- **Menus**: iPadOS/macOS menu bar and macOS context menus hide menu item symbol images by default; use `labelStyle(.titleAndIcon)` when the item stands for an object or concept.
- **`@Entry`** warns when the default value is a class instance or closure.

Source: iOS & iPadOS 27 release notes, SwiftUI > New Features / Resolved Issues (read 2026-11-13).
