---
name: dynamic-type
description: Dynamic Type (Large Text) on tvOS 27 with text styles, flexible layout and conditional layouts for grids and cards
when-to-use: making a tvOS app support larger text sizes, fixing truncated or clipped text on Apple TV
keywords: tvOS, Dynamic Type, Large Text, dynamicTypeSize, isAccessibilitySize, AnyLayout, containerRelativeFrame, adjustsFontForContentSizeCategory
priority: high
requires: focus-system.md
related: media-playback.md
---

# Dynamic Type on tvOS

Source: WWDC26 session 221 "Prepare your tvOS apps for Dynamic Type", https://developer.apple.com/videos/play/wwdc2026/221/ (page and transcript read 2026-11-13).

## Overview

tvOS 27 adds Large Text, system-wide text scaling for every app. Dynamic Type works the same way on tvOS as on iOS: UIKit and SwiftUI scale text from the person's preference. People enable it in Settings > Accessibility > Display > Text Size and can choose sizes from Large up to Accessibility XXXL. Standard components (Labels, Buttons, navigation tab bars) scale automatically; your job is custom elements.

You can declare Larger Text support in your Accessibility Nutrition Labels for tvOS in the App Store.

## Fix the common issues

| Problem | Fix |
|---------|-----|
| Hard-coded font size (`UIFont.boldSystemFont(ofSize: 28)`) | Semantic text style: SwiftUI `.font(.caption)`; UIKit `UIFont.preferredFont(forTextStyle: .headline)` plus `adjustsFontForContentSizeCategory = true` |
| Fixed width or height (`.frame(width: 300)`) truncates or clips | Flexible constraint: `.frame(maxWidth: .infinity, alignment: .leading)` |
| Not enough padding or spacing as elements grow | Adjust spacing for the larger sizes |

Search the app for hard-coded text sizes and for fixed height and width constraints.

## Adapt layout for larger sizes

Read `@Environment(\.dynamicTypeSize)` and branch on `isAccessibilitySize`.

```swift
// Poster shelf: 4 columns instead of 6 when accessibility sizes are on
.containerRelativeFrame(
    .horizontal,
    count: dynamicTypeSize.isAccessibilitySize ? 4 : 6,
    spacing: 40)
```

- Cards (image, title, subtitle): switch from horizontal to vertical stacks for larger text. In SwiftUI, read `dynamicTypeSize`, choose `VStackLayout` or `HStackLayout`, and use `AnyLayout` to abstract the two. In UIKit, update `UIStackView.axis` from `preferredContentSizeCategory.isAccessibilityCategory` and call `registerForTraitChanges` with `UITraitPreferredContentSizeCategory` to react while the app runs.
- For titles that still do not fit, consider a custom marquee strategy.
- Related Apple resources linked on the session page: https://developer.apple.com/documentation/SwiftUI/Applying-Custom-Fonts-to-Text and https://developer.apple.com/documentation/UIKit/scaling-fonts-automatically.

## Best Practices

- ✅ Use standard text styles, never fixed font sizes
- ✅ Test with Large Text enabled up to Accessibility XXXL
- ✅ Adapt shelves, grids and cards instead of shrinking text
- ✅ Declare Larger Text in the Accessibility Nutrition Labels once supported
- ❌ Don't pin text containers to fixed widths or heights
