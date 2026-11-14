---
name: data-swiftdata-27
description: SwiftData 27 additions - sectioned @Query, the codable attribute option, ResultsObserver and HistoryObserver
when-to-use: grouping query results into sections, storing a Codable type you do not control, observing models or remote history outside a view
keywords: SwiftData, sectionBy, SectionedResults, ResultsSection, Attribute codable, ResultsObserver, HistoryObserver, ModelActor
priority: medium
requires: data-swiftdata.md
related: state-management.md
---

# SwiftData 27

All symbols below are `iOS 27.0 / iPadOS / macOS 27.0 / tvOS / visionOS / watchOS 27.0`, checked on their Apple JSON pages (`https://developer.apple.com/tutorials/data/documentation/swiftdata/<symbol>.json`) on 2026-11-13. Apple's summary of the changes: https://developer.apple.com/documentation/updates/swiftdata

## Sectioned @Query

Create the query with a macro that takes a `sectionBy` parameter (listed on https://developer.apple.com/documentation/swiftdata/query). The property type becomes `SectionedResults<Element, SectionTitle>`; each section is a `ResultsSection` that is itself a random-access collection of models.

```swift
@Query(sort: \.name, sectionBy: \.category)
var items: SectionedResults<Item, String>

ForEach(items) { section in
    Section(section.title) {
        ForEach(section) { item in Text(item.name) }
    }
}

let workCount = items[sectionTitle: "Work"]?.count ?? 0   // O(1) lookup by section title
```

`SectionedResults` also exposes `sectionTitles`, `contains(sectionTitle:)` and `index(ofSectionTitled:)`. Source: https://developer.apple.com/documentation/swiftdata/sectionedresults

## `codable` attribute option

`Schema.Attribute.Option.codable` ("Uses the property's codable representation to store the property") lets a model store a `Codable` type, including one you do not control. Pass it to `@Attribute`:

```swift
@Attribute(.codable) var address: Address     // Address: Codable
```

Source: https://developer.apple.com/documentation/swiftdata/schema/attribute/option/codable (declaration `static var codable: Schema.Attribute.Option`). `codable` sits beside `externalStorage`, `unique`, `transformable(by:)` and `ephemeral` in `Schema.Attribute.Option`, and `@Attribute` accepts `Schema.Attribute.Option...` (https://developer.apple.com/documentation/swiftdata/attribute(_:originalname:hashmodifier:)).

## ResultsObserver

`final class ResultsObserver<Element, SectionTitle>` observes a fetch outside a view (`@Observable`, so SwiftUI tracks it). It reacts to local changes, other contexts in the container, and external changes (other processes, CloudKit sync). Use `Never` as `SectionTitle` when not sectioning.

```swift
let observer = try ResultsObserver<Book, Never>(
    filterBy: #Predicate { $0.isPublished },
    sortBy: [SortDescriptor(\.title)],
    modelContext: context
)
let sectioned = try ResultsObserver<Book, String>(sectionBy: \.genre, modelContext: context)
```

Also available: `init(fetchDescriptor:modelContext:)`, `modelContainer:` variants, and the properties `results`, `sections`, `element(at:)`, `indexPath(for:)`. Source: https://developer.apple.com/documentation/swiftdata/resultsobserver

## HistoryObserver

`final class HistoryObserver` listens for `ModelContainer` remote-change notifications and bumps `eventCounter` when relevant history transactions arrive. It tracks its position in each store with `historyTokens`, so you process only new transactions. Scope it with `observedModels` (empty array = any change).

```swift
let observer = try HistoryObserver(observedModels: [Trip.self], modelContainer: container)
// react to observer.eventCounter changing (it is @Observable)
```

Sources: https://developer.apple.com/documentation/swiftdata/historyobserver, https://developer.apple.com/documentation/swiftdata/historyobserver/eventcounter

## Fixed in the iOS 27 SDK

Deadlock when saving a `ModelContext` on a background actor while scheduling new async tasks for a `ModelActor`, with a `@Query` active. Source: iOS & iPadOS 27 release notes, SwiftData > Resolved Issues (https://developer.apple.com/documentation/ios-ipados-release-notes/ios-ipados-27-release-notes, read 2026-11-13).
