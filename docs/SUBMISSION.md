# Submission draft — complete verification before sending

**Repository:** https://github.com/Adhi7783/Nightwatch

**Live URL:** Final production `.app.space` URL pending. The existing `https://nightwatch-meridian.spacestest.com` address is staging; do not label it production or assume it serves the latest SDK candidate until its deployment receipt and live flow have been checked.

Nightwatch is an original cooperative detective game for one or two investigators. Players sign in through DeepSpace, choose persistent detective names, create or join a private room, and investigate The Midnight Museum Heist. Ten authored evidence items and three suspect dossiers support shared reviews, evidence connections, notes, a timeline and a deterministic server-validated accusation. A completed case preserves the explanation and the investigators' contributions.

I chose DeepSpace authentication, persistent RecordRoom records, live subscriptions, and server permissions because they directly support returning identities and private multi-user investigations. These are native platform capabilities. I used no third-party McAPI integrations: generated hints, emails, and AI judging would add cost, spoiler risk, and failure modes without improving the core deduction loop.

The main tradeoff was one complete authored case and a structured board rather than a draggable canvas or an AI mystery generator. Correctness remains a small testable rule; the server checks membership, case phase, evidence IDs, required support and duplicate requests. Room operations run serially so concurrent actions cannot overwrite each other's state.

The coding agent audited the brief, identified gaps in the first prototype, implemented the SDK revision and original interface, wrote tests, and prepared deployment and interview documentation. I directed the product scope and selected the revision to three suspects and ten clues.

**Applicant verification — replace before submission:** I personally verified [describe actual sign-in/out, two-browser collaboration, reconnect, incorrect/correct accusation, or code changes you performed]. Do not leave this placeholder or claim agent tests as your own playtesting.

**Agent verification:** 13 deduction tests passed locally. Initial prototype live tests are historical evidence only. Add the SDK build, authenticated security, multiplayer, and responsive results after they pass.

**Unfinished:** Production deployment/source ownership, real OAuth round-trip, and applicant playtesting must be closed before calling this submission ready. AI recaps, extra cases and draggable canvas remain intentionally optional.
