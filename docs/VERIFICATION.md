# Nightwatch verification record

Production: https://nightwatch-meridian.app.space

Repository: https://github.com/Adhi7783/Nightwatch

Runtime source: 512d51b03bda24d8600ceec4e8f5b0fb13a1e1c6

Successful CI: https://github.com/Adhi7783/Nightwatch/actions/runs/45141392587

Production release: rel_01M83SGEQGNFSSTM92D2H5F6KB

## Current automated checks

Twenty-five tests passed locally and in CI, alongside strict TypeScript and the production build. Thirteen cover authored case structure and deterministic accusation validation; five validate source-grounded recap parsing; four cover per-case briefing behavior and migration from the old global flag; three cover finite 3D geometry, rotation through depth and perspective projection. CI also builds the isolated visual fixture from the actual UI components.

The complete 42-check native-account game regression passed after the profile-history change. It covers authenticated identity, private membership, room capacity, host start, real RecordRoom sockets and broadcasts, evidence reviews and connections, notes, concurrent writes, request deduplication, malformed and wrong accusations, supported joint and solo solves, full reveals, contribution history, closed-case immutability, source-file protection and sign-out/sign-in restoration.

All 18 integration checks passed. They verify real ElevenLabs MP3 and character alignment, durable voice reuse, room-specific briefing completion, nonmember rejection on completion, a subsequent case remaining unbriefed, earned-evidence recap gates and exact citations, generic paid-proxy blocking, closed-case export gating, actual CloudConvert PDF download and result reuse. The final subsequent changes were rendering, responsive transmission layout and the isolated test fixture; the tested server integration and game logic did not change.

## Browser and visual checks

The production dashboard and navigation were inspected with the native authenticated profile. The centered Mission Control heading and text-only NIGHTWATCH wordmark use the self-hosted display font. The old image and side drawer are absent from the rendered UI. Both 3D scenes reported native WebGL rendering and advancing frame counts. Perspective rotation and the corrected additive light were inspected visually. Desktop and phone dimensions were checked for horizontal overflow.

The native full-screen menu phases over a blurred background, contains large rounded navigation tiles and traps keyboard focus. Escape dismisses it and restores focus. Navigation selection completes after its exit transition. The audio-only Replay briefing button was exercised inside an existing production investigation: audio played while the case title and page stayed in place, and no full-screen transmission appeared.

Automatic approval review rejected the agent's planned creation of a new persistent case in the applicant's production profile because that particular data change was not specifically authorized for verification. The agent did not bypass that rejection. Instead, real case creation and per-case history were checked with the existing developer fixture accounts, and the actual Briefing component was tested through the local isolated preview.

The preview has no DeepSpace client, identity, game endpoint or persistent writes. It uses cached fictional narration and the same components and CSS as production. At 390 by 844, the transmission occupied the viewport, its controls stayed within the screen, the transcript followed the current spoken words, and no machinery renderer was mounted on the black briefing page. Actual timed typing, pause/resume, natural audio completion and transition into the case-control fixture were observed. The mobile full-screen navigation fit without horizontal overflow and selected a destination correctly. The cached narration was measured at 28.84 seconds.

The PDF export was previously rendered and visually inspected across all three pages, including proof, chronology, escaped notes, accusations and contributions. This revision did not change report generation. No application secret values were found in the tracked source scan.

## Scope and limits

- The full two-browser UI acceptance specification in sdk/tests/collab.spec.ts is updated but remains unexecuted. Do not call the isolated component preview a complete authenticated browser game run.
- Fresh-case creation through the applicant's own browser profile was not exercised after automatic review rejected that action. The corresponding native API checks used actual fixture accounts, not mocked services.
- No blanket WCAG certification or claim of an actor voice clone is made. Native dialogs, focus restoration, labelled controls, reduced-motion handling and responsive layouts are implemented. WebGL fallback is implemented; the recorded visual sessions used WebGL.
- The applicant's personally confirmed sign-in/name setup is distinct from agent verification. Their own full partner playthrough, writeup review and portal submission remain their steps.

See VISUAL-DIRECTION.md for primary research links, geometry and rendering choices, and instructions for the isolated visual fixture. Private credentials, cached narration and downloaded build/test artifacts are ignored by Git.
