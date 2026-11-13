---
name: single-responsibility
applies-to: "**/*.swift"
description: SRP Guide - One responsibility per type for Swift and SwiftUI
when-to-use: fat views, monolithic ViewModels, views doing API calls, splitting files
keywords: single responsibility, SRP, view, viewmodel, service, split, Swift
priority: high
related: open-closed.md, templates/view.md, templates/viewmodel.md, templates/service.md
---

# Single Responsibility Principle (SRP) for Swift

**Each type has exactly one reason to change**

---

## When to Apply SRP?

### Symptoms of Violation

1. **View contains API calls** -> Mix of UI + networking
2. **ViewModel validates AND fetches AND formats** -> Too many roles
3. **File mixes several concerns or nears the hook ceiling (`FUSE_SOLID_MAX_LINES`)** -> Needs splitting
4. **View body hard to read (~30+ lines)** -> Extract subviews
5. **Model contains business logic** -> Should be in Service

---

## Layer Responsibilities (Features Modular MANDATORY)

| Layer | Location | Responsibility |
|-------|----------|----------------|
| View | `Features/[Feature]/Views/` | UI rendering only |
| ViewModel | `Features/[Feature]/ViewModels/` | State + user actions |
| Service | `Features/[Feature]/Services/` | Business logic + API |
| Model | `Core/Models/` | Data structure only |
| Protocol | `Features/[Feature]/Protocols/` | Contract definition |

Every file stays within the hook ceiling `FUSE_SOLID_MAX_LINES`.

Shared code: `Core/Services/`, `Core/Protocols/`, `Core/Extensions/`

---

## How to Split a Fat View?

### Before (View doing everything)

```swift
// Features/User/Views/UserView.swift - 200+ lines!
struct UserView: View {
    @State private var state: LoadState<User> = .idle   // see state-machines.md

    var body: some View {
        VStack { /* 150 lines of UI */ }
        .onAppear {
            Task {
                let url = URL(string: "https://api.example.com/user")!
                let (data, _) = try await URLSession.shared.data(from: url)
                state = .loaded(try JSONDecoder().decode(User.self, from: data))
            }
        }
    }
}
```

### After (Separated concerns)

```
Features/User/
├── Views/
│   ├── UserView.swift          # orchestrator
│   ├── UserHeader.swift        # subview
│   └── UserContent.swift       # subview
├── ViewModels/
│   └── UserViewModel.swift     # state management
├── Services/
│   └── UserService.swift       # API calls
└── Protocols/
    └── UserServiceProtocol.swift # contract
```

---

## SRP Decision Tree

```
New code needed?
├── UI rendering       -> View (Features/[Feature]/Views/)
├── State management   -> ViewModel (Features/[Feature]/ViewModels/)
├── Business logic     -> Service (Features/[Feature]/Services/)
├── Data structure     -> Model (Core/Models/)
├── Contract           -> Protocol (Features/[Feature]/Protocols/)
├── Type enhancement   -> Extension (Core/Extensions/)
├── Reusable utility   -> Utility (Core/Utilities/)
└── Shared across 2+   -> Core/ directly
```

---

## SRP Checklist

- [ ] Views only render UI (no API calls, no business logic)
- [ ] ViewModels manage state via protocol-based services
- [ ] Services handle one domain (User, Auth, Payment...)
- [ ] Models are pure data structures (no methods beyond computed props)
- [ ] Protocols in `Features/[Feature]/Protocols/` or `Core/Protocols/`
- [ ] Files within line limits
- [ ] Subviews extracted at 30+ lines of body
