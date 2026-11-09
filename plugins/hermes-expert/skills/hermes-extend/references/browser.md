# Browser automation: `browser_exec`

Since v0.23.0 one tool drives the browser: **`browser_exec`**. The ten old
tools (`browser_navigate`, `browser_click`, ...) and agent-browser were
removed. Any skill, prompt or toolset list naming them must be rewritten.

`browser_exec` runs model-written Python with browser helpers pre-imported
(`new_tab(url)`, `goto_url(url)`, `wait_for_load()`, `page_info()`, `js(expr)`,
`fill_input(selector, text)`, `click_at_xy(x, y)`, `capture_screenshot()`,
`cdp('Domain.method', ...)`, `ensure_real_tab()`). Parameters: `code`,
`timeout_s` (default 300, max 1800), `session` (a named session gets its own
browser, so parallel subagents do not collide). The browser session persists
across calls; Python variables do not.

Companion tools (not drivers): `browser_cdp` and `browser_dialog` (only while a
CDP endpoint is configured), `browser_vault` (fills saved logins, cards and 2FA
without secrets entering the conversation; password-manager plugins can supply
logins, vault key optionally in the OS keychain: `vault.key_storage: keychain`).

## Rules that matter

- `browser_exec` executes code on your machine, so it is only offered to
  sessions that also have the `terminal` toolset. A platform without terminal
  access gets no browser.
- Prefer `web_search` / `web_extract` for reading; use the browser only to
  interact (click, fill, dynamic pages).
- Where the browser comes from: local Chromium (default, headless, no setup),
  cloud providers (Nous subscription, Browserbase, Browser Use, Firecrawl -
  pick in `hermes tools` -> Browser Automation), Lightpanda, your own browser
  via `/browser connect` (CDP), or an opt-in copy of your real profile.
- Block domains with `security.website_blocklist` (applies to web and browser
  tools); private/SSRF targets are refused unless explicitly allowed.
- Homes that used Camofox get the `camofox` plugin installed automatically.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/browser
- https://hermes-agent.nousresearch.com/docs/user-guide/configuration (Browser, Website Blocklist)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0 ("The old built-in browser tools are gone", password managers in `browser_vault`)
