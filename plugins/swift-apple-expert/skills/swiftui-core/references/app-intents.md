---
name: app-intents
description: App Intents framework for Siri, Shortcuts, and Spotlight integration, plus the iOS 26/27 runtime APIs (foreground modes, long-running, cancellable, undoable, snippet, entity collections)
when-to-use: adding Siri voice commands, Shortcuts actions, Spotlight donations, long-running or cancellable intents, interactive snippets
keywords: AppIntent, Parameter, Siri, Shortcuts, AppShortcutsProvider, LongRunningIntent, supportedModes, UndoableIntent, CancellableIntent, SnippetIntent, EntityCollection, SyncableEntity, allowedExecutionTargets
priority: medium
related: views-modifiers.md, navigation.md, hig-system-surfaces.md
---

# App Intents

Apple Intelligence app schemas, `IndexedEntity`, visual intelligence and assistant schemas live in the `apple-intelligence` skill (`apple-intelligence/references/system-features.md`); do not duplicate them here.

## AppIntent Protocol

```swift
import AppIntents

struct OpenArticleIntent: AppIntent {
    static var title: LocalizedStringResource { "Open Article" }

    @Parameter(title: "Article")
    var article: ArticleEntity

    @MainActor
    func perform() async throws -> some IntentResult {
        NavigationManager.shared.navigate(to: article)
        return .result()
    }
}
```

### `static var` vs `static let`

`title` is a protocol requirement `static var title: LocalizedStringResource { get }`. Apple's `AppIntent` page writes it as a computed property (`static var title: LocalizedStringResource { "Order Album" }`) and its `AppEntity` page writes `static let defaultQuery = TrailEntityQuery()`. Several Apple sample pages (`LongRunningIntent`, `CancellableIntent`, `EntityCollection`) still use a stored `static var title: LocalizedStringResource = "..."`; that is mutable global state, which Swift 6 language mode rejects (SE-0412, https://github.com/swiftlang/swift-evolution/blob/main/proposals/0412-strict-concurrency-for-global-variables.md). Use a computed `static var` or `static let` in this skill's code. Sources (read 2026-11-13): https://developer.apple.com/documentation/appintents/appintent, https://developer.apple.com/documentation/appintents/appentity, https://developer.apple.com/documentation/appintents/appintent/title

---

## App Entity

```swift
struct ArticleEntity: AppEntity {
    var id: String
    var title: String

    static let defaultQuery = ArticleQuery()
    static var typeDisplayRepresentation: TypeDisplayRepresentation { "Article" }

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)")
    }
}

struct ArticleQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [ArticleEntity] {
        try await ArticleStore.shared.articles(for: identifiers)
    }

    func suggestedEntities() async throws -> [ArticleEntity] {
        try await ArticleStore.shared.recentArticles()
    }
}
```

`TypeDisplayRepresentation` is `ExpressibleByStringLiteral`.

---

## App Shortcuts Provider

```swift
struct AppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: OpenArticleIntent(),
            phrases: [
                "Open \(\.$article) in \(.applicationName)",
                "Show \(\.$article) in \(.applicationName)",
            ],
            shortTitle: "Open Article",
            systemImageName: "doc.text"
        )
    }
}
```

---

## Returning Results

```swift
func perform() async throws -> some IntentResult { .result() }
func perform() async throws -> some IntentResult & ProvidesDialog { .result(dialog: "Done!") }
func perform() async throws -> some IntentResult & ReturnsValue<String> { .result(value: title) }
```

---

## Runtime: where and how an intent runs

All sources read 2026-11-13 on `https://developer.apple.com/tutorials/data/documentation/appintents/<symbol>.json`; change summary https://developer.apple.com/documentation/updates/appintents.

| API | Availability | Use |
|-----|--------------|-----|
| `static var supportedModes: IntentModes` | 26.0 | Foreground/background requirement: `.background`, `.foreground`, `.foreground(_:)` with `.immediate`, `.dynamic`, `.deferred`; combinable |
| `systemContext.currentMode` (`IntentModes.Current`) | 26.0 | Inside `perform()`: compare with `.foreground`/`.background`; `canContinueInForeground` says whether a background run may switch |
| `UndoableIntent` | 26.0 | Register undoable work via `@MainActor var undoManager: UndoManager?` |
| `SnippetIntent` | 26.0 | Interactive snippet: `perform()` returns `some IntentResult & ShowsSnippetView`, `.result(view:)`; `ShowTodoListIntent.reload()` refreshes it |
| `CancellableIntent` | 26.4 | Graceful cancel: `withIntentCancellationHandler(operation:onCancel:)`; `IntentCancellationReason` separates a deliberate cancel from a timeout |
| `LongRunningIntent` (: `ProgressReportingIntent`) | 27.0 | Extended background time: `performBackgroundTask(options:operation:)`; report through `progress` |
| `static var allowedExecutionTargets: IntentExecutionTargets` | 27.0 | Which process runs it: `.main`, `.appIntentsExtension`, `.widgetKitExtension`, `.default` |
| `EntityCollection<Entity>` | 27.0 | Parameter type holding identifiers only; `identifiers`, `resolvedEntities()`, `append`, `remove` |
| `SyncableEntity` (: `AppEntity`) | 27.0 | Entity id identical across devices; lets Siri continue a conversation on another device |
| `RunSystemShortcutIntent` | iOS/iPadOS/Mac Catalyst 27.0 | Widget-only: `init(shortcut:)` button that opens an app or runs an App Shortcut, custom shortcut or system action |

```swift
struct UploadFileIntent: LongRunningIntent {
    static var title: LocalizedStringResource { "Upload Large File" }
    @Parameter(title: "File") var file: IntentFile

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        let result = try await performBackgroundTask {
            progress.totalUnitCount = 100
            for chunk in 0..<100 {
                try Task.checkCancellation()
                await uploadChunk(chunk)
                progress.completedUnitCount = Int64(chunk + 1)
            }
            return "Upload complete!"
        }
        return .result(value: result)
    }
}

struct DisableAlarmsIntent: AppIntent {
    static var title: LocalizedStringResource { "Disable Alarms" }
    @Parameter(title: "Alarms") var alarms: EntityCollection<AlarmEntity>

    func perform() async throws -> some IntentResult {
        try await AlarmService.disable(alarms.identifiers)   // no hydration of every entity
        return .result()
    }
}
```

Both bodies follow Apple's `LongRunningIntent` and `EntityCollection` examples; the title is written in the computed form (see above).

Notes:
- A snippet's `perform()` can run several times: fetch fresh state each call.
- `RunSystemShortcutIntent` does nothing outside a widget; the person chooses the action when configuring the widget.
- `SyncableEntity`: if the id is already stable (e.g. a server UUID) just adopt it; if local and stable ids differ, follow the identifier type on https://developer.apple.com/documentation/appintents/syncableentity.
- iOS 27 release notes (Resolved Issues): an `AppEntity` instance has a cumulative size limit of 10 MB including child properties (the app might crash and the exception is logged when exceeded); a widget extension whose `WidgetConfigurationIntent` has a `@UnionValue` property might not render its timeline (resolved in 27).

---

## Best Practices

- Keep `perform()` fast unless it adopts `LongRunningIntent` - Siri has strict timeouts
- Use `@MainActor` when updating UI from intents
- Provide `suggestedEntities()` for quick parameter selection
- Use `AppShortcutsProvider` for automatic Spotlight/Siri exposure
- Declare `supportedModes` honestly; branch on `systemContext.currentMode` instead of assuming foreground
- Use `EntityCollection` for parameters that can hold many entities
