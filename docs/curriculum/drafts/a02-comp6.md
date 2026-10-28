# A02 comp-6 draft: board measures and decision brief

Refs [#79](https://github.com/tomthemaker/ciso-journey/issues/79), parent [#17](https://github.com/tomthemaker/ciso-journey/issues/17). Version `a02-comp6-draft-2026-10-29.1`; base `407c63e4ad5cd29d30fb9e19c9270976e2f81bf0`. **No product decision changed or was superseded (2026-10-29).** D003/D008/D010/D016/D020/D022/D032 apply. Deliverable: immutable **unmerged draft PR**, requiring fresh exact-candidate Astra task review. Human publication gate [#15](https://github.com/tomthemaker/ciso-journey/issues/15) and quarterly assessment/portfolio integration #17 stay open.

[Fragment](a02-comp6.json): four new revisions (two official sources, one scenario, one rubric), one AI actor; all editorial states remain `draft`, with no reviews or legal claims. SHA-256: `23bd244ac7354a70011c14ba6763456bc2ddc36158dc07eb2fc405f13ffcd214`. Original fictional dispatch evidence, constraints, options, prompt and annotated response; the model has a 601-word board brief followed by the reproducible four-measure appendix. No lesson, app registration or learner-state change.

## Dependencies and assessment scope

Compose only the unchanged baseline `content/foundation.v1.json` at the base above (`foundation-2026-10-28.3`, 139 revisions/editorial entries, three actors; SHA-256 `dc82e76a1e6c3bfb7e103a2f495507c9f318959a19043e6b0a7c5fe55a542b0c`) and this fragment. C01 pin: `c01-2026-10-27.2`. There are no new lesson refs or sibling draft dependencies. The case supplies every required fact and definition; C01's planning prerequisites remain unchanged and no learner prerequisite completion is inferred. W11's approved teaching was inspected for consistency, not copied or imported; no W11 revision is required to resolve this case.

| Actual C01 objective | Prompt, worked response and rubric evidence |
|---|---|
| `obj-w11-1` | Four definitions with formula, populations, counts, UTC windows, sources, owners, cadence, justified local thresholds and accountable action; risk and control performance distinguished. `measures` criterion. |
| `obj-w11-2` | Common/new account cohort reconciliation; corrected patch denominator; failed/missed tests; missing feed-days and noncausal alert interpretation; uncertainty, decision and follow-up. `interpretation`/`decision`/`follow-up`. |
| `obj-p5d-1` | Four measures traced to access, patch, recovery and logging treatments; known coverage limits, exceptions and board request. `measures`/`interpretation`/`follow-up`. |
| `obj-p5e-1` | A/B/C tradeoffs, cash/capacity limits, separate opportunity cost, sensitivity, authority and explicit response to sales pressure. `decision`/`follow-up`. |

Four criteria each use scores 1–4 labelled Recognize/Explain/Apply/Lead; responses below Recognize need not receive a forced rating. Higher anchors describe only this response, not universal competency or readiness. Each Lead extension is explicitly requested and modeled: threshold rationale/acceptance, input-quality failure and missing evidence, worked sensitivity/reconsideration/correction escalation, and capacity/results fallback plus operational harm. Equivalent defensible alternatives can earn Lead; no keyed wording or preferred option requirement. No aggregate readiness percentage, independent learner appraisal or broader six-competency reassessment is supplied. Legacy self-ratings, resource/task completion, recall, question attempts and applied evidence remain separate.

## Official source inspection, 2026-10-29

[Vol.1 final history](https://csrc.nist.gov/pubs/sp/800/55/v1/final) and [Vol.2 final history](https://csrc.nist.gov/pubs/sp/800/55/v2/final) identify **2024-12-04 final**, December 2024 editions, superseding SP 800-55 Rev.1 (2008). The January 2024 drafts are superseded. Authors: Katherine Schroeder, Hung Trinh, Victoria Yan Pillitteri. The declared AI actor inspected official page/PDF text and successful `curl -L --fail` downloads; PDFs remain outside Git.

| Official PDF | Inspected locators; download receipt |
|---|---|
| [SP 800-55v1](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-55v1.pdf) | §§3.1.1–3.1.5, printed pp.12–16: documentation, reporting, management, quality and uncertainty; §3.2 pp.16–17: measure characteristics. 1,130,125 bytes; SHA-256 `29435d0db5af6dcb307e3de10e843c6eef474a0e7ae1e8993ab60af3cfc1bd04`. |
| [SP 800-55v2](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-55v2.pdf) | §2.4 pp.6–9: responsibilities; §2.6 pp.9–10: communication; §2.7.3 p.11: data management; §3 pp.12–22: implementation, collection/analysis, corrective action. 1,321,210 bytes; SHA-256 `a5d935325735e158ff5878c633069568cc2b1f1b629aa75963cae3b300362bc7`. |

These references support repeatable contextual measurement and accountable decisions. Case counts, thresholds, cost estimates and authority are invented, not NIST mandates. Sources retain `effectiveDate: null`, AI verification and annual review dates, with immediate recheck after official updates/challenges. Both PDFs' third-page Authority notices and [NIST rights policy](https://www.nist.gov/open/copyright-fair-use-and-licensing-statements-srd-data-software-and-technical-series-publications) were inspected. US employee-work treatment does not settle foreign/third-party rights. All teaching and case material is original; no reproduced passage/table/diagram, paid ISO requirement, course transcript or exam item. AI inspection/task review is not independent educator/legal approval or rights clearance.

## Validation and limits

Node 24.4.1. Reproduce composition outside Git:

```sh
node --input-type=module <<'JS'
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const read = p => JSON.parse(fs.readFileSync(p));
const b = read('content/foundation.v1.json');
const d = read('docs/curriculum/drafts/a02-comp6.json');
assert.equal(b.records.length,139);
const c = { ...b,contentVersion:d.contentVersion,
  ...Object.fromEntries(['actors','records','editorial'].map(k => [k,[...b[k],...d[k]]])) };
for (const k of ['actors','records','editorial']) assert.deepEqual(c[k].slice(0,b[k].length),b[k]);
assert(d.actors.every(a => a.kind === 'ai'));
assert(d.editorial.every(e => e.status === 'draft' && e.reviews.length === 0));
assert(d.records.every(r => r.legalClaims.length === 0));
assert.equal(createHash('sha256').update(fs.readFileSync('docs/curriculum/drafts/a02-comp6.json')).digest('hex'),
  '23bd244ac7354a70011c14ba6763456bc2ddc36158dc07eb2fc405f13ffcd214');
fs.writeFileSync('/private/tmp/a02-comp6-composed.json',JSON.stringify(c));
fs.writeFileSync('/private/tmp/a02-comp6-attempts.json',JSON.stringify(b.records.map((r,i) =>
  ({ id:`synthetic-baseline-${i}`,contentRef:{ id:r.id,version:r.version } }))));
JS
node scripts/validate-content.mjs /private/tmp/a02-comp6-composed.json \
  --previous content/foundation.v1.json --attempts /private/tmp/a02-comp6-attempts.json --as-of 2026-10-29
node --test tests/curriculum/content.test.mjs tests/curriculum/validation.test.mjs
git diff --check
```

**Pass:** 143-revision C02 composition with `--previous` and all 139 synthetic historical refs; exact baseline actors/records/editorial preserved; AI/draft/no-legal provenance, ID noncollision, exact rubric/source refs, all four C01 objectives, four anchored criteria, both PDF receipts and fragment hash checked. **36/36 targeted tests** (25 C02 + 11 C01). Arithmetic checks: access 20%→20%, common cohort 20%→17.1%, six newly found exposures/net four increase; corrected patch 80%→72% versus misleading 90%; recovery 75%→50%; feed-days 100%→75%; 20-day allocation and separate cost sensitivity. Manual scope review checked each top anchor against prompt and model. These checks cannot establish educational quality or authenticate human expertise.

Only these two new documentation artifacts differ from base. Protected paths are byte-identical to base, `c4ed3f7a82dd0a4231fa300c07ec84c3c41fff89` and `575d1db9182ddf2415acd0393dbdd6ea791e4d55`:

```sh
for candidate in 407c63e c4ed3f7 575d1db; do
  git diff --exit-code "$candidate" -- content curriculum src tests scripts \
    package.json package-lock.json tsconfig.json vite.config.ts playwright.config.cjs index.html .github
done
```

D020 reuses [PR #65 exact reviewed 575d1db evidence](https://github.com/tomthemaker/ciso-journey/pull/65#issuecomment-6482751805): 163 units, matrix/type/build/C02 and 16 local desktop/mobile preservation/Pages checks. Full app/type/build/browser suites were not rerun for this docs-only draft; browser installation/execution stays outside CI. All 37 task IDs, six legacy scores, original v1 bytes and v1/v2 backup/progress contracts are unchanged. Fresh final-candidate task approval remains separate from the outstanding human publication and #17 integration gates; no release, readiness, legal applicability or accreditation claim.
