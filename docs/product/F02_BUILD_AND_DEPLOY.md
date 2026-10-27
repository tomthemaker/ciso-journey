# F02 TypeScript build and GitHub Pages delivery

Issue: [F02 / #4](https://github.com/tomthemaker/ciso-journey/issues/4). This increment accepts the Vite/TypeScript and plain DOM portion of architecture proposal D006. The application has no framework or runtime package dependency; Vite and TypeScript are build tools. Existing roadmap content, 37 task IDs, six ratings, independent journal/achievement records, `ciso-journey-v1` storage and the version-1 backup envelope retain their meanings. Resource-level completion, retrieval and applied assessment remain separate future work.

## Run and check

Use Node **24.4.1 or newer**; `.nvmrc`, the lockfile and CI establish the checked toolchain. With nvm, run `nvm install && nvm use` first.

```sh
npm ci
npm run dev
# Open http://127.0.0.1:5173/ciso-journey/
npm run typecheck
npm run build
npm run preview
# Open http://127.0.0.1:4173/ciso-journey/
npx playwright install chromium
npm test -- --workers=4
# Or: npm run test:desktop / npm run test:mobile
```

`npm test` builds before running browser checks. The tests serve only `dist/` at `http://127.0.0.1:4174/ciso-journey/`, with no SPA fallback or root asset alias. Keep port 4174 free. The original preservation tests now use that subpath; they still inspect real storage, imports, exports and rendered interactions against the frozen synthetic inventory. New Pages cases check JS/CSS status and MIME type, actual applied CSS, missing paths, direct hash loads, section refresh, persisted history and browser back/forward on desktop Chromium and Pixel 7 emulation. Playwright traces remain local on failure; never upload real learner material as test evidence.

Source `index.html` is the Vite entry and cannot be opened directly using `file://`. Use a server and the built artifact. `vite preview` is a local build preview, not the production host. There is no service worker or offline launch guarantee.

## Module boundaries

- `src/data.ts` holds the unchanged legacy roadmap, resources and score defaults; `types.ts` describes their v1 contracts.
- `storage.ts` owns the original key, defaults, load and persistence; `backup.ts` owns complete v1 validation and the export envelope. Import persistence still succeeds before replacing live state. Extra compatible JSON fields remain intact. This task deliberately retains F01's existing storage load/save behavior; transactional migrations, malformed stored-state recovery and general quota handling belong to [F03 / #5](https://github.com/tomthemaker/ciso-journey/issues/5).
- `roadmap.ts`, `dashboard.ts` and `history.ts` render their own views and take typed state/callbacks. `dom.ts` builds text-only nodes and checks required element tags.
- `navigation.ts` selects sections using `#roadmap`, `#competencies`, `#journal`, `#achievements` or `#resources`; unknown hashes show Roadmap. Hashes preserve static Pages refresh without server routes. `main.ts` wires views, forms and import/export/reset controls.

## Deploy to the existing Pages URL

Vite uses `base: '/ciso-journey/'`. The public URL remains **https://tomthemaker.github.io/ciso-journey/**. Relative build assets are rewritten beneath that path. Do not publish repository source as the new site.

The repository used **Deploy from a branch → main / root** before F02. Leave that source unchanged while this candidate is under review. After independent approval and passing PR checks, coordinate this delivery sequence:

1. Record the approved candidate SHA and export any learner progress privately from the currently deployed app. Capture the last known good single-file version: `17124e47b1913ec3972adc542fbaae00e27f005a` (reviewed F01 baseline).
2. **Before merging the Vite entry onto main**, change repository **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. Equivalently, with authorized repository administration access: `gh api --method PUT repos/tomthemaker/ciso-journey/pages -f build_type=workflow`. Keep the URL, domain and HTTPS settings unchanged. Switching source is a delivery operation; this PR does not perform it. Monitor availability during the switch and keep the known-good runtime available for rollback.
3. Merge the approved candidate under the repository's required checks/reviews. A push to `main` triggers `.github/workflows/preservation.yml`. It runs `npm ci`, typecheck, a production build and all browser tests. Only a successful main run uploads that exact `dist/` to `github-pages`; the dependent deployment job has `pages: write` and `id-token: write` within the `github-pages` environment. PR runs have read-only permissions and cannot deploy. Manual workflow dispatch deploys only when the selected ref is `main`.
4. Monitor the **Build and browser regression** run and the **github-pages** deployment. Record the run URL, deployed commit and live validation in #4 before declaring delivery complete. To repeat the current main build: `gh workflow run preservation.yml --ref main`.
5. In a clean browser, open the public URL and `#journal` directly, refresh each section and verify the emitted `/ciso-journey/assets/*.js` and `*.css` respond successfully. Rehearse import, refresh and export with a synthetic fixture; confirm all 37 tasks and six defaults. Keep this rehearsal in a clean profile so it cannot replace real learner progress. In the learner's original profile, confirm existing data remains and make a private export. Local and CI subpath checks are evidence about the artifact; live hosting is verified only after actual deployment.

The workflow pins official GitHub actions by commit, publishes only a tested artifact, serializes main publishing and cancels superseded PR checks. Permissions/environment rules may require a repository administrator's delivery action; a successful PR build alone does not prove the Pages source has been switched or the public site updated.

## Origin and backup migration

Browser localStorage is scoped to **scheme + hostname + port**, not URL path or Git branch. Serving this build at the existing `https://tomthemaker.github.io` origin with the unchanged `ciso-journey-v1` key automatically sees existing compatible progress; no migration write occurs on load. Browser/profile/device changes and `http`/`https`, `localhost`/`127.0.0.1` or development-port changes are different storage contexts. `file://` storage behavior varies by browser and must not be relied upon.

Before moving contexts or upgrading, use **Export backup** in the old app and keep the JSON privately. Open the new app at the intended URL/profile, export any existing destination progress first, then choose **Import backup**, select the v1 file and confirm replacement. Verify counts, all six ratings and both histories, refresh, and export again. Import preserves legacy 0–4 ratings and completion booleans without treating them as recall or applied competency. Invalid/future files and failed import persistence leave current data untouched. Do not delete the original export or old browser data until recovery is verified. Never commit learner backups, private notes or employer evidence.

## Rollback

A deployment or asset failure does not itself change the learner's stored v1 data. Preserve private exports and avoid Reset/clear-site-data as troubleshooting steps.

For a later regression **after the first successful F02 release**, revert the faulty change to the last approved Vite version through a reviewed PR, then let the main workflow rebuild, recheck and deploy. Keep Pages on GitHub Actions. Source-control rollback and the actual deployed artifact must both be recorded.

If the **first F02 deployment** has an application/asset regression, restore the known self-contained F01 runtime through the retained build pipeline, preserving docs, toolchain and unrelated curriculum work:

```sh
git switch -c fix/restore-f01-pages origin/main
git restore --source=17124e47b1913ec3972adc542fbaae00e27f005a -- index.html
git rm tests/pages.spec.cjs
npm ci
npm run typecheck
npm test -- --workers=4
# Record the preservation checks, commit, open/review the PR, then merge.
```

The Pages-specific cases require new hash navigation and separate assets that the F01 runtime does not provide; remove those cases in this explicit emergency rollback only. Keep all current preservation assertions, any reviewed browser harness stabilization and unrelated curriculum checks. Retain the current package scripts/workflow/server: Vite also builds the self-contained classic-script F01 HTML into `dist/`, and the strict subpath server can run the complete preservation suite against it. The retained TypeScript source is inactive at runtime during rollback. The main workflow then publishes that tested self-contained artifact while Pages stays on GitHub Actions. Rehearsal on 2026-10-27 used a separate temporary copy and passed typecheck plus all 28 original desktop/mobile preservation cases (29.3 seconds); the output was one self-contained `dist/index.html`. No deployment or learner data was involved.

If **Actions publishing itself is unavailable**, after merging the reviewed F01 `index.html` restoration, switch Pages Source back to **Deploy from a branch → main / root** (or `gh api --method PUT repos/tomthemaker/ciso-journey/pages -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/'`). Do not switch back while main still has a Vite source entry. Pause/disable the deploy workflow as part of this recorded delivery exception (`gh workflow disable preservation.yml`) so it cannot compete with branch publishing; retain local checks and follow with a reviewed recovery task. Confirm the branch Pages build succeeds and the public app loads. Record the rollback commit, checks and live smoke evidence in #4. This restores hosting without deleting or reinterpreting v1 local data; import the private export only if it is needed and verified. Re-enable Actions publishing only through a reviewed build release and the source-switch sequence above.

## Validation record

2026-10-27 local Node 24.4.1: strict TypeScript check and Vite 8.3.5 production build passed; all **32 browser cases** passed (28 F01 preservation cases plus four Pages cases across desktop/mobile Chromium). The archived v1 fixtures and original source archive are unchanged. GitHub Actions results, immutable candidate SHA and independent review are recorded in the linked issue/PR. Deployment is intentionally pending reviewed delivery; no claim of a live Pages migration is made here.

References checked 2026-10-27: [Vite GitHub Pages guidance](https://vite.dev/guide/static-deploy.html#github-pages), [Vite build guidance](https://vite.dev/guide/build.html), [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
