# Nightwatch verification record

Production: https://nightwatch-meridian.app.space

Repository: https://github.com/Adhi7783/Nightwatch

Runtime source: 352b86c72a5f7870bf83675ed50bc187a6ac8762

Successful CI: https://github.com/Adhi7783/Nightwatch/actions/runs/45314796038

Production release: rel_01M85QBFV2K6G1EJ9T8CA80BW2

## Automated game and integration checks

35 tests passed locally and in CI: 13 authored-case/rule checks, five source-grounded recap checks, four briefing-history/migration checks, three 3D geometry checks six board concurrency/validation checks, and four archive/audio checks. Strict TypeScript, the production build and the isolated visual fixture build passed.

All 72 native-account production checks passed after the caseboard server revision. They include real DeepSpace identity, private membership, host start, a real RecordRoom socket snapshot and broadcast, denied direct socket writes, earned evidence, reviews/pins, concurrent notes, idempotency, malformed and incorrect accusations, joint and solo solves, full reveal, preserved history and native sign-out/sign-in restoration. Board checks include member gating, drag reservations, partner exclusion, durable positions, stale-revision rejection, bounded coordinates, concurrent independent moves, annotation persistence, stale connection edits, reversed duplicate rejection, connection removal/restoration, context-specific notes, undo ownership/conflict rejection, increasing room revisions and immutable closed boards. Existing developer fixture accounts were used; personal player cases were not used for mutation tests.

All 20 integration checks passed. Actual ElevenLabs audio/timing, durable narration reuse, per-case briefing completion, earned-evidence Anthropic citations, generic paid-proxy rejection, private-room gates and actual CloudConvert PDF download/reuse were verified. The exported fixture contains an annotated connection and a note attached to The unbroken seal. Its three PDF pages were rendered with Poppler and visually inspected, including escaped literal HTML, evidence context, the connection explanation and contributor totals. No confidential source text or arbitrary generation prompt is sent by these features.

The published runtime passed strict TypeScript, all 35 unit tests, and the production build. Live checks include the archive and feminine narration revision described below.

## Browser interaction checks

The actual Caseboard component was exercised in the isolated CI preview. Observed desktop interactions: card drag and save, drawing a connection handle onto a second card, relationship/explanation save, clicking an exposed line to open its editor, keyboard line selection, label edit, remove/undo, keyboard card movement, Tidy layout and layout undo. At 390 by 844, the list view opened by default; selecting a clue led to its full detail panel; review state, contextual notes and tap-to-connect worked. The measured document width did not exceed the viewport. The moving machinery renderer continued advancing frames.

An existing closed case in the native production browser profile resumed successfully with its old evidence and unlabeled connection intact. The three workspace destinations appeared, the board read legacy links as Possibly related, and archived mutation controls were disabled. No new room, theory, evidence or note was added to personal player cases during verification. Final navigation and live screenshot checks are recorded with the release evidence.

The preview has no DeepSpace client, identity, game endpoint or persistent writes. It complements the real authenticated server checks; it is not a complete authenticated two-browser gameplay run. Its demonstration data does not import the canonical case answer. The production publisher ships only dist/client and the Worker, excluding dist/visual-preview.

## Scope and limits

- The full two-browser SDK specification in sdk/tests/collab.spec.ts is updated but unexecuted. Multi-user server verification used independent native-account HTTP sessions and a real SDK socket.
- No blanket accessibility certification or actor voice-clone claim is made. Native dialogs, focus restoration, labeled controls, keyboard alternatives and responsive layouts are implemented. Recorded rendering sessions used WebGL; the Canvas 2D fallback remains implemented.
- Earlier verification established per-case narration, audio-only replay, full-screen phase navigation and the original rotating 3D geometry. This revision preserves those renderers and the requested moving backgrounds.

Private credentials and downloaded build, narration, PDF and screenshot artifacts remain ignored by Git. The tracked-source secret scan passed. See VISUAL-DIRECTION.md for visual decisions and the isolated preview workflow.

## Save controls and feminine voice revision

Four additional unit tests cover personal archive deletion, idempotent restore, ownership and input validation, and finite duration-preserving PCM encoding. Seven new live checks verified that deleting a save affects only the caller archive, preserves partner saves and shared history, and can be undone without losing case completion. The live new-case prompt and delete confirmation were inspected without deleting any personal player save. The feminine stock Sarah voice is generated through ElevenLabs with high stability, then lightly filtered and modulated in a bounded browser OfflineAudioContext. Browser playback returned processed WAV audio with a finite 27.26-second duration. Its sample count is unchanged, preserving speech alignment. The stock feminine voice remains playable if offline processing is unavailable. The YouTube reference was identified as Arkham Knight Batcomputer voicelines; subjective similarity is not an exact voice-match claim.
