---
name: data-swiftdata
description: SwiftData for persistence with @Model, @Query, relationships, CloudKit sync
when-to-use: storing app data, creating database models, syncing with iCloud, managing relationships
keywords: SwiftData, Model, Query, Predicate, ModelContext, CloudKit, persistence
priority: high
requires: state-management.md
related: architecture.md
---

# SwiftData Persistence

## When to Use

- Storing structured app data
- Creating database models with relationships
- Syncing data with iCloud/CloudKit
- Querying and filtering data
- Replacing Core Data in new apps

## Key Concepts

### @Model Macro (iOS 17+)
Defines persistent model classes. Automatically generates schema.

**Key Points:**
- Apply to a `class`. A base class you subclass cannot be `final`: Apple's inheritance article declares `@Model class Trip` and `@Model class BusinessTrip: Trip`. Mark leaf models `final` only when nothing subclasses them. Source: https://developer.apple.com/documentation/swiftdata/adopting-inheritance-in-swiftdata (read 2026-11-13)
- Properties are automatically persisted
- Use `@Attribute(.unique)` for unique constraints
- Use `@Relationship` for associations

### @Query Macro
Declarative data fetching in SwiftUI views.

**Key Points:**
- Automatically updates when data changes
- Supports filtering with `#Predicate`
- Supports sorting with key paths
- Can limit results and paginate

### #Predicate
Type-safe query predicates.

**Key Points:**
- Swift syntax for queries
- Compile-time type checking
- Supports complex conditions
- Combinable with && and ||

### ModelContext
Manages object lifecycle and saves changes.

**Key Points:**
- Inject via `@Environment(\.modelContext)`
- `insert()` for new objects
- `delete()` for removal
- Auto-saves by default

### Relationships
Define associations between models.

**Key Points:**
- `@Relationship` with delete rules
- Inverse relationships for bidirectional
- Cascade delete for dependent data
- Many-to-many supported

### CloudKit Sync
Automatic iCloud synchronization.

**Key Points:**
- Configure in ModelConfiguration
- Private or shared database
- Automatic conflict resolution
- Requires iCloud entitlement

---

## When to Use What

| Solution | Use Case |
|----------|----------|
| @AppStorage | Simple preferences, settings |
| @SceneStorage | Window-specific UI state |
| **SwiftData** | Complex models, relationships |
| Core Data | iOS < 17, advanced migrations |
| Keychain | Sensitive data (tokens, passwords) |
| FileManager | Documents, large files |

---

## iOS 26: Model Inheritance

SwiftData now supports class inheritance.

```swift
@Model class Vehicle {
    var manufacturer: String
    var year: Int
}

@Model class Car: Vehicle {
    var numberOfDoors: Int
}

@Model class Motorcycle: Vehicle {
    var hasWindshield: Bool
}
```

**Use when:** Natural "is-a" relationships, shared properties.
**Avoid when:** Single shared property (use protocols), leaf-only queries.

### Schema Migrations

There is no `@Schema` macro (`Schema` is a final class). A migration is a `VersionedSchema` per version, a `SchemaMigrationPlan` that orders them, and a `MigrationStage` per hop. Inheritance changes migrate the same way; each version lists its model types in `models`.

```swift
enum SchemaV1: VersionedSchema {
    static var versionIdentifier: Schema.Version { Schema.Version(1, 0, 0) }
    static var models: [any PersistentModel.Type] { [Vehicle.self] }   // v1 model types
}

enum SchemaV2: VersionedSchema {
    static var versionIdentifier: Schema.Version { Schema.Version(2, 0, 0) }
    static var models: [any PersistentModel.Type] { [Vehicle.self, Car.self] }
}

enum AppMigrationPlan: SchemaMigrationPlan {
    static var schemas: [any VersionedSchema.Type] { [SchemaV1.self, SchemaV2.self] }
    static var stages: [MigrationStage] {
        [.lightweight(fromVersion: SchemaV1.self, toVersion: SchemaV2.self)]
    }
}

let container = try ModelContainer(
    for: Schema(versionedSchema: SchemaV2.self),
    migrationPlan: AppMigrationPlan.self,
    configurations: []
)
```

`MigrationStage.custom(fromVersion:toVersion:willMigrate:didMigrate:)` takes optional `@Sendable (ModelContext) throws -> Void` closures for data transforms (all iOS 17.0+, verified on the JSON pages of `versionedschema`, `schemamigrationplan`, `migrationstage`, `modelcontainer`, `schema`; read 2026-11-13, e.g. https://developer.apple.com/documentation/swiftdata/schemamigrationplan).

### Query Subclasses

```swift
// All vehicles
let all = try context.fetch(FetchDescriptor<Vehicle>())

// Only cars with predicate
let sedans = try context.fetch(
    FetchDescriptor(predicate: #Predicate<Car> { $0.numberOfDoors == 4 })
)
```

---

## Best Practices

- ✅ Use @Attribute(.unique) for identifiers
- ✅ Define deleteRule on relationships
- ✅ Use @Query instead of manual fetches
- ✅ Use inheritance for true "is-a" hierarchies
- ✅ Test CloudKit with real devices
- ❌ Don't store sensitive data (use Keychain)
- ❌ Don't store large blobs (use FileManager)
- ❌ Don't overuse inheritance (prefer composition)

→ SwiftData 27 (query sections, `codable` option, observers): [data-swiftdata-27.md](data-swiftdata-27.md)
→ See `templates/swiftdata-model.md` for code examples
