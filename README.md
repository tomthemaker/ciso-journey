# CISO Journey

A local-first web application for tracking an executive CISO development roadmap.

The weeks 1–4 learning loop is a **provisional AI-authored pilot**, with independent educator review outstanding. Read the [pilot notes and private recovery steps](docs/product/FOUNDATION_RELEASE_NOTES.md) and [release-gate evidence and limitations](docs/product/G01_RELEASE_GATE.md). No validated teaching release or readiness assessment is claimed.

## Start

Use Node 24.4.1+ and the Vite development server:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173/ciso-journey/. The TypeScript source needs a build/server; opening `index.html` directly no longer runs the app.

```sh
npm run typecheck
npm run build
npm run preview
# Open http://127.0.0.1:4173/ciso-journey/
npm test
# Local critical browser checks (install Chromium once):
npx playwright install chromium
npm run test:browser -- --workers=4
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
- Transactional IndexedDB persistence; responsive layout; no analytics/tracking

## Notes about data

Data is saved in your current browser's IndexedDB. Existing `ciso-journey-v1` data migrates atomically and its original bytes remain untouched as a historical recovery copy. Use **Export backup** regularly: exports use version 2, and imports accept versions 1 and 2. Storage failures show recovery steps instead of resetting progress. Switching browser/device or clearing site data can lose progress; the app does not synchronize across devices. See [storage, backup compatibility and recovery](docs/product/F03_STORAGE_AND_RECOVERY.md).

## Security and privacy

The browser loads static HTML, JavaScript and CSS assets; no learner data is sent to a service. External framework links open in new tabs when clicked. Imported JSON is parsed as data and rendered with `textContent`, not injected as HTML. Only import backups you trust. No authentication is provided because this prototype stores data only in your browser.

## Learning resources per roadmap task (v1.1)
Every roadmap task includes expandable supplementary courses/references plus clearly labeled LinkedIn Learning and Coursera discovery searches. Original lessons are the core teaching. Track a specific resource manually with status, completion date, notes and an optional HTTPS evidence link; custom resources support editing and reversible archive/restore with saved history. Resource completion stays separate from task completion, reading, recall and competency ratings. See [resource progress and recovery](docs/product/L02_RESOURCE_PROGRESS.md). Prior `ciso-journey-v1` progress is preserved through the IndexedDB migration in the same browser and origin. If moving between file locations/browsers, export a JSON backup from the old app and import it into the updated one.

## Recommended next feature for Codex: Resource-level learning and mastery tracking

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

The app uses plain DOM TypeScript and pinned `ts-fsrs` for retrieval scheduling. Development, production builds and checks use the pinned npm tools; see the commands above. Browser storage does not guarantee offline app availability. Keep private exports before changing origin, browser or device.

CI runs only unit/type/build checks. Run local browser checks during implementation and independent review of runtime/test changes and before release; record exact-candidate results in the PR. See the [validation policy](AGENTS.md#validation-policy).

## Curriculum planning (C01)

The [versioned coverage matrix](docs/curriculum/COVERAGE.md) maps all 37 actual roadmap tasks to ten domains, the six existing competencies and four versioned framework references. Its [reusable JSON data](curriculum/c01.v1.json) includes observable objectives, prerequisite links and planned assessments, prioritizing weeks 1–4. This is provisional curriculum design; original lessons and independent educator/legal review are subsequent delivery gates. Validation commands and source limitations are documented in the matrix.
