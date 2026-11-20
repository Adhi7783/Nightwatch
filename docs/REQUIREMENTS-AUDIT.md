# Nightwatch requirements audit

The detailed product brief and exercise text supplied on November 19, 2026 are the acceptance criteria. The three-suspect, ten-clue revision was explicitly selected by the applicant in this chat. This audit replaces any implication that the initial prototype fully met that brief.

## Original prototype versus SDK revision

| Requirement | Initial live prototype | Revised SDK source | Verification needed before submission |
| --- | --- | --- | --- |
| React + TypeScript from official scaffold | Plain JavaScript | Official current SDK scaffold; typed React UI, server and game records | Hosted TypeScript/build result |
| DeepSpace sign-in, sign-out, returning identity | Custom browser JWT/cookie | Native auth provider, OAuth sign-in UI, sign-out, verified platform JWT, account-owned profile | Real OAuth round-trip and second-device resume |
| Three suspects, approximately ten clues | Four suspects, eight clues | Three requested roles and exactly ten original evidence files | Applicant's case playthrough and editorial review |
| Start, join, resume | Present | Present with account-owned room archive | Authenticated deployed flow |
| Host-controlled lobby, one or two players | Two required; auto-start | Host starts solo or with one partner; second seat can join only in lobby | Host/partner/outsider deployed tests |
| Private room server permissions | Implemented and tested | Verified JWT, membership guard, separate room RecordRooms, client writes denied | Repeat against SDK revision |
| Reviews and important clues | Pins only | Per-investigator review state and shared importance flags | Two-session live sync |
| Saved evidence-to-suspect/evidence links | Missing | Validated, attributed connections and removal | Two-session live sync and duplicate connection rejection |
| Notes and theories | Notes only | Attributed notes and recorded accusation explanations | Persistence and reconnect |
| Supporting evidence IDs validated | Missing | Server checks allowed/shared IDs, duplicate IDs, explanation length, deterministic required evidence | 13 local tests passed; live API checks pending |
| Concurrent updates and duplicate retries | Serialized actions | Serialized room actions plus user-bound request IDs and fingerprint checks | Live duplicate/retry tests |
| Complete reveal and contributions | Reveal only | Explanation, recovery, reconstructed timeline, names, shared discoveries/reviews/links/notes and submission history | Deployed solo and cooperative solve |
| Product-specific noir UI | Green museum theme | Blue-black/teal forensic console, readable evidence artifacts, responsive navigation | Desktop/mobile and contrast audit |
| Required users schema | SDK runtime built-in | Official users schema retained | Build and least-privilege checks |
| GitHub canonical source | Empty GitHub remote; staging source already claimed DeepSpace | Revised source prepared for Adhi7783/Nightwatch | Push source; final GitHub-claimed production app |
| `<name>.app.space` deployment | `spacestest.com` staging | Production setup instructions prepared | Applicant-owned production account/deployment |
| Submission explanation | Prototype README only | README, writeup, decisions, applicant verification checklist | Applicant must supply their own verification claims |

## Platform and account constraints

- Current source-control docs say the first source claim is permanent. The existing staging app cannot be converted into a GitHub-owned app in place. A production app first deployed from this GitHub checkout is the clean final path. Do not delete the working staging app or claim the source ownership was transferred.
- npm registry TLS fails in this execution environment. The official hosted builder is used to check the SDK candidate. A fetched prototype archive proved older than the current scaffold and failed on missing exports; the candidate was corrected to the scaffold's exact SDK version, 0.44.1.
- Native production OAuth and creation of developer test accounts require the applicant's developer account. An agent hosting account is not evidence of the applicant's own sign-in or verification.
- Browser-only prototype identities are separate from native DeepSpace accounts. Legacy data remains in its original Durable Object names; it is not silently assigned to a new account based on a display name.

## Integrations wording

The main exercise states no minimum integration count; the later helpful bar says at least three. The product brief explicitly resolves this by choosing useful platform capabilities. Nightwatch uses DeepSpace authentication, persistent RecordRoom records, real-time subscriptions, and server-enforced permissions. These are **native capabilities**, not three third-party McAPI integrations. No external AI, email or payment integration is added merely to inflate a count. If the portal requires three external integrations literally, clarify that requirement before claiming it is met.

## Scope deliberately left out

AI recaps/hints, collaborative Canvas, voice, extra cases, monetization, animation-heavy effects, and generated mysteries are optional and excluded from the core. AI never decides whether an accusation is correct.

## Still requires the applicant

- Complete native sign-in and sign-out yourself.
- Play the revised case with a partner and verify the important path yourself.
- Review the ten clues for fairness without reading the server solution first.
- Confirm the GitHub repository and production URL in the portal.
- Edit the submission note to describe only what you actually checked or changed.

Deadline: Monday, November 23, 2026, 11:59 PM Eastern / 8:59 PM Pacific.
