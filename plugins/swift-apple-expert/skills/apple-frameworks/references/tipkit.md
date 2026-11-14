---
name: tipkit
description: TipKit - tips, display rules (parameters and events), tip groups, configuration (datastore, display frequency, CloudKit sync) and testing
when-to-use: teaching a feature with an inline tip or popover, showing a tip only after a condition, sequencing several tips, syncing tip state across devices
keywords: Tip, TipView, popoverTip, Tips.configure, Parameter, Rule, Tips.Event, TipGroup, MaxDisplayCount, cloudKitContainer, displayFrequency
priority: medium
related: ../SKILL.md, ../../swiftui-core/references/hig-modality.md
---

# TipKit

Sources, read 2026-11-13: https://developer.apple.com/documentation/tipkit (JSON `.../tutorials/data/documentation/tipkit.json`), sample "Highlighting app features with TipKit" (iOS 18.0, Xcode 16.0), TipKit updates page (latest entry June 2024). Newer symbols exist without an updates entry: `Tip.resetEligibility()` (`async`, iOS 26.0) and `Tips.DonationLimit` (26.0), per their symbol pages.

## Symbols (all available iOS 17.0, macOS 14.0, tvOS 17.0, visionOS 1.0, watchOS 10.0 unless noted)

| Need | Symbol |
|------|--------|
| Define a tip | `protocol Tip`: `title`, `message`, `image`, `actions`, `rules`, `options`, `status`, `shouldDisplay`, `invalidate(reason:)`, `resetEligibility()` (26.0, `async`) |
| Show it | `TipView(_:arrowEdge:action:)` (inline, preferred: "doesn't obscure or hide any underlying UI"); `View.popoverTip(_:arrowEdge:action:)`; UIKit `TipUIView`, `TipUIPopoverViewController`; AppKit `TipNSView`, `TipNSPopover` |
| Configure once at launch | `try Tips.configure([...])` with `Tips.ConfigurationOption`: `datastoreLocation(_:)`, `displayFrequency(_:)`, `cloudKitContainer(_:)` (June 2024: sync tips, rules, parameters and events across devices) |
| Rules | `@Tips.RuleBuilder var rules: [Rule]`; `@Parameter` static state with `#Rule(Self.$flag) { $0 == true }`; `Tips.Event(id:)` with `donate()` |
| Display limits | `Tips.MaxDisplayCount`, `MaxDisplayDuration` (June 2024), `IgnoresDisplayFrequency` as tip `options` |
| Ordered tips | `TipGroup(_:_:)` (iOS 18.0, macOS 15.0, watchOS 11.0, visionOS 2.0) with `currentTip`; `TipGroup.Priority` |
| Style | `tipViewStyle(_:)`, `TipViewStyle`, `MiniTipViewStyle` |
| Testing | `Tips.showAllTipsForTesting()`, `showTipsForTesting(_:)`, `hideAllTipsForTesting()`, `hideTipsForTesting(_:)`, `resetDatastore()` |

## Rules of use

- Call `Tips.configure()` once, before any `TipView` renders (Apple's sample does it in the `App` initializer).
- Invalidate a tip when the person does the thing it teaches: `tip.invalidate(reason: .actionPerformed)`.
- HIG guidance on tips and onboarding: [hig-modality.md](../../swiftui-core/references/hig-modality.md).
- `@Parameter(.transient)` resets the value to its default the first time it is referenced (comment in Apple's sample).

```swift
import SwiftUI
import TipKit

struct FavoriteTip: Tip {
    @Parameter static var isLoggedIn: Bool = false

    var title: Text { Text("Save as a Favorite") }
    var message: Text? { Text("Your favorites always appear at the top of the list.") }
    var image: Image? { Image(systemName: "star") }

    var rules: [Rule] {
        #Rule(Self.$isLoggedIn) { $0 == true }
    }
}

@main
struct DemoApp: App {
    init() {
        do { try Tips.configure() } catch { print("TipKit: \(error)") }
    }
    var body: some Scene { WindowGroup { ListScreen() } }
}

struct ListScreen: View {
    private let tip = FavoriteTip()

    var body: some View {
        VStack {
            TipView(tip, arrowEdge: .bottom)
            Button("Favorite", systemImage: "star") {
                tip.invalidate(reason: .actionPerformed)
            }
        }
    }
}
```

Structure follows Apple's sample (`InlineTip`, `ParameterRuleTip`, `Tips.configure()`); `ListScreen` and `DemoApp` are illustrative and not compiled against the SDK here.
