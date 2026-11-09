# Voice: TTS, STT and a voice that keeps working

## Text-to-speech (`tts.*`)

`tts.provider`: `edge` (default, free, no key) | `elevenlabs`
(`ELEVENLABS_API_KEY`) | `openai` (`VOICE_TOOLS_OPENAI_KEY`) | `minimax`
(`MINIMAX_API_KEY` / `MINIMAX_CN_API_KEY`) | `mistral` (`MISTRAL_API_KEY`) |
`gemini` (`GEMINI_API_KEY`) | `xai` (`XAI_API_KEY`) | `deepinfra`
(`DEEPINFRA_API_KEY`) | `neutts`, `kittentts`, `piper` (local, free), or
`nous` (managed Tool Gateway). Each provider has its own block
(`tts.edge.voice`, `tts.elevenlabs.voice_id` / `model_id`,
`tts.openai.model` / `voice` / `base_url`, `tts.piper.voice`, ...). Global
`tts.speed` (provider `speed` overrides it).

Custom engines without Python: `tts.providers.<name>` with `type: command`,
`command` using `{input_path}` and `{output_path}` (also `{format}`, `{voice}`,
`{model}`, `{speed}`), `output_format`, `timeout` (120), `voice_compatible`
(Opus bubble on Telegram), `max_text_length` (5000), `env_passthrough`.
Select it with `tts.provider: <name>`. Built-in names always win over a
custom provider with the same name. Python engines: a plugin calling
`ctx.register_tts_provider()`.

Delivery: Telegram voice bubble (Opus `.ogg`), Discord voice bubble with file
fallback, WhatsApp MP3 attachment, Slack audio attachment, CLI file under
`~/.hermes/audio_cache/`.

## Speech-to-text (`stt.*`)

`stt.enabled` (default true; false keeps the audio file path for custom
pipelines), `stt.provider`: `local` (faster-whisper, default) | `groq`
(`GROQ_API_KEY`) | `openai` (`VOICE_TOOLS_OPENAI_KEY` or `OPENAI_API_KEY`) |
`mistral` | `xai` | `elevenlabs` | `deepinfra`; `stt.language` global hint;
`stt.local.model` (`tiny` ... `large-v3`, `turbo`). Custom CLI:
`stt.providers.<name>` with `type: command`, or `HERMES_LOCAL_STT_COMMAND` +
`stt.provider: local_command`.

**Fallback rule:** an explicit `stt.provider` (including `local` written in
config) is honoured strictly - if it cannot run, transcription fails with a
clear error. Auto-detection (local -> local whisper CLI / command -> cloud
keys) happens only when no provider was ever selected.

## Voice replies in chats

`/voice on` (speak only when the user sent a voice note, mode `voice_only`),
`/voice tts` (speak every reply, mode `all`), `/voice off` (default),
`/voice status`; persisted across gateway restarts. Discord voice channels:
`/voice join`, `/voice leave`. CLI voice mode: `voice.*` keys
(`record_key`, `auto_tts`, `silence_duration`, `stop_phrases`, ...).

## Written for the ear

**Pattern.** Hermes speaks whatever text the agent writes, so the writing rules
belong in SOUL.md (or a channel prompt for voice-first channels):

- One idea per sentence, under ~20 words; the answer first, details after.
- No markdown, tables, bullet symbols, URLs, code or file paths in spoken
  replies - say "I sent the link in the chat" and post it as text.
- Numbers, dates and amounts in spoken form ("three hundred euros", "Tuesday
  the fourth"), no abbreviations or emoji.
- Long content: a two-sentence spoken summary plus the full text as a message.

Native helpers: `tts.xai.text_normalization`, `tts.kittentts.clean_text`,
the OpenAI `instructions` argument of `text_to_speech` (tone, pacing), Gemini
persona prompts (`tts.gemini.persona_prompt_file`).

## Backup voice pattern

**Not a built-in.** Hermes 0.23.0 has no TTS provider fallback chain: the only
automatic switch is at install level (Edge library missing -> NeuTTS, in
`tools/tts_tool.py`), and `fallback_providers` / `hermes fallback` cover LLMs,
not voice. A provider outage (for example the Edge token change fixed in
v0.23.0) silently costs every voice reply until someone notices.

Robust pattern - health check + secondary provider:

1. Pick a **secondary** provider with a different failure domain (cloud
   primary -> local `piper` / `kittentts` / `neutts` secondary, or the reverse)
   and configure both blocks in `config.yaml` now, so a switch is one key.
2. Write a probe per provider that synthesises one short sentence outside
   Hermes and checks a non-empty audio file (`edge-tts` CLI, a `curl` to the
   vendor API, `piper`). Probes must not need Hermes secrets you would not
   otherwise expose (declare only what the probe needs in
   `terminal.env_passthrough`).
3. Run [templates/tts-healthcheck.sh](templates/tts-healthcheck.sh) as a
   no-agent cron job every 10-15 minutes (copy it to `~/.hermes/scripts/`):
   after N consecutive primary failures it runs
   `hermes -p <profile> config set tts.provider <secondary>`; after N primary
   successes it switches back. It prints one line only when it switches, so
   the cron delivers nothing on healthy ticks.
4. `text_to_speech` reloads the `tts` section on each call
   (`_load_tts_config`); confirm on your version with one `/voice tts` reply
   after a switch, else add `hermes -p <profile> gateway restart` to the script.
5. Test the switch once by breaking the primary probe on purpose (wrong key in
   a copy of the probe), and keep the switch history the script logs.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/tts (providers, command providers, STT fallback behavior)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/voice-mode (`/voice` modes, config reference)
- https://hermes-agent.nousresearch.com/docs/user-guide/configuration (TTS Configuration, Speech-to-Text)
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/slack (Voice Messages)
- https://github.com/NousResearch/hermes-agent/blob/main/tools/tts_tool.py (`_select_builtin_engine`, `_load_tts_config`)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (no-agent mode)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0 (Edge TTS fix)
