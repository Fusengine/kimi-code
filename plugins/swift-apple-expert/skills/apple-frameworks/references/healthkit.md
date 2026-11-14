---
name: healthkit
description: HealthKit on iOS - workout sessions on iPhone and iPad, medications and dose events, workout zones (heart rate and cycling power, iOS 27), and the limited-history permission flow
when-to-use: building a workout app on iPhone, reading medications and doses, showing time-in-zone or live zone changes, handling a person who granted only recent history
keywords: HKWorkoutSession, HKLiveWorkoutBuilder, HKUserAnnotatedMedicationQueryDescriptor, HKMedicationDoseEvent, HKWorkoutZoneGroup, HKWorkoutZoneConfiguration, preferredWorkoutZoneConfiguration, getEarliestAuthorizedSampleDate, requestPerObjectReadAuthorization
priority: medium
related: ../SKILL.md, ../../watchos/references/workouts.md
---

# HealthKit (iOS)

Sources, read 2026-11-13: HealthKit updates page https://developer.apple.com/documentation/updates/healthkit (June 2025, June 2026); WWDC25 sessions 322 "Track workouts with HealthKit on iOS and iPadOS" and 321 "Meet the HealthKit Medications API"; WWDC26 session 207 "Deliver workout insights with HealthKit workout zones" (https://developer.apple.com/videos/play/wwdc2026/207/); article https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data; symbol pages `.../tutorials/data/documentation/healthkit/<symbol>.json`. Watch-side workouts: [workouts.md](../../watchos/references/workouts.md).

## Workout sessions on iOS and iPadOS (iOS 26.0)

`HKLiveWorkoutBuilder` and `HKLiveWorkoutBuilderDelegate` are iOS/iPadOS/Mac Catalyst 26.0 (watchOS 5.0); `HKHealthStore.recoverActiveWorkoutSession` iOS 26.0; `HKWorkoutSession` iOS 17.0. Apple's sample guides: "Building a workout app for iPhone and iPad", "Building a multidevice workout app".

Session 322 flow: configure `HKWorkoutConfiguration` (`activityType`, `locationType`), create `HKWorkoutSession(healthStore:configuration:)`, take `associatedWorkoutBuilder()`, set `builder.dataSource = HKLiveWorkoutDataSource(...)`, `session.prepare()`, then `session.startActivity(with:)` and `try await builder.beginCollection(at:)`. Read live values in `workoutBuilder(_:didCollectDataOf:)` through `builder.statistics(for:)`. End: `session.stopActivity(with:)`, wait for `.stopped` in the session delegate, `endCollection(at:)`, `finishWorkout()`, `session.end()`.

**Crash recovery** (session 322): in `application(_:configurationForConnecting:options:)`, if `options.shouldHandleActiveWorkoutRecovery` (iOS 26.0) call `store.recoverActiveWorkoutSession()` (`async throws -> HKWorkoutSession?`), then rebuild delegates, builder and data source from the recovered session. Siri workout intents (`INStartWorkoutIntent` handlers) are covered in the session.

## Medications (iOS 26.0; the per-object authorization calls date from iOS 16.0)

| Need | Symbol |
|------|--------|
| Medication object | `HKUserAnnotatedMedication` (`isArchived`, `hasSchedule`, `nickname`, `medication`) with `HKMedicationConcept` (`identifier`, display text, general form, `relatedCodings` such as RxNorm) |
| Dose | `HKMedicationDoseEvent`, an `HKSample` tied to a concept identifier; log status taken, skipped, snoozed or not interacted; scheduled date and quantity |
| Fetch medications | `HKUserAnnotatedMedicationQueryDescriptor(predicate:limit:)` (predicates for archived and scheduled) |
| Fetch doses | any sample query with the `HKMedicationDoseEvent` sample type, including `HKAnchoredObjectQuery` and its async stream |
| Authorize | per-object: `HKUserAnnotatedMedicationType` via `HKObjectType.userAnnotatedMedicationType()`, `requiresPerObjectAuthorization()`, `requestPerObjectReadAuthorization(for:predicate:)` (`async throws`) |

Session 321 rules: authorizing a medication also grants its dose events, no separate request; people can add a newly created medication to your app from inside Health; with anchored queries expect backdated, deleted and re-persisted dose events and unattended scheduled doses (handle deletions, keep the returned anchor). Available on iOS, iPadOS, visionOS, per the session intro.

## Workout zones (iOS 27.0, iPadOS, watchOS 27.0; macOS and visionOS symbols exist)

| Need | Symbol |
|------|--------|
| Zones of a finished workout | `HKWorkout.zoneGroupsByType` / `HKWorkoutActivity.zoneGroupsByType` (`[HKQuantityType : HKWorkoutZoneGroup]?`), key `HKQuantityType(.heartRate)` or cycling power |
| Group content | `HKWorkoutZoneGroup.configuration` (`HKWorkoutZoneConfiguration`: `quantityType`, `zones`, `source` = `system`, `user`, `app`) and `zoneDurations` (`HKWorkoutZoneDuration`) |
| Live updates | `HKLiveWorkoutBuilderDelegate.workoutBuilder(_:didUpdateWorkoutZone:)` with `HKLiveWorkoutZoneUpdate` (`currentZoneDuration`, `previousZoneDuration`, `zoneGroup`, `lastSampleProcessedDate`); sent only when the zone changes; not on macOS |
| Person's zones | `HKHealthStore.preferredWorkoutZoneConfiguration(for:)` and `HKWorkoutBuilder.zoneConfiguration(for:)` (both `async throws`, optional result) |
| Custom zones | `HKWorkoutZoneConfiguration(quantityType:zoneBoundaries:)` (throws), `HKWorkoutBuilder.setCustomZoneConfiguration(_:for:)` |

Rules (session 207): zones are contiguous and non-overlapping, first zone has no lower bound and last none upper; custom boundaries need compatible units and **3 to 9 zones**; set the custom configuration **before** `beginCollection`; HealthKit does not persist custom configurations (your app saves and syncs them); zone counts differ between workouts (cycling power defaults to 6, apps use 5 to 8), so normalize before comparing time-in-zone across workouts; request authorization for workouts and the quantity type first.

```swift
let heartRate = HKQuantityType(.heartRate)
if try await builder.zoneConfiguration(for: heartRate) == nil {
    let bpm = HKUnit.count().unitDivided(by: HKUnit.minute())
    let boundaries = [91.0, 114.0, 136.0, 158.0].map { HKQuantity(unit: bpm, doubleValue: $0) }
    let config = try HKWorkoutZoneConfiguration(quantityType: heartRate, zoneBoundaries: boundaries)
    try await builder.setCustomZoneConfiguration(config, for: heartRate)
}
try await builder.beginCollection(at: Date())
```

## Limited-history permission (iOS 27.0)

iOS 27 notes: "Updated HealthKit permissions flow now lets users grant apps access to limited history or full history" (radar 172310874). Apple's authorization article: after the data-type screen a second screen chooses a recent window or full history; the limit applies to sample types only. `getEarliestAuthorizedSampleDate(for:completion:)` (iOS 27.0) or its async form `earliestAuthorizedSampleDate(for:)` returns the earliest date per type; call it after requesting authorization and start your predicate at that date. HealthKit hides full-access versus denied (both give no entry), so limited authorization is the only state you can positively detect. Do not read missing old samples as "no history".
