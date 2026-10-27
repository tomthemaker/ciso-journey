# Shared product memory

Updated: 2026-10-27. Scope: CISO Journey 2.0 in the existing repository.

## Authority and maintenance

The user's project instructions take precedence over the supplied proposed plan. This file records durable decisions; GitHub issues track delivery; PLAN.md defines release gates. Historical inputs in docs/planning are evidence, not current instructions. Read this file before planning or implementation. Every product-changing PR must update this memory (or explicitly state no product decision changed), link its issue, and record rationale, impact and superseded decisions. Never silently overwrite a decision: append a dated supersession. Keep learning progress, private notes, employer information and real artifacts out of this public memory. The product owner resolves open scope and learner-preference decisions; implementation proposals remain proposals until recorded with evidence or approval.

## Decision register

| ID | Status / date | Decision and rationale | Impact |
|---|---|---|---|
| D001 | Accepted / 2026-10-27 | Evolve this repository and existing app; project means a new product initiative, not a disconnected replacement. | Preserve existing users and GitHub Pages URL. |
| D002 | Accepted / 2026-10-27 | Original structured teaching is the core; LinkedIn Learning supplements it. User instructions supersede the input plan's course-first experience. | Every learning unit must work without a paid course. |
| D003 | Accepted / 2026-10-27 | Track resource consumption, task completion, recall, assessment and applied competency separately. | No automatic mastery or readiness claims from course/card completion. |
| D004 | Accepted / 2026-10-27 | Preserve all 37 actual task IDs, six self-rating categories, v1 localStorage and backups. | Foundation IDs are w1–w12, not p1a etc.; never fabricate migration IDs. |
| D005 | Accepted / 2026-10-27 | Functional increments on static GitHub Pages, with export/import throughout. | No cloud dependency for core study; offline-first storage is distinct from offline app availability. |
| D006 | Proposed architecture / 2026-10-27 | Vite + TypeScript with lightweight DOM modules; use IndexedDB transactions for durable structured state; no graph database. | Validate migration and schema before choosing packages; React requires a documented benefit. |
| D007 | Accepted / 2026-10-27 | FSRS via ts-fsrs; immutable review events, Again/Hard/Good/Easy, initial desired retention 0.90. | Pin supported library/scheduler versions when implementing; estimate recall, do not claim measured competency. |
| D008 | Accepted / 2026-10-27 | Versioned original content, official references and transparent review status. | AI drafts cannot count as independently validated content; unavailable reviewer leaves content visibly provisional. |
| D009 | Accepted / 2026-10-27 | Secure sync is a later optional release; local study remains available. | Supabase is a candidate, not a vendor commitment; require account isolation, conflict semantics and deletion/export. |
| D010 | Accepted / 2026-10-27 | Self-assessment, rubric assessment and independent review are distinct provenance. | Recognize/Explain/Apply/Lead describes applied assessment; preserve legacy 0–4 scores separately. |
| D011 | Planning assumption / 2026-10-27 | Evidence links and metadata first; binary uploads deferred until private storage and backup semantics exist. | Do not promise uploads from a static public repo. |
| D012 | Accepted / 2026-10-27 | Ship one complete foundation learning loop before scaling content. | Expansion requires released lessons, practice, retrieval and assessment working together. |
| D013 | Accepted / 2026-10-27 | Every task must receive its own independent review by a fresh agent before Done, as requested by the product owner. | Workflow is Todo → In Progress → In Review → Done; record reviewer identity, reviewed version, checks, findings and explicit approval. Recheck changed candidates; no self-approval or batch-only sign-off. |

## Open decisions

| ID | Question | Default until resolved | Resolve by |
|---|---|---|---|
| O001 | Weekly study budget and target timeline? | Configurable budget; 18 months is an aspirational roadmap, not a readiness prediction. | Learner onboarding / R1 |
| O002 | Target industry, employer scale, Swiss canton and EU exposure? | General executive curriculum; clearly scoped regulatory examples. | Regulatory content / R2 |
| O003 | Independent cybersecurity educator / legal reviewer availability? | Mark drafts provisional and record reviewer identity/role when available. | Publishing content / R1 |
| O004 | External mentor assessment desired? | Local rubric-based self-assessment; no implied independent certification. | Evidence / R2 |
| O005 | Sync provider, identity, data region and recovery model? | No account or cloud storage yet. | R5 design gate |
| O006 | Final content volume and authoring capacity? | Proposed foundation quantities are planning floors, validated against pilot feedback. | R1 content gate |

## Baseline compatibility inventory

Actual task IDs: w1, w2, w3, w4, w5, w6, w7, w8, w9, w10, w11, w12; p2a–p2e; p3a–p3e; p4a–p4e; p5a–p5e; p6a–p6e. Baseline self-ratings: Security architecture 0, Cyber-risk management 1, Governance 0, Compliance 0, Security operations 0, Executive reporting 2. These are app defaults, not evidence of a current learner assessment. Preserve any actual user overrides.

## Current state

Planning only; runtime unchanged. GitHub initiative: https://github.com/tomthemaker/ciso-journey/issues/2. Six release milestones and 21 delivery issues were created on 2026-10-27. GitHub Project: https://github.com/users/tomthemaker/projects/1, linked to this repository, with Delivery board and Release plan views. All planning issues start as Todo. The product owner added In Review; D013 now requires a separate fresh-agent review before every task reaches Done. See AGENTS.md for the review protocol. Source archive index.html is byte-identical to repository baseline. No real learner backup was supplied or inspected. Read docs/product/PLAN.md, EVALUATION.md and docs/planning/BACKLOG.md for scope and work status. GitHub issue state is authoritative for completion; memory must not claim a release exists until checks pass.
