---
name: background-tasks
description: BGContinuedProcessingTask (iOS 26) - user-started long-running work that keeps running after the app is backgrounded, with system progress UI, GPU option and submission strategy
when-to-use: exporting video or audio, batch image processing, or any user-initiated job that can take minutes and must survive backgrounding
keywords: BGContinuedProcessingTask, BGContinuedProcessingTaskRequest, BGTaskScheduler, requiredResources, supportedResources, SubmissionStrategy, Live Activity progress
priority: medium
related: ../SKILL.md, metrickit.md
---

# Continued processing tasks

Sources, read 2026-11-13: BackgroundTasks updates page (June 2025 entry "Continuous Background Tasks"), article https://developer.apple.com/documentation/backgroundtasks/performing-long-running-tasks-on-ios-and-ipados, symbol pages `.../tutorials/data/documentation/backgroundtasks/<symbol>.json`. iOS and iPadOS 26.0 and Mac Catalyst 26.0 only: no macOS, watchOS, tvOS or visionOS.

## Symbols

| Need | Symbol | Availability |
|------|--------|--------------|
| Request | `BGContinuedProcessingTaskRequest(identifier:title:subtitle:)`; `requiredResources` (`Resources`, e.g. `.gpu`), `strategy` (`SubmissionStrategy`: `queue` default, `fail`) | 26.0 |
| Running task | `BGContinuedProcessingTask`: `title`, `subtitle`, `updateTitle(_:subtitle:)`, `progress` (`ProgressReporting`), `expirationHandler`, `setTaskCompleted(success:)` (from `BGTask`, 13.0) | 26.0 |
| GPU check | `BGTaskScheduler.supportedResources.contains(.gpu)` | 26.0 |
| Register and submit | `BGTaskScheduler.shared.register(forTaskWithIdentifier:using:launchHandler:)`, `submit(_:)` | |

## Rules (Apple's article)

- Start it only in response to a person's action (a button tap). Unlike other `BGTask` subclasses it starts in the foreground.
- The identifier is prefixed with your bundle ID plus a unique task name per job.
- The system shows title, subtitle and progress in a **Live Activity**; the person can cancel. Report accurate progress: tasks with minimal progress are terminated first under resource pressure, and a stuck-looking task invites cancellation.
- Cancellation (from the UI) calls the `expirationHandler`; check it in your loop. The system cancels running tasks silently when the person closes the app in the app switcher.
- Background GPU: set `requiredResources = .gpu` only after `supportedResources` contains `.gpu`, enable the Background GPU Access capability (entitlement `com.apple.developer.background-tasks.continued-processing.gpu` = true).
- `strategy = .fail` makes submission fail at once if the system cannot start the task immediately; the default queues it.
- Info.plist (WWDC25 session 227 "Finish tasks in the background", https://developer.apple.com/videos/play/wwdc2025/227/): add the identifier to the permitted background task scheduler identifiers array, prefixed with your bundle ID. A wildcard form ends in `.*` and the dynamic suffix is appended at registration and submission.
- Unlike the other `BGTask` types, the launch handler does **not** have to be registered before launch finishes: register it when the person's intent is expressed (session 227), right before `submit(_:)`.
- A task that reports no progress is expired; slow progress prompts the person to decide whether to continue. You must call `setTaskCompleted(success:)` when the work ends (session 227).
- Do not use it for automatic work (maintenance, backups, photo sync): such tasks may be cancelled (session 227).

```swift
import BackgroundTasks

@MainActor
final class ExportJob {
    private let taskIdentifier = "com.example.app.export"   // bundle ID + task name

    /// Call from the button action that starts the export.
    func start() throws {
        // Register when the intent is expressed, then submit (WWDC25 session 227).
        BGTaskScheduler.shared.register(forTaskWithIdentifier: taskIdentifier, using: nil) { task in
            guard let task = task as? BGContinuedProcessingTask else { return }
            Self.run(task)
        }
        let request = BGContinuedProcessingTaskRequest(
            identifier: taskIdentifier, title: "Video export", subtitle: "About to start...")
        request.strategy = .fail
        try BGTaskScheduler.shared.submit(request)
    }

    nonisolated static func run(_ task: BGContinuedProcessingTask) {
        nonisolated(unsafe) var expired = false
        task.expirationHandler = { expired = true }
        let progress = task.progress
        progress.totalUnitCount = 100
        while !progress.isFinished && !expired {
            progress.completedUnitCount += 1
            task.updateTitle(task.title, subtitle: "\(Int(progress.fractionCompleted * 100))%")
            Thread.sleep(forTimeInterval: 1)
        }
        task.setTaskCompleted(success: progress.isFinished)
    }
}
```

The register-then-submit flow, the progress loop, `updateTitle(_:subtitle:)` and `setTaskCompleted(success:)` follow Apple's article and session 227; the `nonisolated(unsafe)` flag and `Thread.sleep` stand in for your real work (not compiled against the SDK here). Add the Background GPU Access capability and a `.gpu` check only if the job uses the GPU.
