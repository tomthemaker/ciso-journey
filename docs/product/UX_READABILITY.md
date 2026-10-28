# Readability and Today implementation

2026-10-28 · Refs [#46](https://github.com/tomthemaker/ciso-journey/issues/46) · [PR #49](https://github.com/tomthemaker/ciso-journey/pull/49). Implements the [approved design](../design/READABILITY_AND_TODAY.md), reviewed at `e0292f6`, on main `9d73f7a`. Final candidate and fresh runtime review are recorded in the PR; design approval does not approve this implementation.

Today and Lessons replace the global hero/tiles with compact identity, backup access and navigation. Storage/recovery warnings remain visible; healthy storage omits the redundant retry control. Today orders available due reviews, allowed new cards, unread latest lesson revisions and canonical incomplete tasks. Counts distinguish unavailable exact card revisions. Every unread lesson is linked; all open tasks appear in a labeled disclosure linking to their focused Roadmap context. These are incomplete tasks with no invented deadline. One primary action follows the eligible card, first unread lesson or first open task. Related reading/question/case selection remains `todayPlan`'s existing choice. Signals, planning estimates, card settings and detailed authorship remain accessible below the worklist.

Selected articles precede their collapsed catalog. Prose is 18px/1.65 with a maximum 66ch content measure; secondary text is at least 14px. Draft/stale/retired warnings remain visible near the title. Detailed authorship, section navigation and source information use native keyboard-accessible disclosures. Exact content references, original text, save/retry behavior and separate reading/task/resource/recall/question/assessment meanings are retained. No scheduler, storage, backup, schema, authored content, original fixture, dependency or CI changes are included.

## Validation and visual evidence

Node 24.4.1, cached Chromium; no browser install or browser CI. Commands:

```sh
npm ci
npm test
npm run typecheck
npm run test:browser -- --workers=2
npm run build
git diff --check
```

The 152 fast units and generated matrix pass. The full local desktop/mobile suite adds four checks to the inherited 72: truthful unread/open lists and independent completion, task-link focus, selected-article order, readable computed type, disclosure keyboard navigation and 200% reflow. The inherited flows cover Pages subpath assets/refresh/history; 37 IDs, six scores and v1/full backup round trips; loading/corrupt/future/stale storage recovery; exact unavailable revisions; due-before-new, overdue carryover, reveal/rating and failed-save same-rating retry.

The initial default six-worker exploratory run exposed two old selectors assuming the first reader disclosure was practice, a changed Today link label (restored), and wall-clock-sensitive fixed-time scheduler tests under load. Selectors now use the actual practice/section disclosure; the fixed clock jump in two due-priority tests now anchors to the persisted first-card due instant plus one second, because `clock.install` continues ticking while real UI actions run. Due counts, ordering, revealed-answer retention and exact retry assertions are unchanged; no scheduler, timeout or retry settings changed. The final supported two-worker run is recorded below.

Local uncommitted synthetic screenshots are in `/private/tmp/ciso-ux-evidence/`. Baselines: `{today,reading}-{desktop,mobile}.png`. After: `after-{today,reading}-{desktop,mobile}.png`; `after-today-populated-{desktop,mobile}.png`; `after-today-all-complete-{desktop,mobile}.png`. Additional `zoom200` and `mobile-zoom200` variants use half-size CSS viewports with device scale 2, matching the reflow and physical scale of 200% zoom; these do not automate browser-chrome zoom. Reading viewport captures and `after-metrics.json` support type/measure inspection. No real learner data or backups are included.

The baseline is the previously recorded development build at `f084fc2`; the after images use this built Pages artifact at 1440×900 and 390×844. Empty-review/unread/open and populated-overdue states use fresh synthetic contexts and real UI actions. The all-complete state uses the repository's synthetic preservation fixture plus synthetic current-reading entries. Independent review and educator/legal content gates remain separate; no teaching publication or release approval is claimed.

Visual inspection confirmed a single quiet work column, a reading action within the fresh mobile viewport, visible draft/recovery messages, and readable prose at each size. Computed prose is 18px/29.7px; actual content widths are 741px desktop and 324px mobile (654px/129px at the two zoom reflow widths). All recorded states have no horizontal page overflow. Foreground/background contrast: body on white 15.63:1; secondary on white/canvas 6.31:1/5.88:1; action/focus blue on white 7.28:1; control borders on white/canvas 3.47:1/3.23:1; draft warning on amber 7.50:1. These are calculated WCAG luminance ratios for the actual CSS colors, not a claim of a complete accessibility audit.

## Scope checkpoint

The owner subsequently requested a modern serif font, dark mode and a softer, paper-like light mode. Those additions are pending a fresh implementation run; the screenshots above record the coherent pre-theme checkpoint. They are not evidence that the expanded theme request is complete. The final combined candidate must receive its own checks and fresh independent task review.

Checkpoint validation: clean install (zero vulnerabilities), 152/152 units plus matrix, strict app/harness types and build pass. The final already-running 76-case browser run finished 74/76: all 72 inherited flows and both prose/reflow checks pass, including every persisted-due clock-anchor regression. The two new worklist cases fail only at their added post-reload task-label focus assertion; task-link click focus passed. A prior complete 76-case run passed before adding that refresh assertion. The fresh theme run must resolve the initial-load focus restoration gap in `renderRoadmap`/navigation and rerun the combined suite. No scheduler, data-preservation or retry assertion failed in this checkpoint run. Port 4174 is released; the separate Vite preview is retained.
