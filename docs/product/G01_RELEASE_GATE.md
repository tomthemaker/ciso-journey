# G01 foundation pilot gate record

Date: 2026-10-28. Task: [G01 / #15](https://github.com/tomthemaker/ciso-journey/issues/15). Authority: [PLAN](PLAN.md), D008/D012/D020/D022/D024 in [memory](MEMORY.md). User instructions and publication gates remain in force.

**Status: functional pilot verified; validated R1 teaching release blocked.** This record distinguishes a functional provisional pilot from approved educational content. Issue #15's first acceptance criterion, **all R0/R1 gates pass**, is not met while independent educator approval is missing. An agent's implementation review does not supply that approval. No gate is waived, no task completion or release approval is claimed, and the issue must remain open in In Review until its full acceptance and delivery requirements are satisfied.

## Candidate and evidence

Runtime/test candidate: `d602351d2bf483d0f6b144ab08807aacf6142a56`, approved by [S02 final independent review](https://github.com/tomthemaker/ciso-journey/pull/42#issuecomment-6477022434) and merged as `ea400e651b974e31cc20877b6e726f3829a5a428`. That merge is this documentation candidate's base. [Main fast-check/Pages workflow](https://github.com/tomthemaker/ciso-journey/actions/runs/40743836454) succeeded for that exact merge. [Fresh delivery verification](https://github.com/tomthemaker/ciso-journey/pull/42#issuecomment-6480650420) separately confirmed deployment parity and the live study/backup flow.

G01 changes only README, these gate/learner notes and shared memory. `git diff --exit-code d602351d2bf483d0f6b144ab08807aacf6142a56 HEAD -- src content curriculum tests scripts public index.html package.json package-lock.json playwright.config.cjs tsconfig.json vite.config.ts .github` passed at the base; comparison to the final working tree also passed. All tracked changes are documentation. D020 therefore permits reuse of the exact S02 browser evidence below; G01 does not claim another full browser run. The final G01 documentation SHA, CI and fresh task-review verdict belong in its PR, without self-approval.

Existing evidence is scoped to its frozen candidate:

- [S02 final independent review](https://github.com/tomthemaker/ciso-journey/pull/42#issuecomment-6477022434): candidate `d602351d2bf483d0f6b144ab08807aacf6142a56`; **Approve**; independent clean Node 24.4.1 install, 152/152 units plus generated-matrix consistency, app/harness strict typechecks, production build/harness exclusion and all **72/72 local desktop/mobile Chromium cases** (2.1 minutes), including Pages, preservation/recovery/security and Today. Additional real keyboard checking exercised all four ratings. This full final-candidate result supersedes the earlier S02 implementation's 70/72 run and focused rerun for integrated browser evidence.
- The whole-loop test in `tests/today.spec.cjs`, **Today connects original reading, question and case; keyboard review and all five namespaces survive restart/export/import**, runs on both desktop and Pixel 7 emulation. It performs original reading, question, case response/rubric self-assessment, optional resource and retrieval, then verifies the five distinct learning namespaces and original tasks/scores across restart/full export/import. The inherited preservation suite separately checks the original v1 bytes. This is synthetic functional evidence, not a measured learning outcome.
- [S01 final independent review](https://github.com/tomthemaker/ciso-journey/pull/39#issuecomment-6476695455): candidate `512267be4f9ead0c3d82f04438a323a6d422a8d0`; **Approve**; 149 units plus matrix, app/harness types, production build/harness exclusion and 60 desktop/mobile Chromium cases, including Pages/import/IndexedDB recovery. Merged as `d869b862ec8cba917a5512f78f4f941aa855a386`.
- [A01 independent review](https://github.com/tomthemaker/ciso-journey/pull/41#issuecomment-6476521062): candidate `fc23a4180909c63c2adfdef4112edaae227a6944`; **Approve**. One inherited desktop tracker test initially timed out; an unchanged focused rerun passed. [Delivery review](https://github.com/tomthemaker/ciso-journey/pull/41#issuecomment-6476558359) verified identical merged tree, successful Pages deployment and synthetic live case/backup flow. The subsequent S01 review above passed all 60 integrated cases together.
- [C03 final independent agent review](https://github.com/tomthemaker/ciso-journey/pull/36#issuecomment-6462315776): candidate `67f7c16d8ebc39a86d0373622aa0def89bed4d83`; **Approve for provisional draft delivery**. Four lessons, eight objective explanations/examples, 12 cards, eight MCQs/feedback, all twelve constructed-response prompt/example/rubric pairs and six official references inspected. No remaining substantive finding; this explicitly supplies no human educator/legal approval.
- [S02 fresh delivery verification](https://github.com/tomthemaker/ciso-journey/pull/42#issuecomment-6480650420): approved candidate and merged main share tree `3117e055d46d1e62e92d67ed030ae2dc4e3f0b61`; main workflow and Pages deployment `7393736137` succeeded. Live HTML/JS/CSS byte-match artifact `12840407059`; the browser harness returns 404. One isolated live Pixel 7 Chromium smoke passed (9.1 seconds), exercising all five study namespaces, keyboard reveal/Good, separate signals, reload/full export/import and unchanged legacy tasks/scores. Synthetic data only; no educator/legal approval.
- [F02 independent delivery review](https://github.com/tomthemaker/ciso-journey/pull/30#issuecomment-6441712068): Pages switched to Actions, approved artifact matched live HTML/JS/CSS bytes/MIME, synthetic v1 import/reload/export and desktop live smoke. Historical hosting evidence; S02 delivery verification above covers the current pilot.

These reviews approve implementation within their task scope. None supplies independent human teaching validation or G01 approval. Chromium desktop/Pixel 7 emulation is not a physical-device, all-browser, screen-reader or comprehensive accessibility audit. Synthetic failure injection checks transaction behavior, not physical power loss, disk exhaustion or browser eviction.

## Gate inventory

Technical passes use the exact-candidate evidence above; “blocked” identifies an unmet requirement. Content quantities and structural coverage do not establish pedagogy or learner outcomes.

| Gate | Evidence / acceptance boundary | Status |
|---|---|---|
| R0: preserve all 37 task IDs, meanings and existing controls | Frozen inventory, `tests/backup.test.cjs` and `tests/preservation.spec.cjs`; all six legacy 0–4 scores and original v1 bytes preserved | Technical pass; S02 final 72/72 |
| R0: v1 import and full v2 backups | `tests/storage.spec.cjs`, `tests/reviews.spec.cjs`, namespace unit checks; compatible extensions and historical refs retained; whole-state validation before confirmation/write | Technical pass; S02 final 72/72 |
| R0: transactional recovery | Request success followed by abort never publishes a candidate; quota/stale-tab/migration/corrupt/future snapshots preserve data and expose recovery | Technical pass; S02 final 72/72 |
| R0: static Pages subpath | `tests/pages.spec.cjs` verifies built JS/CSS at `/ciso-journey/`, strict asset paths, hashes/history/refresh, missing route 404; fresh S02 delivery verifies artifact/live parity and study/backup flow | Technical pass; local and live S02 evidence |
| R1: four substantial original lessons | Four lessons with eight objective-specific reading/example paths, prerequisites, misconceptions and practice; `tests/curriculum/foundation.test.mjs` prevents omissions | Structural floor met; educator quality review blocked |
| R1: 12 cards and 20 mixed-format questions | Exact inventory below; keyed MCQ option feedback, response-scoped rubrics and annotated constructed-response examples; question/card histories pin exact revisions | Structural floor met; educator quality review blocked |
| R1: retrieval and daily mobile flow | S01 deterministic FSRS + S02 Today; overdue carryover, bounded new introductions, explicit Again/Hard/Good/Easy, local date and UTC provenance | Technical pass; S02 final 72/72 |
| R1: one rubric-based executive exercise | One stable case with retained v1 and optional v2; six Recognize/Explain/Apply/Lead criteria, private evidence metadata, explicit self-assessment; `tests/cases.spec.cjs` | Technical pass; educator quality review blocked |
| R1: original lessons, questions, retrieval and case in one session | Exact version links and separate progress namespaces; synthetic whole-loop test retains all histories through reload/export/import | Technical pass; S02 final 72/72 |
| Source/review metadata and publication | Six official technical-text inspections with dates/locators/rights; all 74 editorial records draft, no independent human educator reviews | **Blocked for validated teaching release** |
| Imported HTML/URLs, keyboard/mobile | Literal text, credential-free HTTPS links and rejection before mutation; browser flows in preservation/lessons/questions/resources/cases/Today and namespace validators | Technical pass; S02 final 72/72 |
| Release notes and recovery | [Learner notes](FOUNDATION_RELEASE_NOTES.md), [storage recovery](F03_STORAGE_AND_RECOVERY.md), [build/rollback guide](F02_BUILD_AND_DEPLOY.md) | Authored; fresh G01 review pending |

## Exact authored inventory

Canonical `content/foundation.v1.json`: `foundation-2026-10-28.2`, C02 schema 1, curriculum `c01-2026-10-27.2`. **74 revisions represent 72 unique stable IDs**, not 74 distinct teaching items.

| Kind | Stable IDs | Revisions |
|---|---:|---:|
| Original lessons, w1–w4 | 4 | 4 |
| Concepts | 12 | 12 |
| Retrieval cards | 12 | 12 |
| Questions: 8 MCQ, 8 scenario, 4 open | 20 | 20 |
| Executive case | 1 | 2 |
| Rubrics: four weekly, twelve question-specific, one case | 17 | 18 |
| Official technical sources | 6 | 6 |
| Total | 72 | 74 |

Lesson IDs are `lesson-w1-foundations@1`, `lesson-w2-identity@1`, `lesson-w3-architecture@1`, `lesson-w4-data@1`. Their seven sections each contain approximately 969, 968, 1,009 and 1,059 body words respectively, plus worked examples and other teaching fields. Word counts show actual reading volume only. Four lessons cover all eight w1–w4 C01 objectives; this does not cover all 37 tasks or establish teaching quality. [The authoring guide](../curriculum/FOUNDATION_PILOT.md) records objective/artifact and question-rubric scope.

`scenario-foundation-decision@1` / `rubric-foundation-case@1` remain installed and exact lesson links stay pinned. A01 appended version 2 of those same stable IDs; it did not add a second independent case or replace assessed history. Future corrections must add revisions and preserve earlier assessed content, source refs, attempts and review events.

All 74 editorial records are **draft**, with **zero reviews** and **zero legal claims**. Both actors are AI authors. Six sources declare technical `authoritative-text` inspection by the AI foundation author on 2026-10-28, due 2027-10-28; this is distinct from human independent validation. The recorded texts are SP 800-12 Rev. 1, CSF 2.0 / CSWP 29, SP 800-63B-4, SP 800-207, SP 800-57 Part 1 Rev. 5 and SP 800-34 Rev. 1 (updated 2010). [Inspection locators, official links and limits](../curriculum/FOUNDATION_PILOT.md#source-inspection-rights-and-limits--2026-10-28) are author evidence, not a claim of new independent source checking by G01.

Independent educator review of the exact teaching revisions is outstanding. Qualified human legal review and verified applicability are required before legal material can be published; no such material/approval is supplied in this bundle. ISO requirements, Swiss/EU legal applicability, certification equivalence/readiness and actual competency are not validated. C01 framework expiry windows remain separate; these lessons do not renew them. Any substantive challenge or official update requires rechecking before validated publication.

## G01 documentation checks — 2026-10-28

On the S02 merged base above, Node 24.4.1 clean `npm ci` reported zero audit vulnerabilities; `npm test` passed **152/152** units plus generated-matrix consistency; `npm run typecheck`, `npm run build` and production-harness exclusion passed. C01 validation confirms 37 unchanged tasks, ten domains, six competencies, 49 objectives and acyclic prerequisites. The actual-bundle validator passes all 74 revisions as of 2026-10-28; `--previous` against C03 main `bbb2db6c30961364ca3c230995cef7a8be22c880` preserves its 72 records and original actor, and an explicit equality check preserves its 72 editorial records. Inventory/word counts above were recalculated from the canonical JSON. Relative Markdown targets/anchors in the three learner/gate documents and `git diff --check` pass.

Runtime, content, curriculum, scripts, all tests/fixtures, public assets, browser/build configuration, package/lockfile and CI remain byte-identical to the approved runtime candidate and merged base. G01 reuses the exact 72-case browser result under D020 and the separately recorded live delivery smoke; no browser/framework/dependency changes or extra CI work are introduced. The workflow path filter excludes these documentation-only changes, so a new workflow run may be absent. Fresh G01 review remains required; issue #15 stays open in In Review because actual human educator approval is still missing. No product decision changes or supersessions are introduced.

## Reproduce and deliver

Use Node 24.4.1+. Fast checks and content declarations:

```sh
npm ci
npm test
npm run typecheck
npm run build
node scripts/validate-curriculum.mjs
node scripts/validate-content.mjs content/foundation.v1.json --as-of 2026-10-28
git diff --check
```

Reserve port 4174 before local browser checks; do not reuse another worktree's server. Install Chromium once if needed, then `npm run test:browser -- --workers=2`. Check production-harness exclusion immediately after a clean production build; the browser command subsequently adds its local harness. CI runs unit/type/build only. D020 permits documentation-only evidence reuse only after app, content, tests/fixtures, browser/build configuration and dependency-lockfile equality has been recorded against the validated candidate.

Final G01 review must inspect the frozen documentation candidate and evidence independently. Record reviewer identity, candidate, coverage, checks, limitations and explicit verdict in #15/its PR. No self-approval. Do not move #15 to Done while its content gate remains unmet. Before any claimed validated release, obtain required educator/legal approvals, resolve challenges, preserve prior revisions, revalidate metadata/coverage and rerun appropriate exact-candidate release checks; record the actual Pages deployment and live smoke separately.
