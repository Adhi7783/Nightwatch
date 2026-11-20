# Explain and modify Nightwatch

## Read these files first

1. `sdk/src/game/types.ts` — the profile, room, evidence, links and theory shapes.
2. `sdk/src/server/case.ts` — the authored case and server-only answer. **Contains spoilers.**
3. `sdk/src/game/rules.ts` — input validation and deterministic deduction.
4. `sdk/src/server/nightwatch-routes.ts` — platform JWT verification and room routing.
5. `sdk/src/server/game-room.ts` — membership, serialized operations, persistence and idempotency.
6. `sdk/src/game/Nightwatch.tsx` — React screens, controlled forms and the SDK live subscription protocol.

## Likely live-coding changes

- **Add an evidence type:** extend Evidence if needed, add an authored item in the server case, render its classification, and extend tests for valid IDs. Do not put the answer in a client import.
- **Add another case:** introduce a server case catalog keyed by `caseId`; select it at room creation, then resolve rules from the room's stored ID. Existing rooms keep their case version. Do not edit the meaning of evidence IDs inside an in-progress case.
- **Duplicate submission:** a request ID is bound to user, action and payload fingerprint. The room serializes operations. A retry returns current state without adding another note/vote; reuse for another payload is rejected. Old receipts are bounded, so explain the retention window honestly.
- **Concurrent updates:** operations execute through a promise queue inside the same Durable Object. Each loads the latest state, applies one validated change, then persists through RecordRoom. Compare this with stale whole-object writes from clients.
- **Private room:** verified platform JWT establishes the caller. The worker routes to one room after a membership check. The socket uses `authenticatedRoomRequest`, never a client-provided user ID. Record schemas deny client mutations; server actions enforce game rules.
- **Hidden solution:** only worker modules import the canonical answer. The client receives the reveal after a solved/revealed state. A source repository can contain server solution code for reviewers; this is not protection against a player deliberately reading the repository.
- **Live update failure:** inspect socket status and server rejection; confirm the subscription is to `game` in the correct room, check RecordRoom write acceptance, then compare the second client's snapshot. Test a real note before blaming rendering.
- **OAuth failure:** separate developer deployment authentication from the app visitor's session. Check the scaffold's auth config/proxy and exact origin; never replace failed OAuth with a custom insecure identity header.

## Bugs investigated so far

- npm installation: DNS/TLS failures to npm registries; used the official direct publisher for hosted builds instead of disabling certificate checks.
- Original mobile heading: status tag squeezed the heading into a narrow column; changed the small-screen layout.
- WebSocket mutation bypass: sent a direct `core.put` against the original game record; RecordRoom denied it. This check must be repeated on the SDK revision.
- Scaffold/archive mismatch: current generated routes referenced exports absent from the older prototype archive. Restored the exact package version from the current official scaffold rather than guessing local replacement SDK methods.
- Failed builds save a new source revision even when the old release stays live. The deployment helper now reads current source revision before submitting an update.
- TypeScript did not narrow nullable room/member values through an inferred arrow-function failure helper. An explicit `never`-returning function declaration made the boundary clear; the strict CI check then passed.
- Activity history is intentionally bounded, so deriving report totals from its final 100 entries could lose early contributions. Persistent per-investigator counters now keep complete totals independently of the activity display.
- Sign-out must clear drafts and open clue state as well as room/profile state. The revised auth boundary clears those transient values to avoid carrying a prior investigator's working text into another session.

## What the applicant should record

For each real issue you investigate: observed error, hypothesis, smallest test, result, change, and verification. Record your own observations in `docs/APPLICANT-VERIFICATION.md`; do not copy the agent's checks as personal work.
