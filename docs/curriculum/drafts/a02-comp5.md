# A02 comp-5 draft manifest — 2026-10-29

Refs [#78](https://github.com/tomthemaker/ciso-journey/issues/78), parent [#17](https://github.com/tomthemaker/ciso-journey/issues/17), publication gate [#15](https://github.com/tomthemaker/ciso-journey/issues/15). Deliverable: [original fictional tabletop fragment](a02-comp5.json), `a02-comp5-draft-2026-10-29.1`, for an immutable **unmerged draft PR** and separate fresh task review. No product decision changed or was superseded. No app registration, runtime/schema/state/canonical-content change or real learner/employer evidence.

## Exact inventory and dependencies

Four new version-1 records: `source-a02-comp5-incident-response`, `source-a02-comp5-event-recovery`, `scenario-a02-comp5-operations`, `rubric-a02-comp5-operations`. One new AI actor: `ai-a02-comp5-author`. All four editorial entries remain `draft`, with no reviews/challenges or legal claims. Technical source inspection and later agent delivery review do not provide independent educator/legal approval.

Compose only with the unchanged 139-revision `content/foundation.v1.json` at base `407c63e4ad5cd29d30fb9e19c9270976e2f81bf0`; no other draft dependency. The inherited `source-recovery@1` supports stable RTO/RPO concepts. All source/rubric refs are exact; no latest-version lookup, new framework mapping or certification alignment claim. The fragment alone intentionally lacks that inherited source and is validated after composition, never registered with the app.

| Actual C01 objective | Requested evidence / rubric coverage |
| --- | --- |
| `obj-p4c-1` / `p4c` | Three timed ransomware decisions, credible alternatives, operational/communication tradeoffs and unresolved qualified legal/privacy questions; decisions and communication criteria. |
| `obj-p4d-1` / `p4d` | Rank three critical services using impact, distinct RTO/RPO targets, supplier dependencies and one acceptance test per service; recovery and measurement criteria. |
| `obj-p4e-1` / `p4e` | Solo or group fictional tabletop record, assumptions/observations, after-action actions with owner/deadline/retest evidence; decisions and improvement criteria. |

Pinned C01: `c01-2026-10-27.2`. This covers the three stated case objectives within a bounded response; it does not claim complete comp-5 or `obj-p4b-1` coverage (that objective requires three incident classifications). The five rubric criteria each anchor 0 plus Recognize/Explain/Apply/Lead. They assess only the requested response, accept justified alternatives and imply no total/pass/readiness/global competency score. E6 is supplied synthetic comparison evidence, not an executed test or a prediction of the learner's plan. Resource/task completion, recall, question attempts and applied assessment remain separate; the original 37 IDs, six legacy ratings and v1/full-v2 compatibility are unchanged.

## Primary source inspection and rights

On 2026-10-29 the AI author inspected the official publication entries and PDF text: [SP 800-61 Rev. 3 final](https://csrc.nist.gov/pubs/sp/800/61/r3/final), final history date 2025-04-03, [48-page PDF](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r3.pdf), sections 2.1–2.3, Table 2 GV.RR-02, Table 3 RS.MA-02–05, RS.AN-06/07, RS.CO-02/03 and RC.RP-01–06; and [SP 800-184 final](https://csrc.nist.gov/pubs/sp/800/184/final), final history date 2016-12-22, [53-page PDF](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-184.pdf), sections 2.1/2.3/2.4/3.1/3.2. New source records retain these versions/locators, checked/due dates, AI verifier and rights limitations. Recheck by 2027-01-27 and immediately on a substantive source challenge or official update. No PDF download/hash receipt or qualified human verification is claimed.

Rev. 3 provides the current CSF 2.0 incident framing. Rev. 2's former phase model is not taught as a current requirement. SP 800-184 is used only for stable dependency/recovery-test principles; its historical CSF labels and Rev. 2 references are not promoted. Source text checks are separate from editorial publication. This original case/rubric reproduces no source prose, figures, paid material or exam items; rights statements are scoped to this authored material, with no endorsement/reproduction license claim. No actual legal deadline or applicability conclusion is made.

## Validation evidence and reproduction

Node 24.4.1, 2026-10-29: 25 C02 + 11 C01 tests pass; curriculum validator and generated-matrix consistency pass. Composed C02 API and CLI pass for all 143 revisions with `--previous` and **all 139 synthetic historical refs**. Explicit equality checks preserve every baseline record, actor and editorial entry. New-ID collision/version-1/provenance/draft/legal-empty checks, primary-host/source-version/date/cadence/rights metadata checks, exact C01 ownership/comp-5 membership, exact rubric reference and five 0–4 anchored criteria pass. These check declarations and relationships, not educational validity or qualifications.

From repository root, compose and reproduce core checks (temporary files contain synthetic refs only):

```sh
export PATH=/Users/tom/.nvm/versions/node/v24.4.1/bin:$PATH
node --input-type=module <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { validateContent } from './scripts/validate-content.mjs';
const read = p => JSON.parse(readFileSync(p));
const previous = read('content/foundation.v1.json');
const draft = read('docs/curriculum/drafts/a02-comp5.json');
const candidate = { ...previous, contentVersion: draft.contentVersion };
for (const field of ['records', 'actors', 'editorial']) {
  candidate[field] = [...previous[field], ...draft[field]];
  assert.deepEqual(candidate[field].slice(0, previous[field].length), previous[field]);
}
const attempts = previous.records.map((r, i) => ({ id: `synthetic-ref-${i}`, contentRef: { id: r.id, version: r.version } }));
assert.equal(previous.records.length, 139);
assert.equal(candidate.records.length, 143);
assert.deepEqual(validateContent(candidate, { previous, attempts, asOf: '2026-10-29' }), []);
writeFileSync('/tmp/a02-comp5-composed.json', JSON.stringify(candidate, null, 2) + '\n');
writeFileSync('/tmp/a02-comp5-attempts.json', JSON.stringify(attempts, null, 2) + '\n');
JS
node scripts/validate-content.mjs /tmp/a02-comp5-composed.json --previous content/foundation.v1.json --attempts /tmp/a02-comp5-attempts.json --as-of 2026-10-29
node --experimental-strip-types --test tests/curriculum/content.test.mjs tests/curriculum/validation.test.mjs
node scripts/validate-curriculum.mjs
node scripts/render-curriculum.mjs --check
git diff --check
```

SHA-256: baseline `dc82e76a1e6c3bfb7e103a2f495507c9f318959a19043e6b0a7c5fe55a542b0c`; fragment `759bb817848180e64bef19bebe4b025bdc60f8b1b35dabf2cdb6e095454a13ff`; composed JSON from the command above `c39cacadb4d4395407456ed1f39e8c82b26f45cab35ea5658f04ea018baa148b`.

Protected-path comparison: `git diff --name-only REF -- . ':!docs/**'` is empty for base `407c63e4ad5cd29d30fb9e19c9270976e2f81bf0`, browser-tested `c4ed3f7a82dd0a4231fa300c07ec84c3c41fff89` and [PR #65](https://github.com/tomthemaker/ciso-journey/pull/65) candidate `575d1db9182ddf2415acd0393dbdd6ea791e4d55`. App, all content/C01, tests/fixtures/scripts, browser/build configuration, dependencies/lockfile and CI are identical. D020 therefore reuses PR #65's recorded 163 units/type/build and 16 local desktop/mobile preservation/Pages checks, including `/ciso-journey/`; no app suite/browser/build rerun is claimed for this unregistered documentation artifact. New artifact validation above is separate. Browser setup/execution remains outside CI.

The draft PR records the candidate commit and separate fresh reviewer verdict. No self-approval, merge, publication, independent educator/legal validation or release readiness is claimed. #15 and parent #17 remain open for their publication and quarterly assessment/portfolio integration gates.
