---
name: app-attest
description: App Attest (DeviceCheck) - key generation, attestation, assertions, the iOS 27 authenticator-data extensions, macOS 27 support, and the fraud metric
when-to-use: proving to your server that requests come from a genuine, unmodified copy of your app, on iOS or on macOS 27 and later
keywords: DCAppAttestService, generateKey, attestKey, generateAssertion, isSupported, fraud metric, launch validation category, ACL blob, relying party identifier
priority: medium
related: ../SKILL.md, authentication-services.md
---

# App Attest

Sources, read 2026-11-13: WWDC26 session 201 "Secure your apps with App Attest" (https://developer.apple.com/videos/play/wwdc2026/201/; transcript and code read on the page), article https://developer.apple.com/documentation/devicecheck/establishing-your-app-s-integrity, symbol pages `.../tutorials/data/documentation/devicecheck/dcappattestservice/<symbol>.json`, Apple's June 2026 updates index ("The DeviceCheck framework brings App Attest to macOS with additional device information").

## Platform availability

- Session 201: App Attest "is supported on all Apple platforms, including macOS 27 and higher, which was previously not supported". Not every app type or extension is eligible (it works in Action and SSO app extensions, not other extension types): gate with `DCAppAttestService.shared.isSupported`.
- The symbol pages show `DCAppAttestService` and `isSupported` with `introducedAt` iOS 14.0, macOS 11.0, tvOS 15.0, visionOS 1.0, watchOS 9.0. Treat the session as the statement of macOS behavior: keep the macOS code path behind `if #available(macOS 27, *)`.
- An unexpected `isSupported == false` on a platform where you ship is a fraud signal worth logging server-side (session 201); decide deliberately whether to let the person continue.

## Symbols (DeviceCheck)

| Need | Symbol |
|------|--------|
| Support check | `DCAppAttestService.shared.isSupported` |
| Create key | `generateKey()` `async throws -> String` (key ID, hash of the public key; private key stays in the Secure Enclave) |
| Attest | `attestKey(_ keyId: String, clientDataHash: Data)` `async throws -> Data` |
| Assert | `generateAssertion(_ keyId: String, clientDataHash: Data)` `async throws -> Data` |
| Capability | `com.apple.developer.devicecheck.appattest-environment` entitlement (named on the DeviceCheck landing page) |

The session's slide code writes `attestKey(keyId:clientDataHash:)`; the symbol page declares `attestKey(_:clientDataHash:)` (unlabeled key ID). Use the symbol page form. Callback variants exist for all three methods.

## Flow and rules (session 201)

1. **Key**: one key per user for account-based apps, or one for the whole app; never share keys across users. Store the key ID in the Keychain. Key IDs survive app updates; reinstalling or restoring the device (including from iCloud backup) invalidates the key; keys never sync across devices.
2. **Attest**: your server starts it and vends a challenge (keeps request rates bounded); the app calls `attestKey` with the key ID and the hash of the challenge, sends the attestation to the server, which validates it and associates it with the user. Retry failures later with exponential back-off, no hard-coded retry loops; run it outside user flows (background task). Never validate in the app.
3. **Attestation contents** (server side): a fixed format string, attestation statement (certificate chain proving genuine Apple hardware, nonce, key ID and relying party identifier in the leaf certificate, plus a receipt) and authenticator data. The relying party identifier is Team ID + bundle ID. New in iOS 27: extensions appended to the authenticator data: **launch validation category** (App Store vs TestFlight and others) and **bundle version**. New in macOS 27: the key access control property (ACL Blob OID) in the leaf certificate; on macOS App Attest keys require full security mode and System Integrity Protection.
4. **Assert**: per sensitive request, server vends a challenge, app calls `generateAssertion`, embeds the result in the payload. Assertions are generated locally (no Apple round trip) but cost CPU: do not generate them in tight loops. The server verifies the signature and requires the assertion **counter to be strictly increasing**; the same iOS 27 extensions appear in assertion authenticator data.
5. **Server reactions**: do not reject a new key for an existing user outright (reinstall and restore rotate keys) and do not instantly invalidate older keys; on rejection degrade features rather than block, after a risk assessment.
6. **Fraud metric**: your server POSTs a stored attestation receipt to the App Attest data server and receives a receipt whose risk metric is an approximate count of unique attested keys for your app on one device over the past 30 days. Key rotation (reinstall, restore) raises it. Use it as an investigation signal and baseline, never to block users outright. Refresh receipts after their not-before time; they expire.

```swift
import DeviceCheck

struct AttestationClient {
    private let service = DCAppAttestService.shared

    func attest(challengeHash: Data, existingKeyID: String?) async throws -> (keyID: String, attestation: Data)? {
        guard service.isSupported else { return nil }          // treat as a risk signal on the server
        let keyID: String
        if let existingKeyID { keyID = existingKeyID } else { keyID = try await service.generateKey() }
        let attestation = try await service.attestKey(keyID, clientDataHash: challengeHash)
        return (keyID, attestation)                            // send to your server; it validates
    }

    func assertion(keyID: String, requestHash: Data) async throws -> Data {
        try await service.generateAssertion(keyID, clientDataHash: requestHash)
    }
}
```

Persist `keyID` in the Keychain yourself. `clientDataHash` is the SHA-256 of your server challenge (and request payload for assertions): the article builds it with `SHA256` from CryptoKit.
