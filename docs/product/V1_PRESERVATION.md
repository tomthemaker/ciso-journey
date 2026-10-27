# V1 preservation baseline and recovery

Issue: [F01 / #3](https://github.com/tomthemaker/ciso-journey/issues/3). Captured 2026-10-27 from `index.html` at `86be75d`, before F02 modularization. The machine-readable baseline is [inventory.json](../../tests/fixtures/v1/inventory.json); it freezes actual titles, outputs, phases, score defaults and reference destinations. This inventory records existing behavior, not independent validation of the curriculum or linked sources.

## Data contract

The browser key is `ciso-journey-v1`. Its value is `{completed, scores, journal, achievements}`. Completion values are booleans keyed by the exact task IDs below; a false value and an absent value both display unchecked, but export preserves explicit false values. Scores are integer self-ratings from 0 to 4, independent of task/resource completion. Journal and achievement entries use `{id, date, title, body}`; dates are real Gregorian calendar dates in `YYYY-MM-DD` form (also preserving supported longer legacy years), and histories display newest date first without changing stored array order. Extra JSON fields survive import/export; missing legacy score categories use the original defaults.

The v1 backup envelope is `{app: "CISO Journey", version: 1, exportedAt: "<UTC timestamp>", data: <state>}`. The app still exports and imports this format. Synthetic fixtures cover empty, mixed and fully completed states; none contain real learner data.

## Stable task meanings

| Phase | ID | Task | Expected output |
|---|---|---|---|
| p1 | `w1` | Week 1 · CIA triad, assets, threats, vulnerabilities, controls | Produce a security vocabulary and concept map |
| p1 | `w2` | Week 2 · Authentication, authorization, IAM, MFA, PAM | Draw an identity-security reference architecture |
| p1 | `w3` | Week 3 · Networking, segmentation, endpoints, Zero Trust | Create an enterprise security architecture diagram |
| p1 | `w4` | Week 4 · Encryption, classification, backups and recovery | Draft a data protection control assessment |
| p1 | `w5` | Week 5 · Cloud, containers and supply-chain security | Review shared-responsibility and key AWS/Azure risks |
| p1 | `w6` | Week 6 · Threat modeling and common attack paths | Document five realistic threat scenarios |
| p1 | `w7` | Week 7 · NIST CSF 2.0 functions and categories | Create an initial security capability map |
| p1 | `w8` | Week 8 · NIST CSF organizational profiles | Draft a current vs target capability profile |
| p1 | `w9` | Week 9 · Governance structures, policies, decisions | Draft a security governance charter |
| p1 | `w10` | Week 10 · Likelihood, impact and risk treatment | Start an enterprise risk register |
| p1 | `w11` | Week 11 · Security metrics and indicators | Create an executive security scorecard |
| p1 | `w12` | Week 12 · Integrated security assessment | Deliver a short CISO assessment report |
| p2 | `p2a` | Study NIST CSF Govern function and COBIT principles | Define responsibilities and decision rights |
| p2 | `p2b` | Study risk appetite, tolerance, ownership and acceptance | Write an enterprise risk management policy |
| p2 | `p2c` | Practice FAIR-style risk scenarios and uncertainty | Quantify or range-estimate three loss scenarios |
| p2 | `p2d` | Create risk taxonomy and prioritization criteria | Build a risk register with treatment decisions |
| p2 | `p2e` | Produce a board-level governance report | Explain top risks, decisions and owners |
| p3 | `p3a` | Study ISO/IEC 27001 and 27002 | Define ISMS scope and policy hierarchy |
| p3 | `p3b` | Learn control selection and statement of applicability | Create a sample control mapping |
| p3 | `p3c` | Study audit planning and evidence collection | Run a mock control gap assessment |
| p3 | `p3d` | Review Swiss FADP, GDPR, NIS2, DORA and AI Act applicability | Create a regulatory obligation register |
| p3 | `p3e` | Build an ISMS management review package | Draft a remediation and audit calendar |
| p4 | `p4a` | Study SOC models, detection and vulnerability management | Define security operations KPIs and ownership |
| p4 | `p4b` | Study NIST incident response guidance | Draft severity levels and escalation matrix |
| p4 | `p4c` | Study crisis management and communication | Prepare ransomware decision exercise |
| p4 | `p4d` | Learn business impact analysis, RTO, RPO and recovery | Create critical service recovery priorities |
| p4 | `p4e` | Conduct an incident tabletop | Write an after-action and improvement report |
| p5 | `p5a` | Design security organization and operating model | Define roles, committees and sourcing choices |
| p5 | `p5b` | Develop three-year security strategy | Prioritize investments and milestones |
| p5 | `p5c` | Build a risk-based security budget | Create two investment business cases |
| p5 | `p5d` | Design executive security performance reporting | Build a board dashboard and narrative |
| p5 | `p5e` | Present strategy and risk tradeoffs | Produce a board-level decision memo |
| p6 | `p6a` | Reassess all six competencies with evidence | Document demonstrated strengths and remaining gaps |
| p6 | `p6b` | Review CISM and CISSP eligibility and exam readiness | Choose realistic exam dates if appropriate |
| p6 | `p6c` | Lead or contribute to a real security/GRC initiative | Record measurable organizational impact |
| p6 | `p6d` | Compile executive security portfolio | Package strategy, risk, ISMS, incident and board artifacts |
| p6 | `p6e` | Practice CISO interview and board scenarios | Write a 90-day plan for your first CISO-track role |

There are 12 foundation IDs (`w1`–`w12`) and five IDs in each later phase (`p2a`–`p6e`): 37 total. There are no `p1a` tasks.

| Self-rating category | Default |
|---|---|
| Security architecture | 0/4 |
| Cyber-risk management | 1/4 |
| Governance | 0/4 |
| Compliance | 0/4 |
| Security operations | 0/4 |
| Executive reporting | 2/4 |

Defaults describe the prototype's starting values; they are not measured learner competence. Existing overrides must survive unchanged.

## Browser interaction inventory and baseline flows

| Area / interaction | Expected baseline behavior | Regression coverage |
|---|---|---|
| Start / refresh | Roadmap active; six phase cards, 37 tasks, overall percentage/count, task/journal/achievement counts and six-score average. Existing same-origin storage loads without a write. | Exact defaults, stored-byte preservation, refresh, aggregate and per-phase progress. |
| Five section buttons | Roadmap, Competencies, Learning journal, Achievements and Resources switch the active view; navigation is temporary. | Every section visited through its real button. |
| Task checkbox / label | Set its original ID to true or false, update phase and total progress, persist. It does not change scores or create entries. | All 37 checked individually and mapped to stored IDs; keyboard Space toggles the first task back to false. |
| Phase filter | All tasks or incomplete tasks. Completed tasks disappear; completed phases disappear; fully completed roadmap shows the congratulations message. Filter is temporary. | Full-complete empty state and single incomplete task. |
| Per-task disclosure | Expand/collapse suggestions and study focus. Every task offers LinkedIn course/path, targeted LinkedIn search, official reference and Coursera search; p2/p3 add a governance/compliance course link. | All 37 disclosures and exact frozen hrefs; safe new-tab attributes. No network navigation or claim of external link health. |
| Six competency selects | Each accepts 0–4; save independently, update average. Initial score summary stays fixed. | All category defaults, overrides through select controls, import values and reset average. |
| Journal form | Required date/topic/body; topic max length 140; submit appends generated ID, trimmed title/body, date; form clears and date defaults to today. | Keyboard submit, date and multiline body, generated ID, clear, refresh and imported date ordering. |
| Achievement form | Required date/title (max length 160), optional evidence body; submit appends generated ID and clears form. | Submit with empty evidence, persistence and imported entry rendering. |
| Delete on either history | Native confirmation; accept removes only matching entry and updates count, cancel leaves entry. | Both histories delete; achievement cancellation; empty histories. |
| Export button | Download dated JSON v1 envelope containing complete current state. No state changes. | Parse real downloaded bytes; compare every value; re-import exported file. |
| Import button / picker | Single JSON file chooser. Validate full payload, then ask before replacing state. Success alert and clear file input; retry can select the same file. | Chooser, all three fixtures, confirmation, cancellation, repeated selections. |
| Invalid / unsupported import | Reject invalid JSON, wrong app/version or malformed state/entries before any write; report an error and keep current state. Failed persistence also keeps the live state. | 25 malformed/future variants plus 13 impossible dates in each history against occupied state, stored bytes and live export; valid leap-day round-trips; injected quota failure. |
| Reset button | Confirmation warns that a backup is needed; accept clears completions, histories and restores six defaults; cancel changes nothing. | Accept, cancel, exact saved defaults and reload. |
| General Resources | Nine official/reference links open in new tabs. | Exact frozen title, description and URL inventory. |
| Responsive / keyboard / print | One-column layout below 850px; section bar scrolls; native buttons, selects, checkboxes and forms remain usable. Print reveals all views and hides actions. | Full suite in desktop Chromium and Pixel 7 Chromium emulation; checkbox/submit keyboard smoke; no document overflow; print CSS smoke. |

The baseline intentionally has no resource-level progress, recall, questions or applied assessment. These later entities must remain separate from v1 task completion and self-ratings.

## Reproduce the preservation checks

The app still needs no build or runtime dependencies. Browser checks require Node 20+ (CI uses 22), npm and Python 3:

```sh
npm ci
npx playwright install chromium
npm test
```

`npm run test:desktop` and `npm run test:mobile` run one viewport. Playwright starts a local Python server on `127.0.0.1:4173`; use a free port and stop any unrelated server there. Each test starts with an isolated browser context. `tests/fixtures/v1/inventory.json` is frozen test evidence, not runtime source. The GitHub Actions V1 preservation job runs both projects and uploads failure traces only. Trace files may contain entered data, so use synthetic data exclusively.

## Recorded validation — 2026-10-27

- Candidate: `npm test -- --workers=4` passed 22/22 tests (11 flows in each Chromium project; 59.3 seconds) on macOS with Node 26.10.0. The workflow repeats this suite on Ubuntu / Node 22.
- Regression sensitivity: with only `index.html` temporarily reverted to baseline `86be75d`, `npm run test:desktop -- --workers=1 --grep 'cancelled import and failed persistence'` failed as expected: after a synthetic quota error the stored original bytes survived but exporting live state returned the rejected candidate. Restoring the candidate makes this check pass. No learner state or external site was used.
- `git diff --check` passed. CI and the independent reviewer record belong to the linked issue/PR; these local results do not claim review approval.

Calendar-date review fix, 2026-10-27: the independent review of `9ba6a43` in [PR #27](https://github.com/tomthemaker/ciso-journey/pull/27#issuecomment-6440671105) found that `Date.parse` normalized impossible dates. Import now checks month lengths and the Gregorian leap-year rule before parsing for the existing supported date range. Both journal and achievement regressions reject February 30, February 29 in ordinary/century non-leap years, all four 30-day-month overflows, and zero/out-of-range months and days before confirmation. Each rejection preserves occupied stored bytes and live exported data; refresh also preserves the original state. Valid 2024/2000 leap days, normal month/year boundaries, a padded year and a longer legacy year round-trip in both histories.

The new journal rejection test failed against the pre-fix `9ba6a43` runtime on `2026-02-30` (unexpected replacement confirmation), proving regression sensitivity. The updated full suite passed 28/28 browser tests across both Chromium projects with `CI=1 npm test -- --workers=4` on macOS / Node 26.10.0. `npm ci` and `git diff --check` passed. No new product decision or scope change; this completes D015's existing malformed-import requirement and awaits independent verification of the updated candidate.

## Download-burst CI stabilization — 2026-10-27

Infrastructure issue: [#29](https://github.com/tomthemaker/ciso-journey/issues/29), prompted by the [C01 CI review](https://github.com/tomthemaker/ciso-journey/pull/28#issuecomment-6440878704). Run [40496743587](https://github.com/tomthemaker/ciso-journey/actions/runs/40496743587) used unchanged main/F01 runtime and tests. Attempt 1 timed out on five real export downloads: four after ten completed downloads, one after twenty. In each trace, the blocked export click followed the first of its preceding ten download events by 786–927 ms. No preceding rejection, stored-byte or exported-value assertion failed.

The pinned Playwright browser is Chromium **156.0.8078.4**. Its [Blink download implementation](https://chromium.googlesource.com/chromium/src/+/refs/tags/156.0.8078.4/third_party/blink/renderer/core/frame/local_frame.cc) defines `kBurstDownloadLimit = 10`; `LocalFrame::ShouldThrottleDownload` returns without starting another download after ten requests until more than one second has elapsed. This source and the trace counts/timing support a per-frame burst-throttling diagnosis. The traces do not expose the limiter's internal counter directly. No application defect was demonstrated.

The test change partitions the exact original **25 malformed/future payloads** into five occupied-state batches and the exact original **13 impossible dates per history** into three batches each. Every individual rejection still checks error-only dialogs before confirmation, unchanged stored bytes, the existing task-count UI and the full live `data` from a real downloaded backup. Each batch adds a real baseline export and a real post-reload export; malformed batches also retain valid-file retry. Each page/context therefore downloads at most **seven** files (one baseline + at most five rejection exports + one after reload), guarded by the shared export helper even across reloads. Explicit step labels identify all 25 malformed cases and each invalid date. Adding cases creates another isolated batch. The six valid-date round-trips, all fixture round-trips, all 37 task IDs, six legacy scores, extension fields, cancellation and persistence-failure checks remain covered. Runtime, fixtures, Playwright/browser versions, configuration, retries (zero), timeout and workflow are unchanged.

Validation on macOS / Node **24.4.1**:

- `npm ci` passed; `CI=1 npm test -- --workers=2` passed **44/44** desktop/mobile browser tests in 44.2 seconds. The larger test count reflects the eleven rejection batches replacing three long loops, not additional invalid payloads.
- A direct ordered comparison against main `17124e4` confirmed all 25 malformed payload strings are byte-identical, all labels are unique, and the 13-date list is unchanged in both histories.
- With runtime temporarily replaced by pre-calendar-fix `9ba6a43`, the first journal and achievement date batches both failed on `2026-02-30` because replacement confirmation incorrectly appeared. With a temporary mutation only on the last malformed case (duplicate ID), leaving stored bytes and task count intact but changing the live Governance score from 2 to 0, the real post-rejection export assertion failed. Both diagnostic runtime changes were restored; neither is committed. This confirms that batching retains early rejection and full live-state regression proof, including the former long-loop tail.
- `git diff --check` passed. Exact-candidate CI and the separate independent reviewer verdict are recorded in #29 and its PR; these local checks do not claim approval. The browser download path is exercised without mocks or disabled protections. Chromium emulation remains distinct from physical devices and other browser engines.

No product decision changed or was superseded; this stabilizes the existing D015 preservation evidence.

## Learner backup and recovery

1. Before an upgrade, reset, browser change or move to another URL, use **Export backup** in the original working browser. Keep the downloaded JSON privately outside Git. Export the destination browser's state too if it already contains learning history; import replaces it rather than merging.
2. Check the backup opens as JSON and has `app: "CISO Journey"`, `version: 1` and all four data collections. Keep the original file unchanged. A safe rehearsal uses a separate browser profile and confirms tasks, all six scores, journal and achievements after import and refresh.
3. Open the intended app URL, choose **Import backup**, select the file, and accept replacement only after saving the destination backup. After success, refresh and check representative task IDs, scores and both histories; export again and compare the `data` values. Envelope export timestamps will differ.
4. A rejection or cancelled import leaves existing data untouched. Keep both files, check that the selected file is a complete supported v1 export, and retry with a known-good backup. Do not reset as an import repair step. A storage error may require freeing space for this origin or another browser profile; preserve the backup first. Future-version files require the matching app version rather than manually changing their version number.
5. Storage belongs to a browser profile and origin (scheme, host, port). The same HTTPS origin shares localStorage across URL paths; another host, port or browser does not. File-URL storage behavior varies by browser. Export from the old location before moving, then import into the new location. A copied app file alone does not transfer learning data.
6. If the UI cannot start, leave browser site data intact. In that original origin's developer console, read `localStorage.getItem('ciso-journey-v1')` and privately save the returned raw JSON text before changing anything. This raw value is state, not a backup envelope. Wrap a *copy* as the `data` field of the v1 envelope shown above to attempt recovery in an isolated profile. Never paste real state into an issue or commit it. Malformed existing storage cannot be assumed repaired by this task; keep its original bytes for F03 recovery work.
7. For a code rollback, serve the prior reviewed `index.html` at the same origin without clearing site data. Its v1 key/envelope remain compatible. If moving to another origin, first import the privately saved backup there. Rehearse rollback with synthetic fixtures; do not overwrite learner state as a test.

F01 hardens imports only. Recovery from corrupt pre-existing localStorage, storage failures in ordinary edits, transactional migrations, new backup versions and Pages build/subpath deployment remain F02/F03 work. Chromium mobile emulation is not a physical-device or cross-engine accessibility audit. External sites and print-to-PDF output are not validated by this suite.
