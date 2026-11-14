---
name: user-notifications
description: UserNotifications - asking permission in context, provisional authorization, checking status, scheduling local notifications, foreground presentation, interruption levels, badge count, and the iOS 27 critical-alert fix
when-to-use: adding local or remote notification support, deciding when to ask permission, showing a notification while the app is open, setting the badge
keywords: UNUserNotificationCenter, requestAuthorization, provisional, UNNotificationRequest, UNUserNotificationCenterDelegate, willPresent, UNNotificationInterruptionLevel, setBadgeCount, criticalAlert
priority: medium
related: ../SKILL.md, ../../swiftui-core/references/hig-system-surfaces.md
---

# UserNotifications

Sources, read 2026-11-13: https://developer.apple.com/documentation/usernotifications (article "Asking permission to use notifications"), symbol pages `.../tutorials/data/documentation/usernotifications/<symbol>.json`, iOS 27 release notes (Notifications), UserNotifications updates page (latest entry June 2024). HIG notifications guidance: [hig-system-surfaces.md](../../swiftui-core/references/hig-system-surfaces.md).

## Symbols (iOS 10.0 / macOS 10.14 unless noted)

| Need | Symbol |
|------|--------|
| Center | `UNUserNotificationCenter.current()` |
| Ask permission | `requestAuthorization(options:)` (`async throws -> Bool`); `UNAuthorizationOptions`: `alert`, `badge`, `sound`, `carPlay`, `criticalAlert`, `providesAppNotificationSettings`, `provisional` (`timeSensitive` and `announcement` are Deprecated options) |
| Read status | `notificationSettings()` (`async`), `UNNotificationSettings.authorizationStatus`: `notDetermined`, `denied`, `authorized`, `provisional`, `ephemeral` |
| Schedule | `UNMutableNotificationContent`, `UNTimeIntervalNotificationTrigger(timeInterval:repeats:)`, `UNNotificationRequest(identifier:content:trigger:)`, `add(_:)` (`async throws`) |
| Foreground display | `UNUserNotificationCenterDelegate.userNotificationCenter(_:willPresent:)` (`async -> UNNotificationPresentationOptions`: `banner` (14.0), `list`, `sound`, `badge`) |
| Interruption | `UNMutableNotificationContent.interruptionLevel` (15.0): `passive`, `active`, `timeSensitive`, `critical` |
| Badge | `setBadgeCount(_:)` (`async throws`, iOS 16.0, macOS 13.0) |
| Manage | `getPendingNotificationRequests`, `removePendingNotificationRequests(withIdentifiers:)`, `removeDeliveredNotifications(withIdentifiers:)` |

## Rules (Apple's article)

- Ask in context, not at first launch: after the person schedules a first task, say. The first request prompts; later requests do not.
- Provisional authorization (`.provisional` added to the options) grants authorization without a prompt; notifications arrive quietly in Notification Center history with Keep and Turn Off buttons. It permits asking at first launch. The status stays `provisional` until the person chooses.
- Always check the status before scheduling local notifications: people change it at any time.
- iOS 27 note (radar 179179362): critical alerts were being turned on automatically for apps that request notification permission; fixed. Request `.criticalAlert` only for genuinely critical alerts.

```swift
import UserNotifications

@MainActor
final class Reminders: NSObject, UNUserNotificationCenterDelegate {
    private let center = UNUserNotificationCenter.current()

    func configure() {
        center.delegate = self
    }

    func schedule(_ title: String, in seconds: TimeInterval) async throws {
        let settings = await center.notificationSettings()
        if settings.authorizationStatus == .notDetermined {
            _ = try await center.requestAuthorization(options: [.alert, .sound, .badge])
        }
        let status = await center.notificationSettings().authorizationStatus
        guard status == .authorized || status == .provisional else { return }

        let content = UNMutableNotificationContent()
        content.title = title
        content.interruptionLevel = .active
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: seconds, repeats: false)
        try await center.add(UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: trigger))
    }

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter,
                                            willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        [.banner, .list, .sound]
    }
}
```

Samples are not compiled against the SDK here; the `async` forms of `requestAuthorization`, `add` and `notificationSettings()` and the `willPresent` async declaration were read on their symbol pages.
