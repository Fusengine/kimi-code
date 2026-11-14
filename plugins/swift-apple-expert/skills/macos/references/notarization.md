---
name: notarization
description: macOS code signing, notarization, and distribution outside App Store
when-to-use: distributing Mac apps, signing for Gatekeeper, creating DMG, notarizing apps
keywords: notarization, code signing, Gatekeeper, DMG, stapler, notarytool
priority: high
requires: build-tools.md
related: app-structure.md
---

# macOS Notarization

## When to Use

- Distributing outside Mac App Store
- Creating signed DMG installers
- Ensuring Gatekeeper approval
- Enterprise distribution

## Key Concepts

### Code Signing
Cryptographically sign app to verify identity.

**Requirements:**
- Developer ID certificate
- Valid Apple Developer account
- Hardened Runtime enabled

### Notarization
Apple scans and approves app for Gatekeeper.

**Process:**
1. Sign app with Developer ID
2. Upload to Apple's notary service
3. Apple scans for malware
4. Receive notarization ticket
5. Staple ticket to app

**Preconditions the notary service enforces** (https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution, read 2026-11-13):
- Developer ID application, kernel/system extension or installer certificate (not Mac Distribution, ad hoc or development)
- Hardened Runtime enabled for app and command-line targets
- Secure timestamp in the signature (Xcode's distribution workflow adds it; custom workflows must pass it)
- No `com.apple.security.get-task-allow` entitlement set to true
- Linked against the macOS 10.9 SDK or later; well-formed XML, ASCII entitlements

Notarization is not App Review, and Mac App Store software does not need it. `altool` and Xcode 13 or earlier have been rejected by the notary service since 2023-11-01; use `notarytool` (Xcode 13+) or the Notary API.

### Stapling
Attach notarization ticket to app bundle.

**Benefits:**
- Works offline after stapling
- Faster Gatekeeper check
- DMG can be stapled too

---

## Notarization Workflow

### 1. Store Credentials
```bash
xcrun notarytool store-credentials "notary-profile" \
  --apple-id "dev@company.com" \
  --team-id "XXXXXXXXXX" \
  --password "@keychain:AC_PASSWORD"
```

### 2. Submit for Notarization
```bash
xcrun notarytool submit ./MyApp.dmg \
  --keychain-profile "notary-profile" \
  --wait
```

### 3. Staple Ticket
```bash
xcrun stapler staple ./MyApp.dmg
```

### What you can submit

| Deliverable | How |
|-------------|-----|
| `.app` | The service does not take a bare bundle: `ditto -c -k --keepParent MyApp.app MyApp.zip`, submit the ZIP |
| Disk image | UDIF `.dmg`, submit directly |
| Flat installer package | A **signed** flat `.pkg` (Developer ID Installer certificate), submit directly, then `xcrun stapler staple ./MyApp.pkg` |

The service processes nested containers (pkg inside dmg) and issues a ticket per nested item. A custom third-party installer needs two rounds: notarize and staple the payload, build it into the installer, then notarize the installer. Source: https://developer.apple.com/documentation/security/customizing-the-notarization-workflow (read 2026-11-13).

---

## Developer ID certificate expiry (2027-02-01)

Certificates issued by the original Developer ID Sub-CA stop working on **2027-02-01**; renew from **Developer ID Certification Authority (G2)** (choose "G2 Sub-CA" as intermediary; G2 certificates last one year).
- `.pkg` files signed with an affected certificate **no longer install** from that date: re-sign every package.
- Apps already signed and notarized with a secure timestamp keep working; sign updates with the new certificate and a secure timestamp.

Procedure: `build-distribution` skill `references/code-signing.md`. Source: https://developer.apple.com/news/?id=w4atic4c (2026-10-01, read 2026-11-13).

---

## Mac App Store and TestFlight builds

- Do not ship `com.apple.quarantine` in macOS apps for TestFlight or the App Store; since 2025-02-18 the attribute must be removed from every file in the app to upload (https://developer.apple.com/news/upcoming-requirements/, read 2026-11-13). Targeted removal (`xattr(1)`: `-d` deletes one attribute, `-r` recurses): `xattr -dr com.apple.quarantine MyApp.app`; verify with `xattr -lr MyApp.app | grep quarantine`.
- Intel: Apple's posts differ in wording. News k1mtkt1k (2026-09-09): "macOS 26 is the final release supporting Intel Mac computers and Rosetta — macOS 27 will be Apple silicon only". News w5ngl9k2 (2026-09-01): "macOS 27: Final release to support Rosetta — Intel-only apps will no longer run on Mac computers with Apple silicon after this update". Either way, ship an arm64 slice. A universal app with minimum macOS 13+ may drop `x86_64` and upload to the Mac App Store (App Store Connect release notes, 2026-06-18). To limit an app to Apple silicon set the build architecture to `arm64` only.
- Rosetta remains for older Intel-framework gaming titles only (news w5ngl9k2).

---

## DMG Creation

```bash
# Create DMG from app
hdiutil create -volname "MyApp" \
  -srcfolder ./MyApp.app \
  -ov -format UDZO \
  ./MyApp.dmg

# Sign DMG
codesign --sign "Developer ID Application: ..." \
  ./MyApp.dmg
```

---

## Verification

```bash
# Check code signing
codesign -dvvv MyApp.app

# Check notarization
spctl -a -vvv MyApp.app

# Check stapling
stapler validate MyApp.dmg
```

---

## Best Practices

- ✅ Enable Hardened Runtime
- ✅ Sign all executables and frameworks
- ✅ Notarize before distribution
- ✅ Staple for offline verification
- ✅ Test on clean Mac
- ✅ Replace Developer ID certificates issued from the old Sub-CA before 2027-02-01
- ✅ Ship arm64 (universal while you still support Intel on macOS 26 and earlier)
- ❌ Don't skip notarization
- ❌ Don't distribute unsigned apps
- ❌ Don't ignore Gatekeeper warnings
