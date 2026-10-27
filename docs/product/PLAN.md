# CISO Journey 2.0 delivery plan

Status: planned, 2026-10-27. Build in the existing repository. GitHub milestones and issues are the execution plan; BACKLOG.md links them. MEMORY.md holds durable decisions. Release order is gated by working software and reviewed teaching, not calendar promises.

## Release sequence

| Release | Functional outcome | Gate |
|---|---|---|
| R0 Preservation and foundation | Existing app modularized, recoverable versioned data, static Pages build. | All 37 IDs and existing features preserved; v1 import and new backup round-trips pass; subpath deployment verified. |
| R1 Foundation learning loop, weeks 1–4 | Original lessons → questions → FSRS → one executive exercise; independent resource tracking. | At least four substantial lessons, 12 curated cards, 20 questions across MCQ/scenario/open-ended formats, one rubric-based case, source/review metadata and mobile daily flow. Counts are floors, not evidence of quality. |
| R2 Complete first 12 weeks | Remaining eight foundation lessons, six competency scenarios, portfolio and assessment trends. | At least 12 foundation lessons total, coverage of all 12 weekly tasks, transparent recall/assessment signals and complete backups. |
| R3 Full executive curriculum | Advanced lessons and cases cover all 37 tasks and ten curriculum domains. | Versioned coverage matrix has no unexplained objective gaps; Swiss/EU applicability reviewed; advanced content meets publication gate. |
| R4 Personalized learning | Explainable recommendations and configurable time budgets. | Deterministic rules tested; learner can override; recommendations preserve overdue reviews and prerequisite logic. |
| R5 Optional secure sync | Same learning history on two devices with local operation. | Threat model, account isolation, conflict/delete rules, recovery and offline convergence verified before release. |

R0 precedes R1 integration. Curriculum design and content drafting may proceed alongside R0, but draft material cannot be presented as validated. R2 follows a usable R1; R3 follows R2. R4 depends on sufficient R2 data and can precede completion of R3. R5 is deferred until the local model is stable; do not block useful learning on authentication.

## Curriculum architecture

Ten domains: security principles and assets; architecture/IAM/Zero Trust; governance and operating models; cyber risk and decisions; ISMS/audit/compliance; operations/incidents/threat intelligence; continuity/resilience/third parties; Swiss/EU privacy/regulation and AI governance; strategy/budgets/board reporting; culture/leadership/ethics. Explicitly map secure software delivery, cloud, cryptography and network security within relevant domains so the four framework alignments have no silent gaps.

Each unit has measurable objectives, prerequisites, original readings, worked executive examples, misconceptions, retrieval prompts, questions, practice and an evidence rubric. Cross-map to the six existing competencies, task IDs and versioned NIST CSF, ISO 27001, CISSP and CISM references. Mapping is alignment, not equivalence or certification accreditation.

## Content and knowledge contract

Stable IDs and content versions for lessons, objectives, concepts, sources, cards, questions, scenarios, rubrics and framework mappings. Lesson records include sections, prerequisites, estimated study time, worked examples and related practice. Questions include format, objective IDs, options where applicable, correct answer or rubric, explanation for every option, source IDs and difficulty. Scenario/open responses use annotated examples and rubrics, not exact text matching.

Sources include publisher, URL, edition/version, jurisdiction, publication/effective dates where known, checkedAt and reviewDueAt. Publication states: draft, source-checked, independently reviewed, published, stale, retired. Record author/reviewer role and review date; do not label a solo AI draft independently validated. Proposed review cadence: 90 days for regulatory/time-sensitive content, annually for stable fundamentals, and event-triggered review on official updates. Gate legal statements by applicability and authoritative text, not a generic jurisdiction label.

Content versions are immutable once assessed. Attempts reference the version shown. Correcting a lesson/card creates a new version with change notes; assess impact on earlier attempts/schedules without erasing history. Automated validation checks links/IDs/schema/coverage, while human review checks correctness, pedagogy and plausible distractors. Broken links are different from invalid claims. A substantive source challenge blocks validated publication until resolved.

## State and architecture contract

Proposed Vite/TypeScript modules: curriculum, lessons, questions, resources, reviews, assessment, portfolio, recommendations, storage/migration and later sync. Static content in versioned validated files; private learner records behind a storage interface, with transactional IndexedDB evaluated in R0. No backend or graph database needed initially. Hash navigation or equivalent must work on Pages subpaths and refresh.

Retain input plan entities and add lessons, learning_objectives, lesson_concepts, questions, question_attempts, scenario_responses, rubrics, source_records, framework_mappings, content_versions and recommendation_decisions. Track assessment provenance and content version. Keep separate task_progress, resource_progress, scheduler state, immutable review_events and mastery_assessments. Canonical task completion stays backward compatible; richer practice statuses cannot silently reinterpret completed booleans.

Review events store unique IDs, timestamp, card/content version, scheduler/library version, rating and before/after state sufficient for deterministic reconstruction. One transaction persists event plus schedule. Prevent duplicate submit. Use local timezone for daily queues, UTC instants for storage, bounded new-card introduction and overdue carryover. Distinguish observed retrieval performance from model-estimated recall probability.

Backups include all private state, review/attempt history, custom content, evidence metadata, settings and version references. Preserve v1 original data until migration succeeds; reject unsupported/corrupt imports without overwriting current state. Never reset all state because one field is malformed. Evidence begins as metadata/links; no public uploads. No real backups in fixtures.

## Release checks

Each issue defines its acceptance evidence. Required shared checks: data/schema validation, meaningful unit/integration tests, preservation/backup tests, safe handling of imported HTML and URLs, keyboard/mobile essential flows, Pages build/subpath smoke test, documented recovery and release notes. Content releases also require objective coverage and review status checks. Sync adds two-account/two-device and reconnect/delete/conflict tests. Keep runtime changes separate from this planning PR.

## Task completion gate

Every task, including documentation and content, follows Todo → In Progress → In Review → Done. After implementation and checks, keep its issue open in In Review and request a separate fresh agent review for that task, without inherited implementation conversation. Supply the issue, acceptance criteria, repository/product instructions, candidate commit or immutable deliverable, diff and validation evidence. One batch-level sign-off does not replace individual reviews.

The reviewer independently verifies acceptance, relevant risks and validation, and records its agent identifier, candidate version, coverage, checks, findings/limitations and explicit Approve or Changes requested verdict in the issue or PR. The implementer addresses findings; reviewer verification of the updated candidate is required. Changes after approval require review again. Done/issue closure requires final-candidate approval, passing checks and applicable delivery/merge requirements. Missing review cannot be treated as approval. Agent review does not substitute for the independent educator/legal validation required by content gates. This is a documented process; automated GitHub enforcement is not configured.

## Scope boundaries

No AI tutoring/grading service, automated course scraping, certification dumps, LMS integrations, binary evidence hosting or cloud dependency in the first release. These require separate decisions. A full curriculum is a continuing editorial program, not one mass-generated code milestone. Actual authorship/review capacity and learner time budget determine subsequent scheduling.
