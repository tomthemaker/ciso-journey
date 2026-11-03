# CISO Journey

An account-backed web application for tracking an executive CISO development roadmap.

The weeks 1–4 learning loop is a **provisional AI-authored pilot**, with independent educator review outstanding. Read the [pilot notes and private recovery steps](docs/product/FOUNDATION_RELEASE_NOTES.md) and [release-gate evidence and limitations](docs/product/G01_RELEASE_GATE.md). No validated teaching release or readiness assessment is claimed.

## Start

Use Node 24.4.1+ and the Vite development server:

```sh
npm ci
npm run dev
```

Configure the public Supabase URL and publishable key as described in the [account guide](docs/product/ACCOUNTS.md), then open http://127.0.0.1:5173/ciso-journey/. GitHub sign-in is required. The TypeScript source needs a build/server; opening `index.html` directly does not run the app.

```sh
npm run typecheck
npm run build
npm run preview
# Open http://127.0.0.1:4173/ciso-journey/
npm test
# Local critical browser checks (install Chromium once):
npx playwright install chromium
npm run test:browser -- --workers=2
```

Fast unit checks run with `npm test`. CI adds typecheck/build; critical browser checks run locally against a production build under the actual Pages subpath. See [build, deployment, origin migration and rollback](docs/product/F02_BUILD_AND_DEPLOY.md) for the Actions publishing workflow and private recovery steps.

## Features

- Six phases covering an 18-month executive CISO learning roadmap
- 37 checklist tasks, including a detailed first 12 weeks
- Live progress metrics
- Editable competency self-assessments initialized from your scores
- Learning journal and achievement/evidence log
- Curated links to official security frameworks and certification programs
- JSON export/import backups
- Server-authoritative progress with revision-checked saves; responsive layout

## Notes about data

Progress is stored in your signed-in account. Use **Export backup** regularly; exports use version 2 and authenticated imports accept versions 1 and 2. Existing browser data is neither copied nor removed automatically. A failed or uncertain save leaves committed progress unchanged and requires reloading before retry. See the [account, backup and configuration guide](docs/product/ACCOUNTS.md).

## Security and privacy

The browser loads static assets and sends learner data to the configured account service. Session tokens stay in memory; only a short-lived PKCE verifier is stored for the sign-in redirect. External framework links open when clicked. Imported JSON is parsed as data and rendered with `textContent`, not injected as HTML. Only import backups you trust.

## Learning resources per roadmap task (v1.1)
Every roadmap task includes expandable supplementary courses/references plus clearly labeled LinkedIn Learning and Coursera discovery searches. Original lessons are the core teaching. Track a specific resource manually with status, completion date, notes and an optional HTTPS evidence link; custom resources support editing and reversible archive/restore with saved history. Resource completion stays separate from task completion, reading, recall and competency ratings. See [resource progress and recovery](docs/product/L02_RESOURCE_PROGRESS.md). Existing v1 backups can be imported explicitly after sign-in.

## Historical feature proposal: Resource-level learning and mastery tracking

This historical proposal is not current implementation authority; account and storage instructions below are superseded by [D046](docs/product/MEMORY.md#d046--required-github-account-and-server-authoritative-learning-2026-11-03). See the current [plan](docs/product/PLAN.md).

**Priority: High.** Currently, each roadmap task offers learning resources, but the app only tracks whether the *whole roadmap task* is complete. Add tracking that separately distinguishes **resource consumption**, **concept understanding**, and **demonstrated competency**. Completing a LinkedIn Learning course must not automatically mark a roadmap task or competency as mastered.

### User stories

- As a learner, I can mark each recommended resource (LinkedIn Learning, Coursera, official standards, etc.) as **Not started / In progress / Completed**, record a completion date and optional notes or evidence URL.
- As a learner, I can state what I understood from a resource and link it to the applicable roadmap task or competency.
- As a learner, I can track task mastery independently from resource completion using **Not assessed / Familiar / Can explain / Can apply / Can lead**, with a brief supporting example or artifact.
- As a learner, I can see on the dashboard **resources completed**, **tasks completed**, and **competency mastery** as different metrics. I can filter the roadmap by learning/resource status.
- As a learner, I can add my own resources to a task, especially LinkedIn Learning courses in my subscription, and edit or remove those custom resources.

### Implementation notes

1. Keep the current task IDs (`w1`–`w12`, `p2a`–`p6e`) stable and give each resource a **stable ID** rather than using a URL or array index as the sole identity. Existing `taskLearningResources` entries can be converted into records with `id`, `taskId`, `platform`, `title`, `url`, `type`, and `isCustom` fields. Treat search-result links as **discovery suggestions**, not courses the learner has actually completed.
2. Add separate state collections such as `resourceProgress` (`resourceId` → status, completedAt, notes, evidenceUrl), `taskMastery` (`taskId` → level, evidence, assessedAt), and `customResources`. Avoid encoding these in the existing `completed` object.
3. **Backward compatibility is mandatory:** the original localStorage key is `ciso-journey-v1`; existing data shape includes `completed`, `scores`, `journal`, and `achievements`. Load old data safely, use defaults for new fields, and preserve the meaning of previously checked-off roadmap tasks. Do not silently reset or reinterpret historical completions. Keep importing existing version-1 JSON backups; use a documented migration if changing backup versions.
4. Use accessible controls and clear visual differentiation for resource status versus demonstrated mastery. Make updating a resource status possible directly from its expanded roadmap panel.
5. Maintain local-first operation, no accounts or analytics, safe rendering of imported data, and working JSON export/import including the new fields.
6. Add tests for migration from v1, backup round-trips, resource/task independence, custom-resource editing, and handling of removed or renamed resource URLs.

### Definition of done

- Completing a course changes the resource progress metric but **does not** automatically mark its roadmap task complete or raise competency scores.
- A roadmap task can have several resource statuses, a separate mastery assessment, and supporting notes/evidence.
- Progress survives refresh, export/import, and upgrade from the existing app without data loss.
- The dashboard accurately distinguishes learning activity from proven capability, and documentation explains the difference.

**Suggested Codex prompt:** "Implement the README feature 'Resource-level learning and mastery tracking' in the existing CISO Journey app. Preserve current users' localStorage and v1 backup compatibility, use stable task/resource IDs, and add tests for the acceptance criteria. Keep the UI simple and local-first."

## CISO Journey 2.0 planning

A comprehensive learning platform is planned; the current foundation uses lightweight TypeScript modules, a static Vite build and transactional storage while retaining v1 import/data compatibility. Start with the [evaluated delivery plan](docs/product/PLAN.md), [goal evaluation](docs/product/EVALUATION.md), [shared product memory](docs/product/MEMORY.md) and [GitHub backlog](docs/planning/BACKLOG.md). Original lessons, explained questions, FSRS retrieval and executive practice will ship incrementally while preserving existing progress. LinkedIn Learning will supplement the teaching.

## Preservation checks and recovery

[F01 baseline and recovery](docs/product/V1_PRESERVATION.md) records all 37 actual task IDs, six score categories, browser interactions and private backup/recovery steps. Synthetic fixtures and browser tests preserve this contract before modularization. Imports validate the full v1/v2 payload before replacing progress; unsupported or malformed files leave current state untouched.

The app uses plain DOM TypeScript and pinned `ts-fsrs` for retrieval scheduling. Development, production builds and checks use the pinned npm tools; see the commands above. Keep private exports as backups.

CI runs only unit/type/build checks. Run local browser checks during implementation and independent review of runtime/test changes and before release; record exact-candidate results in the PR. See the [validation policy](AGENTS.md#validation-policy).

## Curriculum planning (C01)

The [versioned coverage matrix](docs/curriculum/COVERAGE.md) maps all 37 actual roadmap tasks to ten domains, the six existing competencies and four versioned framework references. Its [reusable JSON data](curriculum/c01.v1.json) includes observable objectives, prerequisite links and planned assessments, prioritizing weeks 1–4. This is provisional curriculum design; original lessons and independent educator/legal review are subsequent delivery gates. Validation commands and source limitations are documented in the matrix.
