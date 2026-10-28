# Q01 questions and attempts

Refs [Q01 / #11](https://github.com/tomthemaker/ciso-journey/issues/11). The Questions tab uses the canonical 20 foundation questions across MCQ, scenario and open formats. Lessons link directly to each exact question revision. Hashes work under `/ciso-journey/#questions/question-w1-1/1` and on refresh.

Every question shows its objectives, exact revision, bundle/curriculum version, author/review status and source currentness. C03's 72 AI-authored draft records are unchanged. Practice remains provisional; code review cannot substitute for educator/legal review.

## Learner behavior

An MCQ requires an option before submission. Only a successfully committed attempt reveals the keyed result and every option's explanation. Open/scenario questions show their response-scoped rubric before answering. A successfully committed written response reveals its annotated example; no string matching or AI grading assigns a result. The learner may then explicitly choose each rubric anchor and save a separate self-assessment.

Retry submits a new attempt. Earlier answers, keyed results and self-assessments remain in the history. There is no question score that updates task completion, reading/resource progress, recall, applied assessment or the six legacy self-ratings. Responses should use fictional information; the UI advises against employer material.

## Storage and backup

Optional `questionAttempts` schema 1 contains `attempts` and `selfAssessments`. Each attempt pins `contentRef` (compatible with C02's attempt validator), bundle/curriculum versions, objective IDs, source revisions, rubric revision where applicable, format, submitted UTC instant, response and provenance. MCQs use `keyed-mcq` and a boolean keyed result; constructed responses use `unassessed-response` and `correct: null`.

A rubric self-assessment appends its own ID, attempt ID, exact rubric revision, UTC instant, `self-assessment` provenance and criterion/score selections. It does not modify the response. Runtime checks require one valid anchor per exact rubric criterion and allow only one assessment per attempt; a learner can submit a new attempt to reassess. There is no independent-review claim. Both records use random UUIDs and pass through the existing F03 `Change` transaction; pending/duplicate submits are blocked. An aborted write keeps the response/anchor drafts in the current tab and leaves committed history unchanged. Unsaved drafts do not survive tab closure or refresh.

All backups retain this namespace and compatible extra JSON fields; v1/v2 backups without it still load. Full validation rejects future schemas, malformed refs/instants/provenance, duplicate IDs and dangling/duplicate self-assessments before any write. Validation permits structurally valid historical refs without requiring today's installed bundle. History whose exact question revision is missing or has an incompatible kind/format retains the answer/provenance and reports feedback unavailable instead of using a newer question. Unavailable or incompatible exact rubric references retain saved criterion IDs/scores with an explicit notice; they cannot supply new self-assessment anchors. Rubric resolution checks record kind and criterion/anchor shape before use. Imports are whole-state replacements with the existing confirmation; reset is still an explicit whole-state reset. Appended history is immutable within normal question operations, not a tamper-proof audit log.

The original v1 localStorage bytes, all 37 task IDs, six scores, legacy fields and reading progress remain preserved. Source URLs require credential-free HTTPS; authored and imported responses render through text-only DOM construction.

## Validation evidence

Node 24.4.1 commands:

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run test:browser -- --workers=2
```

`tests/questions.test.cjs` checks retries, pinned provenance, explicit rubric selections across all 12 constructed questions, import roundtrips/invalid rejection, compatible extensions and Pages routes. `tests/questions.spec.cjs` exercises committed-feedback timing, keyboard retry, preserved v1 bytes, full export/import, future namespace rejection, open/scenario self-assessment, abort/retry draft retention, literal imported HTML, unavailable revisions and lesson-to-question navigation in desktop/mobile Chromium. The inherited local suite includes all preservation, storage recovery and Pages subpath flows. Browsers remain outside CI (D020).

Implementation results on 2026-10-28: `npm ci`, 122/122 unit checks plus curriculum-matrix consistency, typecheck, production build and whitespace checks pass. The first full local browser run passed all 32 inherited desktop/mobile cases and four Q01 cases; two new cases failed only at a final lesson-link test locator (nonexistent hardcoded lesson ID, then hidden-role lookup before opening details). The locator now resolves the installed lesson and opens its summary through the UI. A focused rerun passed all six Q01 cases in 9.2 seconds. Runtime/build output was unchanged by that test-only correction; the full 38-case candidate suite remains available for fresh independent review. No dependency-lockfile, CI, canonical content or original fixture changes.

The frozen candidate SHA is recorded in the delivery PR. Independent task review remains required; this document claims implementation evidence only.

Review correction and integration, 2026-10-28: [first review](https://github.com/tomthemaker/ciso-journey/pull/38#issuecomment-6462718016) identified a wrong-kind imported rubric reference that crashed history rendering. The new real-import regression failed against the prior renderer with the exact reported `Cannot read properties of undefined (reading 'find')` error. With guarded resolution restored and reviewed L02 main `a82ad965fe92605705ecdb3033390bfbe1e4bd0f` integrated, all 127 unit checks plus matrix consistency, typecheck, build and whitespace checks pass. The complete local desktop/mobile Chromium suite passes 46/46 (1.4 minutes), including known wrong-kind and unavailable rubric refs with/without saved selections, import/reload state preservation, compatible question-format checks, resource tracking, recovery and Pages subpath flows. Both shared-memory parents and reading/resource/question namespaces remain intact. Only evidence documentation changed after these checks; canonical content, fixtures, lockfile and CI are unchanged. Fresh final-candidate task review remains required.
