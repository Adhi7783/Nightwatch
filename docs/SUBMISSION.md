# Submission note — review before sending

**Repository:** https://github.com/Adhi7783/Nightwatch

**Live URL:** https://nightwatch-meridian.app.space

Nightwatch is an original cooperative detective game for one or two investigators. Players sign in through DeepSpace, choose persistent detective names, create or join a private room, and investigate The Midnight Museum Heist. Ten authored evidence items and three suspect dossiers support shared reviews, evidence connections, notes, a timeline and a deterministic server-validated accusation. A completed case preserves the explanation and the investigators' contributions.

I chose DeepSpace authentication, persistent RecordRoom records, live subscriptions, and server permissions because they directly support returning identities and private multi-user investigations. I also used three DeepSpace catalog integrations: ElevenLabs for a short synchronized opening narration, Anthropic for source-verified evidence recaps, and CloudConvert for a downloadable final case report. Calls are authenticated, cached and rate limited on the server. AI does not create the mystery or judge accusations.

The main tradeoff was one complete authored case and a structured board rather than a draggable canvas or an AI mystery generator. The assistant selects observations from earned evidence and the server restores the exact authored excerpts after validation. This provides useful orientation without exposing hidden evidence or trusting generated conclusions. Correctness remains a small testable rule; room operations run serially so concurrent actions cannot overwrite each other's state.

The coding agent audited the brief, identified gaps in the first prototype, implemented the SDK revision and original interface, wrote tests, and prepared deployment and interview documentation. I directed the product scope and selected the revision to three suspects and ten clues.

**Applicant verification:** I personally completed the production account sign-in and the game sign-in, chose a detective name, and confirmed that setup to the agent. I directed the revision to the supplied brief, including the three-suspect, ten-clue scope. The automated and API checks below were performed by the agent; I do not present those as my own partner playthrough.

**Agent verification:** 18 deduction and recap-validation tests passed locally and in GitHub Actions; TypeScript validation and the production build passed. Forty-two real production checks covered the game and permissions, with 16 further checks for the three integrations, their private-room gates, caches, actual audio/timing and PDF output. The redesigned dashboard and waiting room were inspected at desktop and phone widths. Exact results and limits are recorded in `docs/VERIFICATION.md`.

**Remaining:** I have confirmed production sign-in and detective-name setup. I still need to record my own full partner playthrough and observations before sending this note. The automated two-browser UI acceptance spec is supplied but is not claimed as executed. Extra cases and a draggable canvas remain outside the focused release.
