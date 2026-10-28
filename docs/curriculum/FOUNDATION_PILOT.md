# Foundation pilot authoring and review guide

Refs [C03 / #9](https://github.com/tomthemaker/ciso-journey/issues/9). Canonical bundle: [foundation.v1.json](../../content/foundation.v1.json), `foundation-2026-10-28.1`, C02 schema 1 / C01 `c01-2026-10-27.2`. This is original AI-authored draft teaching; no independent educator or legal approval exists. Agent task review is separate from those publication gates. It is suitable for transparent provisional study, not validated publication, certification readiness or legal advice.

## Coverage and use

Each lesson contains explanatory reading and a separate worked executive example for **each** C01 objective, misconceptions and artifact practice. Every week has three concept/card pairs, two MCQs, two scenario questions and one open question. All options have explanations; open/scenario questions use anchored self-assessment rubrics and annotated examples, not text matching. Estimated 45 minutes includes reading, drawing/writing and revising practice; it is an author estimate, not a measured learner result.

| Task / lesson ID (all @1) | Objectives | Original practice artifact | Source IDs (all @1) |
|---|---|---|---|
| w1 / lesson-w1-foundations | obj-w1-1, obj-w1-2 | Six classifications/CIA reasoning; two causal risk chains | source-security-principles, source-csf |
| w2 / lesson-w2-identity | obj-w2-1, obj-w2-2 | Joiner/mover/leaver trace; user/admin/service IAM diagram | source-csf, source-authentication |
| w3 / lesson-w3-architecture | obj-w3-1, obj-w3-2 | Two service flows, boundaries and enforcement; flat/segmented comparison | source-csf, source-zero-trust |
| w4 / lesson-w4-data | obj-w4-1, obj-w4-2 | Classified-data assessment; timed restore plan and two measurements | source-csf, source-key-management, source-recovery |

Stable questions are `question-wN-1` through `-5`; cards `card-wN-1` through `-3`; practice rubrics `rubric-wN`. `scenario-foundation-decision@1` and `rubric-foundation-case@1` combine all eight objectives in one fictional executive case. Criteria have 0/1/2 descriptive anchors, not a pass score or a claim of independent competence. Read the question, attempt an answer, consult feedback, then revise the artifact; an annotated example is one defensible response, not a sole keyed open answer.

The reading is self-contained. Each lesson has an optional LinkedIn Learning **search link**, explicitly described as unverified catalogue discovery, with no promised title, availability, copied transcript or automated completion. The 12 cards are curated retrieval prompts; their recall is distinct from practice quality. This increment adds no scheduler, question-attempt storage, applied-assessment storage or completion inference. Legacy tasks/scores and v1/v2 backups are untouched. L01 separately integrates the reader with the exact bundle.

## Source inspection, rights and limits — 2026-10-28

The AI author retrieved official publication entries and the following technical texts using the browser. Each source record pins its URL/edition, checked/due dates, verifier, locators, scope and rights. `authoritative-text` means the cited technical text was inspected; every source **editorial status remains draft** and reviews are empty. It does not mean a human has independently verified teaching or legal applicability. Known publication dates use full dates only where established; 800-63B-4 is recorded as July 2025 in the edition and its unknown exact publication day remains null.

| Official text | Inspected teaching locators / limits |
|---|---|
| [SP 800-12 Rev. 1](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-12r1.pdf) | §1.4 terminology, ch. 3 roles, ch. 6 risk; older stable vocabulary reference, not current deployment configuration. |
| [CSF 2.0 / CSWP 29](https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) | §1 and Appendix A ID.AM/ID.RA/PR.AA/PR.DS/PR.PS/PR.IR/RC.RP. Outcomes support themes, not mandatory implementations or framework equivalence. |
| [SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html) | Introduction, §2, §3.2.5 phishing resistance, §4 authenticator events, §5 sessions. [Final entry](https://csrc.nist.gov/pubs/sp/800/63/b/4/final) confirms July 2025 and supersession. Human remote-authentication scope; no workload/AAL conformance claim. |
| [SP 800-207](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-207.pdf) | §2.1 tenets, §3 decision/enforcement components, §3.1.2 microsegmentation, §5 failure threats. Abstract architecture, not a vendor configuration. |
| [SP 800-57 Part 1 Rev. 5](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-57pt1r5.pdf) | §3 security services, §4 algorithms, §8 lifecycle functions; introductory purpose/custody only, no algorithm/cryptoperiod prescription. |
| [SP 800-34 Rev. 1, updated 2010](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-34r1.pdf) | §3.2.1 RTO/RPO, §3.4 strategies, §3.6 exercises, glossary; [updated final entry](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final). Stable recovery concepts, not current platform/regulatory requirements. |

All explanations, fictional business facts, diagrams requested of learners, distractors, examples and rubrics are original. No source figures, tables, assessment items, course transcripts, ISO requirements or quotations are reproduced. NIST source attribution is retained; third-party material notices need separate inspection before future reproduction. Sources do not endorse the invented decisions. A reviewer must check technical accuracy, ambiguity, distractor plausibility, teaching adequacy and copyright; schema checks cannot do this.

Stable-fundamental source checks are due 2027-10-28, with immediate recheck on an official update, credible claim challenge or link issue. Time-sensitive additions need a 90-day cadence under C02. No legal claims or certification mappings are added. Existing C01 mapping expiry windows remain unchanged; these readings do not validate them. Any unresolved substantive source concern must be recorded in editorial challenges and prevents a current validated status. Legal additions require authoritative text/applicability work and qualified human legal approval; neither is available or asserted here.

## Maintenance and validation

Edit the canonical JSON directly. Keep delivered revisions append-only under C02; corrections add a new version, preserve the old payload and explain effects on attempts/schedules. Source changes require versioned source/dependent revisions and renewed review. The task-local generation aid is not an implementation dependency and is not committed.

On Node 24.4.1:

```sh
npm ci
npm test
npm run typecheck
npm run build
node scripts/validate-content.mjs content/foundation.v1.json --as-of 2026-10-28
npm run test:browser -- --workers=2
```

`tests/curriculum/foundation.test.mjs` validates the actual bundle in `npm test`, checks all eight objective/example/practice paths, weekly question/card coverage, anchored feedback, case criteria and source-gate regressions. These guards prevent omissions; counts, headings and passing tests are not independent pedagogical validation. `content/**` triggers fast CI unit/type/build checks. Browsers stay local under D020. The PR records exact candidate and results; independent task review is required before delivery, while educator approval remains an open publication limit.
