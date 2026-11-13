---
name: viewmodel-template
applies-to: "**/*.swift"
description: Complete @Observable ViewModel template with @MainActor
when-to-use: creating ViewModels, state management, service injection
keywords: viewmodel, observable, MainActor, template, Swift
---

# ViewModel Template

## Rules

- One screen responsibility per ViewModel; under the hook ceiling (`FUSE_SOLID_MAX_LINES`)
- Always `@MainActor @Observable`
- Location: `Features/[Feature]/ViewModels/`
- Depend on protocols, not concrete types
- Include `.preview` static for `#Preview`

---

## Standard ViewModel

```swift
// Features/[Feature]/ViewModels/FeatureViewModel.swift
import Foundation

/// ViewModel for [Feature] screen.
@MainActor
@Observable
final class FeatureViewModel {
    // MARK: - State
    // Mutually-exclusive states as ONE value: illegal states are unrepresentable.
    // `LoadState<Value>` / `LoadFailure` are defined once in
    // references/state-machines.md (Core/Models/LoadState.swift).

    private(set) var state: LoadState<FeatureData> = .idle

    // MARK: - Dependencies

    private let service: FeatureServiceProtocol

    // MARK: - Init

    init(service: FeatureServiceProtocol) {
        self.service = service
    }

    // MARK: - Actions

    /// Loads feature data from API.
    func load() async {
        state = .loading
        do    { state = .loaded(try await service.fetchData()) }
        catch { state = .failed(LoadFailure(error)) }
    }

    /// Refreshes data (pull-to-refresh) without flashing the loading state.
    /// A failed refresh keeps the content already on screen.
    func refresh() async {
        do { state = .loaded(try await service.fetchData()) }
        catch {
            if case .loaded = state { return }
            state = .failed(LoadFailure(error))
        }
    }
}

// MARK: - Preview

extension FeatureViewModel {
    static var preview: FeatureViewModel {
        let vm = FeatureViewModel(service: MockFeatureService())
        vm.state = .loaded(.preview)   // private(set) is settable in-file
        return vm
    }

    static var previewLoading: FeatureViewModel {
        let vm = FeatureViewModel(service: MockFeatureService())
        vm.state = .loading
        return vm
    }
}
```

---

## CRUD ViewModel

```swift
// Features/[Feature]/ViewModels/FeatureFormViewModel.swift
import Foundation

/// ViewModel for creating/editing [Feature].
@MainActor
@Observable
final class FeatureFormViewModel {
    // MARK: - Form State

    var name = ""
    var description = ""
    var isSaving = false
    var validationError: String?

    // MARK: - Dependencies

    private let service: FeatureServiceProtocol

    init(service: FeatureServiceProtocol) {
        self.service = service
    }

    // MARK: - Validation

    var isValid: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty
    }

    // MARK: - Actions

    /// Saves the feature data.
    func save() async -> Bool {
        guard isValid else {
            validationError = "feature.validation.name_required"
            return false
        }

        isSaving = true
        defer { isSaving = false }

        do {
            let dto = CreateFeatureDTO(name: name, description: description)
            _ = try await service.create(dto)
            return true
        } catch {
            validationError = error.localizedDescription
            return false
        }
    }
}
```
