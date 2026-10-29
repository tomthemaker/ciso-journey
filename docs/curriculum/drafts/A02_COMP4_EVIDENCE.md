# A02 comp-4 draft evidence — 2026-10-29

Task: [#76](https://github.com/tomthemaker/ciso-journey/issues/76), parent [#17](https://github.com/tomthemaker/ciso-journey/issues/17). Draft fragment: [a02-comp4.json](a02-comp4.json), `a02-comp4-draft-2026-10-29.1`; base `407c63e4ad5cd29d30fb9e19c9270976e2f81bf0`. No product decision changed or was superseded. Only these two draft documentation files are delivered; no app registration, runtime, schema, learner state or canonical content changes.

## Dependencies and acceptance coverage

- Exact baseline: `content/foundation.v1.json`, `foundation-2026-10-28.3`, 139 revisions; SHA-256 `dc82e76a1e6c3bfb7e103a2f495507c9f318959a19043e6b0a7c5fe55a542b0c`. No other draft dependency. Composition appends one AI actor and three version-1 records/editorial entries, yielding 142 revisions. All baseline records, actors and editorial entries remain equal; all new states are draft, with empty reviews/challenges/legal claims.
- Fragment SHA-256: `0426956de5f2cfbd4af9f2e172596df32240344ad69f03969e7d6d985806ff75`. IDs: `source-a02-comp4-assessment-method@1`, `scenario-a02-comp4-isms@1`, `rubric-a02-comp4-isms@1`. Actor: `ai-a02-comp4-author`, AI author/source inspector, never independent reviewer.
- C01 `c01-2026-10-27.2`: `p3a` / `obj-p3a-1` addresses fictional ISMS scope, dependencies and internal hierarchy; `p3c` / `obj-p3c-1` assesses three controls with separate design/operation findings, sampling and evidence limits; `p3e` / `obj-p3e-1` turns three mock findings into management decisions, actions and verification dates. No full p3b control-selection or p3d legal-applicability coverage is claimed; no new framework mapping is asserted.
- Original fictional R1–R3 and E01–E09 supply scope/authority, population and custodian-selected sample limits, a late supplier removal, a conflicting routine-change procedure, a conforming sampled emergency path, and missing September restore evidence. The prompt explicitly requests every Lead extension. The annotated response and four criteria assess only the submitted memo; each criterion uses 0 plus Recognize/Explain/Apply/Lead anchors, with defensible alternative plans allowed. No combined competency score is defined.

## Source inspection and rights

Inspected 2026-10-29: [official NIST SP 800-53A Rev. 5 PDF](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53Ar5.pdf), January 2022, Joint Task Force. Public web PDF text inspection succeeded (733 pages). Title/date and rights: PDF pages 2–3; assessment objects/methods and coverage: §§2.4.1–2.4.2, printed pp. 11–12 / PDF pages 22–23; findings and risk response: §§3.3–3.4, printed pp. 30–33 / PDF pages 41–44. [Official publication history](https://csrc.nist.gov/pubs/sp/800/53/a/r5/final) gives 2022-01-25 and announces supplemental Release 5.2.0 dated 2025-08-27. The case uses the inspected PDF methodology only; it does not claim to inspect or reproduce the updated procedure catalog. Local Python retrieval returned HTTP 403, so no local PDF byte/hash receipt is claimed.

The PDF authority page permits voluntary nongovernmental use and states no US copyright, requesting attribution. The case credits NIST and paraphrases only its method briefly; all organizational criteria, evidence, findings, alternatives and rubric text are original fiction. No ISO content is reproduced, no fictional requirement is attributed to NIST/ISO, and no worldwide rights, endorsement, actual legal applicability or certification conclusion is claimed. Source text inspection is separate from educator/legal review. Checked 2026-10-29; annual due date 2027-10-29, with immediate recheck on updates/challenges. All source/editorial records remain draft.

## Validation

Node 24.4.1. C02 fragment and composed-bundle checks pass as of 2026-10-29, including `--previous` 139-revision preservation and synthetic references to **all 142** composed revisions. Explicit checks passed for baseline actor/editorial equality, unique IDs, AI provenance/draft status, pinned source/rubric references, actual objective ownership, R1–R3/E01–E09 coverage and 0–4 anchors. C01 validation and generated matrix check pass. Existing targeted tests: 25/25 C02 plus 11/11 C01; `git diff --check` passes. These checks validate structure/declarations, not educational quality or factual identity.

Reproduce composition and historical-reference checks from the repository root (temporary files contain synthetic refs only):

```sh
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const b = read('content/foundation.v1.json');
const f = read('docs/curriculum/drafts/a02-comp4.json');
const c = { ...b, contentVersion: f.contentVersion };
for (const k of ['actors', 'records', 'editorial']) {
  c[k] = [...b[k], ...f[k]];
  assert.deepEqual(c[k].slice(0, b[k].length), b[k]);
}
assert.equal(b.records.length, 139); assert.equal(c.records.length, 142);
writeFileSync('/tmp/a02-comp4-composed.json', JSON.stringify(c));
writeFileSync('/tmp/a02-comp4-attempts.json', JSON.stringify(c.records.map((r, i) =>
  ({ id: `synthetic-a02-comp4-${i}`, contentRef: { id: r.id, version: r.version } }))));
JS
node scripts/validate-content.mjs docs/curriculum/drafts/a02-comp4.json --as-of 2026-10-29
node scripts/validate-content.mjs /tmp/a02-comp4-composed.json --previous content/foundation.v1.json --attempts /tmp/a02-comp4-attempts.json --as-of 2026-10-29
node scripts/validate-curriculum.mjs
node scripts/render-curriculum.mjs --check
node --test tests/curriculum/content.test.mjs tests/curriculum/validation.test.mjs
git diff --check
```

D020 reuse: `git diff c4ed3f7a82dd0a4231fa300c07ec84c3c41fff89 -- . ':(exclude)docs'` is empty. The only base-to-candidate additions are these two documentation files. App/canonical content/tests/fixtures/scripts/browser/build configuration/CI/package/lockfile remain equal to browser-tested `c4ed3f7a82dd0a4231fa300c07ec84c3c41fff89` and approved integrated PR #65 candidate `575d1db9182ddf2415acd0393dbdd6ea791e4d55`. Reuse its [163 unit/type/build and 16 local desktop/mobile preservation/Pages checks](https://github.com/tomthemaker/ciso-journey/pull/65#issuecomment-6482751805); no full app suite, type/build or browser rerun for this documentation-only fragment. All 37 task IDs, six legacy ratings, v1/v2 backups and separate learning signals are untouched.

## Remaining gates

The immutable draft PR and exact SHA, fresh independent task-review agent/verdict and required checks belong in the PR. No self-approval, merge, publication, human educator/legal review or learner readiness is claimed. Keep [#15](https://github.com/tomthemaker/ciso-journey/issues/15) publication and [#17](https://github.com/tomthemaker/ciso-journey/issues/17) quarterly assessment/portfolio integration open; this fragment adds neither runtime integration nor those gates' completion.
