---
name: views-modifiers
description: SwiftUI views, custom components, view modifiers, layouts, @ViewBuilder
when-to-use: creating UI components, implementing layouts, building reusable modifiers, designing view hierarchies
keywords: View, ViewBuilder, ViewModifier, LazyVStack, LazyHStack, Grid, layout
priority: high
related: navigation.md, state-management.md
---

# SwiftUI Views & Modifiers

## When to Use

- Creating new UI components
- Building responsive layouts
- Implementing custom view modifiers
- Designing reusable view hierarchies
- Adapting to different screen sizes

## Key Concepts

### View Protocol
Everything visible is a View. Views are structs (value types).

**Key Points:**
- Implement `var body: some View`
- Views should be lightweight
- Extract subviews at 30+ lines
- Use `@ViewBuilder` for conditional content

### View Structure Pattern
Organize views with clear sections.

**Sections:**
1. **State** - @State, @Binding properties
2. **Environment** - @Environment values
3. **Body** - Main view content
4. **Subviews** - @ViewBuilder computed properties
5. **Actions** - Private methods

### Custom ViewModifier
Reusable styling and behavior bundles.

**Key Points:**
- Implement `ViewModifier` protocol
- Create extension on `View` for fluent API
- Combine multiple modifiers into one
- Good for consistent styling

### Layout Types

| Type | Use Case |
|------|----------|
| VStack/HStack | Simple linear layouts |
| LazyVStack/LazyHStack | Long scrolling lists |
| LazyVGrid/LazyHGrid | Grid layouts |
| GeometryReader | Size-dependent layouts |
| ViewThatFits | Adaptive layouts |

### Responsive Layouts
Adapt to different screen sizes and orientations.

**Key Points:**
- Use `@Environment(\.horizontalSizeClass)` for device adaptation
- `ViewThatFits` for automatic layout selection
- `containerRelativeFrame` for proportional sizing

---

## Best Practices

- ✅ Extract subviews at 30+ lines
- ✅ Use `some View` return type (opaque)
- ✅ Prefer composition over inheritance
- ✅ Use system colors; custom colors need light, dark and increased-contrast variants (HIG /color)
- ✅ Add `.accessibilityLabel()` to every icon-only control (see `hig-accessibility.md`)
- ✅ Always include `#Preview`
- ❌ Don't use GeometryReader unnecessarily
- ❌ Don't nest ScrollViews
- ❌ Don't do heavy work in body

---

## Liquid Glass (iOS 26+)

Material for the controls/navigation layer. The regular variant blurs and adjusts the luminosity of background content; the clear variant is highly translucent, for use over media only (HIG /materials).

### Automatic Application (when built with the current SDK)
- Navigation bars, tab bars, toolbars, sidebars
- Sheets, popovers, menus, alerts
- Search fields, controls (during interaction)

### Manual API (custom controls only, sparingly - never content layer)
```swift
MyControl()
    .glassEffect()                          // .regular in a capsule (default)
    .glassEffect(.regular.interactive(), in: .capsule)
```
Rules and accessibility fallbacks: `liquid-glass.md`.

### TabBar (iOS 26+)
```swift
TabView {
    Tab("Home", systemImage: "house") { HomeView() }
    Tab(role: .search) { SearchView() }     // Search tab replaces bar with field
}
.tabBarMinimizeBehavior(.onScrollDown)      // .automatic, .never, .onScrollDown, .onScrollUp
.tabViewBottomAccessory { NowPlayingBar() }
```

### View Transitions
```swift
// Combined transitions
.transition(.move(edge: .bottom).combined(with: .opacity))

// Navigation with zoom
.navigationTransition(.zoom(sourceID: "card", in: animation))
```

### Design Principles
1. **Layering** - Glass floats above content; content scrolls and peeks beneath it
2. **Hierarchy** - Glass only for controls/navigation, never the content layer
3. **Responsiveness** - Interactive glass reacts to touch
4. **Adaptivity** - Light/dark, Increase Contrast, Reduce Transparency

---

## iOS 27 Additions (Xcode 27)

| API | Purpose |
|-----|---------|
| `ContentBuilder` | Result-builder attribute that builds views and other content types from closures |
| `.reorderable()` (on `ForEach`) + `.reorderContainer(for:isEnabled:move:)` | Drag-to-reorder in lists, stacks, grids, custom layouts |
| `.swipeActions(edge:allowsFullSwipe:content:onPresentationChanged:)` + `.swipeActionsContainer()` | Swipe actions outside `List` |
| `.visibilityPriority(_:)` on `ToolbarContent` | Keep key toolbar items visible as space shrinks |
| `ToolbarOverflowMenu` | Send secondary toolbar actions straight to overflow |
| `.topBarPinnedTrailing` placement | Pin a toolbar item to the trailing top-bar edge |
| `.toolbarMinimizationBehavior(_:for:)` | Control toolbar minimization on scroll |
| `.asyncImageURLSession(_:)` | Custom `URLSession` (caching) for `AsyncImage` |
| `Tab(role: .prominent)` | Separate trailing tab in the tab bar |
| `Document` protocol (read + write) / `ReadableDocument` | Replace the deprecated `FileDocument` / `ReferenceFileDocument` in `DocumentGroup` |
| `.bordered` text field style + `textInputBorderShape(_:)` | Replace the soft-deprecated `.squareBorder` / `.roundedBorder` |
| `.sceneAccessory` + `ExternalNonInteractiveAccessory` | Non-interactive content on external display scenes (no longer automatic) |
| `ArrangementView` (27.1, all platforms) | Primary/secondary split or overlay layout; see `hig-iphone-duo.md` |

`PreviewProvider` is deprecated (iOS 27.0): use `#Preview`.

Source: developer.apple.com/documentation/updates/swiftui (June 2026); symbols re-checked on developer.apple.com (Oct 2026); deprecations and 27.x notes from the iOS & iPadOS 27 / 27.2 release notes (Nov 2026), see swift-core `references/sdk-27-changes.md`.

→ See `templates/view-structure.md` for code examples
