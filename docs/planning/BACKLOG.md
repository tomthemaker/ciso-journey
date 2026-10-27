# GitHub delivery backlog

Tracking issue: https://github.com/tomthemaker/ciso-journey/issues/2

Project: https://github.com/users/tomthemaker/projects/1 (Delivery board and Release plan views).

Workflow: Todo → In Progress → In Review → Done. Every task requires its own fresh-agent approval of the final candidate before Done; record review evidence in the issue or PR. See AGENTS.md for the protocol.

Canonical delivery status is in GitHub. This file maps stable planning keys to issues; do not infer completion from this snapshot. See ../product/PLAN.md for release gates.

| Key | Release | Issue | Dependencies |
|---|---|---|---|
| F01 | R0 | [Preserve v1 data and establish migration regression fixtures](https://github.com/tomthemaker/ciso-journey/issues/3) | None |
| F02 | R0 | [Modularize the app with TypeScript and deploy a Pages build](https://github.com/tomthemaker/ciso-journey/issues/4) | F01 |
| F03 | R0 | [Implement versioned transactional storage and complete backups](https://github.com/tomthemaker/ciso-journey/issues/5) | F01, F02 |
| C01 | R1 | [Design curriculum coverage and measurable learning objectives](https://github.com/tomthemaker/ciso-journey/issues/6) | None |
| C02 | R1 | [Define content schemas and an editorial publication gate](https://github.com/tomthemaker/ciso-journey/issues/7) | C01 |
| L01 | R1 | [Build the original lesson reader and concept navigation](https://github.com/tomthemaker/ciso-journey/issues/8) | F02, F03, C02 |
| C03 | R1 | [Author and review original lessons for foundation weeks 1–4](https://github.com/tomthemaker/ciso-journey/issues/9) | C01, C02 |
| L02 | R1 | [Track learning resources independently and preserve custom resources](https://github.com/tomthemaker/ciso-journey/issues/10) | F03, C02 |
| Q01 | R1 | [Implement question banks and explained assessment attempts](https://github.com/tomthemaker/ciso-journey/issues/11) | F03, C02, L01 |
| S01 | R1 | [Implement deterministic FSRS review scheduling and durable history](https://github.com/tomthemaker/ciso-journey/issues/12) | F03, C02 |
| S02 | R1 | [Build prompt-first daily review and the foundation Today flow](https://github.com/tomthemaker/ciso-journey/issues/13) | S01, L01, L02, Q01, C03 |
| A01 | R1 | [Deliver the first executive simulation with rubric and evidence](https://github.com/tomthemaker/ciso-journey/issues/14) | Q01, C03, F03 |
| G01 | R1 | [Verify and release the complete weeks 1–4 learning loop](https://github.com/tomthemaker/ciso-journey/issues/15) | S02, A01 |
| C04 | R2 | [Complete original foundation teaching for weeks 5–12](https://github.com/tomthemaker/ciso-journey/issues/16) | G01 |
| A02 | R2 | [Add six competency cases, practical portfolio and quarterly reassessment](https://github.com/tomthemaker/ciso-journey/issues/17) | A01, G01 |
| P01 | R2 | [Show retention, assessment and evidence trends honestly](https://github.com/tomthemaker/ciso-journey/issues/18) | C04, A02 |
| C05 | R3 | [Publish advanced curriculum across architecture, risk and operations](https://github.com/tomthemaker/ciso-journey/issues/19) | C04, C01 |
| C06 | R3 | [Publish Swiss/EU compliance, governance and executive leadership teaching](https://github.com/tomthemaker/ciso-journey/issues/20) | C04, C02 |
| R01 | R4 | [Create explainable personalized learning paths](https://github.com/tomthemaker/ciso-journey/issues/21) | P01, S02 |
| Y01 | R5 | [Design private sync, threat model and conflict semantics](https://github.com/tomthemaker/ciso-journey/issues/22) | F03, P01 |
| Y02 | R5 | [Implement optional authenticated cross-device synchronization](https://github.com/tomthemaker/ciso-journey/issues/23) | Y01 |
