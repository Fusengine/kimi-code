# Metal 4: command model, ML encoder, tensors

Verified 2026-11-13 on Apple's documentation JSON (`https://developer.apple.com/tutorials/data/documentation/<path>.json`). Overview source: `metal/understanding-the-metal-4-core-api`.

## Overview

Metal 4 adds `MTL4*` types that are independent of the classic `MTL*` command types. All below are iOS/iPadOS/macOS/tvOS/visionOS 26.0 unless noted.

| Concept | Metal 4 type | Replaces / differs from |
|---------|--------------|-------------------------|
| Queue | `MTL4CommandQueue` (`commit(_:options:)` takes an array of buffers) | `MTLCommandQueue` (iOS 8.0) |
| Command buffer | `MTL4CommandBuffer`, reusable after commit via `beginCommandBuffer(allocator:)` | transient single-use `MTLCommandBuffer` |
| Memory for commands | `MTL4CommandAllocator` (`reset()` when the frame's GPU work is done) | implicit |
| Resource binding | `MTL4ArgumentTable` (bound per encoder stage) | per-encoder `setBuffer` / `setTexture` calls |
| Encoders | `MTL4RenderCommandEncoder`, `MTL4ComputeCommandEncoder` (compute + blit + acceleration structures in one pass), `MTL4MachineLearningCommandEncoder` | separate render / compute / blit / ML encoders |
| Compilation | `MTL4Compiler` via `device.makeCompiler(descriptor:)` | |
| Hazards | all resources untracked: you add `barrier(afterEncoderStages:beforeEncoderStages:visibilityOptions:)` or fences / events | automatic hazard tracking |

Detect support at runtime: `device.supportsFamily(.metal4)` (`MTLGPUFamily.metal4`, 26.0). Create an `MTL4CommandQueue` when supported, otherwise a classic queue; you can adopt Metal 4 incrementally and synchronize both queue kinds with `MTLEvent` (`signalEvent(_:value:)` / `waitForEvent(_:value:)`).

## Minimal frame skeleton (Swift 6)

```swift
import Metal

enum MetalSetupError: Error { case unsupported }

/// Encodes one empty compute pass and submits it on a Metal 4 queue.
func submitEmptyPass() throws {
    guard let device = MTLCreateSystemDefaultDevice(), device.supportsFamily(.metal4),
          let queue = device.makeMTL4CommandQueue(),
          let allocator = device.makeCommandAllocator(),
          let commandBuffer = device.makeCommandBuffer() else { throw MetalSetupError.unsupported }

    commandBuffer.beginCommandBuffer(allocator: allocator)
    let encoder = commandBuffer.makeComputeCommandEncoder()
    // bind an MTL4ArgumentTable, set a pipeline, call dispatchThreads(threadsPerGrid:threadsPerThreadgroup:)
    encoder?.endEncoding()
    commandBuffer.endCommandBuffer()
    queue.commit([commandBuffer], options: nil)
}
```

Keep one allocator per frame in flight; call `allocator.reset()` only after the GPU finished that frame (signal an event on the queue and wait for it).

## Machine learning command encoder (26.0)

`MTL4MachineLearningCommandEncoder` runs a pre-trained network inside the command buffer, between your render and compute work.

| Step | API (all verified) |
|------|--------------------|
| Create encoder | `commandBuffer.makeMachineLearningCommandEncoder()` |
| Pipeline | `MTL4Compiler.makeMachineLearningPipelineState(descriptor:)` with an `MTL4MachineLearningPipelineDescriptor` (`machineLearningFunctionDescriptor`, `setInputDimensions(_:bufferIndex:)`) |
| Configure pass | `setPipelineState(_:)`, `setArgumentTable(_:)` |
| Run | `dispatchNetwork(intermediatesHeap:)` with an `MTLHeap` for intermediates |

Pages: `metal/mtl4machinelearningcommandencoder`, `metal/mtl4machinelearningpipelinestate`, `metal/machine-learning-passes`. Add a barrier between the ML pass and the pass that consumes its output.

## Tensors and Metal Performance Primitives

| Item | Status |
|------|--------|
| `MTLTensor`, `MTLTensorDescriptor`, `MTLTensorDataType`, `MTLDevice.makeTensor(descriptor:)` | 26.0, verified |
| Inline ML in a shader (tensor ops from Metal Performance Primitives, MSL side) | article `metal/running-inline-ml-operations-in-a-shader-with-metal-4` (macOS 26.0, Xcode 26.0) |
| Quantized data, multi-plane tensors, custom ops for Core AI on M5/A19 Neural Accelerators | session 330 only; no symbol checked here |
| Neural rendering: MetalFX neural denoising, learned tone mapper via the ML encoder, tensor API in shaders | session 359 only; sample `metal/training-a-neural-network-to-render-irradiance-in-real-time` |

Sessions (read 2026-11-13): 330 https://developer.apple.com/videos/play/wwdc2026/330/ (MPP Programming Guide PDF linked there); 359 https://developer.apple.com/videos/play/wwdc2026/359/. Related WWDC25: 262 "Combine Metal 4 machine learning and graphics", 211 "Go further with Metal 4 games". The MPP tensor-ops library is MSL, not a Swift symbol: do not invent Swift names for it.

## Profiling (session 388, WWDC26)

Game Performance Overview in Instruments, `metalperftrace` on macOS, Control Center capture on iOS, the `StateReporting` framework (iOS/macOS/tvOS/visionOS/watchOS 27.0, verified landing) to tag metrics with game state, MetricKit for field data. Source: https://developer.apple.com/videos/play/wwdc2026/388/ (session claims, symbols not individually checked).

## Decision guide

| Need | Choose |
|------|--------|
| New renderer, ML in the frame, ports from DirectX/Vulkan | Metal 4 (`MTL4*`) |
| Existing classic Metal renderer | keep it; adopt `MTL4CommandQueue` for one subsystem at a time |
| Upscaling / frame generation / denoising | MetalFX, see [metalfx.md](metalfx.md) |
| 3D scene without writing a renderer | RealityKit, see [engines-and-porting.md](engines-and-porting.md) |
