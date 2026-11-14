# AVFoundation capture

Verified 2026-11-13 on `https://developer.apple.com/tutorials/data/documentation/<path>.json`. The `updates/avfoundation.json` page stops at June 2024 and `updates/avkit.json` carries the September 2026 entry, so WWDC26 capture topics below are session claims unless a symbol page is cited.

## Verified symbols

| Symbol | Availability (symbol page) | Note |
|--------|----------------------------|------|
| `AVCaptureSession`, `AVCaptureDevice`, `AVCaptureDeviceInput`, `AVCapturePhotoOutput` | long-standing (iOS 4.0 / 10.0; tvOS 17.0; visionOS 1.0, photo output not on visionOS) | Core capture graph |
| `AVCaptureDevice.default(_:for:position:)`, `AVCaptureDevice.DiscoverySession` | iOS 10.0, visionOS 2.1 | Find cameras |
| `AVCaptureDevice.isCenterStageEnabled` | iOS 14.5, macOS 12.3, tvOS 17.0 | Class property |
| `AVCaptureDeviceDirectionCoordinator` | iOS/iPadOS/Mac Catalyst 27.1, tvOS 27.3 (beta), visionOS 27.3 (beta) | Tracks which direction each camera faces relative to a view |
| `AVCaptureDeviceDescriptor`, `AVCaptureDeviceDirectionMap` | same as the coordinator | Sendable camera identifier; `forwardFacingDeviceDescriptors` / `backwardFacingDeviceDescriptors` |
| `AVCaptureDevice.DeviceType.builtInOuterUltraWideCamera`, `.builtInInnerUltraWideCamera` | iOS/iPadOS/Mac Catalyst 27.1 | Used in Apple's coordinator sample |

The coordinator, descriptor and direction map are `avkit` pages; the two device types are `avfoundation/avcapturedevice/devicetype-swift.struct/...` pages. The 27.3 platforms are beta at the date read.

## Classic capture setup

```swift
import AVFoundation

enum CaptureError: Error { case noCamera, cannotAddInput }

/// Builds a session with the back wide-angle camera as video input.
func makeSession() throws -> AVCaptureSession {
    guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
    else { throw CaptureError.noCamera }
    let session = AVCaptureSession()
    let input = try AVCaptureDeviceInput(device: device)
    guard session.canAddInput(input) else { throw CaptureError.cannotAddInput }
    session.addInput(input)
    return session
}
// startRunning() blocks: call it off the main actor, then publish state back to the UI.
```

## Direction-aware camera choice (Apple's pattern, 27.1)

Create the coordinator on the main actor with the view that shows your preview and every device type you capture from, including rear cameras (a rear camera can face the person when the device opens or closes). Hold it strongly while the view is on screen. The change handler runs on the main actor soon after creation and on every change. Pass the `AVCaptureDeviceDescriptor` to the actor that owns the capture session and create the `AVCaptureDevice` there; capture configuration does not belong on the main actor.

```swift
import AVKit

@MainActor
final class DirectionObserver {
    private var coordinator: AVCaptureDeviceDirectionCoordinator?

    func startObserving(previewView: UIView) {
        coordinator = AVCaptureDeviceDirectionCoordinator(
            view: previewView,
            deviceTypes: [.builtInOuterUltraWideCamera, .builtInInnerUltraWideCamera]
        ) { [weak self] directions in
            guard let descriptor = directions.forwardFacingDeviceDescriptors.first else { return }
            self?.selectCamera(with: descriptor)
        }
    }

    private func selectCamera(with descriptor: AVCaptureDeviceDescriptor) { /* hand to the session actor */ }
}
```

Source: `avkit/avcapturedevicedirectioncoordinator` (code adapted from the page).

## WWDC26 session claims (symbols not checked here)

| Session | Topic | URL |
|---------|-------|-----|
| 303 | Fast camera launch, deferred start, steady preview, deterministic file writing | https://developer.apple.com/videos/play/wwdc2026/303/ |
| 304 | 24MP / 48MP capture on Main, Tele, Ultra Wide; RAW, exposure-bracketed, processed; deferred photo processing | https://developer.apple.com/videos/play/wwdc2026/304/ |
| 341 | Center Stage front camera on iPhone 17, iPhone 17 Pro, iPhone Air; smart framing monitor; sensor orientation compensation | https://developer.apple.com/videos/play/wwdc2026/341/ |
| 256 | Generated subtitles and subtitle styles (AVKit, AVPlayerLayer, Media Accessibility) | https://developer.apple.com/videos/play/wwdc2026/256/ |

Before using an API named in a session, open its symbol page: the article `avfoundation/build-a-responsive-camera-app-that-launches-quickly` returned 404 on the JSON endpoint when checked.

## Rules

- Capture configuration off the main actor; UI state back on it.
- Declare `NSCameraUsageDescription` and `NSMicrophoneUsageDescription` (both verified symbol pages) and request authorization before starting a session.
- Do not hardcode a physical camera as "front": use the direction coordinator on 27.1+ and the classic `position` below it.
