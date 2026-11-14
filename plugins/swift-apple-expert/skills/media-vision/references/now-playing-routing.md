# Now Playing, Media Device, AVSystemRouting, AVKit

Verified 2026-11-13 on `https://developer.apple.com/tutorials/data/documentation/<path>.json`. All four new frameworks are 27.0 and have no Apple "updates" page (404), so availability comes from each landing page and symbol page.

## Overview

| Framework | Availability (landing page) | Role |
|-----------|-----------------------------|------|
| `NowPlaying` | iOS/iPadOS/Mac Catalyst/macOS/tvOS/visionOS/watchOS 27.0 | Publish playback to Lock Screen, Control Center, Apple Watch, CarPlay |
| `MediaDevice` | iOS/iPadOS/Mac Catalyst 27.0 | A device extension that makes your playback hardware appear in the system media device picker |
| `AVSystemRouting` | iOS/iPadOS/Mac Catalyst 27.0 | App side: send media to third-party devices exposed by Media Device extensions |
| `MediaIntents` | 27.0, all platforms | Siri audio search (landing page only; not covered here) |

Decision: your app plays media on this device, use `MediaSession`. Your app mirrors an external device's playback (speaker, TV), use `RemoteMediaSession`. You build the hardware's iOS side, use `MediaDeviceExtension`. Your app sends media to such a device, use `AVSystemRouting`.

## Local session (`MediaSession`, 27.0, `@MainActor`)

Pattern from Apple's article `nowplaying/publishing-media-sessions`: conform an `@Observable @MainActor` type to `MediaSessionRepresentable` (needs `id`, `content`, `playbackSnapshot`, `commands`), wrap it in `MediaSession`, then request primary status.

```swift
import NowPlaying
import Observation

@Observable
@MainActor
final class AudioPlayer: MediaSessionRepresentable {
    let id = UUID().uuidString
    var isPlaying = false
    var elapsedTime: TimeInterval = 0
    var timestamp: Date = .now
    var session: MediaSession<AudioPlayer>?

    var content: (any MediaContentRepresentable)? {
        MusicContent(id: "track-1", songTitle: "Title", artistName: "Artist", albumName: "Album",
                     type: .audio, duration: .finite(180), artwork: nil)
    }
    var playbackSnapshot: MediaPlaybackSnapshot? {
        MediaPlaybackSnapshot(state: isPlaying ? .playing() : .paused, elapsedTime: elapsedTime, timestamp: timestamp)
    }
    var commands: [MediaCommand] { [.play { self.isPlaying = true }, .pause { self.isPlaying = false }] }

    func activate() async throws {
        let session = MediaSession(self)
        self.session = session
        try await session.requestToBecomeApplicationPrimary()
    }
}
```

Provide elapsed time and a timestamp so the system extrapolates the position between updates. Set `session = nil` when playback ends to remove it from the system. Other `MediaSession` members: `requestToBecomeSystemPrimary()`, `isApplicationPrimary`, `isSystemPrimary`, `canBecomeApplicationPrimary`. `MediaCommand.enabled(_:)` greys a control without removing it. Pages: `nowplaying/mediasession`, `.../musiccontent`, `.../mediaplaybacksnapshot`, `.../mediacommand`, `.../artwork` (all 27.0).

## Remote session (`RemoteMediaSession`, iOS/iPadOS/Mac Catalyst 27.0)

Uses an app extension conforming to `RemoteMediaSessionExtension`; your server sends push notifications to start and update sessions. Known issue (iOS 27 release notes, Now Playing): `RemoteMediaSession` and `RemoteMediaSessionRepresentable` always provision push tokens for the `production` APNs environment even when `aps-environment` is `development`. Workaround from Apple: use the `production` environment for testing and validation.

## Media Device and AVSystemRouting (iOS/iPadOS 27.0)

- `MediaDeviceExtension` (`@MainActor` protocol, an `AppExtension`): discovery, activation, playback; devices are reported through `MediaDeviceRoutingManager`; types `MediaOutputDevice`, `MediaOutputSession`. Real-time streaming (screen mirroring) also needs an audio server driver plug-in and `RealtimeSampleHandling`.
- `AVSystemRouteController` + `AVSystemRouteControllerObserver` receive `AVSystemRouteEvent`; start an `AVSystemRouteSession` on the `AVSystemRoute`; control playback with `AVSystemRouteMediaSession`; companion-app data through `AVSystemRoute.DataChannel` and `AVSystemRouteDataDelegate`. Supported protocols are declared in the Info pane.
- iOS 27 release notes, "Media Sharing Extensions": extensions using the new framework could build but not run on devices because of a runtime mismatch with the mandatory entitlement; listed as fixed. Re-test on your target build.

Articles: `mediadevice/creating-a-media-device-extension`, `avsystemrouting/routing-media-to-third-party-devices`.

## AVKit playback

`AVPlayerViewController` (iOS 8.0, tvOS 9.0, visionOS 1.0, `@MainActor`) and SwiftUI `VideoPlayer` (iOS 14.0, macOS 11.0, tvOS 14.0, visionOS 1.0, watchOS 7.0) are long-standing and verified. Generated subtitles and subtitle style preview (WWDC26 session 256) are session claims: https://developer.apple.com/videos/play/wwdc2026/256/. tvOS playback details: `tvos/references/media-playback.md`.

## Migration note

The legacy MediaPlayer path (`MPNowPlayingInfoCenter`, `MPRemoteCommandCenter`) is not re-verified in this skill. For new 27.0+ targets Apple publishes the Now Playing framework as the path to system surfaces; for older deployment targets keep the existing code.
