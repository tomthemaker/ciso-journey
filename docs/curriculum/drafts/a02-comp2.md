# A02 comp-2 draft: risk register and treatment decision

Refs [#74](https://github.com/tomthemaker/ciso-journey/issues/74), parent [#17](https://github.com/tomthemaker/ciso-journey/issues/17). Version `a02-comp2-draft-2026-10-29.1`; base `407c63e4ad5cd29d30fb9e19c9270976e2f81bf0`. [Fragment](a02-comp2.json) SHA-256: `5bcb18e6356dd48c12b5ceaa173409d2156c4fd202bcb5cac3c6a624611a856b`.

Four new revisions: original Mosslight Forums case, six-criterion Recognize/Explain/Apply/Lead self-assessment rubric and two source records; one new AI actor. All new editorial entries remain **draft**, without reviews or legal claims. No product decision changed or was superseded (2026-10-29); D003/D008/D010/D016/D022/D032 apply. No app registration, state change, publication or readiness claim. Fresh exact-candidate Astra task review is required separately from the independent human educator/legal publication gate; #15 and quarterly assessment/portfolio integration #17 remain open.

## Dependencies and acceptance coverage

The fragment composes directly with the unchanged 139-revision `content/foundation.v1.json` (`foundation-2026-10-28.3`), pinning C01 `c01-2026-10-27.2`. **No external draft dependency.** Actual comp-2 is Cyber-risk management; only these two existing objectives are assessed:

| C01 objective | Case evidence |
|---|---|
| `obj-w10-1`: three entries separating likelihood, consequence, controls and uncertainty | R1 forged venue notice, R2 malware stopping admission, R3 accidental early draft release. E1–E5 supply fictional observations, estimates, constraints and authority. Each worked entry identifies event/window/population, business owner, evidence limits, conditional consequence, confidence, current/forecast exposure and review conditions. |
| `obj-w10-2`: compare accept/avoid/transfer/mitigate and recommend within delegation | R1 four-option comparison preserves population/window, business effects, resource feasibility and remaining exposure. Separate scheduling/CEO requests, action owners, shared-capacity deferrals, competing option, two possible evidence results and stop/escalate conditions. |

All six rubric criteria have four response-scoped anchors (scores 1–4). Lead extensions are explicitly requested in the prompt: interaction without double counting, control mechanism, two evidence outcomes, strongest alternative, allocation/deferred exposure and verification/stop condition. No extra policy or enterprise aggregation is graded. Justified alternatives can satisfy the rubric; no total or pass threshold. No questions, lessons, cards, mappings or learner prerequisites are added.

A01 supplies the response-scoped anchor/provenance precedent. Approved Week 10 draft `b2eac05a494617d095159956af9bc909f37bf802` (fragment hash `cf7b3606d3892478eec80ad46399ce64bdc4908064c1ad8e69bcfe56dfc0d267`) informed source selection only; no records or scenario are reused. Its Harbor Dispatch supplier/import/export case is not a dependency. Mosslight's observations, resource conflict, choices, worked response and descriptors are original. No employer, learner, credential, backup, paid course, licensed ISO or exam material is included.

## Official sources inspected, 2026-10-29

| Final edition and official metadata | Scoped text inspection and PDF receipt |
|---|---|
| [NIST IR 8286A Rev. 1](https://csrc.nist.gov/pubs/ir/8286/a/r1/final), final 2025-12-18; February 2025 item is a draft | §§2.1.1–2.1.2 pp. 13–16, 2.2.4–2.2.5 pp. 41–44, 2.3.1–2.3.2 pp. 47–50: context, factors, evidence and estimate limits. [Exact PDF](https://nvlpubs.nist.gov/nistpubs/ir/2025/NIST.IR.8286Ar1.pdf), 3,209,917 bytes; SHA-256 `8701ddb49e2a60fb9a1d7131ff0333706507644137b8a0f1b2a320921ef8ad40`. |
| [NIST IR 8286B-upd1](https://csrc.nist.gov/pubs/ir/8286/b/upd1/final), updated final 2025-02-26, supersedes February 2022 | §§2.3.1–2.3.6 pp. 21–29, 2.4.2–2.4.4 pp. 32–34: responses, strategy, delayed action, ownership/status. [Exact PDF](https://nvlpubs.nist.gov/nistpubs/ir/2025/NIST.IR.8286B-upd1.pdf), 1,998,246 bytes; SHA-256 `28ad23fe12632b1de11f5fe366032466819ff467a3a396503e52cafcedb95aa9`. |

The declared AI actor independently inspected official landing histories and the scoped text of the exact downloaded PDFs (reusing Week 10's matching download bytes). Source records retain annual review dates and bounded verification scope. Recheck on an official update, substantive challenge or broken link; metadata/link inspection does not establish every teaching claim.

The [NIST rights notice](https://www.nist.gov/open/copyright-fair-use-and-licensing-statements-srd-data-software-and-technical-series-publications) was inspected for employee, foreign and third-party rights distinctions. There are no copied tables, diagrams or substantial quotations. Technical guidance informs methods; exercise governance is fictional, with no actual legal applicability, insurance purchase or financial advice. Source inspection is not blanket rights clearance or educator/legal approval.

## Validation

Node 24.4.1. Reproduce in this worktree; temporary files contain synthetic content references only:

```sh
export PATH=/Users/tom/.nvm/versions/node/v24.4.1/bin:$PATH
node --input-type=module <<'JS'
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { validateContent } from './scripts/validate-content.mjs';
const read = p => JSON.parse(fs.readFileSync(p));
const b = read('content/foundation.v1.json');
const d = read('docs/curriculum/drafts/a02-comp2.json');
const c = { ...b, contentVersion:d.contentVersion,
  ...Object.fromEntries(['actors','records','editorial'].map(k => [k,[...b[k],...d[k]]])) };
assert.equal(b.records.length,139);
assert.equal(d.records.length,4);
assert.equal(d.curriculumVersion,b.curriculumVersion);
for (const k of ['actors','records','editorial'])
  assert.deepEqual(c[k].slice(0,b[k].length),b[k]);
assert.equal(new Set(c.actors.map(a=>a.id)).size,c.actors.length);
assert.ok(d.actors.every(a=>a.kind==='ai'));
assert.ok(d.records.every(r=>r.version===1 && r.supersedes===null &&
  r.legalClaims.length===0 && !b.records.some(o=>o.id===r.id)));
assert.ok(d.editorial.every(e=>e.status==='draft' && !e.reviews.length &&
  !e.unresolvedChallenges.length));
const attempts=b.records.map((r,i)=>({id:`synthetic-${i}`,
  contentRef:{id:r.id,version:r.version}}));
assert.deepEqual(validateContent(c,{previous:b,attempts,asOf:'2026-10-29'}),[]);
fs.writeFileSync('/private/tmp/a02-comp2-composed.json',JSON.stringify(c));
fs.writeFileSync('/private/tmp/a02-comp2-attempts.json',JSON.stringify(attempts));
JS
node scripts/validate-content.mjs /private/tmp/a02-comp2-composed.json \
  --previous content/foundation.v1.json --attempts /private/tmp/a02-comp2-attempts.json --as-of 2026-10-29
git diff --exit-code 407c63e4ad5cd29d30fb9e19c9270976e2f81bf0 -- src content curriculum tests scripts package.json package-lock.json vite.config.ts playwright.config.ts index.html .github
git diff --exit-code c4ed3f7a82dd0a4231fa300c07ec84c3c41fff89 -- src content curriculum tests scripts package.json package-lock.json vite.config.ts playwright.config.ts index.html .github
git diff --check
shasum -a 256 docs/curriculum/drafts/a02-comp2.json
```

**Pass:** C02 CLI and API, 143 composed revisions against 139 previous revisions and all 139 synthetic historical references; deep baseline actor/record/editorial equality; new-only IDs/AI/draft provenance; exact source/objective/rubric references; source-date/format/rights declarations; six four-anchor criteria; no question/rubric scope mismatch; whitespace. Manual author checks covered each requested field, all four response mechanisms and the worked response against the six criteria. These checks do not independently establish educational quality.

Only the two draft documents differ from base. Protected app, canonical curriculum/content, tests/fixtures, scripts, configuration, CI and package/lockfiles are byte-identical to base and browser-tested `c4ed3f7a82dd0a4231fa300c07ec84c3c41fff89`. D020 permits reuse of [PR #65's 163-unit/matrix/type/build and 16 local desktop/mobile preservation/Pages checks](https://github.com/tomthemaker/ciso-journey/pull/65), including its final `575d1db9182ddf2415acd0393dbdd6ea791e4d55` fast-check evidence. Those suites were not rerun for this documentation-only fragment. All 37 task IDs, six legacy scores, v1/v2 backup compatibility and separate progress meanings remain unchanged. Final immutable candidate and fresh reviewer verdict belong in the draft PR.
