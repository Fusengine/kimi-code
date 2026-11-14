---
name: core-data
description: Core Data today - when to keep it next to SwiftData, CloudKit mirroring with NSPersistentCloudKitContainer, persistent history, staged migrations, and async contexts
when-to-use: maintaining an existing Core Data store, deciding whether to migrate to SwiftData, adding CloudKit sync or history tracking to Core Data, migrating a model that lightweight migration cannot handle
keywords: NSPersistentContainer, NSPersistentCloudKitContainer, NSStagedMigrationManager, persistent history, NSPersistentHistoryTrackingKey, perform(schedule:), SwiftData coexistence
priority: medium
related: ../SKILL.md, cloudkit.md, ../../swiftui-core/references/data-swiftdata.md
---

# Core Data

Sources, read 2026-11-13: Core Data landing page https://developer.apple.com/documentation/coredata (JSON `.../tutorials/data/documentation/coredata.json`); Core Data has no framework updates page (404) and no new API in the 2025-2026 notes read; the article "Adopting SwiftData for a Core Data app" is dated iOS 27.0 / Xcode 27.0.

## Decision

| Situation | Choice |
|-----------|--------|
| New app | SwiftData ([data-swiftdata.md](../../swiftui-core/references/data-swiftdata.md)) |
| Existing Core Data app, no pressing need | Stay on Core Data |
| Moving gradually | Coexist: Apple's sample "Adopting SwiftData for a Core Data app" has three versions (Core Data, full SwiftData conversion, and a Core Data app with a widget extension that uses SwiftData over a shared App Group container) |
| Full conversion | Mirror entity names, properties and relationships one model file per entity; the sample uses `@Model`, `#Index`, `#Unique`, `ModelContainer` |

## Symbols (read on `documentation/coredata/<symbol>.json`)

| Need | Symbol | Availability |
|------|--------|--------------|
| Stack | `NSPersistentContainer` | 10.0 |
| CloudKit mirroring | `NSPersistentCloudKitContainer` (articles: mirroring a store with CloudKit, sharing objects between iCloud users) | 13.0 |
| Track changes across processes | store option `NSPersistentHistoryTrackingKey`, `NSPersistentStoreRemoteChangeNotificationPostOptionKey` set through `NSPersistentStoreDescription.setOption(_:forKey:)`; `NSPersistentHistoryChangeRequest` | 11.0 / 13.0 |
| Migrations beyond lightweight | `NSStagedMigrationManager` (article "staged-migrations": splits an incompatible migration into ordered compatible stages, with hooks before and after each stage) | 17.0 |
| Async context work | `NSManagedObjectContext.perform(schedule:_:)` (`async rethrows`, `ScheduledTaskType` default `.immediate`) | 15.0 |

## Rules

- Not every Core Data object is thread safe: a private queue context is reached only through `perform` / `performAndWait`; hand a managed object to another queue as its `NSManagedObjectID` (Apple, "Using Core Data in the background"). `NSManagedObjectContext` conforms to `Sendable`; `NSManagedObject` does not (its page lists no `Sendable`).
- Heavy imports (JSON to Core Data) go to a private queue context, never the main queue (same article).
- Enable history tracking and remote-change notifications on the store description before `loadPersistentStores`; the "persistent-history" and "consuming-relevant-store-changes" articles on the landing page cover consuming the transactions.
- Optional-to-required attribute changes need a staged migration (Apple's example: lightweight migration cannot infer the default for existing `nil` values).
- For CloudKit use one route per store: `NSPersistentCloudKitContainer` mirroring or your own `CKSyncEngine` mapping ([cloudkit.md](cloudkit.md)).

```swift
import CoreData

let container = NSPersistentContainer(name: "Model")
if let description = container.persistentStoreDescriptions.first {
    description.setOption(true as NSNumber, forKey: NSPersistentHistoryTrackingKey)
    description.setOption(true as NSNumber, forKey: NSPersistentStoreRemoteChangeNotificationPostOptionKey)
}
container.loadPersistentStores { _, error in
    if let error { assertionFailure("Store failed: \(error)") }
}

func count(in context: NSManagedObjectContext) async throws -> Int {
    try await context.perform {
        try context.count(for: NSFetchRequest<NSFetchRequestResult>(entityName: "Trip"))
    }
}
```

`context.perform { }` returning a value with `try` is the async form of `perform(schedule:_:)`; `Trip` is your entity name.
