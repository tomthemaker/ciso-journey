# Curriculum coverage matrix

Generated from [c01.v1.json](../../curriculum/c01.v1.json), version **c01-2026-10-27.1**. Refs [C01 / #6](https://github.com/tomthemaker/ciso-journey/issues/6). Run `node scripts/render-curriculum.mjs` to regenerate; use `--check` in validation.

**Draft curriculum design.** All objectives, assessments and framework alignments are provisional. This document contains plans, not released lessons, authored question banks, validated rubrics or learner results. No independent educator or legal review has occurred. Agent delivery review is a separate procedural gate.

## How to read the mappings

Planned curriculum alignment at stated granularity; not equivalent coverage, accreditation, exam readiness or legal compliance. Each task row selects framework targets for its planned objectives collectively; this is not an assertion that every objective covers every selected target. Broad integrated tasks have broader targets and require later objective-level editorial verification. No exhaustive exam syllabus or standard coverage is claimed.

NIST = CSF 2.0 category; ISO = locally named overview theme only; CP = CISSP 2024 exam domain; CM = CISM 2022 job-practice domain. The frameworks use different kinds of outcomes. Certification domains are used as subject alignment, not as a promise of exam preparation. ISO targets are deliberately broad because the full licensed standard was not inspected; the public overview supports an ISMS connection, not technical control or clause completeness.

## Editions and validity

| Version ID | Selected edition / outline | Valid from | Until (exclusive) | Basis / limitation |
| --- | --- | --- | --- | --- |
| nist-csf-2.0 | NIST CSF 2.0 | 2024-02-26 | No expiry identified | Publication date; no expiry announced in checked source. |
| iso27001-2022-amd2024 | ISO/IEC 27001:2022 + Amd 1:2024 | Not verified / no universal date | No expiry identified | Edition published 2022-10; amendment 2024-02. No universal legal effective date. Public overview checked, full licensed requirements not inspected. Theme IDs are local, not ISO clauses or Annex A controls. Amendment metadata checked; no amendment-specific mapping claimed. |
| cissp-2024 | CISSP exam outline effective 2024-04-15 | 2024-04-15 | 2027-04-15 | Current outline effective date and announced replacement date; end date is exclusive. |
| cism-2022 | CISM exam outline effective 2022 | Not verified / no universal date | 2026-11-03 | Candidate guide identifies effective 2022; exact starting day not verified. Replacement date announced on outline page; end date is exclusive. |

**Transition gate:** CISM must be re-mapped before 2026-11-03 and CISSP before 2027-04-15 to present alignment as current. No replacement-outline mapping is claimed. Historical versions remain usable for provenance after expiry. A null boundary means unknown or inapplicable, never indefinite verified validity.

### NIST targets — NIST CSF 2.0

| ID | Target / local theme |
| --- | --- |
| ID.AM | Asset Management |
| ID.RA | Risk Assessment |
| ID.IM | Improvement |
| PR.AA | Identity Management, Authentication, and Access Control |
| PR.DS | Data Security |
| PR.PS | Platform Security |
| PR.IR | Technology Infrastructure Resilience |
| PR.AT | Awareness and Training |
| GV.OC | Organizational Context |
| GV.RM | Risk Management Strategy |
| GV.RR | Roles, Responsibilities, and Authorities |
| GV.PO | Policy |
| GV.OV | Oversight |
| GV.SC | Cybersecurity Supply Chain Risk Management |
| DE.CM | Continuous Monitoring |
| DE.AE | Adverse Event Analysis |
| RS.MA | Incident Management |
| RS.CO | Incident Response Reporting and Communication |
| RC.RP | Incident Recovery Plan Execution |

### ISO targets — ISO/IEC 27001:2022 + Amd 1:2024

| ID | Target / local theme |
| --- | --- |
| risk | Risk-based ISMS (curriculum theme) |
| system | Establish and operate an ISMS (curriculum theme) |
| improve | Maintain and continually improve an ISMS (curriculum theme) |

### CP targets — CISSP exam outline effective 2024-04-15

| ID | Target / local theme |
| --- | --- |
| 1 | Security and Risk Management |
| 2 | Asset Security |
| 3 | Security Architecture and Engineering |
| 4 | Communication and Network Security |
| 5 | Identity and Access Management |
| 6 | Security Assessment and Testing |
| 7 | Security Operations |
| 8 | Software Development Security |

### CM targets — CISM exam outline effective 2022

| ID | Target / local theme |
| --- | --- |
| 1 | Information Security Governance |
| 2 | Information Security Risk Management |
| 3 | Information Security Program |
| 4 | Incident Management |

## Domains and preserved competencies

| Competency ID | Legacy category | Legacy default (0–4) |
| --- | --- | --- |
| comp-1 | Security architecture | 0 |
| comp-2 | Cyber-risk management | 1 |
| comp-3 | Governance | 0 |
| comp-4 | Compliance | 0 |
| comp-5 | Security operations | 0 |
| comp-6 | Executive reporting | 2 |

These defaults are compatibility metadata, not a current assessment. Runtime self-ratings and user overrides remain untouched. Recognize/Explain/Apply/Lead assessment provenance, question attempts, recall estimates, resource completion and task completion remain separate.

| Domain | Scope | Tasks | Competencies |
| --- | --- | --- | --- |
| d01 — Security principles and assets | Asset inventory and business impact underpin control selection. | w1, w4, w12, p6a | comp-1, comp-2 |
| d02 — Architecture / IAM / Zero Trust | Include network boundaries, cryptography, cloud shared responsibility and secure software delivery. | w2, w3, w4, w5, w6, p3b, p6a | comp-1 |
| d03 — Governance and operating models | Make ownership, authority and escalation explicit. | w7, w8, w9, w12, p2a, p2b, p3e, p5a, p5b, p6a, p6b, p6c, p6e | comp-3 |
| d04 — Cyber risk and decisions | Analyze scenarios, uncertainty and treatment decisions. | w6, w8, w10, w12, p2b, p2c, p2d, p5c, p6a, p6c | comp-2 |
| d05 — ISMS / audit / compliance | Distinguish control design, operation, evidence and assurance. | w7, w8, w12, p3a, p3b, p3c, p3e, p6a, p6d | comp-4, comp-3 |
| d06 — Operations / incidents / threat intelligence | Use threat-informed detection and accountable incident decisions. | w6, w12, p4a, p4b, p4c, p4e, p6a | comp-5 |
| d07 — Continuity / resilience / third parties | Prioritize critical services and dependencies, including providers. | w4, w5, w12, p4d, p4e, p5a, p6a | comp-5, comp-2 |
| d08 — Swiss / EU privacy / regulation and AI governance | Research applicability before claiming obligations; include AI inventory and accountable use. | w12, p3d, p6a | comp-4 |
| d09 — Strategy / budgets / board reporting | Connect investments and measures to business decisions. | w11, w12, p2e, p5b, p5c, p5d, p5e, p6a, p6d, p6e | comp-6, comp-3 |
| d10 — Culture / leadership / ethics | Practice ethical escalation, stakeholder influence and learning culture. | w9, w12, p2a, p2e, p4c, p4e, p5a, p5e, p6a, p6b, p6c, p6d, p6e | comp-3, comp-6 |

## All 37 task mappings

The title and expected output below reproduce the actual legacy roadmap. Objectives extend the planned learning without changing the meaning of completion. Prerequisites guide learning order; they do not retroactively invalidate legacy completions or prevent access. No learner-specific time budget or exam deadline is assumed.

| Task and original title | Original expected output | Domains / competencies | Framework targets (provisional) | Objective IDs / task prerequisites / priority |
| --- | --- | --- | --- | --- |
| w1 — Week 1 · CIA triad, assets, threats, vulnerabilities, controls | Produce a security vocabulary and concept map | d01 / comp-1, comp-2 | NIST: ID.AM, ID.RA; ISO: risk; CP: 1, 2; CM: 2, 3 | obj-w1-1, obj-w1-2 / Entry; no security study assumed / R1-first-loop |
| w2 — Week 2 · Authentication, authorization, IAM, MFA, PAM | Draw an identity-security reference architecture | d02 / comp-1 | NIST: PR.AA; ISO: risk; CP: 5; CM: 3 | obj-w2-1, obj-w2-2 / w1 / R1-first-loop |
| w3 — Week 3 · Networking, segmentation, endpoints, Zero Trust | Create an enterprise security architecture diagram | d02 / comp-1 | NIST: PR.IR, PR.PS; ISO: risk; CP: 3, 4; CM: 3 | obj-w3-1, obj-w3-2 / w1, w2 / R1-first-loop |
| w4 — Week 4 · Encryption, classification, backups and recovery | Draft a data protection control assessment | d01, d02, d07 / comp-1, comp-4, comp-5 | NIST: PR.DS, RC.RP; ISO: risk; CP: 2, 3, 7; CM: 3, 4 | obj-w4-1, obj-w4-2 / w1, w3 / R1-first-loop |
| w5 — Week 5 · Cloud, containers and supply-chain security | Review shared-responsibility and key AWS/Azure risks | d02, d07 / comp-1, comp-2 | NIST: GV.SC, PR.PS; ISO: risk; CP: 3, 8; CM: 3 | obj-w5-1, obj-w5-2 / w3, w4 / R2-foundation |
| w6 — Week 6 · Threat modeling and common attack paths | Document five realistic threat scenarios | d02, d04, d06 / comp-1, comp-2, comp-5 | NIST: ID.RA, DE.AE; ISO: risk; CP: 1, 3, 8; CM: 2 | obj-w6-1, obj-w6-2 / w3, w5 / R2-foundation |
| w7 — Week 7 · NIST CSF 2.0 functions and categories | Create an initial security capability map | d03, d05 / comp-3, comp-4 | NIST: GV.OV, ID.AM, PR.PS, DE.CM, RS.MA, RC.RP; ISO: system; CP: 1, 6, 7; CM: 1, 3, 4 | obj-w7-1, obj-w7-2 / w1, w6 / R2-foundation |
| w8 — Week 8 · NIST CSF organizational profiles | Draft a current vs target capability profile | d03, d04, d05 / comp-2, comp-3, comp-4 | NIST: GV.RM, ID.IM; ISO: improve; CP: 1, 6; CM: 2, 3 | obj-w8-1, obj-w8-2 / w7 / R2-foundation |
| w9 — Week 9 · Governance structures, policies, decisions | Draft a security governance charter | d03, d10 / comp-3 | NIST: GV.RR, GV.PO; ISO: system; CP: 1; CM: 1 | obj-w9-1, obj-w9-2 / w7 / R2-foundation |
| w10 — Week 10 · Likelihood, impact and risk treatment | Start an enterprise risk register | d04 / comp-2 | NIST: ID.RA, GV.RM; ISO: risk; CP: 1; CM: 2 | obj-w10-1, obj-w10-2 / w6, w9 / R2-foundation |
| w11 — Week 11 · Security metrics and indicators | Create an executive security scorecard | d09 / comp-6 | NIST: GV.OV, DE.CM; ISO: improve; CP: 1, 6; CM: 3 | obj-w11-1, obj-w11-2 / w8, w10 / R2-foundation |
| w12 — Week 12 · Integrated security assessment | Deliver a short CISO assessment report | d01, d03, d04, d05, d06, d07, d08, d09, d10 / comp-1, comp-2, comp-3, comp-4, comp-5, comp-6 | NIST: GV.OV, ID.IM; ISO: improve; CP: 1, 6, 7; CM: 1, 2, 3, 4 | obj-w12-1, obj-w12-2 / w4, w5, w8, w9, w10, w11 / R2-foundation |
| p2a — Study NIST CSF Govern function and COBIT principles | Define responsibilities and decision rights | d03, d10 / comp-3 | NIST: GV.RR, GV.OV; ISO: system; CP: 1; CM: 1 | obj-p2a-1 / w9 / R3-advanced |
| p2b — Study risk appetite, tolerance, ownership and acceptance | Write an enterprise risk management policy | d03, d04 / comp-2, comp-3 | NIST: GV.RM, GV.PO; ISO: risk; CP: 1; CM: 1, 2 | obj-p2b-1 / w10, p2a / R3-advanced |
| p2c — Practice FAIR-style risk scenarios and uncertainty | Quantify or range-estimate three loss scenarios | d04 / comp-2 | NIST: ID.RA; ISO: risk; CP: 1; CM: 2 | obj-p2c-1 / p2b / R3-advanced |
| p2d — Create risk taxonomy and prioritization criteria | Build a risk register with treatment decisions | d04 / comp-2 | NIST: ID.RA, GV.RM; ISO: risk; CP: 1; CM: 2 | obj-p2d-1 / p2c / R3-advanced |
| p2e — Produce a board-level governance report | Explain top risks, decisions and owners | d09, d10 / comp-3, comp-6 | NIST: GV.OV; ISO: improve; CP: 1; CM: 1, 2 | obj-p2e-1 / p2d, w11 / R3-advanced |
| p3a — Study ISO/IEC 27001 and 27002 | Define ISMS scope and policy hierarchy | d05 / comp-3, comp-4 | NIST: GV.OC, GV.PO; ISO: system; CP: 1, 6; CM: 1, 3 | obj-p3a-1 / w9, w10 / R3-advanced |
| p3b — Learn control selection and statement of applicability | Create a sample control mapping | d02, d05 / comp-1, comp-4 | NIST: ID.RA, PR.PS; ISO: risk; CP: 3, 6, 8; CM: 2, 3 | obj-p3b-1 / p3a, w5 / R3-advanced |
| p3c — Study audit planning and evidence collection | Run a mock control gap assessment | d05 / comp-4 | NIST: GV.OV, ID.IM; ISO: improve; CP: 6; CM: 3 | obj-p3c-1 / p3b / R3-advanced |
| p3d — Review Swiss FADP, GDPR, NIS2, DORA and AI Act applicability | Create a regulatory obligation register | d08 / comp-4 | NIST: GV.OC, GV.SC; ISO: system; CP: 1, 2; CM: 1, 2 | obj-p3d-1 / p3a, w4 / R3-advanced |
| p3e — Build an ISMS management review package | Draft a remediation and audit calendar | d03, d05 / comp-3, comp-4 | NIST: GV.OV, ID.IM; ISO: improve; CP: 1, 6; CM: 1, 3 | obj-p3e-1 / p3c, p3d / R3-advanced |
| p4a — Study SOC models, detection and vulnerability management | Define security operations KPIs and ownership | d06 / comp-5 | NIST: DE.CM, DE.AE, PR.PS; ISO: improve; CP: 6, 7; CM: 3, 4 | obj-p4a-1 / w6, w11 / R3-advanced |
| p4b — Study NIST incident response guidance | Draft severity levels and escalation matrix | d06 / comp-5 | NIST: RS.MA, RS.CO; ISO: system; CP: 7; CM: 4 | obj-p4b-1 / p4a / R3-advanced |
| p4c — Study crisis management and communication | Prepare ransomware decision exercise | d06, d10 / comp-5, comp-6 | NIST: RS.CO, GV.RR; ISO: system; CP: 1, 7; CM: 4 | obj-p4c-1 / p4b, p3d / R3-advanced |
| p4d — Learn business impact analysis, RTO, RPO and recovery | Create critical service recovery priorities | d07 / comp-2, comp-5 | NIST: PR.IR, RC.RP; ISO: risk; CP: 1, 7; CM: 4 | obj-p4d-1 / w4, w10 / R3-advanced |
| p4e — Conduct an incident tabletop | Write an after-action and improvement report | d06, d07, d10 / comp-5, comp-6 | NIST: RS.MA, RC.RP, ID.IM; ISO: improve; CP: 7; CM: 4 | obj-p4e-1 / p4c, p4d / R3-advanced |
| p5a — Design security organization and operating model | Define roles, committees and sourcing choices | d03, d07, d10 / comp-3 | NIST: GV.RR, GV.SC, PR.AT; ISO: system; CP: 1; CM: 1, 3 | obj-p5a-1 / p2a, p3e / R3-advanced |
| p5b — Develop three-year security strategy | Prioritize investments and milestones | d03, d09 / comp-2, comp-3, comp-6 | NIST: GV.RM, GV.OV; ISO: system; CP: 1; CM: 1, 3 | obj-p5b-1 / p2e, p3e, p4e / R3-advanced |
| p5c — Build a risk-based security budget | Create two investment business cases | d04, d09 / comp-2, comp-6 | NIST: GV.RM; ISO: risk; CP: 1; CM: 1, 2, 3 | obj-p5c-1 / p2c, p5b / R3-advanced |
| p5d — Design executive security performance reporting | Build a board dashboard and narrative | d09 / comp-6 | NIST: GV.OV; ISO: improve; CP: 1, 6; CM: 3 | obj-p5d-1 / p5c, w11 / R3-advanced |
| p5e — Present strategy and risk tradeoffs | Produce a board-level decision memo | d09, d10 / comp-3, comp-6 | NIST: GV.OV, GV.RR; ISO: system; CP: 1; CM: 1 | obj-p5e-1 / p5d / R3-advanced |
| p6a — Reassess all six competencies with evidence | Document demonstrated strengths and remaining gaps | d01, d02, d03, d04, d05, d06, d07, d08, d09, d10 / comp-1, comp-2, comp-3, comp-4, comp-5, comp-6 | NIST: ID.IM, GV.OV; ISO: improve; CP: 1, 2, 3, 4, 5, 6, 7, 8; CM: 1, 2, 3, 4 | obj-p6a-1 / w12, p3e, p4e, p5e / R3-advanced |
| p6b — Review CISM and CISSP eligibility and exam readiness | Choose realistic exam dates if appropriate | d03, d10 / comp-3 | NIST: GV.RR, PR.AT; ISO: improve; CP: 1; CM: 1, 3 | obj-p6b-1 / p6a / R3-advanced |
| p6c — Lead or contribute to a real security/GRC initiative | Record measurable organizational impact | d03, d04, d10 / comp-2, comp-3, comp-6 | NIST: GV.RR, ID.IM; ISO: improve; CP: 1; CM: 1, 3 | obj-p6c-1 / p5e / R3-advanced |
| p6d — Compile executive security portfolio | Package strategy, risk, ISMS, incident and board artifacts | d05, d09, d10 / comp-3, comp-4, comp-6 | NIST: GV.OV, ID.IM; ISO: improve; CP: 1, 6; CM: 1, 3 | obj-p6d-1 / p6a, p6c / R3-advanced |
| p6e — Practice CISO interview and board scenarios | Write a 90-day plan for your first CISO-track role | d03, d09, d10 / comp-3, comp-6 | NIST: GV.RR, GV.RM; ISO: system; CP: 1; CM: 1 | obj-p6e-1 / p6d / R3-advanced |

## Explicit technical and leadership coverage

| Topic | Planned tasks |
| --- | --- |
| secure-software | w5, w6, p3b |
| cloud | w5, p3b |
| cryptography | w4, p3b |
| networking | w3, p3b |
| leadership | w9, w12, p2a, p2e, p4c, p4e, p5a, p5e, p6c, p6d, p6e |

Secure software is introduced through delivery-stage checks in w5 and threat modeling in w6, then revisited in control selection p3b. Cloud responsibilities, cryptographic key ownership and network boundaries are assessed explicitly in w5, w4 and w3. Leadership includes authority, ethical escalation, stakeholder communication and awareness/culture design; attendance alone supplies no evidence.

## Foundation objectives and planned assessments

Weeks 1–4 are the first release priority. Each objective below has a version, explicit prerequisites and assessable evidence. Criteria are proposed review anchors, not calibrated pass scores or validated competency thresholds. Each second objective builds on the first; task dependencies link to the prerequisite task’s final objective. Free-form responses require authored rubrics and examples in later content work.

### Week 1 · CIA triad, assets, threats, vulnerabilities, controls

**obj-w1-1 v1.0.0:** Classify six statements as asset, threat, vulnerability, control or business impact and identify the affected confidentiality, integrity or availability goal.

Prerequisites: No prior security study assumed; use a fictional business service and the supplied glossary.

Planned classification: **Annotated vocabulary exercise**. Criteria: At least five of six classifications correct; Distinguish threat from vulnerability and justify the confidentiality, integrity or availability impact.



**obj-w1-2 v1.0.0:** Construct two risk chains connecting a business service, asset, threat, vulnerability, consequence and control.

Prerequisites: obj-w1-1

Planned concept-map: **Security concept map**. Criteria: Two complete chains; Each control has an owner and a stated limitation.



### Week 2 · Authentication, authorization, IAM, MFA, PAM

**obj-w2-1 v1.0.0:** Trace a joiner, mover and leaver through an identity lifecycle and distinguish authentication from authorization at each access decision.

Prerequisites: obj-w1-2

Planned diagram: **Identity lifecycle diagram**. Criteria: All three lifecycle events represented; Access approval, privilege change and removal have named owners.



**obj-w2-2 v1.0.0:** Select MFA and privileged-access safeguards for three access paths and justify one residual risk per path.

Prerequisites: obj-w1-2, obj-w2-1

Planned scenario: **IAM reference architecture**. Criteria: Show user, administrator and service access paths; Differentiate proof of identity, permitted action and privileged session controls.



### Week 3 · Networking, segmentation, endpoints, Zero Trust

**obj-w3-1 v1.0.0:** Draw two business service flows across endpoint, network and application boundaries and identify where each access decision is enforced.

Prerequisites: obj-w1-2, obj-w2-2

Planned diagram: **Enterprise architecture diagram**. Criteria: Two end-to-end flows; Mark at least three trust boundaries and control owners.



**obj-w3-2 v1.0.0:** Compare a flat network with a segmented design and justify two controls using explicit Zero Trust assumptions.

Prerequisites: obj-w1-2, obj-w2-2, obj-w3-1

Planned scenario: **Architecture decision note**. Criteria: Explain a lateral movement path in both designs; State a failure mode and operational tradeoff for each proposed control.



### Week 4 · Encryption, classification, backups and recovery

**obj-w4-1 v1.0.0:** Select protection for data at rest and in transit and explain encryption, hashing and key-management responsibilities for a classified dataset.

Prerequisites: obj-w1-2, obj-w3-2

Planned scenario: **Data protection control assessment**. Criteria: Distinguish encryption from hashing; Identify classification, key owner, access rule and residual risk.



**obj-w4-2 v1.0.0:** Design a restore exercise for a critical dataset using stated recovery objectives and a documented success test.

Prerequisites: obj-w1-2, obj-w3-2, obj-w4-1

Planned applied-plan: **Recovery test plan**. Criteria: Separate recovery time and recovery point objectives; Include restore verification, owner and evidence to collect; do not infer recovery from backup completion.



### Week 5 · Cloud, containers and supply-chain security

**obj-w5-1 v1.0.0:** Allocate provider, customer and supplier responsibilities for six controls across one managed cloud service and one container workload.

Prerequisites: obj-w3-2, obj-w4-2

Planned scenario: **Shared responsibility matrix**. Criteria: Six controls with accountable parties; Flag at least two service-model assumptions requiring provider confirmation.



**obj-w5-2 v1.0.0:** Propose three checks spanning source, dependency, build and deployment for a containerized service and explain what each fails to detect.

Prerequisites: obj-w3-2, obj-w4-2, obj-w5-1

Planned design-review: **Software supply-chain review**. Criteria: Cover all four delivery stages across the checks; Name evidence, owner and limitation for each check.



### Week 6 · Threat modeling and common attack paths

**obj-w6-1 v1.0.0:** Construct five threat scenarios identifying actor, entry point, asset, preconditions and business consequence.

Prerequisites: obj-w3-2, obj-w5-2

Planned threat-model: **Threat scenario register**. Criteria: Five distinct scenarios; Trace each attack across at least one boundary.



**obj-w6-2 v1.0.0:** Rank the five scenarios and propose a preventive and detective control for the two highest priorities.

Prerequisites: obj-w3-2, obj-w5-2, obj-w6-1

Planned scenario: **Threat treatment note**. Criteria: State ranking assumptions and uncertainty; Connect each selected control to a specific attack step and evidence source.



### Week 7 · NIST CSF 2.0 functions and categories

**obj-w7-1 v1.0.0:** Allocate twelve example security activities across all six CSF 2.0 functions and explain ambiguous allocations.

Prerequisites: obj-w1-2, obj-w6-2

Planned classification: **CSF capability map**. Criteria: All six functions represented; At least ten defensible allocations with rationale; allow justified cross-function mapping.



**obj-w7-2 v1.0.0:** Assign an owner and an evidence request to six selected CSF categories without treating the map as an audit certification.

Prerequisites: obj-w1-2, obj-w6-2, obj-w7-1

Planned applied-plan: **Capability ownership matrix**. Criteria: Six categories with owners and evidence; Separate desired outcome from control implementation.



### Week 8 · NIST CSF organizational profiles

**obj-w8-1 v1.0.0:** Draft current and target profiles for six selected CSF outcomes using evidence and explicit unknowns.

Prerequisites: obj-w7-2

Planned scenario: **Current and target profile**. Criteria: Six outcomes with evidence or unknown status; Explain target selection using business risk.



**obj-w8-2 v1.0.0:** Prioritize three profile gaps into an improvement backlog with owner, dependency and acceptance evidence.

Prerequisites: obj-w7-2, obj-w8-1

Planned applied-plan: **Profile improvement backlog**. Criteria: Three gaps with accountable owners; Explain why a profile or tier is not a measured competency score.



### Week 9 · Governance structures, policies, decisions

**obj-w9-1 v1.0.0:** Draft a charter assigning policy approval, risk acceptance, incident escalation and assurance responsibilities.

Prerequisites: obj-w7-2

Planned applied-plan: **Security governance charter**. Criteria: All four decision types have an accountable role; Separate governing oversight from execution and escalation.



**obj-w9-2 v1.0.0:** Resolve two conflicting stakeholder requests using the charter and document an ethical escalation.

Prerequisites: obj-w7-2, obj-w9-1

Planned scenario: **Decision and escalation log**. Criteria: Two decisions cite delegated authority; Record conflict, affected stakeholders and escalation rationale.



### Week 10 · Likelihood, impact and risk treatment

**obj-w10-1 v1.0.0:** Build three risk register entries separating likelihood, consequence, existing controls and uncertainty.

Prerequisites: obj-w6-2, obj-w9-2

Planned scenario: **Foundation risk register**. Criteria: Three complete entries with business owners; State evidence, assumptions and residual risk without unsupported precision.



**obj-w10-2 v1.0.0:** Compare accept, avoid, transfer and mitigate options for one scenario and recommend a treatment within delegated authority.

Prerequisites: obj-w6-2, obj-w9-2, obj-w10-1

Planned decision-memo: **Risk treatment decision**. Criteria: Address all four options and residual exposure; Name accepting authority, action owner and review trigger.



### Week 11 · Security metrics and indicators

**obj-w11-1 v1.0.0:** Define four executive measures with formula, denominator, source, owner, cadence and a decision threshold.

Prerequisites: obj-w8-2, obj-w10-2

Planned applied-plan: **Executive security scorecard**. Criteria: Four reproducible metric definitions; Include a risk indicator and a control performance indicator.



**obj-w11-2 v1.0.0:** Interpret two changing measures and write a recommendation that states data limitations and a decision request.

Prerequisites: obj-w8-2, obj-w10-2, obj-w11-1

Planned decision-memo: **Scorecard narrative**. Criteria: Distinguish a change in measurement from a change in risk; Provide a decision, owner and uncertainty statement.



### Week 12 · Integrated security assessment

**obj-w12-1 v1.0.0:** Synthesize the foundation artifacts into a scoped CISO assessment with three prioritized decisions and traceable evidence.

Prerequisites: obj-w4-2, obj-w5-2, obj-w8-2, obj-w9-2, obj-w10-2, obj-w11-2

Planned integrated-case: **Short CISO assessment report**. Criteria: Three decisions trace to risk, control evidence and accountable owner; Include architecture, governance, operations and a Swiss/EU applicability question requiring verification.



**obj-w12-2 v1.0.0:** Defend one recommendation against an alternative and identify remaining learning and evidence gaps across all six competencies.

Prerequisites: obj-w4-2, obj-w5-2, obj-w8-2, obj-w9-2, obj-w10-2, obj-w11-2, obj-w12-1

Planned oral-or-written-defense: **Assessment defense and gap plan**. Criteria: Compare benefit, cost, uncertainty and residual risk; Separate self-rating, question performance, recall estimate and applied evidence.



## Advanced objective and assessment plans

One observable planning objective per advanced task reserves coverage for R3 authorship. These do not satisfy the advanced lesson publication gate. p6b adds an eligibility-source verification gate before any certification advice.

| Task / objective | Observable objective | Planned evidence and criteria |
| --- | --- | --- |
| p2a / obj-p2a-1 | Assign five governance decisions to accountable roles and explain escalation and oversight. | Define responsibilities and decision rights: Five decisions with roles and authority; Distinguish CSF governance outcomes from any proposed COBIT comparison; verify COBIT sources during authoring |
| p2b / obj-p2b-1 | Draft risk appetite, tolerance and acceptance rules for three business scenarios. | Write an enterprise risk management policy: Three scenarios distinguish appetite from limits; Name accepting authority and review triggers |
| p2c / obj-p2c-1 | Estimate ranges for three loss scenarios and show how assumptions affect the recommendation. | Quantify or range-estimate three loss scenarios: Three ranges with evidence and uncertainty; Sensitivity analysis; do not claim validated FAIR analysis without methodology review |
| p2d / obj-p2d-1 | Prioritize five register entries and justify treatment, ownership and review cadence. | Build a risk register with treatment decisions: Five entries with comparable criteria; Document exceptions and residual risk acceptance |
| p2e / obj-p2e-1 | Write a board report linking three top risks to decisions and owners. | Explain top risks, decisions and owners: Three evidence-linked decisions; State uncertainty and oversight follow-up |
| p3a / obj-p3a-1 | Define ISMS scope, interfaces and policy hierarchy for a fictional organization. | Define ISMS scope and policy hierarchy: Identify organizational boundaries and dependencies; Distinguish requirements from implementation guidance; licensed standard review pending |
| p3b / obj-p3b-1 | Justify inclusion or exclusion of six candidate controls in a sample applicability record. | Create a sample control mapping: Six risk-linked decisions with owners; Include software delivery, cloud, cryptography and networking; exact ISO mapping requires licensed review |
| p3c / obj-p3c-1 | Plan and perform a mock gap assessment of three controls. | Run a mock control gap assessment: Separate design from operating effectiveness; Record sampling limits, evidence and findings |
| p3d / obj-p3d-1 | Draft an applicability and obligation register for Swiss FADP, GDPR, NIS2, DORA and the AI Act for a fictional entity. | Create a regulatory obligation register: For each instrument record entity, sector, territory, dates, authority and unknowns; Include AI role/use inventory; no obligation becomes verified before official text and legal review |
| p3e / obj-p3e-1 | Prepare a management review and corrective-action calendar from three mock findings. | Draft a remediation and audit calendar: Each finding has owner, deadline and closure evidence; Include management decisions and follow-up verification |
| p4a / obj-p4a-1 | Define detection, vulnerability and threat-intelligence operating responsibilities with four measures. | Define security operations KPIs and ownership: Four measures linked to service risks; Show triage, remediation and coverage limitations |
| p4b / obj-p4b-1 | Classify three incidents and draft severity and escalation rules. | Draft severity levels and escalation matrix: Severity reflects business impact; Name incident commander, authority and communication triggers |
| p4c / obj-p4c-1 | Prepare a ransomware decision exercise with competing operational, legal and communication demands. | Prepare ransomware decision exercise: At least three decision points and alternatives; Record uncertain legal/reporting questions for qualified review |
| p4d / obj-p4d-1 | Rank three critical services using impact analysis and recovery objectives. | Create critical service recovery priorities: Distinguish RTO and RPO; Map supplier dependencies and a recovery test for each service |
| p4e / obj-p4e-1 | Run a fictional incident tabletop and write an improvement report. | Write an after-action and improvement report: Capture decisions, assumptions and observations; Assign corrective actions with deadlines and retest evidence |
| p5a / obj-p5a-1 | Design an operating model with roles, committees, sourcing and an awareness intervention. | Define roles, committees and sourcing choices: Explain accountability and supplier oversight; Define one culture outcome and ethical escalation channel |
| p5b / obj-p5b-1 | Build a three-year strategy connecting three investments to business risks and staged outcomes. | Prioritize investments and milestones: Three investments with owners and dependencies; Include constraints and review triggers; dates are scenario assumptions |
| p5c / obj-p5c-1 | Compare two investment business cases using cost ranges and residual risk. | Create two investment business cases: Show assumptions and sensitivity; State decision authority and rejected alternatives |
| p5d / obj-p5d-1 | Build a board dashboard whose four measures can be traced to risk treatments. | Build a board dashboard and narrative: Four measures have definitions and evidence sources; Narrative includes exceptions and a decision request |
| p5e / obj-p5e-1 | Write and defend a board decision memo on a disputed security investment. | Produce a board-level decision memo: Recommendation includes alternatives and tradeoffs; Handle an ethical or stakeholder conflict explicitly |
| p6a / obj-p6a-1 | Reassess all six competencies using artifacts and documented limitations. | Document demonstrated strengths and remaining gaps: Six separate evidence-linked appraisals; Keep legacy scores, self-assessment and independent feedback distinct |
| p6b / obj-p6b-1 | Compare current CISSP and CISM eligibility and outline versions against a fictional experience record. | Choose realistic exam dates if appropriate: Verify official eligibility sources when authoring; no eligibility conclusion here; Select a conditional preparation plan with dates or document why no exam date is appropriate |
| p6c / obj-p6c-1 | Plan and evaluate a permitted security initiative using a baseline and an outcome measure. | Record measurable organizational impact: Document role, permission and measurable change or uncertainty; Use sanitized/synthetic portfolio material; private employer evidence stays outside Git |
| p6d / obj-p6d-1 | Assemble a sanitized portfolio connecting strategy, risk, ISMS, incident and board artifacts to objectives. | Package strategy, risk, ISMS, incident and board artifacts: All five artifact types have provenance and limitations; Remove confidential information and distinguish authorship from independent review |
| p6e / obj-p6e-1 | Produce and defend a 90-day CISO-track plan in two stakeholder scenarios. | Write a 90-day plan for your first CISO-track role: Prioritize discovery, decisions, owners and success evidence; State experience gaps without claiming certified readiness |

## Swiss and EU scope

General executive curriculum using fictional organizations. Switzerland and EU are separate applicability investigations; neither location nor framework alignment establishes a legal obligation.

Determine federal/private/cantonal context, sector, authority, data flows and applicable text. FDPIC overview checked; Fedlex text unavailable in this check. Canton and industry remain unresolved.

Determine entity, establishment, territorial nexus, sector/size, regulated role and processing/AI use. Check GDPR, NIS2 national implementation, DORA sector scope, AI Act phased provisions and the applicable consolidated texts before legal teaching.

Legal text remains unverified due to access challenges. No article, reporting deadline or definitive applicability conclusion is authored here; qualified jurisdiction-specific review required.

For p3d, the intended artifact records each instrument, legal entity, territorial/sector nexus, authority, operative dates, applicable national implementation, source version, unresolved question and reviewer. Legal obligations, notification periods, eligibility and AI classifications must be verified during lesson authorship. A Swiss company is not assumed subject to every EU instrument. This matrix does not assign definitive obligations to a learner or employer.

## Sources and verification limits

Official pages were checked on 2026-10-27 using web browsing. A successful page retrieval verifies only the described reference metadata/scope; automated reference checks below validate IDs and official HTTPS hosts, not live availability or substantive educational correctness. Legal entries returned access challenges and were not substantively verified. No standards, exam questions or paid course content are reproduced.

| Source | Publisher / edition | Publication date | Checked / review due | Verification |
| --- | --- | --- | --- | --- |
| [src-nist: CSWP 29: Cybersecurity Framework 2.0](https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) | NIST / 2.0 | 2024-02-26 | 2026-10-27 / 2027-10-27 | metadata-and-scope-checked |
| [src-iso: ISO/IEC 27001 overview](https://www.iso.org/standard/27001) | ISO / 2022 edition 3 | 2022-10 | 2026-10-27 / 2027-10-27 | metadata-and-scope-checked |
| [src-iso-amd: ISO/IEC 27001 Amendment 1](https://www.iso.org/standard/88435.html) | ISO / 2024 climate action amendment | 2024-02 | 2026-10-27 / 2027-10-27 | metadata-and-scope-checked |
| [src-cissp: CISSP exam outline, current PDF](https://edge.sitecorecloud.io/internationf173-xmc4e73-prodbc0f-9660/media/Project/ISC2/Main/Media/documents/exam-outlines/CISSP-Exam-Outline-April-2024-English.pdf) | ISC2 / effective 2024-04-15 | Not established | 2026-10-27 / 2027-04-14 | metadata-and-scope-checked |
| [src-cissp-transition: CISSP outline and transition notice](https://www.isc2.org/certifications/cissp/cissp-certification-exam-outline) | ISC2 / 2027-04-15 transition announced | Not established | 2026-10-27 / 2027-04-14 | metadata-and-scope-checked |
| [src-cism: CISM exam content outline and transition notice](https://www.isaca.org/credentialing/cism/cism-exam-content-outline) | ISACA / 2022 outline; replacement 2026-11-03 | Not established | 2026-10-27 / 2026-11-02 | metadata-and-scope-checked |
| [src-cism-guide: Exam candidate guide](https://www.isaca.org/en/credentialing/-/media/fa494652c5f149289af38cef18328650.ashx) | ISACA / Appendix C: effective 2022 | Not established | 2026-10-27 / 2026-11-02 | metadata-and-scope-checked |
| [src-fdpic: Data protection overview](https://www.edoeb.admin.ch/en/data-protection) | FDPIC / live overview | Not established | 2026-10-27 / 2027-01-25 | metadata-and-scope-checked |
| [src-fadp: Federal Act on Data Protection](https://www.fedlex.admin.ch/eli/cc/2022/491/en) | Swiss Confederation / Fedlex / official legal entry; text not verified | Not established | 2026-10-27 / 2027-01-25 | blocked-javascript-text-unverified |
| [src-gdpr: GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng) | European Union / EUR-Lex / official legal entry; consolidated text not verified | Not established | 2026-10-27 / 2027-01-25 | blocked-bot-challenge-text-unverified |
| [src-nis2: NIS2](https://eur-lex.europa.eu/eli/dir/2022/2555/oj/eng) | European Union / EUR-Lex / official legal entry; consolidated text not verified | Not established | 2026-10-27 / 2027-01-25 | blocked-bot-challenge-text-unverified |
| [src-dora: DORA](https://eur-lex.europa.eu/eli/reg/2022/2554/oj/eng) | European Union / EUR-Lex / official legal entry; consolidated text not verified | Not established | 2026-10-27 / 2027-01-25 | blocked-bot-challenge-text-unverified |
| [src-ai-act: AI Act](https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng) | European Union / EUR-Lex / official legal entry; consolidated text not verified | Not established | 2026-10-27 / 2027-01-25 | blocked-bot-challenge-text-unverified |

## Release and review handoff

C01 supplies curriculum planning inputs for C02 content contracts and C04/C11 lesson authorship. It does not prescribe their implementation schemas. Before publishing: an educator checks alignment, prerequisites, scope, original teaching and assessment quality; an appropriately qualified legal reviewer verifies relevant Swiss/EU claims. Record real reviewer identity/role/date and reviewed version. Keep AI authorship distinct from independent validation.

When an objective is used in an assessment, retain the version shown. A correction creates a new immutable content version and records its impact; never reinterpret old learner results or automatically change legacy scores/completion. New lessons, sources, cards and questions receive their own identifiers and review provenance in subsequent work.

Open learner preferences remain in [product memory](../product/MEMORY.md): weekly study budget/timeline; industry, organization size, canton and EU exposure; educator/legal reviewer availability; mentor participation; content capacity; and whether certification alignment is a study aid or an actual exam goal.

## Validation commands

Use Node.js 22+ for the test runner (the data scripts also run on the repository’s older Node 14). No app dependency or runtime change is introduced.

```sh
node scripts/validate-curriculum.mjs
node scripts/render-curriculum.mjs --check
node --test tests/curriculum/validation.test.mjs
```

Validation covers the exact 37 IDs/titles/outcomes, legacy competency metadata, ten-domain and explicit-topic coverage, framework targets and date transitions, source references/official hosts, observable action verbs, assessment criteria, objective ownership and both prerequisite graphs. Mutation tests exercise missing coverage, invented IDs, cycles, invalid references, unsupported clause precision, missing assessment evidence and false review provenance. It does not establish teaching correctness, legal applicability or real learner achievement.
