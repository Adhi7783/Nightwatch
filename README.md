# Nightwatch

**Live:** https://nightwatch-meridian.app.space  
**Source:** https://github.com/Adhi7783/Nightwatch

Nightwatch is an original cooperative detective game built on DeepSpace. One or two signed-in investigators solve **Case 001: The Midnight Museum Heist** by examining ten evidence files, comparing three suspects, saving connections and notes, and submitting a supported accusation. The solution is deterministic and stays in server-only code until the case closes.

## Play

1. Sign in with GitHub or Google through DeepSpace and choose your detective name.
2. In Mission Control, create a private room or join using a code/link. Returning accounts can resume their saved rooms.
3. Each new investigation begins with a short narrated briefing and synchronized typing, or you can explicitly skip it. Resuming that same case does not force the full-screen transmission again. Invite one partner before starting, or start solo. Only the host can start the investigation. Click the centered NIGHTWATCH wordmark to open the full-screen phase navigation. Once inside a case, Replay briefing near the top plays only the voice.
4. Inspect four museum locations and share discoveries. Use Investigate for locations and interviews, Caseboard for draggable shared cards, connections and contextual notes, and Conclusion for the supported accusation. Drag a card header to arrange it or drag its connection handle onto another card. Connections have a relationship and optional explanation. List view and tap-to-connect support smaller screens.
5. Choose a suspect, method, motive and supporting evidence, then explain the connections. In a two-person case, both investigators submit a matching conclusion with sufficient support.
6. Ask the shared notebook's evidence assistant to select cited observations from earned clues. A correct theory unlocks the full explanation, evidence reasoning, reconstruction and contribution report, with PDF export. Incorrect theories stay spoiler-safe. Both investigators may instead agree to reveal the answer; that records a revealed case rather than a solved case.

Profiles belong to the authenticated DeepSpace account rather than a browser-only identity. Progress is persisted through RecordRoom and synchronized through its live subscription protocol.

## Run locally

Use Node 24 and npm 11.6+.

```sh
npm run install:app
npm test
npm run type-check
cd sdk
npx deepspace auth login
npx deepspace auth whoami
npx deepspace dev start
```

The root scripts delegate app commands to `sdk/`. Its committed `package-lock.json` reproduces the successful CI dependencies; use `npm ci` inside `sdk/` for a clean install.

## Deploy

From `sdk/`, use `npx deepspace deploy` under an authorized production developer account. Check `auth whoami` first. Preserve the production app ID `app_01M7VYDJBHE61KDVTRB3DCK6X2`, the BOARD binding, and the v2 room names so saved investigations survive updates.

The production app's permanent source claim was verified as `github: adhi7783/nightwatch`. Push source to this repository with ordinary Git. Do not use `deepspace push`, which is for DeepSpace-managed source.

Local npm registry connections failed TLS during this build. The official hosted publisher validated the staging SDK candidate, and GitHub Actions installed dependencies, ran TypeScript and rule tests, and built the production artifact. `production-deploy.mjs` then published that artifact using the official CLI's asset-plan/upload/form protocol. Production credentials stayed on the local computer; none were sent to Actions. This transport adaptation is documented rather than claiming that `npx deepspace deploy` ran locally.

The earlier `spacestest.com` prototype is a separate staging app with a permanent DeepSpace source claim. Its config is retained as `sdk/wrangler.staging.toml`. Its legacy browser identities are not silently mapped to native accounts. Never swap staging and production IDs.

## Main files

- `sdk/src/game/types.ts`: typed profiles, rooms, members, evidence, connections and submissions.
- `sdk/src/game/Nightwatch.tsx`: React UI, controlled forms, native auth and live snapshots.
- `sdk/src/game/Caseboard.tsx`: bounded pointer-driven evidence canvas, keyboard movement, local camera and mobile list view.
- `sdk/src/server/caseboard-actions.ts`: drag reservations, revision checks, annotated connections and conflict-safe undo.
- `sdk/src/game/rules.ts`: small deterministic validation/deduction functions.
- `sdk/src/server/case.ts`: structured original story and server-only answer. **Contains spoilers.**
- `sdk/src/server/nightwatch-routes.ts`: verified JWT identity, input boundary and private room routing.
- `sdk/src/server/game-room.ts`: DeepSpace RecordRoom storage, membership, host start, serialized actions, request deduplication and durable contribution totals.
- `sdk/src/lib/lookup-own.ts`: safe own-key and URL validation helpers referenced by the generated scaffold but absent from its published SDK exports. Auth, persistence and synchronization remain platform primitives.
- `verify-sdk-live.mjs`: deployed security/game-flow checks using three real DeepSpace fixture accounts and an independent WebSocket client.

## Security and concurrency

Private data is in per-room RecordRooms. Verified platform identity and membership gate every HTTP/socket entry. Client schema writes are denied; server actions validate phase, host authority, IDs, lengths, required evidence and request IDs before writing. A serialized room queue prevents concurrent operations from overwriting each other. Request receipts make retries idempotent and reject a reused ID with different input. Unconfigured paid integration proxies are disabled.

The canonical answer is not imported into browser modules or served as an asset. The source repository includes server code for evaluation; this does not prevent a player deliberately reading repository spoilers. Public file URLs and ordinary gameplay do not disclose the solution before closure.

No credentials, test-account passwords, `.dev.vars`, or session backups belong in Git. Private local files are ignored. The SDK's required `users` schema is retained.

## Scope and platform choices

DeepSpace authentication provides persistent identity; RecordRoom provides records and live updates; schemas and verified server routes enforce permissions. In addition, three real DeepSpace catalog integrations support the product: **ElevenLabs** narrates the authored briefing with timing alignment, **Anthropic** selects source-verified observations from shared evidence, and **CloudConvert** exports closed-case reports as PDF. All run through the DeepSpace worker integration proxy. No vendor API keys are stored in the app. AI never judges correctness. See [integration design and limits](docs/INTEGRATIONS.md).

The main tradeoff is one complete authored case and a bounded thirteen-card canvas rather than a general whiteboard or generated mysteries. Card positions, annotated links and undo are validated by the existing RecordRoom; pan and zoom stay local to each investigator. The assistant selects exact source text rather than inventing hints. Extra cases, cursors and achievements remain outside this release. The command interface uses original perspective-projected 3D instrument and machinery geometry, black surfaces, translucent blue light and a self-hosted geometric display font. Reduced-motion preferences disable decorative rotation. See [visual direction and implementation](docs/VISUAL-DIRECTION.md).

## Verification and submission

GitHub Actions runs 31 game, caseboard concurrency, recap, briefing-history and 3D geometry tests, TypeScript validation and the production build. Live verification covers 65 native game/security/board checks and 19 integration checks, including actual provider responses and a downloaded PDF. See the checked-in verification record for exact release references and execution limits.

Browser checks cover native sign-in, the applicant's saved detective name, room creation/invitation, reload restoration, and the signed-in 390 px layout. The full solve/security path was tested through real HTTP and independent WebSocket sessions. The complete two-browser UI acceptance specification is provided in `sdk/tests/collab.spec.ts`; do not claim it ran unless recorded.

- [Requirement and original checklist audit](docs/REQUIREMENTS-AUDIT.md)
- [Verification evidence](docs/VERIFICATION.md)
- [Submission note](docs/SUBMISSION.md)
- [Applicant's own remaining playtest checklist](docs/APPLICANT-VERIFICATION.md)
- [Interview preparation and debugging decisions](docs/INTERVIEW.md)

The applicant confirmed production sign-in and detective-name setup. Their full personal partner playthrough and portal submission remain their own steps. The deadline is November 23, 2026, 11:59 PM Eastern / 8:59 PM Pacific.
