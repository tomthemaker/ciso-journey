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
| Per-task disclosure | Expand/collapse suggestions and study focus. Every task offers LinkedIn course/path, targeted LinkedIn search, official reference and Coursera search; p2/p3 add a governance/compliance course link. | One disclosure toggled; all 37 exact frozen hrefs and safe new-tab attributes checked in one DOM read. No network navigation or claim of external link health. |
| Six competency selects | Each accepts 0–4; save independently, update average. Initial score summary stays fixed. | All category defaults, overrides through select controls, import values and reset average. |
| Journal form | Required date/topic/body; topic max length 140; submit appends generated ID, trimmed title/body, date; form clears and date defaults to today. | Keyboard submit, date and multiline body, generated ID, clear, refresh and imported date ordering. |
| Achievement form | Required date/title (max length 160), optional evidence body; submit appends generated ID and clears form. | Submit with empty evidence, persistence and imported entry rendering. |
| Delete on either history | Native confirmation; accept removes only matching entry and updates count, cancel leaves entry. | Both histories delete; achievement cancellation; empty histories. |
| Export button | Download dated JSON v1 envelope containing complete current state. No state changes. | Parse real downloaded bytes; compare every value; re-import exported file. |
| Import button / picker | Single JSON file chooser. Validate full payload, then ask before replacing state. Success alert and clear file input; retry can select the same file. | Chooser, all three fixtures, confirmation, cancellation, repeated selections. |
| Invalid / unsupported import | Reject invalid JSON, wrong app/version or malformed state/entries before any write; report an error and keep current state. Failed persistence also keeps the live state. | Node: all 25 malformed/future variants, 13 impossible dates and six valid dates per history. Browser: truncated/future imports and impossible dates in both histories preserve occupied stored bytes and full live exports; cancelled import and injected quota failure do too. |
| Reset button | Confirmation warns that a backup is needed; accept clears completions, histories and restores six defaults; cancel changes nothing. | Accept, cancel, exact saved defaults and reload. |
| General Resources | Nine official/reference links open in new tabs. | Exact frozen title, description and URL inventory. |
| Responsive / keyboard / print | One-column layout below 850px; section bar scrolls; native buttons, selects, checkboxes and forms remain usable. Print reveals all views and hides actions. | Full suite in desktop Chromium and Pixel 7 Chromium emulation; checkbox/submit keyboard smoke; no document overflow; print CSS smoke. |

The baseline intentionally has no resource-level progress, recall, questions or applied assessment. These later entities must remain separate from v1 task completion and self-ratings.

## Reproduce the preservation checks

F02 supersession, 2026-10-27: current checks use Node 24.4.1+ and the TypeScript/Vite modules. The frozen inventory and private recovery contract below remain applicable.

```sh
npm ci
npm test
npm run typecheck
npm run build
# Critical browser checks run locally, not in CI:
npx playwright install chromium
npm run test:browser -- --workers=4
```

`npm test` and `npm run test:unit` run 68 fast Node checks importing the actual typed validator/data. F02 replaces the temporary inline-source adapter described in the historical lean-harness record below with native TypeScript imports. `npm run test:browser` builds the app and runs six preservation plus two Pages flows in each desktop/mobile viewport. The strict static server exposes only `dist/` at `http://127.0.0.1:4174/ciso-journey/` without a SPA fallback; keep port 4174 free. `test:desktop`/`test:mobile` select one viewport.

Under D020, CI runs unit/type/build only, with source/test/config path filters; browser evidence is local and candidate-bound. [F02 run/deploy/origin/rollback](F02_BUILD_AND_DEPLOY.md) is the current command and Pages delivery authority. Earlier single-file/Python commands and validation counts are retained below as historical evidence. No real learner data belongs in fixtures or traces.

## Recorded validation — 2026-10-27

- Candidate: `npm test -- --workers=4` passed 22/22 tests (11 flows in each Chromium project; 59.3 seconds) on macOS with Node 26.10.0. The workflow repeats this suite on Ubuntu / Node 22.
- Regression sensitivity: with only `index.html` temporarily reverted to baseline `86be75d`, `npm run test:desktop -- --workers=1 --grep 'cancelled import and failed persistence'` failed as expected: after a synthetic quota error the stored original bytes survived but exporting live state returned the rejected candidate. Restoring the candidate makes this check pass. No learner state or external site was used.
- `git diff --check` passed. CI and the independent reviewer record belong to the linked issue/PR; these local results do not claim review approval.

Calendar-date review fix, 2026-10-27: the independent review of `9ba6a43` in [PR #27](https://github.com/tomthemaker/ciso-journey/pull/27#issuecomment-6440671105) found that `Date.parse` normalized impossible dates. Import now checks month lengths and the Gregorian leap-year rule before parsing for the existing supported date range. Both journal and achievement regressions reject February 30, February 29 in ordinary/century non-leap years, all four 30-day-month overflows, and zero/out-of-range months and days before confirmation. Each rejection preserves occupied stored bytes and live exported data; refresh also preserves the original state. Valid 2024/2000 leap days, normal month/year boundaries, a padded year and a longer legacy year round-trip in both histories.

The new journal rejection test failed against the pre-fix `9ba6a43` runtime on `2026-02-30` (unexpected replacement confirmation), proving regression sensitivity. The updated full suite passed 28/28 browser tests across both Chromium projects with `CI=1 npm test -- --workers=4` on macOS / Node 26.10.0. `npm ci` and `git diff --check` passed. No new product decision or scope change; this completes D015's existing malformed-import requirement and awaits independent verification of the updated candidate.

## Lean preservation checks — 2026-10-27

Infrastructure [#29](https://github.com/tomthemaker/ciso-journey/issues/29), [PR #31](https://github.com/tomthemaker/ciso-journey/pull/31). Failed run [40496743587](https://github.com/tomthemaker/ciso-journey/actions/runs/40496743587) stopped receiving download events after bursts of ten downloads in 786–927 ms. Pinned Chromium 156.0.8078.4 [defines a ten-download/one-second limiter](https://chromium.googlesource.com/chromium/src/+/refs/tags/156.0.8078.4/third_party/blink/renderer/core/frame/local_frame.cc). Traces and source support this diagnosis without exposing the internal counter; no application defect was demonstrated.

At the product owner's request, this supersedes the interim 44-browser-test batching approach. The **68 Node tests** cover the exact original 25 malformed/future inputs, all 13 impossible dates in each history, all six valid dates in each history, three fixtures, default scores/extensions and the frozen inventory. They execute the actual shipped declarations and validator through a small explicit source-region adapter, with no DOM/storage mocks or duplicate validation logic. F02 will replace that temporary adapter with direct typed-module imports. Input immutability and full returned data are checked separately from browser persistence.

The **six browser flows per viewport** retain every task-ID write, exact resource destinations, six scores, safe imported text, real downloaded fixture round-trips, existing-storage bytes/defaults/extensions, form/keyboard/filter/reset/print controls, and representative rejection-before-confirmation checks. Truncated JSON, future version and impossible dates in both histories each preserve occupied stored bytes and the complete live exported data, followed by a reload check. Cancellation and quota failure independently preserve both state representations. There are at most six real downloads in one flow; there are no per-variant contexts/downloads, counters, batching machinery, retries, increased timeouts or disabled protections. Runtime and synthetic v1 fixtures remain unchanged. Node matrix coverage does not imply every malformed input is separately exercised through browser file I/O.

Validation: `npm ci`; `CI=1 npm test -- --workers=2` on macOS / Node 24.4.1 passed **68/68 Node checks** (177 ms) and **12/12 desktop/mobile Chromium checks** (18.5 s). A direct comparison retained all original malformed payload strings/labels and dates. Deliberately bypassing the month-length guard failed the Node date assertions; mutating only the live Governance score after rejected import failed the browser full-data assertion despite unchanged stored bytes. Both mutations were restored. `git diff --check` passes; runtime, v1 fixtures and lockfile are unchanged. Exact-candidate CI and the separate fresh-agent review belong to #29/PR #31. No product decision changed; this supersedes only the test strategy and earlier browser-count evidence. Mobile emulation remains distinct from physical-device and cross-engine testing.

D020 policy update, 2026-10-27: `npm test` now runs only the fast unit layer; use the separate browser command above for local checks. This supersedes prior browser-in-CI requirements and the historical combined command. The app, all tests/fixtures, Playwright configuration and dependency lockfile are unchanged from `4c31389cea5e46315af2aa1f21c7e0c56f9c25cc`, so its passing local 12-browser result remains applicable to this workflow/docs-only delta. The cancelled browser-install run [40499674948](https://github.com/tomthemaker/ciso-journey/actions/runs/40499674948) is not passing CI evidence. Final unit/CI results and fresh independent policy review are linked in [PR #31](https://github.com/tomthemaker/ciso-journey/pull/31).

## Learner backup and recovery

1. Before an upgrade, reset, browser change or move to another URL, use **Export backup** in the original working browser. Keep the downloaded JSON privately outside Git. Export the destination browser's state too if it already contains learning history; import replaces it rather than merging.
2. Check the backup opens as JSON and has `app: "CISO Journey"`, `version: 1` and all four data collections. Keep the original file unchanged. A safe rehearsal uses a separate browser profile and confirms tasks, all six scores, journal and achievements after import and refresh.
3. Open the intended app URL, choose **Import backup**, select the file, and accept replacement only after saving the destination backup. After success, refresh and check representative task IDs, scores and both histories; export again and compare the `data` values. Envelope export timestamps will differ.
4. A rejection or cancelled import leaves existing data untouched. Keep both files, check that the selected file is a complete supported v1 export, and retry with a known-good backup. Do not reset as an import repair step. A storage error may require freeing space for this origin or another browser profile; preserve the backup first. Future-version files require the matching app version rather than manually changing their version number.
5. Storage belongs to a browser profile and origin (scheme, host, port). The same HTTPS origin shares localStorage across URL paths; another host, port or browser does not. File-URL storage behavior varies by browser. Export from the old location before moving, then import into the new location. A copied app file alone does not transfer learning data.
6. If the UI cannot start, leave browser site data intact. In that original origin's developer console, read `localStorage.getItem('ciso-journey-v1')` and privately save the returned raw JSON text before changing anything. This raw value is state, not a backup envelope. Wrap a *copy* as the `data` field of the v1 envelope shown above to attempt recovery in an isolated profile. Never paste real state into an issue or commit it. Malformed existing storage cannot be assumed repaired by this task; keep its original bytes for F03 recovery work.
7. For a code rollback, serve the prior reviewed `index.html` at the same origin without clearing site data. Its v1 key/envelope remain compatible. If moving to another origin, first import the privately saved backup there. Rehearse rollback with synthetic fixtures; do not overwrite learner state as a test.

F01 hardens imports only. Recovery from corrupt pre-existing localStorage, storage failures in ordinary edits, transactional migrations, new backup versions and Pages build/subpath deployment remain F02/F03 work. Chromium mobile emulation is not a physical-device or cross-engine accessibility audit. External sites and print-to-PDF output are not validated by this suite.
