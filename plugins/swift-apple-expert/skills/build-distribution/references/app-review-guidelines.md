---
name: app-review-guidelines
description: App Review Guidelines revision log since 2025-06 (2025-06-09, 2025-11-13, 2026-02-06, 2026-06-08, 2026-10-16) and the guideline sections that cause most rejections, with review-timing facts
when-to-use: preparing a submission, answering a rejection, checking whether a guideline changed, writing App Review notes
keywords: App Review Guidelines, rejection, 2.1, 2.3.14, 2.5.19, 3.1.1(a), 4.1(c), 4.7, 5.1.2(i), 1.2, creative assets, hidden features
priority: high
requires: app-store.md
related: age-ratings.md, privacy-manifest.md, eu-alternative-distribution.md
---

# App Review Guidelines

Canonical text: https://developer.apple.com/app-store/review/guidelines/ (page shows "Last Updated: October 16, 2026", read 2026-11-13). The guidelines apply to alternative distribution for sections marked as covering iOS/iPadOS notarization. Re-read the page before quoting a clause; this file records changes announced in Apple Developer News.

## Revision log

| Date | Change | Source |
|------|--------|--------|
| 2025-06-09 | 3.1.2(a): removed the line allowing one subscription shared across your own apps and services; bullet 5 moved to the new 3.2.2(x), which also newly permits developers to otherwise incentivize users to take specific actions in the app; 3.2.1(viii): financial apps need licensing in each location they are offered | https://developer.apple.com/news/?id=r9dcmrvs |
| 2025-11-13 | **1.2.1(a)** creator apps must let users identify content above the app's age rating and gate underage users by verified or declared age. **4.1(c)** no other developer's icon, brand or product name in your icon or name without approval. **4.7 / 4.7.2 / 4.7.5** HTML5/JavaScript mini apps and mini games in scope; no exposing native platform APIs to non-embedded software without Apple's permission; same age-identification duty. **5.1.1(ix)** crypto exchanges are highly regulated services. **5.1.2(i)** disclose where personal data goes to third parties, **including third-party AI**, and get explicit permission first. **3.2.2(ix)** loan apps: maximum APR 36% including costs and fees, no repayment in full in 60 days or less. **2.5.10** empty-ad-banner sentence deleted | https://developer.apple.com/news/?id=ey6d8onl |
| 2026-02-06 | 1.2: apps with random or anonymous chat are subject to the user-generated-content guideline | https://developer.apple.com/news/?id=d75yllv4 |
| 2026-06-08 | Introduction: revised kid and teen safety guidance. 1.2: developer responsibility for violating content. 4.3(a), 4.3(b): basis and examples clarified. **4.5.3**: Live Activities may not spam, phish or send unsolicited messages | https://developer.apple.com/news/?id=a233fmpw |
| 2026-10-16 | **2.3.14** new: creative assets (product page header, search results) must relate to app content or brand, be suitable for all audiences, with no misleading references to other apps, unverifiable claims, or specific/discounted prices. **2.5.19** new: no hidden, dormant or undocumented features (obfuscation to hide them can end in removal and account termination); formerly in 2.3.1. **3.1.1(a)**: music-streaming entitlement bullet merged into StoreKit External Purchase Link Entitlements; links may go to a permitted destination. **1.2** scope and Developer Code of Conduct clarified. **5** apps facilitating human trafficking or child exploitation are removed and blocked from alternative distribution | https://developer.apple.com/news/?id=92th7e5i |

## Sections that decide most submissions

| Section | Rule in short (verbatim source: guidelines page) | Prepare |
|---------|----------------------------------------------------|---------|
| 2.1(a) App Completeness | Final version, working URLs, no placeholder text, tested on device, demo account or demo mode if login exists, backend live | Demo credentials in App Review Information |
| 2.1(b) | Configured in-app purchases must be complete, visible and functional; explain any item the reviewer cannot find | Review notes per IAP |
| 2.3 Accurate Metadata | Metadata, screenshots and previews match the app; 2.3.14 for creative assets | Real-UI screenshots |
| 3.1.1 / 3.1.2 | In-app purchase for digital goods; subscription rules | [storekit-2026-updates.md](storekit-2026-updates.md) |
| 4.2 / 4.3 | Minimum functionality; spam | Distinct feature set |
| 4.8 | A third-party or social login for the primary account requires an equivalent login option that limits data to name and email and lets users keep the email private | [app-store-connect-2026.md](app-store-connect-2026.md) (Sign in with Apple domain) |
| 5.1.1(i), 5.1.2 | Privacy policy link in App Store Connect and in-app; data use, sharing, permission | [privacy-manifest.md](privacy-manifest.md) |
| 1.2 | UGC apps: filtering, reporting with timely response, blocking, published contact | Moderation before submit |

"Before You Submit" (guidelines page): test for crashes, complete metadata, current contact info, full reviewer access (demo account or demo mode, hardware), live backend, explanations of non-obvious features and purchases, regulatory documents where required.

## Timing and appeals (no numeric promise)

Apple states only that App Review "will examine your app as soon as we can", that complex or repeatedly rejected apps take longer, and that expedite requests are for critical timing issues. Do not quote "1-3 days" or similar: no such figure appears in the guidelines. Release dates in the future hold an approved app until that date, and appearing on all storefronts can take up to 24 hours. Reply to a rejection in App Store Connect (Resolution Center); appeals exist; bug-fix updates are not delayed over guideline violations except legal or safety ones. Source: guidelines "After You Submit".

## Answering a rejection

1. Quote the guideline number from the message and re-read that clause on the page.
2. Fix every item listed, then reply in Resolution Center with what changed.
3. If you disagree, use the appeal route; do not resubmit unchanged.
