---
name: eu-alternative-distribution
description: EU Digital Markets Act business terms from 2026-10-01 (Core Technology Commission 5%, alternative payments, Web Distribution), DSA trader status, and iOS alternative distribution in Japan and Brazil
when-to-use: shipping iOS/iPadOS apps in the EU, Japan or Brazil, offering alternative payments, using an alternative marketplace or Web Distribution, declaring trader status
keywords: DMA, EU, Core Technology Commission, alternative app marketplace, Web Distribution, alternative payments, trader status, DSA, Japan MSCA, Brazil CADE, notarization iOS
priority: medium
requires: app-store.md
related: age-ratings.md, app-review-guidelines.md
---

# EU, Japan and Brazil Distribution

Facts only from Apple pages read 2026-11-13. Commission rates change with the Developer Program License Agreement (DPLA): re-read https://developer.apple.com/support/apps-in-the-eu/ before quoting a number to a client.

## EU business terms (effective 2026-10-01)

Announced 2026-08-18 (https://developer.apple.com/news/?id=gmws0jgp). Every developer distributing in the EU moves to one set of terms.

| Item | Rule (https://developer.apple.com/support/apps-in-the-eu/) |
|------|------|
| Core Technology Fee | Replaced by the **Core Technology Commission (CTC): 5%** on digital goods and services sold in alternative marketplaces, apps distributed through them, and apps using Web Distribution |
| App Store commission, Apple In-App Purchase | 26%; 15% for Small Business Program, Mini Apps Partner Program or Video Partner Program participants and for auto-renewable subscriptions after year one |
| App Store commission, alternative payment in the app | 20%; 10% for the same reduced groups |
| Store services commission | 15% (10% reduced) on out-of-app offers with an actionable link, only for sales within 7 days of the link tap |
| Alternative payments | Alternative processors and out-of-app offers (website, marketplace, other app) alongside Apple In-App Purchase; chosen payment options must be **kept for 12 months** |
| Child safety | Kids category: alternative payment flows behind a parental gate, no out-of-app purchase offers. Under 13: parental gate, no out-of-app offers. 13-17: both behind a parental gate |
| Eligibility | Operating an alternative marketplace or using Web Distribution needs at least one criterion (financial-stability score, public company, venture funding, audit, approved nonprofit/government, USD 1,000,000 letter of credit, or 1 million first annual installs). **No EU legal entity or EU establishment required** |
| iOS/iPadOS 27.2 | Updated install experience; EU users can keep alternative marketplaces and alternatively distributed apps for 90 days while travelling outside the EU |

Notarization for iOS and iPadOS apps (not the macOS notary service) applies to alternative distribution; guidelines marked for notarization in https://developer.apple.com/app-store/review/guidelines/ apply. Age rating answers are required to submit apps for that notarization ([age-ratings.md](age-ratings.md)). Web Distribution API: https://developer.apple.com/documentation/marketplacekit/distributing-your-app-from-your-website

For sales that bypass Apple In-App Purchase you collect and remit applicable taxes yourself and must track and report all alternative-payment transactions to Apple for commission calculation (same support page).

## Trader status (EU Digital Services Act)

- DSA Articles 30 and 31 require Apple to verify and display contact details (address, phone, email) of traders distributing in the EU App Store (https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/).
- You assess whether you are a trader (a hobbyist with no commercial intent may not be); Apple cannot decide for you. TestFlight-only or non-EU-only distribution is not trading on the EU App Store.
- Apps without trader status are removed from the App Store in the EU until status is provided and verified; status is also required to submit updates (https://developer.apple.com/news/upcoming-requirements/).

## Japan and Brazil (iOS)

| Region | Since | What |
|--------|-------|------|
| Japan (Mobile Software Competition Act) | iOS 26.2; DPLA acceptance due 2026-03-17 | Alternative marketplaces, alternative payments, notarization for iOS apps. https://developer.apple.com/news/?id=074b3wzz (2025-12-17) |
| Brazil (CADE agreement) | iOS 26.5; DPLA acceptance due 2026-07-06 | Same option set, with child-safety protections. https://developer.apple.com/news/?id=dhwadr2x (2026-06-18) |

Texas (SB 2420) is an age-assurance law, not alternative distribution: see [age-ratings.md](age-ratings.md).

## Checklist

- [ ] Latest DPLA accepted for each region you distribute in
- [ ] Trader status confirmed before shipping to the EU App Store
- [ ] Payment option choice recorded (12-month commitment in the EU)
- [ ] Kids/under-18 flows gated per the child-safety rules above
