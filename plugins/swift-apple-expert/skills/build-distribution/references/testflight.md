---
name: testflight
description: TestFlight beta testing with internal and external testers
when-to-use: beta testing apps, distributing to testers, collecting feedback
keywords: TestFlight, beta, testing, internal tester, external tester, App Store Connect
priority: high
requires: code-signing.md
related: app-store.md, app-store-connect-2026.md
---

# TestFlight Beta Testing

## When to Use

- Beta testing before release
- Internal team testing
- External user testing
- Collecting crash reports
- Gathering feedback

## Key Concepts

Source for all limits below: https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview (read 2026-11-13).

### Internal Testers
App Store Connect users with access to your content (up to 100).

**Key Points:**
- Must have an App Store Connect role
- Builds are assigned through groups

### External Testers
Up to 10,000 people, invited by email or public link.

**Key Points:**
- The first build added to a group is sent to App Review; subsequent builds may not require a full review, and testing starts once a build is approved
- Public link invitations: criteria you set can limit the number of testers
- A build can be tested for up to 90 days
- Groups for organization

### Build Distribution

| Channel | Review | Limit |
|---------|--------|-------|
| Internal | None stated | 100 App Store Connect users |
| External | First build of the app | 10,000 testers |

macOS builds for TestFlight and the App Store must not carry the `com.apple.quarantine` extended attribute (see [app-store.md](app-store.md)).

---

## Upload Process

### Via Xcode

1. Archive (Product → Archive)
2. Distribute App → App Store Connect
3. Select Upload
4. Wait for processing

### Via CLI and API

Supported upload paths for an iOS/iPadOS/tvOS/visionOS/watchOS build: Xcode (Organizer), Swift Playground, Transporter, `altool`, the App Store Connect API (`POST /v1/buildUploads`), or Xcode Cloud. Source: https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds (read 2026-11-13). Upload for all target types is supported by Transporter and altool. Uploading with Xcode needs Xcode 14 or later (Xcode 15 or later for visionOS).

```bash
# Validate, then upload with altool (invoked through xcrun)
xcrun altool --validate-app -f MyApp.ipa -t ios -u "dev@company.com" -p "@keychain:AC_PASSWORD"
xcrun altool --upload-app   -f MyApp.ipa -t ios -u "dev@company.com" -p "@keychain:AC_PASSWORD"
```

- For API-driven pipelines Apple suggests uploading the binary with the Transporter command-line tool and the same JWTs you use for the App Store Connect API; the REST route is "Create a Build Upload" (https://developer.apple.com/documentation/appstoreconnectapi/post-v1-builduploads, read 2026-11-13).
- `xcrun notarytool` is **not** an upload path for builds: it submits macOS software (apps, disk images, flat packages) to the Apple notary service for Developer ID distribution. See `macos` skill `references/notarization.md`.
- Build status and warnings are visible in App Store Connect; webhooks can notify your server when a build upload or beta build changes status (see [app-store-connect-2026.md](app-store-connect-2026.md)).

### Via fastlane

```ruby
lane :beta do
  build_app(scheme: "MyApp")
  upload_to_testflight(groups: ["Beta Testers"])
end
```

---

## Build Processing

A build must finish processing in Apple's system before it appears in App Store Connect; you get an email when it is done. No duration is published, so rely on the email or a build-status webhook, not a fixed wait (https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds, read 2026-11-13).

---

## Feedback Collection

**Built-in:**
- Crash reports
- Screenshots with feedback
- TestFlight feedback form

**Best Practices:**
- Include feedback instructions
- Monitor crash reports
- Respond to feedback

---

## Best Practices

- ✅ Test internally first
- ✅ Use groups to organize testers
- ✅ Increment build number each upload
- ✅ Write clear "What to Test" notes
- ✅ Monitor feedback and crashes
- ❌ Don't skip beta testing
- ❌ Don't ignore crash reports
- ❌ Don't distribute untested builds
