# Nightwatch — SDK revision

> **Submission status:** the initial prototype did not fully meet the detailed brief. The revised React/TypeScript implementation is in `sdk/`. Read [the requirements audit](docs/REQUIREMENTS-AUDIT.md) for implemented items and outstanding verification. The historical prototype notes below are retained for traceability; their 30 live tests do not certify the SDK revision.

Repository: https://github.com/Adhi7783/Nightwatch

The SDK revision implements **The Midnight Museum Heist**: one original case, three suspects (curator, security contractor, art restorer), ten evidence items, one or two authenticated investigators, a host-controlled lobby, shared reviews/importance flags, saved evidence relationships, notes, supported accusations, and a preserved contribution report.

## Run the SDK revision

Use Node 24 and npm 11.6+.

```sh
npm run install:app
npm test
npm run type-check
npm run dev
```

For production, work from the `sdk/` directory and authenticate with `npx deepspace auth login`; verify `npx deepspace auth whoami` before registration. The existing `sdk/wrangler.toml` identifies the staging app. **Do not deploy that staging identity under a different account or plane.** The production app must get its own server-minted ID, with the GitHub remote present before its first deployment so GitHub is the source authority. Keep the staging app available until the production important path passes.

GitHub Actions installs dependencies, runs the 13 deterministic rule tests, checks TypeScript, and builds. The authenticated multiplayer acceptance specification is in `sdk/tests/acceptance.spec.ts`; it requires actual DeepSpace fixture accounts and has not yet been run here. No credentials are stored in the workflow.

## Read and explain the revised implementation

- `sdk/src/game/types.ts`: typed game/profile/evidence/link/theory records.
- `sdk/src/game/Nightwatch.tsx`: React screens and controlled forms.
- `sdk/src/game/rules.ts`: deterministic validation; the browser never decides correctness.
- `sdk/src/server/case.ts`: original authored case and server-only answer (**spoilers**).
- `sdk/src/server/nightwatch-routes.ts`: verified platform identity and room routing.
- `sdk/src/server/game-room.ts`: DeepSpace RecordRoom persistence, membership checks, serialized operations, and duplicate-request receipts.
- `sdk/src/lib/lookup-own.ts`: small safe lookup/URL helpers absent from the published SDK's exports but referenced by its generated scaffold. These do not replace platform auth or storage.

The game uses DeepSpace authentication, persistent records, real-time subscriptions, and server permissions. Those are native capabilities, **not three external integrations**. No paid external integration is enabled; AI is never used to judge an answer. Optional AI recap, Canvas, and additional cases remain out of scope.

## Submission and verification

- [Requirement-by-requirement audit](docs/REQUIREMENTS-AUDIT.md)
- [Submission draft and tradeoffs](docs/SUBMISSION.md)
- [Applicant's personal verification checklist](docs/APPLICANT-VERIFICATION.md)
- [Interview preparation and investigated bugs](docs/INTERVIEW.md)

Do not claim the applicant personally verified checks performed by an agent. Do not call the staging URL an `.app.space` production release. The deadline is November 23, 2026 at 11:59 PM Eastern / 8:59 PM Pacific.

---

## Historical prototype (superseded design)

Live game: https://nightwatch-meridian.spacestest.com

A complete two-player detective game built on DeepSpace's supported raw JavaScript starter, RecordRoom, schema permissions, and live WebSocket subscriptions. The original case, **The Glass Meridian**, takes place at the fictional Bellwether Museum.

## Play

1. Open the live game and choose **Open a private case**.
2. Create an investigator profile, then copy the invitation link to one partner.
3. Your partner opens it on a different device, browser, or private browsing session and creates their own profile.
4. Investigate the four locations. Each investigator receives four different private evidence files. Share them to build the eight-item evidence board.
5. Compare statements, pin evidence, and use the shared notebook and timeline.
6. Both investigators submit the same suspect, method, and motive. The server validates the joint accusation. A correct conclusion unlocks the full explanation, recovery, and reconstructed timeline. Both players can alternatively agree to request the reveal after collecting the evidence.

Profiles use a server-signed, HttpOnly, Secure, SameSite cookie valid for one year. Returning in the same browser restores the profile and its case archive. Profiles are browser-specific; clearing cookies loses access. The game has no email/password login or cross-device profile recovery. The hosting account backup below manages deployment, not player profiles.

## Source

- `app/public/`: responsive interface, custom museum instrument illustration, and DeepSpace browser adapter.
- `app/server.js`: authenticated HTTP API, invitation and membership checks, serialized game operations, server-only accusation validation, and verified room WebSocket routing.
- `app/model.js`: DeepSpace collection schemas and permissions. Clients can read only the game in their authorized room; game mutations and profile reads/writes require the server.
- `app/case.js`: hand-authored mystery, private evidence, and complete solution. This file is outside the public asset directory.
- `app/deepspace-agent.js`: official starter's bundled DeepSpace runtime.
- `app/wrangler.toml`: official Cloudflare/DeepSpace deployment configuration.
- `published.json`: latest successful deployment receipt.
- `verify-live.mjs`: live integration and security verification against independent player sessions.

The preserved starter `worker.js` and `schemas.js` are not the entry point; `wrangler.toml` selects `server.js` and its `model.js` schema.

## Installation and publishing

The requested `npx skills@latest add deepdotspace/deepspace-skill` was attempted first. npm failed with DNS and TLS errors. The official GitHub repository was cloned instead, and its skill entrypoint is installed at `.agents/skills/deepspace/SKILL.md`.

DeepSpace's documented direct publisher builds and hosts this app without local npm dependencies. This deployment uses its **staging service**, which currently publishes to `spacestest.com`. The app has real persistent RecordRoom storage and live sockets; this is not a static demonstration.

The existing application ID is `app_01M7VVHN85TXZEGE37Z4BVGK4V`. Preserve it and the Durable Object room names on updates to retain stored profiles and investigations.

The private hosting recovery receipt is saved locally in `Nightwatch-hosting-backup.private.json`, outside the published app source and ignored by Git. Keep it private: its account phrase controls deployment. The account-management verification expires after 24 hours; hosting, source, and game data continue serving. Renew through DeepSpace's agent account API when needed.

`deploy.mjs` refreshes the existing account token and submits app files. For an update, use `node deploy.mjs update`, then `node deploy.mjs poll` until published. It reads the ignored `.nightwatch-credential.json` file. Never publish that file or the hosting backup. Do not create a second app to update this one.

Authoritative hosting workflow: https://deploy.deepspacesites.com/agents.md

## Verification

30 live checks passed: independent profiles, reload persistence, private-room access, a full two-player room, forged-header and tampered-token rejection, split evidence, role-restricted evidence sharing, actual second-session DeepSpace WebSocket broadcasts, refusal of direct socket writes and cross-origin socket access, notebook and pin persistence, incorrect accusations, two-person confirmation, the complete server-only reveal, immutable closed cases, profile completion, cross-origin mutation refusal, hidden solution source, and the native read-only agent tool.

Browser checks verified the landing page, profile creation, room creation, invitation dialog, live connection status, restoration after reload, and the responsive 390 px phone layout. Visual checks did not play the entire case through the browser; the complete accusation/reveal path was verified through HTTP and a separate real WebSocket client. The live test creates isolated QA profiles and rooms rather than using a player's room.

Detailed live-check results are in `test-artifacts/live-verification.json`. The final interface preview is `nightwatch-preview.jpg`.
