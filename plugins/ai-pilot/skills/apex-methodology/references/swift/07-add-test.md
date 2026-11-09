---
name: 07-add-test
description: Write tests using Swift Testing and XCTest frameworks
prev_step: references/swift/06-fix-issue.md
next_step: references/swift/08-check-test.md
---

# Swift Testing Patterns

## Swift Testing Framework (iOS 18+)

```swift
import Testing
@testable import MyApp

@Suite("Profile Tests")
struct ProfileViewModelTests {
    @Test("Load profile successfully")
    func loadProfileSuccess() async throws {
        let mockService = MockProfileService()
        mockService.stubbedProfile = .preview
        let viewModel = ProfileViewModel(service: mockService)

        await viewModel.load(id: "1")

        #expect(viewModel.profile?.id == "1")
        #expect(viewModel.isLoading == false)
    }

    @Test("Load profile handles error")
    func loadProfileError() async {
        let mockService = MockProfileService()
        mockService.shouldFail = true
        let viewModel = ProfileViewModel(service: mockService)

        await viewModel.load(id: "1")

        #expect(viewModel.error != nil)
    }
}
```

## Parameterized Tests

```swift
@Test("Validate IDs", arguments: ["valid-1", "valid-2"])
func validateUserID(_ id: String) {
    #expect(UserID.isValid(id))
}
```

## Test Traits

```swift
@Test(.disabled("Waiting for API")) func pending() { }
@Test(.timeLimit(.minutes(1))) func slow() async { }
```

## Mock Pattern

```swift
final class MockProfileService: ProfileServiceProtocol, @unchecked Sendable {
    var stubbedProfile: UserProfile?
    var shouldFail = false

    func fetchProfile(id: String) async throws -> UserProfile {
        if shouldFail { throw NetworkError.serverError }
        guard let profile = stubbedProfile else { throw NetworkError.notFound }
        return profile
    }
}
```

## UI Testing

```swift
final class ProfileUITests: XCTestCase {
    func testProfileDisplaysName() {
        let app = XCUIApplication()
        app.launch()
        app.tabBars.buttons["Profile"].tap()
        XCTAssertTrue(app.staticTexts["profileNameLabel"].waitForExistence(timeout: 5))
    }
}
```

## Test Organization

```text
Tests/
├── UnitTests/ViewModels/ProfileViewModelTests.swift
├── IntegrationTests/ProfileFlowTests.swift
└── UITests/ProfileUITests.swift
```

## Task Phase

Phase: `add-test`. `.kimi-code/apex/` is harness state, read-only for agents and the lead: never create or write anything there. Kimi has no task-board sync: the lead tracks the phase in its `TodoList`; state the phase in your REPORT and keep tracking in the agents' REPORTs and `docs/decisions.md`.

## Next Phase

→ Proceed to `08-check-test.md`
```
