# Holographic command interface

The command interface uses black surfaces, translucent neon blue type, a text-only NIGHTWATCH wordmark, rotating three-dimensional machinery and a full-screen navigation transition. The previous emblem, subtitle and side drawer are superseded.

## Research and decisions

- [Territory Studio's Avengers: Age of Ultron work](https://territorystudio.com/project/marvels-avengers-age-of-ultron/) ties its screen language to engineering, robotics and each character's work. Nightwatch follows that functional approach with an instrument reconstruction and original mechanical assemblies rather than unrelated decorative dashboards.
- [Cantina Creative's Iron Man 3 process work](https://www.cantinacreative.com/film/iron-man-3) provides a primary visual reference for layered HUD graphics. Its artwork and logos are not embedded in Nightwatch.
- [Orbitron by The League of Moveable Type](https://www.theleagueofmoveabletype.com/orbitron) is a geometric display face. Its squared letterforms provide the requested visual direction for the wordmark, Mission Control heading and navigation. The unmodified font is self-hosted with its SIL Open Font License in sdk/public/fonts. Long evidence text retains a conventional readable face.
- [MDN's WebGL guidance](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) informed bounded resolution, reusable buffers and resource cleanup. Decorative animation stops when the document is hidden; the artifact pauses when offscreen. Reduced-motion preferences receive a static 3D pose.

## Actual geometry

The Meridian is an original armillary instrument made from toroidal rings, tick marks, a spindle and a small triangular support. It rotates through a perspective camera. Its canvas is transparent, with no museum image, embedded captions or display-room backdrop. The former meridian.svg is no longer rendered by the game.

The shared background uses an exploded mechanical assembly with independently rotating impellers, concentric casings, a shaft and calibration rings. It is mounted across the signed-in game pages and the sign-in page. The full-screen briefing unmounts these renderers and retains its black background.

The renderer uses native WebGL with reusable line buffers and premultiplied additive light. A Canvas 2D renderer projects the same 3D geometry if WebGL is unavailable. No external 3D model download, renderer service or new production dependency is required. Pixel ratio and frame rate are capped for the background, and buffers and contexts are released on unmount.

## Focused investigation workspace

The in-case navigation has three sticky destinations: Investigate, Caseboard and Conclusion. The NIGHTWATCH phase menu handles Mission Control and detective identity. Museum locations lead the investigation screen; interviews, chronology and activity are secondary disclosures. Long-form evidence uses ordinary system text. The existing moving machinery remains across the main screens as part of the visual direction.

The caseboard is an original bounded HTML/SVG canvas for ten discoveries and three suspects. Cards begin grouped by museum location, with stable slots as discoveries arrive. Dragging a header arranges a card. Dragging its handle onto a second card opens a Supports, Contradicts or Possibly related editor with an optional explanation. These are working theories and receive no automatic correctness grading. Selection highlights relevant connections and opens full details, review controls and contextual notes. Fit, zoom, Tidy layout and Undo support recovery. Small screens default to a readable list and offer tap-to-connect; card headers also accept keyboard arrows.

Positions save at drop through serialized server actions. A 15-second per-card reservation shows when a partner is dragging. Revision checks reject stale moves, connection versions reject stale edits, and undo refuses to replace newer work. Pan and zoom stay local and partner changes never move another investigator's camera. No additional canvas synchronization backend or graph dependency is needed for thirteen bounded nodes; DeepSpace RecordRoom still owns persistence, access and broadcasts. General drawing, sticky-note tools and generated deductions were deliberately omitted.

## Navigation and narration

The NIGHTWATCH wordmark opens a native modal dialog covering the viewport. Blur and opacity phase in, followed by large geometric text in rounded translucent boxes. Native dialog behavior provides focus containment; Escape, the close control and the wordmark dismiss it. Selection waits for the exit transition and restores focus. The previous side panel is absent from the rendered UI.

Each investigator receives the full opening transmission for each new case. Completion or explicit skipping persists against that room code. Resuming a completed briefing does not interrupt the investigation. Existing global completion records migrate to their existing room history; they do not mark future cases complete. Closed archives do not force an opening transmission.

The compact Replay briefing control plays only the cached voice and does not replace the current page. The approximately 29-second ElevenLabs audio uses actual character alignment for the typewriter display. On short viewports, the spoken words follow within a bounded transcript area while the playback and skip controls remain visible.

## Isolated visual verification

CI also builds sdk/tests/visual-preview into dist/visual-preview. The production publisher only ships dist/client and the Worker; it does not publish this preview. The fixture imports the actual UI components, uses saved public-fiction narration, and has no DeepSpace identity, game endpoint or persistent writes. The ?scene=board fixture uses original demonstration records and the same board domain reducer for local interaction checks; it is separate from the real two-account server regression.

Serve the downloaded CI preview locally with:

```sh
node test-tools/serve-visual-preview.mjs path/to/artifact/dist/visual-preview
```

The ignored test-artifacts/briefing-fixture.json supplies the narration. The server binds only to 127.0.0.1:4175 and serves the built preview and that fixture. This permits browser checks of the actual transmission, rendering, focus and menu transition without adding test cases to a player's production profile. It complements the real authenticated server checks, rather than representing a complete two-browser gameplay automation run.
