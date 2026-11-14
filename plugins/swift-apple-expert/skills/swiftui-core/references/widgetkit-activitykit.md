---
name: widgetkit-activitykit
description: WidgetKit and ActivityKit APIs for widget push updates, controls on watchOS and macOS, CarPlay and visionOS widgets, watchOS relevance widgets, and scheduled Live Activity start
when-to-use: reloading widgets with push, building controls for Control Center on Mac or Watch, adapting a widget for CarPlay or Apple Vision Pro, scheduling a Live Activity
keywords: WidgetKit, ActivityKit, WidgetPushHandler, ControlWidgetButton, ControlWidgetToggle, RelevanceConfiguration, WidgetMountingStyle, WidgetTexture, LevelOfDetail, Activity request start, ActivityStyle
priority: medium
related: hig-system-surfaces.md, app-intents.md
---

# WidgetKit and ActivityKit APIs

Design rules (sizes, rendering modes, Live Activity layout) are in [hig-system-surfaces.md](hig-system-surfaces.md); this file lists the code-level APIs. Every symbol was read on its Apple JSON page (`https://developer.apple.com/tutorials/data/documentation/<path>.json`) on 2026-11-13; change lists: https://developer.apple.com/documentation/updates/widgetkit and https://developer.apple.com/documentation/updates/activitykit.

## Push-driven widget reloads

`WidgetPushHandler` (iOS, iPadOS, Mac Catalyst, macOS, visionOS, watchOS 26.0) receives push tokens so your server can reload widget timelines and relevance. Register the type on the widget configuration with `pushHandler(_:)` (`WidgetConfiguration`, 26.0).

```swift
struct MyPushHandler: WidgetPushHandler {
    func pushTokenDidChange(_ pushInfo: WidgetPushInfo, widgets: [WidgetInfo]) {
        // pushInfo.token is a Data; send it to your server with the widget kinds
    }
}

StaticConfiguration(kind: "Status", provider: Provider()) { entry in StatusView(entry) }
    .pushHandler(MyPushHandler.self)
```

Sources: https://developer.apple.com/documentation/widgetkit/widgetpushhandler, https://developer.apple.com/documentation/swiftui/widgetconfiguration/pushhandler(_:), https://developer.apple.com/documentation/widgetkit/widgetpushinfo

## Controls on watchOS and macOS

`ControlWidgetButton` (runs an action) and `ControlWidgetToggle` (toggles state) are available on iOS/iPadOS 18.0 and, since 26.0, on macOS and watchOS. Drive them with App Intents (`AppIntent`; `SetValueIntent`, iOS 18.0, for value-setting actions; see [app-intents.md](app-intents.md)). Sources: https://developer.apple.com/documentation/widgetkit/controlwidgetbutton, https://developer.apple.com/documentation/widgetkit/controlwidgettoggle

## Widgets in other contexts

| Context | API | Notes |
|---------|-----|-------|
| CarPlay | `WidgetFamily.systemSmall` | Update an existing small widget so it looks right in CarPlay (updates page, Jun 2025) |
| Apple Vision Pro | `supportedMountingStyles(_:)` with `WidgetMountingStyle` `.elevated` (composite material around the widget) / `.recessed` (recessed portal) | iOS/iPadOS/Mac Catalyst/visionOS 26.0 |
| Apple Vision Pro | `widgetTexture(_:)` with `WidgetTexture` `.glass` / `.paper` | visionOS 26.0 |
| Apple Vision Pro | `@Environment(\.levelOfDetail)` / `LevelOfDetail` `.default` / `.simplified` | Show more or less information by user proximity (visionOS only: on every other platform the value is always `.default`, so never gate content on `.simplified` there); 26.0 |
| iOS, iPadOS, macOS, watchOS, visionOS | `WidgetAccentedRenderingMode` | Per-image rendering in accented mode; iOS 18.0, macOS 15.0, watchOS 11.0, visionOS 26.0 |
| watchOS | `RelevanceConfiguration` | Relevance-clue widget for the Smart Stack; watchOS 26.0 |
| watchOS, visionOS | `AppIntentConfiguration` | User-configurable widget; watchOS 10.0, visionOS 26.0 |
| watchOS | `AccessoryWidgetGroup` (+ `.accessoryWidgetGroupStyle(.circular / .roundedSquare)`) | One label and three content views, optionally interactive; watchOS 11.0 |

Sources: https://developer.apple.com/documentation/widgetkit/widgetmountingstyle, https://developer.apple.com/documentation/widgetkit/widgettexture, https://developer.apple.com/documentation/widgetkit/levelofdetail, https://developer.apple.com/documentation/widgetkit/relevanceconfiguration, https://developer.apple.com/documentation/widgetkit/accessorywidgetgroup

## Live Activities

Live Activities appear automatically on the Mac menu bar and in CarPlay (ActivityKit updates page, Jun 2025); watchOS shows them in the Smart Stack. To start one at a specific time, use the scheduled request (iOS/iPadOS 26.0):

```swift
let activity = try Activity.request(
    attributes: attributes,
    content: content,
    pushType: nil,
    style: .standard,            // ActivityStyle: .standard or .transient
    alertConfiguration: alert,   // AlertConfiguration
    start: startDate             // Date
)
```

`Activity` and `ActivityStyle` (and the scheduled `request`) list **macOS 27.3 and Mac Catalyst 27.3 as BETA** in Apple's docs (read 2026-11-13): do not rely on them in a shipping macOS build before 27.3 is released. Sources: https://developer.apple.com/documentation/activitykit/activity/request(attributes:content:pushtype:style:alertconfiguration:start:), https://developer.apple.com/documentation/activitykit/activitystyle
