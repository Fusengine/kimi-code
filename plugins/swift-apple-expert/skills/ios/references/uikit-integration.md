---
name: uikit-integration
description: UIKit integration in SwiftUI with UIViewRepresentable, UIViewControllerRepresentable
when-to-use: using UIKit views in SwiftUI, accessing UIKit-only features, wrapping third-party UIKit libraries
keywords: UIViewRepresentable, UIViewControllerRepresentable, UIKit, coordinator, bridge
priority: medium
related: uikit-26-27.md, ../../swiftui-core/references/views-modifiers.md
---

# UIKit Integration

## When to Use

- UIKit-only components (not maps or web content: SwiftUI has native views for both, see "Native SwiftUI first")
- Third-party UIKit libraries
- Complex gesture handling
- Features not yet in SwiftUI
- Gradual migration from UIKit

## Key Concepts

### UIViewRepresentable
Wrap UIKit views for SwiftUI.

**Required Methods:**
- `makeUIView(context:)` - Create UIKit view
- `updateUIView(_:context:)` - Update from SwiftUI state

**Key Points:**
- Returns concrete UIView subclass
- Context provides coordinator and environment
- Update called on every SwiftUI state change

### UIViewControllerRepresentable
Wrap UIKit view controllers for SwiftUI.

**Required Methods:**
- `makeUIViewController(context:)` - Create VC
- `updateUIViewController(_:context:)` - Update

**Key Points:**
- For full view controllers (camera, document picker)
- Manages view controller lifecycle
- Access to navigation controller

### Coordinator
Bridge between UIKit delegates and SwiftUI.

**Key Points:**
- Handle UIKit delegate callbacks
- Communicate back to SwiftUI via bindings
- Created in `makeCoordinator()`
- Access via `context.coordinator`

### Context
Environment and coordinator access.

**Provides:**
- `coordinator` - Your coordinator instance
- `environment` - SwiftUI environment values
- `transaction` - Animation context

---

## When to Use Which

| Scenario | Protocol |
|----------|----------|
| Simple view (text field, slider) | UIViewRepresentable |
| Full screen (camera, picker) | UIViewControllerRepresentable |
| Delegate callbacks | Coordinator |
| SwiftUI → UIKit data | updateUIView |
| UIKit → SwiftUI data | Coordinator + Binding |

---

## Native SwiftUI first

Apple ships SwiftUI views for what used to need a wrapper. Verified on `developer.apple.com/tutorials/data/documentation/<path>.json`, read 2026-11-13:

| Need | Native SwiftUI (availability) | Wrap UIKit only when |
|------|-------------------------------|----------------------|
| Map | `Map` with `@MapContentBuilder` content, `MapCameraPosition` (`mapkit/map`, content initializers iOS 17.0; MapKit for SwiftUI) | you need `MKMapView`-only behavior with no `Map` equivalent, or must support iOS 16 or earlier |
| Web content | `WebView` + `WebPage` (`webkit/webview-swift.struct`, `webkit/webpage`, iOS 26.0, iPadOS, macOS 26.0, visionOS 26.0; `WebView(url:)` or `WebView(page)`) | you support iOS 18 or earlier, or need `WKWebView` API that `WebPage` does not expose (`webkit/wkwebview` iOS 8.0) |
| Photo picking | `PhotosPicker` (iOS 16.0) | never for photo library picking |
| File picking | `fileImporter(isPresented:allowedContentTypes:allowsMultipleSelection:onCompletion:)` (iOS 14.0) | custom document browser |
| Share sheet | `ShareLink` (iOS 16.0) | activity items or excluded types beyond `ShareLink` |
| UIKit gesture recognizers in SwiftUI | `UIGestureRecognizerRepresentable` (iOS 18.0) | |
| SwiftUI inside UIKit cells | `UIHostingConfiguration` (iOS 16.0) | |

Still wrapped: third-party UIKit libraries and any framework view for which the symbol search on developer.apple.com finds no SwiftUI type.

Minimal wrapper (the pattern for a UIKit view with no SwiftUI twin):

```swift
struct LegacyGauge: UIViewRepresentable {
    @Binding var value: Double

    func makeUIView(context: Context) -> UISlider {
        let slider = UISlider()
        slider.addTarget(context.coordinator, action: #selector(Coordinator.changed(_:)), for: .valueChanged)
        return slider
    }
    func updateUIView(_ slider: UISlider, context: Context) { slider.value = Float(value) }
    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject {
        var parent: LegacyGauge
        init(_ parent: LegacyGauge) { self.parent = parent }
        @objc func changed(_ sender: UISlider) { parent.value = Double(sender.value) }
    }
}
```

Reacting to `@Observable` models inside UIKit views, hinge and vertical bars: [uikit-26-27.md](uikit-26-27.md).

---

## Best Practices

- ✅ Use Coordinator for delegates
- ✅ Keep wrapper views small
- ✅ Handle dismantling in representable
- ✅ Pass bindings for two-way data
- ✅ Check if SwiftUI equivalent exists first
- ❌ Don't store state in representable
- ❌ Don't access UIKit from main SwiftUI views
- ❌ Don't forget dismantleUIView when needed
