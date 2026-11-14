---
name: charts-3d
description: Chart3D and SurfacePlot in Swift Charts (iOS 26) - 3D point, rule and rectangle marks, surfaces from functions, pose and camera projection, and the iOS 27 conditional-content crash fix
when-to-use: visualizing three variables or a function of two variables, letting people rotate a chart, deploying Swift Charts below iOS 27
keywords: Chart3D, SurfacePlot, Chart3DPose, chart3DPose, chart3DCameraProjection, Chart3DContent, PointMark, chartZAxisLabel
priority: low
related: ../SKILL.md
---

# Chart3D

Sources, read 2026-11-13: Swift Charts updates page https://developer.apple.com/documentation/updates/swiftcharts (June 2025 entry), symbol pages `.../tutorials/data/documentation/charts/<symbol>.json` and `.../documentation/swiftui/view/<modifier>.json`, iOS 27 release notes (Swift Charts).

## Symbols

| Need | Symbol | Availability |
|------|--------|--------------|
| 3D chart view | `Chart3D` (`@MainActor struct`, content conforms to `Chart3DContent`): `init(content:)`, `init(_:content:)` for a data collection | iOS, iPadOS, Mac Catalyst, macOS, visionOS 26.0 (not tvOS or watchOS) |
| Surface of a function | `SurfacePlot(x:y:z:function:)` | 26.0 |
| 3D marks | 3D initializers of `PointMark`, `RuleMark`, `RectangleMark` (take `x:`, `y:` and `z:` values) | 26.0 |
| Viewpoint | `View.chart3DPose(_:)` (takes `Binding<Chart3DPose>`), `Chart3DPose(azimuth:inclination:)` and presets `front`, `back`, `left`, `right`, `top`, `bottom`, `default` | 26.0 (`chart3DPose` also visionOS) |
| Projection | `View.chart3DCameraProjection(_:)` with `Chart3DCameraProjection` (default `.automatic`) | 26.0 (not visionOS) |
| Styling | `Chart3DSymbolShape` / `BasicChart3DSymbolShape`, `Chart3DSurfaceStyle` / `BasicChart3DSurfaceStyle` | 26.0 |
| Z axis | `View.chartZAxisLabel(_:position:alignment:spacing:)` | 26.0 |

iOS 27 fix (release notes, radar 174168981): with a deployment target below 27.0, conditionals inside a `Chart` closure warned that `_ConditionalContent` conformance to `ChartContent` is only available in 27.0 and "the app might crash at runtime when that content is loaded". With such a target, test any `if`/`else` inside a chart builder on an older OS before shipping.

```swift
import Charts
import SwiftUI

struct Penguin: Identifiable {
    let id: Int
    let flipperLength: Double
    let weight: Double
    let beakLength: Double
}

struct PenguinChart: View {
    let penguins: [Penguin]
    @State private var pose = Chart3DPose.default

    var body: some View {
        Chart3D(penguins) {
            PointMark(
                x: .value("Flipper Length (mm)", $0.flipperLength),
                y: .value("Weight (kg)", $0.weight),
                z: .value("Beak Length (mm)", $0.beakLength))
        }
        .chart3DPose($pose)
    }
}

struct WaveSurface: View {
    var body: some View {
        Chart3D {
            SurfacePlot(x: "x", y: "y", z: "z") { x, z in
                sin(2 * x) * cos(2 * z)
            }
        }
    }
}
```

The `Chart3D { SurfacePlot ... }` and `Chart3D(penguins) { PointMark ... }` shapes are Apple's own examples on the `Chart3D` page; `chart3DPose($pose)` follows the verified modifier signature. Add an accessibility label and a non-visual summary of the data: [hig-accessibility.md](../../swiftui-core/references/hig-accessibility.md).
