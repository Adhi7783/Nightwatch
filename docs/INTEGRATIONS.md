# Three useful DeepSpace integrations

Nightwatch uses three catalog integrations through `apiWorkerFetch` from `deepspace/worker`. Calls use the deployed owner's token, never vendor API keys or caller-controlled billing headers. They supplement native DeepSpace authentication, RecordRoom storage, live subscriptions and permissions.

| Feature | Catalog endpoint | Why it belongs |
| --- | --- | --- |
| Opening transmission | `elevenlabs/generate-speech-with-timestamps` | A short authored briefing sets the atmosphere. Character timing drives the displayed words from actual audio playback time. |
| Evidence assistant | `anthropic/chat-completion` | Claude selects useful observations from the team's earned evidence. Each excerpt links back to a shared clue. |
| Case archive | `cloudconvert/convert-file` | A closed case becomes a portable PDF containing the reveal, proof, timeline, evidence, notes, accusations and contributions. |

## Narration

The voice is ElevenLabs' stock feminine computer voice Sarah, with restrained delivery. It is not an actor voice clone. The fixed briefing contains no solution or user text. Audio and alignment are cached globally for 30 days. A persisted list on the profile records completed or explicitly skipped playback by room code. Every new case receives the opening transmission. Resuming that case does not force it again; a small top control replays audio only. Legacy global completion migrates existing room history without marking future rooms. Browsers that block autoplay receive an explicit play control; the transmission can be paused, read or skipped. Decorative motion respects reduced-motion preferences.

## Evidence boundary

Only shared evidence IDs, titles and authored bodies are sent to Anthropic. No hidden clues, canonical answer or reveal are included. Generated output must contain valid citations and contiguous excerpts of earned evidence. Typographic straight/curly quote normalization preserves character offsets; the returned excerpt always comes from the original authored source. Invented claims, unknown IDs, duplicates and malformed output are rejected. The recap is cached by room and sorted shared evidence IDs. Investigators still form and justify the accusation themselves.

## Export boundary

Membership and closed-case status are checked before conversion. The HTML is created on the server; all authored and investigator text is escaped before insertion. The actual downloaded verification PDF had no embedded JavaScript and displayed a script-shaped notebook entry as literal text. Completed and voluntarily revealed cases are distinguished. Download links are cached for 15 minutes and can be regenerated after expiry. Export goes through DeepSpace's CloudConvert integration, not browser printing.

## Spend control and failures

Generic public proxies for these three providers are blocked. Fixed feature routes verify native DeepSpace identity and room membership before reservations. The global RecordRoom serializes paid-call reservations, preventing multiple workers from racing past limits. Each uncached attempt counts toward a maximum of 10 calls per authenticated account per UTC day and 60 across the app per UTC day. In-flight reservations last two minutes. Failures consume an attempt; there are no automatic paid retry loops. Successful results reuse durable caches.

These limits bound application-triggered calls, not a fixed dollar budget. Provider pricing and available developer credits still apply. Insufficient credits or upstream errors produce a visible retry message; core investigation and deterministic accusation validation remain available. There is no automatic top-up or upgrade.

## Verification

`test-tools/verify-services.mjs` uses the existing private fixture accounts and performs 18 production checks. It verifies anonymous and nonmember rejection, locked generic proxies, pre-start/closed-case gates, real ElevenLabs audio/timing, per-case profile persistence and nonmember rejection, Anthropic citations, a real downloadable PDF and durable result reuse. Fixtures and downloaded artifacts are ignored by Git. Five pure recap tests cover provider formatting, punctuation restoration and rejection of unsupported claims or citations.

The current briefing uses stock Sarah with high-stability delivery and light client-side electronic processing. Voice settings have a new durable cache key, so the earlier male narration is not reused. Processing preserves sample duration and the ElevenLabs alignment used by the typewriter display.
