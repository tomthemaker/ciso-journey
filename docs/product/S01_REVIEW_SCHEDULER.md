# S01 review scheduling and recovery

Refs [S01 / #12](https://github.com/tomthemaker/ciso-journey/issues/12). This increment supplies the scheduling/persistence adapter for S02's later daily interface. It adds no Today UI, changes no authored content, and publishes no content. All 12 existing foundation cards remain AI-authored drafts.

## Contract

`src/reviews.ts` exposes `enrollCard`, `setCardStatus`, `setNewCardLimit`, `dueQueue`, `applyReview`, `createReviewActions` and `estimatedRecall`. Mutations accept a private `LearnerState` candidate and change only optional `reviewProgress` schema 1. Reading, resource completion, task completion, question attempts, applied assessments and all six legacy scores stay independent.

```ts
const actions = createReviewActions(changed); // existing F03/main Change boundary
// Explicit enrollment, suspension/archive and settings use that same Change boundary.
await changed(candidate => enrollCard(candidate, { id: 'card-example', version: 1 }, now));
const queue = dueQueue(committedState, now, Intl.DateTimeFormat().resolvedOptions().timeZone);
// Generate one ID when presenting an answer; retain it through double-clicks/retries.
await actions.submit({ eventId, contentRef, rating: 'Good', now, timeZone });
```

`now` is an explicit canonical UTC ISO instant such as `2026-10-28T08:00:00.000Z`. `timeZone` defaults to the browser's local IANA timezone. Again means failed recall; Hard means successful recall with effort. Good and Easy are successful recall. A rating never establishes competency. `estimatedRecall` returns a model probability, absent before the first review; observed ratings and modeled probability remain distinct.

The queue includes every active overdue/due review before a separately bounded new-card list. Due comparison uses actual UTC instants. A new card counts once against the local calendar day of its first review, computed in the current queue timezone; same-day relearning does not consume another slot. Local midnight resets the count, including DST changes. Changing timezone can change which day an introduction belongs to. The default is five new cards/day; a configurable integer 0–100 bounds new introductions only. New cards sort by enrollment instant then exact revision key; due cards sort by due instant then key. Cap exhaustion never removes overdue reviews. Suspension/archive excludes a revision without deleting its schedule or events. Reactivation retains its existing due date. Corrected content requires explicit enrollment of a new revision; earlier schedules/events retain their exact references.

## Version and reconstruction

The registry stable version checked on 2026-10-28 was **ts-fsrs 5.4.2**, pinned exactly in package and lockfile, implementing **FSRS-6.0**. The main upstream docs already describe a v6/FSRS-7 API unavailable as a stable registry release. This adapter uses the [official v5.4.2 package contract](https://github.com/open-spaced-repetition/ts-fsrs/blob/v5.4.2/packages/fsrs/README.md), installed declarations/source and `FSRSVersion`. It uses `createEmptyCard`/`next`/`get_retrievability`, not the later `DefaultScheduler` API.

Adapter version 1 fixes retention at 0.90, maximum interval at 36,500 days, all 21 FSRS-6 default weights explicitly, short-term learning enabled, learning steps 1m/10m and relearning step 10m. Fuzz is disabled; **no random seed is needed or used**. The complete configuration is copied into every event with the library/model/adapter versions. Upgrades require a separately versioned adapter and retained replay support for these historical events; changing the installed library/version string silently is unsupported.

Each append-only event stores a unique submission ID, exact content revision, UTC review instant, timezone, rating, provenance, complete before/after schedules and complete library log. Schedules include due/last-review instants, stability/difficulty, elapsed/scheduled days, repetitions, lapses, learning step and state. Later reviews/status changes never edit prior events. Returned events are detached copies. This is an application audit history, not cryptographic evidence against someone editing their own backup.

Before any import/load/save, validation checks the full schema, unique IDs/revisions, event chains, supported provenance and deterministic replay of every before/after/log, plus final schedule consistency. Compatible opaque JSON extensions survive at every level. Unknown historical content references survive without requiring today's bundle; unsupported review schemas/provenance reject safely. Explicit full-backup restore/reset can replace the entire learner snapshot, as before; routine review mutations append only.

## Atomic persistence and recovery

`createReviewActions(Change)` shares a promise for concurrent identical event IDs and rejects conflicting answer reuse. `applyReview` returns the existing durable event for a retry without scheduling again. A distinct ID cannot re-review a card before it is due. The event append and schedule replacement are one candidate passed once through F03's IndexedDB snapshot transaction. Commit completion precedes publishing candidate state. A transaction abort/quota failure leaves both unchanged; retain the answer ID and retry. Existing revision checks prevent stale tabs overwriting other learning progress.

V2 backups contain full review state/history/settings with every other current field. Original v1 imports, all 37 task IDs, six legacy scores, reading records and compatible extra JSON fields remain supported. Original `ciso-journey-v1` recovery bytes stay untouched. A malformed/future/inconsistent review payload rejects the entire import before replacement; never delete a malformed field and silently reset its history. Export a recovery copy, retain the original bytes and use the matching app/adapter or repair a copy in a separate browser profile. See [F03 recovery](F03_STORAGE_AND_RECOVERY.md).

## Validation

Node 24.4.1 commands: `npm ci`, `npm test`, `npm run typecheck`, `npm run build`, `npm run test:browser -- --workers=2`, `git diff --check`. Browser installation/execution remains outside CI. Exact candidate/results are recorded in the S01 PR.

The 13 adapter unit checks cover four deterministic ratings/provenance, failed-vs-effortful semantics, overdue carryover/new-card caps, local-midnight/DST boundaries, durable-ID idempotency, suspension/archive/new content revisions, full v1/v2 backup/extension preservation, malformed/future/inconsistent rejection, pending duplicate/retry handling and estimated recall. Existing inventory/backup/reading/storage tests continue to cover preservation.

Two focused browser scenarios run on desktop and mobile Chromium against actual IndexedDB: abort after successful put request leaves event/schedule/revision unchanged; retry commits both once; double submit and refresh retries preserve a single event; full backup restoration and corrupt/future import rejection preserve review/reading/opaque learner fields. Existing critical browser flows include Pages subpath/hash refresh and F03 recovery.

The small `tests/browser/review-harness.ts` compiles the actual adapter, `Change` contract and F03 store as a local-test-only entry. Playwright builds it after the production build and serves it under the same strict Pages subpath. `npm run build` does not include the harness in deployment artifacts. It adds no browser tooling/install/execution to CI. It is a persistence integration check; the later S02 interface still needs its own keyboard/mobile interaction tests and independent review.

Implementation evidence, 2026-10-28, base `4806bd0ec7bbbd2e66f37ade6a67fc8db7fdab6d`: clean `npm ci` (zero audit vulnerabilities); 130/130 unit checks plus generated-matrix consistency; typecheck/build and whitespace checks passed. Local desktop/mobile Chromium passed 36/36 (41.8s), including the four new actual-IndexedDB cases and existing Pages/legacy/recovery flows. A subsequent clean production build confirmed `dist/__review-harness.js` is absent. Foundation bundle, existing legacy fixtures, main/UI runtime and CI workflow are unchanged. No real learner data was used. An earlier browser invocation stopped before tests because another task held the shared port; the final serialized full run passed. These checks establish the implementation candidate's behavior, not independent task or educator/legal approval.
