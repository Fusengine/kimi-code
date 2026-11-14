---
name: hig-accessibility
description: HIG accessibility rules (Dynamic Type to AX5, VoiceOver, contrast, hit targets, Reduce Motion/Transparency) with verified SwiftUI APIs
when-to-use: building or reviewing any UI, before claiming a UI task done, fixing accessibility audit findings
keywords: accessibility, Dynamic Type, AX5, VoiceOver, contrast, Increase Contrast, hit target, 44pt, Reduce Motion, Reduce Transparency
priority: high
related: hig-rtl.md, liquid-glass.md, views-modifiers.md
---

# HIG Accessibility Rules

Sources:
- https://developer.apple.com/design/human-interface-guidelines/accessibility
- https://developer.apple.com/design/human-interface-guidelines/typography
- https://developer.apple.com/design/human-interface-guidelines/voiceover
- https://developer.apple.com/design/human-interface-guidelines/dark-mode
- https://developer.apple.com/design/human-interface-guidelines/color

## 1. Text Size (Dynamic Type)

- Let people enlarge text by **at least 200%** (140% on watchOS). Use text styles (`.font(.body)`), never fixed sizes.
- Layout must adapt to **all** sizes, including the largest accessibility size (`DynamicTypeSize.accessibility5`).
- At accessibility sizes: show as much useful text as at the largest standard size; **never truncate in scrollable regions**; switch horizontal rows to a **stacked layout**; reduce column count; keep primary elements at the top.
- Meaningful icons must scale with text (SF Symbols do automatically).
- Emphasized text styles (HIG typography, updated 2025-12-16; read 2026-11-13): system text styles have an emphasized variant (medium, semibold, bold or heavy depending on style and platform) applied through symbolic traits - SwiftUI `Text.bold()` (iOS 13.0+), UIKit `UIFontDescriptor.SymbolicTraits.traitBold`. The HIG type specification tables list the emphasized weight per style and platform.
- Custom type minimums: iOS/iPadOS default 17 pt / min 11 pt; macOS 13/10; tvOS 29/23; visionOS 17/12; watchOS 16/12. macOS has no Dynamic Type.

```swift
@Environment(\.dynamicTypeSize) private var typeSize

var body: some View {
    let layout = typeSize.isAccessibilitySize
        ? AnyLayout(VStackLayout(alignment: .leading))
        : AnyLayout(HStackLayout())
    layout { Text(title).font(.headline); Text(date).font(.subheadline) }
}

#Preview("AX5") { Row().dynamicTypeSize(.accessibility5) }
```

## 2. Contrast & Color

| Text | Minimum contrast (WCAG AA, HIG) |
|------|----------------------------------|
| Up to 17 pt | 4.5:1 |
| 18 pt and larger, or bold | 3:1 |

- Dark Mode: never below 4.5:1; **strive for 7:1** for custom colors, especially small text.
- Check both light and dark appearances, with Increase Contrast and Reduce Transparency on (separately and together).
- Custom colors need **light, dark, and increased-contrast** variants (Color Set in the asset catalog). Prefer system colors - they ship all variants.
- Never convey information by color alone: add a shape, icon or text (`accessibilityDifferentiateWithoutColor`).

```swift
@Environment(\.colorSchemeContrast) private var contrast   // .standard / .increased
```

## 3. Hit Targets

| Platform | Default | Minimum |
|----------|---------|---------|
| iOS, iPadOS | 44x44 pt | 28x28 pt |
| macOS | 28x28 pt | 20x20 pt |
| tvOS | 66x66 pt | 56x56 pt |
| visionOS | 60x60 pt | 28x28 pt |
| watchOS | 44x44 pt | 28x28 pt |

- Padding: ~12 pt around bezeled elements, ~24 pt around bezel-less elements.
- Offer an onscreen alternative to every gesture (e.g. a delete button besides swipe-to-delete).

```swift
Button { close() } label: { Image(systemName: "xmark") }
    .frame(minWidth: 44, minHeight: 44)
    .contentShape(.rect)
    .accessibilityLabel("Close")
```

## 4. VoiceOver

- Label **every** key element, especially icon-only controls; keep labels current as content changes.
- Describe meaningful images; hide purely decorative ones (`accessibilityHidden(true)`).
- Unique screen titles and accurate headings (`accessibilityHeading(_:)`, `.accessibilityAddTraits(.isHeader)`).
- Group related elements so they read together (`accessibilityElement(children: .combine)`).
- Announce visible content/layout changes (`AccessibilityNotification`).
- Support the rotor for navigable content (`accessibilityRotor(_:entries:)`).
- Make charts/infographics accessible with a concise description.

## 5. Motion & Transparency

When **Reduce Motion** is on, reduce automatic and repetitive animations (zoom, scale, peripheral motion):
tighten springs, track gestures directly, avoid z-axis depth animation, **replace x/y/z transitions with fades**, avoid animating into/out of blur.

```swift
@Environment(\.accessibilityReduceMotion) private var reduceMotion
@Environment(\.accessibilityReduceTransparency) private var reduceTransparency

.transition(reduceMotion ? .opacity : .move(edge: .bottom))
.animation(reduceMotion ? nil : .spring, value: isExpanded)
```

Reduce Transparency: custom glass/material surfaces fall back to opaque backgrounds (see `liquid-glass.md`).

## 6. Other HIG Requirements

- Avoid time-boxed UI that auto-dismisses; prefer explicit dismissal.
- Don't autoplay audio/video without controls; respect Dim Flashing Lights for video.
- Pair audio cues with haptics (`sensoryFeedback(_:trigger:)`) and visual cues.
- Assistive Access (iOS/iPadOS): core features only, one interaction per screen, double confirmation for hard-to-undo actions.
- Full Keyboard Access / Switch Control / Voice Control work when every control is labeled and reachable.

## Done Criteria

UI is done only when verified at default size AND AX5, light AND dark (+ Increase Contrast), every interactive element labeled and >= platform minimum size, Reduce Motion/Transparency honoured. Run the agent's HIG Verification Gate.
