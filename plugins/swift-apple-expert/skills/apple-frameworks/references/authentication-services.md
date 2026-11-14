---
name: authentication-services
description: AuthenticationServices - passkey sign-in and fast account creation, ASAuthorizationController options, Credential Exchange between password managers, and ASCredentialDataManager (replacing the deprecated ASCredentialUpdater)
when-to-use: adding passkey sign-up or sign-in, upgrading password accounts to passkeys, exporting or importing credentials, telling credential managers about renamed, revoked or unused credentials
keywords: passkey, ASAuthorizationController, ASAuthorizationAccountCreationProvider, ASCredentialExportManager, ASCredentialImportManager, ASCredentialDataManager, ASCredentialUpdater, preferImmediatelyAvailableCredentials, conditional registration
priority: high
related: ../SKILL.md, app-attest.md
---

# AuthenticationServices

Sources, read 2026-11-13: symbol pages `developer.apple.com/tutorials/data/documentation/authenticationservices/<symbol>.json`; framework page https://developer.apple.com/documentation/authenticationservices; WWDC25 session 279 "What's new in passkeys" (code via https://developer.apple.com/videos/play/wwdc2025/279/). The framework updates page has no entry after June 2024: the 2025-2026 items below come from symbol pages and release notes.

## Setup

Associated Domains capability with `webcredentials:<your domain>` and an `apple-app-site-association` file at `/.well-known/` listing the app ID for `webcredentials` (Apple's passkey samples, `performing-fast-account-creation-with-passkeys`).

## Symbols

| Need | Symbol | Availability |
|------|--------|--------------|
| Run requests (UIKit/AppKit) | `ASAuthorizationController(authorizationRequests:)`, `performRequests(options:)`, `performAutoFillAssistedRequests()` | 13.0 / 16.0 |
| Run requests (SwiftUI) | `@Environment(\.authorizationController)` -> `AuthorizationController.performRequest(_:)`, `performAutoFillAssistedRequest(_:)`; result `ASAuthorizationResult` | 16.4 |
| Prefer a credential on this device | `ASAuthorizationController.RequestOptions.preferImmediatelyAvailableCredentials` | 16.0. iOS 26 notes: now also works for passkey registration |
| Passkey sign-in / sign-up | `ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier:)` -> `createCredentialAssertionRequest(challenge:)`, `createCredentialRegistrationRequest(challenge:name:userID:)` | 15.0 |
| Silent passkey upgrade after a password sign-in | `createCredentialRegistrationRequest(challenge:name:userID:requestStyle:)` with `RequestStyle.conditional` | 18.0 |
| Fast account creation | `ASAuthorizationAccountCreationProvider().createPlatformPublicKeyCredentialRegistrationRequest(acceptedContactIdentifiers:shouldRequestName:relyingPartyIdentifier:challenge:userID:)`; request `ASAuthorizationAccountCreationPlatformPublicKeyCredentialRequest`; result case `ASAuthorizationResult.passkeyAccountCreation(_:)` with `credentialRegistration`, `name`, `contactIdentifier` | 26.0 |
| Account-creation errors | `ASAuthorizationError.deviceNotConfiguredForPasskeyCreation`, `.preferSignInWithApple`, `.matchedExcludedCredential` (18.0), `.canceled` | 26.0 for the first two |
| Export credentials | `ASCredentialExportManager(presentationAnchor:)`, `requestExport(for:)` -> `ExportOptions`, `exportCredentials(_:)`; SwiftUI `@Environment(\.credentialExportManager)` | 26.0 |
| Import credentials | `ASCredentialImportManager()`, `importCredentials(token:)` -> `ASExportedCredentialData`; token from `ASCredentialImportToken` in the user activity | 26.0 |
| Tell credential managers about changes | `ASCredentialDataManager`: `reportPublicKeyCredentialUpdate(relyingPartyIdentifier:userHandle:newName:)`, `reportAllAcceptedPublicKeyCredentials(relyingPartyIdentifier:userHandle:acceptedCredentialIDs:)`, `reportUnusedPasswordCredential(domain:userName:)`, `reportUnknownPublicKeyCredential(relyingPartyIdentifier:credentialID:)`, `save(password:for:title:anchor:)` | 26.2, all `async throws` |
| **Deprecated** | `ASCredentialUpdater` (same four report methods) | introduced 26.0, deprecated 26.2: use `ASCredentialDataManager` |

`ASCredentialDataManager` does not say whether the operation succeeded (privacy): a return only means the parameters were well formed.

## Fast account creation (WWDC25 session 279, 6:33)

```swift
import AuthenticationServices
import SwiftUI

struct SignUpView: View {
    @Environment(\.authorizationController) private var authorizationController
    @State private var showPasswordForm = false

    func signUp() async {
        let provider = ASAuthorizationAccountCreationProvider()
        let request = provider.createPlatformPublicKeyCredentialRegistrationRequest(
            acceptedContactIdentifiers: [.email, .phoneNumber],
            shouldRequestName: true,
            relyingPartyIdentifier: "example.com",
            challenge: await fetchChallenge(),   // your server
            userID: await fetchUserID()          // your server
        )
        do {
            let result = try await authorizationController.performRequest(request)
            if case .passkeyAccountCreation(let account) = result {
                // Send account.credentialRegistration to the server to create the account.
                _ = account
            }
        } catch ASAuthorizationError.deviceNotConfiguredForPasskeyCreation {
            showPasswordForm = true
        } catch ASAuthorizationError.canceled {
            showPasswordForm = true
        } catch ASAuthorizationError.preferSignInWithApple {
            // Offer Sign in with Apple instead.
        } catch {
            // Surface the error.
        }
    }

    var body: some View { Button("Create account") { Task { await signUp() } } }
}
```

`fetchChallenge()` and `fetchUserID()` are your server calls (`async -> Data`). Challenges are single-use and server-generated; verify the registration and assertion on the server.

## Credential Exchange (iOS 26)

Credential provider extension Info.plist: `NSExtension > NSExtensionAttributes > ASCredentialProviderExtensionCapabilities > SupportsCredentialExchange = YES` and `SupportedCredentialExchangeVersions` (only `1.0` exists). The importing app lists the activity type in `NSUserActivityTypes` (Apple's prose says `ASCredentialExchangeActivityType`; the declared constant is `ASCredentialExchangeActivity`, iOS 26.0, and Apple's sample uses the non-existent name: use the declared one), then receives the token:

```swift
.onContinueUserActivity(ASCredentialExchangeActivity) { activity in
    Task {
        guard let token = activity.userInfo?[ASCredentialImportToken] as? UUID else { return }
        let data = try await credentialImportManager.importCredentials(token: token)
        _ = data // store through your own vault
    }
}
```

Export: `let options = try await credentialExportManager.requestExport()`, build `ASExportedCredentialData` in the format version `options` reports, then `try await credentialExportManager.exportCredentials(data)`. The system shows its own UI explaining the risks and choosing the importer; nothing is written to disk (Apple's `ASCredentialExportManager` page).

## Report credential changes

```swift
let manager = ASCredentialDataManager()
try await manager.reportPublicKeyCredentialUpdate(
    relyingPartyIdentifier: "example.com",
    userHandle: userHandle,            // Data
    newName: "andrew@example.com"
)
```

WWDC25 session 279 shows the same calls on `ASCredentialUpdater` (session predates the 26.2 deprecation): use the `ASCredentialDataManager` form above.
