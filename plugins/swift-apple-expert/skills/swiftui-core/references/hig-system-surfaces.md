---
name: hig-system-surfaces
description: HIG rules for widgets, Live Activities, notifications, App Shortcuts, Siri and snippets, with the verified framework types to use
when-to-use: building a WidgetKit widget, Live Activity, notification, App Shortcut, Siri integration or App Intent snippet
keywords: widget, WidgetKit, Live Activity, ActivityKit, Dynamic Island, notification, interruption level, App Shortcuts, Siri, snippet, App Intents
priority: high
related: app-intents.md, hig-accessibility.md
---

# HIG System Surfaces

Code for intents lives in `app-intents.md`; WidgetKit/ActivityKit APIs (push handler, controls, CarPlay/visionOS widgets, scheduled Live Activity start) in `widgetkit-activitykit.md`; this file holds the design rules.

## Widgets

Source: https://developer.apple.com/design/human-interface-guidelines/widgets

- One simple idea tied to the app's main purpose; timely, glanceable, dynamic content. Never a replica of the app icon.
- Offer multiple sizes only when each adds value; don't stretch small content to fill a large size.
- Brand lightly: no logo needed; if multi-source, a small logo top-right at most. Don't mirror the widget inside the app.
- Updates are budgeted, not real-time: show "last updated" when relevant; let the system render dates/times; animate changes (max 2 s).
- Tap opens the app **at the related location** (`widgetURL(_:)`); interactive buttons/toggles only for simple, relevant actions; inline accessory widgets have one tap target.
- Standard margins (16 pt for most widgets); use `ContainerRelativeShape` for concentric corners.
- Rendering modes: full color, **accented** (tinted / clear Liquid Glass Home Screen), **vibrant** (Lock Screen, StandBy low light). Mark accent views with `widgetAccentable(_:)`; read `widgetRenderingMode`; set backgrounds with `containerBackground(_:for:)`.
- watchOS complications are accessory widget families (`accessoryCircular`, `accessoryRectangular`, `accessoryInline`, `accessoryCorner`).
- **Apple HomeView** (HIG widgets, updated 2026-10-13; read 2026-11-13): widgets go on the Modular face and Home Screen, use the **small** system family and share the iPhone widget appearance (light, dark, clear, tinted); on the Modular face the widget is scaled up with the background removed. Each enrolled household member has a personal Home Screen.
- **watchOS Smart Stack widget sizes** (pt, HIG "watchOS dimensions"): 40mm 152x69.5; 41mm 165x72.5; 42mm 176x72.5; 44mm 173x76.5; 45mm 184x80.5; 46mm 194x80.5; 49mm Ultra 3/4 198x81.5; 49mm Ultra 1/2 191x81.5. Default Smart Stack background is black; use a custom color only when it adds meaning.

## Live Activities

Source: https://developer.apple.com/design/human-interface-guidelines/live-activities

- Only for tasks/events with a defined start and end, ideally under eight hours. No ads, no sensitive data (redact or summarize - `privacySensitive(_:)`).
- Must support compact, minimal, expanded (Dynamic Island) and Lock Screen presentations; also appear in StandBy, Mac menu bar, Apple Watch Smart Stack, CarPlay.
- Large, medium-or-heavier text; concentric margins; dynamic height; custom background only on Lock Screen (check contrast on Always-On, `isLuminanceReduced`).
- Logo mark without container, never the full app icon. Don't add app UI that points at the Dynamic Island.
- Animations max 2 s (none on reduced-luminance Always-On). Update only on new content; alert only for essential updates; never duplicate with push notifications.
- Max one interactive element ideally; tap deep-links to the related screen. Let people stop it from inside the app; offer an App Shortcut to start it.
- Types: `ActivityConfiguration`, `DynamicIsland`, `Activity.request(attributes:content:pushType:)`, `ActivityContent`.
- **Limited-width layouts** (HIG live-activities, updated 2026-10-13; read 2026-11-13): the HIG cites iPhone in landscape; the `isDynamicIslandLimitedInWidth` doc page adds iPhone Duo and iPhone 18 Pro with two or more active Live Activities, where the system renders compact and minimal presentations with reduced width. Fit compact/minimal inside a **28x28 pt circle** (short abbreviation or graphic, no full text). If both limited-width compact views do not make sense, provide the leading view and an empty trailing view; the system hides the trailing one. API: `EnvironmentValues.isDynamicIslandLimitedInWidth` (iOS/iPadOS 27.0; macOS 27.3 is beta in Apple's docs on 2026-11-13) - `@Environment(\.isDynamicIslandLimitedInWidth)`, branch the compact view on it. Live Activity size: `ActivityFamily` `.small` / `.medium` (iOS 18.0; `activityFamily` environment value).

## Notifications

Sources: https://developer.apple.com/design/human-interface-guidelines/notifications, https://developer.apple.com/design/human-interface-guidelines/managing-notifications

- Permission first (`requestAuthorization(options:completionHandler:)`), ideally when the benefit is clear.
- Pick an honest `interruptionLevel`: `.passive`, `.active` (default), `.timeSensitive` (happening now / within an hour), `.critical` (health & safety, entitlement required).
- **Never** Time Sensitive for marketing; marketing notifications need explicit opt-in plus an in-app setting to change it.
- Concise; no duplicates; no "go do X in the app"; no sensitive data; no app name/icon in content (system adds it).
- Title-style title without ending punctuation; body in sentence case with punctuation. Provide `hiddenPreviewsBodyPlaceholder` ("New comment").
- Up to four actions: short title-case verbs, SF Symbol icon, prefer nondestructive, no "Open app" action.
- In foreground, surface the info subtly (badge, inline insert) instead of an alert. Badges only for unread counts.
- Errors -> alert, not notification.

## App Shortcuts & Siri

Sources: https://developer.apple.com/design/human-interface-guidelines/app-shortcuts, https://developer.apple.com/design/human-interface-guidelines/siri

- Up to 10 App Shortcuts (`AppShortcutsProvider`) for the most common tasks; available right after install. Not supported on tvOS; on macOS only via the Shortcuts app.
- Prefer **app schemas** when the app fits a common domain (mail, photos, music...) so Siri AI understands it without custom shortcuts.
- Phrases: short, memorable, include the app name; one optional parameter max with predictable values; ask follow-ups for missing info.
- Full spoken dialogue must stand alone (audio-only devices); responses succinct, no humor or ads, inclusive wording ("Who should I send it to?").
- Annotate on-screen content with app entities and donate relevant actions so Siri understands context.
- Write "App Shortcuts" / "Shortcuts" in title case, plural.

## Snippets

Source: https://developer.apple.com/design/human-interface-guidelines/snippets

- Two types: **confirmation** (Cancel + primary button) and **result** (Done). iOS/iPadOS/macOS only.
- Custom view max **400 pt** tall, text sized for large Dynamic Type; deep-link for more detail.
- Primary button label descriptive ("Order"), never OK/Proceed (system default is "Continue").
- Convey meaning visually; don't rely on repeating the spoken dialogue. Check contrast in light and dark.
