---
name: storekit-2026-updates
description: In-app purchase and subscription changes 2025-10 to 2026-11 (offer codes for all IAP types, promo codes removed, 12-month-commitment monthly plans, Bundles and Suites, multiseat, retention messages) with verified StoreKit symbols
when-to-use: configuring subscriptions or IAP in App Store Connect, adding offer code redemption, planning iOS 27 subscription features, replacing IAP promo codes
keywords: offer codes, promo codes, retention messages, multiseat, Bundles, Suites, 12-month commitment, win-back offer, StoreKit Message, Retention Messaging API
priority: medium
requires: storekit2.md
related: app-review-guidelines.md, eu-alternative-distribution.md, app-store-connect-2026.md
---

# StoreKit and IAP Updates 2025-2026

Base StoreKit 2 code lives in [storekit2.md](storekit2.md). This file lists what changed. Dates are Apple publication dates; pages read 2026-11-13.

## Timeline

| Date | Change | Source |
|------|--------|--------|
| 2025-10-29 | **Offer codes for all IAP types**: consumable, non-consumable, non-renewing subscriptions, and auto-renewable subscriptions (including ones that do not auto-renew after the promotional period) | https://developer.apple.com/news/?id=gf6mgrs6 |
| 2026-03-27 | **Promo codes for In-App Purchases are no longer supported**: use offer codes | ASC release notes https://developer.apple.com/help/app-store-connect/release-notes/ |
| 2026-04-27 | **Monthly subscriptions with a 12-month commitment**: configure in App Store Connect, test in Xcode; subscribers can cancel to stop renewal after the commitment payments; available worldwide except the United States and Singapore on iOS/iPadOS/macOS/tvOS/visionOS 26.4+ with the 26.5 releases | https://developer.apple.com/news/?id=agq42lxe |
| 2026-07-15 | Submit IAPs, subscriptions and groups from the In-App Purchases and Subscriptions sections with **Add for Review** | ASC release notes |
| 2026-08-19 | The first consumable, non-consumable, auto-renewable and non-renewing item must be submitted with a new app version; later items of the same type do not, while the app has an approved version | ASC release notes |
| 2026-09-16 | **Bundles and Suites** (iOS/iPadOS/macOS/tvOS 27 or later, "later this year"): Bundles give access to several subscriptions in one purchase (one app, several apps of a developer, or several developers); Suites give one subscription across a set of apps of one developer. Access by request form; apps must use StoreKit 2 | https://developer.apple.com/news/?id=likeohx4 |
| 2026-10-22 | **Multiseat purchasing**: Volume Purchasing for Apple Business and Apple School Manager (launched 2026-10-22) and Group Purchases ("this winter"); enabled by default for subscriptions in App Store Connect, can be disabled or limited per channel | https://developer.apple.com/news/?id=yfo21auu, likeohx4 |
| 2026-11-04 | **Retention messages** in the cancellation flow (text, image or offer), configured in App Store Connect with eligibility and wait time between offers; Retention Messaging API access by request | https://developer.apple.com/news/?id=fk9ps3gv |

Not verified: "expiring consumables". No Apple page in the news feed, App Store Connect release notes or guidelines (read 2026-11-13) states such a feature; guideline 3.1.1 still says purchased credits and in-game currencies may not expire. Do not build on it without a source.

## Verified StoreKit symbols

Checked on the Apple documentation JSON, 2026-11-13.

| Need | Symbol | Notes |
|------|--------|-------|
| Redeem offer codes in SwiftUI (27.0+) | `offerCodeRedemption(options:isPresented:onCompletion:)`; `options` is `Set<RedeemOption>`, completion gets `Result<VerificationResult<Transaction>, any Error>` | iOS, iPadOS, Mac Catalyst, macOS, visionOS 27.0 |
| Redeem offer codes in UIKit (27.0+) | `AppStore.presentOfferCodeRedeemSheet(from: UIViewController, options: Set<RedeemOption> = [])` returns `VerificationResult<Transaction>` | iOS, iPadOS, Mac Catalyst, visionOS 27.0 |
| Redeem offer codes in AppKit (27.0+) | `AppStore.presentOfferCodeRedeemSheet(from: NSWindow, options: Set<RedeemOption> = [])` returns `VerificationResult<Transaction>` | macOS 27.0 |
| Deprecated 27.0 (keep only for targets below 27) | SwiftUI `offerCodeRedemption(isPresented:onCompletion:)`; `AppStore.presentOfferCodeRedeemSheet(in: UIWindowScene)` (iOS 16+, visionOS 1+); `AppStore.presentOfferCodeRedeemSheet(from:)` (macOS 15+) | Apple marks each "deprecated 27.0" with "Use `presentOfferCodeRedeemSheet(from:options:)` / `offerCodeRedemption(options:isPresented:onCompletion:)` instead" |
| Detect an offer-code purchase | `Transaction.offerID` / `Transaction.offerType` (value `code`); same fields on `Product.SubscriptionInfo.RenewalInfo` | Server: `offerType` 3 in the signed payload; `OFFER_REDEEMED` notification for active subscribers |
| Offer kinds | `Product.SubscriptionOffer.OfferType`: `introductory`, `promotional`, `winBack` | |
| Win-back at purchase | `Product.PurchaseOption.winBackOffer(_:)` | |
| App Store messages | `Message`, `Message.Reason` (`billingIssue`, `generic`, `priceIncreaseConsent`, `winBackOffer`) | Delay or suppress with the `messages` sequence and `display(in:)` / `DisplayMessageAction` |
| Entitlements | `Transaction.currentEntitlements`, `Transaction.updates` | Start a listener at launch so out-of-app redemptions arrive |

Source for offer codes: https://developer.apple.com/documentation/storekit/supporting-subscription-offer-codes-in-your-app. Offer-code limits there: up to 10 active offers per subscription; up to 1,000,000 redemptions per app per quarter.

Retention messages are server-to-server (https://developer.apple.com/documentation/retentionmessaging): the Retention Messaging API selects the message when a subscriber taps Cancel Subscription; four message types (text, text with image, switch-plan, promotional offer); visible on iOS/iPadOS 15.1+, visionOS 1+, macOS 14+; the production real-time URL needs a passed performance test; configuring default messages is the simplest route and the documented fallback if the real-time response fails. Called a "pre-release" with request-based access.

## Bundles, Suites, multiseat, billing plans: client symbols

Each symbol below was read on its Apple JSON page on 2026-11-13 (`https://developer.apple.com/tutorials/data/documentation/storekit/<path>.json`; `introducedAt` shown, `b` = beta). Configure the products in App Store Connect and test with Xcode's StoreKit testing.

| Need | Symbol | Availability |
|------|--------|--------------|
| Bundle / Suite product types | `Product.ProductType.subscriptionBundle`, `.subscriptionSuite` | 27.0 |
| Merchandise subscriptions inside a Bundle | `Product.SubscriptionInfo.bundledSubscriptions` of type `[BundledSubscription]` (`displayName`, `displayPrice`, `price`, `subscriptionGroupID`, `isFamilyShareable`...) | 27.0 |
| Bundle fields on purchases | `Transaction.bundleProductID`, `bundleTransactionID`, `bundleOriginalTransactionID`, `bundleSubscriptionGroupID`; on `RenewalInfo` also `willUnbundle` | all of these `@backDeployed(before: 27.0)` (introducedAt 15.0) |
| Monthly plan with 12-month commitment: read terms | `Product.SubscriptionInfo.pricingTerms` of type `[PricingTerms]`; `PricingTerms.billingPlanType`, `.subscriptionOffers`, `.pricingModel` (`SinglePrice`, `SeatBasedPricing`) | 26.4 (`SeatBasedPricing` 27.3b) |
| Billing plan values | `Product.SubscriptionInfo.BillingPlanType`: `monthly`, `upFront` | 26.4 |
| Buy a billing plan | `Product.PurchaseOption.billingPlanType(_:)` | 26.4 |
| Commitment state | `Transaction.commitmentInfo` (`billingPeriodNumber`, `totalBillingPeriods`, `expirationDate`, `price`); `RenewalInfo.commitmentInfo`, `RenewalInfo.renewalBillingPlanType`, `Transaction.billingPlanType` | 26.4. `PricingTerms.commitmentInfo` and `.billingPrice` are marked Deprecated |
| Pick pricing terms in the built-in store views | `View.preferredSubscriptionPricingTerms(_:)` (closure `(Product, SubscriptionInfo) -> SubscriptionInfo.PricingTerms?`) | 26.4; iOS 26.5 notes describe it |
| Multiseat | `Product.supportsMultiSeatPurchase`, `Product.PurchaseOption.seats(_:)`, `multiSeatInvitationSheetSuppressed(_:)`, `RenewalInfo.renewalQuantity` / `multiSeatInfo`, `SubscriptionInfo.multiSeatDataSharingConsentEligibility` | `supportsMultiSeatPurchase` 27.3b; `seats(_:)` `@backDeployed(before: 27.3)` |
| Volume purchase ownership and refunds | `Transaction.OwnershipType.assigned`; `Transaction.revocationType` of type `Transaction.RevocationType?` (`fullRefund`, `proratedRefund`, `familyRevocation`, `assignmentRevocation`); `revocationPercentage` | 26.4 (`assigned`: iOS 27 notes). The iOS 27 notes name the case `assignmentRevoked`, the symbol page lists `assignmentRevocation`: trust the symbol page |
| Promotional offers signed with JWS | `Product.PurchaseOption.promotionalOffer(_:compactJWS:)` (returns `[PurchaseOption]`) | `@backDeployed(before: 26.0)` |
| Merchandise an offer in SwiftUI | `SubscriptionOfferView` (configurable by `SubscriptionOfferViewStyleConfiguration`) | 26.0 iOS, iPadOS, visionOS |
| Detect an age-rating change | `AppStore.ageRatingCode`, `Int?`, `async` getter | 26.2 |

Sources: Apple iOS 26.5 notes ("PricingTerms", "CommitmentInfo", `preferredSubscriptionPricingTerms(_:)`), iOS 27 notes (Bundles, Suites, volume purchases) and iOS 27.3 beta notes (`supportsMultiSeatPurchase`), https://developer.apple.com/documentation/ios-ipados-release-notes, read 2026-11-13. Guides: `supporting-multiseat-purchases-in-your-app`, `testing-multiseat-subscriptions` (named in the `supportsMultiSeatPurchase` page; not read).

## Checklist

- [ ] Promo-code campaigns migrated to offer codes
- [ ] Transaction listener starts at launch (offer codes redeemed outside the app)
- [ ] Multiseat setting reviewed per subscription (default is on)
- [ ] Bundles/Suites access requested early if needed for iOS 27
