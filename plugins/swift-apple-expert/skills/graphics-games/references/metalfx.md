# MetalFX: upscaling, frame interpolation, denoising

Verified 2026-11-13 on `https://developer.apple.com/tutorials/data/documentation/metalfx/<symbol>.json`.

## Overview

MetalFX works with both classic Metal and Metal 4 ([metal4.md](metal4.md)). The Metal 4 variants take an `MTL4Compiler` at creation and encode into an `MTL4CommandBuffer`.

| Effect | Descriptor (creates the effect) | Metal 4 protocol | Availability (symbol pages) |
|--------|---------------------------------|------------------|-----------------------------|
| Spatial upscale | `MTLFXSpatialScalerDescriptor` (iOS 16.0, macOS 13.0, visionOS 1.0, tvOS 27.1) | `MTL4FXSpatialScaler` | iOS/iPadOS/macOS/visionOS 26.0, tvOS 27.1 |
| Frame interpolation | `MTLFXFrameInterpolatorDescriptor` (iOS/macOS 26.0, tvOS 27.1, no visionOS) | `MTL4FXFrameInterpolator` | iOS/iPadOS/macOS 26.0, tvOS 27.1 |
| Temporal denoised upscale | `MTLFXTemporalDenoisedScalerDescriptor` (iOS 18.0, macOS 26.0, tvOS 27.1) | `MTL4FXTemporalDenoisedScaler` | iOS/iPadOS/macOS 26.0, tvOS 27.1 |

Every descriptor exposes `supportsDevice(_:)` and `supportsMetal4FX(_:)` class methods. Check them before creating anything; fall back to native-resolution rendering when false.

## Creation and encoding

| Task | API |
|------|-----|
| Classic Metal | `descriptor.makeSpatialScaler(device:)`, `makeFrameInterpolator(device:)`, `makeTemporalDenoisedScaler(device:)` |
| Metal 4 | `descriptor.makeSpatialScaler(device:compiler:)`, `makeFrameInterpolator(device:compiler:)`, `makeTemporalDenoisedScaler(device:compiler:)` |
| Encode (Metal 4) | `scaler.encode(commandBuffer:)` with an `MTL4CommandBuffer` |

Set every texture-format property on the descriptor to the exact format of the texture you later assign to the effect instance (Apple's note on `MTLFXFrameInterpolatorDescriptor`).

```swift
import Metal
import MetalFX

/// Builds a Metal 4 spatial upscaler, or nil when the device cannot run it.
func makeUpscaler(device: any MTLDevice, compiler: any MTL4Compiler,
                  input: (width: Int, height: Int), output: (width: Int, height: Int)) -> (any MTL4FXSpatialScaler)? {
    guard MTLFXSpatialScalerDescriptor.supportsMetal4FX(device) else { return nil }
    let descriptor = MTLFXSpatialScalerDescriptor()
    descriptor.inputWidth = input.width
    descriptor.inputHeight = input.height
    descriptor.outputWidth = output.width
    descriptor.outputHeight = output.height
    descriptor.colorTextureFormat = .rgba16Float
    descriptor.outputTextureFormat = .rgba16Float
    descriptor.colorProcessingMode = .linear   // also .perceptual, .hdr
    return descriptor.makeSpatialScaler(device: device, compiler: compiler)
}
// Per frame: scaler.colorTexture = rendered; scaler.outputTexture = target; scaler.encode(commandBuffer: cb)
```

## Frame interpolation inputs

`MTLFXFrameInterpolatorDescriptor` has a `scaler` (an `MTLFXFrameInterpolatableScaler`, such as the temporal denoised scaler) plus formats for color, depth, motion and UI textures, `isDistortionTextureEnabled`, `requiresPrevColorTexture`. The interpolator base protocol carries per-frame inputs: `colorTexture`, `depthTexture`, `motionTexture`, `deltaTime`, `jitterOffsetX/Y`, `fieldOfView`, `farPlane`, `isDepthReversed`, `isUITextureComposited`. The temporal scalers `MTLFXTemporalScaler` (iOS 16.0, macOS 13.0, tvOS 27.1) and `MTL4FXTemporalScaler` (26.0, tvOS 27.1) also exist; the interpolator's `scaler` property is typed `MTLFXFrameInterpolatableScaler`.

## Neural denoising (WWDC26)

Session 359 (https://developer.apple.com/videos/play/wwdc2026/359/, read 2026-11-13) covers MetalFX neural denoising with Maxon's Redshift Live as the case study. The class is `MTL4FXTemporalDenoisedScaler`; the session-level tuning advice is not verified symbol by symbol.

## tvOS note

The tvOS 27.1 availability above comes straight from the symbol JSON pages. The `tvos` skill does not cover MetalFX; use this reference.

## Decision guide

| Goal | Use |
|------|-----|
| Cheaper pixels, no motion data | `MTLFXSpatialScaler` |
| Upscale with motion + depth inputs | `MTLFXTemporalScaler` / `MTL4FXTemporalScaler` |
| Upscale plus denoise the frame | `MTL4FXTemporalDenoisedScaler` |
| Higher displayed frame rate | `MTLFXFrameInterpolator`, which takes a scaler plus motion and depth data |
