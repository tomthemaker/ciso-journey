# CISM 2026 transition plan

Provisional planning artifact, checked 2026-10-28. Refs [#43](https://github.com/tomthemaker/ciso-journey/issues/43), [C01 / #6](https://github.com/tomthemaker/ciso-journey/issues/6), D016/O007 and [C02 mapping contract](CONTENT_CONTRACT.md). No independent educator/legal validation or ISACA endorsement is claimed.

## Verified boundary and sources

All retrieved sources below are ISACA primary publications, checked on **2026-10-28** by the implementation agent. Inspection verifies these source statements, not the pedagogy or completeness of our mappings.

| Source / version and locator | Retrieved evidence / limitation |
| --- | --- |
| [Public exam outline](https://www.isaca.org/credentialing/cism/cism-exam-content-outline), “Job practice areas” domain headings and “Getting ready” disclaimer | Still displays 17/20/33/30 weights and detailed baseline topics; explicitly says the replacement applies starting **2026-11-03**. No page publication date or new detailed outline version was verified. |
| [Candidate guide, version 1.26](https://www.isaca.org/en/credentialing/-/media/fa494652c5f149289af38cef18328650.ashx), cover and Appendix C, printed pp. 34–36 (PDF pages 34–36) | Identifies the outline as effective **2022**; pp. 34–35 confirm baseline domains/weights. Exact 2022 starting day and guide publication day remain unverified. The 2026 copyright is not an outline effective date. |
| [ISACA announcement, 2026-09-10](https://www.isaca.org/about-us/newsroom/press-releases/2026/isaca-updates-cism-exam-content-outline-factoring-in-todays-technologies-security-responsibilities), opening paragraphs, domain list and candidate advice | Confirms the four domains remain, successor weights below, exam availability from **2026-11-03**, stronger strategy/program-development emphasis and two added architecture areas. Prep updates on 2026-09-01 are a separate date, not the exam boundary. |
| [Job-practice update support article](https://support.isaca.org/s/article/Certification-CISM-Job-Practice-Update-2026), linked from both official pages | Retrieval returned loading/CSS-error text; substantive article text and its publication date were **not verified**. No fact here depends on that article. |

Rights: ISACA retains its copyright/trademarks; the guide states all rights reserved. This artifact records factual dates, short domain labels/weights, links and original curriculum rationale. It does not reproduce detailed task lists, paid manuals, exam questions or diagrams; source inspection is not reproduction permission or copyright clearance for later teaching.

| Local successor ref | Domain | 2022 outline | Announced 2026 outline | Change |
| --- | --- | --- | --- | --- |
| CM26-1 | Information Security Governance | 17% | 18% | +1 percentage point |
| CM26-2 | Information Security Risk Management | 20% | 20% | None |
| CM26-3 | Information Security Program | 33% | 33% | None |
| CM26-4 | Incident Management | 30% | 29% | −1 percentage point |
| Total | | 100% | 100% | 0 |

The 2022 planning window ends **2026-11-03 exclusive** (last day 2026-11-02); the announced successor exam window starts **2026-11-03 inclusive**. No successor end date was verified. These local CM26 refs identify domains in this document only, not new runtime/framework IDs. The table summarizes the official domain list above; weights do not prescribe learner study time or a readiness score.

## All 37 preserved tasks: proposed successor subject alignment

Basis: immutable [c01.v1.json](../../curriculum/c01.v1.json), `c01-2026-10-27.2`, and its [coverage matrix](COVERAGE.md). Every historical CISM domain selection is retained at domain granularity because the four domain identities remain; each row explains that provisional continuation. The rationale and gap notes are our editorial judgments, not official successor subtopic assignments. Task meanings, objectives and completion requirements do not change.

| Task ID | Proposed successor domains | Rationale / gap to resolve before detailed alignment |
| --- | --- | --- |
| w1 | CM26-2, CM26-3 | Risk chains and control vocabulary remain relevant; introductory concepts alone do not demonstrate management practice. |
| w2 | CM26-3 | IAM design supports a security program; revisit architecture oversight rather than treating a diagram as program governance. |
| w3 | CM26-3 | Network boundaries support control design; add a later enterprise-architecture connection to business capabilities and decision ownership. |
| w4 | CM26-3, CM26-4 | Protection choices support the program; backups/recovery connect to incident readiness. Validate recovery assumptions separately. |
| w5 | CM26-3 | Cloud and supplier controls support program oversight; architecture dependencies and shared responsibility need later explicit treatment. |
| w6 | CM26-2 | Threat scenarios support risk analysis; technical modeling alone does not evidence risk acceptance authority. |
| w7 | CM26-1, CM26-3, CM26-4 | Capability mapping spans governance, program and response; a CSF crosswalk does not establish CISM syllabus completeness. |
| w8 | CM26-2, CM26-3 | Current/target gaps connect risk treatment to program improvement; later verify strategy-driven prioritization. |
| w9 | CM26-1 | Charter, authority and policy support governance; retain business alignment and escalation rationale. |
| w10 | CM26-2 | Likelihood, impact, ownership and treatment directly support risk decisions; uncertainty remains explicit. |
| w11 | CM26-3 | Scorecards support program measurement; define decision use and limitations rather than implying domain mastery. |
| w12 | CM26-1, CM26-2, CM26-3, CM26-4 | Integrated assessment spans all four domains; verify objective-level coverage before any successor snapshot. |
| p2a | CM26-1 | Decision rights and oversight support governance; framework familiarity alone is insufficient. |
| p2b | CM26-1, CM26-2 | Risk appetite and policy connect governance to risk ownership and acceptance. |
| p2c | CM26-2 | Loss scenarios support risk analysis; FAIR-style estimates are a curriculum choice, not a prescribed CISM method. |
| p2d | CM26-2 | Taxonomy, prioritization and treatment support risk management; document accountable decisions. |
| p2e | CM26-1, CM26-2 | Board reporting connects governance and risk communication; distinguish decisions from status reporting. |
| p3a | CM26-1, CM26-3 | ISMS scope and policy hierarchy support governance/program design; no licensed ISO requirement coverage is inferred. |
| p3b | CM26-2, CM26-3 | Risk-based control selection supports program design; architecture integration needs later explicit review. |
| p3c | CM26-3 | Audit evidence and gap analysis support program evaluation; mock evidence does not prove control effectiveness. |
| p3d | CM26-1, CM26-2 | Applicability research informs governance/risk; jurisdiction-specific legal validation remains absent. |
| p3e | CM26-1, CM26-3 | Management review and remediation support governance/program oversight; prioritize through strategy and accountable owners. |
| p4a | CM26-3, CM26-4 | SOC ownership, detection and vulnerability measures connect program operation to incident capability. |
| p4b | CM26-4 | Severity and escalation planning support incident management; validate management decisions beyond technical procedures. |
| p4c | CM26-4 | Crisis communication and ransomware choices support incident management and stakeholder decisions. |
| p4d | CM26-4 | BIA and recovery priorities support incident readiness; exercise recovery assumptions before claiming capability. |
| p4e | CM26-4 | Tabletop and after-action work support incident improvement; participation is not independent assessment. |
| p5a | CM26-1, CM26-3 | Organization, sourcing and roles connect governance to program resources; verify cross-business architecture ownership later. |
| p5b | CM26-1, CM26-3 | Strategy and investment sequencing address the announced stronger emphasis; link business goals to program development and architecture. |
| p5c | CM26-1, CM26-2, CM26-3 | Budget/business cases connect governance, risk and program resources; compare options and residual risk. |
| p5d | CM26-3 | Performance reporting supports program oversight; explain investment outcomes and metric limitations. |
| p5e | CM26-1 | Board decisions support governance and strategy; record business tradeoffs and authority. |
| p6a | CM26-1, CM26-2, CM26-3, CM26-4 | Portfolio reassessment may draw on all four domains; validate evidence per objective, without converting legacy self-ratings. |
| p6b | CM26-1, CM26-3 | Retain indirect governance/program study-planning alignment only; eligibility, exam dates and readiness require separate current checks. |
| p6c | CM26-1, CM26-3 | Real initiative leadership may support governance/program practice; evidence and scope determine relevance, with no experience-credit claim. |
| p6d | CM26-1, CM26-3 | Portfolio organization supports governance/program reporting; artifacts alone do not establish independent competency. |
| p6e | CM26-1 | Role planning and board scenarios support governance/strategy; interview performance is not certification readiness. |

## Remaining work and limits

The added areas are enterprise architecture and information security architecture. The retrieved announcement does not locate them within detailed successor subtopics/tasks. Proposed follow-up: review business-capability/dependency and architecture-decision coverage across w2–w5, p3b, p5a–p5c; examine the stronger strategy/program-development emphasis across w8–w9, p3e, p5a–p5e. Existing technical diagrams and budgets do not establish coverage of those additions. These are specific editorial gaps to check, not new lesson requirements or official ISACA placements. No other detailed additions/removals can be confirmed from the retrieved sources.

Recheck official sources **by 2026-11-02 and on 2026-11-03**, or sooner on a source update. Obtain the detailed successor outline, verify its version/locators and resolve these gaps before creating a new reviewed C01 snapshot and corresponding C02 mapping revisions. **This document does not activate a successor mapping or extend the historical expiry.** After the boundary, preserve historical references/attempts and keep any current-alignment claim blocked until that follow-up is reviewed. Do not rewrite `curriculum/c01.v1.json`, generated coverage or delivered/assessed authored revisions; C02 requires exact historical provenance and append-only corrections.

This is subject-alignment maintenance, not R2 teaching expansion, exam preparation coverage, eligibility assessment or a readiness claim. No exam date is selected (O007). Task/resource completion, reading, recall, question attempts, applied assessment and legacy scores remain distinct. There is no new learner data, content publication or runtime behavior.

## Validation evidence — 2026-10-28

Integrated reviewed documentation main `cf8b039f0b3c5be2966ed2eaebc69b06f129e5dc`, retaining every nonempty memory line from both parents. Relative to that main, changes are limited to this document and a dated memory append. Exact task-set comparison confirms 37 unique IDs, one row each, valid CM26-1–CM26-4 references, and unchanged historical domain selections. Both weight columns total 100; date windows meet at the same exclusive/inclusive boundary. Existing C01 data/matrix and authored bundles are byte-identical.

App, tests, fixtures, browser/build/serve configuration, imports, package/lockfile and CI workflow are unchanged. D020 therefore reuses reviewed S02's 152-unit / 72 local desktop/mobile browser checks, including Pages subpath and recovery flows, from [the final S02 delivery evidence](https://github.com/tomthemaker/ciso-journey/pull/42#issuecomment-6480650420). Browsers were not rerun or added to CI. Node 24.4.1: `npm ci` (zero vulnerabilities), `npm test` (152/152 plus matrix consistency), `npm run typecheck`, `npm run build` and `git diff --check` pass. Final-candidate comparison/results and SHA are recorded in the PR. Fresh independent task review of its exact SHA is required; agent review does not replace educator/legal validation.
