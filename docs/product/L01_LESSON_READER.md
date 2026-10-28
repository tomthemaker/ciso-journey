# L01 lesson reader and reading history

Refs [L01 / #8](https://github.com/tomthemaker/ciso-journey/issues/8), decision D023 in [shared memory](MEMORY.md). A plain DOM reader consumes the C02 content contract and pinned C01 objectives. The canonical four-lesson foundation bundle remains AI-authored provisional draft; code review and structural checks do not supply educator/legal approval.

## Behavior and boundaries

The Lessons tab opens original reading, objectives, prerequisite links, sections, worked examples, misconceptions, exact concept links, reflection prompts and official source metadata. No paid resource is required to read a lesson. Practice previews do not submit answers or record attempts. Source links use credential-free HTTPS only; every authored string is rendered as literal text. This increment adds no custom-content import or authoring workflow. Existing backup text remains protected by the preservation checks.

`#lessons/{id}/{version}` addresses the exact installed lesson/concept revision under the existing Pages subpath. Refresh and browser history work without server routes. The catalog selects the latest installed lesson revision while historical installed revisions remain directly addressable. An unavailable revision reports that fact without discarding reading history. Keyboard links/buttons, focused section headings, exact concept backlinks and a wrapping mobile layout support reading navigation.

The reader and validator share `src/content-status.ts`: draft stays draft, current states inherit expired/challenged source dependencies, and retired content stays visibly withdrawn. The reader shows author identity/kind, exact revision, effective editorial state, source edition/jurisdiction, check and due dates, verification type/evidence and rights metadata. An overdue draft source is visibly overdue even though the draft remains draft. Automated dates cannot detect an unrecorded official source change.

## Reading state and recovery

Only **Mark reading complete** / **Mark reading unread** changes reading state. Opening, scrolling or following a prerequisite/concept never completes anything. The record is participation for one revision, with no inference about comprehension, task completion, resource consumption, recall, question performance, legacy competency ratings or applied competence.

Optional learner data field:

```json
{"readingProgress":{"schemaVersion":1,"entries":[{"contentRef":{"id":"lesson-w1-foundations","version":1},"completed":true}]}}
```

An absent field leaves legacy data unchanged. Entries retain exact refs, including unknown historical IDs, compatible extension fields and explicit unread values. Duplicate refs, invalid booleans/IDs/versions and unsupported reading schemas reject the entire import/snapshot. A new revision starts unread; it does not retarget history. This small validated field fits F03's existing snapshot schema 2 and v2 full-backup envelope. Both v1 and v2 imports retain it when present; all 37 task IDs, legacy scores and untouched original localStorage bytes retain their existing semantics.

Reading edits use the existing cloned-candidate transaction/revision boundary. The displayed committed state changes after transaction completion; aborts retain read/unread state and the error banner offers recovery. Busy/blocked controls and repeat-submit protection use the existing app boundary. Export/import, reset, stale-tab checks and corrupt/future snapshot recovery remain F03 behavior; see [storage guide](F03_STORAGE_AND_RECOVERY.md). Keep private backups outside Git.

## Validation

Node 24.4.1. Run:

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run test:browser -- --workers=4
git diff --check
```

Fast checks cover exact-revision progress independence, v1/v2 round-trips and compatible extensions, corrupt/future/duplicate rejection, historical reference retention, hash parsing and HTTPS URL defense. Existing C02 gate tests run against the shared status implementation. Local desktop/Pixel 7 browser checks cover full lesson rendering, keyboard section/concept navigation, Pages refresh, mobile overflow, reading persistence/export/import, transaction-abort rollback, future progress rejection and hostile authored HTML/unsafe URL fixtures. They retain all existing preservation, Pages asset and storage-recovery flows. Fixtures are synthetic; route injection tests rendering defenses without introducing a product content-import API.

Final canonical-bundle candidate/results and fresh independent task review are recorded in the PR. Browser checks remain local, outside CI; release and independent educator/legal gates remain separate.
