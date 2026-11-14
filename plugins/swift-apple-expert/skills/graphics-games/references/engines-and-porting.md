# Choosing a rendering stack, and Game Porting Toolkit 4

Verified 2026-11-13: symbol JSON pages (`scenekit`, `spritekit`, `realitykit`, `metal`), https://developer.apple.com/games/game-porting-toolkit/, https://developer.apple.com/games/, session https://developer.apple.com/videos/play/wwdc2026/357/.

## Which framework

| Framework | Platform status (landing page JSON) | Pick it when |
|-----------|-------------------------------------|--------------|
| Metal 4 / Metal | iOS 8.0, macOS 10.11, tvOS 9.0, visionOS 1.0 | You own the renderer: custom pipelines, ML in the frame, ports from DirectX/Vulkan. See [metal4.md](metal4.md) |
| RealityKit | iOS 13.0, macOS 10.15, tvOS 26.0, visionOS 1.0 | 3D scenes with entities, components, physics and no renderer to write; the path for 3D on visionOS. See [visionos realitykit.md](../../visionos/references/realitykit.md) and [realitykit-27.md](../../visionos/references/realitykit-27.md) |
| SpriteKit | iOS 7.0, macOS 10.9, tvOS 9.0, visionOS 1.0, watchOS 10.0; no deprecation flag | 2D games, particles, simple physics, `SKView` embedded in UIKit/SwiftUI |
| SceneKit | **deprecated 26.0 on every platform** (introduced iOS 8.0) | Maintaining an existing app only; do not start new 3D work on it |

SceneKit page note (visionOS): SceneKit content shows only in 2D views and textures there; use RealityKit for immersive 3D.

Rules of thumb:

- New 3D game or app, no custom renderer: RealityKit.
- New 3D with its own look, ML or heavy compute: Metal 4.
- 2D: SpriteKit; drop to Metal only when profiling says so.
- Existing SceneKit app: the framework is deprecated since 26.0 on every platform (symbol page flag); plan a move to RealityKit or Metal. Apple's page does not name a replacement.

## Game Porting Toolkit 4

Page read 2026-11-13: https://developer.apple.com/games/game-porting-toolkit/.

| Piece | What Apple states |
|-------|-------------------|
| Agent skills | Companion repository https://github.com/apple/game-porting-toolkit/ with open-source agent skills and sample code: DirectX to Metal, Metal command-line debugging, game controller support, polish, optimization |
| Metal command-line tools | Agents can capture, debug and profile Metal workloads from the command line |
| Evaluation environment for Windows games | Runs the unmodified Windows executable on Apple silicon; now supports Metal 4; works with Metal HUD, Metal GPU capture, Metal System Trace |
| Metal shader converter, metal-cpp | Convert HLSL to Metal; C++ interface to Metal |
| Metal Developer Tools for Windows, Mac Remote Developer Tools | Build and debug on a Mac from Visual Studio on PC |

Session 357 chapters (page text): porting assistant workflow, windowing and frame pacing, scene rendering with Metal 4, debugging with GPU command-line tools, game controllers and MetalFX. Related WWDC25: 211 "Go further with Metal 4 games". Session content beyond the chapter list is not verified here.

## Distribution and discovery

The Apple Games app and Game Center integration are in [gamekit.md](gamekit.md). Human Interface Guidelines for games: https://developer.apple.com/design/human-interface-guidelines/designing-for-games (linked from the Game Porting Toolkit page).

## Workflow

1. Evaluate the Windows build in the evaluation environment for a baseline.
2. Port rendering to Metal 4; add MetalFX ([metalfx.md](metalfx.md)).
3. Add controller support ([game-controller.md](game-controller.md)).
4. Profile with Metal tools ([metal4.md](metal4.md), session 388).
