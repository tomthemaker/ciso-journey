# Provisional study integration

Issue: [#87](https://github.com/tomthemaker/ciso-journey/issues/87). Owner authorization and limits: D037 in [MEMORY](MEMORY.md) and [PLAN](PLAN.md). Source artifacts remain AI-authored draft; agent content/runtime review supplies no independent human educator/legal approval. Validated R1/R2 release gates, #15, #16 and #17 remain open.

## Exact inputs

[Manifest](../../content/provisional-study.manifest.json) records every file's approved commit, raw-byte SHA-256, original bundle version and revision count. Baseline: `be2de3f4c4a86c66d03c354ad16f218404e73e70`'s unchanged `content/foundation.v1.json` (139 revisions). W5–W12: PRs #66–#72/#80, 181 revisions. Competency cases: PRs #77/#81–#85, 21 revisions. W11 uses final reviewed `2e3bfcb2eb3b3e248e021adfc034ff714f3ce00e`. Each manifest hash was compared with `git show <commit>:<path>` bytes locally on 2026-10-29.

`lesson-data.ts` composes only explicitly listed artifacts; a future unlisted draft never enters study. `composeContent` concatenates authored record/editorial arrays and retains exact actor metadata, rejecting conflicting actor provenance, duplicate revisions and incompatible curriculum/schema snapshots. Original JSON files and the baseline are unchanged. `scripts/study-content.mjs` uses the same manifest/composer for validation and browser fixtures. The composed bundle is `provisional-study-2026-10-29.1`, with 341 revisions. Current catalogs contain twelve lessons, 60 questions, 41 cards and fifteen scenarios; historical versions remain resolvable.

## Learning behavior

- Lessons, questions and cases follow actual roadmap task order. All twelve weekly lessons and all six competency cases are available through catalogs and relevant Roadmap task links, including advanced task IDs for competency cases 4–6.
- Lesson prerequisites and practice retain the author's exact refs. Missing prerequisite participation is visible; preview remains available. Today uses exact prerequisite reading when choosing unread work, retains due-card priority and prefers the lesson's authored exact question/case practice.
- Every lesson offers its current related retrieval cards. A card link opens its enrollment controls in Today; enrollment remains explicit. Bulk enrollment adds new IDs only; a corrected revision requires separate explicit enrollment. Due/overdue scheduling, caps, history and FSRS provenance remain unchanged.
- MCQ submissions reveal every option explanation. Constructed responses reveal examples after commitment and permit explicit exact-rubric self-assessment. Each competency case uses its authored brief, deliverable, worked response and anchored rubric in the existing structured response/evidence form. No automatic grading or applied mastery claim is introduced.
- Integration testing exposed W7's authored numeric-string option IDs being rejected by the pilot attempt validator's slug restriction. C02 permits nonempty string option IDs. Attempt validation now retains those opaque strings exactly; new submissions still require exact membership in the shown question's options. Content-reference, objective and criterion slug validation remains unchanged. A regression submits every current MCQ option and constructed question, saves every constructed-response self-assessment and round-trips the combined history; it failed before this correction and passes after it.
- Reading, resource consumption, task completion, recall, question attempts, applied responses/self-assessments and six legacy ratings remain independent. Progress reports the whole available catalog's activity. No learner schema, migration, reset or publication-state update is needed. Full backups preserve all original references, source/rubric pins, histories and compatible extension fields, including unavailable historical revisions.

## Reproduce validation

Use Node 24.4.1; browser execution stays local under D020:

```sh
npm ci
node scripts/study-content.mjs
npm test
npm run typecheck
npm run build
npm run test:browser -- --workers=2
```

The new unit checks pass the full 341-revision bundle to C02 with the previous 139-revision delivery and synthetic refs to every old revision. They require exact record, actor and editorial equality for every input, input hashes, no ID/dependency collisions, all 24 foundation objectives, twelve-week ordering/format/card coverage, six case task paths and exact authored practice in Today. Existing baseline content tests remain scoped to their original delivery; runtime browser fixtures use the composed study bundle. The legacy resource-destination preservation assertion remains exact within its resource panel; new internal task-study links have separate coverage.

Critical local browser checks exercise Pages subpath navigation, all new weekly task/lesson/prerequisite routes, reading participation and MCQ explanations; constructed response/example/rubric feedback; explicit new card enrollment and committed review; all six competency-case responses/self-assessments; and a combined full export/import/reload equality check. Existing preservation/recovery, historical-ref, failure/retry, daily queue, theme/readability, resource and progress checks continue against the complete app. Only synthetic data is used.

## Implementation evidence, 2026-10-29

The first browser collection stopped on a Node/Playwright module-adapter mismatch; the shared local adapter now uses CommonJS consistently. The subsequent complete run passed 88/94 checks: two W7 submission failures exposed the real option-ID mismatch corrected above, two preservation assertions included the new internal study links in the legacy external-resource inventory, and two historical-card tests mixed native dynamic imports with Playwright-transformed CommonJS. The corrected tests preserve the same behavioral assertions. This run already passed both desktop/mobile constructed-response, explicit card review, all-six-case/self-assessment and combined backup flows. These initial results are diagnostic evidence, not an all-pass claim.

Approved UI PR #88 is merged through main `e8b6609505cba4f6e00566d532e9ea15989cb27e`, retaining D036 and D037. The additional merge after UI runtime candidate `1e4e450ff19c77691ce04133f82d427a9b335bc4` changed only its design guide and two synthetic screenshots in this integration worktree; all app, test, configuration and lockfile bytes from that UI candidate remained unchanged by the merge. The corrected complete integration runtime is checked afresh below; no old UI-only browser evidence substitutes for its own checks.

Final candidate checks and independent review will be recorded in the linked PR. Implementation evidence is not final-candidate approval or educator/legal publication validation.
