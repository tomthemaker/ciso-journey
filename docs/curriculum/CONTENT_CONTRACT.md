# C02 content and editorial contract

Refs [C02 / #7](https://github.com/tomthemaker/ciso-journey/issues/7). This is an authoring contract, not a content release or storage migration. [Synthetic bundle](../../content/c02.example.v1.json) demonstrates eight record kinds and all three question formats. Every checked-in example is AI-authored **draft**; there is no educator/legal approval. Synthetic human reviews exist only in unit tests and are never publication evidence.

## Validate

Use Node 24.4.1+, `npm test` (includes content checks), `npm run typecheck`, `npm run build` and:

```sh
node scripts/validate-content.mjs
node scripts/validate-content.mjs path/to/bundle.json --as-of 2026-10-28
node scripts/validate-content.mjs corrected.json --previous delivered.json --attempts synthetic-attempts.json
```

The dependency-free [validator](../../scripts/validate-content.mjs) exports `validateContent(bundle, { curriculum, previous, attempts, asOf })`, `effectiveStatus(bundle, record, asOf)` and the six `publicationStates`. Validation returns diagnostics; the CLI exits nonzero on invalid input. `effectiveStatus` is for a structurally valid bundle. Dates use real `YYYY-MM-DD` calendar dates, checked at UTC date boundaries; `asOf` defaults to today. URL checks verify scheme/primary publisher scope, not link availability or truth. Run an actual source check separately.

## Records and relationships

`schemaVersion: 1` identifies this contract; `contentVersion` names the bundle release and `curriculumVersion` pins the C01 objective/framework snapshot. Unknown fields fail validation. Changing the shape requires a deliberate schema change. C01's 37 tasks, six legacy scores and draft objectives remain unchanged. Objective IDs resolve through that exact curriculum version; each must belong to a declared task.

A revision has `id` (stable lowercase slug), positive integer `version`, `kind`, `title`, `authorIds`, `authoredAt`, `taskIds`, `objectiveIds`, exact `sourceRefs`, `legalClaims`, `supersedes`, `changeNote`, `priorAttemptImpact`, `scheduleImpact` and `payload`. A reference is always `{ "id": "concept-control", "version": 2 }`; references never silently select “latest”. IDs share one namespace across kinds. Actors record stable identity, `kind: human|ai` and role. Use public contributor identifiers; never learner/employer information.

| Kind | Payload requirements |
|---|---|
| `lesson` | Original sections (`heading`, `body`), prerequisite lesson refs, minutes, worked example, misconceptions, concept refs and question/scenario practice refs. Lesson prerequisites are acyclic. |
| `concept` | Original definition and misconception. |
| `question` | `format: mcq|scenario|open`, prompt, difficulty. MCQs have unique option IDs, text and explanation for **every** option plus one correct option ID. Open/scenario answers have no keyed text/options; they reference a rubric and annotated example. Unused answer fields are explicitly null/empty. |
| `card` | Retrieval prompt, answer and exact concept ref; card use does not imply applied competence. |
| `scenario` | Fictional brief, requested deliverable, constraints, rubric ref and annotated example. |
| `rubric` | Criteria with ID/description and at least two distinct nonnegative score anchors with descriptors; explicit `assessmentProvenance: self-assessment|rubric-assessment|independent-review`. This describes the assessment method, not a completed learner assessment. |
| `source` | Publisher, HTTPS URL, edition, jurisdiction, publication/effective dates (null if unknown), checked/due dates, verification/evidence/verifier, source kind, copyright constraints and optional C01 source ID. Sources have no source refs. |
| `mapping` | C01 framework version/target IDs, exact C01 validity window, rationale and limitation. ISO remains overview themes only. CISM ends exclusively 2026-11-03; CISSP ends exclusively 2027-04-15. Replacement mappings require a new reviewed C01 snapshot. |

Non-source revisions require objectives, tasks and sources. Current source domains deliberately match C01 official authorities; another publisher needs a reviewed validator change. Legal sources currently support Fedlex/EUR-Lex. A source being official or reachable does not prove that its text or a teaching claim was checked.

## Editorial gate

`editorial` contains one record per exact revision: `ref`, `status`, `reviews`, `unresolvedChallenges`. Keep it separate from immutable authored revisions. Reviews record reviewer ID, `role: educator|legal`, date, evidence and `verdict: approve|changes-requested`, bound to the exact revision. The validator checks declared evidence and independence; it cannot authenticate a person, judge qualifications, inspect the evidence or assess pedagogy. The editor must verify those facts. An agent code review is not an independent educator/legal review.

| Stored state | Meaning / enforced gate |
|---|---|
| `draft` | Provisional work; metadata-only/unverified sources allowed. No claim of independent validation. |
| `source-checked` | Referenced source text checked with recorded evidence; no unresolved substantive challenge or Changes requested review; content current. No educator approval implied. |
| `independently-reviewed` | Source gate plus a separate human educator approval, not an author or AI actor. Legal material also needs a separate qualified human legal approval. |
| `published` | Independent gate plus every source/concept/practice/prerequisite/rubric dependency currently published. This is eligibility only; C02 publishes no teaching. |
| `stale` | Review overdue, official update/mapping expiry or substantive challenge. Preserve history; block current validated publication until resolved. |
| `retired` | Withdrawn from new study. Keep exact revisions addressable for prior attempts. |

Review due dates are exclusive: `reviewDueAt <= asOf` means stale. `effectiveStatus` propagates stale/retired dependencies and exclusive framework boundaries; it leaves draft visibly draft. For every current citing state, source expiry, unresolved substantive challenges and Changes requested reviews make the dependent stale even when the cited source remains draft. A stored current state whose effective state is stale fails validation. Editors must mark event-triggered source challenges stale promptly; dates cannot discover an official change automatically. New versioned teaching cannot reuse old review approvals.

Each legal claim declares `statement`, `jurisdiction`, `sector`, `applicability`, `effectiveAt`, `sourceRef` and `locator` (article/paragraph/version). From source-checked onward it requires cited `authoritative-law` text verification by a human, at an official legal-text URL; a generic country label or overview cannot qualify. Independent/published status additionally needs qualified legal approval. FADP/GDPR/NIS2/DORA/AI Act C01 texts remain unverified: upgrading an inherited unverified source requires a later human verification with new evidence. No such upgrade is supplied here. Editors must check consolidation, territorial/sector scope, national implementation, effective dates and exceptions before approving an actual legal claim.

## Corrections, copyright and cadence

All delivered revisions are append-only. For a correction, retain the previous record, add the same ID with the next integer version, point `supersedes` at its predecessor and explain the change plus impact on prior attempts and schedules. A new revision starts draft. Attempts use `{ id, contentRef: { id, version } }` for contract checks; real attempt storage remains separate F03/question work. Never retarget an old attempt, erase its shown version, infer mastery, reset a schedule or reinterpret a legacy completion/score during correction. Consumers must persist original refs and decide any reassessment separately.

Pass the prior delivered bundle and existing attempt refs to the validator before accepting a correction. It rejects changed/removed prior revisions, changed actor provenance, missing predecessor versions and dangling attempts. The CLI cannot discover an omitted historical bundle/attempt set; retain the delivery snapshot privately where it contains learner data. The checked-in two-version concept is a synthetic history example, not a migrated learner record.

Review law and time-sensitive teaching at most every 90 days; stable fundamentals annually (validator permits up to 366 days). Legal source cadence is enforced automatically; editors must apply the 90-day rule to other time-sensitive sources too. Recheck immediately after an official update, credible source challenge, correction, announced exam transition or broken link. A broken link is a maintenance issue; a substantive claim challenge blocks validated publication. Do not extend a due date without a documented new source check; source metadata changes create a new source revision, followed by updated dependent revisions and reviews.

Write original explanations, examples, distractors and rubrics. Record source edition, precise locator and rights before quoting. Do not copy paid ISO requirements, exam items/dumps, course transcripts or licensed diagrams. Linking/subject alignment does not grant reproduction rights. Keep permitted quotations minimal with attribution; obtain permission where necessary. Source verification is separate from copyright clearance.

## Authoring/review checklist

- [ ] Select existing task/objective IDs and C01 version; teach an observable objective through original reading, worked example, misconception, practice and retrieval.
- [ ] Use stable IDs and pinned refs; record author identity/role/date, edition, jurisdiction, source check evidence and rights. Unknown dates remain null.
- [ ] Check authoritative text and claim locators, applicability and validity windows; keep unverified claims draft. Set annual/90-day review deadlines and record event-triggered challenges.
- [ ] Check all distractor explanations, plausible alternatives, anchored rubrics and annotated open responses; keep resource/task completion, recall, attempts and applied assessment separate.
- [ ] Run contract checks and the existing unit/type/build checks. For corrections pass the prior delivery and synthetic/private attempt refs; preserve every old version and record attempt/schedule impact.
- [ ] Obtain actual independent educator approval and, for legal material, qualified jurisdiction-specific legal approval with exact-version evidence. Reviewers inspect source correctness, pedagogy, ambiguity, copyright and misleading mastery/certification claims.
- [ ] Publish only after dependencies meet the gate and no substantive challenge remains; record the candidate and checks in the linked PR. An unavailable reviewer leaves content provisional. Follow AGENTS.md for separate task implementation review.

No UI, learner storage, resource progress, v1 backup format or scheduler changes are included.
