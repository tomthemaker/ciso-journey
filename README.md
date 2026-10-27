# CISO Journey

A single-file, local-first web application for tracking an executive CISO development roadmap.

## Start

Open `index.html` in a modern browser. No installation, account, server, dependencies, or internet access needed (except to follow external reference links).

To run with a local development server instead:

```bash
cd ciso-journey
python3 -m http.server 8080
```

Open http://localhost:8080.

## Features

- Six phases covering an 18-month executive CISO learning roadmap
- 37 checklist tasks, including a detailed first 12 weeks
- Live progress metrics
- Editable competency self-assessments initialized from your scores
- Learning journal and achievement/evidence log
- Curated links to official security frameworks and certification programs
- JSON export/import backups
- Browser localStorage persistence; responsive layout; no analytics/tracking

## Notes about data

Data is saved in your current browser's localStorage. Switching browser or device, or clearing site data, may lose progress. Use **Export backup** regularly. Importing a backup replaces existing local progress. The app does not synchronize across devices.

## Good Codex handoff tasks

1. Convert this single-file app into React + TypeScript + Vite.
2. Add milestones, custom learning tasks, due dates, and edit controls.
3. Add spaced repetition or quizzes for concepts.
4. Model competencies, concepts, frameworks and evidence as a knowledge graph.
5. Add optional private synchronization, with user-selected storage.
6. Add CSV/Markdown exports and weekly learning reports.

## Security and privacy

No network requests are made by the app itself. External framework links open in new tabs when clicked. Imported JSON is parsed as data and rendered with `textContent`, not injected as HTML. Only import backups you trust. No authentication is provided because this prototype stores data only in your browser.

## Learning resources per roadmap task (v1.1)
Every roadmap task includes expandable learning suggestions, with LinkedIn Learning as the preferred platform, official standards, and Coursera discovery links. Verified LinkedIn courses are linked directly; targeted LinkedIn and Coursera course searches are provided to accommodate catalog changes. Progress storage continues to use `ciso-journey-v1`, preserving prior progress in the same browser and origin. If moving between file locations/browsers, export a JSON backup from the old app and import it into the updated one.

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
3. **Backward compatibility is mandatory:** current localStorage key is `ciso-journey-v1`; existing data shape includes `completed`, `scores`, `journal`, and `achievements`. Load old data safely, use defaults for new fields, and preserve the meaning of previously checked-off roadmap tasks. Do not silently reset or reinterpret historical completions. Keep importing existing version-1 JSON backups; use a documented migration if changing backup versions.
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

A comprehensive learning platform is planned; the current app retains its single-file runtime and v1 data format. Start with the [evaluated delivery plan](docs/product/PLAN.md), [goal evaluation](docs/product/EVALUATION.md), [shared product memory](docs/product/MEMORY.md) and [GitHub backlog](docs/planning/BACKLOG.md). Original lessons, explained questions, FSRS retrieval and executive practice will ship incrementally while preserving existing progress. LinkedIn Learning will supplement the teaching.

## Preservation checks and recovery

[F01 baseline and recovery](docs/product/V1_PRESERVATION.md) records all 37 actual task IDs, six score categories, browser interactions and private backup/recovery steps. Synthetic fixtures and browser tests preserve this contract before modularization. Imports validate the full v1 payload before replacing progress; unsupported or malformed files leave current state untouched.

Run fast checks with Node 20+:

```sh
npm ci
npm test
```

Run critical browser checks locally during implementation/review of runtime or test changes and before release (Python 3 required):

```sh
npx playwright install chromium
npm run test:browser
```

CI runs the fast unit layer. The app itself still needs no build or installed dependencies. Browser tests run the actual `index.html` in desktop Chromium and mobile Chromium emulation; see the [validation policy](AGENTS.md#validation-policy) for evidence reuse and release gates.
