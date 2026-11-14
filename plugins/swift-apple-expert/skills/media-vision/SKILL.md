---
name: media-vision
description: Use when adding camera capture, media playback and Now Playing, photo library access, Vision image analysis, speech-to-text, translation, music analysis, or Core ML to an Apple-platform app — AVFoundation, AVKit, NowPlaying, MediaDevice, AVSystemRouting, PhotoKit, Vision, Speech, Core ML, Natural Language, Core Location, WeatherKit, EventKit.
---

<objective>
Covers the media, vision, speech and on-device ML surface of the Apple SDKs, verified against Apple's documentation JSON on 2026-11-13: AVFoundation capture (AVCaptureDeviceDirectionCoordinator 27.1 and its beta tvOS/visionOS 27.3 availability), the Now Playing framework (MediaSession, RemoteMediaSession), MediaDevice and AVSystemRouting (27.0), AVKit, PhotoKit (PHAssetResource.filename replacing the deprecated originalFilename in 27.0), Vision (RecognizeDocumentsRequest 26.0, GenerateIterativeSegmentationRequest 27.0, Vision on watchOS 27.0), Speech (SpeechAnalyzer and SpeechTranscriber 26.0, input providers 27.0), Core ML, Create ML, Translation, Natural Language, MusicUnderstanding (27.0), and Core Location, WeatherKit and EventKit briefly (no Apple-dated 2025-2026 change found).

Every symbol cites its availability; facts known only from a WWDC26 session are labelled session claims. Foundation Models and the Core AI language model stay in the existing apple-intelligence skill and are linked, not repeated.
</objective>

# Media and Vision

Capture, playback, photos, image analysis, speech and language for iOS, iPadOS, macOS, watchOS, visionOS and tvOS.

## Agent Workflow (MANDATORY)

Before ANY implementation, spawn 3 agents in parallel, one `Agent` call each (single message):

1. **explore-codebase** - Find existing capture, playback, Vision and Speech usage and the deployment targets
2. **research-expert** - Re-verify every symbol on its Apple JSON page (`https://developer.apple.com/tutorials/data/documentation/<path>.json`); the apple-docs MCP search is unreliable, never conclude absence from it
3. **mcp__apple-docs__search_apple_docs** - Cross-check only; confirm availability on the JSON page

After implementation, run **sniper** for validation.

---

## Overview

### When to Use

- Building a camera, scanner or capture pipeline
- Publishing playback to Lock Screen, Control Center, CarPlay or a third-party device
- Reading photo library metadata or letting people pick photos
- Recognizing documents, segmenting images, transcribing speech, translating text, analyzing music

### Why this skill

| Feature | Benefit |
|---------|---------|
| Per-symbol availability | 27.x APIs are not used on targets that lack them |
| Session claims labelled | Session-only advice is never presented as API fact |
| Foundation Models linked | No duplicate guidance with `apple-intelligence` |

---

## Key Concepts

### Availability gates
New frameworks (NowPlaying, MediaDevice, AVSystemRouting, MusicUnderstanding) are 27.0; the direction coordinator is 27.1 and beta on tvOS and visionOS 27.3. Gate with `#available`, never assume.

### Swift-native Vision and Speech
Vision requests are structs with async `perform(on:orientation:)`; Speech uses an analyzer actor plus modules and input providers.

### Stale update pages
Many Apple `updates/<framework>.json` pages stop in 2024 or 2025; a missing entry is not proof of no change.

---

## Reference Guide

| Need | Reference |
|------|-----------|
| Capture session, camera direction, WWDC26 camera sessions | [avfoundation-capture.md](references/avfoundation-capture.md) |
| Now Playing, remote sessions, Media Device, AVSystemRouting, AVKit | [now-playing-routing.md](references/now-playing-routing.md) |
| PHAssetResource filename change, PhotosPicker | [photokit.md](references/photokit.md) |
| Document recognition, segmentation, Vision on watchOS | [vision.md](references/vision.md) |
| SpeechAnalyzer, SpeechTranscriber, input providers | [speech.md](references/speech.md) |
| Core ML, Create ML, Translation, Natural Language, MusicUnderstanding | [ml-language-music.md](references/ml-language-music.md) |
| Core Location, WeatherKit, EventKit | [location-weather-eventkit.md](references/location-weather-eventkit.md) |
| Foundation Models, Core AI language model | `apple-intelligence` skill |
| Metal, MetalFX, games | `graphics-games` skill |
| tvOS playback UI | `tvos/references/media-playback.md` |

---

## Best Practices

1. **Capture off the main actor** - `startRunning()` is synchronous and blocking
2. **Never force-unwrap file names** - use `PHAssetResource.filename` on 27.0+
3. **Consume Speech results concurrently** - with the analysis call
4. **Prefer the new Now Playing framework on 27.0+ targets** - keep legacy code for older targets
5. **Request least access** - write-only calendar, when-in-use location, `PhotosPicker`
6. **Verify before using a session API** - open its symbol page first
7. **Label unverified items** - session claims stay session claims
