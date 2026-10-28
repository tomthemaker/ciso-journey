# A02 comp-1 draft: executive architecture decision

Refs [#73](https://github.com/tomthemaker/ciso-journey/issues/73), parent [#17](https://github.com/tomthemaker/ciso-journey/issues/17). **No product decision changed.** This is an unregistered authoring fragment, not a teaching release or A02 runtime integration. The [#15 human publication gate](https://github.com/tomthemaker/ciso-journey/issues/15) remains open. Agent task review is separate from educator/legal approval.

## Immutable inputs and dependencies

- Base: `407c63e4ad5cd29d30fb9e19c9270976e2f81bf0`.
- Canonical `content/foundation.v1.json`: `foundation-2026-10-28.3`, **139 revisions**; SHA-256 `dc82e76a1e6c3bfb7e103a2f495507c9f318959a19043e6b0a7c5fe55a542b0c`.
- C01 `curriculum/c01.v1.json`: `c01-2026-10-27.2`; SHA-256 `db5d5ee60fb66047f318637399932e0ad2d9fe17b7def1bc8c847b564f43c952`.
- Fragment: `a02-comp1-draft-2026-10-29.1`, schema 1; SHA-256 `713270fc0c3b46b5a8e3964246d964fb5dd7ce5fb23697c51d9de29375e956c7`.
- No draft dependencies, lesson prerequisites or framework-mapping records. The evidence packet defines the required architecture, identity and service facts. W5/W6 drafts are not imported.
- Three new `@1` records: `source-a02-comp1-zero-trust`, `scenario-a02-comp1-architecture`, `rubric-a02-comp1-architecture`; one new AI actor `ai-a02-comp1-author`. All editorial entries are `draft`, with no reviews/challenges; no legal claims. Existing records, actors and editorial entries are unchanged.

## Acceptance and scope

Meridian Parts is original fiction. Evidence E1–E5 supplies service actions, current exposure, capabilities, owners, estimates, lifecycle events and explicit missing test results. The learner compares broad VPN access, bounded diagnosis with internal restarts, and delay. The practical artifact is two service flows plus a permission/enforcement/failure/test matrix; the annotated response demonstrates one conditional choice and accepts a justified alternative. Six cumulative rubric criteria assess only the submitted response. No total/pass score, automatic grading or broad competency claim is supplied.

| Actual C01 objective | Evidence requested |
|---|---|
| `obj-w2-1` | Day-1 joiner, day-7 mover, day-14 leaver; approvals, rights, account and session checks; authentication distinguished from authorization. |
| `obj-w2-2` | Operator, supplier, internal administrator and unattended service safeguards; per-path residual exposure and credential ownership. |
| `obj-w3-1` | Dispatch and supplier-diagnosis/restart flows; identities, return/management paths, at least three boundaries with decisions, enforcement and owners. |
| `obj-w3-2` | Flat/restricted attack paths; two resource-specific controls, failure modes, operating tradeoffs and no trust inferred from location or managed-device status. |

This covers a bounded part of legacy **comp-1**, not every architecture objective. No paid prerequisite, ISO requirement, legal applicability or readiness claim is included. The actual 37 task IDs, six legacy scores, v1/v2 backups and separate resource/task/recall/question/applied-assessment histories are untouched. No private learner or employer data is used.

## Source inspection: 2026-10-29

[NIST SP 800-207 final entry](https://csrc.nist.gov/pubs/sp/800/207/final) confirms **Zero Trust Architecture**, August 2020, final history date **2020-08-11**, DOI `10.6028/NIST.SP.800-207`. The [official PDF](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-207.pdf) was readable through the web tool (59 PDF pages). Inspected locators: sections 2/2.1, printed pp. 4–7; section 3, pp. 9–10; sections 5.1–5.3, pp. 28–29; sections 7.3.3–7.3.6, pp. 39–40. These support resource-specific access, distinct decision/enforcement roles, residual misuse and dependency failures, and workflow-specific pilot checks. Case costs, hardware keys, component behavior, permissions and expected tests are fictional assumptions, not NIST mandates. No quotations or reproduced figures/tables are used.

Source metadata records AI technical text inspection, checked `2026-10-29`, due `2027-10-29`; the source remains editorial draft. The final entry's 2024 planning note concerns translations, not a replacement edition. This is an exact-edition citation, not a claim to cover all later NIST publications. Direct local PDF download returned HTTP 403; no local PDF receipt/hash is claimed. No independent human content validation occurred.

## Validation evidence: 2026-10-29

Node **24.4.1**:

- C02 CLI: standalone fragment **3/3** and composed bundle **142/142** valid at `--as-of 2026-10-29`.
- Composed validation used `--previous content/foundation.v1.json` and 139 synthetic original revision references with `--attempts`. Every baseline actor, authored record and editorial entry also compared deeply equal; all new IDs are distinct.
- Existing C02 unit file: **25/25** pass. C01: **37 unchanged tasks**, ten domains, six competencies, 49 objectives; no mapping/prerequisite errors. `git diff --check` passes.
- D020 reuse: app/content/curriculum/tests/fixtures/scripts/build/browser configuration/CI/package files are identical to approved cloud-host candidate `c4ed3f7a82dd0a4231fa300c07ec84c3c41fff89` and integrated `575d1db9182ddf2415acd0393dbdd6ea791e4d55`. [PR #65 evidence](https://github.com/tomthemaker/ciso-journey/pull/65#issuecomment-6482751805): 163 units, type/build/C02, 16 local desktop/mobile preservation and Pages checks. Earlier [160-unit / 90-browser evidence](https://github.com/tomthemaker/ciso-journey/pull/53#issuecomment-6482363893) is historical; the subsequent source-host increment added validator/unit checks and has its own cited review. No full app suite, browser or build rerun is needed for these two unregistered files.

Reproduction: concatenate baseline and fragment `actors`, `records`, `editorial` arrays into a temporary bundle, retaining schema/curriculum versions and setting contentVersion to the fragment version. Generate `{id, contentRef:{id,version}}` synthetic attempts for each baseline record. Then run:

```sh
node scripts/validate-content.mjs docs/curriculum/drafts/a02-comp1.json --as-of 2026-10-29
node scripts/validate-content.mjs /tmp/a02-comp1-composed.json --previous content/foundation.v1.json --attempts /tmp/a02-comp1-baseline-attempts.json --as-of 2026-10-29
node --test tests/curriculum/content.test.mjs
node scripts/validate-curriculum.mjs
git diff --check
```

Checks validate structure, preservation and declared metadata, not pedagogical quality or successful deployment. Fresh exact-candidate task review and PR evidence remain required; no merge/publication is authorized by this manifest.
