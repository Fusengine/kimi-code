---
name: workouts
description: watchOS workout sessions with HealthKit, heart rate, calories, and fitness tracking
when-to-use: implementing fitness features, tracking workouts, accessing health data
keywords: HKWorkoutSession, HealthKit, workout, heart rate, calories, fitness
priority: high
related: complications.md, watch-connectivity.md
---

# watchOS Workouts

## When to Use

- Fitness app development
- Workout tracking
- Health data collection
- Real-time metrics display
- Activity rings contribution

## Key Concepts

### Where these classes run (not watch-only)

| Class | iOS/iPadOS | watchOS | Other |
|-------|------------|---------|-------|
| `HKWorkoutSession` | 17.0+ | 2.0+ | visionOS 1.0, macOS |
| `HKLiveWorkoutBuilder` | 26.0+ | 5.0+ | macOS |

Source: Apple documentation JSON pages read 2026-11-13 (https://developer.apple.com/documentation/healthkit/hkworkoutsession, .../hkliveworkoutbuilder). Apple's article "Running workout sessions" (https://developer.apple.com/documentation/healthkit/running-workout-sessions) is framed around Apple Watch: while a session runs, the system tunes the watch sensors for the activity, and every session generates high-frequency heart rate samples. A live builder on iOS (26.0+) is documented as a symbol; this skill covers the watchOS flow. For HealthKit on iOS (authorization, queries, medications), see the `apple-frameworks` skill instead of duplicating it here.

### HKWorkoutSession
Manages active workout state.

**Key Points:**
- Request authorization first (share `HKQuantityType.workoutType()`, read the quantity types you display)
- Configure workout type with `HKWorkoutConfiguration` (`activityType`, `locationType`)
- Start/pause/resume/end
- Active session lets the app run in the background: add the Workout processing background mode to the watchOS app, plus the Audio background mode if it plays audio or provides haptics during the workout
- Background audio clips (coaching, notifications) are valid only while a workout session is running (Apple article, read 2026-11-13)

### HKLiveWorkoutBuilder
Collects data during workout.

**Key Points:**
- Obtained from the session: `session.associatedWorkoutBuilder()`
- Auto-collects metrics
- Saves to HealthKit
- Provides data stream

```swift
// From Apple's "Running workout sessions"
let configuration = HKWorkoutConfiguration()
configuration.activityType = .running
configuration.locationType = .outdoor

do {
    session = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
    builder = session.associatedWorkoutBuilder()
} catch {
    // Handle failure here.
    return
}
```

### Workout zones (27.0)

Workout zones divide measurements like heart rate and cycling power into ranges that represent training intensities. People configure zones in Health Settings: system-generated from their health metrics, or manually defined ranges. HealthKit calculates time in zone during workouts. Source: https://developer.apple.com/documentation/healthkit/accessing-workout-zone-data (read 2026-11-13).

| Symbol | Role | Available |
|--------|------|-----------|
| `HKWorkoutZoneConfiguration` | Complete set of zones for a quantity type: an ordered array of zones plus the configuration `source`; apps can supply custom zones for specific workouts | iOS, iPadOS, Mac Catalyst, macOS, visionOS, watchOS 27.0 |
| `HKWorkoutZoneGroup` | Zone configuration plus time-in-zone data (`HKWorkoutZoneDuration` array) for a quantity type | same, 27.0 |
| `HKLiveWorkoutZoneUpdate` | Information about zone transitions during a live workout session | iOS, iPadOS, Mac Catalyst, watchOS 27.0 (macOS listed, no version) |
| `HKHealthStore.preferredWorkoutZoneConfiguration(for:)` | `func preferredWorkoutZoneConfiguration(for: HKQuantityType) async throws -> HKWorkoutZoneConfiguration?` | iOS, iPadOS, Mac Catalyst, macOS, visionOS, watchOS 27.0 (per review of the page) |

- Zone groups are available from `HKWorkout` and `HKWorkoutActivity` for completed workouts and from `HKWorkoutBuilder` for real-time zone data during an active workout.
- Reading zone data needs permission: call `HKHealthStore.requestAuthorization(toShare:read:)` first.
- Zones are not on tvOS (no tvOS entry on these pages).

### Workout Types

| Type | Activity |
|------|----------|
| running | Outdoor/indoor run |
| cycling | Bike riding |
| swimming | Pool/open water |
| hiking | Outdoor hiking |
| yoga | Yoga session |
| other | Custom activity |

### Health Metrics

**Available Data:**
- Heart rate (BPM)
- Active calories
- Distance
- Pace/speed
- Steps
- Elevation

---

## Authorization

**Required:**
- Add HealthKit capability
- Request permissions per data type
- Handle denial gracefully
- Explain usage in Info.plist

---

## Workout Lifecycle

1. **Configure** - Set workout type, location
2. **Request Auth** - Get HealthKit permissions
3. **Create Session** - HKWorkoutSession
4. **Start** - Begin collection
5. **Collect** - Stream metrics
6. **End** - Stop and save
7. **Save** - Persist to HealthKit

---

## Best Practices

- ✅ Request only needed permissions
- ✅ Handle authorization denial
- ✅ Display real-time metrics
- ✅ Support workout pause/resume
- ✅ Save workout to HealthKit
- ❌ Don't access data without auth
- ❌ Don't drain battery unnecessarily
- ❌ Don't skip proper session end
