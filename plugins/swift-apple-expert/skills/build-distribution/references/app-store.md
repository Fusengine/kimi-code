---
name: app-store
description: App Store submission with review guidelines, metadata, and approval process
when-to-use: submitting to App Store, preparing metadata, handling review feedback
keywords: App Store, submission, review, metadata, screenshots, App Store Connect
priority: high
requires: code-signing.md, testflight.md
related: app-icons.md
---

# App Store Submission

## When to Use

- Submitting new app
- Updating existing app
- Preparing metadata
- Handling review rejection
- Managing app versions

## Key Concepts

### Submission Requirements

**Technical:**
- Valid code signature
- Privacy manifest (PrivacyInfo.xcprivacy)
- App icons (all variants)
- Launch screen (mandatory in `Info.plist` for iOS/iPadOS apps built with the 27 SDK: `UILaunchStoryboardName`, `UILaunchStoryboards`, `UILaunchScreen` or `UILaunchScreens`)
- Correct deployment target (never 27.1 for macOS/watchOS/tvOS/visionOS with Xcode 27.2: the SDK lists it by mistake)
- Built with Xcode 26+ and the iOS/iPadOS/tvOS/visionOS/watchOS 26 SDK or later (current upload minimum per https://developer.apple.com/news/upcoming-requirements/, checked 2026-11-08; Xcode 27.2 ships the 27.2 SDKs)
- 27 SDK builds: scene-based life cycle required (UIKit apps), `ARCHS_STANDARD` excludes `x86_64` at macOS 27.0+ deployment, On Demand Resources deprecated (Background Assets). See swift-core `references/sdk-27-changes.md`

**Metadata:**
- App name and subtitle
- Description (short and long)
- Keywords
- Screenshots per device
- App preview videos (optional)
- Privacy policy URL

### Privacy Manifest (Required 2024+)
Declare API usage and tracking.

**PrivacyInfo.xcprivacy:**
- NSPrivacyAccessedAPITypes
- NSPrivacyTrackingDomains
- Required for all apps

### Review Process

| Stage | Duration |
|-------|----------|
| Waiting for Review | 1-3 days |
| In Review | 24-48 hours |
| Pending Developer Release | Until you release |

---

## Submission Checklist

### Before Upload
- [ ] Version number correct
- [ ] Build number unique
- [ ] Privacy manifest complete
- [ ] Export compliance answered
- [ ] All capabilities configured

### In App Store Connect
- [ ] App name and subtitle
- [ ] Description
- [ ] Keywords (100 chars)
- [ ] Screenshots (all devices)
- [ ] App preview (optional)
- [ ] Category selected
- [ ] Age rating questionnaire
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] Copyright

---

## Common Rejection Reasons

| Reason | Solution |
|--------|----------|
| Guideline 2.1 - Crashes | Fix stability issues |
| Guideline 4.2 - Minimum functionality | Add more features |
| Guideline 5.1.1 - Privacy | Add privacy policy |
| Guideline 2.3 - Screenshots | Match actual app |
| Guideline 4.0 - Design | Follow HIG |

---

## Responding to Rejection

1. Read rejection reason carefully
2. Address ALL issues mentioned
3. Update Resolution Center
4. Resubmit for review
5. Appeal if you disagree (rarely works)

---

## Best Practices

- ✅ Test thoroughly before submission
- ✅ Complete all metadata
- ✅ Accurate screenshots
- ✅ Clear privacy policy
- ✅ Respond quickly to reviewer
- ❌ Don't submit broken builds
- ❌ Don't use placeholder content
- ❌ Don't ignore guideline feedback
