---
name: metrickit
description: MetricKit 27 (MetricManager async report sequences, state-contextualized metrics) and the StateReporting framework (StateReporter, ReportableMetadata) for per-feature performance attribution
when-to-use: collecting field performance and diagnostic reports, attributing metrics to app states, migrating from MXMetricManager subscribers
keywords: MetricManager, MetricReport, DiagnosticReport, StateReporter, StateReportingDomain, ReportableMetadata, MXMetricManager, trackLaunchTask
priority: medium
related: ../SKILL.md, background-tasks.md, ../../swift-core/references/performance.md
---

# MetricKit and StateReporting

Sources, read 2026-11-13: https://developer.apple.com/documentation/metrickit (JSON `.../tutorials/data/documentation/metrickit.json`), article "Track performance by app state using MetricKit" and sample, https://developer.apple.com/documentation/statereporting and "Getting started with StateReporting", Apple's June 2026 updates index ("The MetricKit framework is significantly upgraded for the 27 platform releases").

## Symbols

| Need | Symbol | Availability |
|------|--------|--------------|
| Receive reports | `MetricManager` (`final class`): `metricReports` (`some AsyncSequence<MetricReport, Never>`, daily), `diagnosticReports` (`some AsyncSequence<DiagnosticReport, Never>`, individual events) | iOS/iPadOS/Mac Catalyst/macOS 27.0 (`diagnosticReports` also visionOS) |
| Enable state domains | `MetricManager(enabledStateReportingDomains: Set<StateReportingDomain>)`; `StateReportingDomain` is `ExpressibleByStringLiteral` (`rawValue` gives the string) | 27.0 |
| Custom metric logs | `MetricManager.logHandle(category:)` | 27.0 |
| Extended launch tracking | `trackLaunchTask(id:onTrackingError:_:)`, `LaunchTaskID` | 27.0 |
| State attached to entries | `MetricManager.ReportedState` (`domain`, `label`, `duration`, `stableMetadata`); `MetricReport.stateEntries`, `intervalEntries`, `timeRange` | 27.0 |
| Encode by domain | `MetricReport.encodingFormatKey` with `EncodingFormat.byStateReportingDomain` in `JSONEncoder.userInfo` | 27.0 |
| Record states | `StateReporter<StableMetadata, VolatileMetadata>.reporter(for:stableMetadata:volatileMetadata:)`, `reportTransition(to:stableMetadata:volatileMetadata:)`, `reportVolatileMetadataUpdate(_:)` | StateReporting 27.0, all platforms incl. tvOS and watchOS |
| Metadata types | `ReportableMetadata` protocol with macros `@ReportableMetadata`, `@ReportableMetadataKey(_:)`, `@ReportableMetadataIgnored` | 27.0 |
| Legacy | `MXMetricManager.shared`, `add(_:)` subscriber, `pastPayloads`, `pastDiagnosticPayloads`, `makeLogHandle(category:)` | iOS 13.0, macOS 12.0; **deprecated** (27.3 on iOS, iPadOS, macOS, visionOS; 27.0 on Mac Catalyst): "Use MetricManager instead" |

MetricKit does not deliver reports on simulated devices: test on a device running iOS 27 (Apple's sample requirements).

## WWDC26 session 222 "Meet the new MetricKit" (https://developer.apple.com/videos/play/wwdc2026/222/, transcript and code read 2026-11-13)

- The framework is rebuilt "from the ground up" as a Swift-first API; every advance below is exclusive to it (the `MX*` classes are the old API).
- Create `MetricManager` at app start and keep it alive: subscribing late loses data, and the streams keep delivering as later data becomes ready. Run the listening loop in a detached task or a dedicated service class.
- A `MetricReport` covers one day: a full-day entry plus smaller breakdown entries (a few hours each, only when they hold metrics); `intervalEntries.fullDayEntry`, entries hold `values` grouped by `metricGroup` (`.cpu`, `.memory`, `.display`, `.gpu`), cases like `.peakMemory(_)`. Reports and diagnostics are `Codable`: `JSONEncoder().encode(report)` for the server.
- Diagnostics arrive immediately: `report.result` is `.crash(let crash)` (`callStackTree`, `terminationReason`, `terminationCategory` new in iOS 27, tells how the crash was counted in metrics), `.hang(_)`, and new in iOS 27 memory exception diagnostics (app or extension killed for exceeding its memory limit). New metric: Metal frame rate.
- Metrics can be provided per app state: hang time intersected with "tab 1", "tab 2", "tab 3". `MetricReport.EncodingFormat.byStateReportingDomain` (set through `encoder.userInfo[MetricReport.encodingFormatKey]`) encodes by domain.
- Analysis happens on your server: aggregate across devices by your own dimensions; Apple supplies collection only.

## StateReporting rules (Apple's article)

- A domain is a reverse-DNS string for one functional area (`com.myapp.checkout`); keep it stable across versions, changing it starts a new data series.
- At most one state is active per domain; keep labels few and fixed ("Low", "High"). Dynamic values go in volatile metadata, never in the label or stable metadata (each unique combination is aggregated separately).
- `reporter(for:...)` returns the same instance per domain; calling it again with different metadata types crashes at runtime. Store the reporter in a long-lived object.
- Call `reportTransition` at human-interaction timescales (tap, navigation, start of an activity); there is a rate limit and data is dropped on per-frame calls. A `nil` label clears the state; an empty string is a fatal error.
- Extensions: reporters work there, but metric data is not available for extensions, so their transitions are not in a `MetricReport`; they do appear in diagnostic reports. The extension must create its own `MetricManager` with the domains it uses.

```swift
import MetricKit
import StateReporting

@ReportableMetadata
struct CheckoutStable { let paymentMethod: String }

@ReportableMetadata
struct CheckoutVolatile { let cartItems: Int }

extension StateReportingDomain {
    static let checkout: StateReportingDomain = "com.example.app.checkout"
}

@MainActor
final class MetricsCollector {
    private let manager = MetricManager(enabledStateReportingDomains: [.checkout])
    private let checkout = StateReporter.reporter(
        for: StateReportingDomain.checkout.rawValue,
        stableMetadata: CheckoutStable.self,
        volatileMetadata: CheckoutVolatile.self)

    func startListening() {
        Task {
            for await report in manager.metricReports { upload(report) }
        }
        Task {
            for await diagnostic in manager.diagnosticReports { upload(diagnostic) }
        }
    }

    func beganPaying(method: String, items: Int) {
        checkout.reportTransition(
            to: "Paying",
            stableMetadata: CheckoutStable(paymentMethod: method),
            volatileMetadata: CheckoutVolatile(cartItems: items))
    }

    private func upload(_ report: MetricReport) {}
    private func upload(_ report: DiagnosticReport) {}
}
```

The `StateReporter.reporter(for:...)` call shape, `MetricManager(enabledStateReportingDomains:)` and the `for await` loops follow Apple's article and sample; the sample code here has not been compiled against the Xcode 27 SDK.
