---
name: cloudkit
description: CloudKit sync with CKSyncEngine and share access requests (CKShareRequestAccessOperation), plus how CloudKit relates to SwiftData and Core Data mirroring
when-to-use: building custom iCloud sync, handling shared records, deciding between CKSyncEngine, SwiftData CloudKit sync and NSPersistentCloudKitContainer
keywords: CKSyncEngine, CKSyncEngineDelegate, CKShareRequestAccessOperation, CKShare, CKRecordZone, stateSerialization, iCloud
priority: medium
related: ../SKILL.md, core-data.md, ../../swiftui-core/references/data-swiftdata.md
---

# CloudKit

Sources, read 2026-11-13: CloudKit landing page https://developer.apple.com/documentation/cloudkit (JSON `.../tutorials/data/documentation/cloudkit.json`); CloudKit has no framework updates page (404); symbol pages `.../documentation/cloudkit/<symbol>.json`; iOS 27 release notes (CloudKit "Resolved Issues").

## Choose the route

| Route | Use when |
|-------|----------|
| SwiftData with CloudKit | New app on SwiftData: [data-swiftdata.md](../../swiftui-core/references/data-swiftdata.md) |
| `NSPersistentCloudKitContainer` | Existing Core Data store: [core-data.md](core-data.md) |
| `CKSyncEngine` | Own persistence layer, custom record mapping |
| Raw `CKContainer` / `CKDatabase` operations | One-off reads, sharing flows |

Apple's landing page lists "Deciding whether CloudKit is right for your app" and "Enabling CloudKit in your app" as the starting articles: read them for the iCloud capability and container setup.

## Symbols

| Need | Symbol | Availability |
|------|--------|--------------|
| Sync engine | `CKSyncEngine(_:)` with `CKSyncEngine.Configuration(database:stateSerialization:delegate:)` | 17.0, macOS 14.0 |
| Delegate | `CKSyncEngineDelegate`: `handleEvent(_:syncEngine:)`, `nextRecordZoneChangeBatch(_:syncEngine:)`, `nextFetchChangesOptions(_:syncEngine:)` | 17.0 |
| Queue local changes | `engine.state.add(pendingRecordZoneChanges:)`, `add(pendingDatabaseChanges:)` | 17.0 |
| Manual sync | `fetchChanges(_:)`, `sendChanges(_:)`, `cancelOperations()` | 17.0 |
| Events | `CKSyncEngine.Event`: `stateUpdate`, `accountChange`, `fetchedDatabaseChanges`, `fetchedRecordZoneChanges`, `sentDatabaseChanges`, `sentRecordZoneChanges` | 17.0 |
| Ask the owner for access to a share | `CKShareRequestAccessOperation(shareURLs:)` with `perShareAccessRequestResultBlock` (`(URL, Result<Void, any Error>) -> Void`) and `shareAccessRequestResultBlock` | 26.0, all platforms |

`CKShareRequestAccessOperation` is a new operation class listed under "Classes" on the CloudKit landing page; the symbol page has no abstract, so confirm behavior with a two-account test before shipping.

## CKSyncEngine rules

- Persist the engine state: on the `stateUpdate` event, write `CKSyncEngine.State.Serialization` to disk and pass it back as `stateSerialization` at the next launch. Without it the engine refetches everything.
- You own the local store: the engine tells you what changed (`fetchedRecordZoneChanges`) and asks for what to send (`nextRecordZoneChangeBatch`); it does not persist records.
- Handle `accountChange` (sign-out, account switch): clear or re-associate local data deliberately.
- iOS 27 fix (release notes): saving a `CKShare` where an administrator participant demotes themselves to `CKShareParticipantRole.privateUser` previously had no effect (radar 177621316).

```swift
import CloudKit

final class SyncCoordinator: CKSyncEngineDelegate, @unchecked Sendable {
    private(set) var engine: CKSyncEngine!

    init(database: CKDatabase, savedState: CKSyncEngine.State.Serialization?) {
        let configuration = CKSyncEngine.Configuration(
            database: database, stateSerialization: savedState, delegate: self)
        engine = CKSyncEngine(configuration)
    }

    func handleEvent(_ event: CKSyncEngine.Event, syncEngine: CKSyncEngine) async {
        switch event {
        case .stateUpdate(let update):
            save(update.stateSerialization)          // persist to disk
        case .fetchedRecordZoneChanges(let changes):
            apply(changes)                           // write to your local store
        default:
            break
        }
    }

    func nextRecordZoneChangeBatch(_ context: CKSyncEngine.SendChangesContext,
                                   syncEngine: CKSyncEngine) async -> CKSyncEngine.RecordZoneChangeBatch? {
        nil                                          // build a batch from pending changes
    }

    private func save(_ state: CKSyncEngine.State.Serialization) {}
    private func apply(_ changes: CKSyncEngine.Event.FetchedRecordZoneChanges) {}
}
```

`CKSyncEngine.Event.StateUpdate.stateSerialization` (17.0), `FetchedRecordZoneChanges.modifications` / `deletions`, `RecordZoneChangeBatch(pendingChanges:recordProvider:)` and `SendChangesContext.reason` / `options` were read on their symbol pages.
