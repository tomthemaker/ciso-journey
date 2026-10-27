# CISO Journey 2.0 — Learning Platform Product and Implementation Plan

**Status:** Proposed / implementation-ready specification for Codex  
**Scope:** An executive-level, 18-month CISO learning journey with spaced repetition, competency mastery, a knowledge model, and verifiable career evidence.  
**Current baseline:** `index.html` single-file application; six phases, 37 existing task IDs, task-specific LinkedIn Learning/Coursera/official links, self-assessments, journal, achievements, localStorage backups.

## 1. Product vision

Transform a checklist app into a **personal executive cybersecurity learning system** that answers:

- **What next?** A practical, sequenced learning plan for the CISO role.
- **Where?** Recommended LinkedIn Learning courses first; then authoritative standards, selected Coursera content and books.
- **What did I learn?** Concepts, facts, frameworks, decisions, and links among them.
- **What am I forgetting?** Recall-based spaced repetition scheduled by FSRS.
- **Can I apply it?** Realistic CISO decisions, written cases, rubrics, feedback and evidence.
- **Am I becoming ready?** Separate measures of roadmap execution, retained knowledge, applied competence, and leadership achievements.

**Learning loop:** plan -> study -> capture -> recall -> apply -> evidence -> reassess -> reprioritize.

**Design rule:** Course completion, task completion, memory retention and applied mastery are distinct states. Never auto-upgrade mastery because a resource was watched or a flashcard was answered.

## 2. Learner baseline and targets

Preserve these user-entered starting scores in the app:

| Competency | Initial (0–4) | Aspirational month-18 target |
|---|---:|---:|
| Security architecture | 0 | 2–3 |
| Cyber-risk management | 1 | 3 |
| Governance | 0 | 3 |
| Compliance | 0 | 3 |
| Security operations | 0 | 2–3 |
| Executive reporting | 2 | 4 |

The six current categories should remain supported. New categories may be nested below them rather than renaming them without migration. Explicitly label targets as goals, not measured predictions.

## 3. Learning content scope

Retain the existing six chronological phases and all 37 task IDs (`p1a`, etc.). Map each to 3–8 selected learning concepts at first; do **not** flood the learner with automatically generated flashcards. The full content architecture can later be expanded around:

1. Security principles, data and asset protection
2. Security architecture, IAM and Zero Trust
3. Enterprise governance and security operating models
4. Cyber-risk identification, analysis, FAIR and decisions
5. ISMS, ISO 27001/27002, audit, compliance and assurance
6. Security operations, incidents, threat intelligence and recovery
7. Business continuity, resilience and third-party risk
8. Privacy, Swiss/EU regulatory awareness and AI governance
9. Cybersecurity strategy, budgets, KPI/KRI and board communications
10. Security culture, leadership and ethical decision-making

Every concept should link to at least one competency and may link to several roadmap tasks. A concept can belong to one or more frameworks (e.g., CISSP, NIST CSF, ISO 27001, CISM) without duplicating it as separate content.

## 4. Major screens

### Today (new home screen)
- **Reviews due today**, new cards suggested and time estimate; review queue first.
- One current learning milestone, its best LinkedIn Learning resource, and a related practice exercise.
- A priority weak competency and upcoming milestone.
- Distinct high-level signals: task completion, course/resource progress, recall success over time, applied-mastery assessments and portfolio artifacts.
- Never reduce the entire system to one misleading 'mastery %'.

### Roadmap (upgrade existing)
- Six phases with stable task IDs, prerequisites and estimated effort.
- LinkedIn Learning first; official standards and Coursera as alternatives or supplements.
- Resource states: not started / in progress / completed; course link and notes.
- Task states: not started / learning / practicing / demonstrated / completed; separately from resource state.
- Direct navigation to related concepts, due flashcards, case studies, and evidence.

### Knowledge (new)
- Searchable concept library with definition, explanations, trusted references and cross-links.
- Relationship types: prerequisite-of, supports, mitigates, governs, measures, required-by.
- For initial release use a relational graph model; a graph database is **not** needed.
- Provide 'I can explain' and 'I can apply' separately from memory recall indicators.

### Review (new)
- Prompt-first retrieval: ask the question before showing the answer.
- Card types: basic Q&A, contrast, cloze, process/sequence, executive scenario.
- Reveal answer, then select **Again / Hard / Good / Easy**.
- Show the source and concept link after the answer; optionally record an explanation.
- Offer a 10–20-minute daily mode (5–15 new cards max, configurable; reviews prioritized).
- Display due date and learning streak as supplemental motivation, not as proof of mastery.

### Apply and Evidence (new)
- Executive scenarios and structured responses: risk, impact, options, recommended decision, accountable owner and residual risk.
- Mark response against an explicit rubric, not a string-match score.
- Attach evidence such as a risk register, ISO 27001 gap assessment, incident tabletop, board report or certificate.
- Link each artifact to competencies and roadmap tasks. Support private notes and references.

### Progress and Career (upgrade)
- Trends over time in reviews, assessed concepts and completed learning milestones.
- Distinguish memory retention estimations from independently demonstrated competencies.
- Quarterly self-assessment against the six starting competencies.
- Certification checkpoints for CISM/CISSP, plus portfolio readiness; avoid implying eligibility from course completion.

## 5. Spaced repetition engine

Use the actively maintained **`ts-fsrs`** TypeScript library (`https://github.com/open-spaced-repetition/ts-fsrs`) rather than implementing the scheduling mathematics manually. Initial target retention 0.90, user configurable. Store complete card state and an immutable history of review events, not only the next due date.

- **Again** = could not recall; **Hard** = did recall but with major effort; **Good** = recalled with normal effort; **Easy** = recalled confidently.
- A mistaken answer must be graded Again, *not* Hard.
- Card ratings update only recall scheduling; they must not automatically change applied-mastery levels.
- After a missed study day, keep due cards; let the user process a manageable queue across sessions rather than deleting overdue work.
- Allow suspend/resume, edit and archive cards without deleting historical review events.
- Initially ship curated cards written for the 12-week foundation; later allow user-authored cards.
- AI card generation may be a future optional feature, but **requires user review of generated cards and source attribution** before activation.

Examples of executive-level retrieval prompts:

| Related concept | Example prompt | Expected understanding |
|---|---|---|
| Risk terminology | How do a threat, vulnerability, asset and business impact relate? | A causal risk scenario, not four isolated definitions |
| Risk treatment | Who may accept residual cyber risk, and on what basis? | Designated accountable business authority, within delegated limits |
| IAM | Why is privileged access governance a board-relevant topic? | Consequences for critical services, likelihood/impact and investment rationale |
| Governance | Contrast security policy, standard, procedure and control. | Different roles in directing and demonstrating security |
| Incident response | Which executive decisions arise in the first hours of a major incident? | Safety/continuity, escalation, response coordination, obligations and communications |
| ISO 27001 | What is a Statement of Applicability used for? | Rationale for Annex A controls, inclusion/exclusion and implementation status |

Scenario mastery should use a four-level rubric: **Recognize -> Explain -> Apply -> Lead** with recorded evidence; no flashcard can substitute for applied evidence.

## 6. Recommended data model

Existing state: `completed`, `scores`, `journal`, `achievements` under localStorage key `ciso-journey-v1`. Maintain migration support.

Suggested entities (stable UUID or slug identities, plus timestamps):

| Entity | Important fields / relationships |
|---|---|
| `roadmap_tasks` | `id`, `phaseId`, `title`, `outcome`, `position`, `prerequisiteIds` |
| `resources` | `id`, `platform`, `title`, `url`, `contentType`, `isDiscoveryLink`, `sourceVerifiedAt` |
| `task_resources` | `taskId`, `resourceId`, `priority` |
| `resource_progress` | `userId`, `resourceId`, `status`, `startedAt`, `completedAt`, `notes` |
| `competencies` | `id`, `name`, `description`, `targetLevel` |
| `concepts` | `id`, `title`, `explanation`, `references`, `domain` |
| `concept_links` | `fromConceptId`, `toConceptId`, `relationType` |
| `task_concepts` / `concept_competencies` | M:N relationships |
| `review_cards` | `id`, `conceptId`, `type`, `front`, `back`, `sourceIds`, `active` |
| `card_scheduling` | `userId`, `cardId`, serialized library card scheduling state, `dueAt`, `version` |
| `review_events` | `id`, `userId`, `cardId`, `reviewedAt`, `rating`, `elapsedMs`, scheduling result, `deviceId` |
| `mastery_assessments` | `id`, `userId`, `conceptId` or `competencyId`, `level`, `evidenceIds`, `assessedAt` |
| `evidence_artifacts` | `id`, `userId`, `title`, `type`, `description`, `url`, `createdAt` |
| `task_progress` | `userId`, `taskId`, `status`, `completedAt`, `notes` |
| `learner_settings` | time budget, FSRS desired retention, timezone, review limits |

Keep versioned backup schema and export all learning history, not only aggregates. Avoid a single unstructured JSON blob once cloud sync exists.

## 7. Implementation architecture

**Recommended evolution:** GitHub Pages static hosting + Vite + TypeScript, with components/modules rather than one growing HTML file. Keep UI lightweight; React is optional and should only be adopted if its complexity is justified. The existing app must remain usable during migration.

Suggested modules: `roadmap`, `resources`, `concepts`, `reviews`, `mastery`, `portfolio`, `storage`, `sync`, `migration`.

**Local-first first:** Preserve localStorage v1 import, then use IndexedDB for the larger structured review history if necessary. Keep JSON backup export/import. Do not silently erase old local data.

**Cross-device when ready:** Supabase Auth and Postgres for private synchronization. Turn on RLS for every exposed user-owned table, enforce ownership using the authenticated user ID, and **never** ship a service-role key in frontend code. Treat reviews as append-only events with unique IDs to mitigate duplicates; define conflict resolution for editable notes explicitly. Test across desktop and mobile. See `https://supabase.com/docs/guides/database/postgres/row-level-security`.

**LinkedIn Learning:** Link out to recommended courses and let the user mark completion manually. A personal subscription does **not** imply access to enterprise LinkedIn Learning reporting APIs, which generally require an enterprise license/admin access. Do not scrape or copy copyrighted course content into the app. See `https://learn.microsoft.com/en-us/linkedin/learning/getting-started/request-access`.

**Privacy:** Personal notes, assessment evidence and imported backups are private by default; do not commit them to the public GitHub repository. Escape untrusted content safely and validate imported data. Never place secret tokens in frontend code.

## 8. Implementation milestones / Codex backlog

### Milestone A — Preservation, modularization and test baseline
- Export verified v1 sample backups and create regression tests for 37 IDs and all current features.
- Add TypeScript/Vite modules and maintain deployment to GitHub Pages under a repository subpath.
- Implement backup schema versioning and migration from v1 with round-trip tests.
- **Done when:** An existing v1 backup imports without changes to completed tasks, self-ratings, journal or achievements.

### Milestone B — Resource progress and related concepts
- Implement the already specified README feature `Resource-level learning and mastery tracking`.
- Add curated concepts for foundation weeks 1–4 and map them to tasks, resources and competencies.
- **Done when:** Completing a LinkedIn course updates only resource status, not task mastery.

### Milestone C — Spaced repetition MVP
- Add `ts-fsrs`, card/editor schema, due queue, four review buttons, review history, and configurable daily caps.
- Seed carefully curated cards for foundation weeks 1–4.
- **Done when:** Review scheduling works reproducibly with clock-controlled tests, and review history survives refresh, backup and restore.

### Milestone D — Executive application and competency evidence
- Add scenario prompts, self-assessment rubric, evidence uploads/links and quarterly competency reviews.
- Seed one case scenario per foundational competency.
- **Done when:** Course, card, task and competency states can diverge correctly and dashboard labels make these distinctions visible.

### Milestone E — Full-roadmap content and usable analytics
- Map the 37 tasks to a curated concept catalogue, selected cards and relevant practical cases.
- Add 'Today' dashboard, filters, progress trends and accessible mobile controls.
- **Done when:** A learner can complete the daily cycle solely from Today and navigate to source tasks/concepts.

### Milestone F — Optional private cross-device sync
- Add email/password or passwordless login; Supabase RLS and private sync.
- Account for timezone and offline usage; manual export remains supported.
- **Done when:** Two authenticated devices converge without duplicate review events or leaking data between accounts.

These are sequential implementation milestones, **not** promises that all features can or should be built at once.

## 9. Test and acceptance criteria

1. The existing 37 task IDs and historical checkboxes retain their exact meaning.
2. Existing localStorage key `ciso-journey-v1` and version-1 JSON backups remain readable.
3. Resource completed != task completed != card recalled != competency mastered.
4. Every card has a stable ID, explicit source and associated concept.
5. Review ratings preserve a durable event log and update due dates correctly.
6. Tests cover timezone boundaries, deterministic dates, duplicate submissions and overdue cards.
7. Imported text and resource URLs cannot execute scripts in the UI.
8. Backups contain all review history, notes, resources and evidence metadata.
9. Personal LinkedIn Learning subscription usage is respected; no unsupported completion API is assumed.
10. Sync, if implemented, has account isolation/RLS tests and avoids frontend secrets.
11. Keyboard/mobile accessibility covers all essential learning and review flows.
12. A README section explains how to run, deploy, import, test and migrate the app.

## 10. Suggested prompt for Codex

> Extend the existing CISO Journey repository according to `docs/CISO_LEARNING_PLATFORM_PLAN.md`. Implement **Milestone A** first, including backup-compatibility tests for `ciso-journey-v1`, stable roadmap IDs, TypeScript/Vite organization, and GitHub Pages deployment. Do not change product behavior or wipe user data during migration. Then implement **Milestone B** with separate tracking for learning resources, concepts and mastery. Do not start spaced repetition or Supabase until the preceding milestone passes its acceptance tests. Commit changes in small reviewable steps and update README instructions.

## Reference links

- [NIST CSF 2.0](https://www.nist.gov/cyberframework)
- [ISO/IEC 27001](https://www.iso.org/standard/27001)
- [CISM](https://www.isaca.org/credentialing/cism)
- [CISSP](https://www.isc2.org/certifications/cissp)
- [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)
- [GitHub Pages docs](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Supabase Row Level Security docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [LinkedIn Learning API access](https://learn.microsoft.com/en-us/linkedin/learning/getting-started/request-access)
