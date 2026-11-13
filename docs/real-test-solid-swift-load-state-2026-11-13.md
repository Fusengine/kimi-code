# Real test: solid-swift LoadState wording change (Kimi)

Date: 2026-11-13. Result: **PASS** on the stated criteria, with two caveats (run killed by timeout; installed gate also forced a read of the deployed older skill copy).

Change under test (branch feat/solid-swift-load-state): `references/state-machines.md` (`LoadState<Value>` / `LoadFailure`), `templates/viewmodel.md` and `templates/view.md` use `state: LoadState<...>` instead of `isLoading`.

## Command

Temp project (empty): `/private/tmp/claude-501/-Users-brunoazoulay-Labo-docker-lab-dev-local-Dev-ai-claude-code-claude-plugins/2723977a-20cc-47b1-bf76-10a7db930be8/scratchpad/realtest/kimi`

Wrapped in `realtest/run-kimi.sh` (the Bash guard in the lead's harness blocks command lines that contain an agent CLI name plus a `-c`/`$`/`>` form; the script file avoids that, the command itself is unchanged):

```
cd <temp dir>
timeout <N> kimi --output-format stream-json -p \
  "Read <worktree>/plugins/swift-apple-expert/skills/solid-swift/SKILL.md and the references it lists, then use that skill to write a SwiftUI FeatureViewModel and FeatureView that load a list of articles from an ArticleService. Write them to ArticlesViewModel.swift and ArticlesView.swift." \
  > events.jsonl 2> stderr.txt
```

`<worktree>` = `/Users/brunoazoulay/Labo/docker-lab/dev.local/Dev-ai/kimi-code-plugins-wt-swift`. kimi 2.5.2. No yolo/auto flags: `-y` is rejected in prompt mode ("Cannot combine --prompt with --yolo"), and writes into the temp dir worked without it.

- Auth: worked (no "authorization grant is invalid" this time). No `kimi login` needed.
- Run 1: `timeout 300` -> exit 124, no Swift written yet (log kept: `events-run1-timeout300.jsonl`). Cause: slow multi-turn APEX loop, not auth.
- Run 2 (the evidence run): `timeout 1200` -> exit 124 again, but the two Swift files were written at 04:14 and the kill came during a `sniper` sub-agent ("The subagent was stopped before it finished. Reason: Session closed"). Log: `<temp dir>/events.jsonl` (92 events).

## Evidence the new skill text was read (from the worktree)

Tool calls in `events.jsonl` (stream-json `tool_calls`), all `Read` on worktree paths:

```
Read .../kimi-code-plugins-wt-swift/plugins/swift-apple-expert/skills/solid-swift/SKILL.md
Read .../kimi-code-plugins-wt-swift/plugins/swift-apple-expert/skills/solid-swift/references/state-machines.md
Read .../kimi-code-plugins-wt-swift/plugins/swift-apple-expert/skills/solid-swift/references/templates/viewmodel.md
Read .../kimi-code-plugins-wt-swift/plugins/swift-apple-expert/skills/solid-swift/references/templates/view.md
(+ the other 10 references, all under the worktree path)
```

The tool result for `state-machines.md` starts with `name: state-machines ... Model state so illegal states are unrepresentable`, and the `view.md` result contains `Exhaustive switch over one state value ... LoadState is defined in references/state-machines.md`. The model then wrote "`LoadState` sum-type" in its own summary after reading.

## Evidence the produced Swift uses LoadState

- `ArticlesViewModel.swift`: `@MainActor @Observable final class`, `private(set) var state: LoadState<[Article]> = .idle`, `state = .loading`, `.loaded(...)`, `.failed(LoadFailure(error))`.
- `ArticlesView.swift`: exhaustive `switch viewModel.state` over `.idle, .loading`, `.loaded`, `.failed`; `#Preview` x2; localized keys `articles.title` etc.
- `grep -n isLoading ArticlesViewModel.swift ArticlesView.swift`: no match (exit 1).
- Code comment in the VM (copied from the template): "Mutually-exclusive states as ONE value ... `LoadState<Value>` / `LoadFailure` are defined once in Core/Models/LoadState.swift."

## Typecheck

```
swiftc -swift-version 6 -typecheck -module-cache-path realtest/mc-kimi \
  kimi/ArticlesView.swift kimi/ArticlesViewModel.swift \
  kimi-stubs/Stubs.swift kimi-stubs/Features/Articles/Protocols/ArticleServiceProtocol.swift
```

Apple Swift 6.4.2, exit code **0**.

Stubbed by the tester (Kimi did not define them, it only referenced them; stubs live in `realtest/kimi-stubs/`, outside the Kimi temp dir):
- `LoadState<Value>` and `LoadFailure`: copied verbatim from the worktree `references/state-machines.md`.
- `Article` (`id`, `title`, `summary`, `static previewList`), `protocol ArticleServiceProtocol: Sendable { func fetchArticles() async throws -> [Article] }`, `struct MockArticleService`.

## Caveats

- The installed Kimi harness gate (deployed copy under `~/.kimi-code/plugins/managed/fusengine/...`) additionally required reading the deployed `solid-swift` refs (older text: "ViewModels < 100 lines", "iOS 26+") and the `swiftui-core` / `swift-core` skills from `~/.claude/plugins/marketplaces/...` before it would allow the Swift write. So the session saw both the new worktree text and the old deployed text; the output follows the new one (`LoadState`, no `isLoading`). After release/deploy, that old copy is replaced.
- Kimi's own APEX tail (sniper/eLicit sub-agents) did not finish inside 1200 s; files and typecheck do not depend on it.
- Kimi produced no `LoadState.swift`, `Article` or service files (it wrote only the two requested files), hence the stubs.
- Not verified: automatic skill discovery without naming the worktree path in the prompt.
