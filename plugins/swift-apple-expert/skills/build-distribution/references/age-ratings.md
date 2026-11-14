---
name: age-ratings
description: App Store age rating system (4+/9+/13+/16+/18+), required questionnaire answers, new Shared Location and Dating declarations (deadline 2027-01-12), social media questions, regional rules (Brazil, Korea, Australia, Singapore, US states)
when-to-use: answering the age rating questionnaire, preparing an update after 2026-11-16, shipping to Brazil/Korea/Texas/Utah/Louisiana, apps with chat, AI assistants, dating or location sharing
keywords: age rating, questionnaire, Shared Location, Dating and Relationships, social media, Declared Age Range, GRAC, Brazil, loot boxes, App Store Connect
priority: high
requires: app-store.md
related: app-review-guidelines.md, app-store-connect-2026.md
---

# Age Ratings

All facts below: Apple Developer News and App Store Connect Help, read 2026-11-13. Ratings values: https://developer.apple.com/help/app-store-connect/reference/age-ratings-values-and-definitions ; how to set: https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/

## Deadlines first

| Date | What | Source |
|------|------|--------|
| 2026-11-16 | New content descriptors **Shared Location** and **Dating and Relationships** appear in the questionnaire | https://developer.apple.com/news/?id=yxkh08us (2026-11-02) |
| **2027-01-12** | Every app must have these two declarations completed. You must answer when submitting an update or changing the questionnaire | same |
| September 2026 (in force) | Social media answers required to submit new apps/updates, or to submit apps for notarization for alternative distribution | https://developer.apple.com/news/?id=tlur8uvi (2026-07-09) |
| Early 2027 | Regulated medical device status required for existing EEA/UK/US apps in scope, or updates are blocked (see [app-store-connect-2026.md](app-store-connect-2026.md)) | https://developer.apple.com/news/?id=nyqbfz1y |

## System (since 2025-07-24)

- Ratings are 4+, 9+, **13+, 16+, 18+**, assigned per country or region (region-specific suitability standards).
- Required questions cover in-app controls, capabilities, medical or wellness topics and violent themes. You may set a **higher** rating to reflect your own minimum age.
- Consider how every feature, **including AI assistants and chatbots**, changes how often sensitive content appears. COPPA and GDPR still apply. Source: https://developer.apple.com/news/?id=ks775ehf (2025-07-24).
- Answers were due 2026-01-31 to avoid blocking updates (https://developer.apple.com/news/upcoming-requirements/).

## New declarations (from 2026-11-16)

- **Shared Location**: sharing real-world location with another person or group.
- **Dating and Relationships**: features that enable dating or relationship connections between real people and/or a virtual companion that engages a user in sexual or romantic content.
- Dating and Relationships forces a minimum **18+**. Shared Location may not change the minimum rating in some regions.
- Brazil: local rules require **A16** for Shared Location and **A18** for Dating and Relationships. An app that qualifies lower (for example parent-child location sharing) can request an official rating from Brazil's Ministry of Justice (MJSP); once verified it shows on the Brazil storefront.

## Social media questions

A social media capability is "the ability to redistribute, amplify, or interact with user-generated content through a social feed or similar discovery method". It adds a **Social Media** content descriptor and places the app in the Social Media Time Allowances category (iOS/iPadOS/macOS 27+) regardless of the App Store category; capabilities disabled for under-13 users exclude those users. Source: https://developer.apple.com/news/?id=tlur8uvi.

## Regional rules

| Region | Rule | Source |
|--------|------|--------|
| Brazil, Australia, Singapore | From 2026-02-24 Apple blocks downloads of **18+** apps unless the user is confirmed adult; apps flagged with loot boxes are 18+ in Brazil | https://developer.apple.com/news/?id=f5zj08ey |
| Utah, Louisiana | Age categories shared through the Declared Age Range API for new accounts (Utah from 2026-05-06, Louisiana from 2026-07-01) | same |
| Texas (SB 2420) | Paused after an injunction (2025-12-23); in force for new Texas accounts from **2026-06-04**: parental consent for minors, Significant Change API under PermissionKit | https://developer.apple.com/news/?id=8jzbigf4, https://developer.apple.com/news/?id=sg176nne |
| Korea | With a GRAC rating you can override the Korea rating to All, 12+, 15+ or 19+ by supplying the RCN; since 2026-10-22 "infrequent profanity and crude humor" and "infrequent mature or suggestive themes" are 12+ | https://developer.apple.com/news/?id=oj3r9pvw, ASC release notes 2026-10-22 |

Developers keep their own legal duty to confirm age where a law requires it; the Declared Age Range API gives a signal, not proof (news f5zj08ey).

## Checklist

- [ ] Questionnaire fully answered, including AI/chatbot and social media capabilities
- [ ] Shared Location and Dating and Relationships declared before 2027-01-12
- [ ] Brazil/Korea overrides requested where an official rating exists
- [ ] Apps with chat or UGC meet [app-review-guidelines.md](app-review-guidelines.md) section 1.2
