---
name: media-playback
description: AVKit video playback with AVPlayer, AVPlayerViewController, and picture-in-picture
when-to-use: implementing video streaming, audio playback, media controls, PiP support
keywords: AVKit, AVPlayer, video, streaming, media, playback, PiP
priority: high
related: focus-system.md, remote-control.md
---

# Media Playback

## When to Use

- Video streaming applications
- Audio playback
- Live content
- Picture-in-picture
- Custom player controls

## Key Concepts

### AVPlayerViewController (system player UI)

`AVPlayerViewController` (AVKit, tvOS 9.0+) is the class that gives your app the tvOS system playback experience: the same features and interactions as the Apple TV app, including Siri Remote voice commands and Picture in Picture. Apple's tvOS article: https://developer.apple.com/documentation/avkit/customizing-the-tvos-playback-experience (read 2026-11-13). Use it from SwiftUI through a representable:

```swift
import AVKit
import SwiftUI

struct SystemPlayerView: UIViewControllerRepresentable {
    let player: AVPlayer

    func makeUIViewController(context: Context) -> AVPlayerViewController {
        let controller = AVPlayerViewController()
        controller.player = player
        return controller
    }

    func updateUIViewController(_ controller: AVPlayerViewController, context: Context) {
        controller.player = player
    }
}
```

### SwiftUI VideoPlayer

`VideoPlayer` (AVKit, tvOS 14.0+; https://developer.apple.com/documentation/avkit/videoplayer, read 2026-11-13) is the SwiftUI view that shows a player with a native control UI.

```swift
import AVKit

struct VideoPlayerView: View {
    let url: URL
    @State private var player: AVPlayer?

    var body: some View {
        VideoPlayer(player: player)
            .onAppear {
                player = AVPlayer(url: url)
                player?.play()
            }
    }
}
```

### Custom Player

```swift
struct CustomPlayer: View {
    @State private var player = AVPlayer()
    @State private var isPlaying = false

    var body: some View {
        VideoPlayer(player: player)
            .overlay(alignment: .bottom) {
                CustomControls(isPlaying: $isPlaying)
            }
    }
}
```

### Streaming with HLS

```swift
let hlsURL = URL(string: "https://example.com/stream.m3u8")!
let playerItem = AVPlayerItem(url: hlsURL)
player.replaceCurrentItem(with: playerItem)
```

### Background Audio and Now Playing

```swift
// In App init
try? AVAudioSession.sharedInstance().setCategory(.playback)
```

`AVAudioSession` is available on tvOS 9.0+ (https://developer.apple.com/documentation/avfaudio/avaudiosession, read 2026-11-13).

For audio that continues in the background, add the Background Modes capability and select "Audio, AirPlay, and Picture in Picture"; Xcode writes `UIBackgroundModes` with the value `audio` into `Info.plist`. Apple's Xcode article "Configuring background execution modes" covers iOS, iPadOS, tvOS, visionOS and watchOS (https://developer.apple.com/documentation/xcode/configuring-background-execution-modes, read 2026-11-13), and "Configuring your app for media playback" (iOS, tvOS, visionOS; https://developer.apple.com/documentation/avfoundation/configuring-your-app-for-media-playback) says the `.playback` category plus this mode lets the app play background audio and enables AirPlay and Picture in Picture. Note: the `UIBackgroundModes` key's own reference page lists iOS, iPadOS, visionOS and watchOS but no tvOS entry, so rely on the two articles above.

#### Publishing to system surfaces: Now Playing framework (27.0)

The `NowPlaying` framework (tvOS 27.0 and all other platforms) makes playback controls available on the Lock Screen, Control Center and connected accessories (https://developer.apple.com/documentation/nowplaying). For a local session, from Apple's "Publishing media sessions" article (read 2026-11-13):

- Create an `@Observable` type conforming to `MediaSessionRepresentable`; the framework reads four properties: `id` (uniquely identifies the session), `content` (what is playing), `playbackSnapshot` (playback state), `commands` (supported controls).
- Register it with the system using `MediaSession` (`@MainActor` class, generic over the representable; registration call below).
- Content types: `MusicContent`, `PodcastContent`, `MovieContent`, `TVShowContent`, `BookContent`, `RadioContent`, `HomeMediaContent`, `GenericContent`. Artwork is an `Artwork` value requested asynchronously.
- `MediaPlaybackSnapshot` takes state, elapsed time and a timestamp; the system extrapolates position between updates.

```swift
// Adapted from Apple's "Publishing media sessions"; Track is your own model type
import NowPlaying

@Observable
@MainActor
final class AudioPlayer: MediaSessionRepresentable {
    let id: String = UUID().uuidString

    var currentTrack: Track?
    var isPlaying: Bool = false
    var elapsedTime: TimeInterval = 0
    var timestamp: Date = .now

    var content: (any MediaContentRepresentable)? {
        guard let track = currentTrack else { return nil }
        return MusicContent(
            id: track.id, songTitle: track.title, artistName: track.artist,
            albumName: track.album, type: .audio,
            duration: .finite(track.duration), artwork: nil
        )
    }

    var playbackSnapshot: MediaPlaybackSnapshot? {
        MediaPlaybackSnapshot(
            state: isPlaying ? .playing() : .paused,
            elapsedTime: elapsedTime,
            timestamp: timestamp
        )
    }

    var commands: [MediaCommand] {
        [.play { self.play() }, .pause { self.pause() }]
    }

    func play() { /* start playback */ }
    func pause() { /* pause playback */ }
}
```

Register the session with `MediaSession.init(_:)` (`@MainActor`, takes the representable, 27.0) and make it primary with `requestToBecomeApplicationPrimary()` (`@MainActor`, `async throws`, 27.0), as in Apple's article:

```swift
let session = MediaSession(self)
try await session.requestToBecomeApplicationPrimary()
```

Sources: https://developer.apple.com/documentation/nowplaying/mediasession/init(_:) and .../requesttobecomeapplicationprimary() (read 2026-11-13). The article also states that `requestToBecomeSystemPrimary()` has no effect unless the app is in the foreground (reported by review, not re-read here).

---

## Best Practices

- ✅ Use `AVPlayerViewController` (or SwiftUI `VideoPlayer`) for standard playback
- ✅ Support picture-in-picture
- ✅ Handle interruptions gracefully
- ✅ Preload content for smooth playback
- ❌ Don't autoplay without user intent
- ❌ Don't block UI during loading
