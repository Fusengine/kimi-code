---
name: code-signing
description: Code signing with certificates, provisioning profiles, and automatic signing
when-to-use: configuring signing, creating certificates, managing provisioning profiles
keywords: code signing, certificate, provisioning profile, automatic signing, Developer ID
priority: high
related: testflight.md, app-store.md
---

# Code Signing

## When to Use

- Setting up new project signing
- Troubleshooting signing issues
- Manual certificate management
- Enterprise distribution
- CI/CD configuration

## Key Concepts

### Automatic Signing (Recommended)
Let Xcode manage certificates and profiles.

**Key Points:**
- Enable in Target → Signing & Capabilities
- Select Development Team
- Xcode creates/updates profiles
- Works for most use cases

### Certificates

| Type | Purpose |
|------|---------|
| Development | Testing on device |
| Distribution | App Store/TestFlight |
| Developer ID | macOS outside App Store |

### Developer ID Sub-CA expiry (deadline 2027-02-01)

The original Developer ID Certification Authority (Sub-CA) expires on **2027-02-01**; certificates it issued stop working that day. Replacements come from **Developer ID Certification Authority (G2)**, valid until 2031, but G2-issued certificates expire annually and must be renewed each year. Sources: https://developer.apple.com/news/?id=w4atic4c (2026-10-01) and https://developer.apple.com/help/account/certificates/replace-developer-id-certificates (both read 2026-11-13).

| Step | Detail |
|------|--------|
| Check | Certificates, Identifiers & Profiles: Developer ID Application and Installer certificates expiring on or before 2027-02-01 are likely affected. Confirm in Keychain Access: Issuer Name > Organizational Unit `Apple Certification Authority` = old Sub-CA (replace), `G2` = current (no action) |
| Create | New certificate; when asked for the Developer ID Certificate Intermediary choose **G2 Sub-CA** (Xcode 11.4.1 or later). Any other option may issue a certificate that also expires in 2027. Repeat for both Application and Installer types |
| Re-sign installer packages (`.pkg`) | From 2027-02-01 a `.pkg` signed with an affected certificate no longer installs: re-sign every package before that date |
| Re-sign Mac apps | Software already signed and notarized (with a secure timestamp) keeps working; sign future updates with the new certificate and a secure timestamp |

A team can hold up to five Developer ID Application and five Installer certificates, so create and test the replacement before the old one expires. Notarization workflow: `macos` skill `references/notarization.md`.

### Provisioning Profiles
Link app, team, certificates, and devices.

**Types:**
- Development (device testing)
- App Store (distribution)
- Ad Hoc (limited distribution)
- Enterprise (in-house)

### Entitlements
App capabilities and permissions.

**Common:**
- Push Notifications
- iCloud
- App Groups
- HealthKit

---

## Troubleshooting

### "No signing certificate"
1. Open Keychain Access
2. Check for expired certificates
3. Revoke and recreate in Developer Portal
4. Download new certificate

### "Profile doesn't match"
1. Clean build folder
2. Delete derived data
3. Refresh provisioning profiles
4. Re-select team

### Verification Commands

```bash
# List certificates
security find-identity -v -p codesigning

# Check provisioning profiles
ls ~/Library/MobileDevice/Provisioning\ Profiles/

# Verify app signature
codesign -dvvv MyApp.app
```

---

## CI/CD Signing

### Environment Variables
- `APPLE_TEAM_ID` - Team identifier
- `CERTIFICATE_P12` - Base64 certificate
- `PROVISIONING_PROFILE` - Base64 profile

### fastlane match
Centralized certificate management.

**Benefits:**
- Shared across team
- Git storage
- Automatic renewal

---

## Best Practices

- ✅ Use automatic signing when possible
- ✅ Let Xcode manage profiles
- ✅ Use fastlane match for teams
- ✅ Store CI secrets securely
- ❌ Don't share certificates insecurely
- ❌ Don't commit profiles to git
- ✅ Renew G2 Developer ID certificates yearly; calendar the 2027-02-01 Sub-CA cut-off
- ❌ Don't ignore expiration dates
