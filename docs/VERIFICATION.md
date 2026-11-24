# Nightwatch verification record

Production: https://nightwatch-meridian.app.space

Repository: https://github.com/Adhi7783/Nightwatch

Runtime source: eecc4ae3fda33da2e8ad4bbbd8f960f29d0b0284

Successful CI: https://github.com/Adhi7783/Nightwatch/actions/runs/45311139084

Production release: rel_01M85NMKBRPWAZ8XSA2DW44ANF

## Automated game and integration checks

31 tests passed locally and in CI: 13 authored-case/rule checks, five source-grounded recap checks, four briefing-history/migration checks, three 3D geometry checks and six board concurrency/validation checks. Strict TypeScript, the production build and the isolated visual fixture build passed.

All 65 native-account production checks passed after the caseboard server revision. They include real DeepSpace identity, private membership, host start, a real RecordRoom socket snapshot and broadcast, denied direct socket writes, earned evidence, reviews/pins, concurrent notes, idempotency, malformed and incorrect accusations, joint and solo solves, full reveal, preserved history and native sign-out/sign-in restoration. Board checks include member gating, drag reservations, partner exclusion, durable positions, stale-revision rejection, bounded coordinates, concurrent independent moves, annotation persistence, stale connection edits, reversed duplicate rejection, connection removal/restoration, context-specific notes, undo ownership/conflict rejection, increasing room revisions and immutable closed boards. Existing developer fixture accounts were used; the applicant's personal cases were not used for mutation tests.

All 19 integration checks passed. Actual ElevenLabs audio/timing, durable narration reuse, per-case briefing completion, earned-evidence Anthropic citations, generic paid-proxy rejection, private-room gates and actual CloudConvert PDF download/reuse were verified. The exported fixture contains an annotated connection and a note attached to The unbroken seal. Its three PDF pages were rendered with Poppler and visually inspected, including escaped literal HTML, evidence context, the connection explanation and contributor totals. No confidential source text or arbitrary generation prompt is sent by these features.

The final subsequent runtime change tightened sticky navigation, reduced phase-menu destinations and clarified archive controls. It did not change the tested server, integration or game rules. The final CI reran all 31 tests and built the published artifact.

## Browser interaction checks

The actual Caseboard component was exercised in the isolated CI preview. Observed desktop interactions: card drag and save, drawing a connection handle onto a second card, relationship/explanation save, clicking an exposed line to open its editor, keyboard line selection, label edit, remove/undo, keyboard card movement, Tidy layout and layout undo. At 390 by 844, the list view opened by default; selecting a clue led to its full detail panel; review state, contextual notes and tap-to-connect worked. The measured document width did not exceed the viewport. The moving machinery renderer continued advancing frames.

An existing closed case in the native production browser profile resumed successfully with its old evidence and unlabeled connection intact. The three workspace destinations appeared, the board read legacy links as Possibly related, and archived mutation controls were disabled. No new room, theory, evidence or note was added to the applicant's cases during verification. Final navigation and live screenshot checks are recorded with the release evidence.

The preview has no DeepSpace client, identity, game endpoint or persistent writes. It complements the real authenticated server checks; it is not a complete authenticated two-browser gameplay run. Its demonstration data does not import the canonical case answer. The production publisher ships only dist/client and the Worker, excluding dist/visual-preview.

## Scope and limits

- The full two-browser SDK specification in sdk/tests/collab.spec.ts is updated but unexecuted. Multi-user server verification used independent native-account HTTP sessions and a real SDK socket.
- The applicant personally confirmed production sign-in and detective-name setup. Their own complete partner playthrough, writeup review and portal submission remain personal steps.
- No blanket accessibility certification or actor voice-clone claim is made. Native dialogs, focus restoration, labeled controls, keyboard alternatives and responsive layouts are implemented. Recorded rendering sessions used WebGL; the Canvas 2D fallback remains implemented.
- Earlier verification established per-case narration, audio-only replay, full-screen phase navigation and the original rotating 3D geometry. This revision preserves those renderers and the requested moving backgrounds.

Private credentials and downloaded build, narration, PDF and screenshot artifacts remain ignored by Git. The tracked-source secret scan passed. See VISUAL-DIRECTION.md for visual decisions and the isolated preview workflow.
