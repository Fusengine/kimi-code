---
name: state-management
description: SwiftUI state with @State, @Binding, @Observable, @Environment, property wrappers
when-to-use: managing view state, sharing data between views, dependency injection, reactive updates
keywords: State, Binding, Observable, Environment, ObservableObject, StateObject, EnvironmentObject
priority: high
related: views-modifiers.md, architecture.md
---

# SwiftUI State Management

## When to Use

- Local view state (@State)
- Passing state to child views (@Binding)
- Shared state across views (@Observable)
- Dependency injection (@Environment)
- App-wide services (Environment)

## Key Concepts

### @State
Local view state. Source of truth for simple values.

**Key Points:**
- Use for view-local data only
- Marked `private` by convention
- Value types, or an `@Observable` class instance the view owns
- Creates binding with `$property`
- Xcode 27+: `@State` is the `State()` macro (back-deploys to iOS 17-aligned OSes) — the initial-value expression is evaluated once, so `@State private var model = Model()` no longer calls `Model.init()` on every view re-instantiation
- Macro caveats: do not give an initial value at the declaration AND assign it in `init` (assign only in `init`); a struct whose stored members are all private no longer gets the synthesized private `init`; generic arguments may need an explicit type; composing `@State` with other property wrappers or macros is unsupported (Xcode 27 release notes, https://developer.apple.com/documentation/ios-ipados-release-notes/ios-ipados-27-release-notes)

### @Binding
Two-way connection to state owned elsewhere.

**Key Points:**
- Child doesn't own the data
- Changes propagate to parent
- Use `$property` to pass binding
- Can create constant with `.constant()`

### @Observable (iOS 17+)
Modern replacement for ObservableObject. Recommended.

**Key Points:**
- No `@Published` needed
- Automatic fine-grained tracking
- Only accessed properties trigger updates
- Use `@MainActor` for UI updates

### @Environment
Inject values through view hierarchy.

**Key Points:**
- Access system values (colorScheme, locale)
- Custom environment keys for dependencies
- Values flow down from parent
- Good for dependency injection

### @Bindable (iOS 17+)
Create bindings from @Observable objects.

**Key Points:**
- Use with @Observable classes
- Creates bindings to properties
- `@Bindable var model: Model`
- Required for form controls

---

## State Selection Guide

| Scenario | Property Wrapper |
|----------|------------------|
| Local primitive value | @State |
| Pass to child for editing | @Binding |
| Shared business logic | @Observable + @Environment |
| System value (colorScheme) | @Environment |
| View model in view | @State with @Observable |
| Form editing @Observable | @Bindable |

---

## Migration from ObservableObject

| Old (iOS 16-) | New (iOS 17+) |
|---------------|---------------|
| ObservableObject | @Observable |
| @Published | (automatic) |
| @StateObject | @State |
| @ObservedObject | (automatic) |
| @EnvironmentObject | @Environment |

---

## Best Practices

- ✅ Use @Observable for shared state (not ObservableObject)
- ✅ Use @State for local view state
- ✅ Use @Environment for dependency injection
- ✅ Keep state at lowest common ancestor
- ✅ Make state immutable when possible
- ❌ Don't use @StateObject with @Observable
- ❌ Don't mutate state outside SwiftUI lifecycle
- ❌ Don't store UI state in persistent models

→ See `templates/observable-viewmodel.md` for code examples
