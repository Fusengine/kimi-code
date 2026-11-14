# Swift Apple Expert Plugin

Swift and SwiftUI development for every Apple platform (iOS, iPadOS, macOS, watchOS, tvOS, visionOS), with build/test automation through XcodeBuildMCP, official API research through Apple Docs MCP, and a HIG verification gate before any UI change is reported done.

Installed as part of the Fusengine Kimi Code plugin suite (`~/.kimi-code/plugins/managed/fusengine/`).

## Agent

### `swift-expert`

Triggers on `Package.swift` / `*.xcodeproj` projects, SwiftUI views, Swift concurrency and XcodeBuildMCP automation. Not for web frontend, PHP or non-Apple platforms.

Verification gate: `build_sim` + `test_sim`, then for UI changes a 10-item HIG gate on the simulator (Dynamic Type AX5, dark mode + Increase Contrast, VoiceOver labels, hit targets, RTL, Reduce Motion/Transparency, Liquid Glass usage, screen sizes, modality/order), each reported `pass` / `fail` / `not verified`, then `sniper`.

## Skills

| Skill | Use when |
|-------|----------|
| `swift-core` | Swift Testing first, Swift 6.2 concurrency defaults, architecture, i18n, performance, Xcode 27 agents and `xcrun mcpbridge` |
| `swiftui-core` | SwiftUI views, navigation, SwiftData 27, WebView, state, Liquid Glass, App Intents runtime, WidgetKit/ActivityKit, and HIG rules (accessibility, RTL, modality, notifications/Siri, iPhone Duo) |
| `solid-swift` | SOLID/DRY for Swift: feature-modular layout, protocol separation, @Observable, actors |
| `ios` | iPhone apps: simulator/device testing, UI automation, debugging with XcodeBuildMCP |
| `ipados` | iPad: split views, keyboard, multitasking, Stage Manager, menu bar, toolbars |
| `macos` | Mac: menu bar extras, windows, toolbars, touch on Mac, AppKit integration, notarization |
| `watchos` | Apple Watch: complications (WidgetKit), workouts, HealthKit, connectivity |
| `tvos` | Apple TV: focus system, Siri Remote, media playback |
| `visionos` | Vision Pro: spatial computing, RealityKit 27, ARKit, spatial web, ornaments, immersive spaces (no eye-tracking API) |
| `apple-intelligence` | Foundation Models (on-device and Private Cloud Compute), Writing Tools, Genmoji, Image Playground, Visual Intelligence |
| `apple-frameworks` | Passkeys, MapKit, CloudKit, Core Data, TipKit, background tasks, MetricKit, App Attest, HealthKit, CarPlay, Chart3D |
| `graphics-games` | Metal 4, MetalFX, GameKit, Game Controller, Game Porting Toolkit 4; Metal vs RealityKit vs SpriteKit vs SceneKit |
| `media-vision` | AVFoundation, Now Playing, PhotoKit, Vision, Speech, translation, Core ML, Core Location, WeatherKit, EventKit |
| `build-distribution` | Signing, TestFlight, App Store, Icon Composer app icons, StoreKit 2; deadlines: Developer ID G2 2027-02-01, age-rating declarations 2027-01-12, April 2027 SDK 27 / iOS 15 / iPhone Duo screenshots |
| `mcp-tools` | XcodeBuildMCP and Apple Docs MCP usage, UI verification on simulator |

## Usage Examples

```
"Create a SwiftUI settings screen with @Observable"   -> swiftui-core, solid-swift
"Fix this Swift 6 data-race error"                    -> swift-core
"Make this list work at the largest text size"        -> swiftui-core (hig-accessibility)
"Add a Live Activity for order tracking"              -> swiftui-core (hig-system-surfaces)
"Support iPhone Duo in our toolbar layout"            -> swiftui-core (hig-iphone-duo)
"Build a menu bar app for macOS"                      -> macos
"Prepare the dark and tinted app icon"                -> build-distribution
"Add a Foundation Models summary feature"             -> apple-intelligence
"Render with Metal 4 and MetalFX upscaling"           -> graphics-games
```

## MCP Servers

- **XcodeBuildMCP** (https://www.xcodebuildmcp.com): build, run, test, `screenshot`, `snapshot_ui`; optional workflows for appearance and taps.
- **Apple Docs MCP** (https://github.com/kimsungwhee/apple-docs-mcp): documentation, availability, sample code, bundled WWDC 2014-2025.

Version specifics (Swift, OS SDKs) live in each skill's frontmatter `versions:`.

## Author

Bruno Azoulay

## License

MIT
