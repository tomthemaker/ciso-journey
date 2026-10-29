# A02 comp-3 draft: governance authority and exceptions

Refs [#75](https://github.com/tomthemaker/ciso-journey/issues/75), parent [#17](https://github.com/tomthemaker/ciso-journey/issues/17). Version `a02-comp3-draft-2026-10-29.1`; base `407c63e4ad5cd29d30fb9e19c9270976e2f81bf0`. **Unmerged AI draft**, awaiting fresh exact-candidate Astra task review. No product decision changed or was superseded (2026-10-29): this applies D008/D016/D022/D032 within the existing contract. Human publication gate #15 and #17's quarterly assessment/portfolio integration remain open; no educator/legal approval, readiness or accreditation is claimed.

[Fragment](a02-comp3.json) SHA-256: `9d5425e8dfb6b9e9bcc57afc240837fa74066017c916c6994b31ab5873d77f66`. Three new revisions: one source, one scenario, one response-scoped rubric; one new AI actor; all three editorial entries `draft`, zero reviews/legal claims. It composes directly with unchanged `content/foundation.v1.json` (139 revisions). **No draft dependencies**, content registration, app/schema/state change, new framework or mapping. The approved w9 candidate `505aa71cfd0d8073392a9766de30f6730f8f0745` was authoring context only; none of its records or teaching is required to attempt this self-contained case.

| Actual C01 objective | Requested and modeled evidence |
|---|---|
| `obj-w9-1` — charter assigning policy approval, risk acceptance, incident escalation and assurance, separating oversight/execution | E1 supplies authority; prompt item 1 and annotated charter assign all four types. G1 applies bounded COO acceptance, CIO control ownership, CISO advice/incident role and committee escalation; audit remains separate. |
| `obj-w9-2` — two stakeholder conflicts resolved under the charter, with authority, stakeholders and ethical escalation | G1 resolves Sales/CIO access requests with three alternatives and a pending exception log. G2 resolves executive/audit reporting requests under a separate reporting duty, with truthful status, confidential obstruction route and receipt check. |

Both objectives belong to actual task `w9`, whose C01 competency is `comp-3`. No broader competency or full advanced-objective coverage is asserted. Manual scope check: all four rubric criteria assess only prompt items 1–3; each Lead extension is explicitly requested and modeled. The example distinguishes recommendation from approval, names evidence gaps and change-of-decision conditions, and provides bounded review/expiry/removal/fallback. Justified refusal, deferral and variants can receive equal credit. Recognize/Explain/Apply/Lead are response anchors; zero means absent evidence. These scores do not replace legacy self-ratings or merge completion, recall, attempts and applied assessment.

The company, charter, records, estimates, limits and timing are original fiction. A CISO title does not confer general risk acceptance. Internal exceptions cannot waive external obligations. No actual sector/canton, legal applicability or legal requirement is inferred. No learner or employer evidence is included or requested.

Official-source inspection by the declared AI actor on **2026-10-29**:

- [NIST CSWP 29, CSF 2.0, 2024-02-26](https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf): title/date, sections 1–2 and Appendix A printed pp. 16–17, GV.RM-02/04/05, GV.RR-01/02, GV.PO-01/02 and GV.OV-01/03. Supports risk boundaries, roles, policy and oversight. The source describes outcomes; the case's corporate authority, thresholds and exception process are author adaptations. HTTP 200, 1,518,858 bytes; SHA-256 `3c31f46fee98cac0c4323453e5109291a213b4de7fef8c058af9bf67f717433c`. Full PDF downloaded; relevant text inspected through official web extraction.
- [Official CSF landing page](https://www.nist.gov/cyberframework) still identifies CSF 2.0 as the current framework. This is a check of the cited version, not a claim that supplementary guidance never changes.
- [NIST Technical Series rights notice](https://www.nist.gov/open/copyright-fair-use-and-licensing-statements-srd-data-software-and-technical-series-publications), Technical Series Publications paragraph: inspected US employee-work treatment, foreign rights/reprint terms and third-party exceptions. Original explanations and fiction only; no reproduced source passage/table/diagram, paid ISO requirements, exam items or course text. AI source inspection is separate from rights clearance and human approval. Source metadata sets annual review plus immediate recheck after official updates, credible challenges or broken links.

Validation on Node **24.4.1** (temporary composition and synthetic refs outside Git):

```sh
node --input-type=module <<'JS'
import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(p));
const b=read('content/foundation.v1.json'), d=read('docs/curriculum/drafts/a02-comp3.json');
assert.equal(b.records.length,139);
const c={...b,contentVersion:d.contentVersion,
  ...Object.fromEntries(['actors','records','editorial'].map(k=>[k,[...b[k],...d[k]]]))};
for(const k of ['actors','records','editorial']) assert.deepEqual(c[k].slice(0,b[k].length),b[k]);
fs.writeFileSync('/private/tmp/a02-comp3-composed.json',JSON.stringify(c));
fs.writeFileSync('/private/tmp/a02-comp3-attempts.json',JSON.stringify(b.records.map((r,i)=>
  ({id:`synthetic-${i}`,contentRef:{id:r.id,version:r.version}}))));
JS
node scripts/validate-content.mjs /private/tmp/a02-comp3-composed.json \
  --previous content/foundation.v1.json --attempts /private/tmp/a02-comp3-attempts.json --as-of 2026-10-29
node --experimental-strip-types --test tests/curriculum/content.test.mjs tests/curriculum/validation.test.mjs
node scripts/validate-curriculum.mjs
node scripts/render-curriculum.mjs --check
git diff --check
```

**Pass:** 142-revision C02 composition with all 139 synthetic historical refs; baseline actor/record/editorial deep equality; all 25 C02 and 11 C01 tests; standalone C01 and generated coverage checks. Additional temporary assertions passed ID noncollision, exact objective/task ownership, new-only AI/draft provenance, source edition/dates and four named anchors per criterion. Structural checks do not establish instructional correctness or authenticate expertise.

Only these two new docs artifacts differ from base. App, canonical content/curriculum, tests/fixtures, scripts, CI, browser/build configuration, package and lockfiles are byte-identical to base and PR #65 reviewed candidate `575d1db9182ddf2415acd0393dbdd6ea791e4d55` / implementation `c4ed3f7a82dd0a4231fa300c07ec84c3c41fff89` (`git diff --exit-code <SHA> -- content curriculum src tests scripts package.json package-lock.json vite.config.ts playwright.config.ts index.html .github`). Under D020, reuse [163-unit/type/build and 16 local preservation/Pages checks](https://github.com/tomthemaker/ciso-journey/pull/65#issuecomment-6482751805), including all 37 task IDs, six legacy scores, v1 bytes/backups and `/ciso-journey/` refresh/assets. No runtime, backup or learner-state behavior changes; v1/v2 compatibility remains intact. Full app/browser reruns are unnecessary for this draft-only diff. Fresh task review remains distinct from educator/legal publication gates.
