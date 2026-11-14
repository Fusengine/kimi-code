# GameKit: Game Center activities and challenges, the Games app

Verified 2026-11-13: symbol JSON pages under `https://developer.apple.com/tutorials/data/documentation/gamekit/`, `.../updates/gamekit.json` (newest entry June 2025), https://developer.apple.com/games-app/ and https://developer.apple.com/games/.

## Overview

| Symbol | Availability (symbol page) | Role |
|--------|----------------------------|------|
| `GKGameActivity` | iOS/iPadOS/macOS/tvOS/visionOS 26.0 (no watchOS) | A running activity that players can join; carries scores, achievements, party code |
| `GKGameActivityDefinition` | 26.0, same platforms | Static metadata you configure (title, `playStyle`, `supportsPartyCode`, `playerRange`, `fallbackURL`) |
| `GKChallengeDefinition` | 26.0 incl. watchOS | Static metadata of a challenge (`durationOptions`, `isRepeatable`, `leaderboard`) |
| `GKChallenge`, `GKScoreChallenge` | deprecated 26.0 (introduced iOS 6.0) | Old player-issued challenge classes; do not start new code on them |
| `GKAccessPoint`, `GKLocalPlayer` | long-standing | Entry point UI, authentication |

Apple's June 2025 update list: configure Game Activities and Challenges in a GameKit Configuration file in Xcode (challenges also in App Store Connect); `GKChallengeDefinition` retrieves the metadata you define; leaderboard score submissions can be observed through Settings > Developer > Notify About Score Submissions on iOS. Voice chat should use SharePlay, `GKVoiceChat` is deprecated (June 2024 entry).

## Activity lifecycle

```swift
import GameKit

/// Starts a Game Center activity for a definition configured in the GameKit Configuration file.
func startActivity() async throws -> GKGameActivity {
    let definitions = try await withCheckedThrowingContinuation { (c: CheckedContinuation<[GKGameActivityDefinition], Error>) in
        GKGameActivityDefinition.loadGameActivityDefinitions { defs, error in
            if let defs { c.resume(returning: defs) } else { c.resume(throwing: error ?? CancellationError()) }
        }
    }
    guard let definition = definitions.first else { throw CancellationError() }
    return try GKGameActivity.start(definition: definition)   // or start(definition:partyCode:)
}
```

| Need | API (all verified on `gkgameactivity`) |
|------|----------------------------------------|
| States | `start()`, `pause()`, `resume()`, `end()`, `state` |
| Scores and progress | `setScore(on:to:)`, `setScore(on:to:context:)`, `setProgress(on:to:)`, `setAchievementCompleted(_:)`, `leaderboardScores`, `achievements` |
| Party codes | `partyCode`, `partyURL`, `GKGameActivity.isValidPartyCode(_:)`, `validPartyCodeAlphabet` |
| Matchmaking from an activity | `makeMatchRequest()`, `findMatch(completionHandler:)`, `findPlayersForHostedMatch(completionHandler:)` |
| Launch handling | `checkPendingGameActivityExistence(completionHandler:)` |
| Custom data | `properties` (`[String: String]`) |

`GKGameActivityPlayStyle` has `asynchronous`, `synchronous`, `unspecified`. Authenticate first: `GKLocalPlayer.local.authenticateHandler` (the `local` class property and `authenticateHandler` are long-standing and verified).

## Challenges

`GKChallengeDefinition.loadChallengeDefinitions(completionHandler:)` (26.0) loads definitions; `hasActiveChallenges(completionHandler:)` reports active ones. Challenge rules, durations and the linked leaderboard are configured in Xcode or App Store Connect, not in code. Do not copy older tutorials that issue challenges through `GKChallenge` (deprecated 26.0).

## The Games app

Pre-installed on iOS 26, iPadOS 26 and macOS 26 or later (https://developer.apple.com/games-app/). Your game appears automatically; Game Center achievements, leaderboards, challenges, multiplayer activities and In-App Events raise its visibility. Session: WWDC25 215 "Engage players with the Apple Games app" (linked from that page).

## Not verified

iOS 27 release notes, Game Center section: "Fixed: When you trigger the Access Point, its completion handler is never invoked" (https://developer.apple.com/documentation/ios-ipados-release-notes/ios-ipados-27-release-notes, read 2026-11-13). No new GameKit symbol dated 2026 was found; the updates page stops at June 2025, which is not proof of no change.
